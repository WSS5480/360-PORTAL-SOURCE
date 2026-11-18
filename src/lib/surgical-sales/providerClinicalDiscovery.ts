/** Provider-level surgical intelligence prompts and UI helpers. */

import { formatClinicalDiscoverySignalStrengthLabel } from "@/lib/surgical-sales/providerOperationalMaturityVocabulary";

export type SurgicalIntelligenceSectionId =
  | "clinical_workflow"
  | "or_environment"
  | "relationship_intelligence"
  | "commercial_signals"
  | "observation_readiness";

export type ClinicalDiscoveryConfidence = "low" | "medium" | "high";

const PLACEHOLDER_RESPONSES = new Set([
  "n/a",
  "na",
  "none",
  "unknown",
  "tbd",
  "todo",
  "-",
  "--",
  "...",
  ".",
]);

/** Complete when response has substantive text; tags and confidence are optional. */
export function isMeaningfulClinicalDiscoveryResponse(raw: unknown): boolean {
  const t = String(raw ?? "").trim();
  if (t.length < 3) return false;
  const normalized = t.toLowerCase().replace(/[.!?]+$/g, "");
  if (PLACEHOLDER_RESPONSES.has(normalized)) return false;
  return true;
}

export const CLINICAL_DISCOVERY_CONFIDENCE_LEVELS: ClinicalDiscoveryConfidence[] = [
  "low",
  "medium",
  "high",
];

/** Global suggested tags for surgical intelligence field notes. */
export const CLINICAL_DISCOVERY_SUGGESTED_TAGS: readonly string[] = [
  "case flow",
  "turnover",
  "access",
  "exposure",
  "staffing",
  "training",
  "instrumentation",
  "preference card",
  "visualization",
  "workflow",
  "OR layout",
  "scheduling",
  "outcomes",
  "complications",
  "vendor mix",
  "competitive product",
  "evaluation",
  "champion",
  "observation access",
] as const;

/** Canonical surgical intelligence prompt keys (one per intelligence category). */
export type ClinicalDiscoveryQuestionKey =
  | "clinical_workflow"
  | "or_environment"
  | "relationship_intelligence"
  | "commercial_signals"
  | "observation_readiness";

export const CLINICAL_DISCOVERY_QUESTION_KEYS: ClinicalDiscoveryQuestionKey[] = [
  "clinical_workflow",
  "or_environment",
  "relationship_intelligence",
  "commercial_signals",
  "observation_readiness",
];

/** @deprecated MEDDPICC-style keys — normalized to canonical keys on read/write. */
export const LEGACY_CLINICAL_DISCOVERY_QUESTION_KEYS = [
  "current_modality_challenge",
  "why_it_matters",
  "clinical_impact",
  "root_causes",
  "frequency",
  "urgency_drivers",
  "priority_ranking",
  "prior_attempts",
  "risk_of_inaction",
] as const;

export type LegacyClinicalDiscoveryQuestionKey = (typeof LEGACY_CLINICAL_DISCOVERY_QUESTION_KEYS)[number];

export const LEGACY_TO_CANONICAL_QUESTION_KEY: Record<
  LegacyClinicalDiscoveryQuestionKey,
  ClinicalDiscoveryQuestionKey
> = {
  current_modality_challenge: "clinical_workflow",
  root_causes: "clinical_workflow",
  frequency: "clinical_workflow",
  clinical_impact: "clinical_workflow",
  why_it_matters: "or_environment",
  urgency_drivers: "or_environment",
  prior_attempts: "commercial_signals",
  priority_ranking: "commercial_signals",
  risk_of_inaction: "commercial_signals",
};

export function normalizeClinicalDiscoveryQuestionKey(
  raw: string,
): ClinicalDiscoveryQuestionKey | null {
  const key = raw.trim();
  if ((CLINICAL_DISCOVERY_QUESTION_KEYS as readonly string[]).includes(key)) {
    return key as ClinicalDiscoveryQuestionKey;
  }
  return LEGACY_TO_CANONICAL_QUESTION_KEY[key as LegacyClinicalDiscoveryQuestionKey] ?? null;
}

/** @deprecated Use ClinicalDiscoveryQuestionKey */
export type ProviderClinicalDiscoveryFieldKey = ClinicalDiscoveryQuestionKey;

export type ProviderClinicalDiscoveryFieldConfig = {
  questionKey: ClinicalDiscoveryQuestionKey;
  planningSectionId: SurgicalIntelligenceSectionId;
  /** Legacy surgical_sales_contacts column for response text. */
  legacyContactColumn: string;
  shortLabel: string;
  question: string;
};

