import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import type { ObservationMissionBriefingPillarId } from "@/lib/surgical-sales/buildObservationMissionBriefing";
import {
  formatObservationWatchItemLabel,
  observationWatchItemsFromCaseRow,
  type ObservationWatchItem,
} from "@/lib/surgical-sales/observationWatchItems";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";

export type ObservationMissionIntelCardCategory =
  | "watch_target"
  | "learning_gap"
  | "opportunity";

export type ObservationMissionIntelCardStatus = "watch" | "validate" | "confirmed" | "hypothesis";

export type ObservationMissionIntelCardConfidence = "low" | "partial" | "strong";

export type ObservationMissionIntelCardSource =
  | "provider_intel"
  | "case_plan"
  | "mission_template"
  | "validation_target"
  | "captured_signal";

export type ObservationMissionIntelligenceCard = {
  id: string;
  title: string;
  detail: string | null;
  category: ObservationMissionIntelCardCategory;
  status: ObservationMissionIntelCardStatus;
  confidence: ObservationMissionIntelCardConfidence;
  source: ObservationMissionIntelCardSource;
  sourceLabel: string;
  pillarId?: ObservationMissionBriefingPillarId;
};

type IntelSlot = {
  id: string;
  title: string;
  match: RegExp;
  providerDbKeys: string[];
};

const INTEL_SLOTS: IntelSlot[] = [
  {
    id: "pain_points",
    title: "Pain points to watch",
    match: /pain|frustration|gap|dissatisfaction|clinical/i,
    providerDbKeys: [
      "provider_workflow_pain_points",
      "provider_clinical_frustrations",
      "provider_product_gaps",
      "provider_dissatisfaction_areas",
    ],
  },
  {
    id: "product_usage",
    title: "Current product usage",
    match: /product usage|products used|current product|utilization|current vendor|preference card/i,
    providerDbKeys: ["provider_current_vendors", "provider_preference_card_signals"],
  },
  {
    id: "workflow_friction",
    title: "Workflow friction",
    match: /workflow|bottleneck|friction|fixation|visualization|workaround|consistency|technique/i,
    providerDbKeys: ["provider_workflow_pain_points", "provider_technique_preferences", "provider_technique_detail"],
  },
  {
    id: "staff_behavior",
    title: "Staff behavior",
    match: /staff|team dynamic|workaround|or team|nursing/i,
    providerDbKeys: ["provider_or_team_dynamics", "provider_staff_frustrations"],
  },
  {
    id: "competitor_presence",
    title: "Competitor presence",
    match: /competitor|competitive|vendor tray|legacy mesh|rival/i,
    providerDbKeys: ["provider_competitive_products", "provider_current_vendors"],
  },
];

export const OBSERVATION_MISSION_INTEL_STATUS_LABELS: Record<ObservationMissionIntelCardStatus, string> = {
  watch: "Watch",
  validate: "Validate",
  confirmed: "Confirmed",
  hypothesis: "Hypothesis",
};

export const OBSERVATION_MISSION_INTEL_CONFIDENCE_LABELS: Record<
  ObservationMissionIntelCardConfidence,
  string
> = {
  low: "Low",
  partial: "Partial",
  strong: "Strong",
};

const SOURCE_LABELS: Record<ObservationMissionIntelCardSource, string> = {
  provider_intel: "Provider intel",
  case_plan: "Case plan",
  mission_template: "Mission template",
  validation_target: "Validation target",
  captured_signal: "Captured signal",
};

function providerFieldText(
  contact: Record<string, unknown> | null | undefined,
  dbKey: string,
): string | null {
  if (!contact) return null;
  return formatRepIntelligenceFieldValue(dbKey, contact[dbKey] as string | null | undefined);
}

function resolveProviderDetail(
  contact: Record<string, unknown> | null | undefined,
  dbKeys: string[],
  snapshot?: ProviderIntelligenceSnapshot | null,
): string | null {
  for (const dbKey of dbKeys) {
    const text = providerFieldText(contact, dbKey);
    if (text) return text;
  }
  if (snapshot?.competitive_products && dbKeys.includes("provider_competitive_products")) {
    return snapshot.competitive_products.trim() || null;
  }
  if (snapshot?.technique_preferences && dbKeys.some((key) => key.includes("technique"))) {
    return snapshot.technique_preferences.trim() || null;
  }
  return null;
}

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase();
}

function slotForLabel(label: string): IntelSlot | null {
  const normalized = normalizeMatchText(label);

  if (/staff|nursing|or team|team dynamic/i.test(normalized)) {
    return INTEL_SLOTS.find((slot) => slot.id === "staff_behavior") ?? null;
  }
  if (/competitor|competitive|rival/i.test(normalized)) {
    return INTEL_SLOTS.find((slot) => slot.id === "competitor_presence") ?? null;
  }
  if (/product usage|products used|current product|utilization|preference card/i.test(normalized)) {
    return INTEL_SLOTS.find((slot) => slot.id === "product_usage") ?? null;
  }
  if (/pain|frustration|gap|dissatisfaction|clinical/i.test(normalized)) {
    return INTEL_SLOTS.find((slot) => slot.id === "pain_points") ?? null;
  }

  return INTEL_SLOTS.find((slot) => slot.match.test(normalized) || normalized.includes(slot.id.replace("_", " "))) ?? null;
}

function watchItemSourceLabel(item: ObservationWatchItem): ObservationMissionIntelCardSource {
  if (item.source === "provider_signal") return "provider_intel";
  if (item.source === "procedural_context") return "case_plan";
  if (item.source === "chip") return "mission_template";
  return "validation_target";
}

