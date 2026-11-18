import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import {
  mergeProviderWizardFieldsPatch,
  intelligenceMetadataFromContact,
} from "@/lib/surgical-sales/providerCreateWizard";
import {
  markIntelligenceFieldsValidated,
  type IntelligenceCaptureContext,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { buildProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildObservationApprovalSavePayload, buildObservationApprovalCommercialIntelligencePatch, normalizeObservationApprovalStatus, OBSERVATION_APPROVAL_PROFILE_SOURCE_LABEL } from "@/lib/surgical-sales/observationApprovalSave";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { voidRecordActivityEventDual } from "@/lib/activity/dualWrite";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z
  .object({
    status: z.string().min(1).max(64),
    approved_by: z.string().max(200).optional().nullable(),
    approval_note: z.string().max(2000).optional().nullable(),
    next_step: z.enum(["schedule_observation", "finish"]).optional(),
  })
  .strict();

async function loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", uniq);
  const map = new Map<string, string>();
  for (const row of data || []) {
    const id = String((row as { user_id: string }).user_id);
    const name = String((row as { full_name?: string | null }).full_name || "").trim();
    const email = String((row as { email?: string | null }).email || "").trim();
    map.set(id, name || email || id);
  }
  return map;
}

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!isProviderRole(String((existing as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not a provider record." }, { status: 400 });
  }
  if (!(await repCanAccessContact(gate.uid, existing as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const normalizedStatus = normalizeObservationApprovalStatus(parsed.data.status);
  if (!normalizedStatus) {
    return NextResponse.json({ ok: false, error: "Invalid observation status." }, { status: 400 });
  }

  const savePayload = buildObservationApprovalSavePayload({
    status: normalizedStatus,
    approvedBy: parsed.data.approved_by,
    approvalNote: parsed.data.approval_note,
  });

  const profileNames = await loadProfileNames([gate.uid]);
  const actorName = profileNames.get(gate.uid) || "Rep";
  const captureCtx: IntelligenceCaptureContext = {
    source_type: "profile",
    source_label: OBSERVATION_APPROVAL_PROFILE_SOURCE_LABEL,
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  mergeProviderWizardFieldsPatch(patch, savePayload.planning, {
    captureContext: captureCtx,
    actor: { userId: gate.uid, userName: actorName },
    existingMetadata: intelligenceMetadataFromContact(existing as Record<string, unknown>),
    existingContact: existing as Record<string, unknown>,
    fieldEvidence: savePayload.intelligence_field_evidence,
  });

  Object.assign(
    patch,
    buildObservationApprovalCommercialIntelligencePatch(
      { ...(existing as Record<string, unknown>), ...patch },
      normalizedStatus,
    ),
  );

  if (savePayload.intelligence_validate_fields.length > 0) {
    const mergedContact = { ...(existing as Record<string, unknown>), ...patch };
    patch.provider_intelligence_field_metadata = markIntelligenceFieldsValidated({
      existing: intelligenceMetadataFromContact(existing as Record<string, unknown>),
      dbKeys: savePayload.intelligence_validate_fields,
      fieldValues: mergedContact,
      actor: { userId: gate.uid, userName: actorName },
    });
    patch.provider_planning_updated_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(patch)
    .eq("id", providerId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await logSurgicalSalesCrmAudit({
    actorUserId: gate.uid,
    action: "provider_observation_approval_saved",
    meta: {
      contact_id: providerId,
      provider_id: providerId,
      status: normalizedStatus,
      next_step: parsed.data.next_step ?? "finish",
    },
    req,
  });

  voidRecordActivityEventDual({
    type: "PROVIDER_PLANNING_UPDATED",
    summary: `Observation status updated: ${normalizedStatus.replace(/_/g, " ")}`,
    entityType: "provider",
    entityId: providerId,
    createdBy: { userId: gate.uid },
    metadata: { status: normalizedStatus },
    tags: ["planning", "observation_approval"],
  });

  return NextResponse.json({
    ok: true,
    provider: data,
    status: normalizedStatus,
    next_step: parsed.data.next_step ?? "finish",
    planning_completion: buildProviderPlanningCompletion(data as Record<string, unknown>),
  });
}
