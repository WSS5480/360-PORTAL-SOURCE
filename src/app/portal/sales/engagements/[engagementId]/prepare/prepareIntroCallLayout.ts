import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";

/** Presentational section groupings for intro call pre-call plan layout. */
export type IntroCallPlanSection = {
  id: "opening" | "discovery" | "close";
  label: string;
  hint: string;
  keys: readonly PreCallPlanFieldKey[];
};

export const INTRO_CALL_PLAN_SECTIONS: IntroCallPlanSection[] = [
  {
    id: "opening",
    label: "Set the frame",
    hint: "Align on why you're calling and what success looks like.",
    keys: ["observation_goal", "pre_observation_impact_opening_statement"],
  },
  {
    id: "discovery",
    label: "Learn the pathway",
    hint: "Probes and resources that unlock observation access.",
    keys: [
      "pre_observation_value_hypothesis",
      "pre_observation_probes",
      "pre_observation_tools_resources",
    ],
  },
  {
    id: "close",
    label: "Land the ask",
    hint: "How you'll close and what you'll capture after the call.",
    keys: ["pre_observation_planned_close", "pre_observation_additional_notes"],
  },
];

export function groupIntroCallPlanFields(
  fields: EngagementWorkflowFieldConfig[],
): Array<{ section: IntroCallPlanSection; fields: EngagementWorkflowFieldConfig[] }> {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const used = new Set<string>();

  const grouped = INTRO_CALL_PLAN_SECTIONS.map((section) => {
    const sectionFields = section.keys
      .map((key) => byKey.get(key))
      .filter((field): field is EngagementWorkflowFieldConfig => {
        if (!field) return false;
        used.add(field.key);
        return true;
      });
    return { section, fields: sectionFields };
  }).filter((entry) => entry.fields.length > 0);

  const remainder = fields.filter((field) => !used.has(field.key));
  if (remainder.length > 0) {
    grouped.push({
      section: {
        id: "close",
        label: "Additional plan",
        hint: "Other fields for this visit.",
        keys: [],
      },
      fields: remainder,
    });
  }

  return grouped;
}