export const PROVIDER_CLINICAL_DISCOVERY_FIELDS: ProviderClinicalDiscoveryFieldConfig[] = [
  {
    questionKey: "clinical_workflow",
    planningSectionId: "clinical_workflow",
    legacyContactColumn: "provider_clinical_discovery_modality_challenge",
    shortLabel: "How does this provider operate clinically?",
    question:
      "How does this provider run cases day-to-day — procedural steps, handoffs, and where things slow down?",
  },
  {
    questionKey: "or_environment",
    planningSectionId: "or_environment",
    legacyContactColumn: "provider_clinical_discovery_causes",
    shortLabel: "What does OR and vendor access look like here?",
    question:
      "What is the OR setup and team rhythm that affects access, turnover, and case flow?",
  },
  {
    questionKey: "relationship_intelligence",
    planningSectionId: "relationship_intelligence",
    legacyContactColumn: "provider_clinical_discovery_why_challenge",
    shortLabel: "Who influences adoption?",
    question:
      "Who influences decisions, how do they engage with reps, and what builds trust in the OR?",
  },
  {
    questionKey: "commercial_signals",
    planningSectionId: "commercial_signals",
    legacyContactColumn: "provider_clinical_discovery_priority_now",
    shortLabel: "Is there a commercial path?",
    question:
      "What products, vendors, and competitive pressures are in play — and what would change adoption?",
  },
  {
    questionKey: "observation_readiness",
    planningSectionId: "observation_readiness",
    legacyContactColumn: "provider_clinical_discovery_if_unaddressed",
    shortLabel: "Can we realistically observe here?",
    question:
      "What do you still need to see on first observation or case day to be effective in the OR?",
  },
];

export function clinicalDiscoveryFieldsForSection(
  sectionId: SurgicalIntelligenceSectionId,
): ProviderClinicalDiscoveryFieldConfig[] {
  return PROVIDER_CLINICAL_DISCOVERY_FIELDS.filter((f) => f.planningSectionId === sectionId);
}

export function getClinicalDiscoveryFieldConfig(
  questionKey: ClinicalDiscoveryQuestionKey,
): ProviderClinicalDiscoveryFieldConfig {
  const field = PROVIDER_CLINICAL_DISCOVERY_FIELDS.find((f) => f.questionKey === questionKey);
  if (!field) throw new Error(`Unknown surgical intelligence prompt: ${questionKey}`);
  return field;
}

/** @deprecated Use questionKey on field config */
export const PROVIDER_CLINICAL_DISCOVERY_KEYS = CLINICAL_DISCOVERY_QUESTION_KEYS;

export function clinicalDiscoveryDraftMetaKey(
  questionKey: ClinicalDiscoveryQuestionKey,
  part: "confidence" | "tags" | "sourceCaseId" | "sourceNotes",
): string {
  return `${questionKey}_${part}`;
}

export function clinicalDiscoveryMetaKey(
  questionKey: ClinicalDiscoveryQuestionKey,
  suffix: "confidence" | "tags" | "sourceNotes",
): string {
  return clinicalDiscoveryDraftMetaKey(
    questionKey,
    suffix === "confidence" ? "confidence" : suffix === "tags" ? "tags" : "sourceNotes",
  );
}

export function clinicalDiscoveryUpdatedAtKey(questionKey: ClinicalDiscoveryQuestionKey): string {
  return `${questionKey}_updatedAt`;
}

/** @deprecated Answers are stored in provider_clinical_discovery_answers */
export function allClinicalDiscoveryPatchKeys(): string[] {
  const keys: string[] = [];
  for (const field of PROVIDER_CLINICAL_DISCOVERY_FIELDS) {
    keys.push(field.questionKey);
    keys.push(clinicalDiscoveryMetaKey(field.questionKey, "confidence"));
    keys.push(clinicalDiscoveryMetaKey(field.questionKey, "sourceNotes"));
    keys.push(clinicalDiscoveryMetaKey(field.questionKey, "tags"));
    keys.push(field.legacyContactColumn);
    keys.push(`${field.legacyContactColumn}_confidence`);
    keys.push(`${field.legacyContactColumn}_source`);
    keys.push(`${field.legacyContactColumn}_tags`);
  }
  for (const legacy of LEGACY_CLINICAL_DISCOVERY_QUESTION_KEYS) {
    keys.push(legacy);
  }
  return keys;
}

/** Hydrate UI draft from contact columns and/or questionKey fields on a row. */
export function hydrateClinicalDiscoveryDraftFromRow(
  row: Record<string, unknown>,
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const field of PROVIDER_CLINICAL_DISCOVERY_FIELDS) {
    draft[field.questionKey] = String(row[field.questionKey] ?? row[field.legacyContactColumn] ?? "");
    draft[clinicalDiscoveryMetaKey(field.questionKey, "confidence")] = normalizeConfidence(
      row[clinicalDiscoveryMetaKey(field.questionKey, "confidence")]
        ?? row[`${field.legacyContactColumn}_confidence`],
    );
    draft[clinicalDiscoveryMetaKey(field.questionKey, "sourceNotes")] = String(
      row[clinicalDiscoveryMetaKey(field.questionKey, "sourceNotes")]
        ?? row[`${field.legacyContactColumn}_source`]
        ?? "",
    );
    draft[clinicalDiscoveryMetaKey(field.questionKey, "tags")] = String(
      row[clinicalDiscoveryMetaKey(field.questionKey, "tags")]
        ?? row[`${field.legacyContactColumn}_tags`]
        ?? "",
    );
  }
  return draft;
}

