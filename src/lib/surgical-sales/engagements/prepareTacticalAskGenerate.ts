import { TACTICAL_ASK_POOL_BY_STAKEHOLDER } from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import {
  isSimilarProbeLine,
} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";
import type { TacticalAskGenerateCategory } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import type { PrepareTacticalAsk } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";

const WORKFLOW_POOL = [
  "Which high-volume procedure workflow should we understand first — and where is the friction?",
  "What fixation or closure sequence do you standardize on today?",
  "Which case types would you consider for a workflow trial first?",
  "Where do tacks, sutures, or tray steps add the most time in the OR?",
  "What would need to improve to justify evaluating an alternative workflow?",
];

const ACCESS_POOL = [...TACTICAL_ASK_POOL_BY_STAKEHOLDER.scheduler_office];

const PRODUCT_EVALUATION_POOL = [
  "What metrics would prove OR time neutrality to you in a trial?",
  "What would need to improve to justify evaluating an alternative approach?",
  "Who besides you influences mesh, fixation, or product selection?",
  "What heal-rate or documentation does your committee require before adoption?",
  "What payer mix drives product restrictions in your practice?",
];

const ECONOMIC_BUYER_POOL = [
  "Who owns budget approval for a workflow change — you, service line, or value analysis?",
  "What does purchasing need to see in a sterile-field comparison?",
  "Which value committee or NP review gates new products?",
  "What cost-per-case threshold would block adoption?",
  "Who signs off on trial inventory and consignment?",
];

const CATEGORY_POOLS: Record<TacticalAskGenerateCategory, string[]> = {
  workflow: WORKFLOW_POOL,
  access: ACCESS_POOL,
  product_evaluation: PRODUCT_EVALUATION_POOL,
  economic_buyer: ECONOMIC_BUYER_POOL,
};

const WORKFLOW_TOPIC_PATTERN =
  /workflow|procedure|fixation|closure|hernia|mesh|volume|sequence|habit|friction|bottleneck|OR\b|operative/i;

const ACCESS_TOPIC_PATTERN = /access|credential|committee|observation|vendor|scheduling|OR visit/i;

const PRODUCT_TOPIC_PATTERN = /trial|evaluate|metric|product|mesh|adopt|committee|payer|graft/i;

const ECONOMIC_TOPIC_PATTERN = /budget|purchasing|value|cost|approval|NP|committee|sign.?off/i;

export function pickGeneratedTacticalAsk(
  category: TacticalAskGenerateCategory,
  existingAsks: PrepareTacticalAsk[],
  prepare: PrepareForMeetingView,
): string | null {
  const existingTexts = existingAsks.map((a) => a.text);
  const talking = prepare.suggested_talking_points.points;

  const fromTalking = talking.filter((p) => matchesCategory(p, category));
  const pool = [...fromTalking, ...CATEGORY_POOLS[category]];

  for (const candidate of pool) {
    const c = candidate.trim();
    if (!c) continue;
    if (existingTexts.some((e) => isSimilarProbeLine(e, c))) continue;
    return c;
  }
  return null;
}

function matchesCategory(text: string, category: TacticalAskGenerateCategory): boolean {
  switch (category) {
    case "workflow":
      return WORKFLOW_TOPIC_PATTERN.test(text);
    case "access":
      return ACCESS_TOPIC_PATTERN.test(text);
    case "product_evaluation":
      return PRODUCT_TOPIC_PATTERN.test(text);
    case "economic_buyer":
      return ECONOMIC_TOPIC_PATTERN.test(text);
    default:
      return false;
  }
}
