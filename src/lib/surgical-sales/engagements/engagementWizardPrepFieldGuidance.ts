import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { EngagementWorkflowFieldKey } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import {
  buildIntroCallPrepTemplate,
  resolveIntroCallProductFocus,
} from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import { resolveExplicitPrepProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export type WizardPrepFieldGuidanceContext = {
  engagementType: string;
  productLine?: PreCallPlanProductLine | "";
  providerSpecialty?: string | null;
};

type SpecialtyKey = "general_surgery" | "wound_care" | "orthopedics" | "default";

function normalizeSpecialtyKey(specialty: string | null | undefined): SpecialtyKey {
  const s = String(specialty ?? "").trim().toLowerCase();
  if (/wound|dfu|limb preservation/i.test(s)) return "wound_care";
  if (/orthop|foot|ankle|hand|extremity|fixation|trauma/i.test(s)) return "orthopedics";
  if (/general|surgery|hernia|robotic|bariatric|tapp/i.test(s)) return "general_surgery";
  return "default";
}

const PLACEHOLDERS_BY_SPECIALTY: Record<
  SpecialtyKey,
  Partial<Record<EngagementWorkflowFieldKey, string>>
> = {
  general_surgery: {
    observation_goal:
      "e.g. Confirm monthly lap ventral volume and fixation routine before follow-up in 14 days",
    pre_observation_impact_opening_statement:
      "e.g. I want to understand your hernia workflow—mesh choice, fixation steps, and where OR time gets tight",
    pre_observation_probes:
      "e.g. What fixation workflow are you using? Which procedures create the most friction today?",
    pre_observation_additional_notes: "e.g. Access path, robotics coordinator, agreed next step",
    pre_observation_tools_resources: "e.g. Case-mix worksheet · tackless fixation summary · peer reference",
    pre_observation_value_hypothesis:
      "e.g. If fixation trims OR time without changing mesh strategy, it fits your ventral workflow",
    pre_observation_planned_close: "e.g. Play back their workflow; agree on one hernia subtype for follow-up",
  },
  wound_care: {
    observation_goal:
      "e.g. Confirm advanced wound volume and biologic selection criteria before committee review in 30 days",
    pre_observation_impact_opening_statement:
      "e.g. How you stage wounds, when you escalate beyond standard care, and what slows clinic throughput",
    pre_observation_probes:
      "e.g. How are biologics selected for wound closure? What limits efficiency most today?",
    pre_observation_additional_notes: "e.g. Committee timing, NPWT rules, photo protocol",
    pre_observation_tools_resources: "e.g. Staging guide · heal-rate summary · dressing workflow sheet",
    pre_observation_value_hypothesis:
      "e.g. If application time and adherence improve without changing staging, it fits your clinic workflow",
    pre_observation_planned_close: "e.g. Agree on one wound subtype and documentation for follow-up",
  },
  orthopedics: {
    observation_goal:
      "e.g. Confirm monthly distal extremity volume and tray workflow before evaluation case in 21 days",
    pre_observation_impact_opening_statement:
      "e.g. How you handle extremity fixation today—tray choice, screw density, and turnover friction",
    pre_observation_probes:
      "e.g. What fixation workflow are you using? What would need to improve to justify evaluating alternatives?",
    pre_observation_additional_notes: "e.g. Purchasing requirements, fellow adoption, preference card timing",
    pre_observation_tools_resources: "e.g. Tray comparison sheet · sterile-field checklist · case profile",
    pre_observation_value_hypothesis:
      "e.g. If tray footprint drops without changing approach, it fits trauma-call workflow",
    pre_observation_planned_close: "e.g. Agree on evaluation case profile and who signs off on trays",
  },
  default: {
    observation_goal: "e.g. Specific, measurable goal with a clear timeline for this interaction",
    pre_observation_impact_opening_statement:
      "e.g. Wanted to understand your current workflow and where procedural friction shows up",
    pre_observation_probes: "e.g. What workflow are you using today? What would justify evaluating alternatives?",
    pre_observation_additional_notes: "e.g. Access, stakeholders, constraints, agreed next step",
    pre_observation_tools_resources: "e.g. Leave-behinds, worksheets, or references for this visit",
    pre_observation_value_hypothesis: "e.g. What clinical or operational improvement would matter most",
    pre_observation_planned_close: "e.g. How you will close the loop before leaving the conversation",
  },
};

function introCallPlaceholderMap(
  productLine: PreCallPlanProductLine | "",
  providerSpecialty?: string | null,
): Partial<Record<EngagementWorkflowFieldKey, string>> {
  const focus = resolveIntroCallProductFocus({
    productLine,
    intentionalProductFocus: Boolean(productLine),
  });
  const plan = buildIntroCallPrepTemplate({ productFocus: focus, providerSpecialty });
  const probeHint =
    plan.probesInformationToGather[0]?.replace(/\?$/, "") ?? "procedure volume and workflow friction";
  return {
    observation_goal: `e.g. ${plan.smartObjective.slice(0, 90)}…`,
    pre_observation_impact_opening_statement: `e.g. ${plan.impactOpeningStatement.slice(0, 90)}…`,
    pre_observation_probes: `e.g. ${probeHint}?`,
    pre_observation_value_hypothesis: `e.g. ${plan.valueHypothesis.slice(0, 90)}…`,
    pre_observation_planned_close: `e.g. ${plan.plannedCloseNextStep.slice(0, 90)}…`,
    pre_observation_tools_resources: "e.g. Provider profile · hospital context · portfolio overview",
    pre_observation_additional_notes: `e.g. ${plan.additionalNotesPlaceholder.slice(0, 90)}…`,
  };
}

const TYPE_PLACEHOLDER_OVERRIDES: Partial<
  Record<EngagementType, Partial<Record<EngagementWorkflowFieldKey, string>>>
> = {
  observation_request: {
    observation_goal:
      "e.g. Secure observation date within 30 days with agreed case profile and debrief",
    pre_observation_probes:
      "e.g. Ideal case profile? Who attends debrief? Photography or sterile-field rules?",
    pre_observation_planned_close: "e.g. Confirm case, block timing, and post-case debrief attendees",
  },
  product_demo: {
    observation_goal: "e.g. Define hands-on outcomes the demo must prove for staff",
    pre_observation_planned_close: "e.g. Decision criteria to move from demo to evaluation",
  },
  or_visit: {
    pre_observation_probes: "e.g. Which trays are used today? What should we observe vs stay quiet on?",
  },
  evaluation_follow_up: {
    observation_goal: "e.g. Hear what's working in evaluation cases and what blocks the next case",
    pre_observation_impact_opening_statement:
      "e.g. Checking in on the evaluation—what's working and what's getting in the way",
  },
};

const PRODUCT_PLACEHOLDER_OVERRIDES: Partial<
  Record<PreCallPlanProductLine, Partial<Record<EngagementWorkflowFieldKey, string>>>
> = {
  ACSIS: {
    pre_observation_probes:
      "e.g. What fixation workflow are you using? Which procedures create the most friction today?",
  },
  BioTissue: {
    pre_observation_probes:
      "e.g. How are biologics selected for wound closure? What limits clinic efficiency most today?",
  },
  Merakris: {
    pre_observation_probes:
      "e.g. How are skin substitutes selected for chronic wounds? What limits clinic efficiency most today?",
  },
  "Skeletal Dynamics": {
    pre_observation_probes:
      "e.g. Which extremity trays create the most friction? What does purchasing need for a comparison?",
  },
  Endolumik: {
    pre_observation_impact_opening_statement:
      "e.g. Wanted to understand bougie calibration and foregut workflow — especially sizing confirmation and dock-time friction",
    pre_observation_probes:
      "e.g. How do you confirm sizing in robotic cases? Where does foregut workflow create coordination friction?",
  },
};

const LIGHTWEIGHT_PLACEHOLDERS: Partial<Record<EngagementWorkflowFieldKey, string>> = {
  engagement_purpose: "e.g. Close the loop on last case and confirm next touchpoint",
  pre_observation_additional_notes: "e.g. Key context, access notes, or constraints for this touchpoint",
  next_action: "e.g. Send one-pager and book 20-min follow-up",
  follow_up_tasks: "e.g. Email coordinator · update opportunity stage",
};

/** Compact rows for wizard preparation details */
export const WIZARD_PREP_FIELD_ROWS: Partial<Record<EngagementWorkflowFieldKey, number>> = {
  observation_goal: 2,
  pre_observation_impact_opening_statement: 2,
  pre_observation_probes: 2,
  pre_observation_additional_notes: 2,
  pre_observation_tools_resources: 2,
  pre_observation_value_hypothesis: 2,
  pre_observation_planned_close: 2,
  engagement_purpose: 2,
  next_action: 2,
  follow_up_tasks: 2,
};

export const WIZARD_PREP_STRATEGIC_PRIORITY_KEYS: EngagementWorkflowFieldKey[] = [
  "observation_goal",
  "pre_observation_impact_opening_statement",
  "pre_observation_probes",
  "pre_observation_additional_notes",
];

export const WIZARD_PREP_STRATEGIC_ADVANCED_KEYS: EngagementWorkflowFieldKey[] = [
  "pre_observation_tools_resources",
  "pre_observation_value_hypothesis",
  "pre_observation_planned_close",
];

export const WIZARD_PREP_LIGHTWEIGHT_PRIORITY_KEYS: EngagementWorkflowFieldKey[] = [
  "engagement_purpose",
  "pre_observation_additional_notes",
];

export const WIZARD_PREP_LIGHTWEIGHT_ADVANCED_KEYS: EngagementWorkflowFieldKey[] = [
  "next_action",
  "follow_up_tasks",
];

export const WIZARD_PREP_FIELD_LABEL_OVERRIDES: Partial<Record<EngagementWorkflowFieldKey, string>> = {
  pre_observation_probes: "Discovery questions",
  pre_observation_additional_notes: "Strategic notes",
};

export function wizardPrepPlaceholder(
  key: EngagementWorkflowFieldKey,
  ctx: WizardPrepFieldGuidanceContext,
): string | undefined {
  const type = normalizeEngagementType(ctx.engagementType);
  const specialtyKey = normalizeSpecialtyKey(ctx.providerSpecialty);
  const product = ctx.productLine || "";

  const base =
    PLACEHOLDERS_BY_SPECIALTY[specialtyKey][key] ??
    PLACEHOLDERS_BY_SPECIALTY.default[key] ??
    LIGHTWEIGHT_PLACEHOLDERS[key];

  const fromType =
    type === "intro_call"
      ? introCallPlaceholderMap(resolveExplicitPrepProductLine(product), ctx.providerSpecialty)[key]
      : type
        ? TYPE_PLACEHOLDER_OVERRIDES[type]?.[key]
        : undefined;
  const fromProduct = product ? PRODUCT_PLACEHOLDER_OVERRIDES[product]?.[key] : undefined;

  return fromProduct ?? fromType ?? base;
}

/** Short starter text when suggestions exist — rep can edit or replace */
export function wizardPrepLightPrefill(
  key: EngagementWorkflowFieldKey,
  input: {
    suggestedGoal?: string | null;
    suggestedOpening?: string | null;
    suggestedDiscoveryQuestions?: string[];
  },
): string | null {
  if (key === "observation_goal") {
    const goal = String(input.suggestedGoal ?? "").trim();
    if (!goal) return null;
    const sentence = goal.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? goal;
    if (sentence.length <= 120) return sentence;
    return `${goal.slice(0, 117).trim()}…`;
  }
  if (key === "engagement_purpose" && input.suggestedOpening) {
    const open = String(input.suggestedOpening).trim();
    if (open.length <= 100) return open;
    return `${open.slice(0, 97).trim()}…`;
  }
  return null;
}
