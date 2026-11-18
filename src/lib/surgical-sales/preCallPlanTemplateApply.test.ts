import { describe, expect, it } from "vitest";
import { applyPreCallPlanTemplateToDraft } from "@/lib/surgical-sales/preCallPlanTemplateApply";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";

function emptyDraft(): Record<PreCallPlanFieldKey, string> {
  return {
    pre_call_hospital_name: "",
    pre_call_surgeon_name: "",
    observation_goal: "",
    pre_observation_impact_opening_statement: "",
    pre_observation_probes: "",
    pre_observation_tools_resources: "",
    pre_observation_value_hypothesis: "",
    pre_observation_planned_close: "",
    pre_observation_additional_notes: "",
  };
}

function template(partial: Partial<PreCallPlanTemplate>): PreCallPlanTemplate {
  return {
    id: "t1",
    name: "Playbook",
    productLine: "ACSIS",
    engagementType: "intro_call",
    procedureFocus: "",
    description: "",
    smartObjective: "SMART goal text",
    openingStatement: "Opening",
    probes: "Probe?",
    toolsResources: null,
    valueHypothesis: null,
    plannedClose: null,
    suggestedNextStep: "Follow up Friday",
    tags: [],
    isFavorite: false,
    isSystemTemplate: true,
    ...partial,
  } as PreCallPlanTemplate;
}

describe("applyPreCallPlanTemplateToDraft", () => {
  it("maps template content into pre-call plan fields including strategic notes", () => {
    const next = applyPreCallPlanTemplateToDraft(emptyDraft(), template({}));
    expect(next.observation_goal).toBe("SMART goal text");
    expect(next.pre_observation_impact_opening_statement).toBe("Opening");
    expect(next.pre_observation_probes).toBe("Probe?");
    expect(next.pre_observation_additional_notes).toBe("Follow up Friday");
  });

  it("does not overwrite strategic notes on fill_empty when rep already has notes", () => {
    const draft = { ...emptyDraft(), pre_observation_additional_notes: "Rep notes" };
    const next = applyPreCallPlanTemplateToDraft(draft, template({}), "fill_empty");
    expect(next.pre_observation_additional_notes).toBe("Rep notes");
    expect(next.observation_goal).toBe("SMART goal text");
  });
});
