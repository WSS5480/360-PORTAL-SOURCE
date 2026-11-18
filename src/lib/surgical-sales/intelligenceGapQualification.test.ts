import { describe, expect, it } from "vitest";
import {
  buildIntelligenceGapEngine,
} from "@/lib/surgical-sales/buildIntelligenceGapEngine";
import {
  buildIntelligenceLearningGaps,
  learningGapForField,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  intelligenceGapQualifiesForSurfacing,
  isFieldExplicitlyReferenced,
  isFieldMissionRelevant,
  schedulingContactUnresolvedPhrase,
} from "@/lib/surgical-sales/intelligenceGapQualification";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

describe("intelligenceGapQualification", () => {
  it("tracks discovery mission fields for domain completeness without surfacing blank-field gaps", () => {
    expect(isFieldMissionRelevant("provider_observation_feasibility", {}, "discovery")).toBe(true);
    expect(isFieldMissionRelevant("provider_evaluation_openness", {}, "discovery")).toBe(true);
    expect(
      intelligenceGapQualifiesForSurfacing({
        dbKey: "provider_evaluation_openness",
        contact: {},
        state: "unknown",
        stageId: "discovery",
      }),
    ).toBe(false);
  });

  it("does not treat undocumented workflow fields as mission-relevant on discovery", () => {
    expect(isFieldMissionRelevant("provider_or_team_dynamics", {}, "discovery")).toBe(false);
    expect(isFieldMissionRelevant("provider_workflow_pain_points", {}, "discovery")).toBe(false);
    expect(isFieldMissionRelevant("provider_technique_preferences", {}, "discovery")).toBe(false);
  });

  it("surfaces scheduling contact gap when Emily was referenced but not confirmed", () => {
    const contact = {
      provider_observation_coordinator_contact: "Work through Emily — contact info not captured",
      provider_observation_feasibility: "approved for vendor observation",
    };
    const assessment = assessIntelligenceFieldQuality(
      "provider_observation_coordinator_contact",
      contact.provider_observation_coordinator_contact,
    );

    expect(
      isFieldExplicitlyReferenced(
        "provider_observation_coordinator_contact",
        contact,
        contact.provider_observation_coordinator_contact,
        assessment,
      ),
    ).toBe(true);
    expect(
      schedulingContactUnresolvedPhrase(
        "provider_observation_coordinator_contact",
        contact.provider_observation_coordinator_contact,
      ),
    ).toBe("Scheduling contact needs confirmation");

    const gap = learningGapForField(
      "provider_observation_coordinator_contact",
      "observation_readiness",
      contact,
      undefined,
      { stageId: "observe" },
    );
    expect(gap?.phrase).toBe("Scheduling contact needs confirmation");
  });

  it("does not surface OR posting process when provider never mentioned it", () => {
    const gap = learningGapForField("provider_or_team_dynamics", "clinical_workflow", {}, undefined, {
      stageId: "discovery",
    });
    expect(gap).toBeNull();
  });

  it("returns no gaps on an empty discovery profile", () => {
    const gaps = buildIntelligenceLearningGaps({}, undefined, 24, { stageId: "discovery" });
    expect(gaps).toEqual([]);
  });

  it("excludes speculative unknowns from gap engine on empty profile", () => {
    const view = buildIntelligenceGapEngine({ contact: {}, stageId: "discovery", maxGaps: 24 });
    expect(view.gaps).toEqual([]);
  });

  it("qualifies partial gaps only when explicitly referenced", () => {
    const contact = {
      provider_workflow_pain_points:
        "Turnover is slow but I still need to understand which step causes the delay.",
    };
    const assessment = assessIntelligenceFieldQuality(
      "provider_workflow_pain_points",
      contact.provider_workflow_pain_points,
    );

    expect(
      intelligenceGapQualifiesForSurfacing({
        dbKey: "provider_workflow_pain_points",
        contact,
        state: "partial",
        stageId: "debrief",
        raw: contact.provider_workflow_pain_points,
        assessment,
      }),
    ).toBe(true);
  });
});
