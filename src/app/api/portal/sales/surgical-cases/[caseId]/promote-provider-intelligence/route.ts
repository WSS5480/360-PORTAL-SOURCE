import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import {
  getProviderIntelligencePromoteField,
  mergePromotedProviderValue,
  PROVIDER_INTELLIGENCE_PROMOTE_FIELD_IDS,
  type ProviderIntelligencePromoteFieldId,
} from "@/lib/surgical-sales/providerIntelligencePromote";
import {
  intelligenceMetadataFromContact,
  mergeProviderWizardFieldsPatch,
} from "@/lib/surgical-sales/providerCreateWizard";
import {
  touchProviderPlanningUpdatedAt,
  upsertClinicalDiscoveryAnswers,
} from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadRepDisplayName(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  const name = String((data as { full_name?: string | null } | null)?.full_name ?? "").trim();
  const email = String((data as { email?: string | null } | null)?.email ?? "").trim();
  return name || email || "Rep";
}

const PromoteUpdateSchema = z.object({
  field_id: z.enum(PROVIDER_INTELLIGENCE_PROMOTE_FIELD_IDS as [ProviderIntelligencePromoteFieldId, ...ProviderIntelligencePromoteFieldId[]]),
  confirmed: z.literal(true),
  value: z.string().max(16000),
  mode: z.enum(["replace", "append"]),
});

const BodySchema = z
  .object({
    updates: z.array(PromoteUpdateSchema).min(1).max(PROVIDER_INTELLIGENCE_PROMOTE_FIELD_IDS.length),
  })
  .strict();

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { caseId } = await ctx.params;
  if (!UUID_RE.test(caseId)) {
    return NextResponse.json({ ok: false, error: "Invalid case id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const caseRow = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!caseRow) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const providerId = String(caseRow.surgeon_contact_id || "").trim();
  if (!providerId) {
    return NextResponse.json({ ok: false, error: "No provider assigned to this case." }, { status: 400 });
  }

  const { data: providerRow, error: providerErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (providerErr) return NextResponse.json({ ok: false, error: providerErr.message }, { status: 500 });
  if (!providerRow) return NextResponse.json({ ok: false, error: "Provider not found." }, { status: 404 });
  if (!isProviderRole(String((providerRow as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Assigned contact is not a provider." }, { status: 400 });
  }
  if (!(await repCanAccessContact(uid, providerRow as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const caseNumber = formatSurgicalCaseNumber(String((caseRow as { case_number?: string }).case_number ?? ""));
  const caseLabel = caseNumber ? `case ${caseNumber}` : "observation case";

  const fieldsPatch: Record<string, string | null> = {};
  const changedLabels: string[] = [];
  const previousValues: Record<string, string | null> = {};
  const newValues: Record<string, string | null> = {};

  for (const update of parsed.data.updates) {
    if (!update.confirmed) continue;
    const config = getProviderIntelligencePromoteField(update.field_id);
    const existing = String((providerRow as Record<string, unknown>)[config.providerKey] ?? "").trim() || null;
    const merged = mergePromotedProviderValue(existing, update.value, update.mode, caseLabel);
    if (merged === (existing || "")) continue;
    previousValues[config.providerKey] = existing;
    newValues[config.providerKey] = merged.trim() || null;
    fieldsPatch[config.providerKey] = merged.trim() || null;
    changedLabels.push(config.label);
  }

  if (Object.keys(fieldsPatch).length === 0) {
    return NextResponse.json({ ok: false, error: "No confirmed changes to apply." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const actorName = await loadRepDisplayName(uid);
  const observationLabel = caseNumber ? `Observation ${caseNumber}` : "Observation";
  const clinicalUpserts = mergeProviderWizardFieldsPatch(patch, fieldsPatch, {
    captureContext: {
      source_type: "observation",
      source_label: observationLabel,
      source_case_id: caseId,
      source_case_number: caseNumber || undefined,
    },
    actor: { userId: uid, userName: actorName },
    existingMetadata: intelligenceMetadataFromContact(providerRow as Record<string, unknown>),
    existingContact: providerRow as Record<string, unknown>,
  });

  const { data: updatedProvider, error: updateErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(patch)
    .eq("id", providerId)
    .select("*")
    .single();
  if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 400 });

  if (clinicalUpserts.length > 0) {
    await upsertClinicalDiscoveryAnswers(supabaseAdmin, providerId, uid, clinicalUpserts);
  }
  await touchProviderPlanningUpdatedAt(supabaseAdmin, providerId);

  const correlationId = crypto.randomUUID();
  const activityBody = `Provider intelligence updated from ${caseLabel}: ${changedLabels.join("; ")}.`;
  const activityMeta = {
    correlation_id: correlationId,
    source_case_id: caseId,
    provider_id: providerId,
    promoted_field_ids: parsed.data.updates.map((u) => u.field_id),
    promoted_labels: changedLabels,
    activity_category: "intelligence",
  };

  const caseLog = await logSurgicalCaseActivity({
    caseId,
    userId: uid,
    activityType: "provider_intelligence_promoted",
    body: activityBody,
    metadataJson: activityMeta,
    previousValues,
    newValues,
    providerId,
  });
  if (!caseLog.ok) {
    return NextResponse.json({ ok: false, error: caseLog.message }, { status: 500 });
  }

  const providerLog = await logSurgicalProviderActivity({
    providerId,
    userId: uid,
    activityType: "provider_intelligence_promoted",
    body: activityBody,
    metadataJson: {
      ...activityMeta,
      legacy_case_activity_id: caseLog.activityId ?? null,
    },
    sourceCaseId: caseId,
  });
  if (!providerLog.ok) {
    return NextResponse.json({ ok: false, error: providerLog.message }, { status: 500 });
  }

  await logSurgicalSalesCrmAudit({
    actorUserId: uid,
    action: "provider_intelligence_promoted_from_case",
    meta: {
      case_id: caseId,
      provider_id: providerId,
      fields: Object.keys(fieldsPatch),
      labels: changedLabels,
    },
    req,
  });

  const intelligence = buildProviderIntelligenceSnapshot(updatedProvider as Record<string, unknown>, providerId, {
    referenceCaseDate: (caseRow as { case_date?: string | null }).case_date,
    referenceCaseUpdatedAt: (caseRow as { updated_at?: string | null }).updated_at,
  });

  return NextResponse.json({
    ok: true,
    provider_intelligence: intelligence,
    updated_fields: changedLabels,
  });
}
