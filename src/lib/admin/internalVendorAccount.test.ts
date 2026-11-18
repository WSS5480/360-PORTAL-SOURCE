import { describe, expect, it } from "vitest";
import { resolveInternalVendorAccountId } from "@/lib/admin/internalVendorAccount";

const VENDOR = "11111111-1111-4111-8111-111111111111";
const LEGACY = "22222222-2222-4222-8222-222222222222";

describe("resolveInternalVendorAccountId", () => {
  it("prefers INTERNAL_VENDOR_ACCOUNT_ID", () => {
    expect(
      resolveInternalVendorAccountId({
        INTERNAL_VENDOR_ACCOUNT_ID: VENDOR,
        PRODUCT_FILES_ACCOUNT_ID: LEGACY,
      }),
    ).toEqual({ ok: true, accountId: VENDOR, source: "INTERNAL_VENDOR_ACCOUNT_ID" });
  });

  it("accepts PRODUCT_FILES_ACCOUNT_ID only when the primary variable is unset", () => {
    expect(resolveInternalVendorAccountId({ PRODUCT_FILES_ACCOUNT_ID: `  ${LEGACY}  ` })).toEqual({
      ok: true,
      accountId: LEGACY,
      source: "PRODUCT_FILES_ACCOUNT_ID",
    });
  });

  it("fails with a configuration error instead of a hardcoded account", () => {
    const missing = resolveInternalVendorAccountId({});
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toMatch(/INTERNAL_VENDOR_ACCOUNT_ID/);

    const bad = resolveInternalVendorAccountId({ INTERNAL_VENDOR_ACCOUNT_ID: "not-a-uuid" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/must be the UUID/);
  });
});
