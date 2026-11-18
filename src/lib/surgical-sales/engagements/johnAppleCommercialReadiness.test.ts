import { describe, expect, it } from "vitest";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildDeterministicCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import { scoreCompetitiveDisplacementSignals } from "./scoreCompetitiveDisplacement";
import { assessProductWorkflowAlignment } from "./matchProductWorkflowTriggers";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_OBSERVATION_NOTES,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "./johnAppleCommercialReadiness.fixture";

function buildJohnAppleCommercialPipeline() {
  const plan = buildProviderDebriefPlan({
    caseRow: JOHN_APPLE_CURRENT_CASE,
    activities: JOHN_APPLE_CURRENT_ACTIVITIES,
    providerName: "John Apple",
    priorObservationCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
    providerContact: JOHN_APPLE_PROVIDER_CONTACT,
  });

  const synthesis = buildDebriefCommercialSynthesis({
    plan,
    providerName: "John Apple",
    organizationName: null,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    pathwayStageLabel: "Debrief",
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    productKnowledge: [
      getDebriefProductKnowledge("ACSIS"),
      getDebriefProductKnowledge("Endolumik"),
    ],
  });

  const framework = buildDeterministicCommercialReadinessFramework({
    synthesis,
    plan,
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  });

  return { plan, synthesis, framework };
}

function dimensionScore(
  framework: ReturnType<typeof buildDeterministicCommercialReadinessFramework>,
  id: string,
) {
  return framework.dimensions.find((dimension) => dimension.id === id);
}

describe("John Apple commercial readiness regression", () => {
  it("boosts ACSIS from workflow alignment without explicit product mention", () => {
    const { plan } = buildJohnAppleCommercialPipeline();
    const acsis = plan.productOpportunityAssessment.find((item) => item.product === "ACSIS");

    expect(acsis).toBeDefined();
    expect(acsis!.fitLevel).toBe("needs_surgeon_confirmation");
    expect(acsis!.fitRationale.some((line) => /workflow aligns with ACSIS/i.test(line))).toBe(true);
    expect(acsis!.evidence.some((line) => /visualization|fixation/i.test(line))).toBe(true);
    expect(acsis!.evidence.some((line) => /\bacs?is\b/i.test(line))).toBe(false);
  });

  it("keeps Endolumik unlikely when procedure and workflow do not align", () => {
    const { plan } = buildJohnAppleCommercialPipeline();
    const endolumik = plan.productOpportunityAssessment.find((item) => item.product === "Endolumik");

    expect(endolumik?.fitLevel).toBe("unlikely");
  });

  it("pins deterministic commercial readiness scores and evidence chains", () => {
    const { plan, synthesis, framework } = buildJohnAppleCommercialPipeline();

    const workflowPain = dimensionScore(framework, "workflow_pain");
    const productFit = dimensionScore(framework, "product_fit");
    const competitive = dimensionScore(framework, "competitive_displacement_opportunity");
    const openness = dimensionScore(framework, "openness_to_change");
    const evaluation = dimensionScore(framework, "evaluation_readiness");
    const experience360 = dimensionScore(framework, "experience_360_readiness");

    expect(workflowPain?.score).toBe(90);
    expect(productFit?.score).toBe(48);
    expect(competitive?.score).toBe(28);
    expect(openness?.score).toBe(50);
    expect(evaluation?.score).toBe(90);
    expect(experience360?.score).toBe(63);

    expect(workflowPain?.evidence.some((line) => /visualization|fixation|frustration/i.test(line))).toBe(
      true,
    );
    expect(productFit?.evidence.length).toBeGreaterThan(0);
    expect(competitive?.reasoning).toMatch(/displacement opportunity is limited/i);
    expect(framework.primaryCommercialLever).toBe("workflow_pain");

    const displacementSignals = scoreCompetitiveDisplacementSignals({
      synthesis,
      plan,
      observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    });
    expect(displacementSignals.hasIncumbentPresence).toBe(true);
    expect(displacementSignals.hasIncumbentDissatisfaction).toBe(false);

    const acsisAlignment = assessProductWorkflowAlignment({
      productId: "ACSIS",
      procedureLabel: plan.context.procedureLabel,
      observationTexts: JOHN_APPLE_OBSERVATION_NOTES,
      learnings: plan.whatWeLearned,
    });
    expect(acsisAlignment.procedureAligned).toBe(true);
    expect(acsisAlignment.matchedClinicalTriggers.length).toBeGreaterThan(0);
    expect(acsisAlignment.alignmentScore).toBeGreaterThanOrEqual(35);
  });
});
