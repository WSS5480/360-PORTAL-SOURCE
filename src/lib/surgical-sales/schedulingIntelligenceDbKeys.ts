import { noteClearlyProviderSpecific } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import { pickDbKeyForScope } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { CONTACT_INFO_MISSING_RE } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  SCHEDULING_DB_KEY_CANDIDATES,
  SCHEDULING_OWNER_FIELD_DB_KEYS,
} from "@/lib/surgical-sales/schedulingIntelligenceDbKeyConstants";

export { SCHEDULING_OWNER_FIELD_DB_KEYS } from "@/lib/surgical-sales/schedulingIntelligenceDbKeyConstants";

export function pickSchedulingIntelligenceDbKey(input: {
  label: string;
  value: string;
  reasoning?: string;
  sourceScope?: string;
  rawNote?: string;
  proposedScope: IntelligenceScope;
  writableKeys: Set<string>;
}): string | null {
  const blob = [input.label, input.value, input.reasoning, input.sourceScope, input.rawNote]
    .filter(Boolean)
    .join(" ");

  if (
    /\bscheduling\s+owner\b/i.test(input.label) &&
    !/\bscheduling\s+ownership\b/i.test(input.label) &&
    input.writableKeys.has("provider_scheduling_contact")
  ) {
    return "provider_scheduling_contact";
  }

  if (
    /\bscheduling\s+ownership\b/i.test(input.label) &&
    input.writableKeys.has("provider_observation_scheduling_control")
  ) {
    return "provider_observation_scheduling_control";
  }

  if (
    /\bshared\s+workflow|both\s+office\s+and\s+OR|office\s+and\s+OR\s+scheduling|works?\s+with\s+(?:the\s+)?or\s+scheduling\b/i.test(
      blob,
    ) &&
    input.writableKeys.has("provider_observation_scheduling_control")
  ) {
    return "provider_observation_scheduling_control";
  }

  const providerOffice =
    noteClearlyProviderSpecific(blob) ||
    /\b(his|her)\s+office\b/i.test(blob) ||
    /\bprovider\s+office\b/i.test(blob) ||
    /\boffice\s+schedul/i.test(blob) ||
    /\bKaren\b/i.test(blob) ||
    input.proposedScope === "provider";

  if (providerOffice && input.writableKeys.has("provider_scheduling_contact")) {
    return "provider_scheduling_contact";
  }

  if (
    /\bOR\s+scheduling|central\s+scheduling|facility\s+scheduling|hospital\s+scheduling\b/i.test(blob) &&
    input.writableKeys.has("provider_facility_scheduling_contact")
  ) {
    return "provider_facility_scheduling_contact";
  }

  return pickDbKeyForScope(
    [...SCHEDULING_DB_KEY_CANDIDATES],
    input.proposedScope,
    input.writableKeys,
  );
}

export function isStaleSchedulingNarrative(text: string): boolean {
  const line = text.trim();
  if (!line) return false;
  if (CONTACT_INFO_MISSING_RE.test(line)) return true;
  if (/\[(?:partial lead)\]/i.test(line)) return true;
  return /\b(?:mentioned|appears involved|usually helps|from (?:his|her) office|contact info missing)\b/i.test(line);
}

export function isLinkedSchedulingContactLine(text: string): boolean {
  const line = text.trim();
  if (!line || isStaleSchedulingNarrative(line)) return false;
  return /\s·\s/.test(line);
}

export function schedulingFieldDisplayPriority(
  dbKey: string,
  text: string,
  contact: Record<string, unknown>,
): number {
  if (isIntelligenceFieldValidatedOnFile(dbKey, contact)) return 100;
  if (isLinkedSchedulingContactLine(text)) return 80;
  if (isStaleSchedulingNarrative(text)) return 10;
  return 50;
}

export function resolveSchedulingOwnerFieldText(contact: Record<string, unknown>): string {
  let bestText = "";
  let bestPriority = -1;

  for (const key of SCHEDULING_DB_KEY_CANDIDATES) {
    const text = String(contact[key] ?? "").trim();
    if (!text) continue;
    const priority = schedulingFieldDisplayPriority(key, text, contact);
    if (priority > bestPriority) {
      bestPriority = priority;
      bestText = text;
    }
  }

  return bestText;
}
