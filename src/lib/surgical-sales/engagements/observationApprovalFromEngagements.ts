import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { buildObservationApprovalSavePayload, normalizeObservationApprovalStatus } from "@/lib/surgical-sales/observationApprovalSave";
import type { ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";
import { resolveObservationStatusFromContact } from "@/lib/surgical-sales/observationStatus";
import {
  mergeProviderWizardFieldsPatch,
  intelligenceMetadataFromContact,
} from "@/lib/surgical-sales/providerCreateWizard";
import {
  markIntelligenceFieldsValidated,
  type IntelligenceCaptureContext,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import { resolveProviderObservationStatusForEngagementOutcome } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

export type RecordedEngagementObservationOutcome = {
  outcomeId: StartMissionOutcomeId;
  outcomeLabel: string;
  approvalNote: string;
  recordedAt: string;
};

/** Latest Start Mission / active engagement outcome that maps to provider observation status. */
export function findLatestRecordedObservationOutcome(
  engagementRows: ReadonlyArray<Record<string, unknown>>,
): RecordedEngagementObservationOutcome | null {
  let best: (RecordedEngagementObservationOutcome & { recordedAt: string }) | null = null;

  for (const row of engagementRows) {
    const session = readStartMissionSnapshot(row.debrief_intelligence_snapshot);
    if (!session?.outcome_recorded_at || !session.outcome_id) continue;
    const liveNotes = String(session.live_notes ?? "").trim();
    const outcomeLabel =
      String(session.outcome_label ?? "").trim() ||
      String(row.next_action ?? "").trim() ||
      session.outcome_id.replace(/_/g, " ");
    const approvalNote = liveNotes ? `${outcomeLabel}: ${liveNotes}` : outcomeLabel;
    if (
      !resolveProviderObservationStatusForEngagementOutcome({
        outcomeId: session.outcome_id,
        debriefText: approvalNote,
      })
    ) {
      continue;
    }

    const recordedAt = session.outcome_recorded_at;
    if (best && recordedAt <= best.recordedAt) continue;

    best = {
      outcomeId: session.outcome_id,
      outcomeLabel,
      approvalNote,
      recordedAt,
    };
  }

  return best;
}

function needsObservationApprovalReconcile(
  contact: Record<string, unknown>,
  targetStatus: ObservationStatusChoice,
): boolean {
  if (targetStatus === "permission_confirmed") {
    return !hasProviderObservationApprovalValidated(contact);
  }
  if (targetStatus === "permission_not_yet_confirmed" || targetStatus === "interested" || targetStatus === "denied") {
    const current = resolveObservationStatusFromContact(contact);
    return current === "unknown" || current === "interested";
  }
  return resolveObservationStatusFromContact(contact) === "unknown";
}

/** Persists observation approval status on the provider contact (shared by outcomes + reconcile). */
export async function applyEngagementObservationOutcomeToProvider(input: {
  providerId: string;
  userId: string;
  actorName: string;
  status: ObservationStatusChoice;
  approvalNote: string;
  captureContext: IntelligenceCaptureContext;
}): Promise<{ ok: true; contact: Record<string, unknown> } | { ok: false; error: string }> {
  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  if (loadErr || !existing) {
    return { ok: false, error: loadErr?.message || "Provider not found" };
  }
  if (!(await repCanAccessContact(input.userId, existing as never))) {
    return { ok: false, error: "Provider not found" };
  }

  const normalizedStatus =
    normalizeObservationApprovalStatus(String(input.status)) ?? input.status;

  const savePayload = buildObservationApprovalSavePayload({
    status: normalizedStatus,
    approvalNote: input.approvalNote,
  });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  mergeProviderWizardFieldsPatch(patch, savePayload.planning, {
    captureContext: input.captureContext,
    actor: { userId: input.userId, userName: input.actorName },
    existingMetadata: intelligenceMetadataFromContact(existing as Record<string, unknown>),
    existingContact: existing as Record<string, unknown>,
    fieldEvidence: savePayload.intelligence_field_evidence,
  });

  if (savePayload.intelligence_validate_fields.length > 0) {
    const mergedContact = { ...(existing as Record<string, unknown>), ...patch };
    patch.provider_intelligence_field_metadata = markIntelligenceFieldsValidated({
      existing: intelligenceMetadataFromContact(existing as Record<string, unknown>),
      dbKeys: savePayload.intelligence_validate_fields,
      fieldValues: mergedContact,
      actor: { userId: input.userId, userName: input.actorName },
    });
    patch.provider_planning_updated_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(patch)
    .eq("id", input.providerId)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, contact: data as Record<string, unknown> };
}

/**
 * When an engagement outcome recorded approval (or other observation status) but the provider
 * contact was never updated, sync from the latest recorded outcome.
 */
export async function reconcileProviderObservationApprovalFromEngagements(input: {
  providerId: string;
  userId: string;
  actorName: string;
  contact: Record<string, unknown>;
  engagementRows: ReadonlyArray<Record<string, unknown>>;
}): Promise<{ contact: Record<string, unknown>; updated: boolean }> {
  const latest = findLatestRecordedObservationOutcome(input.engagementRows);
  if (!latest) return { contact: input.contact, updated: false };

  const targetStatus = resolveProviderObservationStatusForEngagementOutcome({
    outcomeId: latest.outcomeId,
    debriefText: latest.approvalNote,
  });
  if (!targetStatus || !needsObservationApprovalReconcile(input.contact, targetStatus)) {
    return { contact: input.contact, updated: false };
  }

  const applied = await applyEngagementObservationOutcomeToProvider({
    providerId: input.providerId,
    userId: input.userId,
    actorName: input.actorName,
    status: targetStatus,
    approvalNote: latest.approvalNote,
    captureContext: {
      source_type: "engagement",
      source_label: latest.outcomeLabel,
    },
  });

  if (!applied.ok) return { contact: input.contact, updated: false };
  return { contact: applied.contact, updated: true };
}
