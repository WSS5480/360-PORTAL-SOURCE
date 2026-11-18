/**
 * Rep-facing debrief review copy — plain language, no data-model or ontology labels.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { fieldLabelForDbKey } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type {
  DebriefIntelligenceExtractionReview,
  DebriefIntelligenceUpdateItem,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { debriefContactCardPrompt } from "@/lib/surgical-sales/debriefDetectedContact";
import type { MergedOperationalReviewCard } from "@/lib/surgical-sales/mergeDebriefOperationalReview";
import type { ProviderOperationalState } from "@/lib/surgical-sales/operationalIntelligenceTypes";
import {
  DEBRIEF_INTELLIGENCE_CATEGORY_LABELS,
  type DebriefIntelligenceCategory,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";
import {
  classifyDebriefPathwaySignal,
  debriefCardBody,
  formatDebriefFieldValueForDisplay,
  stripStoredIntelligenceEncoding,
} from "@/lib/surgical-sales/debriefReviewDisplayLanguage";
import {
  buildDebriefFollowUpGroups,
  sanitizeDebriefUserCopy,
  type DebriefReviewFollowUpGroups,
} from "@/lib/surgical-sales/debriefReviewSurface";
import type { DebriefReviewInsightGroup } from "@/lib/surgical-sales/debriefReviewStreamlined";
import { deriveTouchCapturedRecommendedNextMove } from "@/lib/surgical-sales/buildDebriefTouchCapturedSummary";
import {
  resolveContactDictationEvidence,
  resolveIntelligenceItemDictationEvidence,
  resolvePlatformDictationEvidence,
} from "@/lib/surgical-sales/debriefDictationEvidence";
import { repIndicatesCredentialingPlatformUnknown } from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";
import {
  buildDebriefReviewSections,
  intelligenceItemToRepFriendlyUpdate,
} from "@/lib/surgical-sales/buildDebriefReviewSections";
import {
  classifyExtractedIntelligenceMaturity,
  classifyIntelligenceUpdateItemMaturity,
  classifyProposedContactMaturity,
  extractedIntelligenceMaturityLabel,
  type ExtractedIntelligenceMaturity,
} from "@/lib/surgical-sales/extractedIntelligenceClassification";
import {
  acceptedClassifiedFacts,
} from "@/lib/surgical-sales/debriefIntelligencePipeline";
import { buildConcreteDebriefNextSteps } from "@/lib/surgical-sales/buildConcreteDebriefNextSteps";
import {
  repFriendlyUpdateLabelForCategory,
  repFriendlyUpdateLabelForDbKey,
} from "@/lib/surgical-sales/debriefReviewPropagation";

export const DEBRIEF_REVIEW_SECTION_KEY_TAKEAWAYS = "Key Takeaways";
export const DEBRIEF_REVIEW_SECTION_WORKFLOW_PARTICIPANTS = "Workflow Participants";
export const DEBRIEF_REVIEW_SECTION_NEXT_STEPS = "Recommended Next Steps";
/** @deprecated Use Intelligence Captured + Recommended Actions sections */
export const DEBRIEF_REVIEW_SECTION_SUGGESTED_UPDATES = "Suggested Updates";

/** Key takeaways should stay readable — avoid the 120-char insight card limit. */
const KEY_TAKEAWAY_MAX_LEN = 320;

function formatKeyTakeawayLine(raw: string): string {
  return sanitizeRepFriendlyCopy(String(raw ?? "").trim(), KEY_TAKEAWAY_MAX_LEN);
}

export const DEBRIEF_UPDATE_CARD_LEARNED = "Learned";
export const DEBRIEF_UPDATE_CARD_EVIDENCE = "Evidence";
export const DEBRIEF_UPDATE_CARD_CONFIDENCE = "Classification";
/** @deprecated Use DEBRIEF_UPDATE_CARD_CONFIDENCE — displays Referenced / Learning / Confirmed. */
export const DEBRIEF_UPDATE_CARD_LEGACY_CONFIDENCE = "Confidence";
export const DEBRIEF_UPDATE_CARD_UPDATE = "Goes to";

