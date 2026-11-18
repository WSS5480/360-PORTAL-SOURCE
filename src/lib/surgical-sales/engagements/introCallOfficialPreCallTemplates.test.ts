import { describe, expect, it } from "vitest";
import {
  buildIntroCallPrepTemplate,
  buildIntroCallOfficialPreCallPlan,
  INTRO_CALL_FORBIDDEN_PRODUCT_TERMS,
  introCallTemplates,
  resolveIntroCallProductFocus,
} from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import { INTRO_CALL_TEMPLATES_BY_FOCUS } from "@/lib/surgical-sales/engagements/introCallTemplates";
import {
  applyIntroCallTemplateToDraft,
  shouldPromptBeforeIntroCallTemplateReplace,
} from "@/lib/surgical-sales/engagements/introCallTemplateApply";

function strategyBlob(template: ReturnType<typeof buildIntroCallPrepTemplate>): string {
  return [
    template.smartObjective,
    template.impactOpeningStatement,
    template.probesInformationToGather.join(" "),
    template.valueHypothesis,
    template.plannedCloseNextStep,
    template.observationGoals.join(" "),
    template.suggestedFollowUp.join(" "),
  ].join(" ");
}

describe("introCallTemplates map", () => {
  it("exposes all product focus template builders", () => {
    expect(Object.keys(introCallTemplates).sort()).toEqual(
      ["acsis", "biotissue", "endolumik", "generic", "merakris", "skeletalDynamics", "telabio"].sort(),
    );
    for (const builder of Object.values(introCallTemplates)) {
      const t = builder();
      expect(t.smartObjective).toBeTruthy();
      expect(t.impactOpeningStatement).toBeTruthy();
      expect(t.probesInformationToGather.length).toBeGreaterThan(0);
      expect(t.toolsResources).toBeTruthy();
      expect(t.valueHypothesis).toBeTruthy();
      expect(t.plannedCloseNextStep).toBeTruthy();
      expect(t.observationGoals.length).toBeGreaterThan(0);
      expect(t.suggestedFollowUp.length).toBeGreaterThan(0);
      expect(t.additionalNotesPlaceholder).toBeTruthy();
    }
  });

  it("generic template avoids hospital logistics questions for the surgeon", () => {
    const template = buildIntroCallPrepTemplate({
      productFocus: "generic",
      providerSpecialty: "General Surgery",
    });
    const blob = strategyBlob(template);
    expect(blob).not.toMatch(/credential|vendor coordinator|who handles scheduling|vendor can observe/i);
    expect(template.probesInformationToGather.join(" ")).toMatch(/comfortable having us observe/i);
  });

  it("1 — Intro Call + no product + general surgery = generic, no hernia-specific objective", () => {
    const focus = resolveIntroCallProductFocus({
      productLine: "",
      intentionalProductFocus: false,
    });
    expect(focus).toBe("generic");

    const template = buildIntroCallPrepTemplate({
      productFocus: focus,
      providerSpecialty: "General Surgery",
    });
    const blob = strategyBlob(template);
    expect(INTRO_CALL_FORBIDDEN_PRODUCT_TERMS.test(blob)).toBe(false);
    expect(template.smartObjective).toMatch(/operative workflow|case mix|observe/i);
  });

  it("2 — Intro Call + ACSIS = hernia/abdominal wall language allowed", () => {
    const template = buildIntroCallPrepTemplate({
      productFocus: "acsis",
      providerSpecialty: "General Surgery",
    });
    expect(template.smartObjective.toLowerCase()).toMatch(/hernia|abdominal/);
    expect(template.impactOpeningStatement.toLowerCase()).toMatch(/hernia|ventral/);
    expect(template.observationGoals.join(" ").toLowerCase()).toMatch(/hernia/);
  });

  it("3 — Intro Call + Skeletal Dynamics = extremity fixation language", () => {
    const template = buildIntroCallPrepTemplate({
      productFocus: "skeletalDynamics",
      providerSpecialty: "Orthopedic Surgery",
    });
    expect(template.smartObjective.toLowerCase()).toMatch(/extremity|fixation/);
    expect(template.impactOpeningStatement.toLowerCase()).toMatch(/extremity|fixation/);
    expect(template.observationGoals.join(" ").toLowerCase()).toMatch(/extremity/);
  });

  it("generic template is identical regardless of specialty (no hernia drift)", () => {
    const withGs = buildIntroCallPrepTemplate({
      productFocus: "generic",
      providerSpecialty: "General Surgery",
    });
    const withDefault = buildIntroCallPrepTemplate({ productFocus: "generic" });
    expect(withGs).toEqual(withDefault);
  });

  it("switching products changes the entire suggested strategy", () => {
    const generic = INTRO_CALL_TEMPLATES_BY_FOCUS.generic;
    const acsis = INTRO_CALL_TEMPLATES_BY_FOCUS.acsis;
    const biotissue = INTRO_CALL_TEMPLATES_BY_FOCUS.biotissue;
    const skeletal = INTRO_CALL_TEMPLATES_BY_FOCUS.skeletalDynamics;

    expect(strategyBlob(generic)).not.toBe(strategyBlob(acsis));
    expect(strategyBlob(acsis)).not.toBe(strategyBlob(biotissue));
    expect(strategyBlob(biotissue)).not.toBe(strategyBlob(skeletal));

    expect(biotissue.observationGoals.join(" ").toLowerCase()).toMatch(/wound|graft|clinic/);
    expect(INTRO_CALL_TEMPLATES_BY_FOCUS.endolumik.smartObjective.toLowerCase()).toMatch(
      /bariatric|foregut|leak/,
    );
    expect(INTRO_CALL_TEMPLATES_BY_FOCUS.telabio.smartObjective.toLowerCase()).toMatch(
      /reinforcement|preservation|biologic/,
    );
  });

  it("product focus resolves only with intentional selection", () => {
    expect(
      resolveIntroCallProductFocus({ productLine: "ACSIS", intentionalProductFocus: false }),
    ).toBe("generic");
    expect(
      resolveIntroCallProductFocus({ productLine: "ACSIS", intentionalProductFocus: true }),
    ).toBe("acsis");
  });
});

