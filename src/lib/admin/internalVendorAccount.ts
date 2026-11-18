/**
 * Account that owns the internal dropship vendor directory.
 * Server-only. Do not import this from client components.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type InternalVendorAccountSource = "INTERNAL_VENDOR_ACCOUNT_ID" | "PRODUCT_FILES_ACCOUNT_ID";

export type InternalVendorAccountConfig =
  | { ok: true; accountId: string; source: InternalVendorAccountSource }
  | { ok: false; error: string };

const MISSING =
  "Set INTERNAL_VENDOR_ACCOUNT_ID to the accounts.id that owns the internal dropship vendor directory. PRODUCT_FILES_ACCOUNT_ID is accepted only as a legacy fallback.";

function invalid(name: string): string {
  return `${name} must be the UUID of an existing accounts.id. ${MISSING}`;
}

export function resolveInternalVendorAccountId(
  env: Record<string, string | undefined> = process.env,
): InternalVendorAccountConfig {
  const primary = env.INTERNAL_VENDOR_ACCOUNT_ID?.trim() ?? "";
  const legacy = env.PRODUCT_FILES_ACCOUNT_ID?.trim() ?? "";

  if (primary) {
    return UUID_RE.test(primary)
      ? { ok: true, accountId: primary, source: "INTERNAL_VENDOR_ACCOUNT_ID" }
      : { ok: false, error: invalid("INTERNAL_VENDOR_ACCOUNT_ID") };
  }
  if (legacy) {
    return UUID_RE.test(legacy)
      ? { ok: true, accountId: legacy, source: "PRODUCT_FILES_ACCOUNT_ID" }
      : { ok: false, error: invalid("PRODUCT_FILES_ACCOUNT_ID") };
  }
  return { ok: false, error: MISSING };
}
