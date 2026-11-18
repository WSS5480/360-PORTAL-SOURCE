/**
 * Post-save confirmation — where intelligence was stored (Facility / Provider / Engagement / Case).
 */

import { buildDiscoveryLearnedFeedback } from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import { ENGAGEMENT_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/engagementIntelligenceFields";
import {
  formatProviderInheritanceDisplayLine,
  readOrganizationInheritanceFromContact,
} from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import { resolveDiscoveryScopeForField } from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import type { IntelligenceDiscoveryStakeholder } from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import {
  INTELLIGENCE_SCOPE_ORDER,
  type IntelligenceScope,
} from "@/lib/surgical-sales/intelligenceScopeModel";
import { intelligenceScopeForDbKey } from "@/lib/surgical-sales/intelligenceScopeModel";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { hasStructuredIntelligenceReview } from "@/lib/surgical-sales/intelligenceReviewPresentation";
import {
  saveTargetFromLegacyTarget,
  type IntelligenceSaveTarget,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import {
  fieldLabelForDbKey,
  type LogUpdateRoutedFieldUpdate,
} from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS,
  INTELLIGENCE_SAVE_DESTINATION_ORDER,
  type IntelligenceSaveDestination,
} from "@/lib/surgical-sales/intelligenceSaveDestination";

export const INTELLIGENCE_SAVE_SCOPE_HEADINGS: Record<IntelligenceScope, string> = {
  organization: "Saved to Organization Intelligence",
  provider: "Saved to Provider",
  case: "Saved to Case",
};

export function intelligenceSaveDestinationFromScope(scope: IntelligenceScope): IntelligenceSaveDestination {
  if (scope === "organization") return "facility";
  if (scope === "case") return "case";
  return "provider";
}

export type IntelligenceSaveConfirmationGroup = {
  scope: IntelligenceScope;
  destination: IntelligenceSaveDestination;
  heading: string;
  lines: string[];
};

const FIELD_LABEL = new Map([
  ...PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
  ...ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
  ...ENGAGEMENT_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
]);

const TRACKED_SAVE_DB_KEYS = [
  ...PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey),
  ...ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey),
];

function inheritanceChanged(
  dbKey: string,
  baseline: Record<string, unknown>,
  current: Record<string, unknown>,
): boolean {
  const before = readOrganizationInheritanceFromContact(baseline, dbKey);
  const after = readOrganizationInheritanceFromContact(current, dbKey);
  if (!after) return false;
  if (!before) return true;
  return (
    before.stance !== after.stance ||
    before.resolved_at !== after.resolved_at ||
    before.facility_value !== after.facility_value
  );
}

function fieldValueChanged(
  dbKey: string,
  baseline: Record<string, unknown>,
  current: Record<string, unknown>,
): boolean {
  const before = String(baseline[dbKey] ?? "").trim();
  const after = String(current[dbKey] ?? "").trim();
  if (before === after) return false;
  return fieldHasIntelligenceSignal(dbKey, after) || fieldHasIntelligenceSignal(dbKey, before);
}

/** Human-readable line for a saved field (chip, inheritance, or synthesis feedback). */
export function intelligenceSavedDisplayLine(
  dbKey: string,
  contact: Record<string, unknown>,
  organizationName?: string | null,
): string {
  const inheritance = readOrganizationInheritanceFromContact(contact, dbKey);
  if (inheritance) {
    const providerRaw = String(contact[dbKey] ?? "").trim();
    return formatProviderInheritanceDisplayLine({
      stance: inheritance.stance,
      facilityDisplayLine: inheritance.facility_display_line,
      providerValue: providerRaw,
      organizationName: organizationName ?? undefined,
    });
  }

  const chip = formatIntelligenceCaptureSummaryChip(dbKey, String(contact[dbKey] ?? ""));
  if (chip) return chip;

  const feedback = buildDiscoveryLearnedFeedback(dbKey, contact[dbKey] as string);
  const genericSuffix = " updated";
  if (feedback.endsWith(genericSuffix) && FIELD_LABEL.has(dbKey)) {
    return FIELD_LABEL.get(dbKey)!;
  }
  return feedback;
}

