/**
 * Merge operational debrief signals into one review card per topic.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { ProviderOperationalState } from "@/lib/surgical-sales/operationalIntelligenceTypes";
import type {
  OperationalIntelligenceDomain,
  OperationalSignal,
  OperationalSignalStatus,
} from "@/lib/surgical-sales/operationalIntelligenceTypes";
import { sanitizeOperationalUserText } from "@/lib/surgical-sales/operationalIntelligenceEngine";
import {
  buildStructuredEvidenceForTopic,
  type DebriefStructuredEvidence,
} from "@/lib/surgical-sales/debriefReviewStructuredEvidence";

export const OPERATIONAL_REVIEW_TOPICS = [
  "observation_access",
  "scheduling",
  "credentialing",
  "workflow",
  "competitor_usage",
  "product_interest",
  "clinical_focus",
  "evaluation",
  "relationship",
  "other",
] as const;

export type OperationalReviewTopicId = (typeof OPERATIONAL_REVIEW_TOPICS)[number];

export const OPERATIONAL_REVIEW_TOPIC_LABELS: Record<OperationalReviewTopicId, string> = {
  observation_access: "Observation access",
  scheduling: "Scheduling pathway",
  credentialing: "Credentialing",
  workflow: "Workflow",
  competitor_usage: "Competitor usage",
  product_interest: "Product interest",
  clinical_focus: "Clinical focus",
  evaluation: "Evaluation interest",
  relationship: "Relationship",
  other: "Field intelligence",
};

export const OPERATIONAL_REVIEW_TOPIC_ORDER: OperationalReviewTopicId[] = [
  "observation_access",
  "scheduling",
  "credentialing",
  "workflow",
  "competitor_usage",
  "product_interest",
  "clinical_focus",
  "evaluation",
  "relationship",
  "other",
];

export type MergedOperationalReviewCard = {
  signalId: string;
  topicId: OperationalReviewTopicId;
  label: string;
  statusLabel: string | null;
  summary: string;
  stillNeededItems: string[];
  primaryAction: string | null;
  fieldUpdateIds: string[];
  /** @deprecated Use fieldUpdateIds */
  fieldUpdateId: string | null;
  evidence: DebriefStructuredEvidence;
};

const STATUS_DISPLAY: Record<OperationalSignalStatus, string> = {
  unknown: "Unknown",
  partial: "Partial",
  likely: "Likely",
  confirmed: "Confirmed",
  blocked: "Declined on file",
  conditional: "Conditional",
};

const TOPIC_DOMAINS: Record<OperationalReviewTopicId, OperationalIntelligenceDomain[]> = {
  observation_access: ["access_readiness", "observation_readiness"],
  scheduling: ["scheduling_ownership"],
  credentialing: ["credentialing"],
  workflow: ["case_commitment"],
  competitor_usage: ["product_interest"],
  product_interest: ["product_interest"],
  clinical_focus: ["clinical_fit"],
  evaluation: ["evaluation_readiness"],
  relationship: ["relationship"],
  other: ["outcomes"],
};

function topicForSignal(signal: OperationalSignal): OperationalReviewTopicId {
  const haystack = `${signal.label} ${signal.summary} ${signal.dbKey ?? ""} ${signal.evidenceText ?? ""}`;
  if (signal.domain === "scheduling_ownership") return "scheduling";
  if (signal.domain === "credentialing") return "credentialing";
  if (signal.domain === "access_readiness" || signal.domain === "observation_readiness") {
    return "observation_access";
  }
  if (signal.domain === "clinical_fit") return "clinical_focus";
  if (signal.domain === "evaluation_readiness") return "evaluation";
  if (signal.domain === "relationship") return "relationship";
  if (signal.domain === "case_commitment") return "workflow";
  if (signal.domain === "product_interest") {
    if (/competitor|competitive|incumbent/i.test(haystack)) return "competitor_usage";
    return "product_interest";
  }
  return "other";
}

function statusRank(status: OperationalSignalStatus): number {
  switch (status) {
    case "blocked":
      return 0;
    case "partial":
    case "unknown":
      return 1;
    case "conditional":
    case "likely":
      return 2;
    case "confirmed":
      return 3;
    default:
      return 4;
  }
}

