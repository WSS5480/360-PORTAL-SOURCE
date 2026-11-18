import { describe, expect, it } from "vitest";

import { buildObservationCaseIntelligenceSections } from "./buildObservationCaseBriefingView";
import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";
import { buildProviderCaseIntelligenceRollup } from "./buildProviderObservationIntelligenceRollup";
import { buildProviderRollupCapturedSignals } from "./observationRepPresentationCopy";

const INCOMPLETE_CASE = {
  id: "case-2",
  case_type: "observation",
  status: "confirmed",
  live_observation_competitors: "They were using Bard Mesh again",
  live_observation_workflow:
    "There were a couple points where they spent extra time getting a better view before placing fixation",
  live_observation_product_fit:
    "The early opportunity may be around visualization and fixation workflow",
  live_observation_staff_process: "The team seemed organized",
};

const PRIOR_COMPLETED_CASE = {
  id: "case-1",
  case_type: "observation",
  status: "completed",
  observation_completed_at: "2026-06-01T12:00:00Z",
  live_observation_competitors: "Bard Mesh observed during case",
  live_observation_workflow: "Extra visualization time before fixation",
};

describe("buildProviderRollupCapturedSignals", () => {
  it("matches Case Intelligence this-observation copy when no cases are complete", () => {
    const presentation = buildObservationRepPresentationView({
      caseRow: INCOMPLETE_CASE,
      priorCases: [],
    });
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: INCOMPLETE_CASE,
      priorCases: [],
    });
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: { id: "provider-1", first_name: "John", last_name: "Apple" },
      providerId: "provider-1",
      cases: [INCOMPLETE_CASE],
    });

    expect(rollup?.completedCount).toBe(0);
    expect(presentation.whatWeKnow).toHaveLength(0);
    expect(sections.thisCaseItems.length).toBeGreaterThan(0);

    const providerSignals = buildProviderRollupCapturedSignals({
      findings: presentation.learningView.knownFindings,
      providerName: "John Apple",
      completedCount: 0,
      primaryCaseComplete: false,
      currentCaseHasCapturedNotes: true,
      thisObservationLines: sections.thisCaseItems.map((item) => item.text),
    });

    expect(rollup?.emergingCaseSignals).toEqual(providerSignals);
    expect(providerSignals.join("\n")).not.toMatch(/in \d+ completed case/i);
    for (const item of sections.thisCaseItems) {
      expect(providerSignals).toContain(item.text);
    }
  });

  it("only counts completed cases that match program progress", () => {
    const presentation = buildObservationRepPresentationView({
      caseRow: INCOMPLETE_CASE,
      priorCases: [PRIOR_COMPLETED_CASE],
    });
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: INCOMPLETE_CASE,
      priorCases: [PRIOR_COMPLETED_CASE],
    });
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: { id: "provider-1", first_name: "John", last_name: "Apple" },
      providerId: "provider-1",
      cases: [PRIOR_COMPLETED_CASE, INCOMPLETE_CASE],
    });

    expect(rollup?.completedCount).toBe(1);
    const signals = (rollup?.emergingCaseSignals ?? []).join("\n");
    expect(signals).toMatch(/in 1 completed case/i);
    expect(sections.thisCaseItems.length).toBeGreaterThan(0);
    for (const item of sections.thisCaseItems) {
      expect(signals).toContain(item.text);
    }
    expect(signals).not.toMatch(/Staff frustrations related to workflow delays/i);
    expect(presentation.whatWeKnow.length).toBeGreaterThan(0);
  });

  it("never shows completed-case phrasing when program completed count is zero", () => {
    const presentation = buildObservationRepPresentationView({
      caseRow: INCOMPLETE_CASE,
      priorCases: [],
    });

    expect(presentation.learningView.programCasesLabel).toBe("0 of 5 observation cases complete");
    expect(presentation.whatWeKnow).toHaveLength(0);

    const allText = [
      ...presentation.thisObservation.items.map((item) => item.text),
      ...presentation.whatWeKnow.map((item) => item.text),
    ].join("\n");

    expect(allText).not.toMatch(/in 1 completed case/i);
    expect(allText).not.toMatch(/Staff frustrations related to workflow delays/i);
  });
});
