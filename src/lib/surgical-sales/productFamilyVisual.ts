/**
 * Visual identity for surgical product families (case primary product / catalog names).
 * Match order: longer names first so "Skeletal Dynamics" wins before substring edge cases.
 */

export const SURGICAL_PRODUCT_FAMILY_ORDER = [
  "Skeletal Dynamics",
  "Endolumik",
  "TelaBio",
  "BioTissue",
  "Merakris",
  "ACSIS",
] as const;

export type SurgicalProductFamilyLabel = (typeof SURGICAL_PRODUCT_FAMILY_ORDER)[number];

export type SurgicalProductFamilyKey =
  | "acsis"
  | "endolumik"
  | "skeletal_dynamics"
  | "biotissue"
  | "merakris"
  | "telabio";

export function surgicalProductFamilyLabelToKey(label: SurgicalProductFamilyLabel): SurgicalProductFamilyKey {
  switch (label) {
    case "ACSIS":
      return "acsis";
    case "Endolumik":
      return "endolumik";
    case "Skeletal Dynamics":
      return "skeletal_dynamics";
    case "BioTissue":
      return "biotissue";
    case "Merakris":
      return "merakris";
    case "TelaBio":
      return "telabio";
  }
}

/** Resolve family from `surgical_sales_products.name` (exact family or SKU-style prefix). */
export function resolveSurgicalProductFamilyKey(productName: string | null | undefined): SurgicalProductFamilyKey | null {
  const raw = String(productName ?? "").trim().toLowerCase();
  if (!raw) return null;
  for (const label of SURGICAL_PRODUCT_FAMILY_ORDER) {
    const L = label.toLowerCase();
    if (raw === L || raw.startsWith(`${L} `) || raw.startsWith(`${L},`)) {
      return surgicalProductFamilyLabelToKey(label);
    }
  }
  return null;
}

export type SurgicalProductFamilyVisual = {
  /** Canonical list / filter label */
  label: SurgicalProductFamilyLabel;
  /** Short badge text */
  badgeShort: string;
  /** Solid accent for borders / stripes */
  accent: string;
  accentDeep: string;
  /** CSS linear-gradient for vertical kanban stripe */
  stripeGradient: string;
  badgeBackground: string;
  badgeColor: string;
  badgeBorder: string;
};

export const SURGICAL_PRODUCT_FAMILY_VISUAL: Record<SurgicalProductFamilyKey, SurgicalProductFamilyVisual> = {
  acsis: {
    label: "ACSIS",
    badgeShort: "ACSIS",
    accent: "#2563eb",
    accentDeep: "#1d4ed8",
    stripeGradient: "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
    badgeBackground: "color-mix(in srgb, #2563eb 16%, var(--surface))",
    badgeColor: "#1e3a8a",
    badgeBorder: "color-mix(in srgb, #2563eb 28%, var(--border))",
  },
  endolumik: {
    label: "Endolumik",
    badgeShort: "Endolumik",
    accent: "#7c3aed",
    accentDeep: "#5b21b6",
    stripeGradient: "linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)",
    badgeBackground: "color-mix(in srgb, #7c3aed 18%, var(--surface))",
    badgeColor: "#4c1d95",
    badgeBorder: "color-mix(in srgb, #7c3aed 30%, var(--border))",
  },
  skeletal_dynamics: {
    label: "Skeletal Dynamics",
    badgeShort: "Skeletal",
    accent: "#64748b",
    accentDeep: "#334155",
    stripeGradient: "linear-gradient(180deg, #94a3b8 0%, #475569 100%)",
    badgeBackground: "color-mix(in srgb, #64748b 20%, var(--surface))",
    badgeColor: "#1e293b",
    badgeBorder: "color-mix(in srgb, #64748b 32%, var(--border))",
  },
  biotissue: {
    label: "BioTissue",
    badgeShort: "BioTissue",
    accent: "#16a34a",
    accentDeep: "#15803d",
    stripeGradient: "linear-gradient(180deg, #22c55e 0%, #15803d 100%)",
    badgeBackground: "color-mix(in srgb, #16a34a 18%, var(--surface))",
    badgeColor: "#14532d",
    badgeBorder: "color-mix(in srgb, #16a34a 30%, var(--border))",
  },
  merakris: {
    label: "Merakris",
    badgeShort: "Merakris",
    accent: "#0d9488",
    accentDeep: "#0f766e",
    stripeGradient: "linear-gradient(180deg, #14b8a6 0%, #0f766e 100%)",
    badgeBackground: "color-mix(in srgb, #0d9488 18%, var(--surface))",
    badgeColor: "#134e4a",
    badgeBorder: "color-mix(in srgb, #0d9488 30%, var(--border))",
  },
  telabio: {
    label: "TelaBio",
    badgeShort: "TelaBio",
    accent: "#ea580c",
    accentDeep: "#c2410c",
    stripeGradient: "linear-gradient(180deg, #fb923c 0%, #c2410c 100%)",
    badgeBackground: "color-mix(in srgb, #ea580c 18%, var(--surface))",
    badgeColor: "#7c2d12",
    badgeBorder: "color-mix(in srgb, #ea580c 30%, var(--border))",
  },
};

export function surgicalProductFamilyStripeGradient(productName: string | null | undefined): string {
  const key = resolveSurgicalProductFamilyKey(productName);
  if (!key) {
    return "linear-gradient(180deg, color-mix(in srgb, var(--foreground) 22%, transparent) 0%, color-mix(in srgb, var(--foreground) 12%, transparent) 100%)";
  }
  return SURGICAL_PRODUCT_FAMILY_VISUAL[key].stripeGradient;
}

export function surgicalProductFamilyLeftBorderColor(productName: string | null | undefined): string | null {
  const key = resolveSurgicalProductFamilyKey(productName);
  if (!key) return null;
  return SURGICAL_PRODUCT_FAMILY_VISUAL[key].accent;
}

export function isSurgicalProductNameRedundantWithFamily(productName: string | null | undefined): boolean {
  const key = resolveSurgicalProductFamilyKey(productName);
  if (!key || !String(productName ?? "").trim()) return false;
  const canon = SURGICAL_PRODUCT_FAMILY_VISUAL[key].label;
  return String(productName).trim().toLowerCase() === canon.toLowerCase();
}
