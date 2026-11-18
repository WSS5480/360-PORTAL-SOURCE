/**
 * Product knowledge accessors for Observation Debrief strategy builders.
 */

import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import { DEBRIEF_PRODUCT_KNOWLEDGE } from "./debriefProductKnowledgeCatalog";
import type {
  DebriefProductKnowledge,
  DebriefProductKnowledgeId,
  DebriefProductKnowledgeSignal,
  DebriefStrategyProductContext,
} from "./debriefProductKnowledgeTypes";

export type {
  DebriefProductKnowledge,
  DebriefProductKnowledgeId,
  DebriefProductKnowledgeSignal,
  DebriefStrategyProductContext,
} from "./debriefProductKnowledgeTypes";

export { DEBRIEF_PRODUCT_KNOWLEDGE_IDS } from "./debriefProductKnowledgeTypes";
export { DEBRIEF_PRODUCT_KNOWLEDGE } from "./debriefProductKnowledgeCatalog";

const PRODUCT_ID_ALIASES: Record<string, DebriefProductKnowledgeId> = {
  acsis: "ACSIS",
  endolumik: "Endolumik",
  biotissue: "BioTissue",
  merakris: "Merakris",
  dermacyte: "Merakris",
  telabio: "TelaBio",
  "skeletal dynamics": "Skeletal Dynamics",
  skeletaldynamics: "Skeletal Dynamics",
};

const FIT_LEVEL_RANK: Record<string, number> = {
  strong: 5,
  possible: 4,
  needs_surgeon_confirmation: 3,
  unknown: 2,
  unlikely: 1,
};

export function isDebriefProductKnowledgeId(value: string): value is DebriefProductKnowledgeId {
  return value in DEBRIEF_PRODUCT_KNOWLEDGE;
}

export function tryResolveDebriefProductKnowledgeId(
  raw: string | null | undefined,
): DebriefProductKnowledgeId | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (isDebriefProductKnowledgeId(trimmed)) return trimmed;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  if (PRODUCT_ID_ALIASES[normalized]) return PRODUCT_ID_ALIASES[normalized];

  for (const id of Object.keys(DEBRIEF_PRODUCT_KNOWLEDGE) as DebriefProductKnowledgeId[]) {
    if (normalized === id.toLowerCase()) return id;
  }

  return null;
}

export function getDebriefProductKnowledge(
  id: DebriefProductKnowledgeId,
): DebriefProductKnowledge {
  return DEBRIEF_PRODUCT_KNOWLEDGE[id];
}

export function listDebriefProductKnowledge(): DebriefProductKnowledge[] {
  return (Object.keys(DEBRIEF_PRODUCT_KNOWLEDGE) as DebriefProductKnowledgeId[]).map(
    (id) => DEBRIEF_PRODUCT_KNOWLEDGE[id],
  );
}

function rankProductSignal(signal: DebriefProductKnowledgeSignal): number {
  if (signal.product === "future_opportunity") return 0;
  const id = tryResolveDebriefProductKnowledgeId(signal.product);
  if (!id) return 0;
  return FIT_LEVEL_RANK[signal.fitLevel ?? "unknown"] ?? 2;
}

export function resolveDebriefProductKnowledgeFromSignal(
  signal: DebriefProductKnowledgeSignal | null | undefined,
): DebriefProductKnowledge | null {
  if (!signal || signal.product === "future_opportunity") return null;
  const id = tryResolveDebriefProductKnowledgeId(signal.product);
  return id ? getDebriefProductKnowledge(id) : null;
}

export function buildDebriefStrategyProductContext(input: {
  productSignals: DebriefProductKnowledgeSignal[];
}): DebriefStrategyProductContext {
  const sorted = [...input.productSignals]
    .filter((signal) => signal.product !== "future_opportunity")
    .sort((a, b) => rankProductSignal(b) - rankProductSignal(a));

  const seen = new Set<DebriefProductKnowledgeId>();
  const candidates: DebriefProductKnowledge[] = [];

  for (const signal of sorted) {
    const knowledge = resolveDebriefProductKnowledgeFromSignal(signal);
    if (!knowledge || seen.has(knowledge.id)) continue;
    seen.add(knowledge.id);
    candidates.push(knowledge);
  }

  const primary = candidates[0] ?? null;

  return {
    primaryProductId: primary?.id ?? null,
    primary,
    candidates,
  };
}

export function buildDebriefStrategyProductContextFromPlan(
  plan: ProviderDebriefPlan,
): DebriefStrategyProductContext {
  return buildDebriefStrategyProductContext({
    productSignals: plan.productOpportunityAssessment.map((assessment) => ({
      product: assessment.product,
      fitLevel: assessment.fitLevel,
    })),
  });
}
