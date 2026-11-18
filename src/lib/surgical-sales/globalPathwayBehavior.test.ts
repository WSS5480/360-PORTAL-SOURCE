import { describe, expect, it } from "vitest";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildProviderDiscoveryProgressView } from "@/lib/surgical-sales/buildProviderDiscoveryProgressView";
import {
  buildProviderPathwayNextAction,
  resolveScheduledFieldBlockerAction,
} from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import {
  deriveProviderEvaluationPath,
  EVALUATION_SCHEDULE_ACTION_LABELS,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import { buildProviderIntelligenceTabView } from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import { buildProviderOverviewWhatWeKnow } from "@/lib/surgical-sales/buildProviderOverviewWhatWeKnow";
import { deriveSalesPathwayState } from "@/lib/surgical-sales/deriveSalesPathwayState";
import {
  discoveryAnswerQualifiesForScore,
  promotedFieldQualifiesForScore,
} from "@/lib/surgical-sales/executionLeaderboardSafeguards";
import { shouldShowAbstractMetrics } from "@/lib/surgical-sales/fieldIntelligenceMetricPolicy";
import {
  deriveGatedPathwayStage,
  isDiscoveryReadyForObserve,
  isEvaluationStageComplete,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import { buildProviderDirectoryReadinessGaps } from "@/lib/surgical-sales/providerDirectoryOperations";
import {
  formatObservationProgressLine,
  providerDebriefReady,
  resolveObservationStageNextActionLabel,
} from "@/lib/surgical-sales/providerObservationProgress";
import { deriveEvidenceBasedProviderFieldMission } from "@/lib/surgical-sales/relationshipStageProgression";
import {
  SALES_PATHWAY_EVALUATION_ACTIVITIES,
  SALES_PATHWAY_MIN_OBSERVATIONS,
  SALES_PATHWAY_STAGE_LABELS,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import { assessProviderSalesExecutionNeedsAction } from "@/lib/surgical-sales/salesExecutionNeedsAction";
import {
  discoveryAccessReadyContact,
  PATHWAY_VALIDATED_FIELD_META,
  productFitValidatedContact,
  withPathwayValidatedFields,
} from "@/lib/surgical-sales/salesPathwayTestFixtures";

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    specialty: "Orthopedics",
    primary_organization_name: "Metro Surgical",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    ...overrides,
  };
}

function observationCases(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `obs-${i + 1}`,
    case_type: "observation",
    status: "completed",
  }));
}

function gateInput(overrides: Partial<PathwayGateInput> = {}): PathwayGateInput {
  return {
    contact: {},
    cases: [],
    engagements: [],
    ...overrides,
  };
}

