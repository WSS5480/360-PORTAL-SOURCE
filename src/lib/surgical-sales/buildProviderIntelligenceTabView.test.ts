import { describe, expect, it } from "vitest";
import {
  buildProviderIntelligenceTabView,
  resolveProviderIntelligenceProgressiveState,
} from "./buildProviderIntelligenceTabView";
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

describe("resolveProviderIntelligenceProgressiveState", () => {
  it("returns new_provider when no evidence exists", () => {
    expect(resolveProviderIntelligenceProgressiveState({ contact: {}, engagements: [], cases: [] })).toBe(
      "new_provider",
    );
  });

  it("returns discovery_started when field evidence exists without observation intel", () => {
    expect(
      resolveProviderIntelligenceProgressiveState({
        contact: {},
        engagements: [engagement({})],
        cases: [],
      }),
    ).toBe("discovery_started");
  });

  it("returns observation_completed when observation cases have field intel", () => {
    expect(
      resolveProviderIntelligenceProgressiveState({
        contact: {},
        cases: [
          {
            case_type: "observation",
            live_observation_clinical_pain_points: "Long turnover between cases",
          },
        ],
      }),
    ).toBe("observation_completed");
  });

  it("returns debrief_completed when debrief is completed", () => {
    expect(
      resolveProviderIntelligenceProgressiveState({
        contact: {},
        engagements: [engagement({ debrief_completed: true })],
        cases: [
          {
            case_type: "observation",
            live_observation_clinical_pain_points: "Long turnover between cases",
          },
        ],
      }),
    ).toBe("debrief_completed");
  });
});

describe("buildProviderIntelligenceTabView", () => {
  it("builds knowledge workspace view for new providers without workflow CTAs", () => {
    const view = buildProviderIntelligenceTabView({
      contact: {},
      providerId: "prov-1",
    });

    expect(view.stateId).toBe("new_provider");
    expect(view.pageTitle).toBe("Provider Intelligence");
    expect(view.subtitle).toMatch(/Accumulated field intelligence/i);
    expect(view.emptyKnowledgeMessage).toBe("No field intelligence captured yet.");
    expect(view.timeline).toEqual([]);
    expect(view.timelineEmptyLabel).toBe("No activity yet.");
  });

  it("does not embed profile fields or recommended actions in the tab view", () => {
    const view = buildProviderIntelligenceTabView({
      contact: {
        provider_intelligence_field_metadata: {
          provider_evaluation_openness: {
            source_type: "engagement",
            source_label: "Intro call debrief",
            updated_at: "2026-06-01T12:00:00Z",
            evidence_text: "Open to observation in Q3",
          },
        },
        provider_evaluation_openness: "open",
      },
      providerId: "prov-1",
      specialty: "Orthopedics",
      organizationName: "Metro Surgical Center",
      engagements: [engagement({})],
    });

    expect(view.stateId).toBe("discovery_started");
    expect(view.emptyKnowledgeMessage).toBeNull();
    expect("recommendedAction" in view).toBe(false);
    expect("known" in view).toBe(false);
    expect("sectionTitle" in view).toBe(false);
  });

  it("keeps evidence trail items for observation and debrief states", () => {
    const observationView = buildProviderIntelligenceTabView({
      contact: {},
      providerId: "prov-1",
      cases: [
        {
          id: "case-1",
          case_type: "observation",
          live_observation_clinical_pain_points: "Instrument tray delays",
        },
      ],
      engagements: [engagement({})],
    });

    expect(observationView.stateId).toBe("observation_completed");
    expect(observationView.timeline.some((item) => item.title.length > 0)).toBe(true);

    const debriefView = buildProviderIntelligenceTabView({
      contact: {
        provider_preference_card_signals: "Strong fit for revision trays",
        provider_intelligence_field_metadata: {
          provider_preference_card_signals: {
            source_type: "engagement",
            source_label: "Observation debrief",
            updated_at: "2026-06-01T12:00:00Z",
            lifecycle_state: "validated",
            validated_at: "2026-06-01T12:00:00Z",
          },
        },
      },
      providerId: "prov-1",
      engagements: [engagement({ id: "eng-debrief", debrief_completed: true })],
    });

    expect(debriefView.stateId).toBe("debrief_completed");
    expect(debriefView.emptyKnowledgeMessage).toBeNull();
  });
});
