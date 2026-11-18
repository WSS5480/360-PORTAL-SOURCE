/**
 * Credentialing / vendor access platforms — global reusable reference catalog.
 * Pure helpers only — server DB access lives in loadActiveCredentialingPlatforms.ts.
 */

export type CredentialingPlatformRecord = {
  id: string;
  name: string;
  name_normalized: string;
  aliases: string[];
  notes?: string | null;
  active: boolean;
  updated_at?: string;
};

export const BUILTIN_CREDENTIALING_PLATFORMS = [
  "RepTrax",
  "IntelliCentrics / SEC3URE",
  "Vendormate",
  "Symplr",
  "Green Security",
  "GHX",
  "Facility-specific portal",
  "Manual paperwork",
  "Other / unknown",
] as const;

export function normalizeCredentialingPlatformName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function credentialingPlatformDisplayName(platform: Pick<CredentialingPlatformRecord, "name">): string {
  return platform.name.trim();
}

export function matchCredentialingPlatformQuery(
  platform: CredentialingPlatformRecord,
  query: string,
): boolean {
  const q = normalizeCredentialingPlatformName(query);
  if (!q) return true;
  if (normalizeCredentialingPlatformName(platform.name).includes(q)) return true;
  return platform.aliases.some((alias) => normalizeCredentialingPlatformName(alias).includes(q));
}

export function platformMatchesCredentialingName(
  platform: CredentialingPlatformRecord,
  name: string,
): boolean {
  const normalized = normalizeCredentialingPlatformName(name);
  if (!normalized) return false;
  if (normalizeCredentialingPlatformName(platform.name) === normalized) return true;
  return platform.aliases.some((alias) => normalizeCredentialingPlatformName(alias) === normalized);
}

export function parseCredentialingAliasesInput(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

export function mergeCredentialingPlatformAliases(
  existing: readonly string[],
  incoming: readonly string[],
): string[] {
  const seen = new Set(existing.map((alias) => normalizeCredentialingPlatformName(alias)));
  const merged = [...existing];
  for (const alias of incoming) {
    const trimmed = alias.trim().replace(/\s+/g, " ");
    const normalized = normalizeCredentialingPlatformName(trimmed);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(trimmed);
  }
  return merged;
}

export function findCredentialingPlatformMatch(
  platforms: readonly CredentialingPlatformRecord[],
  name: string,
  aliases: readonly string[] = [],
): CredentialingPlatformRecord | null {
  const candidates = [name, ...aliases];
  for (const candidate of candidates) {
    const match = platforms.find((platform) => platformMatchesCredentialingName(platform, candidate));
    if (match) return match;
  }
  return null;
}
