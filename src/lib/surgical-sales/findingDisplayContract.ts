/**
 * Observation-only finding title contract — separates titles from interpretation/meta.
 * Product-, procedure-, and provider-agnostic.
 */

import { normalizeConceptText } from "@/lib/surgical-sales/canonicalFindingIdentity";
import {
  extractProductFitTopic,
  extractProductTopic,
  extractWorkflowTopic,
  isJunkFindingText,
  normalizeMessyExtractedLabel,
  type CanonicalFindingType,
} from "@/lib/surgical-sales/canonicalFindingNormalization";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import {
  containsInterpretiveTitleLanguage,
  observationTitleSortScore,
  preferObservationTitle,
  stripInterpretivePhrasesFromLabel,
} from "@/lib/surgical-sales/findingTitleLanguage";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";

export {
  containsInterpretiveTitleLanguage,
  preferObservationTitle,
  stripInterpretivePhrasesFromLabel,
  FINDING_TITLE_INTERPRETATION_PATTERN,
} from "@/lib/surgical-sales/findingTitleLanguage";

function titleCasePhrase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type FindingTitleSignal = {
  label: string;
  type: string;
  normalizedFindingId: string;
  productContext?: string | null;
  workflowStep?: string | null;
};

function cleanLabel(label: string): string {
  return label.replace(/\.$/, "").trim();
}

function productTitleFromSignal(signal: FindingTitleSignal): string {
  if (signal.productContext) return titleCasePhrase(normalizeConceptText(signal.productContext));
  if (signal.normalizedFindingId.startsWith("product_in_use:")) {
    return titleCasePhrase(
      signal.normalizedFindingId.slice("product_in_use:".length).replace(/_/g, " "),
    );
  }
  return titleCasePhrase(normalizeConceptText(extractProductTopic(cleanLabel(signal.label))));
}

function workflowTitleFromSignal(signal: FindingTitleSignal): string {
  if (signal.normalizedFindingId === "workflow_delay") return "Workflow delay";
  if (signal.normalizedFindingId === "room_turnover_delay") return "Room turnover delay";
  if (signal.normalizedFindingId === "staff_supply_delay") return "Staff supply delays";
  if (
    signal.normalizedFindingId === "workflow_visualization_before_fixation" ||
    signal.normalizedFindingId === "visualization_challenge"
  ) {
    return "Visualization challenge before fixation";
  }

  const fromLabel = normalizeMessyExtractedLabel(cleanLabel(signal.label), {
    normalizedFindingId: signal.normalizedFindingId,
    findingType: "workflow_bottleneck",
  });
  if (fromLabel && !containsInterpretiveTitleLanguage(fromLabel)) return fromLabel;
  if (signal.workflowStep) {
    const step = extractWorkflowTopic(signal.workflowStep);
    if (step) return step;
  }
  const topic = extractWorkflowTopic(cleanLabel(signal.label));
  return topic || "Workflow issue observed";
}

function mapCanonicalType(type: string): string {
  if (type === "observed_product") return "product_used";
  if (type === "competitor_product") return "competitor_product_used";
  if (type === "workflow_bottleneck") return "workflow_bottleneck";
  if (type === "workflow_signal") return "workflow_signal";
  if (type === "provider_pain_point") return "provider_pain_point";
  if (type === "staff_pain_point") return "staff_pain_point";
  if (type === "staff_workflow_signal") return "staff_workflow_signal";
  if (type === "product_fit_opportunity") return "product_fit_opportunity";
  if (type === "training_need") return "training_need";
  if (type === "support_issue") return "support_issue";
  if (type === "product_adoption_signal") return "product_adoption_signal";
  return type;
}