function mergedStatusLabel(signals: OperationalSignal[]): string | null {
  if (signals.length === 0) return null;
  const worst = [...signals].sort((a, b) => statusRank(a.status) - statusRank(b.status))[0]!;
  return STATUS_DISPLAY[worst.status] ?? null;
}

function normalizeStillNeeded(line: string): string {
  return line
    .trim()
    .replace(/\.$/, "")
    .replace(/^still needed:\s*/i, "")
    .replace(/^capture\s+/i, "Contact information")
    .replace(/^confirm\s+whether\s+/i, "Authority confirmation for ")
    .trim();
}

function addStillNeeded(target: Set<string>, raw: string | null | undefined) {
  const line = normalizeStillNeeded(String(raw ?? ""));
  if (!line) return;
  const lower = line.toLowerCase();
  if (lower.includes("contact detail") || lower.includes("contact info")) {
    return;
  }
  if (lower.includes("authority") || lower.includes("office vs hospital")) {
    target.add("Confirm whether the provider office or hospital controls final scheduling approval.");
    return;
  }
  if (lower.includes("approval") && lower.includes("observation")) {
    target.add("Confirm who officially approves vendor observation access.");
    return;
  }
  if (lower.includes("platform") || lower.includes("credentialing step")) {
    target.add("Confirm which credentialing platform is required.");
    return;
  }
  target.add(line.charAt(0).toUpperCase() + line.slice(1));
}

function buildMergedSummary(topicId: OperationalReviewTopicId, signals: OperationalSignal[]): string {
  const softContact = signals.find((s) => s.signalType === "soft_contact" && s.softContactName);
  if (topicId === "scheduling" && softContact?.softContactName) {
    const name = softContact.softContactName;
    return `${name} mentioned as scheduling contact.`;
  }

  const evidence =
    signals.find((s) => s.signalType === "evidence") ??
    signals.find((s) => s.signalType === "early_signal") ??
    signals.find((s) => s.signalType === "confirmed_fact");

  if (evidence?.summary) return sanitizeOperationalUserText(evidence.summary);

  const fallback = signals.find((s) => s.summary.trim())?.summary;
  return fallback ? sanitizeOperationalUserText(fallback) : "";
}

function collectStillNeededItems(
  topicId: OperationalReviewTopicId,
  signals: OperationalSignal[],
  state: ProviderOperationalState,
): string[] {
  const items = new Set<string>();

  for (const signal of signals) {
    if (signal.signalType === "soft_contact") addStillNeeded(items, "Contact information");
    if (signal.signalType === "next_step" && /contact|workflow/i.test(signal.label)) {
      addStillNeeded(items, "Contact information");
    }
    if (signal.signalType === "blocker") addStillNeeded(items, signal.summary);
    if (signal.signalType === "next_step") {
      const summary = signal.summary.trim();
      if (summary && !/capture .* contact details/i.test(summary)) {
        addStillNeeded(items, summary);
      }
    }
  }

  if (topicId === "scheduling" && signals.some((s) => s.status === "partial")) {
    addStillNeeded(
      items,
      "Confirm whether the provider office or hospital controls final scheduling approval.",
    );
  }

  if (topicId === "observation_access") {
    if (signals.some((s) => s.signalType === "blocker" && /approv/i.test(s.summary))) {
      addStillNeeded(items, "Confirm who officially approves vendor observation access.");
    } else if (signals.some((s) => s.status === "partial")) {
      addStillNeeded(items, "Confirm who officially approves vendor observation access.");
    }
  }

  if (topicId === "credentialing" && signals.length > 0) {
    addStillNeeded(items, "Confirm which credentialing platform is required.");
  }

  for (const domain of TOPIC_DOMAINS[topicId]) {
    const readiness = state.readinessByDomain[domain];
    if (readiness?.blockReason) addStillNeeded(items, readiness.blockReason);
  }

  return [...items];
}

function fieldUpdateIdForDbKey(parse: LogUpdateParseResult | null | undefined, dbKey: string | undefined): string | null {
  if (!parse || !dbKey) return null;
  return parse.fieldUpdates.find((f) => f.dbKey === dbKey)?.id ?? null;
}

