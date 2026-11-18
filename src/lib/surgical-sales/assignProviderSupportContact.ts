/**
 * Link a support contact to a provider and persist intelligence on the provider row.
 * Reused across overview workflow, Rapid Discovery, and quick capture.
 */

import type { DiscoverySupportContactSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import {
  buildDiscoverySupportContactPlanningPatch,
  discoverySupportContactRelationshipNotes,
  discoverySupportContactValidateFields,
} from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import {
  formatIntelligenceValueFromSupportContact,
  SCHEDULING_OWNER_INTELLIGENCE_DB_KEY,
  schedulingOwnerDisplayRoleLabel,
  syncDraftRoleId,
} from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { workflowResponsibilityLabel } from "@/lib/surgical-sales/operationalSupportContact";
import {
  saveRapidDiscoverySupportContact,
  type RapidDiscoveryLinkedSupportContact,
} from "@/lib/surgical-sales/saveRapidDiscoverySupportContact";
import { readFetchJson } from "@/lib/surgical-sales/readFetchJson";
import type { SurgicalContactVerificationStatus } from "@/lib/surgical-sales/contactConstants";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";

export type AssignProviderSupportContactResult = {
  provider: Record<string, unknown>;
  linked: RapidDiscoveryLinkedSupportContact;
};

export async function assignProviderSupportContact(input: {
  providerId: string;
  dbKey: string;
  draft: RapidDiscoverySupportContactDraft;
  sourceLabel?: string;
  validate?: boolean;
  verificationStatus?: SurgicalContactVerificationStatus;
  discoverySignalId?: DiscoverySupportContactSignalId;
  planningPatch?: Record<string, string>;
  validateFields?: string[];
}): Promise<AssignProviderSupportContactResult> {
  const draft = syncDraftRoleId(input.draft);
  const relationshipNotes = input.discoverySignalId
    ? discoverySupportContactRelationshipNotes(input.discoverySignalId)
    : input.dbKey === SCHEDULING_OWNER_INTELLIGENCE_DB_KEY
      ? "Scheduling owner / coordinator for observation access"
      : undefined;

  const linked = await saveRapidDiscoverySupportContact({
    providerId: input.providerId,
    draft,
    dbKey: input.dbKey,
    relationshipNotes,
    verificationStatus: input.verificationStatus ?? "verified",
  });

  const primaryWorkflow = draft.workflowResponsibilities[0]
    ? workflowResponsibilityLabel(draft.workflowResponsibilities[0])
    : input.dbKey === SCHEDULING_OWNER_INTELLIGENCE_DB_KEY
      ? schedulingOwnerDisplayRoleLabel()
      : draft.jobTitle.trim();
  const intelligenceValue = formatIntelligenceValueFromSupportContact(
    linked.contact,
    primaryWorkflow,
    draft.notes,
    {
      jobTitle: draft.jobTitle.trim() || undefined,
      workflowResponsibilityIds: draft.workflowResponsibilities,
    },
  );

  const planning =
    input.planningPatch ??
    (input.discoverySignalId
      ? buildDiscoverySupportContactPlanningPatch({
          signalId: input.discoverySignalId,
          intelligenceValue,
        })
      : { [input.dbKey]: intelligenceValue });

  const body: Record<string, unknown> = {
    planning,
    planning_capture_context: {
      source_type: "profile",
      source_label: input.sourceLabel ?? "Provider profile",
    },
  };

  if (input.validate !== false) {
    body.intelligence_validate_fields =
      input.validateFields ??
      (input.discoverySignalId
        ? discoverySupportContactValidateFields(input.discoverySignalId)
        : [input.dbKey]);
  }

  const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(input.providerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await readFetchJson<{
    ok?: boolean;
    provider?: Record<string, unknown>;
    error?: string;
  }>(res, "Could not save provider intelligence");
  if (!res.ok || !payload.provider) {
    throw new Error(payload.error ?? "Could not save provider intelligence.");
  }

  return {
    provider: payload.provider,
    linked: { ...linked, intelligenceValue },
  };
}
