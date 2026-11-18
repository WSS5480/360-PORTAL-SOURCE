/**
 * Clinical intelligence normalization — durable commercial signals, not quoted phrases.
 */

import { canonicalizeDebriefFindingKey } from "@/lib/surgical-sales/engagements/debriefCompletionFindingStatus";
import { extractProcedureSignalsFromText } from "@/lib/surgical-sales/sharedIntelligence/extractProcedureSignals";
import {
  canonicalProcedureLabel,
  techniqueModalityLabelFromText,
} from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";

export type ClinicalIntelligenceSignal =
  | "procedure_focus"
  | "increasing_procedure_volume"
  | "increasing_case_volume"
  | "new_procedure_adoption"
  | "clinical_frustration"
  | "technology_preference"
  | "product_opportunity";

export type CommercialClinicalCategoryId =
  | "procedure_focus"
  | "clinical_frustration"
  | "clinical_trend"
  | "clinical_preference"
  | "product_opportunity";

export const COMMERCIAL_CLINICAL_CATEGORY_LABEL: Record<CommercialClinicalCategoryId, string> = {
  procedure_focus: "Procedure Focus",
  clinical_frustration: "Clinical Frustration",
  clinical_trend: "Clinical Trend",
  clinical_preference: "Technique / Modality",
  product_opportunity: "Product Opportunity",
};

/** Plural section headers — categories organize the review UI. */
export const CLINICAL_INSIGHT_GROUP_LABEL: Record<CommercialClinicalCategoryId, string> = {
  clinical_frustration: "Clinical Frustrations",
  clinical_trend: "Clinical Trends",
  procedure_focus: "Procedure Focus",
  clinical_preference: "Technique / Modality",
  product_opportunity: "Product Opportunity",
};

export const CLINICAL_INSIGHT_GROUP_ORDER: CommercialClinicalCategoryId[] = [
  "clinical_frustration",
  "clinical_trend",
  "procedure_focus",
  "clinical_preference",
  "product_opportunity",
];

export function clinicalInsightGroupIdFromLabel(categoryLabel: string): CommercialClinicalCategoryId {
  const normalized = categoryLabel.trim().toLowerCase();
  if (normalized.includes("frustration")) return "clinical_frustration";
  if (normalized.includes("trend")) return "clinical_trend";
  if (
    normalized.includes("preference") ||
    normalized.includes("technique") ||
    normalized.includes("modality")
  ) {
    return "clinical_preference";
  }
  if (normalized.includes("product")) return "product_opportunity";
  return "procedure_focus";
}

/** Route review cards to the correct clinical section from outcome shape, not headline alone. */
export function clinicalInsightGroupIdFromOutcome(input: {
  kind: string;
  subtitle?: string | null;
  summaryLine?: string;
  primaryLine?: string | null;
  bullets?: string[];
}): CommercialClinicalCategoryId {
  if (input.kind !== "clinical_insight") return "procedure_focus";

  const primary = (input.primaryLine ?? input.summaryLine ?? "").trim();
  const categoryLabel = (input.subtitle ?? "").trim();
  const displayValue = (input.bullets?.[1] ?? input.bullets?.[0] ?? "").trim();

  if (/procedure focus/i.test(categoryLabel)) {
    return "procedure_focus";
  }

  if (/clinical trend/i.test(categoryLabel)) {
    if (/increasing|volume|adoption|trend/i.test(displayValue)) {
      return "clinical_trend";
    }
    if (
      !primary.includes(CLINICAL_STORAGE_SEPARATOR) &&
      /\b(?:repair|reconstruction|hernia|fusion|fracture|procedure)\b/i.test(primary) &&
      !/increasing|volume|adoption|trend/i.test(primary)
    ) {
      return "procedure_focus";
    }
    return "clinical_trend";
  }

  if (
    primary.includes(CLINICAL_STORAGE_SEPARATOR) &&
    /increasing|volume|adoption|trend/i.test(primary)
  ) {
    return "clinical_trend";
  }

  return clinicalInsightGroupIdFromLabel(categoryLabel || primary);
}

export type NormalizedClinicalIntelligence = {
  procedureFocus: string;
  signal: ClinicalIntelligenceSignal;
  signalLabel: string;
  /** Reusable persisted value for provider_procedure_focus and analytics. */
  storageValue: string;
  /** Commercial intelligence category shown on review surfaces. */
  categoryId: CommercialClinicalCategoryId;
  categoryLabel: string;
  /** Normalized rep-facing value — not the raw extracted phrase. */
  displayValue: string;
  /** Raw source phrase from extraction or dictation. */
  sourceText: string;
  cardTitle: string;
  cardSubtitle: string;
  dedupeKey: string;
  learnedLine: string;
};

