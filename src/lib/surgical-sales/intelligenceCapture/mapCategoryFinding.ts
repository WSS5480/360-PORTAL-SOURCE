/**
 * Finding-first intelligence capture — Category → Finding → Mapping (rep never sees mapping).
 */

import {
  assessObservationAccessFromDebrief,
  buildObservationAccessDebriefPersistValue,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import {
  buildDiscoveryMappingIntelligenceItem,
  mappedIntelligenceLabelForSignal,
  resolveStageMappingSignalForDbKey,
} from "@/lib/surgical-sales/discoveryMappingIntelligenceItem";
import type { DiscoveryMappingIntelligenceItem } from "@/lib/surgical-sales/discoveryMappingIntelligenceItem";
import {
  intelligenceCaptureCategoryDef,
  type IntelligenceCaptureCategoryId,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { opportunityIntelligenceSignalSpec } from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import { isOpportunityIntelligenceSignalId } from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import type { LogUpdateFieldPatch } from "@/lib/surgical-sales/logUpdateApplyProvider";
import { stageMappingRegistryDbKeys } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";

export const INTELLIGENCE_CAPTURE_FINDING_UI = {
  inputLabel: REP_INTELLIGENCE_VOCAB.whatDidYouLearn,
  inputPlaceholder: "Write what you heard or observed in your own words…",
  saveFinding: REP_INTELLIGENCE_VOCAB.saveFinding,
  savingFinding: "Saving…",
  savedFinding: "Finding saved",
  validateDetails: REP_INTELLIGENCE_VOCAB.addDetailsOptional,
  validateDetailsHint: REP_INTELLIGENCE_VOCAB.addDetailsHint,
  recentFindings: REP_INTELLIGENCE_VOCAB.recentFindings,
  noFindingsYet: REP_INTELLIGENCE_VOCAB.noCapturedYet,
  followUpNote: "We flagged a follow-up — capture more when you learn it.",
  detailsFootnote: "Saved details stay in this area.",
} as const;

export type CategoryFindingMappingResult = {
  fieldPatches: LogUpdateFieldPatch[];
  fieldEvidence: Record<string, string>;
  fieldDiscoveryMapping: Record<string, DiscoveryMappingIntelligenceItem>;
  followUpRequired: boolean;
  /** Rep-facing only — never expose internal field or signal names. */
  confirmationMessage: string;
};

const CATEGORY_PRIMARY_DB_KEY: Record<IntelligenceCaptureCategoryId, string> = {
  observation_access: "provider_observation_feasibility",
  access_pathway: "provider_observation_scheduling_control",
  credentialing_facility: "provider_observation_access_path",
  key_people_influence: "provider_champion_potential",
  clinical_focus: "provider_procedure_focus",
  opportunity_signals: "provider_future_opportunity_signals",
  procedure_workflow: "provider_workflow_pain_points",
  clinical_challenges: "provider_staff_frustrations",
  product_fit_evaluation: "provider_preference_card_signals",
  adoption_strategy: "provider_case_volume_estimate",
};

function primaryDbKeyForSignal(signalId: StageMappingSignalId): string {
  if (isOpportunityIntelligenceSignalId(signalId)) {
    return opportunityIntelligenceSignalSpec(signalId).dbKey;
  }
  return stageMappingRegistryDbKeys(signalId)[0] ?? CATEGORY_PRIMARY_DB_KEY.observation_access;
}

function routeDbKeysForFinding(
  categoryId: IntelligenceCaptureCategoryId,
  finding: string,
): string[] {
  const def = intelligenceCaptureCategoryDef(categoryId);
  const text = finding.trim();
  const keys = new Set<string>();

  const addSignal = (signalId: StageMappingSignalId) => {
    for (const dbKey of stageMappingRegistryDbKeys(signalId)) {
      keys.add(dbKey);
    }
    keys.add(primaryDbKeyForSignal(signalId));
  };

  switch (categoryId) {
    case "observation_access":
      addSignal("observation_approval");
      if (/\b(?:open|interest|not opposed|shouldn'?t be a problem|no problem|willing)\b/i.test(text)) {
        keys.add("provider_evaluation_openness");
      }
      break;
    case "access_pathway":
      if (/\bschedul|coordinator|karen|office|facility|or\s+time\b/i.test(text)) {
        addSignal("scheduling_owner");
      }
      if (/\b(?:date|week|tuesday|monday|scheduled|timing|when)\b/i.test(text)) {
        addSignal("observation_logistics");
      }
      if (keys.size === 0) {
        addSignal("scheduling_owner");
        addSignal("observation_logistics");
      }
      break;
    case "credentialing_facility":
      addSignal("facility_vendor_pathway");
      break;
    case "key_people_influence":
      addSignal("clinical_champion");
      if (/\bteam|staff|nurs|coordinator\b/i.test(text)) {
        keys.add("provider_or_team_dynamics");
      }
      break;
    case "clinical_focus":
      addSignal("workflow_visibility");
      if (/\b(?:outcome|priority|care about|focus)\b/i.test(text)) {
        addSignal("opportunity_outcome_priorities");
      }
      break;
    case "opportunity_signals":
      if (/\bcompetitor|versus|vs|product|vendor|use|tray|implant\b/i.test(text)) {
        addSignal("opportunity_products_in_use");
      } else if (/\bgap|missing|unmet|wish\b/i.test(text)) {
        addSignal("opportunity_product_gaps");
      } else if (/\bfrustrat|pain|challenge\b/i.test(text)) {
        addSignal("opportunity_clinical_frustrations");
      } else {
        addSignal("opportunity_future_signals");
      }
      break;
    case "procedure_workflow":
      if (/\broom setup|setup sequence|table position/i.test(text)) {
        keys.add("provider_observation_best_days_case_types");
      }
      if (/\binstrument|tray flow|passing|supply/i.test(text)) {
        addSignal("opportunity_workflow_inefficiencies");
      }
      if (/\bstaff|nurse|tech|interaction|coordination/i.test(text)) {
        keys.add("provider_or_team_dynamics");
      }
      if (/\bcase sequence|order of|workflow step/i.test(text)) {
        keys.add("provider_workflow_pain_points");
      }
      if (/\bpreference|prefers|always does/i.test(text)) {
        keys.add("provider_technique_preferences");
      }
      if (/\bbottleneck|delay|slow|waiting/i.test(text)) {
        addSignal("opportunity_workflow_inefficiencies");
        keys.add("provider_workflow_pain_points");
      }
      if (/\bturnover|between cases|flip the room/i.test(text)) {
        keys.add("provider_workflow_pain_points");
      }
      addSignal("opportunity_workflow_inefficiencies");
      keys.add("provider_workflow_pain_points");
      break;
    case "clinical_challenges":
      addSignal("opportunity_staff_frustrations");
      if (/\bclinical|surgeon|procedure\b/i.test(text)) {
        keys.add("provider_clinical_frustrations");
      }
      break;
    case "product_fit_evaluation":
      addSignal("product_alignment");
      break;
    case "adoption_strategy":
      addSignal("case_opportunity");
      if (/\bchampion\b/i.test(text)) {
        addSignal("clinical_champion");
      }
      break;
    default:
      for (const signalId of def.signalIds) {
        addSignal(signalId);
      }
  }

  if (keys.size === 0) {
    keys.add(CATEGORY_PRIMARY_DB_KEY[categoryId]);
  }

  return [...keys];
}

function mapObservationAccessFinding(finding: string): CategoryFindingMappingResult {
  const assessment = assessObservationAccessFromDebrief(finding);
  const persistValue = buildObservationAccessDebriefPersistValue(assessment);
  const dbKey = "provider_observation_feasibility";
  const signalId = "observation_approval" as const;

  const discoveryItem =
    buildDiscoveryMappingIntelligenceItem({
      dbKey,
      signalId,
      evidenceText: finding,
      fieldValue: persistValue,
      captureContext: { source_type: "profile", source_label: "Field intelligence" },
      confidence: assessment.observationApprovalExplicit ? "high" : "medium",
      status: assessment.observationApprovalExplicit ? "partial" : "potential_lead",
    }) ?? undefined;

  const fieldDiscoveryMapping: Record<string, DiscoveryMappingIntelligenceItem> = {};
  if (discoveryItem) fieldDiscoveryMapping[dbKey] = discoveryItem;

  const followUpRequired = !assessment.observationApprovalExplicit;
  let confirmationMessage = "Finding saved.";
  if (assessment.observationApprovalExplicit) {
    confirmationMessage = "Saved — observation access looks approved.";
  } else if (assessment.observationInterest) {
    confirmationMessage =
      "Saved — observation interest noted. We'll track follow-up to confirm approval.";
  }

  const fieldPatches: LogUpdateFieldPatch[] = [
    { dbKey, value: persistValue, mergeStrategy: "replace" },
  ];

  if (assessment.observationInterest) {
    fieldPatches.push({
      dbKey: "provider_evaluation_openness",
      value: "Open to observation",
      mergeStrategy: "append",
    });
  }

  const fieldEvidence: Record<string, string> = {
    [dbKey]: finding.trim(),
  };
  for (const patch of fieldPatches) {
    fieldEvidence[patch.dbKey] = finding.trim();
  }

  return {
    fieldPatches,
    fieldEvidence,
    fieldDiscoveryMapping,
    followUpRequired,
    confirmationMessage,
  };
}

function mapGenericCategoryFinding(input: {
  categoryId: IntelligenceCaptureCategoryId;
  finding: string;
}): CategoryFindingMappingResult {
  const finding = input.finding.trim();
  const dbKeys = routeDbKeysForFinding(input.categoryId, finding);
  const fieldPatches: LogUpdateFieldPatch[] = [];
  const fieldEvidence: Record<string, string> = {};
  const fieldDiscoveryMapping: Record<string, DiscoveryMappingIntelligenceItem> = {};

  for (const dbKey of dbKeys) {
    const signalId = resolveStageMappingSignalForDbKey(dbKey);
    const label = signalId ? mappedIntelligenceLabelForSignal(signalId) : input.categoryId;
    const appendValue = `${label}: ${finding}`;

    fieldPatches.push({
      dbKey,
      value: appendValue,
      mergeStrategy: "append",
    });
    fieldEvidence[dbKey] = finding;

    const item = buildDiscoveryMappingIntelligenceItem({
      dbKey,
      signalId,
      evidenceText: finding,
      fieldValue: appendValue,
      captureContext: { source_type: "profile", source_label: "Field intelligence" },
      confidence: "medium",
      status: "partial",
    });
    if (item) fieldDiscoveryMapping[dbKey] = item;
  }

  return {
    fieldPatches,
    fieldEvidence,
    fieldDiscoveryMapping,
    followUpRequired: true,
    confirmationMessage: "Finding saved — we'll use this to sharpen what we know about this area.",
  };
}

/** Map rep finding text to internal intelligence patches (server-side only). */
export function mapCategoryFinding(input: {
  categoryId: IntelligenceCaptureCategoryId;
  finding: string;
}): CategoryFindingMappingResult | null {
  const finding = input.finding.trim();
  if (!finding) return null;

  if (input.categoryId === "observation_access") {
    const assessment = assessObservationAccessFromDebrief(finding);
    if (assessment.observationInterest || assessment.observationApprovalExplicit) {
      return mapObservationAccessFinding(finding);
    }
    return mapGenericCategoryFinding(input);
  }

  return mapGenericCategoryFinding(input);
}
