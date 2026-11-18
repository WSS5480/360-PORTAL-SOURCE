import { describe, expect, it } from "vitest";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import {
  filterIntroCallPreparePlaybooks,
  introCallPreparePlaybookDisplayLabel,
  introCallPreparePlaybooksForPicker,
  INTRO_CALL_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME,
} from "@/lib/surgical-sales/engagements/introCallPreparePlaybooks";

function tpl(partial: Partial<PreCallPlanTemplate> & Pick<PreCallPlanTemplate, "id" | "name">): PreCallPlanTemplate {
  return {
    description: "",
    productLine: "ACSIS",
    engagementType: "intro_call",
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

describe("introCallPreparePlaybooks", () => {
  it("keeps only intro call prepare playbooks", () => {
    const all = [
      tpl({ id: "1", name: "Intro Call — ACSIS" }),
      tpl({ id: "2", name: "ACSIS — Observation request", engagementType: "observation_request" }),
      tpl({ id: "3", name: INTRO_CALL_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME, tags: ["generic"] }),
      tpl({ id: "4", name: "Legacy intro", engagementType: "intro_call" }),
    ];
    const filtered = filterIntroCallPreparePlaybooks(all);
    expect(filtered.map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("sorts all-products first then product lines", () => {
    const ordered = introCallPreparePlaybooksForPicker([
      tpl({ id: "bio", name: "Intro Call — BioTissue", productLine: "BioTissue" }),
      tpl({ id: "all", name: INTRO_CALL_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME, tags: ["generic"] }),
      tpl({ id: "acsis", name: "Intro Call — ACSIS", productLine: "ACSIS" }),
    ]);
    expect(ordered.map((t) => t.id)).toEqual(["all", "acsis", "bio"]);
    expect(introCallPreparePlaybookDisplayLabel(ordered[0]!)).toBe("All products");
    expect(introCallPreparePlaybookDisplayLabel(ordered[1]!)).toBe("ACSIS");
  });
});
