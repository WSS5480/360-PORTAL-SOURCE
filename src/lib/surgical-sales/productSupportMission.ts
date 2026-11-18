export function supportSetupComplete(input: {
  accountId: string;
  caseDate: string;
  setupProcedure: string;
}): boolean {
  return Boolean(input.accountId.trim() && input.caseDate.trim() && input.setupProcedure.trim());
}

export function productInventoryComplete(input: {
  productId: string;
  skuId: string;
  expectedQty: string;
}): boolean {
  const qty = Number(input.expectedQty);
  return Boolean(input.productId.trim() && input.skuId.trim() && Number.isFinite(qty) && qty > 0);
}

export function caseSupportPlanComplete(input: {
  supportObjective: string;
  supportRepRole: string;
  supportRequiredMaterials: string;
}): boolean {
  return Boolean(
    input.supportObjective.trim() && input.supportRepRole.trim() && input.supportRequiredMaterials.trim(),
  );
}

export function resolveProductSupportProcedureType(setupProcedure: string, supportObjective: string): string {
  const objective = supportObjective.trim();
  if (objective) return objective;
  return setupProcedure.trim();
}

export function buildSupportSetupSummary(input: {
  accountName: string;
  surgeonName: string;
  caseDate: string;
  setupProcedure: string;
  complete: boolean;
}): string {
  if (!input.complete) {
    return "Facility, date, and procedure context needed";
  }
  const parts = [
    input.accountName || "Facility set",
    input.surgeonName ? input.surgeonName : "No surgeon linked",
    input.caseDate || "Date set",
    input.setupProcedure || "Procedure captured",
  ];
  return parts.join(" · ");
}

export function buildProductInventorySummary(input: {
  productLabel: string | null;
  skuLabel: string | null;
  expectedQty: string;
  complete: boolean;
}): string {
  if (!input.complete) {
    if (!input.productLabel && !input.skuLabel) return "Product and SKU required";
    return "Complete product, SKU, and quantity";
  }
  const sku = input.skuLabel && input.skuLabel !== "—" ? input.skuLabel : "SKU set";
  return `${input.productLabel || "Product"} · ${sku} · Qty ${input.expectedQty}`;
}

export function buildCaseSupportPlanSummary(input: {
  supportObjective: string;
  supportRepRole: string;
  followUpNeeded: boolean;
  complete: boolean;
}): string {
  if (!input.complete) {
    return "Support objective, rep role, and required materials";
  }
  const short =
    input.supportObjective.length > 42 ? `${input.supportObjective.slice(0, 39)}…` : input.supportObjective;
  const followUp = input.followUpNeeded ? " · Follow-up flagged" : "";
  return `${short} · ${input.supportRepRole}${followUp}`;
}
