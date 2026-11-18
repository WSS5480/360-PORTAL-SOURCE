import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planAccountResolution, resolvePartnerLine, type CatalogVariant } from "@/lib/integrations/resolvePartnerCatalog";

const variant: CatalogVariant = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  product_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  sku: "SYN-2X2",
  size_label: "2x2",
  base_unit_price: 100,
  width_cm: 5,
  length_cm: 5,
  total_sqcm: 25,
  is_active: true,
  product_active: true,
  manufacturer: "Synthetic",
};

describe("partner account resolution", () => {
  it("reuses a mapped account and does not require a customer name", () => {
    expect(
      planAccountResolution({
        mappedAccountId: "account-1",
        autoCreateAccounts: true,
        customerName: null,
        approvedDiscountPercent: null,
        approvedTermsDays: null,
      })
    ).toEqual({ action: "use", accountId: "account-1" });
  });

  it("rejects a new reference unless creation and pricing are approved", () => {
    expect(
      planAccountResolution({
        mappedAccountId: null,
        autoCreateAccounts: false,
        customerName: "Clinic",
        approvedDiscountPercent: 10,
        approvedTermsDays: 30,
      }).action
    ).toBe("reject");
    expect(
      planAccountResolution({
        mappedAccountId: null,
        autoCreateAccounts: true,
        customerName: null,
        approvedDiscountPercent: 10,
        approvedTermsDays: 30,
      })
    ).toMatchObject({ errorCode: "customer_name_required" });
    expect(
      planAccountResolution({
        mappedAccountId: null,
        autoCreateAccounts: true,
        customerName: "Clinic",
        approvedDiscountPercent: null,
        approvedTermsDays: 30,
      })
    ).toMatchObject({ errorCode: "pricing_not_approved" });
    expect(
      planAccountResolution({
        mappedAccountId: null,
        autoCreateAccounts: true,
        customerName: "Clinic",
        approvedDiscountPercent: 0,
        approvedTermsDays: 30,
      }).action
    ).toBe("create");
  });
});

describe("partner product resolution", () => {
  it("uses a verified mapping and rejects pending, disabled, inactive, and conflicting products", () => {
    expect(
      resolvePartnerLine({
        line: { sku: "EXT-1", size: "2x2", manufacturer: "Synthetic", unit_of_sale: "Units" },
        maps: [{ external_sku: "EXT-1", product_variant_id: variant.id, status: "verified" }],
        variants: [variant],
        allowDirectSkuMatch: false,
      }).ok
    ).toBe(true);

    expect(
      resolvePartnerLine({
        line: { sku: "EXT-1" },
        maps: [{ external_sku: "EXT-1", product_variant_id: variant.id, status: "pending" }],
        variants: [variant],
        allowDirectSkuMatch: true,
      })
    ).toMatchObject({ ok: false, errorCode: "unverified_mapping" });

    expect(
      resolvePartnerLine({
        line: { sku: "SYN-2X2" },
        maps: [{ external_sku: "SYN-2X2", product_variant_id: variant.id, status: "disabled" }],
        variants: [variant],
        allowDirectSkuMatch: true,
      })
    ).toMatchObject({ ok: false, errorCode: "disabled_mapping" });

    expect(
      resolvePartnerLine({
        line: { sku: "EXT-1" },
        maps: [{ external_sku: "EXT-1", product_variant_id: variant.id, status: "verified" }],
        variants: [{ ...variant, is_active: false }],
        allowDirectSkuMatch: true,
      })
    ).toMatchObject({ ok: false, errorCode: "inactive_product" });

    expect(
      resolvePartnerLine({
        line: { sku: "EXT-1", size: "4x4" },
        maps: [{ external_sku: "EXT-1", product_variant_id: variant.id, status: "verified" }],
        variants: [variant],
        allowDirectSkuMatch: true,
      })
    ).toMatchObject({ ok: false, errorCode: "product_metadata_conflict" });

    expect(
      resolvePartnerLine({
        line: { sku: "EXT-1", unit_of_sale: "Box" },
        maps: [{ external_sku: "EXT-1", product_variant_id: variant.id, status: "verified" }],
        variants: [variant],
        allowDirectSkuMatch: true,
      })
    ).toMatchObject({ ok: false, errorCode: "unit_conflict" });
  });

  it("matches an exact internal SKU only when that is enabled", () => {
    expect(
      resolvePartnerLine({
        line: { sku: "SYN-2X2" },
        maps: [],
        variants: [variant],
        allowDirectSkuMatch: true,
      })
    ).toMatchObject({ ok: true, variant: { id: variant.id } });

    expect(
      resolvePartnerLine({
        line: { sku: "SYN-2X2" },
        maps: [],
        variants: [variant],
        allowDirectSkuMatch: false,
      })
    ).toMatchObject({ ok: false, errorCode: "unmapped_sku" });

    expect(
      resolvePartnerLine({
        line: { sku: "MISSING" },
        maps: [],
        variants: [variant],
        allowDirectSkuMatch: true,
      })
    ).toMatchObject({ ok: false, errorCode: "unknown_sku" });

    expect(
      resolvePartnerLine({
        line: { sku: "SYN-2X2" },
        maps: [],
        variants: [variant, { ...variant, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }],
        allowDirectSkuMatch: true,
      })
    ).toMatchObject({ ok: false, errorCode: "ambiguous_sku" });
  });
});

describe("partner account migration", () => {
  it("locks one external customer per partner and does not create portal users", () => {
    const sql = readFileSync("db/migrations/20261021_partner_account_and_product_mapping.sql", "utf8");
    const foundation = readFileSync("db/migrations/20261020_integration_partner_foundation.sql", "utf8");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("UNIQUE (partner_id, external_sku)");
    expect(foundation).toContain("UNIQUE (partner_id, partner_account_ref)");
    expect(sql).not.toMatch(/insert\s+into\s+public\.account_users/i);
    expect(sql).not.toMatch(/invite/i);
    expect(sql).not.toContain("DROP TABLE");
  });
});
