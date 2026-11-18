/**
 * Rep-facing display mapping for observation intelligence.
 * Translates internal ontology / canonical labels into natural language for UI only.
 * Does not modify extraction, categories, evidence, or confidence scoring.
 */

import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import {
  findingToIntelligenceSignal,
  type IntelligenceSignal,
} from "@/lib/surgical-sales/caseIntelligenceSignals";
import { extractProductTopic } from "@/lib/surgical-sales/canonicalFindingNormalization";
import { cleanCapturedFindingLabel, cleanProductDisplayName } from "@/lib/surgical-sales/findingDisplayLabels";
import { isValidProductName } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";

export type RepDisplayMode = "current_case" | "established_pattern";

export const GENERIC_PRODUCT_USE_CURRENT_CASE = "A product was used during the procedure";
export const GENERIC_COMPETITOR_PRODUCT_USE_CURRENT_CASE =
  "A competitor product was used during the procedure";

const ONTOLOGY_PRODUCT_LABEL_WORDS = new Set([
  "product",
  "products",
  "competitor",
  "current",
  "used",
  "usage",
  "use",
  "in",
  "during",
  "procedure",
  "surgery",
  "case",
  "observed",
  "again",
  "the",
  "a",
  "an",
]);

function productSlugFromFindingId(normalizedFindingId: string): string | null {
  if (normalizedFindingId.startsWith("product_in_use:")) {
    return normalizedFindingId.slice("product_in_use:".length).replace(/_/g, " ").trim();
  }
  if (normalizedFindingId.startsWith("competitor_product:")) {
    return normalizedFindingId.slice("competitor_product:".length).replace(/_/g, " ").trim();
  }
  return null;
}

/** True when a candidate product string is an extraction category, not a real product name. */
export function isOntologyProductLabel(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/\bproduct\s+used\b/i.test(trimmed)) return true;
  if (/\b(?:used|usage|in use|observed)\s+(?:during|in|for|on|the)\b/i.test(trimmed)) return true;
  if (/^(?:current\s+)?product(?:\s+\w+)*\s+(?:used|observed|in use)$/i.test(trimmed)) return true;
  if (/^(?:competitor\s+)?product\s*(?:used|observed|in use)?$/i.test(trimmed)) return true;
  if (!isValidProductName(trimmed)) return true;

  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const meaningful = words.filter((word) => !ONTOLOGY_PRODUCT_LABEL_WORDS.has(word));
  return meaningful.length === 0;
}

function uniquePresentableProductCandidates(candidates: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const presentable: string[] = [];

  for (const candidate of candidates) {
    const cleaned = cleanProductDisplayName(String(candidate ?? "").trim());
    if (!cleaned || isOntologyProductLabel(cleaned)) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    presentable.push(cleaned);
  }

  return presentable;
}

/** Resolve a rep-presentable product name from finding evidence — null when only ontology junk remains. */
export function resolveRepProductName(
  finding: AggregatedFindingEvidence,
  signal: IntelligenceSignal,
): string | null {
  const fromSlug = productSlugFromFindingId(finding.normalizedFindingId);
  const fromLabel = extractProductTopic(finding.label);
  const fromCanonicalLabel = extractProductTopic(
    finding.label
      .replace(/^competitor product observed:\s*/i, "")
      .replace(/\s+observed$/i, "")
      .trim(),
  );
  const fromProductContext = signal.productContext
    ? cleanProductDisplayName(signal.productContext)
    : null;

  const [resolved] = uniquePresentableProductCandidates([
    fromLabel,
    fromCanonicalLabel,
    fromProductContext,
    fromSlug ? cleanProductDisplayName(fromSlug) : null,
  ]);

  return resolved ?? null;
}

export function formatRepProductUseLine(
  productName: string | null,
  mode: RepDisplayMode,
  options: { competitor?: boolean } = {},
): string {
  const competitor = options.competitor ?? false;

  if (productName) {
    return mode === "current_case"
      ? `${productName} was used during the procedure`
      : `${productName} observed`;
  }

  // Current-case chips show named products only — suppress unresolved product-use findings.
  if (mode === "current_case") {
    return "";
  }

  if (competitor) {
    return "Competitor product observed";
  }

  return "Product use observed";
}

function isProductRepDisplayFinding(
  finding: AggregatedFindingEvidence,
  signal: IntelligenceSignal,
): boolean {
  return (
    signal.type === "observed_product" ||
    signal.type === "competitor_product" ||
    finding.normalizedFindingId.startsWith("product_in_use:") ||
    finding.normalizedFindingId.startsWith("competitor_product:")
  );
}

const ONTOLOGY_PREFIX_PATTERN =
  /^(provider concern|staff burden|staff workflow|support issue|training need|product-fit opportunity|uncertainty):\s*/i;

