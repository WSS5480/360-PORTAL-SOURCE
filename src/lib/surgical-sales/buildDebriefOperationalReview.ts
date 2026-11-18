import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import {
  buildProviderOperationalState,
  mapDebriefNarrativeToOperationalSignals,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";
import {
  buildTouchCapturedSummaryFromOperationalCards,
  type TouchCapturedReviewSummary,
} from "@/lib/surgical-sales/buildDebriefTouchCapturedSummary";
import {
  buildMergedOperationalReviewCards,
  OPERATIONAL_REVIEW_TOPIC_LABELS,
  type MergedOperationalReviewCard,
  type OperationalReviewTopicId,
} from "@/lib/surgical-sales/mergeDebriefOperationalReview";

export type DebriefOperationalReviewCard = MergedOperationalReviewCard;

export type DebriefOperationalReviewSection = {
  topicId: OperationalReviewTopicId;
  title: string;
  cards: DebriefOperationalReviewCard[];
};

export type DebriefOperationalReviewSummary = {
  headline: string;
  detailLine: string;
  signalCount: number;
  blockerCount: number;
  softContactCount: number;
  nextFieldMoveCount: number;
};

export type DebriefOperationalReview = {
  summary: DebriefOperationalReviewSummary;
  touchCapturedSummary: TouchCapturedReviewSummary;
  sections: DebriefOperationalReviewSection[];
  applyButtonLabel: string;
};

export function buildDebriefOperationalReview(input: {
  providerId: string;
  narrative: string;
  parse?: LogUpdateParseResult | null;
  contact?: Record<string, unknown>;
  gateInput?: PathwayGateInput;
  sourceLabel?: string;
}): DebriefOperationalReview {
  const contact = input.contact ?? {};
  const signals = mapDebriefNarrativeToOperationalSignals({
    providerId: input.providerId,
    narrative: input.narrative,
    parse: input.parse ?? null,
    sourceLabel: input.sourceLabel,
  });

  const state = buildProviderOperationalState({
    providerId: input.providerId,
    contact,
    gateInput: input.gateInput ?? { contact },
    pendingDebrief: { narrative: input.narrative, parse: input.parse, sourceLabel: input.sourceLabel },
  });

  const mergedCards = buildMergedOperationalReviewCards({
    signals,
    state,
    parse: input.parse ?? null,
  });

  const displaySignals = signals;

  const sections: DebriefOperationalReviewSection[] = mergedCards.map((card) => ({
    topicId: card.topicId,
    title: OPERATIONAL_REVIEW_TOPIC_LABELS[card.topicId],
    cards: [card],
  }));

  const signalCount = displaySignals.filter((s) =>
    ["evidence", "early_signal", "confirmed_fact"].includes(s.signalType),
  ).length;
  const blockerCount = displaySignals.filter((s) => s.signalType === "blocker").length;
  const softContactCount = displaySignals.filter((s) => s.signalType === "soft_contact").length;
  const nextFieldMoveCount = state.nextActions.length;

  const headline =
    signalCount === 0
      ? "No operational signals identified yet"
      : `${signalCount} operational signal${signalCount === 1 ? "" : "s"} identified`;

  const parts: string[] = [headline];
  if (blockerCount > 0) parts.push(`${blockerCount} blocker${blockerCount === 1 ? "" : "s"}`);
  if (softContactCount > 0) {
    parts.push(`${softContactCount} workflow contact lead${softContactCount === 1 ? "" : "s"}`);
  }
  if (nextFieldMoveCount > 0) {
    parts.push(`${nextFieldMoveCount} next field move${nextFieldMoveCount === 1 ? "" : "s"}`);
  }

  const touchCapturedSummary = buildTouchCapturedSummaryFromOperationalCards({
    cards: mergedCards,
    signals,
    state,
    parse: input.parse ?? null,
  });

  return {
    summary: {
      headline: parts[0]!,
      detailLine: parts.slice(1).join(" · "),
      signalCount,
      blockerCount,
      softContactCount,
      nextFieldMoveCount,
    },
    touchCapturedSummary,
    sections,
    applyButtonLabel: "Apply All",
  };
}

export function flattenDebriefOperationalReviewText(review: DebriefOperationalReview): string {
  return [
    review.summary.headline,
    ...review.sections.flatMap((s) =>
      s.cards.flatMap((c) => [
        c.label,
        c.statusLabel,
        c.summary,
        ...c.stillNeededItems,
        c.primaryAction,
        c.evidence.sourceQuote,
        c.evidence.reasoning,
      ]),
    ),
  ]
    .filter(Boolean)
    .join("\n");
}