export function resolveSaveScopeForField(
  dbKey: string,
  discoveryStakeholder: IntelligenceDiscoveryStakeholder = "unspecified",
): IntelligenceScope {
  if (discoveryStakeholder !== "unspecified") {
    return resolveDiscoveryScopeForField(dbKey, discoveryStakeholder).scope;
  }
  return intelligenceScopeForDbKey(dbKey) ?? "provider";
}

export function collectIntelligenceSavedDbKeys(input: {
  baseline: Record<string, unknown>;
  current: Record<string, unknown>;
  answeredDbKeys?: readonly string[];
}): string[] {
  const keys = new Set(input.answeredDbKeys ?? []);

  for (const dbKey of TRACKED_SAVE_DB_KEYS) {
    if (fieldValueChanged(dbKey, input.baseline, input.current)) {
      keys.add(dbKey);
    } else if (inheritanceChanged(dbKey, input.baseline, input.current)) {
      keys.add(dbKey);
    }
  }

  return [...keys];
}

export function buildIntelligenceSaveConfirmationGroups(input: {
  baseline: Record<string, unknown>;
  current: Record<string, unknown>;
  answeredDbKeys?: readonly string[];
  discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  organizationName?: string | null;
}): IntelligenceSaveConfirmationGroup[] {
  const savedKeys = collectIntelligenceSavedDbKeys(input);
  const byScope = new Map<IntelligenceScope, string[]>();

  for (const dbKey of savedKeys) {
    const scope = resolveSaveScopeForField(dbKey, input.discoveryStakeholder ?? "unspecified");
    const line = intelligenceSavedDisplayLine(dbKey, input.current, input.organizationName);
    const list = byScope.get(scope) ?? [];
    if (!list.includes(line)) list.push(line);
    byScope.set(scope, list);
  }

  const groups: IntelligenceSaveConfirmationGroup[] = [];
  for (const scope of INTELLIGENCE_SCOPE_ORDER) {
    const lines = byScope.get(scope);
    if (!lines?.length) continue;
    const destination = intelligenceSaveDestinationFromScope(scope);
    groups.push({
      scope,
      destination,
      heading: INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS[destination],
      lines,
    });
  }
  return groups;
}

function pushDestinationLine(
  byDestination: Map<IntelligenceSaveDestination, string[]>,
  destination: IntelligenceSaveDestination,
  line: string,
) {
  const trimmed = line.trim();
  if (!trimmed) return;
  const list = byDestination.get(destination) ?? [];
  if (!list.includes(trimmed)) list.push(trimmed);
  byDestination.set(destination, list);
}

export function logUpdateSavedDisplayLine(field: LogUpdateRoutedFieldUpdate): string {
  const chip = formatIntelligenceCaptureSummaryChip(field.dbKey, field.proposedValue);
  if (chip) return chip;
  const label = field.label.trim() || fieldLabelForDbKey(field.dbKey);
  return label;
}

/** Group accepted saves by canonical save_target for post-save OpenAI summary. */
export function buildAcceptedByTargetForPostSave(
  review: LogUpdateParseResult | null,
): Array<{ saveTarget: IntelligenceSaveTarget; lines: string[] }> {
  if (!review) return [];

  const byTarget = new Map<IntelligenceSaveTarget, string[]>();

  const push = (saveTarget: IntelligenceSaveTarget, line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const list = byTarget.get(saveTarget) ?? [];
    if (!list.includes(trimmed)) list.push(trimmed);
    byTarget.set(saveTarget, list);
  };

  if (review.usesProviderIntelligence) {
    for (const field of review.fieldUpdates.filter((u) => u.accepted)) {
      const saveTarget = saveTargetFromLegacyTarget(
        field.proposedDestination === "engagement_note"
          ? "engagement"
          : field.proposedDestination === "facility"
            ? "organization"
            : field.proposedDestination === "case"
              ? "case"
              : "provider",
      );
      push(saveTarget, logUpdateSavedDisplayLine(field));
    }
  }

  if (review.saveAsNoteAccepted) {
    push("engagement", review.sourceText.trim().slice(0, 200) || "Touch note saved");
  }

  const ai = review.aiMapping;
  if (hasStructuredIntelligenceReview(review) && ai) {
    for (const u of ai.confirmed_updates) {
      push(u.save_target, `${u.label}: ${u.value.slice(0, 160)}`);
    }
  }

  return [...byTarget.entries()].map(([saveTarget, lines]) => ({ saveTarget, lines }));
}

