import { describe, expect, it } from "vitest";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildDebriefPrepareStrategyView } from "./buildDebriefPrepareStrategyView";
import { buildDebriefPrepareWorkspaceDraft } from "./buildDebriefPrepareWorkspaceDraft";
import { buildDeterministicCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { synthesizeDebriefCommercialStrategyFromFramework } from "./synthesizeDebriefCommercialStrategy";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import {
  buildDebriefPrepareWorkspaceView,
  mergeDebriefPrepareWorkspaceSnapshot,
  readDebriefPrepareWorkspaceSnapshot,
} from "./debriefPrepareWorkspace";
import {
  buildSharedUnresolvedEvidenceQuestions,
  OBSERVATION_INTELLIGENCE_STILL_NEED_MAX,
} from "@/lib/surgical-sales/buildSharedUnresolvedEvidenceQuestions";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_OBSERVATION_CORPUS,
  JOHN_APPLE_OBSERVATION_NOTES,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "./johnAppleCommercialReadiness.fixture";

function buildJohnAppleWorkspaceDraft() {
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
    organizationName: "Test Hospital",
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    pathwayStageLabel: "Debrief",
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    productKnowledge: [getDebriefProductKnowledge("ACSIS")],
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
    providerName: "John Apple",
    procedureLabel: plan.context.procedureLabel,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    observationCorpus: JOHN_APPLE_OBSERVATION_CORPUS,
  });

  return buildDebriefPrepareWorkspaceDraft({
    conversionBrief: view.conversionBrief,
    commercialReadiness: view.commercialReadiness,
    commercialSynthesis: synthesis,
    plan,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    isFirstDebrief: true,
    providerName: "John Apple",
    procedureLabel: plan.context.procedureLabel,
    observationIntelligence: {
      caseRow: JOHN_APPLE_CURRENT_CASE,
      activities: JOHN_APPLE_CURRENT_ACTIVITIES,
      priorCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
      providerContact: JOHN_APPLE_PROVIDER_CONTACT,
    },
  });
}

describe("buildDebriefPrepareWorkspaceDraft", () => {
  it("produces frequency-backed observation patterns without operational workflow facts", () => {
    const draft = buildJohnAppleWorkspaceDraft();

    expect(draft.meetingObjective.length).toBeGreaterThan(20);
    expect(draft.strongestObservedPattern).toMatch(/Extra visualization time before fixation/i);
    expect(draft.meetingObjective).toMatch(/visualization time before fixation/i);
    expect(draft.meetingObjective).not.toMatch(/visualization-before-fixation|workflow observed|apple product/i);
    expect(draft.knownFacts.length).toBeLessThanOrEqual(5);
    expect(draft.knownFacts.some((fact) => /\(\d+ of 5 observations\)/i.test(fact))).toBe(true);
    expect(draft.knownFacts.some((fact) => /Bard Mesh used consistently/i.test(fact))).toBe(true);
    expect(draft.knownFacts.some((fact) => /Extra visualization time before fixation/i.test(fact))).toBe(true);
    expect(draft.whyItMatters.length).toBeGreaterThan(20);
    expect(draft.whyItMatters).toMatch(/worth validating during the debrief/i);
    expect(draft.knownFacts.join(" ")).not.toMatch(/observation access approved|scheduler identified|credentialing|procedure focus:|primary commercial wedge|apple product used surgery/i);
    expect(JSON.stringify(draft)).not.toMatch(/apple product has been your consistent choice/i);
    expect(draft.suggestedQuestions.length).toBeLessThanOrEqual(6);
    expect(
      draft.suggestedQuestions.some((q) =>
        /visualization|efficiency, confidence|evaluation or product review|next step would feel appropriate/i.test(q),
      ),
    ).toBe(true);
    expect(draft.suggestedLearnItems.length).toBeGreaterThan(0);
  });

  it("sources What We Need To Learn from the validated still-need-to-learn pipeline", () => {
    const draft = buildJohnAppleWorkspaceDraft();

    const pipelinePrompts = buildSharedUnresolvedEvidenceQuestions({
      caseRow: JOHN_APPLE_CURRENT_CASE,
      priorCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
      providerContact: JOHN_APPLE_PROVIDER_CONTACT,
      activities: JOHN_APPLE_CURRENT_ACTIVITIES,
      maxItems: OBSERVATION_INTELLIGENCE_STILL_NEED_MAX,
    });

    expect(pipelinePrompts.length).toBeGreaterThan(0);
    expect(draft.suggestedLearnItems.length).toBeGreaterThan(0);
    expect(draft.suggestedLearnItems.join(" ")).not.toMatch(/\blisten for\b/i);
    expect(draft.suggestedLearnItems.some((item) => /Ask whether|Confirm whether|Do you feel|Did anything|Are any/i.test(item))).toBe(
      true,
    );
    // Generic confirm-objective pool must not leak in when pipeline gaps exist.
    expect(draft.suggestedLearnItems.some((item) => /surgeon's perspective/i.test(item))).toBe(false);
  });

  it("auto-generates a hypothesis draft from observed patterns", () => {
    const draft = buildJohnAppleWorkspaceDraft();

    expect(draft.suggestedHypothesis.length).toBeGreaterThan(40);
    expect(draft.suggestedHypothesis).toMatch(/visualization/i);
    expect(draft.suggestedHypothesis).not.toMatch(/workflow friction/i);
  });
});

describe("debriefPrepareWorkspace snapshot", () => {
  it("persists and restores rep-owned fields", () => {
    const merged = mergeDebriefPrepareWorkspaceSnapshot(null, {
      hypothesis: "Visualization is the wedge.",
      desiredOutcome: "360_experience",
      learnItems: [{ id: "learn-1", text: "Does this matter to him?", checked: true }],
      questionCards: [{ id: "question-1", text: "How often does this occur?", used: false }],
      meetingNotes: "Karen may join.",
    });

    const saved = readDebriefPrepareWorkspaceSnapshot(merged);
    expect(saved?.hypothesis).toBe("Visualization is the wedge.");
    expect(saved?.desiredOutcome).toBe("360_experience");
    expect(saved?.learnItems[0]?.checked).toBe(true);
    expect(saved?.questionCards[0]?.text).toBe("How often does this occur?");

    const draft = buildJohnAppleWorkspaceDraft();
    const view = buildDebriefPrepareWorkspaceView({ draft, saved });
    expect(view.hypothesis).toBe("Visualization is the wedge.");
    expect(view.learnItems.some((item) => item.checked)).toBe(true);
  });

  it("pre-fills the auto-generated hypothesis when the rep has not written one", () => {
    const draft = buildJohnAppleWorkspaceDraft();

    const fresh = buildDebriefPrepareWorkspaceView({ draft, saved: null });
    expect(fresh.hypothesis).toBe(draft.suggestedHypothesis);
    expect(fresh.hypothesis.length).toBeGreaterThan(0);

    const savedBlank = readDebriefPrepareWorkspaceSnapshot(
      mergeDebriefPrepareWorkspaceSnapshot(null, { meetingNotes: "Karen may join." }),
    );
    const blankHypothesis = buildDebriefPrepareWorkspaceView({ draft, saved: savedBlank });
    expect(blankHypothesis.hypothesis).toBe(draft.suggestedHypothesis);
  });
});
