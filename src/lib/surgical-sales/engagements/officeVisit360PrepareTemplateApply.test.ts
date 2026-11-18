import { describe, expect, it } from "vitest";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import {
  applyOfficeVisit360PrepareTemplateToWorkflowDraft,
  officeVisit360PrepareTemplateHasApplyConflicts,
} from "./officeVisit360PrepareTemplateApply";

function tpl(partial: Partial<PreCallPlanTemplate>): PreCallPlanTemplate {
  return {
    id: "t1",
    name: "360 Experience — All products",
    description: "",
    productLine: "ACSIS",
    engagementType: "office_visit_360",
    procedureFocus: "",
    smartObjective: "SMART objective text",
    openingStatement: null,
    probes: "Sim lab bullets",
    toolsResources: null,
    valueHypothesis: null,
    plannedClose: null,
    suggestedNextStep: null,
    tags: [],
    status: "active",
    isSystemTemplate: true,
    isFavorite: false,
    createdBy: null,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("officeVisit360PrepareTemplateApply", () => {
  it("detects conflicts only on the two prepare fields", () => {
    const template = tpl({});
    expect(
      officeVisit360PrepareTemplateHasApplyConflicts({ observation_goal: "Existing goal" }, template),
    ).toBe(true);
    expect(officeVisit360PrepareTemplateHasApplyConflicts({}, template)).toBe(false);
  });

  it("fill_empty preserves rep edits", () => {
    const template = tpl({});
    const merged = applyOfficeVisit360PrepareTemplateToWorkflowDraft(
      { observation_goal: "Rep goal", sim_lab_focus: "" },
      template,
      "fill_empty",
    );
    expect(merged.observation_goal).toBe("Rep goal");
    expect(merged.sim_lab_focus).toBe("Sim lab bullets");
  });
});
