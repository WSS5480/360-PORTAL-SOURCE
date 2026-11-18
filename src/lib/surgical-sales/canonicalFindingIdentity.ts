/**
 * Shared canonical finding identity — one key builder for aggregation,
 * reconciliation, prior-pool dedupe, and display grouping.
 */

export type IntelligenceScope = "case" | "provider" | "organization";

export type CanonicalIntelligenceType =
  | "product_used"
  | "competitor_product_used"
  | "workflow_signal"
  | "workflow_bottleneck"
  | "provider_pain_point"
  | "staff_pain_point"
  | "staff_workflow_signal"
  | "product_fit_opportunity"
  | "product_adoption_signal"
  | "product_objection"
  | "training_need"
  | "support_issue"
  | "access_workflow"
  | "scheduling_contact"
  | "credentialing_requirement"
  | "unresolved_gap";

export type ReconcilableSignalType =
  | "observed_product"
  | "competitor_product"
  | "procedure_type"
  | "workflow_signal"
  | "workflow_bottleneck"
  | "product_fit_opportunity"
  | "provider_pain_point"
  | "staff_pain_point"
  | "staff_workflow_signal"
  | "product_handling_issue"
  | "product_adoption_signal"
  | "product_objection"
  | "training_need"
  | "support_issue"
  | "unresolved_gap"
  | "credentialing_path"
  | "procedure_volume_trend"
  | "repeated_pattern"
  | "conflicting_evidence";

export type CanonicalSignalLike = {
  label: string;
  type: ReconcilableSignalType;
  procedureContext: string | null;
  productContext: string | null;
  workflowStep: string | null;
  normalizedFindingId: string;
  isPositiveStaffSignal: boolean;
};

export type CanonicalFindingKeyInput = {
  type: ReconcilableSignalType | CanonicalIntelligenceType;
  label: string;
  normalizedFindingId: string;
  procedureContext?: string | null;
  productContext?: string | null;
  workflowStep?: string | null;
  scope?: IntelligenceScope;
  isPositiveStaffSignal?: boolean;
};

const GENERIC_WRAPPER_SUFFIXES =
  /\s+(usage in use|usage use|usage|in use|used again|used|observed|captured|signal|noted|again|once)$/gi;

const GENERIC_WRAPPER_PREFIXES = /^(extra|additional|possible|general|generic|new|current)\s+/gi;

const GENERIC_CONCEPT_TOKENS = new Set([
  "the",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "during",
  "before",
  "after",
  "around",
  "about",
  "into",
  "from",
  "by",
  "they",
  "were",
  "was",
  "were",
  "being",
  "been",
  "there",
  "this",
  "that",
  "these",
  "those",
  "once",
  "noted",
  "observed",
  "captured",
  "signal",
  "signals",
  "appeared",
  "seemed",
  "mentioned",
  "positive",
  "context",
  "pattern",
  "current",
  "prior",
  "case",
  "cases",
  "note",
  "notes",
  "described",
  "language",
  "different",
  "wording",
]);

const GENERIC_ROLE_TOKENS = new Set(["team", "staff", "provider", "surgeon", "nurse", "tech"]);

const GENERIC_STATUS_WRAPPERS = new Set([
  "used",
  "use",
  "usage",
  "observed",
  "captured",
  "signal",
  "issue",
  "workflow",
  "challenge",
  "problem",
  "delay",
  "bottleneck",
  "friction",
  "concern",
  "need",
  "opportunity",
  "opening",
  "new",
  "again",
  "current",
  "case",
  "note",
]);

function cleanLabel(label: string): string {
  return label.replace(/\.$/, "").trim();
}

export function normalizeConceptText(raw: string): string {
  let text = cleanLabel(raw)
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  text = text.replace(GENERIC_WRAPPER_PREFIXES, "").replace(GENERIC_WRAPPER_SUFFIXES, "").trim();

  const tokens = text
    .split(/\s+/)
    .filter(Boolean)
    .filter((token, index, arr) => {
      if (GENERIC_CONCEPT_TOKENS.has(token)) return false;
      if (index === 0 && GENERIC_ROLE_TOKENS.has(token) && arr[index + 1] !== "pain") return false;
      if (token.length === 1) return true;
      if (arr.length > 2 && GENERIC_STATUS_WRAPPERS.has(token) && index === arr.length - 1) {
        return false;
      }
      return token.length > 1;
    });

  const trimmed = stripTrailingStatusTokens(tokens);
  return trimmed.join(" ").trim();
}

