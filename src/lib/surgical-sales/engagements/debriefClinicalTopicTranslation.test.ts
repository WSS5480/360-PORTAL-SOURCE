import { describe, expect, it } from "vitest";
import {
  coachingDetermineImportance,
  coachingValidateObservation,
  containsInternalCategoryLabel,
  translateDebriefClinicalTopic,
} from "./debriefClinicalTopicTranslation";

describe("debriefClinicalTopicTranslation", () => {
  it("translates ontology labels into surgeon-recognizable topics", () => {
    expect(translateDebriefClinicalTopic("Clinical Frustration")).toMatch(/frustration during the case/i);
    expect(translateDebriefClinicalTopic("Workflow Pain Point")).toMatch(/workflow friction/i);
    expect(translateDebriefClinicalTopic("Product Signal")).toMatch(/product/i);
    expect(translateDebriefClinicalTopic("Visualization Challenge Fixation")).toMatch(
      /visualization before fixation/i,
    );
    expect(translateDebriefClinicalTopic("Provider concern: Clinical Frustration")).toMatch(
      /frustration/i,
    );
  });

  it("preserves natural clinical observation text", () => {
    const topic = translateDebriefClinicalTopic(
      "Visualization before fixation creates uncertainty",
      "clinical_pain_point",
    );
    expect(topic).toMatch(/visualization before fixation creates uncertainty/i);
    expect(containsInternalCategoryLabel(topic)).toBe(false);
  });

  it("builds step-1 coaching without internal category tokens", () => {
    const topic = translateDebriefClinicalTopic("Visualization Challenge Fixation");
    const line = coachingValidateObservation(topic);
    expect(line).toMatch(/visualization before fixation/i);
    expect(line).not.toMatch(/visualization challenge fixation/i);
    expect(containsInternalCategoryLabel(line)).toBe(false);
  });

  it("builds step-3 coaching in the user's preferred style for visualization", () => {
    const topic = translateDebriefClinicalTopic("Visualization Challenge Fixation");
    const line = coachingDetermineImportance(topic);
    expect(line).toMatch(
      /determine whether extra time spent establishing visualization before fixation is creating a meaningful workflow challenge/i,
    );
    expect(containsInternalCategoryLabel(line)).toBe(false);
  });
});
