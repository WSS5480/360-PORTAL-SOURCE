import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";

/** Canonical intro-call intelligence gathering — default when no product focus. */
export type IntroCallDiscoveryFocusId =
  | "procedural_workflow"
  | "or_efficiency"
  | "case_complexity"
  | "observation_feasibility"
  | "vendor_access"
  | "evaluation_openness"
  | "stakeholder_mapping";

export type IntroCallDiscoveryFocusArea = {
  id: IntroCallDiscoveryFocusId;
  title: string;
  description: string;
  discovery_question: string;
  talking_point: string;
  success_outcome: string;
};

export const INTRO_CALL_DISCOVERY_FOCUS_AREAS: readonly IntroCallDiscoveryFocusArea[] = [
  {
    id: "procedural_workflow",
    title: "Procedural workflow",
    description: "How cases run today — volume drivers, sequence, and technique habits.",
    discovery_question: "Which procedures drive the highest volume, and how does your standard workflow run today?",
    talking_point: "Highest-volume procedures and standard workflow sequence",
    success_outcome: "Clear picture of procedural workflow and case mix",
  },
  {
    id: "or_efficiency",
    title: "OR efficiency",
    description: "Where time, coordination, or turnover creates friction in the OR.",
    discovery_question: "Where do OR workflow inefficiencies show up most often in your practice?",
    talking_point: "OR workflow inefficiencies and coordination friction",
    success_outcome: "Identified where OR workflow inefficiencies exist",
  },
  {
    id: "case_complexity",
    title: "Case complexity",
    description: "Variation in technique, standardization, and operational difficulty across cases.",
    discovery_question:
      "How standardized are technique and supply choices across your cases, and where does complexity add friction?",
    talking_point: "Procedural standardization and case complexity across the program",
    success_outcome: "Understood procedural complexity and standardization gaps",
  },
  {
    id: "observation_feasibility",
    title: "Observation feasibility",
    description: "Whether the surgeon is open to observation and which cases could host it.",
    discovery_question: "Which procedures would you be comfortable having us observe?",
    talking_point: "Whether observation is realistic and which case types fit",
    success_outcome: "Named 1–2 case types the surgeon would allow for observation",
  },
  {
    id: "vendor_access",
    title: "Observation focus",
    description: "What the surgeon wants noticed during observation — workflow, technique, friction.",
    discovery_question: "What would you want us to pay attention to if we watched one of your cases?",
    talking_point: "What to watch for during observation and what matters in their workflow",
    success_outcome: "Clear observation focus areas from the surgeon's perspective",
  },
  {
    id: "evaluation_openness",
    title: "Evaluation openness",
    description: "What would need to be true before a workflow comparison or trial.",
    discovery_question:
      "What would need to be true before you would consider evaluating a new workflow or product?",
    talking_point: "Evaluation openness and what would trigger a future trial",
    success_outcome: "Gauge of evaluation openness and trial triggers",
  },
  {
    id: "stakeholder_mapping",
    title: "Stakeholder mapping",
    description: "Who influences workflow, supplies, and access beyond the surgeon.",
    discovery_question: "Who beyond you influences technique, workflow, or supply decisions on your cases?",
    talking_point: "Stakeholders who influence workflow and supply decisions",
    success_outcome: "Mapped stakeholders who influence workflow decisions",
  },
] as const;

export const INTRO_CALL_DISCOVERY_FOCUS_LEAD =
  "Use these discovery focus areas to structure intelligence gathering — not product positioning.";

export const INTRO_CALL_DISCOVERY_FOCUS_SUB =
  "Work through workflow, observation appetite, and evaluation fit before aligning to a product line.";

export type IntroCallDiscoveryFocusView = {
  title: string;
  lead: string;
  sub: string;
  areas: readonly IntroCallDiscoveryFocusArea[];
};

export function buildIntroCallDiscoveryFocusView(): IntroCallDiscoveryFocusView {
  return {
    title: "Discovery focus",
    lead: INTRO_CALL_DISCOVERY_FOCUS_LEAD,
    sub: INTRO_CALL_DISCOVERY_FOCUS_SUB,
    areas: INTRO_CALL_DISCOVERY_FOCUS_AREAS,
  };
}

/** Intro Call prep uses discovery focus at low specialization tier only. */
export function shouldUseIntroCallDiscoveryFocus(input: {
  engagementType: string;
  prepSpecializationTier?: PreparationSpecializationTier;
}): boolean {
  if (normalizeEngagementType(input.engagementType) !== "intro_call") {
    return false;
  }
  return (input.prepSpecializationTier ?? "low") === "low";
}

export function resolveIntroCallDiscoveryFocusView(input: {
  engagementType: string;
  prepSpecializationTier?: PreparationSpecializationTier;
}): IntroCallDiscoveryFocusView | null {
  return shouldUseIntroCallDiscoveryFocus(input) ? buildIntroCallDiscoveryFocusView() : null;
}

/** Derived pools for rule engines — keep discovery prep aligned to focus areas. */
export const INTRO_CALL_DISCOVERY_CORE: string[] = INTRO_CALL_DISCOVERY_FOCUS_AREAS.map(
  (a) => a.discovery_question,
);

export const INTRO_CALL_TALKING_DISCOVERY_FOCUS: string[] = INTRO_CALL_DISCOVERY_FOCUS_AREAS.map(
  (a) => a.talking_point,
);

export const INTRO_CALL_SUCCESS_OUTCOMES_DISCOVERY_FOCUS: readonly string[] =
  INTRO_CALL_DISCOVERY_FOCUS_AREAS.map((a) => a.success_outcome);

export const INTRO_CALL_DISCOVERY_FOCUS_TITLES: readonly string[] =
  INTRO_CALL_DISCOVERY_FOCUS_AREAS.map((a) => a.title);
