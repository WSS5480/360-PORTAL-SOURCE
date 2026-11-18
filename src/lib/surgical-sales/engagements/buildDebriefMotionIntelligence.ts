/**
 * Extracts motion intelligence (prior debrief, intro call, contact/scheduling)
 * from strategy context for conversation plan and advancement path enrichment.
 */

import type { EvidenceAttribution } from "@/lib/surgical-sales/engagements/commercialEvidenceAttribution";
import type {
  DebriefMotionCoachingUse,
  DebriefMotionIntelligenceBundle,
  DebriefMotionIntelligenceItem,
  DebriefMotionIntelligenceKind,
} from "@/lib/surgical-sales/engagements/debriefMotionIntelligenceTypes";
import type { AiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";
import type { ProviderIntelligenceFact } from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";

const CONTACT_SCHEDULING_FIELD_KEYS = new Set([
  "provider_observation_access_path",
  "provider_or_team_dynamics",
  "provider_observation_credentialing_needed",
  "provider_observation_feasibility",
]);

const PRIOR_DEBRIEF_COMMITMENT_PATTERN =
  /\b(confirm|follow up|follow-up|commit|next case|defer|revisit|validate)\b/i;

function formatSourceDate(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const iso = trimmed.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function sourceLabelForKind(kind: DebriefMotionIntelligenceKind): string {
  switch (kind) {
    case "prior_provider_debrief":
      return "Provider Debrief";
    case "intro_call":
      return "Intro Call";
    case "contact_scheduling":
      return "Contact profile";
  }
}

function coachingUseForPriorDebrief(fact: ProviderIntelligenceFact): DebriefMotionCoachingUse {
  if (PRIOR_DEBRIEF_COMMITMENT_PATTERN.test(fact.excerpt)) return "commitment";
  if (fact.fieldKey === "pre_observation_probes" || fact.fieldKey === "pre_observation_value_hypothesis") {
    return "continuity";
  }
  return "continuity";
}

function coachingUseForContactField(fieldKey: string | null): DebriefMotionCoachingUse {
  if (fieldKey === "provider_or_team_dynamics") return "stakeholder";
  if (fieldKey === "provider_observation_access_path") return "access";
  return "scheduling";
}

function factToMotionItem(
  fact: ProviderIntelligenceFact,
  kind: DebriefMotionIntelligenceKind,
  coachingUse: DebriefMotionCoachingUse,
): DebriefMotionIntelligenceItem {
  return {
    kind,
    sourceLabel: sourceLabelForKind(kind),
    date: formatSourceDate(fact.date),
    excerpt: fact.excerpt.trim(),
    coachingUse,
    engagementId: fact.sourceEngagementId,
    fieldKey: fact.fieldKey,
  };
}

function dedupeMotionItems(items: DebriefMotionIntelligenceItem[]): DebriefMotionIntelligenceItem[] {
  const seen = new Set<string>();
  const result: DebriefMotionIntelligenceItem[] = [];

  for (const item of items) {
    const key = `${item.kind}:${item.excerpt.slice(0, 80).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function introSummaryToItem(input: {
  snapshotSummary: string;
  updatedAt: string | null;
  engagementId: string | null;
}): DebriefMotionIntelligenceItem | null {
  const excerpt = input.snapshotSummary.trim();
  if (!excerpt) return null;

  const scheduling = /\b(schedul|karen|coordinator|access|credential)\b/i.test(excerpt);

  return {
    kind: "intro_call",
    sourceLabel: sourceLabelForKind("intro_call"),
    date: formatSourceDate(input.updatedAt),
    excerpt,
    coachingUse: scheduling ? "scheduling" : "stakeholder",
    engagementId: input.engagementId,
    fieldKey: "intro_call.summary",
  };
}

export function buildDebriefMotionIntelligenceFromContext(
  context: AiDebriefStrategyBuilderContext,
): DebriefMotionIntelligenceBundle {
  const timeline = context.intelligenceAggregator.timeline;
  const currentEngagementId = context.engagementId;

  const priorDebriefFacts = timeline.filter(
    (fact) =>
      fact.sourceType === "provider_debrief" &&
      fact.sourceEngagementId !== currentEngagementId,
  );

  const priorDebrief = dedupeMotionItems(
    priorDebriefFacts.map((fact) =>
      factToMotionItem(fact, "prior_provider_debrief", coachingUseForPriorDebrief(fact)),
    ),
  ).slice(0, 4);

  const introCallFacts = timeline.filter((fact) => fact.sourceType === "intro_call");
  const introItems = dedupeMotionItems(
    introCallFacts.map((fact) => {
      const scheduling =
        fact.category === "access" ||
        /\b(schedul|karen|coordinator|access)\b/i.test(fact.excerpt);
      return factToMotionItem(
        fact,
        "intro_call",
        scheduling ? "scheduling" : fact.category === "relationship" ? "stakeholder" : "continuity",
      );
    }),
  );

  const introSummary = context.providerIntelligence.introCallSummary;
  if (introSummary?.snapshotSummary) {
    const summaryItem = introSummaryToItem({
      snapshotSummary: introSummary.snapshotSummary,
      updatedAt: introSummary.updatedAt,
      engagementId: introSummary.engagementId,
    });
    if (summaryItem && !introItems.some((item) => item.excerpt === summaryItem.excerpt)) {
      introItems.unshift(summaryItem);
    }
  }

  const contactScheduling = dedupeMotionItems(
    timeline
      .filter(
        (fact) =>
          fact.sourceType === "discovery_contact" &&
          (fact.category === "access" ||
            fact.category === "relationship" ||
            (fact.fieldKey != null && CONTACT_SCHEDULING_FIELD_KEYS.has(fact.fieldKey))),
      )
      .map((fact) =>
        factToMotionItem(
          fact,
          "contact_scheduling",
          coachingUseForContactField(fact.fieldKey),
        ),
      ),
  ).slice(0, 4);

  return {
    priorDebrief,
    introCall: introItems.slice(0, 4),
    contactScheduling,
  };
}

export function motionItemToAttribution(
  item: DebriefMotionIntelligenceItem,
): EvidenceAttribution {
  const kind =
    item.kind === "prior_provider_debrief"
      ? "prior_provider_debrief"
      : item.kind === "intro_call"
        ? "intro_call_intel"
        : "contact_scheduling";

  return {
    kind,
    label: item.date ? `${item.sourceLabel} (${item.date})` : item.sourceLabel,
    excerpt: item.excerpt,
    observationIndex: null,
    caseId: null,
    fieldKey: item.fieldKey,
    confidence: item.kind === "intro_call" ? "medium" : "high",
  };
}

export function buildMotionIntelligenceReferences(
  bundle: DebriefMotionIntelligenceBundle,
): Array<{ text: string; attributions: EvidenceAttribution[] }> {
  const references: Array<{ text: string; attributions: EvidenceAttribution[] }> = [];

  for (const item of bundle.priorDebrief) {
    const prefix =
      item.coachingUse === "commitment" ? "Prior debrief commitment" : "Prior debrief context";
    references.push({
      text: `${prefix}: ${item.excerpt}`,
      attributions: [motionItemToAttribution(item)],
    });
  }

  for (const item of bundle.introCall) {
    references.push({
      text: item.excerpt,
      attributions: [motionItemToAttribution(item)],
    });
  }

  for (const item of bundle.contactScheduling) {
    references.push({
      text: item.excerpt,
      attributions: [motionItemToAttribution(item)],
    });
  }

  return references.slice(0, 8);
}
