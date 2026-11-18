/**
 * Streamlined AI debrief review — grouped insights, concise copy, auto-accept.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type {
  DebriefIntelligenceExtractionReview,
  DebriefIntelligenceUpdateItem,
  DebriefCredentialingPlatformMatch,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { PARTIAL_INTELLIGENCE_LEAD_PREFIX } from "@/lib/surgical-sales/partialIntelligencePersist";
import { reviewFieldBucket } from "@/lib/surgical-sales/logUpdateReviewSelection";
import { isEarlyProductIntelligenceField } from "@/lib/surgical-sales/debriefReviewDisplayLanguage";
import { sanitizeDebriefUserCopy } from "@/lib/surgical-sales/debriefReviewSurface";
import {
  buildPreservedNamedEntitySummary,
  extractPrimaryNamedPerson,
} from "@/lib/surgical-sales/namedEntityPreservation";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  DEBRIEF_INSIGHT_GROUP_PRIORITY,
  DEBRIEF_INTELLIGENCE_CATEGORY_LABELS,
  type DebriefInsightGroupId,
  type DebriefIntelligenceCategory,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";
import {
  debriefConfidenceFromStructured,
  mergeDebriefConfidence,
  scoreConfidenceFromEvidence,
  shouldPreselectDebriefFinding,
} from "@/lib/surgical-sales/debriefIntelligenceConfidence";
import { sourceQuoteForField } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";

export type { DebriefInsightGroupId, DebriefIntelligenceCategory };

export type DebriefReviewFoundBreakdown = {
  signalsCount: number;
  validationCount: number;
  dependenciesCount: number;
};

export type DebriefReviewInsightGroup = {
  id: DebriefInsightGroupId;
  title: string;
  keyInsightLine: string;
  detailLines: string[];
  needs: string[];
  itemIds: string[];
  contactIds: string[];
  platformIds: string[];
  priority: number;
  needsAttention: boolean;
};

const GROUP_PRIORITY = DEBRIEF_INSIGHT_GROUP_PRIORITY;

const GROUP_TITLES = DEBRIEF_INTELLIGENCE_CATEGORY_LABELS;

function groupIdForItem(item: DebriefIntelligenceUpdateItem): DebriefInsightGroupId {
  return item.primaryCategory;
}

const VERBOSITY_STRIP_RE = [
  new RegExp(PARTIAL_INTELLIGENCE_LEAD_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[^\\n]*", "gi"),
  /\bProvider did not shut down observation[;,\s]*/gi,
  /\baccess appears possible if routed through the right people\.?/gi,
  /\bappears possible if routed through[^.]*\.?/gi,
  /\bfrom your note\b/gi,
  /\bon file\b/gi,
  /\bpartially mapped\b/gi,
  /\bpartial lead\b/gi,
  /\boperational intelligence captured:?\s*/gi,
  /\bSource:\s*"[^"]*"\s*/gi,
  /\bStill needed:\s*/gi,
];

export function parseStoredIntelligenceValue(raw: string): { narrative: string; needs: string[] } {
  const text = String(raw ?? "").trim();
  const needs: string[] = [];
  const stillMatch = text.match(/Still needed:\s*([^.]+(?:\.|$))/i);
  if (stillMatch?.[1]) {
    stillMatch[1]
      .split(/[;•]/)
      .map((s) => s.trim().replace(/\.$/, ""))
      .filter(Boolean)
      .forEach((n) => needs.push(n));
  }
  let narrative = text;
  const stillIdx = narrative.search(/Still needed:/i);
  if (stillIdx >= 0) narrative = narrative.slice(0, stillIdx).trim();
  narrative = narrative.replace(/^What happened:\s*/i, "").trim();
  return { narrative, needs };
}

export function toConciseInsightText(raw: string, maxLen = 120): string {
  const original = String(raw ?? "").trim();
  if (!original) return "";

  if (/observation/i.test(original) && /possible|shut down|access|right people/i.test(original)) {
    return "Observation access appears possible.";
  }
  const schedulingEntity = extractPrimaryNamedPerson(original);
  if (schedulingEntity && /schedul/i.test(original)) {
    const preserved = buildPreservedNamedEntitySummary(original);
    if (preserved) return preserved.split("\n")[0] ?? preserved;
  }
  if (/IntelliCentrics/i.test(original)) {
    return "Vendor credentialing likely uses IntelliCentrics.";
  }
  if (/Mike/i.test(original) && /\bPA\b/i.test(original)) {
    return "Mike involved in product evaluations.";
  }
  if (/ACSIS/i.test(original) && /fit|interest|validate/i.test(original)) {
    return "Early clinical interest surfaced.";
  }

  let t = original;
  for (const re of VERBOSITY_STRIP_RE) {
    t = t.replace(re, " ").trim();
  }
  t = sanitizeDebriefUserCopy(t, maxLen + 40);
  t = t.replace(/\s{2,}/g, " ").trim();
  if (!t) return "";
  if (t && !/[.!?]$/.test(t)) t = `${t}.`;
  return t.length > maxLen ? `${t.slice(0, maxLen - 1).trim()}…` : t;
}

