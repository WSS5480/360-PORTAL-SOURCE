import type { EngagementWorkflowFieldKey } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { EngagementWorkflowMode } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import {
  isOfficeVisitEngagement,
  workflowFieldConfigsForMode,
} from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import {
  DEPLOYMENT_RISK_LABEL,
  FIELD_INTEL_SECTION_LABEL,
  NEXT_STEP_OPPORTUNITY_LABEL,
  OPERATIONAL_UNKNOWNS_LABEL,
  TACTICAL_PRIORITIES_TITLE,
  TOP_ASKS_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";

export type TacticalBriefingFieldSpec = {
  key: EngagementWorkflowFieldKey;
  sublabel?: string;
  rows: number;
  placeholder?: string;
};

export type TacticalBriefingSectionSpec = {
  id: string;
  label: string;
  hint?: string;
  fields: readonly TacticalBriefingFieldSpec[];
};

/** Strategic engagements — maps 1:1 to persisted pre-call columns. */
export const STRATEGIC_TACTICAL_BRIEFING_SECTIONS: readonly TacticalBriefingSectionSpec[] = [
  {
    id: "primary_discovery_goal",
    label: TACTICAL_PRIORITIES_TITLE,
    hint: "What this visit must prove or unlock.",
    fields: [
      {
        key: "observation_goal",
        rows: 3,
        placeholder: "Specific outcome — volume, access path, dated next step…",
      },
    ],
  },
  {
    id: "opening_angle",
    label: "Opening Angle",
    hint: "How you will open and frame the conversation.",
    fields: [
      {
        key: "pre_observation_impact_opening_statement",
        rows: 2,
        placeholder: "Hook, context, and why this matters now…",
      },
    ],
  },
  {
    id: "top_asks",
    label: TOP_ASKS_LABEL,
    hint: "Discovery probes — one per line.",
    fields: [
      {
        key: "pre_observation_probes",
        rows: 4,
        placeholder: "1. …\n2. …\n3. …",
      },
    ],
  },
  {
    id: "operational_unknowns",
    label: "Operational Unknowns",
    hint: "Logistics, access, and workflow gaps to confirm on site.",
    fields: [
      {
        key: "pre_observation_tools_resources",
        rows: 2,
        placeholder: "OR support, coordinators, materials to bring…",
      },
    ],
  },
  {
    id: "relationship_risk",
    label: DEPLOYMENT_RISK_LABEL,
    hint: "Trust, access, or politics that could slow adoption.",
    fields: [
      {
        key: "pre_observation_value_hypothesis",
        rows: 2,
        placeholder: "Weak champion, competitor loyalty, credentialing…",
      },
    ],
  },
  {
    id: "next_step_opportunity",
    label: NEXT_STEP_OPPORTUNITY_LABEL,
    hint: "Concrete commit before you leave the visit.",
    fields: [
      {
        key: "pre_observation_planned_close",
        rows: 2,
        placeholder: "Observation window, evaluation case, follow-up date…",
      },
    ],
  },
  {
    id: "strategic_notes",
    label: FIELD_INTEL_SECTION_LABEL,
    fields: [
      {
        key: "pre_observation_additional_notes",
        rows: 3,
        placeholder: "Field notes, coordinator path, observation goals…",
      },
    ],
  },
] as const;

export const LIGHTWEIGHT_TACTICAL_BRIEFING_SECTIONS: readonly TacticalBriefingSectionSpec[] = [
  {
    id: "primary_discovery_goal",
    label: TACTICAL_PRIORITIES_TITLE,
    fields: [
      {
        key: "engagement_purpose",
        rows: 2,
        placeholder: "Why this touchpoint — keep it tight.",
      },
    ],
  },
  {
    id: "operational_unknowns",
    label: "Operational Unknowns",
    hint: "Gaps to close after the visit.",
    fields: [
      {
        key: "follow_up_tasks",
        rows: 2,
        placeholder: "Tasks and owners…",
      },
    ],
  },
  {
    id: "next_step_opportunity",
    label: NEXT_STEP_OPPORTUNITY_LABEL,
    fields: [
      {
        key: "next_action",
        rows: 2,
        placeholder: "Single next commit with timing…",
      },
    ],
  },
  {
    id: "strategic_notes",
    label: FIELD_INTEL_SECTION_LABEL,
    fields: [
      {
        key: "pre_observation_additional_notes",
        rows: 3,
        placeholder: "Context the field team should know…",
      },
    ],
  },
] as const;

export function tacticalBriefingSectionsForMode(
  mode: EngagementWorkflowMode,
  engagementType: string | null | undefined,
): readonly TacticalBriefingSectionSpec[] {
  if (isOfficeVisitEngagement(engagementType)) return [];
  return mode === "strategic" ? STRATEGIC_TACTICAL_BRIEFING_SECTIONS : LIGHTWEIGHT_TACTICAL_BRIEFING_SECTIONS;
}

/** Sections with only fields present in the active workflow config. */
export function filterTacticalBriefingSections(
  sections: readonly TacticalBriefingSectionSpec[],
  mode: EngagementWorkflowMode,
  engagementType: string | null | undefined,
): TacticalBriefingSectionSpec[] {
  const allowed = new Set(
    workflowFieldConfigsForMode(mode, engagementType).map((f) => f.key),
  );
  return sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((f) => allowed.has(f.key)),
    }))
    .filter((section) => section.fields.length > 0);
}
