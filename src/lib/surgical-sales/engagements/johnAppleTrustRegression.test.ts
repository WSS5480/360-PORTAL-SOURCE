import { describe, expect, it } from "vitest";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildDebriefPrepareStrategyView } from "./buildDebriefPrepareStrategyView";
import { buildDeterministicCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { synthesizeDebriefCommercialStrategyFromFramework } from "./synthesizeDebriefCommercialStrategy";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_OBSERVATION_CORPUS,
  JOHN_APPLE_OBSERVATION_NOTES,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "./johnAppleCommercialReadiness.fixture";

function buildJohnAppleTrustBrief() {
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
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  });

  const strategy = synthesizeDebriefCommercialStrategyFromFramework({
    synthesis,
    planMode: "intelligence",
    plan,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    providerName: "John Apple",
    framework,
  });

  const view = buildDebriefPrepareStrategyView({
    strategy,
    framework,
    source: "rules_fallback",
    frameworkSource: "rules_fallback",
    productCandidates: synthesis.productCandidates,
    productKnowledge: [
      getDebriefProductKnowledge("ACSIS"),
      getDebriefProductKnowledge("Endolumik"),
    ],
    providerName: "John Apple",
    procedureLabel: plan.context.procedureLabel,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
  });

  return { view, framework, plan };
}

describe("John Apple trust regression", () => {
  it("does not show unsupported ACSIS volume copy on product cards", () => {
    const { view } = buildJohnAppleTrustBrief();
    const acsis = view.commercialStrategyBrief.productOpportunities.find(
      (card) => card.productName === "ACSIS",
    );

    expect(acsis).toBeDefined();
    expect(acsis!.whatNotToSayYet).not.toMatch(/minimal ventral|incisional hernia volume/i);
    expect(acsis!.whatMustBeValidated).not.toMatch(/minimal ventral|incisional hernia volume/i);
    expect(acsis!.fieldClassifications?.whatNotToSayYet).not.toBe("evidence_backed");
  });

  it("maps program-wide observation indices in supporting evidence", () => {
    const { view } = buildJohnAppleTrustBrief();
    const workflowPain = view.commercialReadiness.dimensions.find(
      (dimension) => dimension.id === "workflow_pain",
    );

    expect(workflowPain?.supportingObservations.length).toBeGreaterThan(0);
    const indices = workflowPain!.supportingObservations
      .map((item) => item.observationIndex)
      .filter((value): value is number => value != null);

    expect(indices.some((index) => index >= 3)).toBe(true);

    const refs = view.commercialStrategyBrief.supportingEvidence.observationReferences;
    expect(refs.some((ref) => ref.observationIndex === 3 || ref.observationIndex === 5)).toBe(
      true,
    );
  });

  it("exposes framework source and product field classifications on the brief", () => {
    const { view } = buildJohnAppleTrustBrief();

    expect(view.frameworkSource).toBe("rules_fallback");
    expect(view.commercialStrategyBrief.frameworkSource).toBe("rules_fallback");

    const acsis = view.commercialStrategyBrief.productOpportunities.find(
      (card) => card.productName === "ACSIS",
    );
    expect(acsis?.fieldClassifications?.whatNotToSayYet).toBeDefined();
    expect(acsis?.attributions?.whatNotToSayYet.length).toBeGreaterThan(0);
    expect(
      view.commercialStrategyBrief.supportingEvidence.dimensionAttributions?.workflow_pain?.length,
    ).toBeGreaterThan(0);
  });

});
