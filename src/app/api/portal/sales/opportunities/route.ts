import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { PRACTICE_SETTINGS } from "@/lib/sales/practiceSetting";
import { enrichOpportunitiesWithProductName } from "@/lib/sales/enrichOpportunitiesWithProductName";
import { enrichOpportunitiesListSummaries } from "@/lib/sales/enrichOpportunitiesListSummaries";
import { resolveActiveProductNamesOrdered } from "@/lib/sales/resolveSalesProductsForOpportunity";
import { uniqueOrderedIds } from "@/lib/sales/uniqueOrderedIds";
import { SALES_STAGES } from "@/lib/sales/stages";
import { resolveOpportunityOrganization } from "@/lib/sales/resolveOpportunityOrganization";
import {
  adoptionInitiativeSnapshotFromRow,
  isAdoptionMilestoneStage,
  logAdoptionInitiativeActivity,
  logAdoptionInitiativeCaseLinked,
  logAdoptionInitiativeEngagementLinked,
  resolveAdoptionStageActivityType,
} from "@/lib/activity/adoptionInitiativeActivity";
import { salesStageLabel, normalizeSalesStage } from "@/lib/sales/stages";
import { SALES_TERMINOLOGY as T } from "@/lib/sales/salesTerminology";
import {
  mapContactWriteFields,
  SURGICAL_CONTACT_ROLE_TYPES_V2,
  upsertContactOrganizationLink,
} from "@/lib/surgical-sales/contactManagement";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { filterOpportunitiesByActiveOrganization } from "@/lib/sales/activeOrganizationFilter";
import {
  isMissingOpportunitySurgeonContactColumnError,
  resolveOpportunityProviderFields,
} from "@/lib/surgical-sales/crmEntityRelationships";
import { linkAdoptionInitiativeOnCreate } from "@/lib/sales/linkAdoptionInitiativeOnCreate";

export const dynamic = "force-dynamic";

const roleTypeSchema = z.enum(SURGICAL_CONTACT_ROLE_TYPES_V2 as unknown as [string, ...string[]]);

const newContactRowSchema = z.object({
  first_name: z.string().min(1).max(200),
  last_name: z.string().max(200).optional().nullable(),
  email: z.string().max(320).optional().nullable(),
  phone: z.string().max(80).optional().nullable(),
  role_type: roleTypeSchema,
});

async function clearOtherPrimaryContactsForOrg(accountId: string, keepId: string) {
  await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({ is_primary: false, is_primary_contact: false, updated_at: new Date().toISOString() })
    .or(`organization_id.eq.${accountId},account_id.eq.${accountId}`)
    .neq("id", keepId);
}

function isMissingOpportunityGeoColumnError(message: string | null | undefined) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("sales_opportunities") &&
    (text.includes("'city'") || text.includes("'state'")) &&
    text.includes("schema cache")
  );
}

const ADOPTION_CREATE_COLUMNS = [
  "procedure_focus",
  "adoption_goal",
  "evaluation_needed",
  "preference_card_target",
  "competitive_product",
  "next_action",
  "source_engagement_id",
  "source_case_id",
] as const;

function isMissingAdoptionCreateColumnError(message: string | null | undefined) {
  const text = String(message || "").toLowerCase();
  if (!text.includes("sales_opportunities") || !text.includes("schema cache")) return false;
  return ADOPTION_CREATE_COLUMNS.some((col) => text.includes(`'${col}'`));
}

function stripAdoptionCreateColumns(row: Record<string, unknown>) {
  const next = { ...row };
  for (const col of ADOPTION_CREATE_COLUMNS) delete next[col];
  return next;
}

