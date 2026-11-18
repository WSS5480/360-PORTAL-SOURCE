import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { enrichOpportunitiesWithProductName } from "@/lib/sales/enrichOpportunitiesWithProductName";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { PRACTICE_SETTINGS } from "@/lib/sales/practiceSetting";
import { resolveActiveProductNamesOrdered } from "@/lib/sales/resolveSalesProductsForOpportunity";
import { uniqueOrderedIds } from "@/lib/sales/uniqueOrderedIds";
import { SALES_STAGES } from "@/lib/sales/stages";
import { resolveOpportunityOrganization } from "@/lib/sales/resolveOpportunityOrganization";
import {
  assertProviderLinkedToOrganization,
  isMissingOpportunitySurgeonContactColumnError,
  readOpportunityProviderId,
  resolveOpportunityProviderFields,
} from "@/lib/surgical-sales/crmEntityRelationships";
import {
  loadLinkedCasesForOpportunity,
  loadLinkedEngagementsForOpportunity,
} from "@/lib/surgical-sales/opportunityRelationships";
import {
  adoptionInitiativeSnapshotFromRow,
  logAdoptionInitiativeOrganizationLinked,
  logAdoptionInitiativeProviderLinked,
  logAdoptionInitiativeStageChange,
} from "@/lib/activity/adoptionInitiativeActivity";

export const dynamic = "force-dynamic";

function isMissingOpportunityGeoColumnError(message: string | null | undefined) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("sales_opportunities") &&
    (text.includes("'city'") || text.includes("'state'")) &&
    text.includes("schema cache")
  );
}

