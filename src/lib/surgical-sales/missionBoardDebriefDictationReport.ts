/**
 * Report shape for Mission Board post-complete debrief dictation — mirrors tactical debrief field targets.
 */

import { buildDebriefRecommendedNextSteps } from "@/lib/surgical-sales/debriefRepFriendlyReview";
import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefDiscoveryPersistPayload } from "@/lib/surgical-sales/debriefDiscoveryMappingPipeline";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { deriveGatedPathwayStage, type PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

export type MissionBoardDebriefDictationReportField =
  | "provider_product_fit_validated"
  | "provider_evaluation_path"
  | "provider_commitment_interest"
  | "follow_up_needed"
  | "barriers_issues"
  | "provider_feedback"
  | "staff_feedback"
  | "next_step"
  | "debrief_summary";

export type MissionBoardDebriefDictationReport = {
  fields: Record<MissionBoardDebriefDictationReportField, string | null>;
  acceptedDbKeys: string[];
  pathwayStageBefore: SalesPathwayStageId;
  pathwayStageAfter: SalesPathwayStageId;
  providerStageChanged: boolean;
  followUpTasks: string[];
  proposedContacts: Array<{ name: string; role: string | null }>;
};

const REPORT_FIELD_DB_KEYS: Record<
  MissionBoardDebriefDictationReportField,
  readonly string[]
> = {
  provider_product_fit_validated: ["provider_product_fit_validated", "provider_preference_card_signals"],
  provider_evaluation_path: ["provider_evaluation_path", "provider_evaluation_path_notes"],
  provider_commitment_interest: [
    "provider_evaluation_openness",
    "provider_commitment_confirmed",
    "provider_commitment_type",
    "provider_commitment_product_path",
  ],
  follow_up_needed: ["provider_follow_up_approach", "provider_observation_feasibility"],
  barriers_issues: [
    "provider_workflow_pain_points",
    "provider_dissatisfaction_areas",
    "provider_clinical_frustrations",
    "provider_observation_blockers",
    "provider_observation_access_path",
  ],
  provider_feedback: [
    "provider_clinical_frustrations",
    "provider_dissatisfaction_areas",
    "provider_workflow_pain_points",
    "provider_preference_card_signals",
  ],
  staff_feedback: ["provider_or_team_dynamics", "provider_scheduling_contact"],
  next_step: [
    "provider_follow_up_approach",
    "provider_rep_strategy_notes",
    "provider_observation_best_days_case_types",
  ],
  debrief_summary: [],
};

function firstMatchingValue(
  dbKeys: readonly string[],
  contactPatch: Record<string, unknown>,
  existingContact: Record<string, unknown>,
  acceptedUpdates: LogUpdateParseResult["fieldUpdates"],
): string | null {
  for (const key of dbKeys) {
    const patchVal = String(contactPatch[key] ?? "").trim();
    if (patchVal) return patchVal;
    const update = acceptedUpdates.find((u) => u.dbKey === key && u.accepted);
    if (update?.proposedValue?.trim()) return update.proposedValue.trim();
    const existingVal = String(existingContact[key] ?? "").trim();
    if (existingVal) return existingVal;
  }
  return null;
}

export function buildMissionBoardDebriefDictationReport(input: {
  dictation: string;
  logUpdate: LogUpdateParseResult;
  extraction: DebriefIntelligenceExtractionReview;
  proposedContacts: DebriefProposedContactItem[];
  persistPayload: DebriefDiscoveryPersistPayload;
  pathwayGate: PathwayGateInput;
}): MissionBoardDebriefDictationReport {
  const acceptedUpdates = input.logUpdate.fieldUpdates.filter((u) => u.accepted);
  const contactPatch = input.persistPayload.contactPatch;
  const existingContact = input.pathwayGate.contact;
  const pathwayStageBefore = deriveGatedPathwayStage(input.pathwayGate);
  const mergedContact = {
    ...input.pathwayGate.contact,
    ...contactPatch,
  };
  const pathwayStageAfter = deriveGatedPathwayStage({
    ...input.pathwayGate,
    contact: mergedContact,
  });

  const recommendedNextSteps = buildDebriefRecommendedNextSteps({
    review: input.logUpdate,
    extraction: input.extraction,
    proposedContacts: input.proposedContacts,
    followUp: { required: [], helpful: [] },
  });

  const followUpFromUpdates = firstMatchingValue(
    REPORT_FIELD_DB_KEYS.follow_up_needed,
    contactPatch,
    existingContact,
    acceptedUpdates,
  );
  const followUpTasks = [
    ...recommendedNextSteps,
    ...(followUpFromUpdates ? [followUpFromUpdates] : []),
  ].filter(Boolean);

  const fields = {} as Record<MissionBoardDebriefDictationReportField, string | null>;
  for (const field of Object.keys(REPORT_FIELD_DB_KEYS) as MissionBoardDebriefDictationReportField[]) {
    if (field === "debrief_summary") {
      fields.debrief_summary =
        input.logUpdate.intelligenceReview.summary?.trim() ||
        input.dictation.trim().slice(0, 500) ||
        null;
      continue;
    }
    if (field === "follow_up_needed") {
      fields.follow_up_needed = followUpTasks.length > 0 ? followUpTasks.join(" · ") : null;
      continue;
    }
    fields[field] = firstMatchingValue(REPORT_FIELD_DB_KEYS[field], contactPatch, existingContact, acceptedUpdates);
  }

  return {
    fields,
    acceptedDbKeys: acceptedUpdates.map((u) => u.dbKey),
    pathwayStageBefore,
    pathwayStageAfter,
    providerStageChanged: pathwayStageBefore !== pathwayStageAfter,
    followUpTasks,
    proposedContacts: input.proposedContacts.map((c) => ({
      name: c.displayName,
      role: c.roleLabel ?? null,
    })),
  };
}
