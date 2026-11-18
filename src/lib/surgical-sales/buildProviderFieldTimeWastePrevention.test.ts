import { describe, expect, it } from "vitest";
import { buildProviderFieldTimeWastePrevention } from "./buildProviderFieldTimeWastePrevention";
import { FIELD_TIME_WASTE_PREVENTION_QUESTION } from "./fieldTimeWastePreventionVocabulary";

describe("buildProviderFieldTimeWastePrevention", () => {
  it("asks what could make the field visit fail", () => {
    const prevention = buildProviderFieldTimeWastePrevention({
      contact: {},
      relationshipStage: "prospect",
    });
    expect(prevention.question).toBe(FIELD_TIME_WASTE_PREVENTION_QUESTION);
    expect(prevention.warnings).toHaveLength(5);
  });

  it("flags failed observation and missing access for thin observation accounts", () => {
    const prevention = buildProviderFieldTimeWastePrevention({
      contact: {},
      relationshipStage: "observation_requested",
    });
    const failed = prevention.warnings.find((w) => w.id === "failed_observation")!;
    const access = prevention.warnings.find((w) => w.id === "missing_access_pathway")!;
    expect(failed.active).toBe(true);
    expect(access.active).toBe(true);
    expect(prevention.primaryWarning?.id).toBeTruthy();
    expect(prevention.posture).not.toBe("protected");
  });

  it("flags low-quality cases when observation is allowed but ideal cases missing", () => {
    const prevention = buildProviderFieldTimeWastePrevention({
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_credentialing_needed: "cleared",
      },
      relationshipStage: "observation_requested",
    });
    const cases = prevention.warnings.find((w) => w.id === "low_quality_cases")!;
    expect(cases.active).toBe(true);
    expect(cases.visitFailureWarning).toMatch(/low-signal|ideal|case/i);
  });

  it("surfaces coordinator scheduling as weak pathway when coordinator missing", () => {
    const prevention = buildProviderFieldTimeWastePrevention({
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_credentialing_needed: "cleared",
      },
      relationshipStage: "observation_requested",
    });
    const scheduling = prevention.warnings.find((w) => w.id === "weak_scheduling_pathway")!;
    expect(scheduling.active).toBe(true);
    expect(scheduling.visitFailureWarning).toMatch(/schedule|coordinator|posting/i);
  });
});
