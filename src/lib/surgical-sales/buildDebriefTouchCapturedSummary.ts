import { contactInfoNextStepForName } from "@/lib/surgical-sales/buildConcreteDebriefNextSteps";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type {
  MergedOperationalReviewCard,
  OperationalReviewTopicId,
} from "@/lib/surgical-sales/mergeDebriefOperationalReview";
import type {
  OperationalSignal,
  ProviderOperationalState,
} from "@/lib/surgical-sales/operationalIntelligenceTypes";
import type {
  DebriefInsightGroupId,
  DebriefReviewInsightGroup,
} from "@/lib/surgical-sales/debriefReviewStreamlined";

export type TouchCapturedSummaryCategoryId = "provider" | "workflow" | "access" | "product";

export type TouchCapturedSummaryCategory = {
  id: TouchCapturedSummaryCategoryId;
  label: string;
  count: number;
  countLabel: string;
};

export type TouchCapturedReviewSummary = {
  title: string;
  totalUpdates: number;
  totalUpdatesLabel: string;
  categories: TouchCapturedSummaryCategory[];
  recommendedNextMove: string | null;
};

const TOUCH_CAPTURED_TITLE = "Touch Captured";

const CATEGORY_ORDER: TouchCapturedSummaryCategoryId[] = [
  "provider",
  "workflow",
  "access",
  "product",
];

const CATEGORY_LABELS: Record<TouchCapturedSummaryCategoryId, string> = {
  provider: "Provider",
  workflow: "Workflow",
  access: "Access",
  product: "Product",
};

const OPERATIONAL_TOPIC_TO_CATEGORY: Record<
  OperationalReviewTopicId,
  TouchCapturedSummaryCategoryId
> = {
  observation_access: "access",
  scheduling: "provider",
  credentialing: "access",
  workflow: "workflow",
  competitor_usage: "product",
  product_interest: "product",
  clinical_focus: "provider",
  evaluation: "workflow",
  relationship: "provider",
  other: "workflow",
};

const INSIGHT_GROUP_TO_CATEGORY: Record<DebriefInsightGroupId, TouchCapturedSummaryCategoryId> = {
  access_intelligence: "access",
  relationship_intelligence: "provider",
  clinical_focus: "workflow",
  workflow_intelligence: "workflow",
  product_fit_signals: "product",
  competitive_intelligence: "product",
  people_contacts: "provider",
  next_steps: "workflow",
};

function formatUpdateCount(count: number): string {
  return `${count} update${count === 1 ? "" : "s"}`;
}

function buildCategoriesFromCounts(
  counts: Map<TouchCapturedSummaryCategoryId, number>,
): TouchCapturedSummaryCategory[] {
  return CATEGORY_ORDER.filter((id) => (counts.get(id) ?? 0) > 0).map((id) => {
    const count = counts.get(id)!;
    return {
      id,
      label: CATEGORY_LABELS[id],
      count,
      countLabel: formatUpdateCount(count),
    };
  });
}

function schedulingSoftContactName(signals: OperationalSignal[]): string | null {
  const hit = signals.find(
    (s) => s.domain === "scheduling_ownership" && s.signalType === "soft_contact" && s.softContactName,
  );
  return hit?.softContactName?.trim() || null;
}

function schedulingContactFromProposed(
  proposedContacts: DebriefProposedContactItem[] | undefined,
): string | null {
  if (!proposedContacts?.length) return null;
  const hit = proposedContacts.find(
    (c) =>
      c.disposition !== "skipped" &&
      (/schedul/i.test(c.workflowLabel) ||
        /schedul/i.test(c.roleLabel) ||
        /schedul/i.test(c.contactTypeLabel)),
  );
  return hit?.displayName?.trim() || null;
}

export function deriveTouchCapturedRecommendedNextMove(input: {
  signals?: OperationalSignal[];
  state?: ProviderOperationalState;
  parse?: LogUpdateParseResult | null;
  proposedContacts?: DebriefProposedContactItem[];
  insightGroups?: DebriefReviewInsightGroup[];
}): string | null {
  const softContactName =
    schedulingSoftContactName(input.signals ?? []) ??
    schedulingContactFromProposed(input.proposedContacts);

  if (softContactName) {
    return contactInfoNextStepForName(softContactName);
  }

  const nextAction = input.state?.nextActions[0];
  if (nextAction) {
    const text = (nextAction.summary || nextAction.label).trim();
    if (text && !/^create workflow contact$/i.test(text)) return text;
  }

  const schedulingGroup = input.insightGroups?.find(
    (g) => g.id === "people_contacts" || g.id === "access_intelligence",
  );
  if (schedulingGroup?.keyInsightLine.trim()) {
    const line = schedulingGroup.keyInsightLine.trim();
    if (/contact|schedul|confirm/i.test(line)) return line;
  }

  const aiMove = input.parse?.aiMapping?.recommended_next_moves?.[0]?.action?.trim();
  if (aiMove) return aiMove;

  return null;
}

export function buildTouchCapturedSummaryFromOperationalCards(input: {
  cards: MergedOperationalReviewCard[];
  signals: OperationalSignal[];
  state: ProviderOperationalState;
  parse?: LogUpdateParseResult | null;
  proposedContacts?: DebriefProposedContactItem[];
}): TouchCapturedReviewSummary {
  const counts = new Map<TouchCapturedSummaryCategoryId, number>();
  for (const card of input.cards) {
    const categoryId = OPERATIONAL_TOPIC_TO_CATEGORY[card.topicId];
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  const totalUpdates = input.cards.length;
  const categories = buildCategoriesFromCounts(counts);

  return {
    title: TOUCH_CAPTURED_TITLE,
    totalUpdates,
    totalUpdatesLabel: `${totalUpdates} update${totalUpdates === 1 ? "" : "s"} detected`,
    categories,
    recommendedNextMove: deriveTouchCapturedRecommendedNextMove({
      signals: input.signals,
      state: input.state,
      parse: input.parse,
      proposedContacts: input.proposedContacts,
    }),
  };
}

function insightGroupHasContent(group: DebriefReviewInsightGroup): boolean {
  return (
    group.itemIds.length > 0 ||
    group.contactIds.length > 0 ||
    group.platformIds.length > 0 ||
    group.detailLines.length > 0 ||
    Boolean(group.keyInsightLine.trim())
  );
}

export function buildTouchCapturedSummaryFromInsightGroups(input: {
  insightGroups: DebriefReviewInsightGroup[];
  proposedContacts?: DebriefProposedContactItem[];
  parse?: LogUpdateParseResult | null;
}): TouchCapturedReviewSummary {
  const counts = new Map<TouchCapturedSummaryCategoryId, number>();

  for (const group of input.insightGroups) {
    if (!insightGroupHasContent(group)) continue;
    const categoryId = INSIGHT_GROUP_TO_CATEGORY[group.id];
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  const pendingContacts =
    input.proposedContacts?.filter((c) => c.disposition !== "skipped").length ?? 0;
  if (pendingContacts > 0) {
    counts.set("provider", (counts.get("provider") ?? 0) + pendingContacts);
  }

  const categories = buildCategoriesFromCounts(counts);
  const totalUpdates = categories.reduce((sum, cat) => sum + cat.count, 0);

  return {
    title: TOUCH_CAPTURED_TITLE,
    totalUpdates,
    totalUpdatesLabel: `${totalUpdates} update${totalUpdates === 1 ? "" : "s"} detected`,
    categories,
    recommendedNextMove: deriveTouchCapturedRecommendedNextMove({
      parse: input.parse,
      proposedContacts: input.proposedContacts,
      insightGroups: input.insightGroups,
    }),
  };
}
