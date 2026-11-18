import { MVP_ENGAGEMENT_TYPES, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

/** Persisted engagement category — unchanged for API compatibility. */
export type EngagementMissionGroupId =
  | "observation_discovery"
  | "product_evaluation"
  | "relationship_management";

/** Browse tab on the New Engagement screen. */
export type EngagementMissionBrowseCategoryId = "discover" | "observe" | "advance" | "support";

export type EngagementMissionCard = {
  type: EngagementType;
  name: string;
  description: string;
  purpose: string;
  workflowCreated: string;
  quickAddNote: string;
  planFirstSteps: string[];
  icon: string;
  browseCategory: EngagementMissionBrowseCategoryId;
};

export type EngagementMissionBrowseCategory = {
  id: EngagementMissionBrowseCategoryId;
  label: string;
  cards: EngagementMissionCard[];
};

const ENGAGEMENT_MISSION_CARDS: EngagementMissionCard[] = [
  {
    type: "intro_call",
    name: "Intro Call",
    description: "Start the relationship and map workflow.",
    purpose:
      "Start the relationship, map surgical workflow, and identify the path to OR observation access.",
    workflowCreated: "Discovery Brief",
    quickAddNote: "Creates an Intro Call engagement without a discovery briefing.",
    planFirstSteps: ["Relationship Context", "Workflow Mapping", "Access Path", "Discovery Brief"],
    icon: "◎",
    browseCategory: "discover",
  },
  {
    type: "provider_debrief",
    name: "Observation Debrief",
    description: "Prepare a provider conversation from observation intelligence.",
    purpose:
      "Prepare a provider conversation using intelligence gathered from prior observations.",
    workflowCreated: "Debrief Field Briefing",
    quickAddNote: "Creates the debrief engagement without generating a briefing.",
    planFirstSteps: [
      "What We Know",
      "What We Need To Learn",
      "Questions To Ask",
      "Desired Outcome",
    ],
    icon: "◈",
    browseCategory: "observe",
  },
  {
    type: "product_demo",
    name: "Product Demo",
    description: "Run a focused hands-on product evaluation.",
    purpose:
      "Run a focused hands-on evaluation tied to defined criteria, decision makers, and next steps.",
    workflowCreated: "Evaluation Brief",
    quickAddNote: "Creates a Product Demo engagement without an evaluation briefing.",
    planFirstSteps: ["Evaluation Criteria", "Demo Setup", "Hands-On Focus", "Success Signals", "Evaluation Brief"],
    icon: "◇",
    browseCategory: "advance",
  },
  {
    type: "office_visit_360",
    name: "360 Experience",
    description: "Structured hands-on evaluation before committing OR cases.",
    purpose:
      "Run a structured 360 Medical experience to test product fit in sim lab, demo, or provider office settings.",
    workflowCreated: "360 Experience Brief",
    quickAddNote: "Creates a 360 Experience engagement without generating a briefing.",
    planFirstSteps: [
      "Experience Objectives",
      "Sim Lab / Demo Focus",
      "Hands-On Goals",
      "Success Signals",
      "360 Experience Brief",
    ],
    icon: "◉",
    browseCategory: "advance",
  },
  {
    type: "in_service_training",
    name: "Training",
    description: "Coach staff on setup, technique, or workflow.",
    purpose:
      "Coach staff on product setup, surgical technique, or workflow integration during a training touch.",
    workflowCreated: "Training Touchpoint Plan",
    quickAddNote: "Creates a training engagement without a touchpoint plan.",
    planFirstSteps: ["Training Objectives", "Audience & Setup", "Coaching Points", "Follow-Up Items", "Training Touchpoint Plan"],
    icon: "▣",
    browseCategory: "advance",
  },
  {
    type: "follow_up",
    name: "Follow-Up",
    description: "Continue a thread with a clear next move.",
    purpose: "Continue an open thread with a clear next move, owner, and timing.",
    workflowCreated: "Follow-Up Plan",
    quickAddNote: "Creates a follow-up engagement without a follow-up plan.",
    planFirstSteps: ["Last Touch Recap", "Open Items", "Next Move", "Follow-Up Plan"],
    icon: "→",
    browseCategory: "support",
  },
  {
    type: "reactivation",
    name: "Reactivation",
    description: "Re-engage a quiet provider or account.",
    purpose: "Re-engage a quiet provider or account with a credible reason to reconnect.",
    workflowCreated: "Reactivation Plan",
    quickAddNote: "Creates a reactivation engagement without a reactivation plan.",
    planFirstSteps: ["Dormancy Context", "Re-Engage Hook", "Talking Points", "Reactivation Plan"],
    icon: "↻",
    browseCategory: "support",
  },
];

export const ENGAGEMENT_MISSION_BROWSE_CATEGORIES: EngagementMissionBrowseCategory[] = (
  ["discover", "observe", "advance", "support"] as const
).map((id) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
  cards: ENGAGEMENT_MISSION_CARDS.filter((card) => card.browseCategory === id),
}));

/** @deprecated Use ENGAGEMENT_MISSION_BROWSE_CATEGORIES */
export const ENGAGEMENT_TYPE_MISSION_GROUPS = ENGAGEMENT_MISSION_BROWSE_CATEGORIES;

const MISSION_CARD_BY_TYPE = new Map<EngagementType, EngagementMissionCard>(
  ENGAGEMENT_MISSION_CARDS.map((card) => [card.type, card]),
);

const PERSISTENCE_CATEGORY_BY_TYPE = new Map<EngagementType, EngagementMissionGroupId>([
  ["intro_call", "observation_discovery"],
  ["observation_request", "observation_discovery"],
  ["or_visit", "observation_discovery"],
  ["provider_debrief", "observation_discovery"],
  ["product_demo", "product_evaluation"],
  ["in_service_training", "product_evaluation"],
  ["peer_discussion", "product_evaluation"],
  ["post_case_follow_up", "product_evaluation"],
  ["follow_up", "relationship_management"],
  ["reactivation", "relationship_management"],
  ["office_visit_360", "product_evaluation"],
]);

export function engagementCategoryForType(type: string | null | undefined): EngagementMissionGroupId | null {
  const key = String(type ?? "").trim() as EngagementType;
  if (!key) return null;
  return PERSISTENCE_CATEGORY_BY_TYPE.get(key) ?? null;
}

export function engagementMissionCardForType(
  type: string | null | undefined,
): EngagementMissionCard | null {
  const key = String(type ?? "").trim() as EngagementType;
  if (!key) return null;
  return MISSION_CARD_BY_TYPE.get(key) ?? null;
}

export function browseCategoryForEngagementType(
  type: string | null | undefined,
): EngagementMissionBrowseCategoryId | null {
  const card = engagementMissionCardForType(type);
  return card?.browseCategory ?? null;
}

export function assertEngagementMissionPickerCoverage(): void {
  const listed = ENGAGEMENT_MISSION_CARDS.map((card) => card.type);
  const expected = [...MVP_ENGAGEMENT_TYPES];
  const listedSet = new Set<string>(listed);
  const expectedSet = new Set<string>(expected);
  const missing = expected.filter((t) => !listedSet.has(t));
  const extra = listed.filter((t) => !expectedSet.has(t));
  if (missing.length || extra.length || listed.length !== expected.length) {
    throw new Error(
      `Engagement mission picker mismatch — missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}`,
    );
  }
  for (const card of MISSION_CARD_BY_TYPE.values()) {
    if (!card.purpose.trim() || !card.quickAddNote.trim() || card.planFirstSteps.length < 2) {
      throw new Error(`Engagement mission preview incomplete for ${card.type}`);
    }
  }
}