const PatchSchema = z.object({
  account_id: z.string().uuid().optional().nullable(),
  account_name: z.string().min(1).max(240).optional(),
  physician_name: z.string().max(240).optional().nullable(),
  surgeon_contact_id: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.string().uuid().nullable().optional(),
  ),
  /** Replaces catalog products when set (order preserved; first is primary). */
  product_ids: z.array(z.string().uuid()).min(1).max(25).optional(),
  product_id: z.string().uuid().optional(),
  product_labels: z.array(z.string().min(1).max(240)).min(1).max(25).optional(),
  product_line: z.string().min(1).max(120).optional(),
  value_cents: z.number().int().min(0).max(1_000_000_000_000).optional(),
  practice_setting: z.enum(PRACTICE_SETTINGS).optional(),
  stage: z.enum(SALES_STAGES).optional(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
  closed_lost_reason: z.string().max(240).optional().nullable(),
  surgeon_champion_confirmed: z.boolean().optional(),
  surgeon_champion_name: z.string().max(240).optional().nullable(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

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

  const row = await loadOpportunityForViewer(id, uid);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const [enriched] = await enrichOpportunitiesWithProductName([row]);
  const ownerUserId = String((enriched as { owner_user_id?: string | null }).owner_user_id || "");
  type OwnerProfile = { user_id: string; full_name?: string | null; email?: string | null };
  let owner: OwnerProfile | null = null;
  if (ownerUserId) {
    const { data: prof } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, email")
      .eq("user_id", ownerUserId)
      .maybeSingle();
    owner = (prof as OwnerProfile | null) ?? null;
  }
  const [linked_engagements, linked_cases] = await Promise.all([
    loadLinkedEngagementsForOpportunity(id),
    loadLinkedCasesForOpportunity(id),
  ]);
  return NextResponse.json({
    ok: true,
    opportunity: {
      ...enriched,
      owner_name: owner?.full_name || null,
      owner_email: owner?.email || null,
      linked_engagements,
      linked_cases,
      linked_case_ids: linked_cases.map((c) => c.id),
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

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

  const existing = await loadOpportunityForViewer(id, uid);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const p = parsed.data;
  if (p.account_id !== undefined || p.account_name !== undefined) {
    const org = await resolveOpportunityOrganization({
      accountId: p.account_id,
      accountName: p.account_name ?? String((existing as { account_name?: string | null }).account_name ?? ""),
      actorUserId: uid,
    });
    if (!org.ok) {
      return NextResponse.json({ ok: false, error: org.error }, { status: 400 });
    }
    patch.account_id = org.accountId;
    patch.account_name = org.accountName;
  }
  const nextAccountId = String(
    patch.account_id ?? (existing as { account_id?: string | null }).account_id ?? "",
  ).trim();

  if (
    nextAccountId &&
    (p.account_id !== undefined || p.account_name !== undefined) &&
    p.physician_name === undefined &&
    p.surgeon_contact_id === undefined
  ) {
    const existingProviderId = readOpportunityProviderId(existing as { surgeon_contact_id?: string | null });
    if (existingProviderId) {
      const linkErr = await assertProviderLinkedToOrganization(existingProviderId, nextAccountId);
      if (linkErr) {
        return NextResponse.json({ ok: false, error: linkErr }, { status: 400 });
      }
    }
  }

  if (p.physician_name !== undefined || p.surgeon_contact_id !== undefined) {
    const resolved = await resolveOpportunityProviderFields({
      accountId: nextAccountId || null,
      physicianName:
        p.physician_name !== undefined
          ? p.physician_name
          : String((existing as { physician_name?: string | null }).physician_name || ""),
      surgeonContactId:
        p.surgeon_contact_id !== undefined
          ? p.surgeon_contact_id
          : (existing as { surgeon_contact_id?: string | null }).surgeon_contact_id,
    });
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });
    }
    patch.physician_name = resolved.value.physician_name;
    patch.surgeon_contact_id = resolved.value.surgeon_contact_id;
  }

  if (p.product_ids !== undefined) {
    const ids = uniqueOrderedIds(p.product_ids);
    const res = await resolveActiveProductNamesOrdered(ids);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }
    patch.product_id = ids[0];
    patch.additional_product_ids = ids.slice(1);
    patch.product_line = res.names.join(", ");
  } else if (p.product_id !== undefined) {
    const ids = uniqueOrderedIds([p.product_id]);
    const res = await resolveActiveProductNamesOrdered(ids);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }
    patch.product_id = ids[0];
    patch.additional_product_ids = [];
    patch.product_line = res.names.join(", ");
  } else if (p.product_labels !== undefined) {
    const labels = [...new Set((p.product_labels || []).map((s) => s.trim()).filter(Boolean))];
    if (labels.length === 0) {
      return NextResponse.json({ ok: false, error: "Select or enter at least one product." }, { status: 400 });
    }
    patch.product_id = null;
    patch.additional_product_ids = [];
    patch.product_line = labels.join(", ");
  } else if (p.product_line !== undefined) {
    patch.product_line = p.product_line.trim();
  }

  if (p.value_cents !== undefined) patch.value_cents = p.value_cents;
  if (p.practice_setting !== undefined) patch.practice_setting = p.practice_setting;
  if (p.stage !== undefined) {
    patch.stage = p.stage;
    if (p.stage !== "lost") {
      patch.closed_lost_reason = null;
    }
  }
  if (p.close_date !== undefined) patch.close_date = p.close_date;
  if (p.notes !== undefined) patch.notes = p.notes?.trim() || null;
  if (p.city !== undefined) patch.city = p.city?.trim() || null;
  if (p.state !== undefined) patch.state = p.state?.trim() || null;
  if (p.closed_lost_reason !== undefined) patch.closed_lost_reason = p.closed_lost_reason?.trim() || null;
  if (p.surgeon_champion_confirmed !== undefined) {
    patch.surgeon_champion_confirmed = p.surgeon_champion_confirmed;
    if (!p.surgeon_champion_confirmed) {
      patch.surgeon_champion_name = null;
    }
  }
  if (p.surgeon_champion_name !== undefined) patch.surgeon_champion_name = p.surgeon_champion_name?.trim() || null;

  let { data, error } = await supabaseAdmin
    .from("sales_opportunities")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error && (isMissingOpportunityGeoColumnError(error.message) || isMissingOpportunitySurgeonContactColumnError(error.message))) {
    const fallbackPatch = { ...patch };
    if (isMissingOpportunityGeoColumnError(error.message)) {
      delete fallbackPatch.city;
      delete fallbackPatch.state;
    }
    if (isMissingOpportunitySurgeonContactColumnError(error.message)) {
      delete fallbackPatch.surgeon_contact_id;
    }
    const retry = await supabaseAdmin
      .from("sales_opportunities")
      .update(fallbackPatch)
      .eq("id", id)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const snapshot = adoptionInitiativeSnapshotFromRow(data as Record<string, unknown>);

  const prevStage = String((existing as { stage?: string }).stage || "");
  const nextStage = String((data as { stage?: string }).stage || prevStage);
  if (p.stage !== undefined && nextStage !== prevStage) {
    logAdoptionInitiativeStageChange({
      userId: uid,
      snapshot,
      fromStage: prevStage,
      toStage: nextStage,
    });
  }

  const prevAccountId = String((existing as { account_id?: string | null }).account_id || "").trim() || null;
  const updatedAccountId = String((data as { account_id?: string | null }).account_id || "").trim() || null;
  if (
    (p.account_id !== undefined || p.account_name !== undefined) &&
    updatedAccountId &&
    updatedAccountId !== prevAccountId
  ) {
    logAdoptionInitiativeOrganizationLinked({
      userId: uid,
      snapshot,
      previousAccountId: prevAccountId,
    });
  }

  const prevProviderId = readOpportunityProviderId(existing as { surgeon_contact_id?: string | null });
  const nextProviderId = readOpportunityProviderId(data as { surgeon_contact_id?: string | null });
  if (
    (p.surgeon_contact_id !== undefined || p.physician_name !== undefined) &&
    nextProviderId &&
    nextProviderId !== prevProviderId
  ) {
    logAdoptionInitiativeProviderLinked({
      userId: uid,
      snapshot,
      providerId: nextProviderId,
      previousProviderId: prevProviderId,
    });
  }

  const [withDisplay] = await enrichOpportunitiesWithProductName([data as Record<string, unknown>]);
  const ownerUserId = String((withDisplay as { owner_user_id?: string | null }).owner_user_id || "");
  type OwnerProfile = { user_id: string; full_name?: string | null; email?: string | null };
  let owner: OwnerProfile | null = null;
  if (ownerUserId) {
    const { data: prof } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, email")
      .eq("user_id", ownerUserId)
      .maybeSingle();
    owner = (prof as OwnerProfile | null) ?? null;
  }
  return NextResponse.json({ ok: true, opportunity: { ...withDisplay, owner_name: owner?.full_name || null, owner_email: owner?.email || null } });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

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

  const existing = await loadOpportunityForViewer(id, uid);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("sales_opportunities").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