const CreateSchema = z.object({
  account_id: z.string().uuid().optional().nullable(),
  account_name: z.string().min(1).max(240),
  physician_name: z.string().max(240).optional().nullable(),
  surgeon_contact_id: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.string().uuid().nullable().optional(),
  ),
  /** Prefer this: one or more catalog product UUIDs (order preserved; first is primary). */
  product_ids: z.array(z.string().uuid()).min(1).max(25).optional(),
  /** Legacy single product (used if product_ids omitted). */
  product_id: z.string().uuid().optional(),
  /** Sales-side surgical variants (SKU labels) when not using product UUIDs. */
  product_labels: z.array(z.string().min(1).max(240)).min(1).max(25).optional(),
  value_cents: z.number().int().min(0).max(1_000_000_000_000).optional().default(0),
  practice_setting: z.enum(PRACTICE_SETTINGS).optional().default("private_practice"),
  stage: z.enum(SALES_STAGES),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
  closed_lost_reason: z.string().max(240).optional().nullable(),
  surgeon_champion_confirmed: z.boolean().optional(),
  surgeon_champion_name: z.string().max(240).optional().nullable(),
  procedure_focus: z.string().min(1).max(2000).optional(),
  adoption_goal: z.string().min(1).max(4000).optional(),
  evaluation_needed: z.boolean().optional(),
  preference_card_target: z.string().max(2000).optional().nullable(),
  competitive_product: z.string().max(2000).optional().nullable(),
  next_action: z.string().max(2000).optional().nullable(),
  linked_engagement_id: z.string().uuid().optional().nullable(),
  linked_case_id: z.string().uuid().optional().nullable(),
  /** When present, these CRM contacts are created on the resolved organization (add-opportunity flow). */
  new_contacts: z.array(newContactRowSchema).min(1).max(20).optional(),
  /** Index into `new_contacts` for primary contact (opportunity clinician / subtitle). */
  primary_contact_index: z.number().int().min(0).optional(),
}).superRefine((data, ctx) => {
  if (!data.surgeon_contact_id?.trim()) {
    ctx.addIssue({ code: "custom", message: "Provider is required." });
  }
  if (!data.procedure_focus?.trim()) {
    ctx.addIssue({ code: "custom", message: "Procedure focus is required." });
  }
  if (!data.adoption_goal?.trim()) {
    ctx.addIssue({ code: "custom", message: "Goal / desired outcome is required." });
  }
  const hasMulti = data.product_ids && data.product_ids.length > 0;
  const hasSingle = !!data.product_id;
  const hasLabels = data.product_labels && data.product_labels.length > 0;
  if (!hasMulti && !hasSingle && !hasLabels) {
    ctx.addIssue({ code: "custom", message: "Select or enter at least one product (main family name or catalog line)." });
  }
  if (data.new_contacts && data.new_contacts.length > 0) {
    const pi = data.primary_contact_index ?? 0;
    if (pi < 0 || pi >= data.new_contacts.length) {
      ctx.addIssue({ code: "custom", message: "Select a valid primary contact for the new contacts." });
    }
  }
});