describe("introCallTemplateApply", () => {
  const acsisTemplate = buildIntroCallPrepTemplate({ productFocus: "acsis" });
  const genericTemplate = buildIntroCallPrepTemplate({ productFocus: "generic" });

  it("4 — switching product focus: prompts when fields have content", () => {
    const draft = {
      observation_goal: "My custom SMART goal for this visit.",
    };
    expect(shouldPromptBeforeIntroCallTemplateReplace(draft)).toBe(true);
  });

  it("5 — saved custom prep fields persist when applying without replace", () => {
    const draft = {
      observation_goal: "My custom SMART goal.",
      pre_observation_impact_opening_statement: "My custom opening.",
    };
    const next = applyIntroCallTemplateToDraft(draft, acsisTemplate, { replace: false });
    expect(next.observation_goal).toBe("My custom SMART goal.");
    expect(next.pre_observation_impact_opening_statement).toBe("My custom opening.");
    expect(String(next.pre_observation_probes ?? "").length).toBeGreaterThan(0);
  });

  it("replace mode overwrites template fields and includes observation goals in notes", () => {
    const draft = {
      observation_goal: "My custom SMART goal.",
      pre_call_hospital_name: "Memorial Hospital",
    };
    const next = applyIntroCallTemplateToDraft(draft, genericTemplate, { replace: true });
    expect(next.observation_goal).toBe(genericTemplate.smartObjective);
    expect(next.pre_call_hospital_name).toBe("Memorial Hospital");
    expect(String(next.pre_observation_additional_notes ?? "")).toContain("Future observation goals");
    expect(String(next.pre_observation_additional_notes ?? "")).toContain("Suggested follow-up");
  });

  it("buildIntroCallOfficialPreCallPlan bridges legacy consumers", () => {
    const plan = buildIntroCallOfficialPreCallPlan({
      productLine: "ACSIS",
      intentionalProductFocus: true,
      providerSpecialty: "General Surgery",
    });
    expect(plan.mode).toBe("product");
    expect(plan.probes.length).toBeGreaterThan(0);
    expect(plan.observationGoals.length).toBeGreaterThan(0);
    expect(plan.suggestedFollowUp.length).toBeGreaterThan(0);
    expect(plan.impactOpening.toLowerCase()).toMatch(/hernia/);
  });
});
