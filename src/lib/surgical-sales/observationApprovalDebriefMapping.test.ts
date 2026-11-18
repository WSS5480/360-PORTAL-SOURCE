import { describe, expect, it } from "vitest";
import { ANDY_KAREN_DEBRIEF_REGRESSION_NOTE } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import { enrichDebriefMappingWithPartialLeads } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import {
  applyObservationApprovalDebriefGuardrails,
  assessObservationAccessFromDebrief,
  buildObservationAccessDebriefPersistValue,
  debriefExplicitlyApprovesObservation,
  debriefIndicatesObservationInterest,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { resolveObservationApprovalStatus } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryFieldStatus";

function emptyMapping(): LogUpdateOpenAiMapping {
  return {
    summary: "",
    confidence: "medium",
    reasoning: "",
    source_scope: "debrief",
    operational_signals: [],
    confirmed_updates: [],
    partial_updates: [],
    still_to_validate: [],
    recommended_next_moves: [],
    do_not_update: [],
  };
}

describe("observationApprovalDebriefMapping", () => {
  it("does not treat openness as explicit approval", () => {
    expect(debriefExplicitlyApprovesObservation("He is open to observation.")).toBe(false);
    expect(debriefExplicitlyApprovesObservation("No resistance to observation.")).toBe(false);
    expect(debriefExplicitlyApprovesObservation("Didn't shut down the observation idea.")).toBe(false);
    expect(debriefExplicitlyApprovesObservation("Can probably observe later once credentialed.")).toBe(
      false,
    );
    expect(debriefIndicatesObservationInterest("He is open to observation.")).toBe(true);
  });

  it("detects explicit approval phrases", () => {
    expect(debriefExplicitlyApprovesObservation("Observation approved for next month.")).toBe(
      true,
    );
    expect(debriefExplicitlyApprovesObservation("She approved observation yesterday.")).toBe(true);
    expect(debriefExplicitlyApprovesObservation("We can observe starting Tuesday.")).toBe(true);
    expect(debriefExplicitlyApprovesObservation("Cleared to observe after credentialing.")).toBe(
      true,
    );
  });

  it("maps Andy/Karen regression debrief as interest without approval", () => {
    const assessment = assessObservationAccessFromDebrief(ANDY_KAREN_DEBRIEF_REGRESSION_NOTE);
    expect(assessment.observationInterest).toBe(true);
    expect(assessment.observationApprovalExplicit).toBe(false);
    expect(assessment.accessPathIdentified).toBe("partial");
    expect(assessment.blockers).toContain("approval_pathway");

    const value = buildObservationAccessDebriefPersistValue(assessment);
    expect(value).toMatch(/Observation interest: Yes/);
    expect(value).toMatch(/Observation approval: No/);
    expect(value).toMatch(/Access path identified: Partial/);
  });

  it("downgrades false confirmed observation approval from AI output", () => {
    const guarded = applyObservationApprovalDebriefGuardrails(
      {
        ...emptyMapping(),
        confirmed_updates: [
          {
            domain: "or_access",
            label: "Observation approved",
            value: "Provider open to observation and not opposed.",
            confidence: "high",
            save_target: "provider",
            reasoning: "Openness detected",
          },
        ],
      },
      ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
    );
    expect(guarded.confirmed_updates.some((c) => c.domain === "or_access")).toBe(false);
    const partial = guarded.partial_updates.find((p) => p.domain === "or_access");
    expect(partial?.value).toMatch(/Observation approval: No/);
  });

  it("enrichment never implies approval on Andy/Karen note", () => {
    const enriched = enrichDebriefMappingWithPartialLeads(
      emptyMapping(),
      ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
    );
    const partial = enriched.partial_updates.find((p) => p.domain === "or_access");
    expect(partial?.value).toMatch(/Observation approval: No/);
    expect(enriched.confirmed_updates.some((c) => c.domain === "or_access")).toBe(false);
  });

  it("discussed feasibility does not validate pathway approval", () => {
    const contact = {
      provider_observation_feasibility: "discussed",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "debrief",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
      },
    };
    expect(resolveObservationApprovalStatus(contact)).toBe(DISCOVERY_FIELD_STATUS.captured);
    expect(hasProviderObservationApprovalValidated(contact)).toBe(false);
  });
});
