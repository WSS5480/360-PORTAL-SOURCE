/**
 * 360 Office Visit — hands-on provider office / sim-lab engagement workflow.
 * Replaces generic pre-call / business-review planning for this engagement type.
 */

import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";

export type OfficeVisit360FieldKey =
  | "observation_goal"
  | "pre_observation_planned_close"
  | "sim_lab_focus"
  | "products_to_demonstrate"
  | "attendees"
  | "hands_on_goals"
  | "adoption_signals_to_watch"
  | "follow_up_tasks";

export type OfficeVisit360FieldConfig = {
  key: OfficeVisit360FieldKey;
  label: string;
  helper?: string;
  rows: number;
  storageKey: string;
};

export type OfficeVisit360SectionConfig = {
  id: string;
  label: string;
  helper?: string;
  placeholder?: string;
  /** Tap-to-insert suggestions shown under the field */
  chipExamples?: readonly string[];
  key: OfficeVisit360FieldKey;
  storageKey: string;
  rows: number;
  /** First section expanded by default on mobile */
  defaultOpen?: boolean;
};

export const OFFICE_VISIT_360_SIM_LAB_CHIPS = [
  "Robotic workflow",
  "Mesh handling",
  "Fixation techniques",
  "Biologic application",
  "Procedural efficiency",
  "Instrumentation familiarity",
] as const;

export const OFFICE_VISIT_360_PLANNED_CLOSE_CHIPS = [
  "Secure evaluation",
  "Schedule observation",
  "Schedule first use",
  "Preference card review",
] as const;

export const OFFICE_VISIT_360_SECTIONS: OfficeVisit360SectionConfig[] = [
  {
    id: "visit_objective",
    label: "Visit objective",
    helper: "What you need to accomplish in this hands-on visit.",
    placeholder: "e.g. Build confidence with mesh fixation in robotic cases",
    key: "observation_goal",
    storageKey: "observation_goal",
    rows: 2,
    defaultOpen: true,
  },
  {
    id: "sim_lab_focus",
    label: "Sim lab focus",
    helper: "Topics to cover in the sim lab portion.",
    chipExamples: OFFICE_VISIT_360_SIM_LAB_CHIPS,
    key: "sim_lab_focus",
    storageKey: "sim_lab_focus",
    rows: 2,
  },
  {
    id: "products_to_demonstrate",
    label: "Products to demonstrate",
    placeholder: "Products, kits, or systems to show on site",
    key: "products_to_demonstrate",
    storageKey: "products_to_demonstrate",
    rows: 2,
  },
  {
    id: "attendees",
    label: "Attendees",
    helper: "Surgeons, fellows, OR staff, product champions, etc.",
    placeholder: "Who will be in the room",
    key: "attendees",
    storageKey: "attendees",
    rows: 2,
  },
  {
    id: "hands_on_goals",
    label: "Hands-on goals",
    placeholder: "What the provider should be able to do after the session",
    key: "hands_on_goals",
    storageKey: "hands_on_goals",
    rows: 2,
  },
  {
    id: "adoption_signals",
    label: "Adoption signals to watch for",
    helper: "Behaviors or comments that indicate readiness to adopt.",
    placeholder: "e.g. asks about ordering, requests follow-up lab time",
    key: "adoption_signals_to_watch",
    storageKey: "adoption_signals_to_watch",
    rows: 2,
  },
  {
    id: "planned_close",
    label: "Planned close",
    helper: "How you will close the visit and secure the next step.",
    chipExamples: OFFICE_VISIT_360_PLANNED_CLOSE_CHIPS,
    key: "pre_observation_planned_close",
    storageKey: "pre_observation_planned_close",
    rows: 2,
  },
  {
    id: "follow_up_actions",
    label: "Follow-up actions",
    placeholder: "Tasks and owners after the visit",
    key: "follow_up_tasks",
    storageKey: "follow_up_tasks",
    rows: 2,
  },
];

export const OFFICE_VISIT_360_FIELD_CONFIGS: OfficeVisit360FieldConfig[] = OFFICE_VISIT_360_SECTIONS.map(
  (s) => ({
    key: s.key,
    label: s.label,
    helper: s.helper,
    rows: s.rows,
    storageKey: s.storageKey,
  }),
);

export const OFFICE_VISIT_360_PLANNING_LABEL = "Visit plan";
export const OFFICE_VISIT_360_PLANNING_DESCRIPTION =
  "Hands-on office or sim-lab visit — plan objectives, demo focus, and follow-up.";

export function officeVisit360SectionPreview(
  draft: Record<string, string>,
  section: OfficeVisit360SectionConfig,
): string {
  const text = String(draft[section.key] ?? "").trim();
  if (!text) return "Not started";
  const line = text.split(/\r?\n/)[0]?.trim() ?? "";
  return line.length > 48 ? `${line.slice(0, 48)}…` : line;
}