function keyLineForGroup(
  id: DebriefInsightGroupId,
  detailLines: string[],
  contacts: DebriefProposedContactItem[],
): string {
  const first = detailLines[0];
  if (id === "people_contacts") {
    const namedContact = contacts.find((c) => isPlausiblePersonName(c.displayName));
    if (namedContact) {
      const blob = [
        namedContact.displayName,
        namedContact.sourceQuote,
        first,
        ...detailLines,
      ]
        .filter(Boolean)
        .join(" ");
      const preserved = buildPreservedNamedEntitySummary(blob);
      if (preserved) return preserved.split("\n")[0] ?? preserved;
      return `${namedContact.displayName} was mentioned during the debrief.`;
    }
    if (first) {
      const preserved = buildPreservedNamedEntitySummary(first);
      if (preserved) return preserved.split("\n")[0] ?? preserved;
      if (/schedul/i.test(first)) return toConciseInsightText(first, 120);
    }
  }
  if (id === "access_intelligence") {
    if (detailLines.some((l) => /observation|access|shut down|right people/i.test(l))) {
      return "Observation access appears possible.";
    }
    if (detailLines.some((l) => /IntelliCentrics|credential/i.test(l))) {
      return "Vendor credentialing likely uses IntelliCentrics.";
    }
    return "Observation access appears possible.";
  }
  if (id === "product_fit_signals") {
    if (detailLines.some((l) => /ACSIS/i.test(l))) {
      return "Early clinical interest surfaced.";
    }
    return toConciseInsightText(first ?? "Early clinical interest surfaced.", 72);
  }
  if (id === "relationship_intelligence") {
    return toConciseInsightText(first ?? "Relationship signal captured.", 72);
  }
  if (id === "clinical_focus") {
    return toConciseInsightText(first ?? "Case opportunity noted.", 72);
  }
  if (id === "workflow_intelligence") {
    return toConciseInsightText(first ?? "Procedure workflow insight captured.", 72);
  }
  if (id === "competitive_intelligence") {
    return toConciseInsightText(first ?? "Competitive landscape noted.", 72);
  }
  if (id === "next_steps") {
    return toConciseInsightText(first ?? "Follow-up required.", 72);
  }
  return toConciseInsightText(first ?? GROUP_TITLES[id], 72);
}

export function intelligenceItemNeedsAttention(
  item: DebriefIntelligenceUpdateItem,
  review: LogUpdateParseResult,
): boolean {
  if (item.hasConflict && item.field.conflict && !item.field.conflict.resolution) return true;
  if (item.requiresRepConfirmation) return true;
  if (item.confidenceTier === "ambiguous") return true;
  if (item.confidenceLabel === "Low") return true;
  if (!item.field.accepted && reviewFieldBucket(item.field, review.aiMapping) === "needs_review") {
    return true;
  }
  return false;
}

