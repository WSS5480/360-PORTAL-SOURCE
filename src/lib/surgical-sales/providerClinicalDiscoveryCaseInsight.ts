import {
  getClinicalDiscoveryFieldConfig,
  joinTagsCsv,
  parseTagsCsv,
  PROVIDER_CLINICAL_DISCOVERY_FIELDS,
  type ClinicalDiscoveryConfidence,
  type ClinicalDiscoveryQuestionKey,
} from "@/lib/surgical-sales/providerClinicalDiscovery";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";

export const ADD_CASE_INSIGHT_TO_PROVIDER_DISCOVERY_LABEL = "Add insight to meeting prep";
export const ADD_CASE_INSIGHT_MODAL_TITLE = "Add insight to engagement preparation";

export type ClinicalDiscoveryInsightMergeMode = "append" | "replace";

export const CLINICAL_DISCOVERY_CATEGORY_OPTIONS = PROVIDER_CLINICAL_DISCOVERY_FIELDS.map((field) => ({
  questionKey: field.questionKey,
  label: field.shortLabel,
}));

export function mergeClinicalDiscoveryInsightText(
  existing: string | null,
  incoming: string,
  mode: ClinicalDiscoveryInsightMergeMode,
  caseLabel: string,
): string {
  const next = incoming.trim();
  if (!next) return existing?.trim() || "";
  if (!existing?.trim() || mode === "replace") return next;
  if (existing.includes(next)) return existing;
  return `${existing.trim()}\n\n---\nFrom ${caseLabel}:\n${next}`;
}

export function mergeClinicalDiscoveryInsightTags(
  existing: string[],
  incoming: string[],
): string[] {
  return parseTagsCsv(joinTagsCsv([...existing, ...incoming]));
}

export function pickClinicalDiscoveryConfidence(
  existing: ClinicalDiscoveryConfidence | null,
  incoming: ClinicalDiscoveryConfidence | null,
  mode: ClinicalDiscoveryInsightMergeMode,
): ClinicalDiscoveryConfidence | null {
  if (mode === "replace") return incoming;
  return incoming || existing;
}

export function findClinicalDiscoveryAnswer(
  answers: ProviderClinicalDiscoveryAnswer[],
  questionKey: ClinicalDiscoveryQuestionKey,
): ProviderClinicalDiscoveryAnswer | undefined {
  return answers.find((a) => a.questionKey === questionKey);
}

export function categoryLabelForQuestionKey(questionKey: ClinicalDiscoveryQuestionKey): string {
  return getClinicalDiscoveryFieldConfig(questionKey).shortLabel;
}
