/**
 * Post-observation provider debrief completion — validation workflow guardrails.
 * Does not change extraction/OIE; filters review + save behavior only.
 */

import { scoreDebriefCommercialPriority } from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";
import type { DebriefPrioritizedPattern } from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";
import {
  canonicalizeDebriefFindingKey,
  commercialStatusPreventsOpportunityCreation,
} from "@/lib/surgical-sales/engagements/debriefCompletionFindingStatus";
import type {
  DebriefCompletionContext,
  DebriefCompletionContextSnapshot,
  DebriefCompletionObservationPatternSnapshot,
  DebriefPatternValidationResult,
} from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";

function normalizeDebriefPatternKey(label: string): string {
  return canonicalizeDebriefFindingKey(label);
}

/** Discovery / access fields — suppress unless debrief narrative explicitly discusses them. */
export const POST_OBSERVATION_ACCESS_FIELD_KEYS = new Set([
  "provider_observation_access_path",
  "provider_observation_feasibility",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_credentialing_platform_name",
  "provider_credentialing_platform_id",
  "provider_observation_coordinator_contact",
  "provider_observation_best_days_case_types",
  "provider_ideal_observation_cases",
  "provider_observation_cadence_preference",
  "provider_first_observation_questions",
]);

/** Profile fields that must not be re-emitted from weak observation rediscovery. */
export const POST_OBSERVATION_REDISCOVERY_FIELD_KEYS = new Set([
  "provider_procedure_focus",
  "provider_clinical_frustrations",
  "provider_workflow_pain_points",
  "provider_dissatisfaction_areas",
  "provider_staff_frustrations",
  "provider_product_gaps",
  "provider_competitive_products",
  "provider_technique_preferences",
  "provider_technique_detail",
  "provider_preference_card_signals",
  "provider_case_volume_estimate",
]);

const NARRATIVE_ACCESS_MENTION =
  /\b(credential|reptrax|vendor credential|observation access|or access|operating room access|coordinator|scheduling access|facility access|credentialing platform|get credentialed)\b/i;

const NARRATIVE_PROCEDURE_FOCUS_MENTION =
  /\b(procedure focus|focuses on|primarily (does|performs)|case mix|volume is increasing|new procedure)\b/i;

const NARRATIVE_PRODUCT_CHANGE_MENTION =
  /\b(switch(ing)? products|change products|replace bard|replace mesh|moving away from|adopt(ing)? a new product)\b/i;

const NARRATIVE_CLINICAL_FRUSTRATION_MENTION =
  /\b(frustrat(ed|ing|ion)|significant problem|slows (him|her|them|me) down|real pain|worth addressing now)\b/i;

function narrativeExplicitlyStatesMajorClinicalPain(narrative: string): boolean {
  const text = narrative.trim();
  if (
    /\b(no major workflow|not a significant|does not typically slow|generally go smoothly|not meaningful)\b/i.test(
      text,
    )
  ) {
    return false;
  }
  return (
    NARRATIVE_CLINICAL_FRUSTRATION_MENTION.test(text) ||
    /\bmajor workflow issue(s)? today\b/i.test(text)
  );
}

const NARRATIVE_EVALUATION_REQUESTED =
  /\b(request(ed|ing)? (a )?(product )?trial|schedule(d)? (an )?evaluat|two[- ]case|acsis|pilot case|test drive|start an evaluation)\b/i;

const NARRATIVE_EVALUATION_DECLINED =
  /\b(no evaluation|no evaluat|not requested|not actively looking|not looking to change|stay with current|comfortable with the current)\b/i;

const NARRATIVE_FUTURE_CONDITIONAL_INTEREST =
  /\b(open to reviewing|if there were a meaningful|meaningful clinical or workflow advantage|in the future|would consider|when it makes sense)\b/i;

const NARRATIVE_NO_MAJOR_ISSUES =
  /\b(no major workflow|generally go smoothly|not a significant problem|does not typically slow|not actively looking)\b/i;

export function narrativeExplicitlyMentionsAccessLogistics(narrative: string): boolean {
  return NARRATIVE_ACCESS_MENTION.test(narrative.trim());
}

export function narrativeExplicitlyMentionsProcedureFocusUpdate(narrative: string): boolean {
  return NARRATIVE_PROCEDURE_FOCUS_MENTION.test(narrative.trim());
}