export function buildLogUpdateIntelligenceSaveConfirmation(
  review: LogUpdateParseResult | null,
  options?: {
    engagementDebriefLine?: string | null;
    providerNoteLine?: string | null;
    /** When true, raw note preservation is shown under Engagement (not Provider). */
    saveTouchNoteToEngagement?: boolean;
  },
): IntelligenceSaveConfirmationGroup[] {
  const byDestination = new Map<IntelligenceSaveDestination, string[]>();

  if (review?.usesProviderIntelligence) {
    for (const field of review.fieldUpdates.filter((u) => u.accepted)) {
      const destination =
        field.proposedDestination ??
        intelligenceSaveDestinationFromScope(
          field.proposedScope ?? intelligenceScopeForDbKey(field.dbKey) ?? "provider",
        );
      pushDestinationLine(byDestination, destination, logUpdateSavedDisplayLine(field));
    }
  }

  if (review?.saveAsNoteAccepted) {
    const noteLine =
      options?.providerNoteLine?.trim() ||
      (review.sourceText.trim().slice(0, 80)
        ? review.sourceText.trim().slice(0, 80)
        : "Field note saved");
    const touchDestination = options?.saveTouchNoteToEngagement ? "engagement_note" : "provider";
    pushDestinationLine(byDestination, touchDestination, noteLine);
  }

  const debriefLine = options?.engagementDebriefLine?.trim();
  if (debriefLine) {
    pushDestinationLine(byDestination, "engagement_note", debriefLine);
  }

  const groups: IntelligenceSaveConfirmationGroup[] = [];
  for (const destination of INTELLIGENCE_SAVE_DESTINATION_ORDER) {
    const lines = byDestination.get(destination);
    if (!lines?.length) continue;
    groups.push({
      scope:
        destination === "facility"
          ? "organization"
          : destination === "case"
            ? "case"
            : "provider",
      destination,
      heading: INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS[destination],
      lines,
    });
  }
  return groups;
}

export function mergeIntelligenceSaveConfirmationGroups(
  groups: IntelligenceSaveConfirmationGroup[],
): IntelligenceSaveConfirmationGroup[] {
  const byDestination = new Map<IntelligenceSaveDestination, string[]>();
  for (const group of groups) {
    for (const line of group.lines) {
      pushDestinationLine(byDestination, group.destination, line);
    }
  }
  const merged: IntelligenceSaveConfirmationGroup[] = [];
  for (const destination of INTELLIGENCE_SAVE_DESTINATION_ORDER) {
    const lines = byDestination.get(destination);
    if (!lines?.length) continue;
    merged.push({
      scope:
        destination === "facility"
          ? "organization"
          : destination === "case"
            ? "case"
            : "provider",
      destination,
      heading: INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS[destination],
      lines,
    });
  }
  return merged;
}

/** Single-field confirmation immediately after one save. */
export function buildSingleIntelligenceSaveConfirmation(input: {
  dbKey: string;
  contact: Record<string, unknown>;
  discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  organizationName?: string | null;
}): IntelligenceSaveConfirmationGroup | null {
  const scope = resolveSaveScopeForField(input.dbKey, input.discoveryStakeholder ?? "unspecified");
  const destination = intelligenceSaveDestinationFromScope(scope);
  const line = intelligenceSavedDisplayLine(input.dbKey, input.contact, input.organizationName);
  return {
    scope,
    destination,
    heading: INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS[destination],
    lines: [line],
  };
}
