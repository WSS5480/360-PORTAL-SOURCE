import { describe, expect, it } from "vitest";

import { buildProviderCaseIntelligenceRollup } from "./buildProviderObservationIntelligenceRollup";
import { buildProviderIntelligenceKnowledgeDashboardView } from "./buildProviderIntelligenceKnowledgeDashboardView";
import { buildObservationCaseBriefingRepView } from "./observationCaseBriefingPresentation";
import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";
import {
  buildSharedUnresolvedEvidenceQuestions,
  PROVIDER_UNRESOLVED_QUESTIONS_MAX,
} from "./buildSharedUnresolvedEvidenceQuestions";
import { containsOntologyLearningObjectiveLabel } from "./observationLearningObjectiveDisplay";
import { BRIEFING_ENGINE_TERM_PATTERN } from "./observationCaseBriefingPresentation";
const STAFF_AVAILABILITY_CASE = {
  caseRow: {
    id: "case-current",
    case_type: "observation",
    status: "confirmed",
    provider_name: "Dr. Example",
    live_observation_staff_process: "Uncertainty Stocked Products",
  },
  activities: [
    {
      activity_type: "note",
      body: "Staff needed to verify stocked products again before the case could proceed.",
    },
  ],
  priorCases: [
    {
      id: "case-prior",
      case_type: "observation",
      status: "completed",
      live_observation_staff_process: "Uncertainty Stocked Products",
      notes: "Staff verified stocked products before proceeding.",
    },
  ],
  providerContact: { first_name: "Pat", last_name: "Example" },
};

describe("buildSharedUnresolvedEvidenceQuestions", () => {
  it("returns the same top question for briefing, intelligence, and provider rollup", () => {
    const { caseRow, priorCases, activities, providerContact } = STAFF_AVAILABILITY_CASE;

    const shared = buildSharedUnresolvedEvidenceQuestions({
      caseRow,
      priorCases,
      providerContact,
      activities,
    });
    const briefing = buildObservationCaseBriefingRepView({
      caseRow,
      priorCases,
      providerContact,
      activities,
    });
    const intelligence = buildObservationRepPresentationView({
      caseRow,
      priorCases,
      providerContact,
      activities,
    });
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: providerContact,
      providerId: "provider-example",
      cases: [caseRow, ...priorCases],
    });
    const dashboard = buildProviderIntelligenceKnowledgeDashboardView({
      contact: providerContact,
      providerId: "provider-example",
      cases: [caseRow, ...priorCases],
    });

    expect(shared.length).toBeGreaterThan(0);
    expect(briefing.stillNeedToLearn[0]).toBe(shared[0]);
    expect(intelligence.stillNeedToLearn[0]?.text).toBe(shared[0]);
    expect(rollup?.needsMoreEvidence[0]).toBe(shared[0]);
    expect(dashboard.pulse.biggestUnknown).toBe(shared[0]);
  });

  it("caps provider still missing at three and matches intelligence prefix", () => {
    const { caseRow, priorCases, activities, providerContact } = STAFF_AVAILABILITY_CASE;
    const intelligence = buildObservationRepPresentationView({
      caseRow,
      priorCases,
      providerContact,
      activities,
    });
    const rollup = buildProviderCaseIntelligenceRollup({
      contact: providerContact,
      providerId: "provider-example",
      cases: [caseRow, ...priorCases],
    });

    expect(rollup?.needsMoreEvidence.length).toBeLessThanOrEqual(PROVIDER_UNRESOLVED_QUESTIONS_MAX);
    expect(rollup?.needsMoreEvidence).toEqual(
      intelligence.stillNeedToLearn.slice(0, PROVIDER_UNRESOLVED_QUESTIONS_MAX).map((item) => item.text),
    );
  });

  it("does not expose raw ontology labels", () => {
    const lines = buildSharedUnresolvedEvidenceQuestions(STAFF_AVAILABILITY_CASE);
    const joined = lines.join("\n");

    expect(containsOntologyLearningObjectiveLabel(joined)).toBe(false);
    expect(joined).not.toMatch(BRIEFING_ENGINE_TERM_PATTERN);
    expect(lines.length).toBeGreaterThan(0);
  });
});
