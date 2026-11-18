/**
 * User-facing save destinations shown before intelligence is committed.
 *
 * Maps canonical IntelligenceScope + context to one of four labels:
 * Facility | Provider | Case | Engagement note
 */

import { noteIsEngagementOnly, noteRevealsDurableIntelligence } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import { isCaseIntelligenceDbKey } from "@/lib/surgical-sales/caseIntelligenceFields";
import type { IntelligenceDomain, IntelligenceTarget } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";

export type IntelligenceSaveDestination = "facility" | "provider" | "case" | "engagement_note";

export const INTELLIGENCE_SAVE_DESTINATION_LABELS: Record<IntelligenceSaveDestination, string> = {
  facility: "Organization Intelligence",
  provider: "Provider",
  case: "Case",
  engagement_note: "Engagement note",
};

/** Headings shown after intelligence is saved (post-save confirmation). */
export const INTELLIGENCE_SAVE_DESTINATION_CONFIRMATION_HEADINGS: Record<
  IntelligenceSaveDestination,
  string
> = {
  facility: "Saved to Organization Intelligence",
  provider: "Saved to Provider",
  case: "Saved to Case",
  engagement_note: "Saved to Engagement",
};

export const INTELLIGENCE_SAVE_DESTINATION_ORDER: IntelligenceSaveDestination[] = [
  "facility",
  "provider",
  "engagement_note",
  "case",
];

/** Case logistics topics — durable per scheduled case, not touch-only narrative. */
export const CASE_LOGISTICS_TEXT =
  /\b(implants?|trays?|case\s+timing|support\s+coverage|room[- ]specific|product\s+availability|case\s+risks?|sterilized|on\s+site|arrival\s+time|room\s+assignment)\b/i;

export function isEngagementNoteTarget(target: IntelligenceTarget | null | undefined): boolean {
  return target === "engagement" || target === "engagement_note";
}

export function resolveIntelligenceSaveDestination(input: {
  scope: IntelligenceScope;
  dbKey?: string | null;
  text?: string;
  domain?: IntelligenceDomain | null;
  logUpdateTarget?: IntelligenceTarget | null;
}): { destination: IntelligenceSaveDestination; reason: string } {
  const text = String(input.text ?? "").trim();
  const { scope, dbKey, domain, logUpdateTarget } = input;

  if (scope === "organization") {
    return {
      destination: "facility",
      reason: "Facility intelligence — shared at this hospital (credentialing, OR access, scheduling, purchasing, logistics).",
    };
  }

  if (scope === "provider") {
    return {
      destination: "provider",
      reason: "Provider intelligence — specific to this surgeon (preferences, mix, evaluation, relationship, adoption).",
    };
  }

  if (isEngagementNoteTarget(logUpdateTarget)) {
    return {
      destination: "engagement_note",
      reason: "Engagement note — what happened on this touch; not saved to facility or provider profile unless promoted.",
    };
  }

  if (dbKey && isCaseIntelligenceDbKey(dbKey)) {
    return {
      destination: "case",
      reason: "Case intelligence — logistics and risks for this scheduled case.",
    };
  }

  if (CASE_LOGISTICS_TEXT.test(text) && noteRevealsDurableIntelligence(text, domain)) {
    return {
      destination: "case",
      reason: "Case intelligence — implants, trays, timing, support, room needs, availability, or case risks.",
    };
  }

  if (noteIsEngagementOnly(text) || domain === "next_steps") {
    return {
      destination: "engagement_note",
      reason: "Engagement note — follow-up or visit context for this touch only.",
    };
  }

  if (logUpdateTarget === "case" && CASE_LOGISTICS_TEXT.test(text)) {
    return {
      destination: "case",
      reason: "Case intelligence — operational detail tied to this scheduled case.",
    };
  }

  return {
    destination: "engagement_note",
    reason: "Engagement note — review before saving; promote to Facility, Provider, or Case if durable.",
  };
}

export function intelligenceSaveDestinationLabel(destination: IntelligenceSaveDestination): string {
  return INTELLIGENCE_SAVE_DESTINATION_LABELS[destination];
}

export function intelligenceSaveDestinationFromScope(input: {
  scope: IntelligenceScope;
  dbKey?: string | null;
  text?: string;
  domain?: IntelligenceDomain | null;
  logUpdateTarget?: IntelligenceTarget | null;
}): IntelligenceSaveDestination {
  return resolveIntelligenceSaveDestination(input).destination;
}
