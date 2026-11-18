import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import { INTRO_CALL_PREP_PLAN_FIELD_KEYS } from "@/lib/surgical-sales/preCallPlanFields";

export type IntroCallPlanCardFieldSpec = {
  key: PreCallPlanFieldKey;
  sublabel?: string;
  rows: number;
  helper?: string;
};

export type IntroCallPlanCardSectionSpec = {
  id: string;
  label: string;
  helper?: string;
  fields: readonly IntroCallPlanCardFieldSpec[];
};

/** Visual Call Plan cards — maps 1:1 to persisted pre-call text fields (no schema change). */
export const INTRO_CALL_PLAN_CARD_SECTIONS: readonly IntroCallPlanCardSectionSpec[] = [
  {
    id: "objective",
    label: "Objective (SMART)",
    helper: "SMART goal for this intro call.",
    fields: [{ key: "observation_goal", rows: 2 }],
  },
  {
    id: "opening_angle",
    label: "Opening Angle",
    helper: "How you will open the conversation.",
    fields: [{ key: "pre_observation_impact_opening_statement", rows: 2 }],
  },
  {
    id: "priority_questions",
    label: "Priority Questions",
    helper: "Discovery probes — one per line is fine.",
    fields: [{ key: "pre_observation_probes", rows: 2 }],
  },
  {
    id: "operational_unknowns",
    label: "Operational Unknowns",
    helper: "Tools to bring and the value story you are testing.",
    fields: [
      {
        key: "pre_observation_tools_resources",
        sublabel: "Tools & resources",
        rows: 2,
      },
      {
        key: "pre_observation_value_hypothesis",
        sublabel: "Value hypothesis",
        rows: 2,
      },
    ],
  },
  {
    id: "next_step_goal",
    label: "Next-Step Goal",
    helper: "How you will close and what happens after the call.",
    fields: [
      {
        key: "pre_observation_planned_close",
        sublabel: "Planned close",
        rows: 2,
      },
      {
        key: "pre_observation_additional_notes",
        sublabel: "Follow-up & observation notes",
        rows: 2,
        helper: "Coordinator path, observation goals, or suggested follow-up.",
      },
    ],
  },
] as const;

/** Every intro-call prep field appears on exactly one card. */
export function introCallPlanCardFieldKeys(): PreCallPlanFieldKey[] {
  return INTRO_CALL_PLAN_CARD_SECTIONS.flatMap((section) =>
    section.fields.map((f) => f.key),
  );
}

export function assertIntroCallPlanCardCoverage(): void {
  const covered = new Set(introCallPlanCardFieldKeys());
  for (const key of INTRO_CALL_PREP_PLAN_FIELD_KEYS) {
    if (!covered.has(key)) {
      throw new Error(`Intro Call plan card missing field: ${key}`);
    }
  }
}
