export const PRODUCT_SUPPORT_PROVIDER_REACTIONS = ["positive", "neutral", "negative"] as const;
export type ProductSupportProviderReactionId = (typeof PRODUCT_SUPPORT_PROVIDER_REACTIONS)[number];

export const PRODUCT_SUPPORT_CASE_RESULTS = [
  "successful",
  "issue_encountered",
  "follow_up_needed",
] as const;
export type ProductSupportCaseResultId = (typeof PRODUCT_SUPPORT_CASE_RESULTS)[number];

export const PRODUCT_SUPPORT_NEXT_STEPS = [
  "additional_case",
  "training",
  "evaluation",
  "follow_up_meeting",
  "none",
] as const;
export type ProductSupportNextStepId = (typeof PRODUCT_SUPPORT_NEXT_STEPS)[number];

export const PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS: Record<ProductSupportProviderReactionId, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export const PRODUCT_SUPPORT_CASE_RESULT_LABELS: Record<ProductSupportCaseResultId, string> = {
  successful: "Successful",
  issue_encountered: "Issue Encountered",
  follow_up_needed: "Follow Up Needed",
};

export const PRODUCT_SUPPORT_NEXT_STEP_LABELS: Record<ProductSupportNextStepId, string> = {
  additional_case: "Additional Case",
  training: "Training",
  evaluation: "Evaluation",
  follow_up_meeting: "Follow Up Meeting",
  none: "No Next Step",
};

function parseEnum<T extends string>(raw: string | null | undefined, allowed: readonly T[]): T | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function parseProductSupportProviderReaction(
  raw: string | null | undefined,
): ProductSupportProviderReactionId | null {
  return parseEnum(raw, PRODUCT_SUPPORT_PROVIDER_REACTIONS);
}

export function parseProductSupportCaseResult(raw: string | null | undefined): ProductSupportCaseResultId | null {
  return parseEnum(raw, PRODUCT_SUPPORT_CASE_RESULTS);
}

export function parseProductSupportNextStep(raw: string | null | undefined): ProductSupportNextStepId | null {
  return parseEnum(raw, PRODUCT_SUPPORT_NEXT_STEPS);
}

function legacyOutcomeFromCaseResult(result: ProductSupportCaseResultId | null): string | null {
  if (result === "successful") return "completed_as_planned";
  if (result === "issue_encountered") return "issue_occurred";
  if (result === "follow_up_needed") return "follow_up_needed";
  return null;
}

export function buildProductSupportProviderReactionPatch(
  reaction: ProductSupportProviderReactionId,
): Record<string, unknown> {
  return { case_support_provider_reaction: reaction };
}

export function buildProductSupportCaseResultPatch(result: ProductSupportCaseResultId): Record<string, unknown> {
  const legacy = legacyOutcomeFromCaseResult(result);
  return {
    case_support_case_result: result,
    ...(legacy ? { case_support_outcome: legacy } : {}),
    follow_up_needed: result === "follow_up_needed" || result === "issue_encountered",
  };
}

export function buildProductSupportNextStepPatch(step: ProductSupportNextStepId): Record<string, unknown> {
  return {
    case_support_next_step: step,
    follow_up_needed: step !== "none",
  };
}

export function productSupportCaseMomentsSummary(caseRow: Record<string, unknown>): string | null {
  const reaction = parseProductSupportProviderReaction(caseRow.case_support_provider_reaction as string | null | undefined);
  const result = parseProductSupportCaseResult(caseRow.case_support_case_result as string | null | undefined);
  const nextStep = parseProductSupportNextStep(caseRow.case_support_next_step as string | null | undefined);

  const parts = [
    reaction ? PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS[reaction] : null,
    result ? PRODUCT_SUPPORT_CASE_RESULT_LABELS[result] : null,
    nextStep ? PRODUCT_SUPPORT_NEXT_STEP_LABELS[nextStep] : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function productSupportCaseOutcomeDocumented(caseRow: Record<string, unknown>): boolean {
  return Boolean(parseProductSupportCaseResult(caseRow.case_support_case_result as string | null | undefined));
}
