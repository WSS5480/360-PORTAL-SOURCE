/**
 * Debrief review summary — executive "what changed" panel for managers and reps.
 */

import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  displayFollowUpAction,
  EXECUTIVE_DEBRIEF_SUMMARY,
  INTELLIGENCE_BRIEF_CONTACT_STATUS,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { executiveContactTakeaway, executiveProcedureFocusTakeaway } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDisplayRefinement";
import { executiveProductIntelligenceLine } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";
import {
  emptyConfirmedWorkflowStates,
  type ConfirmedWorkflowStates,
} from "@/lib/surgical-sales/debriefWorkflowStateAuthority";
import { isNormalizedAccessPathwayOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/normalizeIntelligenceBriefForReview";

export type DebriefReviewSummary = {
  providerLabel: string | null;
  takeaways: string[];
};

const MAX_TAKEAWAYS = 7;

const FORBIDDEN_SUMMARY_RE =
  /confidence|possible role|contact candidate|observation status|dbkey|extraction|validation| — /i;

function pushUnique(lines: string[], seen: Set<string>, line: string): void {
  const trimmed = line.trim();
  if (!trimmed || FORBIDDEN_SUMMARY_RE.test(trimmed)) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  if (lines.length < MAX_TAKEAWAYS) lines.push(trimmed);
}

function executiveContactLine(outcome: IntelligenceBriefOutcome): string {
  return executiveContactTakeaway(outcome) ?? EXECUTIVE_DEBRIEF_SUMMARY.supportContactIdentified;
}

function executiveClinicalLine(categoryLabel: string, displayValue: string): string | null {
  const category = categoryLabel.trim().toLowerCase();
  const value = displayValue.trim().toLowerCase();

  if (category === "clinical frustration") {
    if (/no significant|not a significant|generally go smoothly|comfortable with the current|not actively looking/i.test(value)) {
      return EXECUTIVE_DEBRIEF_SUMMARY.noSignificantIssueConfirmed;
    }
    if (/open to reviewing|in the future|would consider|when it makes sense|occasionally/i.test(value)) {
      return EXECUTIVE_DEBRIEF_SUMMARY.potentialFutureOpportunityIdentified;
    }
    return EXECUTIVE_DEBRIEF_SUMMARY.clinicalFrustrationsIdentified;
  }
  if (category === "clinical preference") {
    return EXECUTIVE_DEBRIEF_SUMMARY.clinicalPreferencesIdentified;
  }
  if (category === "procedure focus") {
    return null;
  }
  if (category === "clinical trend") {
    if (/procedure volume/.test(value)) {
      return EXECUTIVE_DEBRIEF_SUMMARY.increasingProcedureVolume;
    }
    if (/case volume/.test(value)) {
      return EXECUTIVE_DEBRIEF_SUMMARY.increasingCaseVolume;
    }
    if (/adoption/.test(value)) {
      return EXECUTIVE_DEBRIEF_SUMMARY.newProcedureAdoption;
    }
  }
  return null;
}

function contactAlreadyOnFileAsSchedulingOwner(
  outcome: IntelligenceBriefOutcome,
  schedulingOwnerOnFile: string | null,
): boolean {
  if (!schedulingOwnerOnFile || !/schedul/i.test(outcome.subtitle ?? "")) return false;
  const firstName = (outcome.primaryLine ?? outcome.summaryLine)
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase();
  return Boolean(firstName && firstName.length >= 3 && schedulingOwnerOnFile.toLowerCase().includes(firstName));
}

/**
 * Derive concise executive takeaways from structured brief outcomes.
 *
 * Source-of-truth hierarchy: workflow states already confirmed by the rep's
 * engagement outcome or validated on file are NOT re-announced as changes —
 * the summary reports only newly learned intelligence. The Observation
 * Access card continues to display the status itself.
 */
export function buildExecutiveDebriefTakeaways(
  outcomes: IntelligenceBriefOutcome[],
  confirmedWorkflowStates: ConfirmedWorkflowStates = emptyConfirmedWorkflowStates(),
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const confirmed = confirmedWorkflowStates;

  let observationApproved = false;
  let observationNotYetApproved = false;
  let observationInterested = false;
  let credentialingRequired = false;
  let credentialingNoLongerRequired = false;
  let normalizedAccessPathwayLine: string | null = null;

  for (const outcome of outcomes) {
    if (outcome.kind === "observation_access" && isNormalizedAccessPathwayOutcome(outcome)) {
      normalizedAccessPathwayLine = outcome.summaryLine;
      continue;
    }
    if (outcome.kind === "observation_access" && outcome.observationFields) {
      const { status, approval, requirements } = outcome.observationFields;
      if (/approved/i.test(approval) && !/not yet/i.test(approval)) {
        observationApproved = true;
      } else if (/not yet approved/i.test(approval)) {
        observationNotYetApproved = true;
      }
      if (/interested/i.test(status)) observationInterested = true;
      if (/\b(?:not|no\s+longer)\s+required\b/i.test(requirements)) {
        credentialingNoLongerRequired = true;
      } else if (/required/i.test(requirements)) {
        credentialingRequired = true;
      }
    }
  }

  if (normalizedAccessPathwayLine) {
    pushUnique(lines, seen, normalizedAccessPathwayLine);
  } else {
    // Approval/denial confirmed via workflow is state, not news — skip the
    // approval lines entirely (including stale interest/not-yet variants).
    const approvalStateConfirmed = confirmed.observationApproved || confirmed.observationDenied;
    if (!approvalStateConfirmed) {
      if (observationApproved) {
        pushUnique(lines, seen, EXECUTIVE_DEBRIEF_SUMMARY.observationApproved);
      } else {
        if (observationInterested) {
          pushUnique(lines, seen, EXECUTIVE_DEBRIEF_SUMMARY.observationInterestNoted);
        }
        if (observationNotYetApproved) {
          pushUnique(lines, seen, EXECUTIVE_DEBRIEF_SUMMARY.observationNotYetApproved);
        }
      }
    }

    // A credentialing requirement is only a discovery the first time.
    if (credentialingRequired && !confirmed.credentialingKnown) {
      pushUnique(lines, seen, EXECUTIVE_DEBRIEF_SUMMARY.credentialingRequired);
    }
    // A reversal is always news — it contradicts what is on file.
    if (credentialingNoLongerRequired) {
      pushUnique(lines, seen, EXECUTIVE_DEBRIEF_SUMMARY.credentialingNoLongerRequired);
    }
  }

  for (const outcome of outcomes) {
    if (outcome.kind === "contact") {
      if (contactAlreadyOnFileAsSchedulingOwner(outcome, confirmed.schedulingOwnerOnFile)) {
        continue;
      }
      pushUnique(lines, seen, executiveContactLine(outcome));
    }
  }

  for (const outcome of outcomes) {
    if (outcome.kind !== "product_intelligence") continue;
    if (/^product interest:/i.test(outcome.summaryLine)) {
      pushUnique(lines, seen, outcome.summaryLine);
      continue;
    }
    const productName = outcome.productName?.trim() ?? outcome.primaryLine?.trim();
    if (!productName) continue;
    pushUnique(lines, seen, executiveProductIntelligenceLine(productName));
  }

  for (const outcome of outcomes) {
    if (outcome.kind !== "clinical_insight") continue;
    const primary = outcome.primaryLine?.trim() ?? outcome.summaryLine.trim();
    const categoryLabel = outcome.subtitle?.trim() ?? "";
    const isClinicalTrend =
      /clinical trend/i.test(categoryLabel) ||
      (outcome.bullets?.some((bullet) => /increasing|volume|adoption|trend/i.test(bullet)) ?? false);

    if (isClinicalTrend) continue;

    if (/technique\s*\/\s*modality/i.test(categoryLabel) || /technique\s*\/\s*modality/i.test(primary)) {
      continue;
    }

    if (primary.includes(" · ")) {
      pushUnique(lines, seen, primary);
      continue;
    }
    const isProcedureFocus =
      categoryLabel.toLowerCase() === "procedure focus" ||
      (!/increasing|volume|trend|adoption|frustration|preference/i.test(primary) &&
        /\b(?:repair|reconstruction|hernia|fusion|fracture|procedure)\b/i.test(primary));
    if (isProcedureFocus) {
      const takeaway = executiveProcedureFocusTakeaway(primary);
      if (takeaway) pushUnique(lines, seen, takeaway);
      continue;
    }
    const displayValue = primary;
    const executiveLine = executiveClinicalLine(categoryLabel, displayValue);
    if (executiveLine) pushUnique(lines, seen, executiveLine);
  }

  for (const outcome of outcomes) {
    if (outcome.kind === "workflow_insight" && /relationship momentum|open to continued discussion|receptive/i.test(outcome.summaryLine)) {
      pushUnique(lines, seen, EXECUTIVE_DEBRIEF_SUMMARY.positiveProviderSentiment);
    }
  }

  for (const outcome of outcomes) {
    if (outcome.kind === "follow_up") {
      const line = displayFollowUpAction(outcome.primaryLine ?? outcome.summaryLine);
      pushUnique(lines, seen, line);
    }
  }

  return lines;
}

export function buildDebriefReviewSummary(input: {
  outcomes: IntelligenceBriefOutcome[];
  providerLabel?: string | null;
  confirmedWorkflowStates?: ConfirmedWorkflowStates;
}): DebriefReviewSummary {
  const providerLabel = input.providerLabel?.trim() || null;
  return {
    providerLabel,
    takeaways: buildExecutiveDebriefTakeaways(
      input.outcomes,
      input.confirmedWorkflowStates ?? emptyConfirmedWorkflowStates(),
    ),
  };
}

export function contactOutcomeStatusLine(): string {
  return INTELLIGENCE_BRIEF_CONTACT_STATUS;
}
