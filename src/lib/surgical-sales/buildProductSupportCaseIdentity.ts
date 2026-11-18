import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  buildCaseIdentity,
  type CaseIdentity,
  type CaseIdentityInput,
} from "@/lib/surgical-sales/buildCaseIdentity";
import type { ProductSupportOverviewProductLine } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";

export type ProductSupportCaseStatusBadgeId = "coverage_confirmed" | "products_ready" | "in_progress";

export type ProductSupportCaseStatusBadge = {
  id: ProductSupportCaseStatusBadgeId;
  label: string;
  active: boolean;
};

export type ProductSupportCaseIdentity = CaseIdentity & {
  productsLabel: string;
  statusBadges: ProductSupportCaseStatusBadge[];
};

function readBool(caseRow: Record<string, unknown>, key: string): boolean {
  const value = caseRow[key];
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function dimensionStatus(
  context: CaseOperationalContextView | null | undefined,
  id: string,
): string | null {
  return context?.dimensions.find((dimension) => dimension.id === id)?.status ?? null;
}

export function buildProductSupportCaseStatusBadges(input: {
  caseRow: Record<string, unknown>;
  products: ProductSupportOverviewProductLine[];
  operationalContext?: CaseOperationalContextView | null;
}): ProductSupportCaseStatusBadge[] {
  const status = String(input.caseRow.status ?? "").trim().toLowerCase();
  const hasProvider = Boolean(String(input.caseRow.surgeon_contact_id ?? "").trim());
  const hasFacility = Boolean(String(input.caseRow.account_id ?? "").trim());
  const supportCoverage = dimensionStatus(input.operationalContext, "support_coverage");
  const implants = dimensionStatus(input.operationalContext, "implants_on_site");
  const trays = dimensionStatus(input.operationalContext, "trays_ready");
  const hasProducts = input.products.length > 0;
  const productsConfigured = hasProducts && input.products.every((line) => line.expectedQuantity != null);

  const coverageConfirmed =
    hasProvider &&
    hasFacility &&
    (supportCoverage === "strong" ||
      supportCoverage === "validated" ||
      Boolean(String(input.caseRow.case_support_coverage ?? "").trim()));

  const productsReady =
    hasProducts &&
    (productsConfigured ||
      implants === "strong" ||
      implants === "validated" ||
      (trays === "strong" && implants !== "early"));

  const inProgress = ["scheduled", "confirmed", "docs_needed", "billing_review"].includes(status);

  return [
    { id: "coverage_confirmed", label: "Coverage Confirmed", active: coverageConfirmed },
    { id: "products_ready", label: "Products Ready", active: productsReady },
    { id: "in_progress", label: "In Progress", active: inProgress },
  ];
}

export function buildProductSupportCaseIdentity(
  input: CaseIdentityInput & {
    productsLabel?: string | null;
    products?: ProductSupportOverviewProductLine[];
    operationalContext?: CaseOperationalContextView | null;
  },
): ProductSupportCaseIdentity {
  const identity = buildCaseIdentity(input);
  const products = input.products ?? [];
  const productsLabel =
    String(input.productsLabel ?? "").trim() ||
    (products.length === 0
      ? "None attached"
      : products.length === 1
        ? products[0].name
        : `${products.length} products`);

  return {
    ...identity,
    caseTypeLabel: "Product Support Case",
    productsLabel,
    statusBadges: buildProductSupportCaseStatusBadges({
      caseRow: input as Record<string, unknown>,
      products,
      operationalContext: input.operationalContext,
    }),
  };
}