function stripTrailingStatusTokens(tokens: string[]): string[] {
  const result = [...tokens];
  while (result.length > 1 && GENERIC_STATUS_WRAPPERS.has(result[result.length - 1]!)) {
    result.pop();
  }
  return result;
}

export function conceptTokens(raw: string): string[] {
  const normalized = normalizeConceptText(raw);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

export function conceptsMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeConceptText(left);
  const normalizedRight = normalizeConceptText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return true;
  const leftTokens = conceptTokens(normalizedLeft);
  const rightTokens = conceptTokens(normalizedRight);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;
  const rightSet = new Set(rightTokens);
  const shared = leftTokens.filter((token) => rightSet.has(token)).length;
  return shared / Math.min(leftTokens.length, rightTokens.length) >= 0.67;
}

function mapTypeToCanonical(type: ReconcilableSignalType | CanonicalIntelligenceType): CanonicalIntelligenceType {
  switch (type) {
    case "observed_product":
    case "product_used":
      return "product_used";
    case "competitor_product":
    case "competitor_product_used":
      return "competitor_product_used";
    case "workflow_bottleneck":
      return "workflow_bottleneck";
    case "workflow_signal":
      return "workflow_signal";
    case "provider_pain_point":
      return "provider_pain_point";
    case "staff_pain_point":
      return "staff_pain_point";
    case "staff_workflow_signal":
      return "staff_workflow_signal";
    case "product_fit_opportunity":
      return "product_fit_opportunity";
    case "product_adoption_signal":
      return "product_adoption_signal";
    case "product_objection":
      return "product_objection";
    case "training_need":
      return "training_need";
    case "product_handling_issue":
    case "support_issue":
      return "support_issue";
    case "access_workflow":
      return "access_workflow";
    case "scheduling_contact":
      return "scheduling_contact";
    case "credentialing_requirement":
    case "credentialing_path":
      return "credentialing_requirement";
    case "procedure_volume_trend":
      return "workflow_signal";
    case "unresolved_gap":
      return "unresolved_gap";
    default:
      return "workflow_signal";
  }
}

function productIdentity(input: CanonicalFindingKeyInput): string {
  if (input.normalizedFindingId.startsWith("product_in_use:")) {
    return normalizeConceptText(
      input.normalizedFindingId.slice("product_in_use:".length).replace(/_/g, " "),
    );
  }
  if (input.normalizedFindingId.startsWith("competitor_product:")) {
    return normalizeConceptText(
      input.normalizedFindingId.slice("competitor_product:".length).replace(/_/g, " "),
    );
  }
  if (input.productContext) return normalizeConceptText(input.productContext);
  return normalizeConceptText(cleanLabel(input.label));
}

function workflowConcept(input: CanonicalFindingKeyInput): string {
  if (input.normalizedFindingId === "workflow_delay") {
    const fromLabel = normalizeConceptText(cleanLabel(input.label));
    if (fromLabel && fromLabel !== "delay" && fromLabel !== "workflow delay") {
      return fromLabel;
    }
    return "delay";
  }
  if (input.workflowStep) {
    const fromStep = normalizeConceptText(input.workflowStep);
    if (fromStep) return fromStep;
  }
  if (input.normalizedFindingId.startsWith("workflow_")) {
    const fromId = input.normalizedFindingId.slice("workflow_".length).replace(/_/g, " ");
    const normalized = normalizeConceptText(fromId);
    if (normalized) return normalized;
  }
  return normalizeConceptText(cleanLabel(input.label));
}

function painConcept(input: CanonicalFindingKeyInput): string {
  return normalizeConceptText(
    cleanLabel(input.label)
      .replace(/\s+(captured|mentioned again.*|noted.*)$/i, "")
      .replace(/\s+with different wording$/i, "")
      .trim(),
  );
}

