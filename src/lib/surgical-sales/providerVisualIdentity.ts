import {
  isGenericClinicalFactText,
  parseClinicalStorageValue,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";

export type ProviderVisualEnrichment = {
  avatarUrl?: string | null;
  headshotUrl?: string | null;
  organizationLogoUrl?: string | null;
  specialtyLabel?: string | null;
  procedureFocusLabel?: string | null;
};

export type ProviderVisualIdentity = {
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  organizationLogoUrl: string | null;
  organizationName: string | null;
  /** Styled focus chip when specialty is known. */
  specialtyBadge: string | null;
  /** Compact muted chip when specialty is missing. */
  specialtyFallbackChip: string;
  procedureFocusBadge: string | null;
  procedureFocusChips: string[];
  hasAvatarImage: boolean;
  hasOrganizationLogo: boolean;
};

const PROVIDER_IMAGE_URL_KEYS = [
  "provider_avatar_url",
  "avatar_url",
  "headshot_url",
  "photo_url",
  "profile_image_url",
  "image_url",
] as const;

const ORGANIZATION_LOGO_URL_KEYS = [
  "organization_logo_url",
  "logo_url",
  "brand_logo_url",
  "account_logo_url",
  "image_url",
] as const;

const ENRICHMENT_OBJECT_KEYS = ["visual_identity", "provider_enrichment", "enrichment"] as const;

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function isHttpUrl(raw: string): boolean {
  return /^https?:\/\//i.test(raw) || raw.startsWith("/");
}

function pickUrlFromRecord(record: Record<string, unknown> | null | undefined, keys: readonly string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const v = trimOrNull(record[key]);
    if (v && isHttpUrl(v)) return v;
  }
  return null;
}

function pickNestedEnrichment(contact: Record<string, unknown>): ProviderVisualEnrichment | null {
  for (const key of ENRICHMENT_OBJECT_KEYS) {
    const nested = contact[key];
    if (!nested || typeof nested !== "object") continue;
    const o = nested as Record<string, unknown>;
    return {
      avatarUrl: pickUrlFromRecord(o, ["avatarUrl", "avatar_url", "headshot_url", ...PROVIDER_IMAGE_URL_KEYS]),
      headshotUrl: pickUrlFromRecord(o, ["headshotUrl", "headshot_url"]),
      organizationLogoUrl: pickUrlFromRecord(o, ["organizationLogoUrl", "organization_logo_url", ...ORGANIZATION_LOGO_URL_KEYS]),
      specialtyLabel: trimOrNull(o.specialtyLabel ?? o.specialty_label ?? o.specialty),
      procedureFocusLabel: trimOrNull(o.procedureFocusLabel ?? o.procedure_focus_label ?? o.procedure_focus),
    };
  }
  return null;
}

/** Derives 1–2 letter initials for avatar fallback. */
export function providerDisplayInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  const letters = (first + last).toUpperCase();
  if (letters) return letters;
  return displayName.slice(0, 2).toUpperCase() || "—";
}

/** Procedure focus badge string — procedure names only, without trend/volume suffixes. */
export function formatProviderProcedureFocusBadge(contact: Record<string, unknown>): string | null {
  const raw = String(contact.provider_procedure_focus ?? "").trim();
  if (!raw) return null;

  const procedures: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(/\||\n/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const parsed = parseClinicalStorageValue(trimmed);
    const label = parsed?.procedureFocus ?? (isGenericClinicalFactText(trimmed) ? null : trimmed);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    procedures.push(label);
  }

  if (procedures.length === 0) return null;
  return procedures.slice(0, 3).join(" · ");
}

export function formatProviderProcedureFocusChips(contact: Record<string, unknown>): string[] {
  const badge = formatProviderProcedureFocusBadge(contact);
  if (!badge) return [];
  return badge.split(" · ").map((part) => part.trim()).filter(Boolean);
}

function resolveAvatarUrl(
  contact: Record<string, unknown>,
  enrichment: ProviderVisualEnrichment | null,
): string | null {
  return (
    enrichment?.avatarUrl ||
    enrichment?.headshotUrl ||
    pickUrlFromRecord(contact, PROVIDER_IMAGE_URL_KEYS) ||
    null
  );
}

function resolveOrganizationLogoUrl(
  organization: Record<string, unknown> | null | undefined,
  enrichment: ProviderVisualEnrichment | null,
): string | null {
  return (
    enrichment?.organizationLogoUrl ||
    pickUrlFromRecord(organization ?? undefined, ORGANIZATION_LOGO_URL_KEYS) ||
    null
  );
}

export function resolveProviderVisualIdentity(input: {
  displayName: string;
  contact: Record<string, unknown>;
  specialty?: string | null;
  primaryOrganization?: { id?: string; name?: string | null; [key: string]: unknown } | null;
  enrichment?: ProviderVisualEnrichment | null;
}): ProviderVisualIdentity {
  const nested = pickNestedEnrichment(input.contact);
  const enrichment = { ...nested, ...input.enrichment };

  const displayName = trimOrNull(input.displayName) || "Provider";
  const avatarUrl = resolveAvatarUrl(input.contact, enrichment);
  const orgRecord = input.primaryOrganization as Record<string, unknown> | null | undefined;
  const organizationLogoUrl = resolveOrganizationLogoUrl(orgRecord, enrichment);
  const organizationName = trimOrNull(orgRecord?.name) || trimOrNull(input.contact.organization_name);

  const specialtyRaw =
    trimOrNull(enrichment?.specialtyLabel) ||
    trimOrNull(input.specialty) ||
    trimOrNull(input.contact.title) ||
    trimOrNull(input.contact.specialty);
  const procedureRaw = formatProviderProcedureFocusBadge(input.contact);
  const procedureFocusChips = formatProviderProcedureFocusChips(input.contact);

  const specialtyKnown = Boolean(specialtyRaw && specialtyRaw.toLowerCase() !== "specialty not set");

  return {
    displayName,
    initials: providerDisplayInitials(displayName),
    avatarUrl,
    organizationLogoUrl,
    organizationName,
    specialtyBadge: specialtyKnown ? specialtyRaw : null,
    specialtyFallbackChip: "Specialty not set",
    procedureFocusBadge: procedureRaw,
    procedureFocusChips,
    hasAvatarImage: Boolean(avatarUrl),
    hasOrganizationLogo: Boolean(organizationLogoUrl),
  };
}
