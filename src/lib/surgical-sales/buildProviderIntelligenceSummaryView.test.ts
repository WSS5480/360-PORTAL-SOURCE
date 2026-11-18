import { describe, expect, it } from "vitest";
import { PROVIDER_INTELLIGENCE_SECTION_LABELS } from "./providerIntelligenceArchitecture";
import { buildProviderIntelligenceSummaryView } from "./buildProviderIntelligenceSummaryView";
import type {
  ProviderPlanningCompletion,
  ProviderPlanningSectionCompletion,
} from "./providerPlanningCompletion";

const CONFIDENCE_UNKNOWN = {
  confidence: "unknown" as const,
  confidence_score: 0,
  confidence_progress: 0,
  anchors_confirmed: false,
  recency_factor: 0.5,
  attribution_factor: 0,
};

function section(
  partial: Omit<ProviderPlanningSectionCompletion, keyof typeof CONFIDENCE_UNKNOWN> &
    Partial<ProviderPlanningSectionCompletion>,
): ProviderPlanningSectionCompletion {
  return { ...CONFIDENCE_UNKNOWN, ...partial };
}

function planning(overrides: Partial<ProviderPlanningCompletion> = {}): ProviderPlanningCompletion {
  return {
    filled: 0,
    total: 16,
    percent: 0,
    status: "not_started",
    sections_complete: 0,
    sections_total: 5,
    sections: [
      section({
        id: "clinical_workflow",
        label: PROVIDER_INTELLIGENCE_SECTION_LABELS.clinical_workflow,
        status: "not_started",
        filled: 0,
        total: 5,
        percent: 0,
        last_updated_at: null,
      }),
      section({
        id: "or_environment",
        label: PROVIDER_INTELLIGENCE_SECTION_LABELS.or_environment,
        status: "not_started",
        filled: 0,
        total: 4,
        percent: 0,
        last_updated_at: null,
      }),
      section({
        id: "relationship_intelligence",
        label: PROVIDER_INTELLIGENCE_SECTION_LABELS.relationship_intelligence,
        status: "not_started",
        filled: 0,
        total: 6,
        percent: 0,
        last_updated_at: null,
      }),
      section({
        id: "commercial_signals",
        label: PROVIDER_INTELLIGENCE_SECTION_LABELS.commercial_signals,
        status: "not_started",
        filled: 0,
        total: 4,
        percent: 0,
        last_updated_at: null,
      }),
      section({
        id: "observation_readiness",
        label: PROVIDER_INTELLIGENCE_SECTION_LABELS.observation_readiness,
        status: "not_started",
        filled: 0,
        total: 4,
        percent: 0,
        last_updated_at: null,
      }),
    ],
    ...overrides,
  };
}

describe("buildProviderIntelligenceSummaryView", () => {
  it("prioritizes strategic copy over raw counters for sparse providers", () => {
    const view = buildProviderIntelligenceSummaryView({
      contact: {},
      planning: planning(),
    });

    expect(view.interpretation).toContain("reliable read on how they operate");
    expect(view.focusSummary).toMatch(/What we still need to learn:/);
    expect(view.recommendation).toMatch(/On the next touch, learn /);
    expect(view.recommendation.toLowerCase()).toMatch(/observation|procedure/);
    expect(view.missingAreaLabels.length).toBeGreaterThan(0);
    expect(view.tracks).toHaveLength(3);
    expect(view.tracks[0].percent).toBe(0);
  });

  it("uses strong-state copy when planning is complete", () => {
    const view = buildProviderIntelligenceSummaryView({
      contact: {
        provider_procedure_focus: "ACL",
        provider_technique_preferences: "Arthroscopic",
        provider_case_volume_estimate: "12/mo",
        provider_or_team_dynamics: "Strong PA partnership",
        provider_current_vendors: "Incumbent A",
        provider_competitive_products: "Competitor B",
        preferred_contact_method: "text",
        provider_communication_style: "Direct",
        influence_level: "decision_maker",
        provider_decision_maker_status: "yes",
        provider_champion_potential: "high",
        provider_follow_up_approach: "Monthly lunch",
        provider_rep_strategy_notes: "Land preference card",
        provider_strategic_goal: "Expand line",
        provider_observation_feasibility: "easy",
        provider_observation_credentialing_needed: "cleared",
        provider_ideal_observation_cases: "ACL|meniscus",
        provider_observation_access_path: "coordinator|notes:Committee monthly review",
        provider_observation_coordinator_contact: "Jane OR — jane@hospital.org",
        provider_observation_cadence_preference: "per_case",
        provider_observation_best_days_case_types: "tuesday|high_volume|notes:AM block",
        provider_first_observation_questions: "workflow_fit|notes:Validate preference card timing",
        provider_credentialing_status: "cleared",
        provider_evaluation_openness: "open|notes:Evaluating Q3",
        provider_technique_detail: "Robotic docking preference documented",
        provider_workflow_pain_points: "turnover|notes:Long turnover between cases",
        provider_responsiveness: "same_day",
        provider_dissatisfaction_areas: "support|notes:Slow clinical support",
        provider_preference_card_signals: "committee|notes:Needs committee review",
        provider_support_expectations: "high_touch",
      },
      planning: planning({
        status: "complete",
        percent: 95,
        sections: planning().sections.map((s) => ({
          ...s,
          status: "complete" as const,
          confidence: "validated" as const,
          confidence_score: 95,
          confidence_progress: 100,
          filled: s.total,
          percent: 100,
        })),
      }),
    });

    expect(view.overallStatus).toBe("Strong");
    expect(view.interpretation).toContain("solid commercial read");
    expect(view.focusSummary).toBeNull();
    expect(view.recommendation).toContain("Keep clinical");
  });
});
