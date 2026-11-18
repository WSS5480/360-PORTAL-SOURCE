import { describe, expect, it } from "vitest";

import { buildCaseIntelligenceBriefLead, buildProviderCaseIntelligenceRollup } from "./buildProviderObservationIntelligenceRollup";
import { buildObservationCaseBriefingRepView } from "./observationCaseBriefingPresentation";
import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";

const PROVIDER_CONTACT = {
  id: "provider-apple",
  first_name: "John",
  last_name: "Apple",
  provider_competitive_products: "Bard Mesh — needs confirmation during observation",
};

const CURRENT_CASE = {
  id: "case-current",
  case_type: "observation",
  status: "confirmed",
  provider_name: "John Apple",
  live_observation_competitors: "Bard Mesh noted again today",
  live_observation_workflow:
    "There were a couple points where they spent extra time getting a better view before placing fixation",
  live_observation_clinical_pain_points: "Provider concern: Clinical frustration during visualization",
};

const PRIOR_COMPLETED_CASES = [
  {
    id: "prior-1",
    case_type: "observation",
    status: "completed",
    live_observation_competitors: "Bard Mesh observed",
    activities: [
      {
        activity_type: "note",
        body: "They were using Bard Mesh again during the case.",
      },
    ],
  },
  {
    id: "prior-2",
    case_type: "observation",
    status: "completed",
    activities: [
      {
        activity_type: "note",
        body: "Still using Bard Mesh on hernia cases.",
      },
    ],
  },
  {
    id: "prior-3",
    case_type: "observation",
    status: "completed",
    activities: [
      {
        activity_type: "note",
        body: "Bard Mesh used again. Provider frustration during visualization before fixation.",
      },
    ],
  },
  {
    id: "prior-4",
    case_type: "observation",
    status: "completed",
    live_observation_staff_process: "Uncertainty Stocked Products",
    activities: [
      {
        activity_type: "note",
        body: "Staff needed to verify stocked products before proceeding.",
      },
    ],
  },
];

function bardMeshCountLine(lines: string[]): string | undefined {
  return lines.find((line) => /bard mesh/i.test(line));
}

describe("observation intelligence cross-surface consistency", () => {
  const sharedInput = {
    caseRow: CURRENT_CASE,
    activities: [
      {
        activity_type: "note",
        body: "They were using Bard Mesh again. Extra visualization time before fixation.",
      },
    ],
    priorCases: PRIOR_COMPLETED_CASES,
    providerContact: PROVIDER_CONTACT,
  };

  it("aligns Bard Mesh counts across briefing, intelligence, and provider rollup when activities are nested on cases", () => {
    const briefing = buildObservationCaseBriefingRepView(sharedInput);
    const intelligence = buildObservationRepPresentationView(sharedInput);
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: PROVIDER_CONTACT,
      providerId: "provider-apple",
      cases: [CURRENT_CASE, ...PRIOR_COMPLETED_CASES],
    });

    const briefingBard = bardMeshCountLine(briefing.knownSoFar);
    const intelligenceBard = bardMeshCountLine(intelligence.whatWeKnow.map((item) => item.text));
    const providerBard = bardMeshCountLine(rollup?.emergingCaseSignals ?? []);

    expect(briefingBard).toMatch(/3 completed/);
    // Case Intelligence "What We Know" uses the program-fraction count style; the
    // completed-case count (3) must stay aligned with the other surfaces.
    expect(intelligenceBard).toMatch(/seen in 3 of 4 observations/);
    expect(providerBard).toMatch(/3 completed/);
  });

  it("aligns top still-need line across case and provider surfaces", () => {
    const briefing = buildObservationCaseBriefingRepView(sharedInput);
    const intelligence = buildObservationRepPresentationView(sharedInput);
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: PROVIDER_CONTACT,
      providerId: "provider-apple",
      cases: [CURRENT_CASE, ...PRIOR_COMPLETED_CASES],
    });

    expect(briefing.stillNeedToLearn[0]).toBe(intelligence.stillNeedToLearn[0]?.text);
    expect(rollup?.needsMoreEvidence[0]).toBe(intelligence.stillNeedToLearn[0]?.text);
  });

  it("does not double-wrap provider frustration copy on briefing", () => {
    const briefing = buildObservationCaseBriefingRepView(sharedInput);
    const joined = briefing.knownSoFar.join("\n");

    expect(joined).toMatch(/expressed frustration during/i);
    expect(joined).not.toMatch(/concern around frustration/i);
    expect(joined).not.toMatch(/frustration around frustration/i);
    expect(joined).not.toMatch(/product availability observed/i);
  });

  it("uses product-specific completed count in AI field brief lead, not total program progress", () => {
    const completedCases = PRIOR_COMPLETED_CASES.map((row) => ({
      ...row,
      status: "completed",
    }));
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: PROVIDER_CONTACT,
      providerId: "provider-apple",
      cases: [...completedCases, { ...CURRENT_CASE, status: "completed" }],
    });
    expect(rollup?.completedCount).toBe(5);
    expect(rollup?.productEvidence?.completedObservationCount).toBe(3);

    const brief = buildCaseIntelligenceBriefLead(rollup!);
    expect(brief).toMatch(/3 completed observations have captured Bard Mesh use/i);
    expect(brief).not.toMatch(/5 completed observations have captured/i);
    expect(brief).not.toMatch(/4 completed observations have captured/i);
  });
});
