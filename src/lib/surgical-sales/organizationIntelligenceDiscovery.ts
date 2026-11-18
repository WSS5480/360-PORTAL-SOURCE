import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { parseIntelligenceCaptureValue } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import { readOrganizationInheritanceFromContact } from "@/lib/surgical-sales/organizationIntelligenceInheritance";

export type GuidedDiscoveryMode = "standard" | "inherited_organization";

export { ORGANIZATION_INHERITANCE_LABELS as INHERITED_ORG_DISCOVERY_LABELS } from "@/lib/surgical-sales/organizationIntelligenceInheritance";

export const INHERITED_ORG_DISCOVERY_PROMPT_PREFIX = "Already known from";

function normalizeCompareValue(dbKey: string, raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const parsed = parseIntelligenceCaptureValue(dbKey, trimmed);
  if (parsed.tokens.length > 0) {
    return [...parsed.tokens].sort().join(",");
  }
  if (parsed.token) return parsed.token;
  const notes = parsed.notes?.trim() ?? parsed.legacyText?.trim() ?? "";
  return notes.toLowerCase().replace(/\s+/g, " ");
}

export function providerMatchesOrganizationBaseline(
  dbKey: string,
  providerValue: string,
  baselineValue: string,
): boolean {
  const a = normalizeCompareValue(dbKey, providerValue);
  const b = normalizeCompareValue(dbKey, baselineValue);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export type InheritedOrganizationDiscoveryResolution = {
  mode: "skip" | "inherited" | "ask";
  baselineField?: OrganizationIntelligenceBaseline["fields"][string];
  organizationName: string;
};

/**
 * Decide whether Rapid Discovery should skip, inherit, or ask a facility-scoped question.
 */
export function resolveInheritedOrganizationDiscovery(
  dbKey: string,
  contact: Record<string, unknown>,
  baseline: OrganizationIntelligenceBaseline | null | undefined,
): InheritedOrganizationDiscoveryResolution {
  const organizationName = baseline?.organizationName?.trim() || "this facility";
  const providerRaw = String(contact[dbKey] ?? "").trim();
  const providerHas = fieldHasIntelligenceSignal(dbKey, providerRaw);
  const baselineField = baseline?.fields?.[dbKey];
  const inheritance = readOrganizationInheritanceFromContact(contact, dbKey);

  if (!isOrganizationIntelligenceDbKey(dbKey) || !baselineField) {
    return { mode: "ask", organizationName };
  }

  if (inheritance) {
    return { mode: "skip", baselineField, organizationName };
  }

  if (providerHas && providerMatchesOrganizationBaseline(dbKey, providerRaw, baselineField.value)) {
    return { mode: "skip", baselineField, organizationName };
  }

  if (!providerHas) {
    return { mode: "inherited", baselineField, organizationName };
  }

  return { mode: "ask", baselineField, organizationName };
}

export function formatInheritedOrganizationPrompt(
  organizationName: string,
  displayLine: string,
): string {
  return `${INHERITED_ORG_DISCOVERY_PROMPT_PREFIX} ${organizationName}: ${displayLine}`;
}
