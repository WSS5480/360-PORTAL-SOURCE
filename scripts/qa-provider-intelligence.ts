import assert from "node:assert/strict";
import { buildQuickSignalCaptureTarget } from "../src/app/portal/sales/providers/[providerId]/ProviderQuickSignalCaptureDrawer";
import { buildIntelligenceWorkspaceSummary } from "../src/lib/surgical-sales/buildIntelligenceWorkspaceSummary";
import { buildProviderNextDiscoveryPriorities } from "../src/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import {
  isIntelligenceSectionVisibleForCommercialStage,
  resolveProviderCommercialWorkflowStage,
} from "../src/lib/surgical-sales/providerCommercialWorkflowStage";
import { PROVIDER_INTELLIGENCE_SECTION_LABELS } from "../src/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildIntelligenceLearningGaps } from "../src/lib/surgical-sales/providerIntelligenceLearningGaps";
import { intelligenceGapStateLabel } from "../src/lib/surgical-sales/providerIntelligenceGapVocabulary";
import {
  PROGRESSIVE_DISCOVERY_PROMPTS,
  buildProgressiveCaptureSteps,
} from "../src/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import { buildProviderIntelligenceStatusCards } from "../src/lib/surgical-sales/providerIntelligenceStatusCards";
import { buildProviderPlanningCompletion } from "../src/lib/surgical-sales/providerPlanningCompletion";

const contact = { provider_relationship_stage: "prospect" };
const planning = buildProviderPlanningCompletion(contact);

const cards = buildProviderIntelligenceStatusCards(contact, planning);
assert.equal(cards.length, 4);
for (const c of cards) {
  assert.ok(c.title);
  assert.ok(c.confidenceLabel);
}

const gaps = buildIntelligenceLearningGaps(contact, planning, 12);
const priorities = buildProviderNextDiscoveryPriorities({
  contact,
  planning,
  relationshipStage: "prospect",
});
const gapPhrases = new Set(gaps.map((g) => g.phrase.toLowerCase()));
for (const p of priorities) {
  const headline = p.headline.toLowerCase();
  assert.ok(!gapPhrases.has(headline), `duplicate headline: ${p.dbKey}`);
  const gapLabel = intelligenceGapStateLabel(p.dbKey, "unknown").toLowerCase();
  assert.notEqual(headline, gapLabel, `gap equals coaching: ${p.dbKey}`);
}

const ws = buildIntelligenceWorkspaceSummary({ contact, planning, relationshipStage: "prospect" });
assert.ok(ws);
assert.ok(ws!.commercialBrief.length < 40);
assert.equal(ws!.statusCards.length, 4);
assert.equal(ws!.discoveryActionsVisibleCount, 3);

const stage = resolveProviderCommercialWorkflowStage({ relationshipStage: "prospect" });
assert.equal(stage, "early_discovery");
const sections = [
  "clinical_workflow",
  "or_environment",
  "relationship_intelligence",
  "commercial_signals",
  "observation_readiness",
] as const;
const visible = sections.filter((id) => isIntelligenceSectionVisibleForCommercialStage(id, stage));
assert.deepEqual([...visible].sort(), ["clinical_workflow", "observation_readiness"].sort());

assert.match(PROVIDER_INTELLIGENCE_SECTION_LABELS.clinical_workflow, /operate clinically/);
assert.match(PROVIDER_INTELLIGENCE_SECTION_LABELS.observation_readiness, /observe/);

assert.match(
  PROGRESSIVE_DISCOVERY_PROMPTS.provider_observation_coordinator_contact.prompt,
  /controls OR observation access/i,
);
assert.ok(PROGRESSIVE_DISCOVERY_PROMPTS.provider_observation_coordinator_contact.whyItMatters);

const target = buildQuickSignalCaptureTarget(
  "observation_readiness",
  "provider_observation_feasibility",
  contact,
  planning,
);
assert.equal(target?.dbKey, "provider_observation_feasibility");

assert.ok(buildProgressiveCaptureSteps("observation_readiness", contact).length >= 1);

console.log(
  "QA_OK",
  JSON.stringify({
    cards: cards.map((c) => ({ id: c.id, confidence: c.confidenceLabel })),
    priorityTop: priorities.slice(0, 3).map((p) => p.headline),
    earlyDiscoveryVisible: visible,
  }),
);