/** @deprecated Use DEBRIEF_UPDATE_CARD_LEARNED */
export const DEBRIEF_UPDATE_CARD_WHAT_WE_LEARNED = DEBRIEF_UPDATE_CARD_LEARNED;
/** @deprecated Use DEBRIEF_UPDATE_CARD_EVIDENCE */
export const DEBRIEF_UPDATE_CARD_WHERE_FROM = DEBRIEF_UPDATE_CARD_EVIDENCE;
export const DEBRIEF_UPDATE_CARD_WHAT_WILL_UPDATE = DEBRIEF_UPDATE_CARD_UPDATE;

const TECHNICAL_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bprovider_office\b/gi, "Provider office"],
  [/\bprovider-linked\b/gi, "Provider office team"],
  [/\bshared_workflow\b/gi, "Shared scheduling between office and hospital"],
  [/\bdeployment readiness\b/gi, "Ready for field evaluation"],
  [/\breadiness signals?\b/gi, "Field readiness notes"],
  [/\bevaluation readiness\b/gi, "Evaluation interest"],
  [/\boperational intelligence\b/gi, "Field notes"],
  [/\boperational signals?\b/gi, "Field updates"],
  [/\bpathway impact\b/gi, "Account progress"],
  [/\bpartially mapped\b/gi, ""],
  [/\borganization intelligence\b/gi, "Facility notes"],
  [/\bcredentialing_required\b/gi, "Credentialing required"],
  [/\bdiscussed_only\b/gi, ""],
];

export const REP_FRIENDLY_CATEGORY_LABELS: Record<DebriefIntelligenceCategory, string> = {
  access_intelligence: "Observation & access",
  relationship_intelligence: "Relationship",
  clinical_focus: "Clinical focus",
  workflow_intelligence: "OR workflow",
  product_fit_signals: "Product fit",
  competitive_intelligence: "Competitive landscape",
  people_contacts: "People & contacts",
  next_steps: "Follow-up",
};

export function repFriendlyCategoryLabel(category: DebriefIntelligenceCategory): string {
  return REP_FRIENDLY_CATEGORY_LABELS[category] ?? DEBRIEF_INTELLIGENCE_CATEGORY_LABELS[category];
}

export function sanitizeRepFriendlyCopy(text: string, maxLen = 280): string {
  let t = stripStoredIntelligenceEncoding(String(text ?? "").trim());
  for (const [re, replacement] of TECHNICAL_PHRASE_REPLACEMENTS) {
    t = t.replace(re, replacement);
  }
  return sanitizeDebriefUserCopy(t, maxLen);
}

