import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  intelligenceMetadataFromContact,
  mergeProviderWizardFieldsPatch,
} from "@/lib/surgical-sales/providerCreateWizard";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";
import { AI_NOTE_CAPTURE_ACTIVITY_TYPE } from "./labels";
import type { AiNoteCaptureCommitItem } from "./types";
import {
  dbColumnForLogicalField,
  mergeWorkflowFieldValue,
  sectionLabel,
  type ProviderPlanningLogicalField,
} from "./workflowTargets";

const SELECT_FIELDS = [
  "influence_level",
  "preferred_contact_method",
];

export async function applyProviderPlanningWorkflowField(params: {
  providerId: string;
  actorUserId: string;
  item: AiNoteCaptureCommitItem;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { providerId, actorUserId, item } = params;
  const wt = item.workflowTarget;
  if (!wt || wt.workflow !== "provider_planning") {
    return { ok: false, message: "Missing workflow target." };
  }

  const dbKey = dbColumnForLogicalField(wt.field);
  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr || !existing) return { ok: false, message: loadErr?.message || "Provider not found." };

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", actorUserId)
    .maybeSingle();
  const actorName =
    String((profile as { full_name?: string | null } | null)?.full_name ?? "").trim() ||
    String((profile as { email?: string | null } | null)?.email ?? "").trim() ||
    "Rep";

  const current = String((existing as unknown as Record<string, unknown>)[dbKey] ?? "").trim();
  const strategy = item.mergeStrategy ?? wt.mergeStrategy;
  if (strategy === "needs_review") {
    return { ok: false, message: "Resolve merge strategy before saving." };
  }

  const isSelectField = SELECT_FIELDS.includes(dbKey);
  const merged = mergeWorkflowFieldValue({
    existing: current,
    proposed: item.body,
    mergeStrategy: strategy,
    isSelectField,
  });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  mergeProviderWizardFieldsPatch(patch, { [dbKey]: merged }, {
    captureContext: { source_type: "ai_capture", source_label: "AI note capture" },
    actor: { userId: actorUserId, userName: actorName },
    existingMetadata: intelligenceMetadataFromContact(existing as Record<string, unknown>),
    existingContact: existing as Record<string, unknown>,
  });

  const { error: upErr } = await supabaseAdmin.from("surgical_sales_contacts").update(patch).eq("id", providerId);
  if (upErr) return { ok: false, message: upErr.message };

  const log = await logSurgicalProviderActivity({
    providerId,
    userId: actorUserId,
    activityType: AI_NOTE_CAPTURE_ACTIVITY_TYPE,
    body: `AI note capture — Provider Planning / ${sectionLabel(wt.section)} / ${wt.fieldLabel}: ${item.body.slice(0, 220)}`,
    metadataJson: {
      ai_note_capture: true,
      workflow: wt.workflow,
      section: wt.section,
      field: wt.field,
      field_label: wt.fieldLabel,
      merge_strategy: strategy,
      db_column: dbKey,
    },
  });
  if (!log.ok) return { ok: false, message: log.message };

  return { ok: true };
}

export function isProviderPlanningWorkflowItem(item: AiNoteCaptureCommitItem): boolean {
  return (
    item.category === "workflow_field_suggestion" &&
    item.workflowTarget?.workflow === "provider_planning" &&
    Boolean(item.workflowTarget.field)
  );
}

export function logicalFieldKey(field: string): field is ProviderPlanningLogicalField {
  return [
    "common_procedures",
    "case_volume_estimate",
    "technique_preferences",
    "current_vendors_products",
    "competitive_products_used",
    "product_interest_areas",
    "evaluation_openness",
    "preference_card_signals",
    "or_team_dynamics",
    "questions_for_first_observation",
    "influence_level",
    "decision_maker_status",
    "champion_potential",
    "communication_style",
    "communication_style_notes",
    "follow_up_approach",
    "rep_strategy_notes",
  ].includes(field);
}
