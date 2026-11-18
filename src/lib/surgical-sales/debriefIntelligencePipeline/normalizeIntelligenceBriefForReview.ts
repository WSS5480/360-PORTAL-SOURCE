/**
 * Normalize intelligence brief outcomes before review display — collapse
 * semantically equivalent access-pathway signals into one rep-facing statement.
 */

import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  INTELLIGENCE_BRIEF_CONFIRMED,
  INTELLIGENCE_BRIEF_OBSERVATION_SUMMARY,
  INTELLIGENCE_BRIEF_PRODUCT_STATUS,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import type {
  DebriefIntelligenceBrief,
  IntelligenceBriefOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { textNegatesCredentialingRequirement } from "@/lib/surgical-sales/intelligenceContradictionDetection";
import { canonicalizeDebriefFindingKey } from "@/lib/surgical-sales/engagements/debriefCompletionFindingStatus";

export const ACCESS_PATHWAY_STATEMENT_OBSERVATION_ALLOWED =
  "Observation allowed after credentialing";
export const ACCESS_PATHWAY_STATEMENT_CREDENTIALING_REQUIRED =
  "Credentialing required before observation";

const ACCESS_PATHWAY_FIELD_IDS = new Set([
  "vendor_credentialing",
  "observation_allowance",
  "credentialing_gate",
  "observation_approval",
  "morning_case_access",
]);

const ACCESS_PATHWAY_DB_KEYS = new Set([
  "provider_observation_feasibility",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_observation_access_path",
]);

const EXPLICIT_OBSERVATION_AFTER_CREDENTIALING_RE =
  /\b(?:can|may|could|we\s+can)\s+observe\b[\s\S]{0,80}\b(?:once|after|when)\s+credential/i;
const OBSERVATION_ALLOWED_AFTER_CREDENTIALING_RE =
  /\b(?:allowed|permitted|can\s+observe|observation\s+is\s+allowed|we\s+can\s+observe|observe\s+once)\b[\s\S]{0,80}\b(?:once|after|when|only\s+after)\s+credential/i;
const CREDENTIALING_GATE_BEFORE_OBSERVATION_RE =
  /\b(?:only\s+after|before\s+observ|once\s+credential|when\s+credential|after\s+credential|credentialing\s+(?:is\s+)?(?:required|must|complete))\b/i;
const OBSERVATION_POSITIVE_RE =
  /\b(?:can\s+observe|allowed|permitted|not\s+a\s+problem|possible|open\s+to)\b/i;
const HEDGED_OR_UNCERTAIN_RE =
  /\b(?:might|maybe|possibly|unclear|unknown|not\s+sure|seems?\s+like|appears?\s+to)\b/i;

export type AccessPathwayNormalization = {
  statement: string;
  statusLine: string;
};

export type NormalizeIntelligenceBriefOptions = {
  sourceText?: string;
  fieldUpdates?: LogUpdateRoutedFieldUpdate[];
};

export function isAccessPathwayFieldUpdate(field: LogUpdateRoutedFieldUpdate): boolean {
  if (ACCESS_PATHWAY_FIELD_IDS.has(field.id)) return true;
  return ACCESS_PATHWAY_DB_KEYS.has(field.dbKey);
}

function contextBlob(
  sourceText: string,
  fieldUpdates: LogUpdateRoutedFieldUpdate[],
  evidenceQuotes: string[] = [],
): string {
  const fieldValues = fieldUpdates
    .filter(isAccessPathwayFieldUpdate)
    .map((field) => `${field.label} ${field.proposedValue}`)
    .join(" ");
  return `${sourceText} ${fieldValues} ${evidenceQuotes.join(" ")}`.trim();
}

export function normalizeAccessPathwayFromContext(
  sourceText: string,
  fieldUpdates: LogUpdateRoutedFieldUpdate[] = [],
  evidenceQuotes: string[] = [],
): AccessPathwayNormalization | null {
  const blob = contextBlob(sourceText, fieldUpdates, evidenceQuotes);
  if (!blob.trim()) return null;

  // A reversal ("credentialing is no longer required") must not normalize into
  // a credentialing-gate statement — the conflict item handles it instead.
  const hasCredentialingGate =
    CREDENTIALING_GATE_BEFORE_OBSERVATION_RE.test(blob) &&
    !textNegatesCredentialingRequirement(blob);
  const hasObservationPathway =
    OBSERVATION_POSITIVE_RE.test(blob) ||
    /\bobserv/i.test(blob) ||
    fieldUpdates.some((field) => field.id === "observation_allowance");

  if (!hasCredentialingGate && !hasObservationPathway) return null;

  const explicitAllowed =
    EXPLICIT_OBSERVATION_AFTER_CREDENTIALING_RE.test(blob) ||
    OBSERVATION_ALLOWED_AFTER_CREDENTIALING_RE.test(blob);

  if (explicitAllowed) {
    return {
      statement: ACCESS_PATHWAY_STATEMENT_OBSERVATION_ALLOWED,
      statusLine: INTELLIGENCE_BRIEF_CONFIRMED,
    };
  }

  if (hasCredentialingGate && hasObservationPathway) {
    const confirmed = !HEDGED_OR_UNCERTAIN_RE.test(blob);
    return {
      statement: ACCESS_PATHWAY_STATEMENT_OBSERVATION_ALLOWED,
      statusLine: confirmed
        ? INTELLIGENCE_BRIEF_CONFIRMED
        : INTELLIGENCE_BRIEF_PRODUCT_STATUS.needsConfirmation,
    };
  }

  if (hasCredentialingGate) {
    const confirmed =
      /\b(?:required|must|before\s+observ|complete\s+before)\b/i.test(blob) &&
      !HEDGED_OR_UNCERTAIN_RE.test(blob);
    return {
      statement: ACCESS_PATHWAY_STATEMENT_CREDENTIALING_REQUIRED,
      statusLine: confirmed
        ? INTELLIGENCE_BRIEF_CONFIRMED
        : INTELLIGENCE_BRIEF_PRODUCT_STATUS.needsConfirmation,
    };
  }

  return null;
}

const ACCESS_PATHWAY_DUPLICATE_SURFACE_RE =
  /\b(?:vendor credentialing on file|whether observation is allowed|credentialing required before observation|facility\b[\s\S]{0,40}access pathway|observation access pathway)\b/i;

function isCredentialingWorkflowInsight(line: string): boolean {
  return (
    ACCESS_PATHWAY_DUPLICATE_SURFACE_RE.test(line) ||
    /\b(?:credentialing?|vendor credential|observation.*allow|whether observation)\b/i.test(line)
  );
}

function isDuplicateAccessPathwaySurface(line: string): boolean {
  return isCredentialingWorkflowInsight(line);
}

function mergeLinkedFieldUpdateIds(
  ...groups: Array<readonly string[] | undefined>
): string[] {
  return [...new Set(groups.flat().filter(Boolean) as string[])];
}

/** Collapse access-pathway cards in the brief before outcomes are built. */
export function normalizeDebriefIntelligenceBriefForReview(
  brief: DebriefIntelligenceBrief,
  options: NormalizeIntelligenceBriefOptions = {},
): DebriefIntelligenceBrief {
  const sourceText = options.sourceText?.trim() ?? "";
  const fieldUpdates = options.fieldUpdates ?? [];
  const pathwayFields = fieldUpdates.filter(isAccessPathwayFieldUpdate);
  const norm = normalizeAccessPathwayFromContext(
    sourceText,
    fieldUpdates,
    brief.observationAccess?.evidenceQuotes ?? [],
  );

  let observationAccess = brief.observationAccess;
  const droppedWorkflowIds = brief.workflowInsights
    .filter((workflow) => isCredentialingWorkflowInsight(workflow.primaryLine))
    .map((workflow) => workflow.cardId);

  const workflowInsights = brief.workflowInsights.filter(
    (workflow) => !isCredentialingWorkflowInsight(workflow.primaryLine),
  );

  if (!observationAccess && norm && pathwayFields.length > 0) {
    observationAccess = {
      kind: "observation_access",
      id: "review-access-pathway-normalized",
      cardId: "review-access-pathway-normalized",
      bullets: [norm.statement],
      observationFields: { status: "", approval: "", requirements: "" },
      evidenceQuotes: sourceText ? [`"${sourceText}"`] : [],
      linkedFieldUpdateIds: pathwayFields.map((field) => field.id),
      confirmActionType: "update_access_status",
      dismissActionType: "ignore",
    };
  } else if (observationAccess && norm) {
    const mergedFieldIds = mergeLinkedFieldUpdateIds(
      observationAccess.linkedFieldUpdateIds,
      pathwayFields.map((field) => field.id),
      brief.workflowInsights
        .filter((workflow) => droppedWorkflowIds.includes(workflow.cardId))
        .flatMap((workflow) => workflow.linkedFieldUpdateIds),
    );
    observationAccess = {
      ...observationAccess,
      bullets: [norm.statement],
      observationFields: { status: "", approval: "", requirements: "" },
      linkedFieldUpdateIds: mergedFieldIds,
    };
  }

  return {
    ...brief,
    observationAccess,
    workflowInsights,
  };
}

function applyAccessPathwayNormalizationToOutcome(
  outcome: IntelligenceBriefOutcome,
  norm: AccessPathwayNormalization,
  fieldUpdates: LogUpdateRoutedFieldUpdate[],
): IntelligenceBriefOutcome {
  const pathwayFieldIds = fieldUpdates.filter(isAccessPathwayFieldUpdate).map((field) => field.id);
  return {
    ...outcome,
    summaryLine: norm.statement,
    statusLine: norm.statusLine,
    observationFields: undefined,
    bullets: [norm.statement],
    linkedFieldUpdateIds: mergeLinkedFieldUpdateIds(
      outcome.linkedFieldUpdateIds,
      pathwayFieldIds,
    ),
    evidenceQuotes: outcome.evidenceQuotes.length
      ? outcome.evidenceQuotes
      : fieldUpdates[0]?.proposedValue
        ? [`"${fieldUpdates[0].proposedValue}"`]
        : outcome.evidenceQuotes,
  };
}

function dedupeClinicalInsightOutcomes(outcomes: IntelligenceBriefOutcome[]): IntelligenceBriefOutcome[] {
  const seenClinical = new Map<string, IntelligenceBriefOutcome>();
  const result: IntelligenceBriefOutcome[] = [];

  for (const outcome of outcomes) {
    if (outcome.kind !== "clinical_insight") {
      result.push(outcome);
      continue;
    }

    const summary = outcome.summaryLine.trim();
    const key = summary.includes(" · ") ? summary.toLowerCase() : canonicalizeDebriefFindingKey(summary);
    const existing = seenClinical.get(key);
    if (!existing) {
      seenClinical.set(key, outcome);
      result.push(outcome);
      continue;
    }

    const index = result.indexOf(existing);
    if (index >= 0) {
      result[index] = {
        ...existing,
        bullets: [...new Set([...(existing.bullets ?? []), ...(outcome.bullets ?? [])])],
        evidenceQuotes: [...new Set([...(existing.evidenceQuotes ?? []), ...(outcome.evidenceQuotes ?? [])])],
        linkedFieldUpdateIds: [
          ...new Set([...(existing.linkedFieldUpdateIds ?? []), ...(outcome.linkedFieldUpdateIds ?? [])]),
        ],
      };
      seenClinical.set(key, result[index]!);
    }
  }

  return result;
}

/** Deduplicate semantically equivalent outcomes before the review UI renders. */
export function normalizeIntelligenceBriefOutcomes(
  outcomes: IntelligenceBriefOutcome[],
  options: NormalizeIntelligenceBriefOptions = {},
): IntelligenceBriefOutcome[] {
  const sourceText = options.sourceText?.trim() ?? "";
  const fieldUpdates = options.fieldUpdates ?? [];
  const norm = normalizeAccessPathwayFromContext(sourceText, fieldUpdates);
  const hasAccessPathwaySignal =
    Boolean(norm) ||
    outcomes.some((outcome) => outcome.kind === "observation_access") ||
    fieldUpdates.some(isAccessPathwayFieldUpdate);

  const filtered = outcomes.filter((outcome) => {
    if (!hasAccessPathwaySignal) return true;
    if (outcome.kind === "observation_access") return true;
    if (isDuplicateAccessPathwaySurface(outcome.summaryLine)) return false;
    return true;
  });

  const observationIndex = filtered.findIndex((outcome) => outcome.kind === "observation_access");
  if (observationIndex >= 0 && norm) {
    filtered[observationIndex] = applyAccessPathwayNormalizationToOutcome(
      filtered[observationIndex]!,
      norm,
      fieldUpdates,
    );
    return dedupeClinicalInsightOutcomes(filtered);
  }

  if (observationIndex < 0 && norm && fieldUpdates.some(isAccessPathwayFieldUpdate)) {
    const pathwayFieldIds = fieldUpdates.filter(isAccessPathwayFieldUpdate).map((field) => field.id);
    filtered.unshift({
      id: "review-access-pathway-normalized",
      kind: "observation_access",
      cardIds: ["review-access-pathway-normalized"],
      summaryLine: norm.statement,
      statusLine: norm.statusLine,
      bullets: [norm.statement],
      evidenceQuotes: sourceText ? [`"${sourceText}"`] : [],
      linkedFieldUpdateIds: pathwayFieldIds,
    });
  }

  return dedupeClinicalInsightOutcomes(filtered);
}

export function isNormalizedAccessPathwayOutcome(outcome: IntelligenceBriefOutcome): boolean {
  return (
    outcome.kind === "observation_access" &&
    outcome.summaryLine !== INTELLIGENCE_BRIEF_OBSERVATION_SUMMARY &&
    (outcome.summaryLine === ACCESS_PATHWAY_STATEMENT_OBSERVATION_ALLOWED ||
      outcome.summaryLine === ACCESS_PATHWAY_STATEMENT_CREDENTIALING_REQUIRED)
  );
}