describe("global pathway behavior regressions", () => {
  it("1. new provider starts in discovery without fake intelligence or admin checklists", () => {
    const provider = baseProvider({ relationship_pathway_stage_id: "discovery" });
    const contact = {};

    expect(deriveGatedPathwayStage(gateInput({ contact }))).toBe("discovery");
    expect(SALES_PATHWAY_STAGE_LABELS.discovery).toBe("Discovery");

    const discoveryProgress = buildProviderDiscoveryProgressView({ contact });
    expect(discoveryProgress.statusLabel).toBe("Permission Not Yet Confirmed");
    expect(discoveryProgress.approved).toBe(false);

    const intelligence = buildProviderIntelligenceTabView({
      contact,
      providerId: "p1",
    });
    expect(intelligence.stateId).toBe("new_provider");
    expect(intelligence.emptyKnowledgeMessage).toMatch(/No field intelligence/i);
    expect(intelligence.timeline).toHaveLength(0);

    expect(
      shouldShowAbstractMetrics({ hasFieldEvidence: false, confirmedCount: 0 }),
    ).toBe(false);

    const whatWeKnow = buildProviderOverviewWhatWeKnow({
      signalGroups: [],
      contact,
    });
    expect(whatWeKnow.validating).toHaveLength(0);

    const readinessGaps = buildProviderDirectoryReadinessGaps(provider);
    const gapLabels = readinessGaps.map((gap) => gap.label.toLowerCase());
    expect(gapLabels.some((label) => /scheduler|credential|checklist|mapping/.test(label))).toBe(
      false,
    );

    expect(buildProviderPathwayNextAction(provider).label).toBe("Create Intro Call");
  });

  it("2. intro call scheduled keeps discovery stage and prepares the intro call", () => {
    const provider = baseProvider({
      relationship_pathway_stage_id: "discovery",
      upcoming_engagement_count: 1,
      upcoming_engagement: {
        id: "e-intro",
        href: "/portal/sales/engagements/e-intro",
        engagement_type: "intro_call",
        type_label: "Intro Meeting",
        datetime_label: "Jun 5",
        location_label: "Virtual",
        primary_goal: "Validate workflow fit",
        open_items: [],
      },
    });

    expect(deriveGatedPathwayStage(gateInput({ contact: providerContact(provider) }))).toBe(
      "discovery",
    );
    expect(buildProviderPathwayNextAction(provider).label).toBe("Prepare Intro Call");
  });

  it("3. intro completed with scheduler identified and credentialing unknown requests approval without credentialing blocker", () => {
    const contact = {
      last_contacted_at: "2026-06-01T12:00:00.000Z",
      provider_observation_coordinator_contact: "Karen — OR scheduling",
      provider_observation_credentialing_needed: "unknown",
      provider_credentialing_status: "unknown",
      provider_intelligence_field_metadata: {
        provider_observation_coordinator_contact: PATHWAY_VALIDATED_FIELD_META,
      },
    };
    const provider = baseProvider({
      relationship_pathway_stage_id: "discovery",
      last_contacted_at: contact.last_contacted_at,
      ...contact,
    });

    expect(deriveGatedPathwayStage(gateInput({ contact }))).toBe("discovery");
    expect(isDiscoveryReadyForObserve(gateInput({ contact }))).toBe(false);
    expect(buildProviderDiscoveryProgressView({ contact }).statusLabel).toBe(
      "Permission Not Yet Confirmed",
    );
    expect(buildProviderPathwayNextAction(provider).label).toBe("Request Observation Approval");
    expect(resolveScheduledFieldBlockerAction(provider)).toBeNull();
  });

  it("4. observation approval unlocks observation stage with schedule-first next action", () => {
    const contact = discoveryAccessReadyContact();
    const provider = baseProvider({
      relationship_pathway_stage_id: "discovery",
      ...contact,
    });

    expect(isDiscoveryReadyForObserve(gateInput({ contact }))).toBe(true);
    expect(deriveGatedPathwayStage(gateInput({ contact }))).toBe("observe");
    expect(buildProviderDiscoveryProgressView({ contact }).statusLabel).toBe("Permission Confirmed");
    expect(buildProviderPathwayNextAction(provider).label).toBe("Add First Observation Case");
    expect(resolveObservationStageNextActionLabel(0)).toBe("Add First Observation Case");
  });

  it("5. four observations stay in observation with 4/5 progress and schedule #5 action", () => {
    const contact = discoveryAccessReadyContact();
    const cases = observationCases(4);
    const provider = baseProvider({
      relationship_pathway_stage_id: "observe",
      observation_count: 4,
      recent_case_count: 4,
      ...contact,
    });

    expect(deriveGatedPathwayStage(gateInput({ contact, cases }))).toBe("observe");
    expect(formatObservationProgressLine(4)).toBe("Observation Program Progress: 4 / 5");
    expect(buildProviderPathwayNextAction(provider).label).toBe("Add Observation Case 5");
    expect(providerDebriefReady(provider)).toBe(false);
    expect(deriveEvidenceBasedProviderFieldMission(provider)).not.toBe("Debrief Ready");
  });

  it("6. five observations advance to debrief with prepare debrief next action", () => {
    const contact = discoveryAccessReadyContact();
    const cases = observationCases(SALES_PATHWAY_MIN_OBSERVATIONS);
    const provider = baseProvider({
      relationship_pathway_stage_id: "debrief",
      observation_count: SALES_PATHWAY_MIN_OBSERVATIONS,
      recent_case_count: SALES_PATHWAY_MIN_OBSERVATIONS,
      ...contact,
    });

    expect(deriveGatedPathwayStage(gateInput({ contact, cases }))).toBe("debrief");
    expect(buildProviderPathwayNextAction(provider).label).toBe("Prepare Debrief");
    expect(resolveObservationStageNextActionLabel(SALES_PATHWAY_MIN_OBSERVATIONS)).toBe(
      "Prepare Debrief",
    );
  });

  it("7. debrief completed with validated product fit opens evaluation with all evaluation paths", () => {
    const contact = withPathwayValidatedFields(
      productFitValidatedContact({
        provider_rep_strategy_notes: "Notes reviewed with surgeon.",
        provider_preference_card_signals: "Strong QTi fit",
        provider_evaluation_openness: "evaluation_interest",
      }),
      [
        "provider_rep_strategy_notes",
        "provider_preference_card_signals",
        "provider_evaluation_openness",
      ],
    );
    const cases = observationCases(SALES_PATHWAY_MIN_OBSERVATIONS);
    const engagements: ProviderEngagementSummary[] = [
      {
        id: "d1",
        engagement_type: "provider_debrief",
        status: "completed",
        debrief_completed: true,
      },
    ];
    const input = { providerId: "p1", contact, cases, engagements };

    const state = deriveSalesPathwayState(input);
    expect(state.currentStage).toBe("evaluation");
    expect(SALES_PATHWAY_STAGE_LABELS.evaluation).toBe("Evaluation");

    for (const path of SALES_PATHWAY_EVALUATION_ACTIVITIES) {
      expect(EVALUATION_SCHEDULE_ACTION_LABELS[path]).toBeTruthy();
    }

    expect(deriveProviderEvaluationPath({ contact })).toBe("Product Trial");
    expect(
      deriveProviderEvaluationPath({
        contact,
        upcomingEngagement: {
          id: "e360",
          href: "/portal/sales/engagements/e360",
          engagement_type: "office_visit_360",
          type_label: "360 Experience",
          datetime_label: "Jul 1",
          location_label: "Clinic",
          primary_goal: "Hands-on experience",
          open_items: [],
        },
      }),
    ).toBe("360 Experience");
  });

  it("8. product trial completes evaluation without 360 experience before commitment", () => {
    const contact = productFitValidatedContact({
      provider_rep_strategy_notes: "Debrief complete; product trial is next.",
      provider_preference_card_signals: "QTi workflow interest",
      provider_evaluation_openness: "trial_ready",
    });
    const casesBeforeTrial = observationCases(SALES_PATHWAY_MIN_OBSERVATIONS);
    const debriefEngagements: ProviderEngagementSummary[] = [
      {
        id: "d1",
        engagement_type: "provider_debrief",
        status: "completed",
        debrief_completed: true,
      },
    ];
    const beforeTrial = gateInput({
      contact,
      cases: casesBeforeTrial,
      engagements: debriefEngagements,
    });

    expect(deriveGatedPathwayStage(beforeTrial)).toBe("evaluation");
    expect(isEvaluationStageComplete(beforeTrial)).toBe(false);
    expect(
      debriefEngagements.some((e) => e.engagement_type === "office_visit_360"),
    ).toBe(false);

    const casesAfterTrial = [
      ...casesBeforeTrial,
      { id: "trial-1", case_type: "product_support", status: "completed" },
    ];
    const afterTrial = gateInput({
      contact,
      cases: casesAfterTrial,
      engagements: debriefEngagements,
    });

    expect(
      isEvaluationStageComplete(afterTrial),
      "product trial alone should complete evaluation without optional intelligence fields",
    ).toBe(true);
    expect(deriveGatedPathwayStage(afterTrial)).toBe("commitment");
    expect(
      deriveSalesPathwayState({
        providerId: "p1",
        contact: afterTrial.contact,
        cases: casesAfterTrial,
        engagements: debriefEngagements,
      }).currentStage,
    ).toBe("commitment");
  });

  it("9. missing optional access intelligence does not alert, block, or penalize pathway or leaderboard", () => {
    const contact = discoveryAccessReadyContact({
      provider_observation_access_path: "",
      provider_observation_credentialing_needed: "",
      provider_credentialing_status: "",
    });
    delete (contact.provider_intelligence_field_metadata as Record<string, unknown>)
      .provider_observation_access_path;
    delete (contact.provider_intelligence_field_metadata as Record<string, unknown>)
      .provider_observation_credentialing_needed;
    delete (contact.provider_intelligence_field_metadata as Record<string, unknown>)
      .provider_credentialing_status;

    const provider = baseProvider({
      relationship_pathway_stage_id: "discovery",
      ...contact,
    });

    expect(resolveScheduledFieldBlockerAction(provider)).toBeNull();
    expect(assessProviderSalesExecutionNeedsAction(provider).needsAction).toBe(false);
    expect(assessProviderSalesExecutionNeedsAction(provider).items).toHaveLength(0);
    expect(isDiscoveryReadyForObserve(gateInput({ contact }))).toBe(true);
    expect(deriveGatedPathwayStage(gateInput({ contact }))).toBe("observe");

    expect(discoveryAnswerQualifiesForScore("facility_vendor_pathway")).toBe(false);
    expect(discoveryAnswerQualifiesForScore("provider_observation_access_path")).toBe(false);
    expect(promotedFieldQualifiesForScore("Access pathway mapped")).toBe(false);
    expect(promotedFieldQualifiesForScore("Credentialing path identified")).toBe(false);
  });

  it("10. interest alone does not advance past debrief; validated fit does without optional intel blockers", () => {
    const cases = observationCases(SALES_PATHWAY_MIN_OBSERVATIONS);
    const debriefEngagements: ProviderEngagementSummary[] = [
      {
        id: "d1",
        engagement_type: "provider_debrief",
        status: "completed",
        debrief_completed: true,
      },
    ];

    const withoutFit = gateInput({
      contact: discoveryAccessReadyContact({
        provider_preference_card_signals: "Strong interest",
        provider_evaluation_openness: "evaluation_interest",
      }),
      cases,
      engagements: debriefEngagements,
    });
    expect(deriveGatedPathwayStage(withoutFit)).toBe("debrief");

    const withFit = gateInput({
      contact: productFitValidatedContact(),
      cases,
      engagements: debriefEngagements,
    });
    expect(deriveGatedPathwayStage(withFit)).toBe("evaluation");
    expect(
      deriveSalesPathwayState({
        providerId: "p1",
        contact: withFit.contact,
        cases,
        engagements: debriefEngagements,
      }).pathwayAdvancement.currentStage,
    ).toBe("evaluation");
    expect(
      deriveSalesPathwayState({
        providerId: "p1",
        contact: withFit.contact,
        cases,
        engagements: debriefEngagements,
      }).blockers.some((b) => /procedure|champion|preference|strategy/i.test(b.label)),
    ).toBe(false);
  });
});

function providerContact(provider: ProviderDirectoryRow): Record<string, unknown> {
  return provider as Record<string, unknown>;
}
