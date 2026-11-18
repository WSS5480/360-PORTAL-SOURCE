/**
 * Rapid Discovery — persist intelligence answer + operational classification in one PATCH.
 */

import type { IntelligenceCaptureContext } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { STAGE_MAPPING_CAPTURE_CONTEXT } from "@/lib/surgical-sales/stageMappingSourceAttribution";
import {
  operationalStatusToDiscoveryStance,
  shouldValidateFieldOnSave,
  type RapidDiscoveryOperationalStatus,
} from "@/lib/surgical-sales/rapidDiscoveryOperationalStatus";
import type { IntelligenceDiscoveryStance } from "@/lib/surgical-sales/operationalIntelligenceReadiness";

export async function persistRapidDiscoveryAnswer(input: {
  providerId: string;
  dbKey: string;
  value: string;
  operationalStatus: RapidDiscoveryOperationalStatus;
  additionalPlanning?: Record<string, string | null>;
  fieldEvidence?: Record<string, string>;
  fieldAccessBlockers?: Record<string, string | null | undefined>;
  additionalValidateFields?: string[];
  discoveryStanceOverride?: {
    stance: IntelligenceDiscoveryStance;
    uncertaintyKind?: "unexplored" | "opaque";
  };
  validateFieldOverride?: boolean;
  captureContext?: IntelligenceCaptureContext;
}): Promise<Record<string, unknown>> {
  const defaultStance = operationalStatusToDiscoveryStance(input.operationalStatus);
  const stanceInfo = input.discoveryStanceOverride
    ? {
        stance: input.discoveryStanceOverride.stance,
        uncertaintyKind: input.discoveryStanceOverride.uncertaintyKind,
      }
    : defaultStance;
  const body: Record<string, unknown> = {
    planning: {
      [input.dbKey]: input.value,
      ...input.additionalPlanning,
    },
    planning_capture_context: input.captureContext ?? STAGE_MAPPING_CAPTURE_CONTEXT,
    intelligence_discovery_stances: {
      [input.dbKey]: {
        stance: stanceInfo.stance,
        uncertainty_kind: stanceInfo.uncertaintyKind,
      },
    },
  };

  if (input.fieldEvidence && Object.keys(input.fieldEvidence).length > 0) {
    body.intelligence_field_evidence = input.fieldEvidence;
  }
  if (input.fieldAccessBlockers && Object.keys(input.fieldAccessBlockers).length > 0) {
    body.intelligence_field_access_blockers = input.fieldAccessBlockers;
  }

  const validateFields = new Set<string>();
  if (input.validateFieldOverride ?? shouldValidateFieldOnSave(input.operationalStatus)) {
    validateFields.add(input.dbKey);
  }
  for (const key of input.additionalValidateFields ?? []) {
    validateFields.add(key);
  }
  if (validateFields.size > 0) {
    body.intelligence_validate_fields = [...validateFields];
  }

  const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(input.providerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as { ok?: boolean; provider?: Record<string, unknown>; error?: string };
  if (!res.ok || !j.provider) {
    throw new Error(j.error ?? "Could not save Rapid Discovery answer.");
  }
  return j.provider;
}