export function hydrateClinicalDiscoveryDraftFromLegacyContact(
  contact: Record<string, unknown>,
): Record<string, string> {
  return hydrateClinicalDiscoveryDraftFromRow(contact);
}

export function buildClinicalDiscoveryRowPatch(
  questionKey: ClinicalDiscoveryQuestionKey,
  draft: Record<string, string>,
): Record<string, string | null> {
  const field = getClinicalDiscoveryFieldConfig(questionKey);
  const trim = (v: string) => v.trim() || null;
  const conf = normalizeConfidence(draft[clinicalDiscoveryMetaKey(questionKey, "confidence")]);
  return {
    [questionKey]: trim(draft[questionKey] ?? ""),
    [clinicalDiscoveryMetaKey(questionKey, "confidence")]: conf || null,
    [clinicalDiscoveryMetaKey(questionKey, "sourceNotes")]: trim(
      draft[clinicalDiscoveryMetaKey(questionKey, "sourceNotes")] ?? "",
    ),
    [clinicalDiscoveryMetaKey(questionKey, "tags")]: trim(draft[clinicalDiscoveryMetaKey(questionKey, "tags")] ?? ""),
    [field.legacyContactColumn]: trim(draft[questionKey] ?? ""),
  };
}

export function normalizeConfidence(raw: unknown): ClinicalDiscoveryConfidence | "" {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return "";
}

export function isClinicalDiscoveryRowComplete(
  questionKey: ClinicalDiscoveryQuestionKey,
  draft: Record<string, string>,
): boolean {
  return isMeaningfulClinicalDiscoveryResponse(draft[questionKey]);
}

export function countClinicalDiscoveryFilled(draft: Record<string, string>): {
  filled: number;
  total: number;
} {
  const total = CLINICAL_DISCOVERY_QUESTION_KEYS.length;
  let filled = 0;
  for (const key of CLINICAL_DISCOVERY_QUESTION_KEYS) {
    if (isClinicalDiscoveryRowComplete(key, draft)) filled += 1;
  }
  return { filled, total };
}

export function clinicalDiscoveryPreviewFromDraft(draft: Record<string, string>, maxLen = 72): string {
  const { filled, total } = countClinicalDiscoveryFilled(draft);
  if (filled <= 0) return `${filled} of ${total} categories noted`;
  const first = PROVIDER_CLINICAL_DISCOVERY_FIELDS.find((f) => isClinicalDiscoveryRowComplete(f.questionKey, draft));
  const snippet = first ? String(draft[first.questionKey]).trim() : "";
  const base = `${filled} of ${total} categories noted`;
  if (!snippet) return base;
  const short = snippet.length > maxLen ? `${snippet.slice(0, maxLen - 1)}…` : snippet;
  return `${base} · ${short}`;
}

export function formatClinicalDiscoveryUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function parseTagsCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function joinTagsCsv(tags: string[]): string {
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))].join(", ");
}

export function toggleTagInCsv(csv: string, tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return csv;
  const existing = parseTagsCsv(csv);
  const lower = trimmed.toLowerCase();
  const match = existing.find((t) => t.toLowerCase() === lower);
  if (match) return joinTagsCsv(existing.filter((t) => t !== match));
  return joinTagsCsv([...existing, trimmed]);
}

export function removeTagFromCsv(csv: string, tag: string): string {
  const lower = tag.trim().toLowerCase();
  return joinTagsCsv(parseTagsCsv(csv).filter((t) => t.toLowerCase() !== lower));
}

export function addCustomTagToCsv(csv: string, raw: string): string {
  const tag = raw.trim();
  if (!tag || tag.length > 80) return csv;
  const existing = parseTagsCsv(csv);
  if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) return joinTagsCsv(existing);
  return joinTagsCsv([...existing, tag]);
}

export function formatClinicalDiscoveryConfidenceLabel(
  confidence: ClinicalDiscoveryConfidence | "",
): string {
  return formatClinicalDiscoverySignalStrengthLabel(confidence);
}

export function tagIsSelected(csv: string, tag: string): boolean {
  const lower = tag.toLowerCase();
  return parseTagsCsv(csv).some((t) => t.toLowerCase() === lower);
}

export type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
