import { describe, expect, it } from "vitest";
import { buildIntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import {
  applyIntroCallTemplateToDraft,
  introCallPrepFieldsHaveContent,
  introCallTemplateToWorkflowFields,
  shouldPromptBeforeIntroCallTemplateReplace,
} from "@/lib/surgical-sales/engagements/introCallTemplateApply";

describe("introCallTemplateApply helpers", () => {
  it("maps template to workflow field keys", () => {
    const template = buildIntroCallPrepTemplate({ productFocus: "generic" });
    const fields = introCallTemplateToWorkflowFields(template);
    expect(fields.observation_goal).toBe(template.smartObjective);
    expect(fields.pre_observation_impact_opening_statement).toBe(template.impactOpeningStatement);
    expect(fields.pre_observation_probes).toContain("•");
  });

  it("detects prep field content", () => {
    expect(introCallPrepFieldsHaveContent({})).toBe(false);
    expect(
      introCallPrepFieldsHaveContent({ pre_observation_value_hypothesis: "Custom hypothesis" }),
    ).toBe(true);
  });

  it("does not prompt when draft is empty", () => {
    expect(shouldPromptBeforeIntroCallTemplateReplace({})).toBe(false);
  });
});