export const CLINICAL_SIGNAL_LABEL: Record<ClinicalIntelligenceSignal, string> = {
  procedure_focus: "Procedure focus area",
  increasing_procedure_volume: "Increasing procedure volume",
  increasing_case_volume: "Increasing case volume",
  new_procedure_adoption: "New procedure adoption",
  clinical_frustration: "Clinical frustration",
  technology_preference: "Technique / Modality",
  product_opportunity: "Product-relevant opportunity",
};

export const CLINICAL_STORAGE_SEPARATOR = " · ";

/** Legacy stored labels that map onto current signals. */
const LEGACY_SIGNAL_LABEL_ALIASES: Record<string, ClinicalIntelligenceSignal> = {
  "technology preference": "technology_preference",
  "clinical preference": "technology_preference",
};

export function clinicalSignalFromLabel(label: string): ClinicalIntelligenceSignal | null {
  const exact = Object.entries(CLINICAL_SIGNAL_LABEL).find(([, l]) => l === label.trim());
  if (exact) return exact[0] as ClinicalIntelligenceSignal;
  return LEGACY_SIGNAL_LABEL_ALIASES[label.trim().toLowerCase()] ?? null;
}

const CLINICAL_PROCEDURE_MARKERS =
  /\b(?:hernia|abdominal|robotic|ventral|incisional|laparoscopic|reconstruction|case\s+mix|procedure|turnover|visualization|fixation|frustrat|pain point|challenge|consistency|increasing|volume|trend|bariatric|thoracic|mesh|fascial|wall|tka|acl|cholecystectomy|colorectal|fracture|trauma|extremity|radius|spine|breast|ankle|foot|orthopedic|referral|pattern|surgical|cases)\b/i;

const PRODUCT_USAGE_CLAUSE_RE =
  /\b(?:currently\s+using|still\s+using|(?:^|\s)(?:using|uses?)\s+(?:[\w-]+\s+){0,4}(?:mesh|product|products|bard|ventralight|phasix|symbotex))\b|\bfrom what I (?:understood|could tell)\b|\bneed to confirm\b|\bconfirm (?:that )?during observation\b/i;

const KNOWN_PRODUCT_NAME_IN_CLAUSE_RE =
  /\b(?:bard\s+mesh|ventralight|phasix|symbotex|gore\s+dualmesh|proceed|physiomesh)\b/i;

const SENTENCE_LIKE_PROCEDURE_RE =
  /\b(?:he|she|they|I|we|it)\s+(?:is|are|was|were|said|mentioned|told|using|uses?)\b/i;

const SHORT_PROCEDURE_FOCUS_ALLOWLIST =
  /^(?:general(?:\s+surgery)?|tka|acl|bariatric(?:\s+surgery)?|colorectal|thoracic|orthopedic(?:\s+trauma)?|wound\s+care|hernia(?:\s+repair)?|robotic|laparoscopic)$/i;

/** Product-usage clauses belong in Product Intelligence, not clinical procedure extraction. */
export function isProductUsageClinicalClause(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (PRODUCT_USAGE_CLAUSE_RE.test(t)) return true;
  if (/\b(?:still|currently)\s+using\b/i.test(t) && KNOWN_PRODUCT_NAME_IN_CLAUSE_RE.test(t)) return true;
  return false;
}

/** Procedure focus / profile field values must be short normalized procedure phrases. */
export function isCleanProcedureFocusPhrase(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 3 || t.length > 72) return false;
  if (SHORT_PROCEDURE_FOCUS_ALLOWLIST.test(t)) return true;
  if (isProductUsageClinicalClause(t)) return false;
  if (isGenericClinicalFactText(t)) return false;
  if (/[.!?;:,]/.test(t)) return false;
  if (KNOWN_PRODUCT_NAME_IN_CLAUSE_RE.test(t)) return false;
  // Garbled modality leftovers from canonicalProcedureLabel ("… Preference repair").
  if (/\bpreference\b/i.test(t)) return false;
  if (/\b(?:from what I|need to confirm|confirm during|understood|currently using|still using)\b/i.test(t)) {
    return false;
  }
  if (SENTENCE_LIKE_PROCEDURE_RE.test(t)) return false;
  if (t.split(/\s+/).length > 9) return false;
  if (!CLINICAL_PROCEDURE_MARKERS.test(t) && !/\b(?:repair|reconstruction|surgery|procedure)\b/i.test(t)) {
    return false;
  }
  return true;
}

export const GENERIC_CLINICAL_FACT_RE =
  /^(?:procedure focus|procedure focus area|clinical procedure focus|clinical focus|clinical trend|clinical trends|clinical insight|clinical insights)$/i;

