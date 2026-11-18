/**
 * Plain-English unresolved provider intelligence for new observation case planning.
 */

import { discoveryReadinessNarrativeLine } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER } from "@/lib/surgical-sales/discoveryIntelligenceOpenQuestions";
import {
  isDiscoverySignalStatusResolved,
  resolveDiscoveryStructuredSignalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  buildProviderIntelligencePreviewForRep,
  formatRepIntelligenceFieldValue,
  isMachineGeneratedIntelligenceLabel,
  resolveRepIntelligencePreviewStatus,
  translateRepIntelligenceText,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type NewCaseUnresolvedProviderSignal = {
  id: string;
  text: string;
};

const PRIORITY_PROFILE_FIELD_KEYS = [
  "provider_evaluation_openness",
  "provider_competitive_products",
  "provider_workflow_pain_points",
  "provider_preference_card_signals",
  "provider_procedure_focus",
] as const;

const SNAKE_CASE_LABEL_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+){2,}\b/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRepSafeSignalText(text: string, options?: { plainEnglishHeadline?: boolean }): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (UUID_RE.test(trimmed)) return false;
  if (!options?.plainEnglishHeadline && isMachineGeneratedIntelligenceLabel(trimmed)) return false;
  if (SNAKE_CASE_LABEL_RE.test(trimmed)) return false;
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(trimmed)) return false;
  return true;
}

function pushSignal(
  signals: NewCaseUnresolvedProviderSignal[],
  seen: Set<string>,
  id: string,
  rawText: string,
  maxItems: number,
  options?: { plainEnglishHeadline?: boolean },
): void {
  if (signals.length >= maxItems) return;
  const text = options?.plainEnglishHeadline ? rawText.trim() : collapseSignalText(rawText);
  if (!text || !isRepSafeSignalText(text, options)) return;
  const key = text.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  signals.push({ id, text });
}

function collapseSignalText(raw: string): string {
  return translateRepIntelligenceText(raw) ?? raw.trim();
}

/**
 * Up to `maxItems` unresolved signals from provider profile intelligence (default 5).
 */
export function buildNewCaseUnresolvedProviderSignals(
  contact: Record<string, unknown> | null | undefined,
  planning?: ProviderPlanningCompletion | null,
  maxItems = 5,
): NewCaseUnresolvedProviderSignal[] {
  if (!contact || typeof contact !== "object") return [];

  const signals: NewCaseUnresolvedProviderSignal[] = [];
  const seen = new Set<string>();
  const discoveryCap = Math.min(3, maxItems);
  const profileCap = Math.min(3, maxItems);

  // Pathway blockers first — observation planning should surface access/scheduling gaps early.
  for (const signalId of DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER) {
    const status = resolveDiscoveryStructuredSignalStatus(signalId, contact);
    if (isDiscoverySignalStatusResolved(signalId, status)) continue;
    const line = discoveryReadinessNarrativeLine(signalId, status);
    if (line) {
      pushSignal(signals, seen, `discovery:${signalId}`, line, discoveryCap, {
        plainEnglishHeadline: true,
      });
    }
  }

  const fieldMetadata = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );
  const profileBudget = discoveryCap + profileCap;

  for (const dbKey of PRIORITY_PROFILE_FIELD_KEYS) {
    const text = formatRepIntelligenceFieldValue(dbKey, contact[dbKey] as string | null | undefined);
    if (!text) continue;
    const status = resolveRepIntelligencePreviewStatus(dbKey, contact, fieldMetadata);
    const stillNeedsLiveValidation = /discussed|needs confirmation|still needs|suspected|unconfirmed/i.test(
      text,
    );
    if (status === "Confirmed" && !stillNeedsLiveValidation) continue;
    pushSignal(signals, seen, `profile:${dbKey}`, text, profileBudget);
  }

  const preview = buildProviderIntelligencePreviewForRep(contact, {
    planning,
    maxOpenQuestions: profileCap,
    maxItemsPerGroup: profileCap,
  });

  for (const group of preview.groups) {
    for (const item of group.items) {
      if (item.status !== "Needs validation" && item.status !== "Unknown" && item.status !== "Likely") {
        continue;
      }
      pushSignal(signals, seen, `preview:${item.dbKey ?? group.id}:${item.text}`, item.text, profileBudget);
    }
  }

  for (const gap of buildIntelligenceLearningGaps(contact, planning, maxItems + 4)) {
    if (gap.state === "outdated") continue;
    pushSignal(signals, seen, `gap:${gap.dbKey}`, gap.phrase, maxItems);
  }

  return signals.slice(0, maxItems);
}