const NARRATIVE_CURRENT_PRODUCT_MENTION =
  /\b(comfortable with (?:the )?current|uses?|using|standard product|current (?:product|mesh|workflow)|(?:mesh|product)\b[^.!?;]{0,80}\b(?:uses?|using|comfortable|workflow)|stay with current)\b/i;

export function narrativeExplicitlyMentionsProductChange(narrative: string): boolean {
  return NARRATIVE_PRODUCT_CHANGE_MENTION.test(narrative.trim());
}

export function narrativeExplicitlyMentionsCurrentProduct(narrative: string): boolean {
  return NARRATIVE_CURRENT_PRODUCT_MENTION.test(narrative.trim());
}

export function serializeDebriefCompletionObservationPattern(
  pattern: DebriefPrioritizedPattern,
): DebriefCompletionObservationPatternSnapshot {
  return {
    label: pattern.label,
    normalizedKey: normalizeDebriefPatternKey(pattern.label),
    frequency: `${pattern.count} of ${pattern.total}`,
    observationCount: pattern.count,
    totalObservationCount: pattern.total,
    priority: scoreDebriefCommercialPriority(pattern),
  };
}

export function serializeDebriefCompletionContextForSnapshot(
  context: DebriefCompletionContext,
): DebriefCompletionContextSnapshot {
  return {
    loadedAt: context.loadedAt,
    completedObservationCount: context.completedObservationCount,
    isPostObservationProviderDebrief: context.isPostObservationProviderDebrief,
    hypothesisText: context.hypothesisText,
    desiredOutcome: context.desiredOutcome,
    desiredOutcomeOther: context.desiredOutcomeOther,
    primaryHypothesisPattern: context.primaryHypothesisPattern
      ? serializeDebriefCompletionObservationPattern(context.primaryHypothesisPattern)
      : null,
    observationPatterns: context.observationPatterns.map(serializeDebriefCompletionObservationPattern),
  };
}

function fieldUpdateExplicitlySupported(input: {
  dbKey: string;
  label: string;
  proposedValue: string;
  narrative: string;
}): boolean {
  const blob = `${input.narrative} ${input.label} ${input.proposedValue}`.toLowerCase();
  const value = String(input.proposedValue ?? "").trim().toLowerCase();
  if (!value) return false;

  const valueTokens = value.split(/[^a-z0-9]+/).filter((token) => token.length >= 5);
  return valueTokens.some((token) => blob.includes(token));
}

export function shouldSuppressPostObservationFieldUpdate(input: {
  dbKey: string;
  label: string;
  proposedValue?: string | null;
  narrative: string;
  validationResults?: DebriefPatternValidationResult[];
}): boolean {
  const dbKey = String(input.dbKey ?? "").trim();
  const narrative = input.narrative.trim();
  const proposedValue = String(input.proposedValue ?? "").trim();

  if (POST_OBSERVATION_ACCESS_FIELD_KEYS.has(dbKey)) {
    return !narrativeExplicitlyMentionsAccessLogistics(narrative);
  }

  if (dbKey === "provider_procedure_focus") {
    return !narrativeExplicitlyMentionsProcedureFocusUpdate(narrative);
  }

  if (dbKey === "provider_competitive_products") {
    if (narrativeExplicitlyMentionsProductChange(narrative)) return false;
    if (narrativeExplicitlyMentionsCurrentProduct(narrative)) return false;
    if (fieldUpdateExplicitlySupported({ dbKey, label: input.label, proposedValue, narrative })) {
      return false;
    }
    return true;
  }

  if (dbKey === "provider_product_gaps" || dbKey === "provider_dissatisfaction_areas") {
    return !narrativeExplicitlyMentionsProductChange(narrative);
  }

  if (
    dbKey === "provider_clinical_frustrations" ||
    dbKey === "provider_workflow_pain_points" ||
    dbKey === "provider_staff_frustrations"
  ) {
    if (narrativeExplicitlyStatesMajorClinicalPain(narrative)) return false;
    const relatedValidation =
      input.validationResults?.find((row) => row.commercial_status === "validated_pain_point") ??
      input.validationResults?.find((row) => commercialStatusPreventsOpportunityCreation(row.commercial_status));
    if (relatedValidation?.commercial_status === "validated_pain_point") return false;
    if (relatedValidation && commercialStatusPreventsOpportunityCreation(relatedValidation.commercial_status)) {
      return true;
    }
    if (NARRATIVE_NO_MAJOR_ISSUES.test(narrative)) return true;
    return true;
  }

  if (POST_OBSERVATION_REDISCOVERY_FIELD_KEYS.has(dbKey)) {
    if (fieldUpdateExplicitlySupported({ dbKey, label: input.label, proposedValue, narrative })) {
      return false;
    }
    return true;
  }

  if (dbKey === "provider_evaluation_path" || dbKey === "provider_commitment_interest") {
    if (NARRATIVE_EVALUATION_DECLINED.test(narrative) && !NARRATIVE_EVALUATION_REQUESTED.test(narrative)) {
      return true;
    }
  }

  return false;
}

