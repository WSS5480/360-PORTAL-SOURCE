import { describe, expect, it } from "vitest";

import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";

import {

  filterOfficeVisit360PreparePlaybooks,

  officeVisit360PreparePlaybookDisplayLabel,

  officeVisit360PreparePlaybooksForPicker,

  OFFICE_VISIT_360_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME,

} from "@/lib/surgical-sales/engagements/officeVisit360PreparePlaybooks";

import { mergeTemplateIntoOfficeVisitDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

import {

  applyOfficeVisit360PrepareTemplateToWorkflowDraft,

  buildOfficeVisit360PrepareTemplateApplySections,

} from "@/lib/surgical-sales/engagements/officeVisit360PrepareTemplateApply";

import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";



function tpl(partial: Partial<PreCallPlanTemplate> & Pick<PreCallPlanTemplate, "id" | "name">): PreCallPlanTemplate {

  return {

    description: "",

    productLine: "ACSIS",

    engagementType: "office_visit_360",

    procedureFocus: "",

    smartObjective: "",

    openingStatement: "",

    probes: "",

    toolsResources: "",

    valueHypothesis: "",

    plannedClose: "",

    suggestedNextStep: "",

    tags: [],

    isSystem: true,

    isFavorite: false,

    ownerUserId: null,

    duplicatedFromId: null,

    createdByUserId: null,

    createdAt: "",

    updatedAt: "",

    ...partial,

  } as PreCallPlanTemplate;

}



describe("officeVisit360PreparePlaybooks", () => {

  it("keeps only 360 Experience prepare playbooks", () => {

    const all = [

      tpl({ id: "1", name: OFFICE_VISIT_360_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME, tags: ["generic"] }),

      tpl({ id: "2", name: "ACSIS — Observation request", engagementType: "observation_request" }),

      tpl({ id: "3", name: "Intro Call — All products", engagementType: "intro_call" }),

    ];

    expect(filterOfficeVisit360PreparePlaybooks(all).map((t) => t.id)).toEqual(["1"]);

  });



  it("exposes a single all-products label", () => {

    const picked = officeVisit360PreparePlaybooksForPicker([

      tpl({ id: "all", name: OFFICE_VISIT_360_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME, tags: ["generic"] }),

    ]);

    expect(picked).toHaveLength(1);

    expect(officeVisit360PreparePlaybookDisplayLabel(picked[0]!)).toBe("All products");

  });

});



describe("mergeTemplateIntoOfficeVisitDraft", () => {

  it("maps only the two 360 prepare questions", () => {

    const templateFields = {

      pre_call_hospital_name: "",

      pre_call_surgeon_name: "",

      observation_goal: "SMART: Complete hands-on session",

      pre_observation_impact_opening_statement: "Should not map",

      pre_observation_probes: "• Mesh handling\n• Robotic workflow",

      pre_observation_tools_resources: "Should not map",

      pre_observation_value_hypothesis: "Should not map",

      pre_observation_planned_close: "Should not map",

      pre_observation_additional_notes: "Should not map",

    } satisfies Record<PreCallPlanFieldKey, string>;



    const merged = mergeTemplateIntoOfficeVisitDraft({}, templateFields);

    expect(merged.observation_goal).toContain("hands-on");

    expect(merged.sim_lab_focus).toContain("Mesh handling");

    expect(merged.attendees).toBeUndefined();

    expect(merged.products_to_demonstrate).toBeUndefined();

  });

});



describe("applyOfficeVisit360PrepareTemplateToWorkflowDraft", () => {

  it("fills visit objective and sim lab focus from template model fields", () => {

    const template = tpl({

      id: "all",

      name: OFFICE_VISIT_360_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME,

      smartObjective: "SMART: Prove workflow fit",

      probes: "• Fixation techniques\n• Instrumentation comfort",

      openingStatement: "Ignored intro field",

      toolsResources: "Ignored tools field",

    });



    const sections = buildOfficeVisit360PrepareTemplateApplySections({}, template);

    expect(sections).toHaveLength(2);

    expect(sections.map((s) => s.label)).toEqual(["Visit objective", "Sim lab focus"]);



    const merged = applyOfficeVisit360PrepareTemplateToWorkflowDraft({}, template);

    expect(merged.observation_goal).toBe("SMART: Prove workflow fit");

    expect(merged.sim_lab_focus).toContain("Fixation");

    expect(merged.attendees).toBeUndefined();

  });

});


