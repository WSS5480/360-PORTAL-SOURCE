import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const PARTNER_ORDER_SCOPES = ["orders:read", "orders:write"] as const;
export type PartnerOrderScope = (typeof PARTNER_ORDER_SCOPES)[number];

const KEY_PREFIX_LENGTH = 12;

export function hashPartnerApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function partnerKeyPrefix(plaintext: string): string {
  return plaintext.slice(0, KEY_PREFIX_LENGTH);
}

/** Inbound bearer token. Prefix is non-secret. Plaintext is returned once to an admin. */
export function generateInboundPartnerKey(): { plaintext: string; prefix: string; hash: string } {
  const plaintext = `360_${randomBytes(32).toString("base64url")}`;
  return {
    plaintext,
    prefix: partnerKeyPrefix(plaintext),
    hash: hashPartnerApiKey(plaintext),
  };
}

export function readBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorizationHeader);
  if (!match) return null;
  const token = match[1]?.trim() ?? "";
  if (token.length < 20 || token.length > 200) return null;
  return token;
}

export function hashesMatch(leftHex: string, rightHex: string): boolean {
  try {
    const left = Buffer.from(leftHex, "hex");
    const right = Buffer.from(rightHex, "hex");
    if (left.length === 0 || left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function credentialAllows(
  scopes: readonly string[] | null | undefined,
  required: PartnerOrderScope
): boolean {
  const owned = new Set((scopes ?? []).map((scope) => scope.trim()));
  if (required === "orders:read") return owned.has("orders:read") || owned.has("orders:write");
  return owned.has(required);
}

export function productionCredentialsCannotBeActivated(environment: string): boolean {
  return environment === "production";
}