function suppressFieldUpdate(
  update: LogUpdateRoutedFieldUpdate,
  narrative: string,
  validationResults?: DebriefPatternValidationResult[],
): LogUpdateRoutedFieldUpdate {
  if (
    !shouldSuppressPostObservationFieldUpdate({
      dbKey: update.dbKey,
      label: update.label,
      proposedValue: update.proposedValue,
      narrative,
      validationResults,
    })
  ) {
    return update;
  }

  return {
    ...update,
    accepted: false,
  };
}

export function applyPostObservationDebriefReviewGuard(input: {
  logUpdate: LogUpdateParseResult;
  narrative: string;
  validationResults?: DebriefPatternValidationResult[];
}): LogUpdateParseResult {
  const narrative = input.narrative.trim();
  const fieldUpdates = input.logUpdate.fieldUpdates.map((update) =>
    suppressFieldUpdate(update, narrative, input.validationResults),
  );
  const suppressedFieldUpdateIds = new Set(
    fieldUpdates.filter((update) => !update.accepted).map((update) => update.id),
  );
  const suggestedUpdates = input.logUpdate.suggestedUpdates?.map((update) =>
    suppressedFieldUpdateIds.has(update.id) ? { ...update, accepted: false } : update,
  );

  return {
    ...input.logUpdate,
    fieldUpdates,
    suggestedUpdates: suggestedUpdates ?? input.logUpdate.suggestedUpdates,
  };
}

/** Auto-accept profile updates that survive post-observation guardrails (completion debrief flow). */
export function autoAcceptPostObservationDebriefFieldUpdates(input: {
  logUpdate: LogUpdateParseResult;
  narrative: string;
  validationResults?: DebriefPatternValidationResult[];
}): LogUpdateParseResult {
  const narrative = input.narrative.trim();
  const fieldUpdates = input.logUpdate.fieldUpdates.map((update) => {
    if (update.conflict && !update.conflict.resolution) return update;
    if (
      shouldSuppressPostObservationFieldUpdate({
        dbKey: update.dbKey,
        label: update.label,
        proposedValue: update.proposedValue,
        narrative,
        validationResults: input.validationResults,
      })
    ) {
      return { ...update, accepted: false };
    }
    const value = String(update.proposedValue ?? "").trim();
    if (!value) return { ...update, accepted: false };
    return { ...update, accepted: true };
  });

  return {
    ...input.logUpdate,
    fieldUpdates,
  };
}

export function filterPostObservationDebriefCommitPatches(input: {
  fieldPatches: Array<{ dbKey: string; value: string; mergeStrategy: "replace" | "append" }>;
  narrative: string;
  validationResults?: DebriefPatternValidationResult[];
}): Array<{ dbKey: string; value: string; mergeStrategy: "replace" | "append" }> {
  return input.fieldPatches.filter(
    (patch) =>
      !shouldSuppressPostObservationFieldUpdate({
        dbKey: patch.dbKey,
        label: patch.dbKey,
        proposedValue: patch.value,
        narrative: input.narrative,
        validationResults: input.validationResults,
      }),
  );
}

export {
  NARRATIVE_EVALUATION_DECLINED,
  NARRATIVE_EVALUATION_REQUESTED,
  NARRATIVE_FUTURE_CONDITIONAL_INTEREST,
  NARRATIVE_NO_MAJOR_ISSUES,
};

/** Minimal completion context when analyze state was lost before save. */
export function buildFallbackPostObservationDebriefCompletionContext(): DebriefCompletionContext {
  return {
    loadedAt: new Date().toISOString(),
    completedObservationCount: 0,
    isPostObservationProviderDebrief: true,
    prepareWorkspace: null,
    observationPatterns: [],
    primaryHypothesisPattern: null,
    hypothesisText: "",
    desiredOutcome: null,
    desiredOutcomeOther: "",
  };
}