function fieldUpdateIdsForTopic(
  topicId: OperationalReviewTopicId,
  signals: OperationalSignal[],
  parse?: LogUpdateParseResult | null,
): string[] {
  const ids = new Set<string>();
  for (const signal of signals) {
    const id = fieldUpdateIdForDbKey(parse, signal.dbKey);
    if (id) ids.add(id);
  }

  if (!parse) return [...ids];

  const domainKeys = new Set(TOPIC_DOMAINS[topicId]);
  const topicDbPatterns: Partial<Record<OperationalReviewTopicId, RegExp>> = {
    scheduling: /scheduling|coordinator_contact|scheduling_contact/i,
    credentialing: /credential|platform/i,
    observation_access: /access|feasibility|observation/i,
    clinical_focus: /procedure|technique|clinical|workflow|pain/i,
    product_interest: /product|preference|acsis/i,
    competitor_usage: /competitor|competitive/i,
    workflow: /workflow|case_volume|volume/i,
  };
  const pattern = topicDbPatterns[topicId];
  if (pattern) {
    for (const field of parse.fieldUpdates) {
      if (pattern.test(field.dbKey)) ids.add(field.id);
    }
  }

  for (const field of parse.fieldUpdates) {
    const fromField = signals.find((s) => s.dbKey === field.dbKey);
    if (fromField && domainKeys.has(fromField.domain)) ids.add(field.id);
  }

  return [...ids];
}

function primaryActionForMergedCard(topicId: OperationalReviewTopicId, signals: OperationalSignal[]): string | null {
  if (signals.some((s) => s.signalType === "soft_contact")) return "Create workflow contact";
  const next = signals.find((s) => s.signalType === "next_step");
  if (next && topicId !== "scheduling") return next.label;
  return null;
}

function pickPrimarySignal(signals: OperationalSignal[]): OperationalSignal | null {
  const order: OperationalSignal["signalType"][] = [
    "evidence",
    "early_signal",
    "confirmed_fact",
    "soft_contact",
    "blocker",
    "next_step",
    "dependency",
  ];
  for (const type of order) {
    const hit = signals.find((s) => s.signalType === type);
    if (hit) return hit;
  }
  return signals[0] ?? null;
}

/** Group signals by review topic. */
export function groupOperationalSignalsByTopic(
  signals: OperationalSignal[],
): Map<OperationalReviewTopicId, OperationalSignal[]> {
  const grouped = new Map<OperationalReviewTopicId, OperationalSignal[]>();
  for (const signal of signals) {
    const topicId = topicForSignal(signal);
    if (!grouped.has(topicId)) grouped.set(topicId, []);
    grouped.get(topicId)!.push(signal);
  }
  return grouped;
}

/** Merge topic signals into a single operator review card. */
export function mergeOperationalSignalsToReviewCard(input: {
  topicId: OperationalReviewTopicId;
  signals: OperationalSignal[];
  state: ProviderOperationalState;
  parse?: LogUpdateParseResult | null;
}): MergedOperationalReviewCard {
  const { topicId, signals, state, parse } = input;
  const primary = pickPrimarySignal(signals);
  const fieldUpdateIds = fieldUpdateIdsForTopic(topicId, signals, parse);

  return {
    signalId: `topic-${topicId}`,
    topicId,
    label: OPERATIONAL_REVIEW_TOPIC_LABELS[topicId],
    statusLabel: mergedStatusLabel(signals),
    summary: buildMergedSummary(topicId, signals),
    stillNeededItems: collectStillNeededItems(topicId, signals, state),
    primaryAction: primaryActionForMergedCard(topicId, signals),
    fieldUpdateIds,
    fieldUpdateId: fieldUpdateIds[0] ?? null,
    evidence: buildStructuredEvidenceForTopic({
      topicId,
      signals,
      parse,
      fieldUpdateIds,
      narrative: parse?.sourceText,
      primarySignal: primary,
    }),
  };
}

/** Build merged review cards in display order (one card per topic). */
export function buildMergedOperationalReviewCards(input: {
  signals: OperationalSignal[];
  state: ProviderOperationalState;
  parse?: LogUpdateParseResult | null;
}): MergedOperationalReviewCard[] {
  const grouped = groupOperationalSignalsByTopic(input.signals);
  const cards: MergedOperationalReviewCard[] = [];

  for (const topicId of OPERATIONAL_REVIEW_TOPIC_ORDER) {
    const topicSignals = grouped.get(topicId);
    if (!topicSignals?.length) continue;
    cards.push(
      mergeOperationalSignalsToReviewCard({
        topicId,
        signals: topicSignals,
        state: input.state,
        parse: input.parse,
      }),
    );
  }

  return cards;
}
