import { describe, expect, it } from "vitest";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import {
  groupTemplatesForPicker,
  isProductSpecificPrepGuide,
  partitionPrepGuideRecommendations,
} from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";

function template(partial: Partial<PreCallPlanTemplate> & Pick<PreCallPlanTemplate, "id" | "name">): PreCallPlanTemplate {
  return {
    description: "",
    productLine: "ACSIS",
    engagementType: "intro_call",
    procedureFocus: "Ventral hernia",
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

const emptyFilters = {
  productLine: "" as const,
  engagementType: "intro_call" as const,
  stage: "" as const,
  specialtySlug: "",
  procedureSlug: "",
  searchQ: "",
  favoritesOnly: false,
};

describe("partitionPrepGuideRecommendations", () => {
  const acsisIntro = template({
    id: "acsis-intro",
    name: "ACSIS Intro",
    productLine: "ACSIS",
    engagementType: "intro_call",
  });
  const genericIntro = template({
    id: "generic-intro",
    name: "General Intro",
    productLine: "ACSIS",
    engagementType: "intro_call",
    tags: ["generic"],
  });

  it("separates product overlays from workflow guides when no product focus", () => {
    const ctx: TemplateSuggestContext = {
      crmEngagementType: "intro_call",
      productLine: "",
      opportunityProductLine: null,
    };
    const grouping = groupTemplatesForPicker([acsisIntro, genericIntro], ctx, emptyFilters, () => true);
    const partition = partitionPrepGuideRecommendations(grouping, ctx);

    expect(partition.hasProductFocus).toBe(false);
    expect(isProductSpecificPrepGuide(acsisIntro)).toBe(true);
    expect(isProductSpecificPrepGuide(genericIntro)).toBe(false);
    expect(partition.productOverlays.some((s) => s.template.id === "acsis-intro")).toBe(true);
    expect(partition.workflowGuides.some((s) => s.template.id === "generic-intro")).toBe(true);
    expect(partition.workflowGuides.length).toBeLessThanOrEqual(2);
  });

  it("keeps recommendations primary when product focus is selected", () => {
    const ctx: TemplateSuggestContext = {
      crmEngagementType: "intro_call",
      productLine: "ACSIS",
    };
    const grouping = groupTemplatesForPicker([acsisIntro, genericIntro], ctx, emptyFilters, () => true);
    const partition = partitionPrepGuideRecommendations(grouping, ctx);

    expect(partition.hasProductFocus).toBe(true);
    expect(partition.productOverlays).toHaveLength(0);
    expect(partition.workflowGuides.length).toBeGreaterThan(0);
  });
});
