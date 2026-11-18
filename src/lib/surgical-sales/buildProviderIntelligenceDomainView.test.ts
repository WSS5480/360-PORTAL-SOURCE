import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceDomainView } from "./buildProviderIntelligenceDomainView";
import { INTELLIGENCE_DOMAIN_LOCKED_MESSAGE } from "./buildProviderIntelligenceDomainView";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";

function engagement(partial: Partial<ProviderEngagementSummary>): ProviderEngagementSummary {
  return {
    id: "eng-1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status: "planned",
    status_label: "Planned",
    pre_call_filled: 0,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: "Planned",
    ...partial,
  };
}

function traceableMeta(sourceLabel: string, extra: Record<string, unknown> = {}) {
  return {
    source_type: "engagement",
    source_label: sourceLabel,
    updated_at: "2026-06-01T12:00:00Z",
    evidence_text: "Coordinator confirmed Tuesday observation window.",
    ...extra,
  };
}

describe("buildProviderIntelligenceDomainView", () => {
  it("locks all domains when no traceable evidence exists", () => {
    const view = buildProviderIntelligenceDomainView({
      contact: {},
      providerId: "prov-1",
      engagements: [],
      cases: [],
    });

    expect(view.domains.length).toBeGreaterThan(0);
    expect(view.domains.every((domain) => domain.stateId === "locked")).toBe(true);
    expect(view.domains[0]?.knownFacts).toEqual([]);
    expect(view.domains[0]?.confirmedFindings).toEqual([]);
  });

  it("shows building state with known facts and unknowns from traceable captures", () => {
    const view = buildProviderIntelligenceDomainView({
      contact: {
        provider_observation_feasibility: "easy",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: traceableMeta("Intro call debrief"),
        },
      },
      providerId: "prov-1",
      engagements: [engagement({})],
    });

    const access = view.domains.find((domain) => domain.id === "access_readiness");
    expect(access?.stateId).toBe("building");
    expect(access?.knownFacts.length).toBeGreaterThan(0);
    expect(access?.knownFacts[0]?.label).toBe("Observation Interest Captured");
    expect(access?.knownFacts[0]?.source.kind).toMatch(/engagement|debrief|note/);
    expect(access?.unknowns.length).toBeGreaterThan(0);
    expect(access?.learningObjective).toBeTruthy();
    expect(access?.confirmedFindings).toEqual([]);
  });

  it("never shows conclusions on locked domains", () => {
    const view = buildProviderIntelligenceDomainView({
      contact: {
        provider_procedure_focus: "Spine deformity",
      },
      providerId: "prov-1",
      engagements: [engagement({})],
    });

    const clinical = view.domains.find((domain) => domain.id === "clinical_fit");
    expect(clinical?.stateId).toBe("locked");
    expect(clinical?.knownFacts).toEqual([]);
    expect(clinical?.learningObjective).toBeNull();
  });

  it("keeps unvalidated field captures out of confirmed findings", () => {
    const view = buildProviderIntelligenceDomainView({
      contact: {
        provider_observation_feasibility: "interested",
        provider_preference_card_signals: "Curious about workflow impact",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: traceableMeta("Intro call debrief"),
          provider_preference_card_signals: traceableMeta("Observation debrief"),
        },
      },
      providerId: "prov-1",
      engagements: [engagement({ debrief_completed: true })],
    });

    const access = view.domains.find((domain) => domain.id === "access_readiness");
    const clinical = view.domains.find((domain) => domain.id === "clinical_fit");
    expect(access?.knownFacts.some((fact) => fact.label === "Observation Interest Captured")).toBe(true);
    expect(access?.confirmedFindings).toEqual([]);
    expect(clinical?.confirmedFindings).toEqual([]);
  });

  it("shows validated domain with confirmed findings and supporting observations", () => {
    const view = buildProviderIntelligenceDomainView({
      contact: {
        provider_champion_potential: "high",
        provider_intelligence_field_metadata: {
          provider_champion_potential: traceableMeta("Observation debrief", {
            lifecycle_state: "validated",
            validated_at: "2026-06-01T12:00:00Z",
          }),
        },
      },
      providerId: "prov-1",
      engagements: [engagement({ debrief_completed: true })],
    });

    const champion = view.domains.find((domain) => domain.id === "champion_landscape");
    expect(champion?.stateId).toBe("validated");
    expect(champion?.confirmedFindings.length).toBeGreaterThan(0);
    expect(champion?.supportingObservations.length).toBeGreaterThan(0);
    expect(champion?.recommendedAction).toBeTruthy();
    expect(champion?.unknowns).toEqual([]);
  });

  it("exports locked message copy", () => {
    expect(INTELLIGENCE_DOMAIN_LOCKED_MESSAGE).toBe("Not enough information");
  });
});