// §7.1 observation pilot: canonical positive staff copy ("Staff workflow appeared
// coordinated/efficient/…") is real rep-facing language from staffEfficiencyRepLabel,
// not an ontology leak — the lookahead lets it through. Everything else stays guarded.
const ONTOLOGY_LEAK_PATTERN =
  /^(provider concern|staff burden|support issue|training need|uncertainty)\b|^staff workflow\b(?!\s+appeared\b)|staff workflow:\s*[A-Z]/i;

export function isOntologyDisplayLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  return ONTOLOGY_LEAK_PATTERN.test(trimmed) || /^uncertainty\s+[a-z]/i.test(trimmed);
}

function humanizeTopic(topic: string): string {
  return topic
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripOntologyPrefix(label: string): { prefix: string | null; topic: string } {
  const trimmed = label.trim();
  const match = trimmed.match(ONTOLOGY_PREFIX_PATTERN);
  if (match) {
    return {
      prefix: match[1]!.toLowerCase(),
      topic: trimmed.slice(match[0].length).trim(),
    };
  }
  if (/^uncertainty\s+/i.test(trimmed)) {
    return {
      prefix: "uncertainty",
      topic: trimmed.replace(/^uncertainty\s+/i, "").trim(),
    };
  }
  return { prefix: null, topic: trimmed };
}

function mapStaffPainTopic(topic: string, mode: RepDisplayMode): string {
  const t = humanizeTopic(topic);
  const source = `${topic} ${t}`;

  if (/workflow|pace|delay|slow|friction|burden/.test(source)) {
    return mode === "current_case"
      ? "Staff experienced workflow delays during the procedure"
      : "workflow delays";
  }
  if (/stock|product availability|suppl|verify product|stocked product/.test(source)) {
    return mode === "current_case"
      ? "Staff needed to verify product availability before proceeding"
      : "confirming products were stocked before the case";
  }
  if (/packag|peel pack|opening|setup delay|readiness|not ready|looking for/.test(source)) {
    return mode === "current_case"
      ? "Staff needed to verify product availability before proceeding"
      : "confirming products were stocked before the case";
  }
  if (/packag|peel pack|opening product/.test(source)) {
    return mode === "current_case"
      ? "Staff had difficulty with product packaging during setup"
      : "product packaging";
  }

  return mode === "current_case"
    ? `Staff experienced challenges related to ${t} during the procedure`
    : t;
}

function mapProviderPainTopic(topic: string, mode: RepDisplayMode): string {
  const t = humanizeTopic(topic);
  const source = `${topic} ${t}`;

  if (/clinical frustration|frustration|frustrated/.test(source)) {
    return mode === "current_case"
      ? "Provider expressed frustration during the procedure"
      : "frustration during the case";
  }
  if (/visuali|fixation|view before/.test(source)) {
    return mode === "current_case"
      ? "Provider spent extra time improving visualization before fixation"
      : "visualization before fixation";
  }

  return mode === "current_case"
    ? `Provider expressed concern about ${t} during the procedure`
    : t;
}

function mapUncertaintyTopic(topic: string, mode: RepDisplayMode): string {
  const t = humanizeTopic(topic);
  const source = `${topic} ${t}`;

  if (/stock|product|suppl|availability|verify/.test(source)) {
    return mode === "current_case"
      ? "Staff needed to verify product availability before proceeding"
      : "confirming products were stocked before the case";
  }

  return mode === "current_case"
    ? `Staff needed to confirm ${t} before proceeding`
    : t;
}

function mapWorkflowLabel(label: string, mode: RepDisplayMode): string | null {
  const cleaned = label
    .replace(/\s+observed$/i, "")
    .replace(/^visualization challenge before fixation$/i, "visualization before fixation")
    .trim();
  const source = cleaned.toLowerCase();

  if (/visualization.*fixation|fixation.*visualization|visualization challenge|^visualization delay$/i.test(source)) {
    return mode === "current_case"
      ? "Extra time was spent improving visualization before fixation"
      : cleaned;
  }
  if (/workflow delay|pace slowed|slowed the flow/.test(source)) {
    return mode === "current_case"
      ? "Workflow delays were observed during the procedure"
      : cleaned;
  }
  if (/staff supply|supply delay|readiness|turnover/.test(source)) {
    return mode === "current_case"
      ? "Staff experienced delays related to room or supply readiness"
      : cleaned;
  }

  return null;
}

/** Translate a canonical / ontology label into rep-facing language. */
export function translateFindingLabelToRepLanguage(
  label: string,
  hints: {
    signalType?: IntelligenceSignal["type"];
    normalizedFindingId?: string;
    isPositiveStaffSignal?: boolean;
    mode?: RepDisplayMode;
  } = {},
): string {
  const trimmed = label.trim();
  if (!trimmed) return "";

  const mode = hints.mode ?? "current_case";
  const signalType = hints.signalType;
  const normalizedFindingId = hints.normalizedFindingId ?? "";

  if (hints.isPositiveStaffSignal || signalType === "staff_workflow_signal") {
    return staffEfficiencyRepLabel(trimmed);
  }

  const { prefix, topic } = stripOntologyPrefix(trimmed);

  if (prefix === "staff burden" || signalType === "staff_pain_point" || normalizedFindingId === "staff_friction") {
    return mapStaffPainTopic(topic || trimmed, mode);
  }

  if (
    prefix === "provider concern" ||
    signalType === "provider_pain_point" ||
    normalizedFindingId === "provider_frustration"
  ) {
    return mapProviderPainTopic(topic || trimmed, mode);
  }

  if (prefix === "staff workflow") {
    return staffEfficiencyRepLabel(topic || trimmed);
  }

  if (prefix === "uncertainty" || /^uncertainty\s+/i.test(trimmed)) {
    return mapUncertaintyTopic(topic || trimmed.replace(/^uncertainty\s+/i, ""), mode);
  }

  if (/^uncertainty\s+[a-z]/i.test(trimmed)) {
    return mapUncertaintyTopic(trimmed.replace(/^uncertainty\s+/i, ""), mode);
  }

  const workflowMapped = mapWorkflowLabel(trimmed, mode);
  if (
    workflowMapped &&
    (signalType === "workflow_signal" ||
      signalType === "workflow_bottleneck" ||
      normalizedFindingId.startsWith("workflow_") ||
      normalizedFindingId === "visualization_challenge" ||
      /visualization|fixation|workflow delay|pace slowed/i.test(trimmed))
  ) {
    return workflowMapped;
  }

  if (signalType === "observed_product" || signalType === "competitor_product") {
    const product = trimmed
      .replace(/^competitor product observed:\s*/i, "")
      .replace(/\s+observed$/i, "")
      .trim();
    if (product && !isOntologyProductLabel(product)) {
      return formatRepProductUseLine(product, mode, {
        competitor: signalType === "competitor_product",
      });
    }
    return formatRepProductUseLine(null, mode, {
      competitor: signalType === "competitor_product",
    });
  }

  if (
    normalizedFindingId.startsWith("product_in_use:") ||
    normalizedFindingId.startsWith("competitor_product:")
  ) {
    const product = trimmed
      .replace(/^competitor product observed:\s*/i, "")
      .replace(/\s+observed$/i, "")
      .trim();
    if (product && !isOntologyProductLabel(product)) {
      return formatRepProductUseLine(product, mode, {
        competitor: normalizedFindingId.startsWith("competitor_product:"),
      });
    }
    return formatRepProductUseLine(null, mode, {
      competitor: normalizedFindingId.startsWith("competitor_product:"),
    });
  }

  if (isOntologyDisplayLabel(trimmed)) {
    if (/staff/i.test(trimmed)) return mapStaffPainTopic(topic || trimmed, mode);
    if (/provider/i.test(trimmed)) return mapProviderPainTopic(topic || trimmed, mode);
  }

  if (mode === "current_case") {
    const lateWorkflow = mapWorkflowLabel(trimmed, mode);
    if (lateWorkflow && /visualization|fixation|workflow delay|pace slowed/i.test(trimmed)) {
      return lateWorkflow;
    }
  }

  return trimmed;
}

export function formatObservationFindingForRepDisplay(
  finding: AggregatedFindingEvidence,
  context: { procedureContext?: string | null; mode?: RepDisplayMode } = {},
): string {
  const procedureContext = context.procedureContext ?? null;
  const mode = context.mode ?? "current_case";
  const signal = findingToIntelligenceSignal(finding, { procedureContext });

  if (isProductRepDisplayFinding(finding, signal)) {
    const productName = resolveRepProductName(finding, signal);
    return formatRepProductUseLine(productName, mode, {
      competitor:
        signal.type === "competitor_product" ||
        finding.normalizedFindingId.startsWith("competitor_product:"),
    });
  }

  const canonicalTitle = cleanCapturedFindingLabel(finding, procedureContext) || finding.label;

  return translateFindingLabelToRepLanguage(canonicalTitle, {
    signalType: signal.type,
    normalizedFindingId: finding.normalizedFindingId,
    isPositiveStaffSignal: finding.isPositiveStaffSignal,
    mode,
  });
}

export function repPainTopicForEstablishedCopy(
  label: string,
  hints: {
    signalType?: IntelligenceSignal["type"];
    normalizedFindingId?: string;
  } = {},
): string {
  return translateFindingLabelToRepLanguage(label, {
    ...hints,
    mode: "established_pattern",
  });
}

/** Guard for tests — true when copy still exposes ontology-style labels. */
export function containsOntologyDisplayLabel(text: string): boolean {
  return text
    .split(/\n|·|—/)
    .some((segment) => isOntologyDisplayLabel(segment.trim()) || /staff burden:|staff workflow:|provider concern:/i.test(segment));
}