function watchItemSourceDisplay(item: ObservationWatchItem): string {
  if (item.source === "provider_signal") return SOURCE_LABELS.provider_intel;
  if (item.source === "procedural_context") return SOURCE_LABELS.case_plan;
  if (item.source === "chip") return SOURCE_LABELS.mission_template;
  return SOURCE_LABELS.validation_target;
}

function truncateDetail(text: string, max = 96): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function buildSlotCard(input: {
  slot: IntelSlot;
  watchItems: ObservationWatchItem[];
  watchSignals: string[];
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
}): ObservationMissionIntelligenceCard {
  const matchingItems = input.watchItems.filter((item) => {
    const slot = slotForLabel(item.label);
    return slot?.id === input.slot.id;
  });
  const matchingSignals = input.watchSignals.filter((signal) => slotForLabel(signal)?.id === input.slot.id);
  const providerDetail = resolveProviderDetail(
    input.providerContact,
    input.slot.providerDbKeys,
    input.providerIntelligence,
  );
  const observed = matchingItems.find((item) => item.status === "observed");
  const plannedItem = matchingItems.find((item) => item.status === "planned");
  const signalDetail = matchingSignals.map((signal) => signal.replace(/^Watch:\s*/i, "").trim()).join(" · ");

  let status: ObservationMissionIntelCardStatus = "validate";
  let confidence: ObservationMissionIntelCardConfidence = "low";
  let source: ObservationMissionIntelCardSource = "mission_template";
  let sourceLabel = SOURCE_LABELS.mission_template;

  if (observed) {
    status = "confirmed";
    confidence = "strong";
    source = watchItemSourceLabel(observed);
    sourceLabel = watchItemSourceDisplay(observed);
  } else if (plannedItem) {
    status = "watch";
    confidence = providerDetail ? "partial" : "partial";
    source = watchItemSourceLabel(plannedItem);
    sourceLabel = watchItemSourceDisplay(plannedItem);
  } else if (providerDetail) {
    status = "watch";
    confidence = "partial";
    source = "provider_intel";
    sourceLabel = SOURCE_LABELS.provider_intel;
  } else if (matchingSignals.length > 0) {
    status = "watch";
    confidence = "low";
    source = "mission_template";
    sourceLabel = SOURCE_LABELS.mission_template;
  }

  const detail =
    providerDetail ||
    (plannedItem
      ? formatObservationWatchItemLabel(plannedItem.label)
      : signalDetail || null);

  return {
    id: `slot-${input.slot.id}`,
    title: input.slot.title,
    detail: detail ? truncateDetail(detail) : "Validate during observation.",
    category: "watch_target",
    status,
    confidence,
    source,
    sourceLabel,
    pillarId: "watch_signals",
  };
}

function buildCustomWatchCard(item: ObservationWatchItem): ObservationMissionIntelligenceCard | null {
  if (slotForLabel(item.label)) return null;
  const status: ObservationMissionIntelCardStatus = item.status === "observed" ? "confirmed" : "watch";
  const confidence: ObservationMissionIntelCardConfidence =
    item.status === "observed" ? "strong" : item.source === "provider_signal" ? "partial" : "low";

  return {
    id: `target-${item.id}`,
    title: formatObservationWatchItemLabel(item.label),
    detail: null,
    category: "watch_target",
    status,
    confidence,
    source: watchItemSourceLabel(item),
    sourceLabel: watchItemSourceDisplay(item),
    pillarId: "watch_signals",
  };
}

function buildLearningCard(question: string, index: number): ObservationMissionIntelligenceCard {
  const title = question.trim().endsWith("?") ? question.trim() : `${question.trim()}?`;
  return {
    id: `learn-${index}-${title.slice(0, 24)}`,
    title: truncateDetail(title, 72),
    detail: "Close this gap during observation.",
    category: "learning_gap",
    status: "validate",
    confidence: "low",
    source: "mission_template",
    sourceLabel: SOURCE_LABELS.mission_template,
    pillarId: "still_to_learn",
  };
}

function buildOpportunityCard(hypothesis: string, index: number): ObservationMissionIntelligenceCard {
  const title = hypothesis.split(/[.!?]/)[0]?.trim() || hypothesis.trim();
  return {
    id: `opp-${index}-${title.slice(0, 24)}`,
    title: truncateDetail(title, 72),
    detail: truncateDetail(hypothesis),
    category: "opportunity",
    status: "hypothesis",
    confidence: "partial",
    source: "mission_template",
    sourceLabel: SOURCE_LABELS.mission_template,
    pillarId: "opportunities",
  };
}

export function buildObservationMissionIntelligenceCards(input: {
  caseRow: Record<string, unknown>;
  watchSignals: string[];
  learningQuestions: string[];
  opportunityHypotheses: string[];
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
}): {
  watchTargets: ObservationMissionIntelligenceCard[];
  learningGaps: ObservationMissionIntelligenceCard[];
  opportunities: ObservationMissionIntelligenceCard[];
} {
  const watchItems = observationWatchItemsFromCaseRow(input.caseRow);

  const watchTargets: ObservationMissionIntelligenceCard[] = INTEL_SLOTS.map((slot) =>
    buildSlotCard({
      slot,
      watchItems,
      watchSignals: input.watchSignals,
      providerContact: input.providerContact,
      providerIntelligence: input.providerIntelligence,
    }),
  );

  for (const item of watchItems) {
    const custom = buildCustomWatchCard(item);
    if (custom) watchTargets.push(custom);
  }

  const learningGaps = input.learningQuestions.map(buildLearningCard);
  const opportunities = input.opportunityHypotheses.map(buildOpportunityCard);

  return { watchTargets, learningGaps, opportunities };
}

export function observationMissionIntelSourceLabel(source: ObservationMissionIntelCardSource): string {
  return SOURCE_LABELS[source];
}
