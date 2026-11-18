import { isCompletedCaseStatus } from "@/lib/surgical-sales/executionLeaderboardMetrics";

export type SupportedProductCaseLine = {
  actual_quantity?: unknown;
};

export type SupportedProductCaseRow = {
  case_type?: string | null;
  status?: string | null;
  case_support_case_result?: string | null;
};

/** Product support case where our products were used in the field (utilization, not activity). */
export function isSupportedProductCase(input: {
  caseRow: SupportedProductCaseRow;
  productLines?: SupportedProductCaseLine[];
  hasProductUseNote?: boolean;
}): boolean {
  if (String(input.caseRow.case_type ?? "").trim().toLowerCase() !== "product_support") return false;
  if (!isCompletedCaseStatus(input.caseRow.status)) return false;

  const hasActualQuantity = (input.productLines ?? []).some((line) => {
    const qty = Number(line.actual_quantity);
    return Number.isFinite(qty) && qty > 0;
  });
  if (hasActualQuantity) return true;

  if (input.hasProductUseNote) return true;

  const result = String(input.caseRow.case_support_case_result ?? "").trim().toLowerCase();
  if (result === "successful") return true;

  return false;
}
