import { describe, expect, it } from "vitest";
import {
  buildPreCallPlanTemplateApplySections,
  preCallPlanTemplateApplyConflicts,
  preCallPlanTemplateHasApplyConflicts,
} from "@/lib/surgical-sales/preCallPlanTemplateApplyAnalysis";
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
    name: "Test playbook",
    productLine: "ACSIS",
    engagementType: "intro_call",
    procedureFocus: "",
    description: "",
    smartObjective: "Goal",
    openingStatement: null,
    probes: null,
    toolsResources: null,
    valueHypothesis: null,
    plannedClose: null,
    suggestedNextStep: null,
    tags: [],
    isFavorite: false,
    isSystemTemplate: true,
    ...partial,
  } as PreCallPlanTemplate;
}

describe("preCallPlanTemplateApplyAnalysis", () => {
  it("detects conflict when rep already filled a field the template provides", () => {
    const draft = { ...emptyDraft(), observation_goal: "My goal" };
    const sections = buildPreCallPlanTemplateApplySections(draft, template({ smartObjective: "Goal" }));
    const conflicts = preCallPlanTemplateApplyConflicts(sections);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.label).toBe("SMART objective");
    expect(preCallPlanTemplateHasApplyConflicts(draft, template({ smartObjective: "Goal" }))).toBe(true);
  });

  it("has no conflicts when plan fields are blank", () => {
    const draft = emptyDraft();
    expect(preCallPlanTemplateHasApplyConflicts(draft, template({ smartObjective: "Goal" }))).toBe(false);
  });

  it("flags strategic notes when suggested next step would append to existing notes", () => {
    const draft = { ...emptyDraft(), pre_observation_additional_notes: "Rep notes" };
    const sections = buildPreCallPlanTemplateApplySections(
      draft,
      template({ suggestedNextStep: "Schedule follow-up" }),
    );
    const notes = sections.find((s) => s.label === "Strategic notes");
    expect(notes?.wouldConflict).toBe(true);
    expect(notes?.templateValue).toBe("Schedule follow-up");
  });
});