const GENERIC_CLINICAL_PLACEHOLDER_PHRASE_RE =
  /\b(?:clinical or or workflow detail was mentioned|procedure detail captured|clinical focus mentioned|product or solution fit was mentioned|relationship tone or receptiveness was mentioned|a follow-up action was stated|partial detail:)\b/i;

/** Short modality labels that must survive the generic-text length heuristic. */
export function isTechniqueModalityToken(text: string): boolean {
  return /^(?:robotic|laparoscopic|open|mis)$/i.test(text.trim());
}

export function isGenericClinicalFactText(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  // "Robotic" / "Open" are under 8 chars but are real Technique / Modality values.
  if (isTechniqueModalityToken(t)) return false;
  if (t.length < 8) return true;
  if (GENERIC_CLINICAL_FACT_RE.test(t)) return true;
  if (GENERIC_CLINICAL_PLACEHOLDER_PHRASE_RE.test(t)) return true;
  if (!CLINICAL_PROCEDURE_MARKERS.test(t) && /\b(?:was mentioned|mentioned|discussed|captured)\b/i.test(t)) {
    return true;
  }
  return false;
}

function titleCasePhrase(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function singularProcedureLabel(text: string): string {
  return canonicalProcedureLabel(text);
}

function volumeIncreasing(blob: string): boolean {
  return /\b(?:increasing|increased|increase|growing|more|lot more|a lot more|uptick|rising|expanding|heavy|lately|high(?:er)? volume|becoming more common)\b/i.test(
    blob,
  );
}

const CLINICAL_TREND_SIGNALS: readonly ClinicalIntelligenceSignal[] = [
  "increasing_procedure_volume",
  "increasing_case_volume",
  "new_procedure_adoption",
];

/**
 * Trend signals may only be emitted when the current-note evidence contains
 * explicit growth/volume/adoption language — never from on-file labels or
 * composed storage values.
 */
export function evidenceSupportsClinicalTrendSignal(
  evidence: string,
  signal?: ClinicalIntelligenceSignal,
): boolean {
  const blob = evidence.trim();
  if (!blob) return false;
  if (signal === "new_procedure_adoption") return newAdoption(blob);
  if (signal === "increasing_case_volume") {
    return volumeIncreasing(blob) && /\bcases?\b/i.test(blob);
  }
  if (signal === "increasing_procedure_volume") return volumeIncreasing(blob);
  return volumeIncreasing(blob) || newAdoption(blob);
}

let clinicalTrendDemotionCount = 0;

/** Telemetry: trend-class signals demoted because evidence lacked growth language (prompt-leak monitor). */
export function getClinicalTrendDemotionCount(): number {
  return clinicalTrendDemotionCount;
}

export function resetClinicalTrendDemotionCount(): void {
  clinicalTrendDemotionCount = 0;
}

function groundClinicalSignal(
  candidate: ClinicalIntelligenceSignal,
  evidenceBacked: ClinicalIntelligenceSignal,
  evidence: string,
): ClinicalIntelligenceSignal {
  if (!CLINICAL_TREND_SIGNALS.includes(candidate)) return candidate;
  if (evidenceSupportsClinicalTrendSignal(evidence, candidate)) return candidate;
  clinicalTrendDemotionCount += 1;
  console.info("[clinical-trend-demotion]", {
    candidate,
    demotedTo: evidenceBacked,
    evidence: evidence.slice(0, 160),
  });
  return evidenceBacked;
}

function newAdoption(blob: string): boolean {
  // Bare "new technology / new product" is commercial interest, not procedure adoption.
  if (
    /\bnew\s+(?:technology|technologies|product|products?|mesh|device|hire|patient|scheduler|office)\b/i.test(
      blob,
    ) &&
    !/\b(?:new(?:ly)?\s+(?:adopt|doing|performing|using)|started\s+(?:doing|performing|using|adopting)|just\s+started|recently\s+added|rolling\s+out|new\s+to\s+(?:their|his|her|the)\s+(?:practice|or|facility))\b/i.test(
      blob,
    )
  ) {
    return false;
  }
  return /\b(?:newly\s+adopt|started\s+(?:doing|performing|using|adopting)|beginning\s+to\s+(?:do|perform|use|adopt)|adopt(?:ing|ed)\b|rolling\s+out|just\s+started|recently\s+added|new\s+to\s+(?:their|his|her|the)\s+(?:practice|or|facility))\b/i.test(
    blob,
  );
}

function clinicalFrustration(blob: string): boolean {
  return /\b(?:frustrat|pain point|challenge|difficult|slow|inefficient|problem with)\b/i.test(blob);
}

function technologyPreference(blob: string): boolean {
  return /\b(?:prefer|preference|favor|favour|standard of care|modality|robotic-first|lap-first)\b/i.test(blob);
}

const TECHNIQUE_USAGE_CONTEXT_RE =
  /\b(?:do(?:es|ing|ne)?|did|perform(?:s|ed|ing)?|repairs?|cases?|procedures?|surger(?:y|ies)|approach|technique|platform|prefers?|utiliz|uses?|using|first)\b/i;

/**
 * Technique / modality mentioned as how the surgeon operates ("does most of his
 * hernia work robotically", "uses the robot"). Maps to Clinical Intelligence →
 * Technique / Modality — never to product or competitor intelligence.
 */
export function techniqueModalityFromText(text: string): string | null {
  return techniqueModalityLabelFromText(text);
}

function productOpportunity(blob: string): boolean {
  return /\b(?:product|evaluation|trial|ACSIS|vendor|portfolio|solution fit|our (?:product|system))\b/i.test(blob);
}

function isLowValueCaseMixCapabilityStatement(text: string): boolean {
  const blob = text.trim();
  if (!blob) return false;
  if (
    /\b(?:does|do|performs?|has)\s+(?:a\s+)?fair\s+amount\s+of\b/i.test(blob) &&
    /\b(?:robotic|laparoscopic|colorectal|hernia|cases?|work)\b/i.test(blob)
  ) {
    return !/\b(?:increas|growing|higher volume|high[-\s]+volume|doing more|seeing more|major focus|focus area|specializ)/i.test(blob);
  }
  return false;
}

function localContextForProcedure(evidence: string, procedureHint: string): string {
  const hint = procedureHint.trim();
  if (!hint) return evidence;
  const pattern = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const hintRe = new RegExp(pattern, "i");
  const match = evidence.match(new RegExp(`.{0,24}${pattern}[^.!?;]{0,72}`, "i"));
  let scoped = match?.[0] ?? evidence;
  const compoundParts = scoped.split(/\s+and\s+(?:are|they|he|she|we|also|then)\s+/i);
  if (compoundParts.length > 1) {
    const containing = compoundParts.find((part) => hintRe.test(part));
    if (containing?.trim()) scoped = containing.trim();
  } else {
    scoped = compoundParts[0]?.trim() || scoped;
  }
  return scoped.trim() || evidence;
}

function compoundParallelVolumeIncrease(evidence: string): boolean {
  return (
    /\b(?:doing|seen|seeing|have been doing)\s+more\b[^.!?;]{0,160}\b(?:and\s+(?:are|they|he|she|we)\s+)?(?:seeing|doing)\s+more\b/i.test(
      evidence,
    ) ||
    /\b(?:doing|have been doing)\s+more\b[^.!?;]{0,160}\b(?:and\s+(?:are|they|he|she|we)\s+)?(?:seeing|noting)\s+(?:a\s+)?(?:higher|greater|increased)\s+volume\b/i.test(
      evidence,
    )
  );
}

function defaultVolumeSignal(procedureFocus: string): ClinicalIntelligenceSignal {
  if (/\breconstruction\b/i.test(procedureFocus)) return "increasing_case_volume";
  return "increasing_procedure_volume";
}

function parseAttributeSignal(attribute?: string): ClinicalIntelligenceSignal | null {
  const key = (attribute ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if ((CLINICAL_SIGNAL_LABEL as Record<string, string>)[key]) return key as ClinicalIntelligenceSignal;
  if (key.includes("frustration") || key.includes("dissatisfaction") || key.includes("pain")) {
    return "clinical_frustration";
  }
  if (key.includes("case_volume") || key.includes("increasing_case")) return "increasing_case_volume";
  if (key.includes("procedure_volume") || key.includes("increasing_procedure")) {
    return "increasing_procedure_volume";
  }
  if (key.includes("adoption")) return "new_procedure_adoption";
  if (key.includes("preference") || key.includes("modality") || key.includes("technique")) {
    return "technology_preference";
  }
  if (key.includes("product") || key.includes("opportunity")) return "product_opportunity";
  if (key.includes("procedure") || key.includes("focus")) return "procedure_focus";
  return null;
}

function inferSignal(blob: string, procedureFocus: string, procedureHint?: string): ClinicalIntelligenceSignal {
  if (productOpportunity(blob)) return "product_opportunity";
  if (clinicalFrustration(blob)) return "clinical_frustration";
  if (technologyPreference(blob)) return "technology_preference";
  if (volumeIncreasing(blob)) {
    // Compound "doing more X and seeing more Y" sentences describe one parallel
    // procedure-volume trend — keep the signal stable across extraction paths so
    // the same concept dedupes instead of surfacing as two cards.
    if (compoundParallelVolumeIncrease(blob)) return "increasing_procedure_volume";
    const scoped = procedureHint ? localContextForProcedure(blob, procedureHint) : blob;
    if (/\bcases?\b/i.test(scoped) && !/\bprocedure volume\b/i.test(scoped)) {
      return "increasing_case_volume";
    }
    if (/\bprocedure volume\b/i.test(scoped) || /\brepairs?\b/i.test(scoped)) {
      return "increasing_procedure_volume";
    }
    return defaultVolumeSignal(procedureFocus);
  }
  // Established practice ("primarily performs…") must not become New Procedure Adoption
  // just because the same sentence mentions "new technology".
  if (
    /\b(?:primarily|mainly|mostly|focus|primary|specializ)\b/i.test(blob) &&
    !newAdoption(blob)
  ) {
    return "procedure_focus";
  }
  if (newAdoption(blob)) return "new_procedure_adoption";
  if (/\b(?:focus|primary|primarily|mainly|mostly|specializ)\b/i.test(blob)) return "procedure_focus";
  return "procedure_focus";
}

function dedupeKeyFor(
  procedureFocus: string,
  signal: ClinicalIntelligenceSignal,
  sourceText?: string,
): string {
  const canonicalTopic = sourceText ? canonicalizeDebriefFindingKey(sourceText) : null;
  if (
    signal === "clinical_frustration" &&
    canonicalTopic &&
    canonicalTopic !== canonicalizeDebriefFindingKey(procedureFocus)
  ) {
    return `clinical:${canonicalTopic}:${signal}`;
  }
  const slug = procedureFocus.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `clinical:${slug}:${signal}`;
}

export function commercialClinicalCategoryFromSignal(
  signal: ClinicalIntelligenceSignal,
): CommercialClinicalCategoryId {
  switch (signal) {
    case "clinical_frustration":
      return "clinical_frustration";
    case "increasing_case_volume":
    case "increasing_procedure_volume":
    case "new_procedure_adoption":
      return "clinical_trend";
    case "technology_preference":
      return "clinical_preference";
    case "product_opportunity":
      return "product_opportunity";
    case "procedure_focus":
    default:
      return "procedure_focus";
  }
}

const FRUSTRATION_TOPIC_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Visualization", pattern: /\bvisualization\b/i },
  { label: "Fixation", pattern: /\bfixation\b/i },
  { label: "Turnover", pattern: /\bturnover\b/i },
  { label: "Access", pattern: /\b(?:access|exposure)\b/i },
  { label: "Efficiency", pattern: /\b(?:efficiency|inefficient|slow)\b/i },
];

function frustrationTopicLabel(blob: string): string | null {
  for (const { label, pattern } of FRUSTRATION_TOPIC_PATTERNS) {
    if (pattern.test(blob)) return label;
  }
  return null;
}

function trendDisplayValue(signal: ClinicalIntelligenceSignal): string {
  switch (signal) {
    case "increasing_case_volume":
      return "Increasing Case Volume";
    case "increasing_procedure_volume":
      return "Increasing Procedure Volume";
    case "new_procedure_adoption":
      return "New Procedure Adoption";
    default:
      return "Clinical Trend";
  }
}

function deriveClinicalDisplayValue(input: {
  signal: ClinicalIntelligenceSignal;
  procedureFocus: string;
  sourceText: string;
}): string {
  if (input.signal === "clinical_frustration") {
    return frustrationTopicLabel(input.sourceText) ?? titleCasePhrase(input.procedureFocus.split(/\s+/).slice(0, 2).join(" "));
  }
  if (
    input.signal === "increasing_case_volume" ||
    input.signal === "increasing_procedure_volume" ||
    input.signal === "new_procedure_adoption"
  ) {
    return trendDisplayValue(input.signal);
  }
  if (input.signal === "technology_preference") {
    return frustrationTopicLabel(input.sourceText) ?? input.procedureFocus;
  }
  return input.procedureFocus;
}

function attachCommercialPresentation(
  row: Omit<
    NormalizedClinicalIntelligence,
    "categoryId" | "categoryLabel" | "displayValue" | "sourceText"
  >,
  sourceText: string,
): NormalizedClinicalIntelligence {
  const categoryId = commercialClinicalCategoryFromSignal(row.signal);
  const displayValue = deriveClinicalDisplayValue({
    signal: row.signal,
    procedureFocus: row.procedureFocus,
    sourceText,
  });
  return {
    ...row,
    categoryId,
    categoryLabel: COMMERCIAL_CLINICAL_CATEGORY_LABEL[categoryId],
    displayValue,
    sourceText: sourceText.trim(),
    cardTitle: displayValue,
    cardSubtitle: COMMERCIAL_CLINICAL_CATEGORY_LABEL[categoryId],
    learnedLine: `- ${COMMERCIAL_CLINICAL_CATEGORY_LABEL[categoryId]}\n- ${displayValue}`,
  };
}

/** Rep-facing review line — category and normalized value, not raw extraction. */
export function formatCommercialClinicalReviewLine(
  normalized: Pick<
    NormalizedClinicalIntelligence,
    "categoryId" | "categoryLabel" | "displayValue" | "procedureFocus"
  >,
): string {
  if (normalized.categoryId === "clinical_trend") {
    return clinicalBriefPrimaryLine(normalized);
  }
  return `${normalized.categoryLabel} · ${normalized.displayValue}`;
}

/** Rep-facing line inside a grouped clinical section — includes procedure context for trends. */
export function clinicalBriefPrimaryLine(
  normalized: Pick<
    NormalizedClinicalIntelligence,
    "categoryId" | "categoryLabel" | "displayValue" | "procedureFocus"
  >,
): string {
  if (normalized.categoryId === "clinical_trend") {
    return `${normalized.procedureFocus} · ${normalized.displayValue}`;
  }
  return normalized.displayValue;
}

export function clinicalReviewSemanticKey(
  normalized: Pick<
    NormalizedClinicalIntelligence,
    "categoryId" | "displayValue" | "procedureFocus" | "signal"
  > & { sourceText?: string },
): string {
  if (normalized.categoryId === "clinical_frustration" || normalized.signal === "clinical_frustration") {
    const canonical = canonicalizeDebriefFindingKey(
      normalized.sourceText ?? `${normalized.displayValue} ${normalized.procedureFocus}`,
    );
    return `${normalized.categoryId}:${canonical}`.toLowerCase();
  }
  return `${normalized.categoryId}:${normalized.displayValue}:${normalized.procedureFocus}`.toLowerCase();
}

export function formatClinicalStorageValue(
  procedureFocus: string,
  signalLabel: string,
): string {
  return `${procedureFocus}${CLINICAL_STORAGE_SEPARATOR}${signalLabel}`;
}

export function parseClinicalStorageValue(
  value: string,
): { procedureFocus: string; signalLabel: string } | null {
  const idx = value.indexOf(CLINICAL_STORAGE_SEPARATOR);
  if (idx <= 0) return null;
  const procedureFocus = value.slice(0, idx).trim();
  const signalLabel = value.slice(idx + CLINICAL_STORAGE_SEPARATOR.length).trim();
  if (!procedureFocus || !signalLabel) return null;
  return { procedureFocus, signalLabel };
}

export function buildNormalizedClinicalIntelligence(input: {
  procedureHint: string;
  evidence: string;
  value?: string;
  attribute?: string;
}): NormalizedClinicalIntelligence | null {
  const blob = `${input.value ?? ""} ${input.evidence} ${input.attribute ?? ""}`.trim();
  if (isLowValueCaseMixCapabilityStatement(input.evidence)) return null;
  const attributeSignal = parseAttributeSignal(input.attribute);
  if (!blob || (!CLINICAL_PROCEDURE_MARKERS.test(blob) && !attributeSignal)) return null;

  const parsedStorage = input.value ? parseClinicalStorageValue(input.value) : null;
  let procedureFocus = parsedStorage?.procedureFocus ?? singularProcedureLabel(input.procedureHint || blob);
  // Technique tokens ("Robotic", "Open") are short but meaningful.
  const isTechniqueToken =
    attributeSignal === "technology_preference" &&
    Boolean(procedureFocus) &&
    isTechniqueModalityToken(procedureFocus);
  if (!procedureFocus || (isGenericClinicalFactText(procedureFocus) && !isTechniqueToken)) {
    if (attributeSignal === "clinical_frustration") {
      procedureFocus =
        frustrationTopicLabel(blob) ?? titleCasePhrase(blob.split(/\s+/).slice(0, 3).join(" "));
    } else {
      return null;
    }
  }

  // Infer signals from note evidence only — never from composed storage values
  // that may echo on-file trends ("Robotic hernia · Increasing procedure volume").
  const evidenceBlob = `${input.evidence} ${input.attribute ?? ""}`.trim();
  const inferredSignal = inferSignal(evidenceBlob, procedureFocus, input.procedureHint);
  let signal =
    attributeSignal && !(attributeSignal === "procedure_focus" && inferredSignal !== "procedure_focus")
      ? attributeSignal
      : inferredSignal;
  signal = groundClinicalSignal(signal, inferredSignal, input.evidence.trim());
  const categoryId = commercialClinicalCategoryFromSignal(signal);
  if (
    (categoryId === "clinical_trend" || categoryId === "procedure_focus") &&
    !isCleanProcedureFocusPhrase(procedureFocus)
  ) {
    return null;
  }

  const signalLabel = CLINICAL_SIGNAL_LABEL[signal];
  const storageValue = formatClinicalStorageValue(procedureFocus, signalLabel);
  const sourceText = input.evidence.trim() || (input.value ?? "").trim();

  return attachCommercialPresentation(
    {
      procedureFocus,
      signal,
      signalLabel,
      storageValue,
      cardTitle: procedureFocus,
      cardSubtitle: signalLabel,
      dedupeKey: dedupeKeyFor(procedureFocus, signal, sourceText),
      learnedLine: `- ${procedureFocus}\n- ${signalLabel}`,
    },
    sourceText,
  );
}

export function normalizeClinicalIntelligenceFromFact(input: {
  value: string;
  evidence: string;
  attribute?: string;
}): NormalizedClinicalIntelligence | null {
  const parsed = parseClinicalStorageValue(input.value);
  if (parsed) {
    if (isLowValueCaseMixCapabilityStatement(input.evidence)) return null;
    if (!isCleanProcedureFocusPhrase(parsed.procedureFocus)) return null;
    const evidence = input.evidence.trim();
    const inferred = inferSignal(evidence, parsed.procedureFocus);
    const labeled =
      clinicalSignalFromLabel(parsed.signalLabel) ?? inferSignal(evidence, parsed.procedureFocus);
    const signal = groundClinicalSignal(labeled, inferred, evidence);
    const signalLabel = CLINICAL_SIGNAL_LABEL[signal];
    const storageValue = formatClinicalStorageValue(parsed.procedureFocus, signalLabel);
    return attachCommercialPresentation(
      {
        procedureFocus: parsed.procedureFocus,
        signal,
        signalLabel,
        storageValue,
        cardTitle: parsed.procedureFocus,
        cardSubtitle: signalLabel,
        dedupeKey: dedupeKeyFor(parsed.procedureFocus, signal, evidence || input.value.trim()),
        learnedLine: `- ${parsed.procedureFocus}\n- ${signalLabel}`,
      },
      evidence || input.value.trim(),
    );
  }

  return buildNormalizedClinicalIntelligence({
    procedureHint: input.value,
    evidence: input.evidence,
    value: input.value,
    attribute: input.attribute,
  });
}

export function extractNormalizedClinicalIntelligenceFromSentence(sentence: string): NormalizedClinicalIntelligence[] {
  const trimmed = sentence.trim();
  if (!CLINICAL_PROCEDURE_MARKERS.test(trimmed)) return [];
  if (isProductUsageClinicalClause(trimmed)) return [];
  if (isLowValueCaseMixCapabilityStatement(trimmed)) return [];

  const results: NormalizedClinicalIntelligence[] = [];
  const seen = new Set<string>();

  const pushHint = (procedureHint: string, attribute?: ClinicalIntelligenceSignal) => {
    const normalized = buildNormalizedClinicalIntelligence({
      procedureHint,
      evidence: trimmed,
      attribute,
      value:
        attribute === "technology_preference"
          ? formatClinicalStorageValue(procedureHint, CLINICAL_SIGNAL_LABEL.technology_preference)
          : undefined,
    });
    if (!normalized || seen.has(normalized.dedupeKey)) return;
    seen.add(normalized.dedupeKey);
    results.push(normalized);
  };

  for (const signal of extractProcedureSignalsFromText({ text: trimmed })) {
    pushHint(signal.procedureFocus ?? signal.normalizedLabel, signal.dipClinicalAttribute);
  }
  if (
    (/\bvisualization\b/i.test(trimmed) || /\bfixation\b/i.test(trimmed)) &&
    (clinicalFrustration(trimmed) || /\b(?:workflow|challenge|difficult|pain point)\b/i.test(trimmed))
  ) {
    pushHint("visualization and fixation workflow");
  }

  if (results.length === 0 && !isProductUsageClinicalClause(trimmed)) {
    const fallback = buildNormalizedClinicalIntelligence({ procedureHint: trimmed, evidence: trimmed });
    if (fallback && !seen.has(fallback.dedupeKey)) results.push(fallback);
  }

  return results;
}

/** @deprecated Prefer extractNormalizedClinicalIntelligenceFromSentence */
export function extractClinicalFactsFromSentence(sentence: string): string[] {
  return extractNormalizedClinicalIntelligenceFromSentence(sentence).map((row) => row.storageValue);
}

export function formatClinicalFocusLearned(facts: string[]): string {
  const blocks: string[] = [];
  const seen = new Set<string>();

  for (const raw of facts) {
    const normalized = normalizeClinicalIntelligenceFromFact({ value: raw, evidence: raw });
    if (!normalized) continue;
    const key =
      normalized.categoryId === "clinical_trend"
        ? `${normalized.categoryId}:${normalized.procedureFocus}:${normalized.displayValue}`.toLowerCase()
        : `${normalized.categoryLabel}:${normalized.displayValue}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    blocks.push(normalized.learnedLine);
  }

  return blocks.join("\n");
}

export function clinicalInsightDisplayTitle(value: string): string {
  const normalized = normalizeClinicalIntelligenceFromFact({ value, evidence: value });
  if (normalized) return formatCommercialClinicalReviewLine(normalized);
  const parsed = parseClinicalStorageValue(value);
  return parsed?.procedureFocus ?? value.trim();
}

export function clinicalInsightCategoryLabel(value: string): string | null {
  return normalizeClinicalIntelligenceFromFact({ value, evidence: value })?.categoryLabel ?? null;
}

export function clinicalInsightNormalizedValue(value: string): string | null {
  return normalizeClinicalIntelligenceFromFact({ value, evidence: value })?.displayValue ?? null;
}

export function clinicalInsightSignalLabel(value: string): string | null {
  const parsed = parseClinicalStorageValue(value);
  return parsed?.signalLabel ?? null;
}

export function clinicalInsightDedupeKeyFromValue(value: string): string {
  const normalized = normalizeClinicalIntelligenceFromFact({ value, evidence: value });
  return normalized?.dedupeKey ?? `clinical:${value.toLowerCase().slice(0, 48)}`;
}

/** Merge additional clinical_focus storage into provider_procedure_focus (pipe-separated). */
export function mergeProcedureFocusFieldValue(existing: string, incoming: string): string {
  const segments: string[] = [];
  const seen = new Set<string>();

  const pushSegment = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || isGenericClinicalFactText(trimmed)) return;
    const parsed = parseClinicalStorageValue(trimmed);
    const focusPhrase = parsed?.procedureFocus ?? trimmed;
    if (!isCleanProcedureFocusPhrase(focusPhrase)) return;
    const key = focusPhrase.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    segments.push(parsed ? `${parsed.procedureFocus}${CLINICAL_STORAGE_SEPARATOR}${parsed.signalLabel}` : trimmed);
  };

  for (const part of `${existing}|${incoming}`.split(/\||\n|;/)) {
    pushSegment(part);
  }

  // Generic placeholders ("General") add nothing once a specific procedure is
  // on file — drop them instead of asking the rep to reconcile later.
  const GENERIC_FOCUS_RE = /^general(?:\s+surgery)?$/i;
  const isGenericSegment = (segment: string) => {
    const parsed = parseClinicalStorageValue(segment);
    return GENERIC_FOCUS_RE.test((parsed?.procedureFocus ?? segment).trim());
  };
  const specific = segments.filter((segment) => !isGenericSegment(segment));
  return (specific.length > 0 ? specific : segments).join(" | ");
}

export function hasClinicalProcedureIntelligenceOnFile(contact: Record<string, unknown>): boolean {
  const raw = String(contact.provider_procedure_focus ?? "").trim();
  if (!raw) return false;
  if (raw.includes(CLINICAL_STORAGE_SEPARATOR)) return true;
  return extractNormalizedClinicalIntelligenceFromSentence(raw).length > 0 || !isGenericClinicalFactText(raw);
}

/** Provider overview / intelligence summary line for procedure interests. */
export function formatProcedureInterestsOverviewSummary(contact: Record<string, unknown>): string | null {
  const raw = String(contact.provider_procedure_focus ?? "").trim();
  if (!raw) return null;

  const procedures: string[] = [];
  const trends: string[] = [];
  const seenProc = new Set<string>();
  const seenTrend = new Set<string>();

  for (const part of raw.split(/\||\n/)) {
    const parsed = parseClinicalStorageValue(part.trim());
    if (parsed) {
      const procKey = parsed.procedureFocus.toLowerCase();
      if (!seenProc.has(procKey)) {
        seenProc.add(procKey);
        procedures.push(parsed.procedureFocus);
      }
      const trendKey = parsed.signalLabel.toLowerCase();
      if (!seenTrend.has(trendKey) && /increasing|volume|trend|adoption/i.test(parsed.signalLabel)) {
        seenTrend.add(trendKey);
        trends.push(parsed.signalLabel);
      }
      continue;
    }
    const normalized = normalizeClinicalIntelligenceFromFact({ value: part.trim(), evidence: part });
    if (normalized) {
      const procKey = normalized.procedureFocus.toLowerCase();
      if (!seenProc.has(procKey)) {
        seenProc.add(procKey);
        procedures.push(normalized.procedureFocus);
      }
      if (/increasing|volume|trend/i.test(normalized.signalLabel)) {
        const trendKey = normalized.signalLabel.toLowerCase();
        if (!seenTrend.has(trendKey)) {
          seenTrend.add(trendKey);
          trends.push(normalized.signalLabel);
        }
      }
    }
  }

  if (procedures.length === 0 && !isGenericClinicalFactText(raw)) {
    return raw.replace(/\s+/g, " ").trim();
  }

  const procLine = procedures.join(" · ");
  if (trends.length === 0) return procLine || null;
  return `${procLine} · ${trends.join(" · ")}`;
}
