export type AccountResolution =
  | { action: "use"; accountId: string }
  | { action: "create" }
  | { action: "reject"; status: 422; errorCode: string; error: string };

export function planAccountResolution(input: {
  mappedAccountId: string | null;
  autoCreateAccounts: boolean;
  customerName: string | null;
  approvedDiscountPercent: number | null;
  approvedTermsDays: number | null;
}): AccountResolution {
  if (input.mappedAccountId) return { action: "use", accountId: input.mappedAccountId };
  if (!input.autoCreateAccounts) {
    return {
      action: "reject",
      status: 422,
      errorCode: "unknown_account",
      error: "partner_account_ref is not mapped. Map the customer or enable approved automatic account creation for this partner.",
    };
  }
  if (!input.customerName) {
    return {
      action: "reject",
      status: 422,
      errorCode: "customer_name_required",
      error: "A customer.name is required before a new account can be created for this partner_account_ref.",
    };
  }
  if (input.approvedDiscountPercent == null || input.approvedTermsDays == null) {
    return {
      action: "reject",
      status: 422,
      errorCode: "pricing_not_approved",
      error: "This partner has no approved default discount and payment terms, so a new account was not created.",
    };
  }
  return { action: "create" };
}

export type CatalogVariant = {
  id: string;
  product_id: string;
  sku: string;
  size_label: string | null;
  base_unit_price: number;
  width_cm: number | null;
  length_cm: number | null;
  total_sqcm: number | null;
  is_active: boolean;
  product_active: boolean;
  manufacturer: string | null;
};

export type ProductMapRow = {
  external_sku: string;
  product_variant_id: string;
  status: string;
};

export type PartnerLineIdentity = {
  sku: string;
  manufacturer?: string | null;
  size?: string | null;
  width_cm?: number | null;
  length_cm?: number | null;
  unit_of_sale?: string | null;
};

export type LineResolution =
  | { ok: true; variant: CatalogVariant }
  | { ok: false; status: 409 | 422; errorCode: string; error: string; sku: string };

function sameText(left: string | null | undefined, right: string | null | undefined): boolean {
  return String(left ?? "").trim().toLowerCase() === String(right ?? "").trim().toLowerCase();
}

function metadataConflict(line: PartnerLineIdentity, variant: CatalogVariant): string | null {
  const unit = String(line.unit_of_sale ?? "").trim();
  if (unit && unit.toLowerCase() !== "units") return "unit_conflict";
  if (line.size && variant.size_label && !sameText(line.size, variant.size_label)) return "product_metadata_conflict";
  if (line.manufacturer && variant.manufacturer && !sameText(line.manufacturer, variant.manufacturer)) return "product_metadata_conflict";
  if (line.width_cm != null && variant.width_cm != null && Math.abs(line.width_cm - variant.width_cm) > 0.05) {
    return "product_metadata_conflict";
  }
  if (line.length_cm != null && variant.length_cm != null && Math.abs(line.length_cm - variant.length_cm) > 0.05) {
    return "product_metadata_conflict";
  }
  return null;
}

export function resolvePartnerLine(input: {
  line: PartnerLineIdentity;
  maps: ProductMapRow[];
  variants: CatalogVariant[];
  allowDirectSkuMatch: boolean;
}): LineResolution {
  const sku = input.line.sku;
  const map = input.maps.find((row) => row.external_sku === sku) ?? null;
  if (map) {
    if (map.status === "disabled") {
      return { ok: false, status: 422, errorCode: "disabled_mapping", error: "The partner SKU mapping is disabled.", sku };
    }
    if (map.status !== "verified") {
      return {
        ok: false,
        status: 422,
        errorCode: "unverified_mapping",
        error: "The partner SKU mapping exists but has not been verified.",
        sku,
      };
    }
    const variant = input.variants.find((row) => row.id === map.product_variant_id) ?? null;
    if (!variant || !variant.is_active || !variant.product_active) {
      return { ok: false, status: 422, errorCode: "inactive_product", error: "The mapped product variant is not active.", sku };
    }
    const conflict = metadataConflict(input.line, variant);
    if (conflict === "unit_conflict") {
      return { ok: false, status: 422, errorCode: "unit_conflict", error: "The partner unit of sale does not match Units.", sku };
    }
    if (conflict) {
      return {
        ok: false,
        status: 409,
        errorCode: "product_metadata_conflict",
        error: "The partner product details conflict with the verified internal variant.",
        sku,
      };
    }
    return { ok: true, variant };
  }

  if (!input.allowDirectSkuMatch) {
    return {
      ok: false,
      status: 422,
      errorCode: "unmapped_sku",
      error: "No verified partner SKU mapping exists, and direct internal SKU matching is disabled.",
      sku,
    };
  }

  const matches = input.variants.filter((row) => row.sku === sku);
  const active = matches.filter((row) => row.is_active && row.product_active);
  if (matches.length > 0 && active.length === 0) {
    return { ok: false, status: 422, errorCode: "inactive_product", error: "The internal SKU is not an active catalog item.", sku };
  }
  if (active.length > 1) {
    return { ok: false, status: 409, errorCode: "ambiguous_sku", error: "The SKU matches more than one active product.", sku };
  }
  if (active.length === 0) {
    return { ok: false, status: 422, errorCode: "unknown_sku", error: "The SKU is not a verified mapping or an active internal SKU.", sku };
  }
  const conflict = metadataConflict(input.line, active[0]!);
  if (conflict === "unit_conflict") {
    return { ok: false, status: 422, errorCode: "unit_conflict", error: "The partner unit of sale does not match Units.", sku };
  }
  if (conflict) {
    return {
      ok: false,
      status: 409,
      errorCode: "product_metadata_conflict",
      error: "The partner product details conflict with the internal variant.",
      sku,
    };
  }
  return { ok: true, variant: active[0]! };
}