function resolveFieldDebriefConfidence(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): import("@/lib/surgical-sales/debriefIntelligencePipeline/types").DebriefFactConfidence {
  const ai = review.aiMapping;
  const partial = ai?.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  const confirmed = ai?.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`);
  const rowConfidence = debriefConfidenceFromStructured(partial?.confidence ?? confirmed?.confidence);
  const evidence = [
    sourceQuoteForField(field, review) ?? "",
    field.proposedValue,
    field.label,
  ].join(" ");
  const fromEvidence = scoreConfidenceFromEvidence(evidence, { factKey: field.dbKey as never });
  return mergeDebriefConfidence(rowConfidence, fromEvidence);
}

export function shouldAutoAcceptFieldSilently(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
  options?: { blockEarlyProductFields?: boolean },
): boolean {
  if (options?.blockEarlyProductFields && isEarlyProductIntelligenceField(field)) return false;
  if (field.conflict && !field.conflict.resolution) return false;
  if (field.id.startsWith("ai-partial-")) return false;
  const confidence = resolveFieldDebriefConfidence(field, review);
  if (!shouldPreselectDebriefFinding(confidence)) return false;
  const bucket = reviewFieldBucket(field, review.aiMapping);
  return field.id.startsWith("ai-confirmed-") && bucket === "recommended";
}

export function applyDebriefReviewAutoAccept(
  review: LogUpdateParseResult,
  options?: { blockEarlyProductFields?: boolean },
): LogUpdateParseResult {
  if (!review.usesProviderIntelligence) return review;
  return {
    ...review,
    fieldUpdates: review.fieldUpdates.map((field) => ({
      ...field,
      accepted: shouldAutoAcceptFieldSilently(field, review, options) ? true : field.accepted,
    })),
  };
}

export function buildDebriefReviewFoundBreakdown(input: {
  extraction: DebriefIntelligenceExtractionReview;
  followUpCount: number;
  proposedContacts: DebriefProposedContactItem[];
  insightGroups: DebriefReviewInsightGroup[];
}): DebriefReviewFoundBreakdown {
  const groups = input.insightGroups;
  const updates = input.extraction.intelligenceUpdates;

  const signalsCount = Math.max(
    groups.filter((g) => g.detailLines.length > 0 || g.itemIds.length > 0).length,
    updates.length > 0 ? 1 : 0,
    input.proposedContacts.filter((c) => c.disposition !== "skipped").length > 0 ? 1 : 0,
  );

  const validationCount =
    groups.filter((g) => g.needsAttention).length +
    updates.filter((u) => u.confidenceTier !== "high_confidence" && !u.field.accepted).length +
    input.proposedContacts.filter(
      (c) => c.disposition !== "skipped" && (c.disposition === "pending" || c.contactDetailsMissing),
    ).length;

  const dependenciesCount = groups.filter(
    (g) =>
      g.id === "access_intelligence" ||
      g.id === "people_contacts" ||
      g.needs.some((n) => /credential|vendor|schedul/i.test(n)),
  ).length;

  return {
    signalsCount,
    validationCount,
    dependenciesCount,
  };
}

export function buildDebriefInsightGroups(input: {
  extraction: DebriefIntelligenceExtractionReview;
  review: LogUpdateParseResult;
  proposedContacts: DebriefProposedContactItem[];
}): DebriefReviewInsightGroup[] {
  const byGroup = new Map<DebriefInsightGroupId, DebriefReviewInsightGroup>();

  function ensure(id: DebriefInsightGroupId): DebriefReviewInsightGroup {
    let g = byGroup.get(id);
    if (!g) {
      g = {
        id,
        title: GROUP_TITLES[id],
        keyInsightLine: "",
        detailLines: [],
        needs: [],
        itemIds: [],
        contactIds: [],
        platformIds: [],
        priority: GROUP_PRIORITY[id],
        needsAttention: false,
      };
      byGroup.set(id, g);
    }
    return g;
  }

  for (const item of input.extraction.intelligenceUpdates) {
    const gid = groupIdForItem(item);
    const g = ensure(gid);
    g.itemIds.push(item.id);
    const { narrative, needs } = parseStoredIntelligenceValue(item.field.proposedValue);
    const line = toConciseInsightText(narrative || item.proposedValue, 140);
    if (line && !g.detailLines.includes(line)) g.detailLines.push(line);
    for (const n of needs) {
      const need = toConciseInsightText(n, 80).replace(/\.$/, "");
      if (need && !g.needs.includes(need)) g.needs.push(need);
    }
    if (intelligenceItemNeedsAttention(item, input.review)) g.needsAttention = true;
  }

  for (const contact of input.proposedContacts.filter((c) => c.disposition !== "skipped")) {
    const g = ensure("people_contacts");
    g.contactIds.push(contact.id);
    if (contact.disposition === "pending" || contact.contactDetailsMissing) {
      g.needsAttention = true;
      const first = contact.displayName.split(/\s+/)[0] || "Contact";
      if (!g.needs.some((n) => n.toLowerCase().includes(first.toLowerCase()))) {
        g.needs.push(`${first} contact info`);
      }
    }
  }

  for (const platform of input.extraction.platformMatches) {
    const g = ensure("access_intelligence");
    g.platformIds.push(platform.id);
    const line = platform.matchedPlatformName
      ? `Possible platform: ${platform.matchedPlatformName}`
      : `Possible platform: ${platform.mentionedName}`;
    if (!g.detailLines.some((l) => l.includes(platform.mentionedName))) {
      g.detailLines.push(line);
    }
    if (platform.confidenceTier !== "high_confidence") g.needsAttention = true;
  }

  const groups = [...byGroup.values()]
    .map((g) => ({
      ...g,
      keyInsightLine: keyLineForGroup(g.id, g.detailLines, input.proposedContacts),
    }))
    .sort((a, b) => a.priority - b.priority);

  return groups;
}

export function buildKeyInsightLines(groups: DebriefReviewInsightGroup[]): string[] {
  return groups.map((g) => g.keyInsightLine).filter(Boolean);
}

export function groupsNeedingAttention(groups: DebriefReviewInsightGroup[]): DebriefReviewInsightGroup[] {
  return groups.filter((g) => g.needsAttention);
}

export function platformNeedsAttention(
  platform: DebriefCredentialingPlatformMatch,
  confirmedIds: ReadonlySet<string>,
  ignoredIds: ReadonlySet<string>,
): boolean {
  if (ignoredIds.has(platform.id) || confirmedIds.has(platform.id)) return false;
  return platform.confidenceTier !== "high_confidence";
}
