export const PRODUCT_SUPPORT_CASE_OUTCOMES = [
  "completed_as_planned",
  "product_used",
  "product_not_used",
  "issue_occurred",
  "follow_up_needed",
] as const;

export type ProductSupportCaseOutcomeId = (typeof PRODUCT_SUPPORT_CASE_OUTCOMES)[number];

export const PRODUCT_SUPPORT_CASE_OUTCOME_LABELS: Record<ProductSupportCaseOutcomeId, string> = {
  completed_as_planned: "Completed as planned",
  product_used: "Product opened/used",
  product_not_used: "Product not used",
  issue_occurred: "Issue occurred",
  follow_up_needed: "Follow-up needed",
};

export function parseProductSupportCaseOutcome(
  raw: string | null | undefined,
): ProductSupportCaseOutcomeId | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  return (PRODUCT_SUPPORT_CASE_OUTCOMES as readonly string[]).includes(value)
    ? (value as ProductSupportCaseOutcomeId)
    : null;
}

export function productSupportCaseOutcomeLabel(
  raw: string | null | undefined,
): string | null {
  const parsed = parseProductSupportCaseOutcome(raw);
  return parsed ? PRODUCT_SUPPORT_CASE_OUTCOME_LABELS[parsed] : null;
}

export function productSupportCaseOutcomeRecorded(caseRow: Record<string, unknown>): boolean {
  const momentsResult = String(caseRow.case_support_case_result ?? "").trim();
  if (momentsResult) return true;
  return Boolean(productSupportCaseOutcomeLabel(String(caseRow.case_support_outcome ?? "")));
}

export function buildProductSupportOutcomePatch(outcome: ProductSupportCaseOutcomeId): Record<string, unknown> {
  return {
    case_support_outcome: outcome,
    follow_up_needed: outcome === "follow_up_needed" || outcome === "issue_occurred",
  };
}
