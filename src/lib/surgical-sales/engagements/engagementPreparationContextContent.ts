import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import { hasExplicitPrepProductFocus } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import {
  INTRO_CALL_DISCOVERY_FOCUS_LEAD,
  INTRO_CALL_DISCOVERY_FOCUS_SUB,
  INTRO_CALL_DISCOVERY_FOCUS_TITLES,
  type IntroCallDiscoveryFocusView,
  buildIntroCallDiscoveryFocusView,
  resolveIntroCallDiscoveryFocusView,
} from "@/lib/surgical-sales/engagements/introCallDiscoveryFocus";
import {
  INTRO_CALL_PREP_INTRO_LEAD,
  INTRO_CALL_PREP_INTRO_SUB,
  INTRO_CALL_SUCCESS_OUTCOMES,
  INTRO_CALL_SUCCESS_OUTCOMES_LEAD,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";

export type { IntroCallDiscoveryFocusView };
export { resolveIntroCallDiscoveryFocusView, buildIntroCallDiscoveryFocusView };

/** Shown on Intro Call prep when no product, opportunity, or case focus is linked yet. */
export const WORKFLOW_FOCUSED_PREP_HINT_LEAD =
  "Preparation is in workflow discovery mode — no product focus selected.";

export const WORKFLOW_FOCUSED_PREP_HINT_SUB =
  "Choose an optional product focus below to unlock procedure-specific guidance, or keep discovery broad.";

export type WorkflowFocusedPrepHint = {
  lead: string;
  sub: string;
};

export function resolveWorkflowFocusedPrepHint(input: {
  engagementType: string;
  productLine?: string | null;
  opportunityProductLine?: string | null;
  opportunityId?: string | null;
  caseId?: string | null;
  prepSpecializationTier?: import("@/lib/surgical-sales/engagements/engagementPreparationSpecialization").PreparationSpecializationTier;
}): WorkflowFocusedPrepHint | null {
  if (normalizeEngagementType(input.engagementType) !== "intro_call") {
    return null;
  }
  if (input.prepSpecializationTier && input.prepSpecializationTier !== "low") {
    return null;
  }
  if (hasExplicitPrepProductFocus(input.productLine)) {
    return null;
  }
  if (String(input.caseId ?? "").trim()) {
    return null;
  }
  return {
    lead: WORKFLOW_FOCUSED_PREP_HINT_LEAD,
    sub: WORKFLOW_FOCUSED_PREP_HINT_SUB,
  };
}

export type PreparationContextView = {
  state: EngagementPreparationContextState;
  label: string;
  summary: string;
  focus_areas: string[];
  intro_lead: string;
  intro_sub: string;
  success_outcomes_lead: string;
  success_outcomes: readonly string[];
  /** Present when intro call has no product focus — structured discovery gathering */
  discovery_focus: IntroCallDiscoveryFocusView | null;
};

const CONTEXT_META: Record<
  EngagementPreparationContextState,
  Pick<PreparationContextView, "label" | "summary" | "focus_areas" | "intro_lead" | "intro_sub" | "success_outcomes_lead" | "success_outcomes">
> = {
  discovery: {
    label: "Discovery focus",
    summary: "Structured intelligence gathering — workflow, access, and evaluation fit before product alignment.",
    focus_areas: [...INTRO_CALL_DISCOVERY_FOCUS_TITLES],
    intro_lead: INTRO_CALL_DISCOVERY_FOCUS_LEAD,
    intro_sub: INTRO_CALL_DISCOVERY_FOCUS_SUB,
    success_outcomes_lead: "Establish whether this provider is worth deeper commercialization investment.",
    success_outcomes: INTRO_CALL_SUCCESS_OUTCOMES,
  },
  product_exploration: {
    label: "Product Exploration",
    summary: "Evaluate workflow alignment and procedural fit for the selected product focus.",
    focus_areas: [
      "Workflow alignment",
      "Procedural fit",
      "Evaluation openness",
      "Observation candidacy",
    ],
    intro_lead:
      "This preparation is designed to evaluate whether the selected product focus aligns with how this provider runs cases today.",
    intro_sub:
      "Use suggestions to test procedural fit, workflow friction, and evaluation readiness — refine only what matters for this interaction.",
    success_outcomes_lead: "Confirm product-specific workflow fit before advancing to evaluation or observation.",
    success_outcomes: [
      "Clear understanding of product-relevant procedural workflow",
      "Identified procedures where observation or evaluation could start",
      "Established next engagement path with product context",
      "Determined whether formal evaluation is realistic",
      "Captured workflow intelligence tied to the product focus",
      "Aligned with procedural stakeholders on fit criteria",
    ],
  },
  evaluation_planning: {
    label: "Evaluation Planning",
    summary: "Target procedures, conversion path, and OR support for an active opportunity.",
    focus_areas: [
      "Procedure targeting",
      "Workflow conversion planning",
      "OR support preparation",
      "Evaluation case criteria",
    ],
    intro_lead:
      "This preparation supports evaluation planning — align procedure targets, workflow conversion, and OR support before the next case.",
    intro_sub:
      "Use suggestions to lock evaluation case profile, stakeholders, and logistics — customize only what this opportunity requires.",
    success_outcomes_lead: "Leave with a concrete evaluation pathway, not open-ended discovery.",
    success_outcomes: [
      "Agreed evaluation case profile and procedure target",
      "Documented workflow conversion requirements",
      "OR support and observation logistics confirmed",
      "Purchasing or committee path understood",
      "Timeline for first evaluation case established",
      "Barriers to adoption identified before case day",
    ],
  },
  observation_support: {
    label: "Observation / Support",
    summary: "Active case or field support — logistics, execution, and adoption barriers.",
    focus_areas: [
      "Support logistics",
      "Procedural execution",
      "Adoption barriers",
      "Case debrief planning",
    ],
    intro_lead:
      "This preparation focuses on active case or field support — confirm logistics, execution needs, and what must happen after the interaction.",
    intro_sub:
      "Use suggestions to align support timing, sterile-field rules, and adoption blockers — keep notes execution-oriented.",
    success_outcomes_lead: "Support the active case path and remove barriers to the next adoption step.",
    success_outcomes: [
      "Support logistics confirmed for the active case or visit",
      "Procedural execution expectations aligned with the team",
      "Adoption barriers surfaced with owners",
      "Debrief or follow-up step scheduled",
      "Preference card or supply path updated if needed",
      "Next case or expansion criteria documented",
    ],
  },
};

export function buildPreparationContextView(
  state: EngagementPreparationContextState,
  options?: { discoveryFocus?: IntroCallDiscoveryFocusView | null },
): PreparationContextView {
  const meta = CONTEXT_META[state];
  return {
    state,
    ...meta,
    discovery_focus: state === "discovery" ? (options?.discoveryFocus ?? null) : null,
  };
}

/** State-specific discovery overlays (prepended after core questions) */
export const PREP_CONTEXT_DISCOVERY: Partial<Record<EngagementPreparationContextState, string[]>> = {
  product_exploration: [
    "Where does the current workflow align or conflict with this product focus?",
    "What would need to improve operationally to justify a formal evaluation?",
  ],
  evaluation_planning: [
    "Which procedure profile is the best fit for the first evaluation case?",
    "What must be true in workflow for the pilot case to run on schedule?",
    "Who must approve the evaluation case and supply path before case day?",
  ],
  observation_support: [
    "What support is needed for the active case or scheduled observation?",
    "What sterile-field or documentation rules must reps follow in the room?",
    "What adoption barrier is most likely to stall the next case?",
  ],
};

export const PREP_CONTEXT_TALKING: Partial<Record<EngagementPreparationContextState, string[]>> = {
  product_exploration: [
    "Product-relevant workflow steps and where friction appears",
    "Criteria the team would use to judge evaluation readiness",
  ],
  evaluation_planning: [
    "Evaluation case profile and block or coordinator timing",
    "Workflow conversion steps required before case one",
    "Purchasing or committee evidence needed for case approval",
  ],
  observation_support: [
    "Active case logistics and in-room support boundaries",
    "Tray, supply, or documentation needs for case execution",
    "Post-case debrief attendees and adoption decision path",
  ],
};

export const PREP_CONTEXT_OBSERVATION_GOALS: Partial<Record<EngagementPreparationContextState, string[]>> = {
  evaluation_planning: [
    "Confirm evaluation case type, date window, and in-room focus areas",
    "Document workflow conversion steps required before case one runs",
  ],
  observation_support: [
    "Align support timing with block, tray, and sterile-field requirements",
    "Capture adoption barriers that could stall the next case or expansion",
  ],
};

export const PREP_CONTEXT_OBSERVATION_LEAD: Partial<Record<EngagementPreparationContextState, string>> = {
  discovery:
    "Use this call to qualify whether OR observation is realistic and what must be true before scheduling.",
  product_exploration:
    "Confirm which procedures fit the selected product focus and whether observation access is realistic.",
  evaluation_planning:
    "Align observation or evaluation case timing with workflow conversion requirements before case one.",
  observation_support:
    "Confirm support logistics, in-room boundaries, and adoption barriers for the active case path.",
};

export const PREP_CONTEXT_COMMERCIALIZATION: Partial<
  Record<EngagementPreparationContextState, { key: string; pathway: "observable" | "evaluatable" | "adoptable"; text: string }>
> = {
  evaluation_planning: {
    key: "eval_case",
    pathway: "evaluatable",
    text: "Evaluation case criteria — procedure target and workflow conversion path",
  },
  observation_support: {
    key: "case_support",
    pathway: "adoptable",
    text: "Active case support — logistics, execution, and post-case adoption path",
  },
};