function productFitConcept(input: CanonicalFindingKeyInput): string {
  const label = cleanLabel(input.label)
    .replace(/\s+opportunity$/i, "")
    .replace(/^product[-\s]?fit\s+(opportunity\s+)?(around|for|in|may be a)?\s*/i, "");
  const concept = normalizeConceptText(label);
  if (concept) return concept;
  return normalizeConceptText(input.workflowStep ?? input.label);
}

function staffPositiveConcept(input: CanonicalFindingKeyInput): string {
  const label = cleanLabel(input.label)
    .replace(/^(team|staff)\s+(appeared|seemed|was|were)\s+/i, "")
    .replace(/\s+(again|once)$/i, "");
  return normalizeConceptText(label);
}

/** Build canonical concept key without scope prefix. */
export function buildCanonicalConceptKey(input: CanonicalFindingKeyInput): string {
  const canonicalType = mapTypeToCanonical(input.type);

  if (canonicalType === "product_used" || canonicalType === "competitor_product_used") {
    return `${canonicalType}:${productIdentity(input)}`;
  }

  if (canonicalType === "workflow_signal" || canonicalType === "workflow_bottleneck") {
    const procedure =
      input.procedureContext && input.procedureContext.trim()
        ? normalizeConceptText(input.procedureContext)
        : "";
    const workflow = workflowConcept(input);
    return procedure ? `${canonicalType}:${procedure}:${workflow}` : `${canonicalType}:${workflow}`;
  }

  if (canonicalType === "provider_pain_point" || canonicalType === "staff_pain_point") {
    return `${canonicalType}:${painConcept(input)}`;
  }

  if (canonicalType === "staff_workflow_signal") {
    return `${canonicalType}:${staffPositiveConcept(input)}`;
  }

  if (canonicalType === "product_fit_opportunity") {
    const procedure =
      input.procedureContext && input.procedureContext.trim()
        ? normalizeConceptText(input.procedureContext)
        : "";
    const concept = productFitConcept(input);
    return procedure ? `${canonicalType}:${procedure}:${concept}` : `${canonicalType}:${concept}`;
  }

  if (canonicalType === "product_adoption_signal") {
    const product = productIdentity(input);
    return `${canonicalType}:${product || normalizeConceptText(input.label)}`;
  }

  if (canonicalType === "training_need" || canonicalType === "support_issue") {
    const product = productIdentity(input);
    const issue = normalizeConceptText(cleanLabel(input.label));
    return product ? `${canonicalType}:${product}:${issue}` : `${canonicalType}:${issue}`;
  }

  if (canonicalType === "scheduling_contact" || canonicalType === "credentialing_requirement") {
    return `${canonicalType}:${normalizeConceptText(cleanLabel(input.label))}`;
  }

  return `${canonicalType}:${normalizeConceptText(input.normalizedFindingId || input.label)}`;
}

/** Scope-prefixed canonical key used for dedupe and matching. */
export function buildCanonicalFindingKey(input: CanonicalFindingKeyInput): string {
  const scope = input.scope ?? "provider";
  return `${scope}:${buildCanonicalConceptKey(input)}`;
}

export function buildCanonicalFindingKeyFromSignal(
  signal: CanonicalSignalLike,
  scope: IntelligenceScope = "provider",
): string {
  return buildCanonicalFindingKey({
    type: signal.type,
    label: signal.label,
    normalizedFindingId: signal.normalizedFindingId,
    procedureContext: signal.procedureContext,
    productContext: signal.productContext,
    workflowStep: signal.workflowStep,
    scope,
    isPositiveStaffSignal: signal.isPositiveStaffSignal,
  });
}

export function scopedKeysMatch(
  leftKey: string,
  rightKey: string,
  leftConcept: string,
  rightConcept: string,
): boolean {
  if (leftKey === rightKey) return true;
  const leftScope = leftKey.split(":")[0];
  const rightScope = rightKey.split(":")[0];
  if (leftScope === "organization" || rightScope === "organization") return false;
  return conceptsMatch(leftConcept, rightConcept);
}
