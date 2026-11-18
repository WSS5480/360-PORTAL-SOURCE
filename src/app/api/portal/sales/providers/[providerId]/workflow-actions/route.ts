import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import {
  intelligenceMetadataFromContact,
  mergeProviderWizardFieldsPatch,
} from "@/lib/surgical-sales/providerCreateWizard";
import type { IntelligenceCaptureContext } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderOverviewWorkflowApiAction } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import { planningPatchForWorkflowApiAction } from "@/lib/surgical-sales/providerOverviewWorkflowActions";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { voidRecordActivityEventDual } from "@/lib/activity/dualWrite";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WorkflowActionSchema = z
  .object({
    action: z.enum([
      "mark_observation_approved",
      "mark_observation_interested",
      "mark_observation_declined",
      "undo_observation_approval",
      "mark_access_path_known",
      "mark_pathway_partially_known",
      "mark_credentialing_known",
      "mark_champion_confirmed",
    ]),
  })
  .strict();

async function loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, full_name, email")
    .in("user_id", uniq);
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

  const parsed = WorkflowActionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const action = parsed.data.action as ProviderOverviewWorkflowApiAction;

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

  const profileNames = await loadProfileNames([gate.uid]);
  const actorName = profileNames.get(gate.uid) || "Rep";
  const captureCtx: IntelligenceCaptureContext = {
    source_type: "profile",
    source_label: "Manual update",
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const planning = planningPatchForWorkflowApiAction(action);

  mergeProviderWizardFieldsPatch(patch, planning, {
    captureContext: captureCtx,
    actor: { userId: gate.uid, userName: actorName },
    existingMetadata: intelligenceMetadataFromContact(existing as Record<string, unknown>),
    existingContact: existing as Record<string, unknown>,
  });

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(patch)
    .eq("id", providerId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await logSurgicalSalesCrmAudit({
    actorUserId: gate.uid,
    action: "provider_workflow_action",
    meta: { contact_id: providerId, provider_id: providerId, workflow_action: action },
    req,
  });

  voidRecordActivityEventDual({
    type: "PROVIDER_PLANNING_UPDATED",
    summary: `Workflow action: ${action.replace(/_/g, " ")}`,
    entityType: "provider",
    entityId: providerId,
    createdBy: { userId: gate.uid },
    metadata: { workflow_action: action },
    tags: ["planning", "workflow"],
  });

  return NextResponse.json({ ok: true, provider: data, action });
}