/** Observation-only title — never includes repeat/maturity/interpretation language. */
export function buildObservationOnlyFindingTitle(
  finding: AggregatedFindingEvidence,
  signal: FindingTitleSignal,
): string {
  const canonicalType = mapCanonicalType(signal.type);
  let title = "";

  if (canonicalType === "product_used") {
    title = `${productTitleFromSignal(signal)} observed`;
  } else if (canonicalType === "competitor_product_used") {
    title = `Competitor product observed: ${productTitleFromSignal(signal)}`;
  } else if (canonicalType === "workflow_signal" || canonicalType === "workflow_bottleneck") {
    title = workflowTitleFromSignal(signal);
  } else if (canonicalType === "staff_workflow_signal") {
    title =
      staffEfficiencyRepLabel(
        normalizeMessyExtractedLabel(cleanLabel(finding.label), {
          findingType: "staff_workflow_context",
        }) || finding.label,
      ) || "Staff workflow appeared positive";
  } else if (canonicalType === "provider_pain_point") {
    const pain = normalizeMessyExtractedLabel(cleanLabel(signal.label), {
      findingType: "provider_pain_point",
    });
    title = /^provider concern:/i.test(pain)
      ? pain
      : `Provider concern: ${titleCasePhrase(normalizeConceptText(pain) || pain)}`;
  } else if (canonicalType === "staff_pain_point") {
    const pain = normalizeMessyExtractedLabel(cleanLabel(signal.label), {
      findingType: "staff_pain_point",
    });
    title = /^staff burden:/i.test(pain)
      ? pain
      : `Staff burden: ${titleCasePhrase(normalizeConceptText(pain) || pain)}`;
  } else if (canonicalType === "product_fit_opportunity") {
    title =
      normalizeMessyExtractedLabel(cleanLabel(finding.label), {
        findingType: "product_fit_opportunity",
        normalizedFindingId: signal.normalizedFindingId,
      }) || "Product-fit opportunity";
  } else if (canonicalType === "training_need") {
    title = /^training need:/i.test(finding.label)
      ? cleanLabel(finding.label)
      : `Training need: ${titleCasePhrase(normalizeConceptText(cleanLabel(signal.label)) || cleanLabel(signal.label))}`;
  } else if (canonicalType === "support_issue") {
    title = /^support issue:/i.test(finding.label)
      ? cleanLabel(finding.label)
      : `Support issue: ${titleCasePhrase(normalizeConceptText(cleanLabel(signal.label)) || cleanLabel(signal.label))}`;
  } else {
    title = normalizeMessyExtractedLabel(cleanLabel(finding.label), {
      normalizedFindingId: signal.normalizedFindingId,
    });
  }

  title = stripInterpretivePhrasesFromLabel(title);
  if (containsInterpretiveTitleLanguage(title) || isJunkFindingText(title, title)) {
    if (canonicalType === "workflow_signal" || canonicalType === "workflow_bottleneck") {
      return "Workflow issue observed";
    }
    if (canonicalType === "product_used") {
      return `${productTitleFromSignal(signal)} observed`;
    }
  }

  return title.trim();
}

export type FindingDisplayModel = {
  findingTitle: string;
  findingContext: string | null;
  findingMeta: string | null;
  providerContextCopy: string | null;
};

export function buildFindingDisplayModel(
  finding: AggregatedFindingEvidence,
  input: {
    signal: FindingTitleSignal;
    procedureContext?: string | null;
    currentCaseComplete?: boolean;
    providerContextCopy?: string | null;
    findingContext?: string | null;
    findingMeta?: string | null;
  },
): FindingDisplayModel {
  return {
    findingTitle: buildObservationOnlyFindingTitle(finding, input.signal),
    findingContext: input.findingContext ?? null,
    findingMeta: input.findingMeta ?? null,
    providerContextCopy: input.providerContextCopy ?? null,
  };
}

export function isEligibleMainFindingTitle(finding: AggregatedFindingEvidence): boolean {
  return !finding.isInferred;
}

export { observationTitleSortScore };

export function assertObservationOnlyTitle(title: string): void {
  if (containsInterpretiveTitleLanguage(title)) {
    throw new Error(`Finding title contains interpretation language: ${title}`);
  }
}