export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const q = supabaseAdmin.from("sales_opportunities").select("*").order("updated_at", { ascending: false });

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const visibleRows = await filterOpportunitiesByActiveOrganization((data ?? []) as Record<string, unknown>[]);
  const withProduct = await enrichOpportunitiesWithProductName(visibleRows as Record<string, unknown>[]);
  const enriched = await enrichOpportunitiesListSummaries(withProduct);
  return NextResponse.json({ ok: true, opportunities: enriched });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const owner_user_id = uid;
  const org = await resolveOpportunityOrganization({
    accountId: parsed.data.account_id,
    accountName: parsed.data.account_name,
    actorUserId: uid,
  });
  if (!org.ok) {
    return NextResponse.json({ ok: false, error: org.error }, { status: 400 });
  }

  const newContacts = parsed.data.new_contacts;
  let physicianName: string | null = parsed.data.physician_name?.trim() || null;
  let surgeonContactId: string | null = parsed.data.surgeon_contact_id ?? null;
  if (newContacts && newContacts.length > 0) {
    const pi = Math.min(Math.max(0, parsed.data.primary_contact_index ?? 0), newContacts.length - 1);
    const now = new Date().toISOString();
    for (let i = 0; i < newContacts.length; i++) {
      const c = newContacts[i]!;
      const isPrimary = i === pi;
      const row: Record<string, unknown> = {
        ...mapContactWriteFields({
          organization_id: org.accountId,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          role_type: c.role_type,
          is_primary_contact: isPrimary,
          created_by: uid,
        }),
        created_at: now,
        updated_at: now,
      };
      const { data: created, error: insErr } = await supabaseAdmin.from("surgical_sales_contacts").insert(row).select("id").single();
      if (insErr || !created) {
        return NextResponse.json({ ok: false, error: insErr?.message || "Could not save contact" }, { status: 500 });
      }
      const contactId = String((created as { id: string }).id);
      if (isPrimary) {
        await clearOtherPrimaryContactsForOrg(org.accountId, contactId);
        surgeonContactId = surgeonContactId || contactId;
      }
      await upsertContactOrganizationLink({
        contactId,
        accountId: org.accountId,
        actorId: uid,
        roleType: c.role_type,
        isPrimary,
      });
    }
    const primary = newContacts[pi]!;
    const dn = contactDisplayName({
      first_name: primary.first_name,
      last_name: primary.last_name ?? null,
      email: primary.email ?? null,
    });
    physicianName = dn === "—" ? null : dn;
  }

  const providerResolved = await resolveOpportunityProviderFields({
    accountId: org.accountId,
    physicianName,
    surgeonContactId,
  });
  if (!providerResolved.ok) {
    return NextResponse.json({ ok: false, error: providerResolved.error }, { status: 400 });
  }
  physicianName = providerResolved.value.physician_name;
  surgeonContactId = providerResolved.value.surgeon_contact_id;

  const ids = uniqueOrderedIds(parsed.data.product_ids?.length ? parsed.data.product_ids : parsed.data.product_id ? [parsed.data.product_id] : []);
  let productLine = "";
  let primaryProductId: string | null = null;
  let additionalProductIds: string[] = [];
  if (ids.length > 0) {
    const resolved = await resolveActiveProductNamesOrdered(ids);
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });
    }
    productLine = resolved.names.join(", ");
    primaryProductId = ids[0]!;
    additionalProductIds = ids.slice(1);
  } else {
    const labels = [...new Set((parsed.data.product_labels || []).map((s) => s.trim()).filter(Boolean))];
    if (labels.length === 0) {
      return NextResponse.json({ ok: false, error: "Select or enter at least one product." }, { status: 400 });
    }
    productLine = labels.join(", ");
  }

  const row: Record<string, unknown> = {
    owner_user_id,
    account_id: org.accountId,
    account_name: org.accountName,
    physician_name: physicianName,
    surgeon_contact_id: surgeonContactId,
    product_id: primaryProductId,
    additional_product_ids: additionalProductIds,
    product_line: productLine,
    value_cents: parsed.data.value_cents ?? 0,
    practice_setting: parsed.data.practice_setting ?? "private_practice",
    stage: parsed.data.stage,
    city: parsed.data.city?.trim() || null,
    state: parsed.data.state?.trim() || null,
    close_date: parsed.data.close_date || null,
    notes: parsed.data.notes?.trim() || null,
    closed_lost_reason:
      parsed.data.stage === "lost" ? (parsed.data.closed_lost_reason?.trim() || null) : null,
    surgeon_champion_confirmed: parsed.data.surgeon_champion_confirmed ?? false,
    surgeon_champion_name: parsed.data.surgeon_champion_name?.trim() || null,
    procedure_focus: parsed.data.procedure_focus?.trim() || null,
    adoption_goal: parsed.data.adoption_goal?.trim() || null,
    evaluation_needed: parsed.data.evaluation_needed ?? false,
    preference_card_target: parsed.data.preference_card_target?.trim() || null,
    competitive_product: parsed.data.competitive_product?.trim() || null,
    next_action: parsed.data.next_action?.trim() || null,
    source_engagement_id: parsed.data.linked_engagement_id || null,
    source_case_id: parsed.data.linked_case_id || null,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabaseAdmin.from("sales_opportunities").insert(row).select("*").single();
  if (
    error &&
    (isMissingOpportunityGeoColumnError(error.message) ||
      isMissingOpportunitySurgeonContactColumnError(error.message) ||
      isMissingAdoptionCreateColumnError(error.message))
  ) {
    const fallbackRow = { ...row };
    if (isMissingOpportunityGeoColumnError(error.message)) {
      delete fallbackRow.city;
      delete fallbackRow.state;
    }
    if (isMissingOpportunitySurgeonContactColumnError(error.message)) {
      delete fallbackRow.surgeon_contact_id;
    }
    if (isMissingAdoptionCreateColumnError(error.message)) {
      Object.assign(fallbackRow, stripAdoptionCreateColumns(fallbackRow));
    }
    const retry = await supabaseAdmin.from("sales_opportunities").insert(fallbackRow).select("*").single();
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const [withDisplay] = await enrichOpportunitiesWithProductName([data as Record<string, unknown>]);
  const oppId = String((withDisplay as { id?: string }).id || "");
  if (oppId && (parsed.data.linked_engagement_id || parsed.data.linked_case_id)) {
    const linkResult = await linkAdoptionInitiativeOnCreate({
      opportunityId: oppId,
      linkedEngagementId: parsed.data.linked_engagement_id,
      linkedCaseId: parsed.data.linked_case_id,
      actorUserId: uid,
    });
    if (!linkResult.ok) {
      return NextResponse.json({ ok: false, error: linkResult.error }, { status: 500 });
    }
  }
  if (oppId) {
    const snapshot = adoptionInitiativeSnapshotFromRow(withDisplay as Record<string, unknown>);
    logAdoptionInitiativeActivity({
      type: "OPPORTUNITY_CREATED",
      summary: `${T.providerAddedToOpportunities} for ${String(snapshot.accountName || "organization")}.`,
      userId: uid,
      snapshot,
      metadata: { stage: snapshot.stage },
    });
    const initialStage = snapshot.stage ? normalizeSalesStage(snapshot.stage) : null;
    if (initialStage && isAdoptionMilestoneStage(initialStage)) {
      const milestoneType = resolveAdoptionStageActivityType(initialStage, null);
      if (milestoneType !== "OPPORTUNITY_STAGE_CHANGED") {
        const stageLabel = salesStageLabel(initialStage);
        logAdoptionInitiativeActivity({
          type: milestoneType,
          summary: `Evaluation started at ${stageLabel}.`,
          userId: uid,
          snapshot,
          metadata: { stage: initialStage, on_create: true },
          tags: [initialStage],
        });
      }
    }
    if (parsed.data.linked_engagement_id) {
      logAdoptionInitiativeEngagementLinked({
        userId: uid,
        snapshot,
        engagementId: parsed.data.linked_engagement_id,
      });
    }
    if (parsed.data.linked_case_id) {
      logAdoptionInitiativeCaseLinked({
        userId: uid,
        snapshot,
        caseId: parsed.data.linked_case_id,
      });
    }
  }
  return NextResponse.json({ ok: true, opportunity: withDisplay });
}