function repFriendlyDedupKey(line: string): string {
  return line
    .toLowerCase()
    .replace(/[.!?…]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function repFriendlyIntelligenceFieldName(dbKey: string, fallbackLabel?: string): string {
  const raw = fallbackLabel?.trim() || fieldLabelForDbKey(dbKey);
  const cleaned = sanitizeRepFriendlyCopy(raw, 80);
  if (!cleaned) return "Field update";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function formatIntelligenceUpdateLine(
  category: DebriefIntelligenceCategory,
  dbKey: string,
  fieldLabel?: string,
): string {
  return repFriendlyUpdateLabelForDbKey(dbKey, fieldLabel) || repFriendlyUpdateLabelForCategory(category);
}

export function repFriendlyFieldTargetLabel(dbKey: string, fallbackLabel?: string): string {
  return repFriendlyUpdateLabelForDbKey(dbKey, fallbackLabel);
}

export function repFriendlyWhatWeLearnedFromItem(item: DebriefIntelligenceUpdateItem): string {
  const pathwayClass = classifyDebriefPathwaySignal({ item, groupId: item.primaryCategory });
  const body = debriefCardBody({ item, pathwayClass });
  const value = formatDebriefFieldValueForDisplay(item.field.dbKey, item.proposedValue, { maxLen: 220 });
  return sanitizeRepFriendlyCopy(body || value || item.extractedStatement, 240);
}

export function repFriendlyWhatWeLearnedFromContact(contact: DebriefProposedContactItem): string {
  return sanitizeRepFriendlyCopy(debriefContactCardPrompt(contact).replace(/\?$/g, ""), 200);
}

export function repFriendlyWhatWillUpdateForFields(
  fields: LogUpdateRoutedFieldUpdate[],
): string {
  if (fields.length === 0) return "Provider profile";
  const labels = fields.map((f) => repFriendlyFieldTargetLabel(f.dbKey, f.label));
  const unique = [...new Set(labels)];
  return unique.length === 1 ? unique[0]! : unique.join(" · ");
}

export type RepFriendlySuggestedUpdate = {
  id: string;
  category: DebriefIntelligenceCategory;
  /** Plain-English takeaway (not the raw dictation quote). */
  learned: string;
  /** Verbatim quote from original dictation, including surrounding quotes. */
  evidenceQuote: string;
  /** When multiple facts support one card, show each anchored quote. */
  evidenceQuotes?: string[];
  confidence: "High" | "Medium" | "Low";
  intelligenceMaturity: ExtractedIntelligenceMaturity;
  intelligenceMaturityLabel: string;
  /** e.g. Access Intelligence → Credentialing Required */
  updateLine: string;
  whatWillUpdate?: string;
  fieldUpdateIds: string[];
  contactId?: string;
  platformId?: string;
};

export type RepFriendlyUpdatesByCategory = {
  category: DebriefIntelligenceCategory;
  label: string;
  updates: RepFriendlySuggestedUpdate[];
};

export { buildDebriefReviewSections, intelligenceItemToRepFriendlyUpdate } from "@/lib/surgical-sales/buildDebriefReviewSections";

export function buildDebriefKeyTakeaways(input: {
  review: LogUpdateParseResult;
  extraction: DebriefIntelligenceExtractionReview;
  insightGroups?: DebriefReviewInsightGroup[];
  operationalCards?: MergedOperationalReviewCard[];
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const line = formatKeyTakeawayLine(raw);
    if (!line || line.length < 12) return;
    const key = repFriendlyDedupKey(line);
    if (seen.has(key)) return;
    seen.add(key);
    if (lines.length < 8) lines.push(line);
  };

  for (const line of input.extraction.executiveBriefing?.keyTakeawayLines ?? []) {
    add(line);
  }

  const summary = input.extraction.summary?.trim() || input.review.aiMapping?.summary?.trim();
  if (summary && lines.length < 3) add(summary);

  for (const group of input.insightGroups ?? []) {
    if (group.keyInsightLine.trim()) add(group.keyInsightLine);
  }

  for (const card of input.operationalCards ?? []) {
    if (card.summary.trim()) add(card.summary);
  }

  if (lines.length === 0) {
    for (const item of input.extraction.intelligenceUpdates.slice(0, 4)) {
      add(repFriendlyWhatWeLearnedFromItem(item));
    }
  }

  return lines;
}

export function buildDebriefRecommendedNextSteps(input: {
  review: LogUpdateParseResult;
  extraction?: DebriefIntelligenceExtractionReview;
  followUp: DebriefReviewFollowUpGroups;
  state?: ProviderOperationalState | null;
  insightGroups?: DebriefReviewInsightGroup[];
  proposedContacts?: DebriefProposedContactItem[];
  operationalCards?: MergedOperationalReviewCard[];
}): string[] {
  const pipeline = input.extraction?.pipeline;
  const acceptedFacts = pipeline
    ? acceptedClassifiedFacts(pipeline.pass2_classifiedFacts, pipeline.pass3_rules)
    : [];

  const fromPipeline = buildConcreteDebriefNextSteps({
    dictation: input.review.sourceText,
    rules: pipeline?.pass3_rules,
    acceptedFacts,
    proposedContacts: input.proposedContacts ?? input.extraction?.proposedContacts,
    unresolvedItems: [
      ...input.followUp.required,
      ...input.followUp.helpful,
      ...(input.extraction?.unresolvedItems ?? []),
      ...(input.operationalCards ?? []).flatMap((c) => c.stillNeededItems),
    ],
    aiRecommendedMoves: input.review.aiMapping?.recommended_next_moves
      ?.map((m) => m.action?.trim())
      .filter((a): a is string => Boolean(a)),
  });

  if (fromPipeline.length > 0) return fromPipeline;

  const fallback = deriveTouchCapturedRecommendedNextMove({
    state: input.state ?? undefined,
    parse: input.review,
    proposedContacts: input.proposedContacts,
    insightGroups: input.insightGroups,
  });
  if (!fallback) return [];

  return buildConcreteDebriefNextSteps({
    dictation: input.review.sourceText,
    proposedContacts: input.proposedContacts,
    aiRecommendedMoves: [fallback],
  });
}

function pipelineIntelligenceUpdates(
  extraction: DebriefIntelligenceExtractionReview,
  includeItemIds?: Set<string>,
): RepFriendlySuggestedUpdate[] {
  const items = buildDebriefReviewSections(extraction).intelligenceCaptured;
  return items.filter((u) => !includeItemIds || includeItemIds.has(u.id));
}

export function buildRepFriendlySuggestedUpdates(input: {
  extraction: DebriefIntelligenceExtractionReview;
  review: LogUpdateParseResult;
  proposedContacts: DebriefProposedContactItem[];
  includeItemIds?: Set<string>;
}): RepFriendlyUpdatesByCategory[] {
  if ((input.review.atomicFacts ?? input.extraction.atomicFacts ?? []).length > 0) {
    return [];
  }

  const pipelineUpdates = pipelineIntelligenceUpdates(input.extraction, input.includeItemIds);
  if (pipelineUpdates.length > 0) {
    return [
      {
        category: "access_intelligence",
        label: "Intelligence Captured",
        updates: pipelineUpdates,
      },
    ];
  }

  const byCategory = new Map<DebriefIntelligenceCategory, RepFriendlySuggestedUpdate[]>();

  const dictation = input.review.sourceText.trim();

  const push = (category: DebriefIntelligenceCategory, update: RepFriendlySuggestedUpdate) => {
    if (!update.evidenceQuote.trim()) return;
    if (input.includeItemIds && !input.includeItemIds.has(update.id)) return;
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(update);
  };

  for (const item of input.extraction.intelligenceUpdates) {
    if (input.includeItemIds && !input.includeItemIds.has(item.id)) continue;
    const evidenceQuote = resolveIntelligenceItemDictationEvidence({ item, review: input.review });
    if (!evidenceQuote) continue;

    const confidence: RepFriendlySuggestedUpdate["confidence"] =
      item.confidenceLabel === "High"
        ? "High"
        : item.confidenceLabel === "Low"
          ? "Low"
          : "Medium";

    const intelligenceMaturity = classifyIntelligenceUpdateItemMaturity(item);
    push(item.primaryCategory, {
      id: item.id,
      category: item.primaryCategory,
      learned: repFriendlyWhatWeLearnedFromItem(item),
      evidenceQuote,
      confidence,
      intelligenceMaturity,
      intelligenceMaturityLabel: extractedIntelligenceMaturityLabel(intelligenceMaturity),
      updateLine: formatIntelligenceUpdateLine(
        item.primaryCategory,
        item.field.dbKey,
        item.intelligenceFieldLabel,
      ),
      whatWillUpdate: formatIntelligenceUpdateLine(
        item.primaryCategory,
        item.field.dbKey,
        item.intelligenceFieldLabel,
      ),
      fieldUpdateIds: [item.id],
    });
  }

  for (const contact of input.proposedContacts) {
    if (contact.disposition === "skipped") continue;
    if (input.includeItemIds && !input.includeItemIds.has(contact.id)) continue;
    const evidenceQuote = resolveContactDictationEvidence({
      dictation,
      sourceQuote: contact.sourceQuote,
      displayName: contact.displayName,
      roleLabel: contact.roleLabel,
    });
    if (!evidenceQuote) continue;

    const scheduling =
      contact.workflowResponsibilityId === "observation_scheduling_owner" ||
      /schedul/i.test(contact.roleLabel);
    const fieldName =
      contact.mentionLevel === "workflow_participant"
        ? "Workflow participant"
        : scheduling
          ? "Scheduling contact"
          : "Support contact";

    const contactMaturity = classifyProposedContactMaturity(contact);
    push("people_contacts", {
      id: contact.id,
      category: "people_contacts",
      learned: repFriendlyWhatWeLearnedFromContact(contact),
      evidenceQuote,
      confidence: contact.contactDetailsMissing ? "Medium" : "High",
      intelligenceMaturity: contactMaturity,
      intelligenceMaturityLabel: extractedIntelligenceMaturityLabel(contactMaturity),
      updateLine: repFriendlyUpdateLabelForCategory("people_contacts"),
      whatWillUpdate: repFriendlyUpdateLabelForCategory("people_contacts"),
      fieldUpdateIds: [],
      contactId: contact.id,
    });
  }

  if (repIndicatesCredentialingPlatformUnknown(dictation)) {
    const evidenceQuote = dictation.match(
      /[^.!?]*\b(?:credential|platform|vendor)\b[^.!?]*[.!?]?/i,
    )?.[0];
    if (evidenceQuote?.trim()) {
      const unknownMaturity = classifyExtractedIntelligenceMaturity({
        text: "Vendor credentialing is required; credentialing platform is Unknown on file.",
        signalKind: "interest_signal",
        confidence: "Medium",
      });
      push("access_intelligence", {
        id: "platform-unknown",
        category: "access_intelligence",
        learned: sanitizeRepFriendlyCopy(
          "Vendor credentialing is required; credentialing platform is Unknown on file.",
          160,
        ),
        evidenceQuote: evidenceQuote.trim().slice(0, 300),
        confidence: "Medium",
        intelligenceMaturity: unknownMaturity,
        intelligenceMaturityLabel: extractedIntelligenceMaturityLabel(unknownMaturity),
        updateLine: repFriendlyUpdateLabelForCategory("access_intelligence"),
        whatWillUpdate: repFriendlyUpdateLabelForCategory("access_intelligence"),
        fieldUpdateIds: [],
        platformId: "platform-unknown",
      });
    }
  }

  for (const platform of input.extraction.platformMatches) {
    if (input.includeItemIds && !input.includeItemIds.has(platform.id)) continue;
    const label = platform.matchedPlatformName ?? platform.mentionedName;
    const evidenceQuote = resolvePlatformDictationEvidence({
      dictation,
      sourceQuote: platform.sourceQuote,
      platformName: label,
    });
    if (!evidenceQuote) continue;

    const platformMaturity = classifyExtractedIntelligenceMaturity({
      text: `Vendor credentialing goes through ${label}.`,
      signalKind: "confirmed_fact",
      confidence:
        platform.confidenceTier === "high_confidence"
          ? "High"
          : platform.confidenceTier === "needs_review"
            ? "Medium"
            : "Low",
    });
    push("access_intelligence", {
      id: platform.id,
      category: "access_intelligence",
      learned: sanitizeRepFriendlyCopy(`Vendor credentialing goes through ${label}.`, 160),
      evidenceQuote,
      confidence:
        platform.confidenceTier === "high_confidence"
          ? "High"
          : platform.confidenceTier === "needs_review"
            ? "Medium"
            : "Low",
      intelligenceMaturity: platformMaturity,
      intelligenceMaturityLabel: extractedIntelligenceMaturityLabel(platformMaturity),
      updateLine: repFriendlyUpdateLabelForCategory("access_intelligence"),
      whatWillUpdate: repFriendlyUpdateLabelForCategory("access_intelligence"),
      fieldUpdateIds: [],
      platformId: platform.id,
    });
  }

  const order: DebriefIntelligenceCategory[] = [
    "access_intelligence",
    "people_contacts",
    "next_steps",
    "relationship_intelligence",
    "clinical_focus",
    "workflow_intelligence",
    "product_fit_signals",
    "competitive_intelligence",
  ];

  return order
    .filter((cat) => (byCategory.get(cat)?.length ?? 0) > 0)
    .map((category) => ({
      category,
      label: repFriendlyCategoryLabel(category),
      updates: byCategory.get(category)!,
    }));
}
