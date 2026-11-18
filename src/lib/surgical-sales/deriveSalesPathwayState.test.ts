import { describe, expect, it } from "vitest";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  deriveSalesPathwayState,
  salesPathwayWorkspaceHref,
} from "./deriveSalesPathwayState";
import {
  countObservedProcedures,
  isDebriefStageComplete,
  isDiscoveryReadyForObserve,
} from "./pathwayStageGates";
import {
  SALES_PATHWAY_MIN_COMMITTED_CASES,
  SALES_PATHWAY_MIN_OBSERVATIONS,
} from "./salesPathwayCanonical";
import {
  discoveryAccessReadyContact,
  productFitValidatedContact,
  withPathwayValidatedFields,
} from "./salesPathwayTestFixtures";

describe("deriveSalesPathwayState", () => {
  it("1. discovery advances to observe when observation approval is validated", () => {
    const blocked = deriveSalesPathwayState({
      providerId: "p1",
      contact: { provider_relationship_stage: "early_discovery" },
      engagements: [],
      cases: [],
    });
    expect(blocked.currentStage).toBe("discovery");
    expect(isDiscoveryReadyForObserve({ contact: {}, engagements: [], cases: [] })).toBe(false);

    const readyContact = discoveryAccessReadyContact();
    expect(
      isDiscoveryReadyForObserve({ contact: readyContact, engagements: [], cases: [] }),
    ).toBe(true);

    const approvedOnly = deriveSalesPathwayState({
      providerId: "p1",
      contact: readyContact,
      engagements: [],
      cases: [],
    });
    expect(approvedOnly.currentStage).toBe("observe");

    const scheduledWithoutApproval = deriveSalesPathwayState({
      providerId: "p1",
      contact: { provider_relationship_stage: "early_discovery" },
      engagements: [
        {
          id: "e1",
          engagement_type: "or_observation",
          status: "scheduled",
          engagement_type_label: "OR observation",
        },
      ],
      cases: [],
    });
    expect(scheduledWithoutApproval.currentStage).toBe("discovery");
  });

  it("2. observe stage tracks observed case count", () => {
    const cases = Array.from({ length: 3 }, (_, i) => ({
      id: `c${i}`,
      case_type: "observation",
      status: "completed",
    }));

    const count = countObservedProcedures({
      contact: discoveryAccessReadyContact(),
      cases,
      engagements: [],
    });
    expect(count).toBe(3);

    const state = deriveSalesPathwayState({
      providerId: "p1",
      contact: discoveryAccessReadyContact(),
      cases,
      engagements: [],
    });
    expect(state.currentStage).toBe("observe");
    expect(state.observedCaseCount).toBe(3);
    expect(state.evidenceByStage.observe.find((s) => s.id === "observed_case_count")?.summary).toBe(
      "3 / 5",
    );
  });

  it("3. product/case commitment conversation is blocked before debrief and validated fit", () => {
    const contact = {
      ...productFitValidatedContact(),
      provider_rep_strategy_notes: "Notes reviewed with surgeon after OR week.",
      provider_workflow_pain_points: "Turnover delays",
      provider_strategic_goal: "Reduce turnover",
      provider_preference_card_signals: "QTi tray interest",
      provider_evaluation_openness: "evaluation_interest",
    };

    const beforeFive = deriveSalesPathwayState({
      providerId: "p1",
      contact,
      cases: Array.from({ length: 4 }, (_, i) => ({
        id: `c${i}`,
        case_type: "observation",
        status: "completed",
      })),
      engagements: [],
    });
    expect(beforeFive.productSalesAllowed).toBe(false);
    expect(beforeFive.currentStage).toBe("observe");

    const afterFiveNoDebrief = deriveSalesPathwayState({
      providerId: "p1",
      contact,
      cases: Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
        id: `c${i}`,
        case_type: "observation",
        status: "completed",
      })),
      engagements: [],
    });
    expect(afterFiveNoDebrief.observedCaseCount).toBeGreaterThanOrEqual(SALES_PATHWAY_MIN_OBSERVATIONS);
    expect(afterFiveNoDebrief.productSalesAllowed).toBe(false);
    expect(afterFiveNoDebrief.currentStage).toBe("debrief");

    const afterDebrief = deriveSalesPathwayState({
      providerId: "p1",
      contact,
      cases: Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
        id: `c${i}`,
        case_type: "observation",
        status: "completed",
      })),
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
        },
      ],
    });
    expect(afterDebrief.productSalesAllowed).toBe(true);
  });

  it("4. debrief stage requires debrief completion and validated product fit before evaluation", () => {
    const observeComplete = {
      providerId: "p1",
      contact: productFitValidatedContact({
        provider_preference_card_signals: "QTi workflow interest",
        provider_evaluation_openness: "evaluation_interest",
      }),
      cases: Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
        id: `c${i}`,
        case_type: "observation",
        status: "completed",
      })),
      engagements: [] as ProviderEngagementSummary[],
    };

    const withoutDebrief = deriveSalesPathwayState(observeComplete);
    expect(withoutDebrief.currentStage).toBe("debrief");
    expect(
      isDebriefStageComplete({
        contact: observeComplete.contact,
        cases: observeComplete.cases,
        engagements: observeComplete.engagements,
      }),
    ).toBe(false);

    const withDebrief = deriveSalesPathwayState({
      ...observeComplete,
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
        },
      ],
    });
    expect(withDebrief.currentStage).toBe("evaluation");
  });

  it("5. evaluation stage unlocks after debrief completion and validated product fit", () => {
    const debriefReady = {
      providerId: "p1",
      contact: withPathwayValidatedFields(
        productFitValidatedContact({
          provider_rep_strategy_notes: "Notes reviewed with surgeon.",
          provider_workflow_pain_points: "Staff coordination gaps",
          provider_strategic_goal: "Improve turnover",
          provider_preference_card_signals: "Interested in QTi workflow",
          provider_evaluation_openness: "evaluation_interest",
        }),
        [
          "provider_workflow_pain_points",
          "provider_strategic_goal",
          "provider_preference_card_signals",
          "provider_evaluation_openness",
          "provider_rep_strategy_notes",
        ],
      ),
      cases: Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
        id: `c${i}`,
        case_type: "observation",
        status: "completed",
      })),
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
        },
      ] as ProviderEngagementSummary[],
    };

    expect(
      isDebriefStageComplete({
        contact: debriefReady.contact,
        cases: debriefReady.cases,
        engagements: debriefReady.engagements,
      }),
    ).toBe(true);

    const state = deriveSalesPathwayState(debriefReady);
    expect(state.currentStage).toBe("evaluation");
    expect(state.completedStageRequirements).toContain("debrief");
  });

  it("6. case commitment requires selected product and target case count", () => {
    const experienceReady = {
      providerId: "p1",
      contact: withPathwayValidatedFields(
        productFitValidatedContact({
          provider_rep_strategy_notes: "360 lab completed; strong fit.",
          provider_workflow_pain_points: "Validated pain points",
          provider_strategic_goal: "Track outcomes",
          provider_preference_card_signals: "QTi",
          provider_evaluation_openness: "trial_ready",
          provider_procedure_focus: "Lap chole",
          provider_champion_potential: "Dr. Lee advocates",
          provider_follow_up_approach: "Biweekly cadence",
        }),
        [
          "provider_workflow_pain_points",
          "provider_strategic_goal",
          "provider_preference_card_signals",
          "provider_evaluation_openness",
          "provider_procedure_focus",
          "provider_champion_potential",
          "provider_follow_up_approach",
          "provider_rep_strategy_notes",
        ],
      ),
      cases: [
        ...Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
          id: `c${i}`,
          case_type: "observation",
          status: "completed",
        })),
      ],
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
        },
        {
          id: "exp1",
          engagement_type: "office_visit_360",
          status: "completed",
          engagement_type_label: "360 Experience",
        },
      ] as ProviderEngagementSummary[],
    };

    const blocked = deriveSalesPathwayState(experienceReady);
    expect(blocked.currentStage).toBe("commitment");
    expect(blocked.readinessByStage.commitment.complete).toBe(false);
    expect(blocked.pathwayAdvancement.blockedSummary).toMatch(/committed product/i);

    const committed = deriveSalesPathwayState({
      ...experienceReady,
      contact: {
        ...experienceReady.contact,
        provider_case_volume_estimate: `${SALES_PATHWAY_MIN_COMMITTED_CASES} cases per month`,
        provider_observation_cadence_preference: "Weekly",
      },
      cases: [
        ...(experienceReady.cases ?? []),
        ...Array.from({ length: SALES_PATHWAY_MIN_COMMITTED_CASES }, (_, i) => ({
          id: `ps-${i}`,
          case_type: "product_support",
          status: "completed",
        })),
      ],
    });
    expect(committed.readinessByStage.commitment.complete).toBe(true);
    expect(committed.currentStage).toBe("outcomes");
  });

  it("7. outcomes stage requires outcomes to track", () => {
    const atOutcomes = deriveSalesPathwayState({
      providerId: "p1",
      contact: withPathwayValidatedFields(
        productFitValidatedContact({
          provider_rep_strategy_notes: "Notes reviewed with surgeon. QTi draft in progress",
          provider_workflow_pain_points: "Pain",
          provider_strategic_goal: "Reduce infection rate",
          provider_preference_card_signals: "QTi",
          provider_evaluation_openness: "trial_ready",
          provider_procedure_focus: "Lap",
          provider_champion_potential: "Champion",
          provider_follow_up_approach: "Weekly",
          provider_case_volume_estimate: "12 cases monthly",
          provider_observation_cadence_preference: "Weekly",
          provider_dissatisfaction_areas: "Legacy tray delays",
        }),
        [
          "provider_workflow_pain_points",
          "provider_strategic_goal",
          "provider_preference_card_signals",
          "provider_evaluation_openness",
          "provider_procedure_focus",
          "provider_champion_potential",
          "provider_follow_up_approach",
          "provider_rep_strategy_notes",
          "provider_case_volume_estimate",
          "provider_observation_cadence_preference",
          "provider_dissatisfaction_areas",
        ],
      ),
      cases: [
        ...Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
          id: `c${i}`,
          case_type: "observation",
          status: "completed",
        })),
        ...Array.from({ length: SALES_PATHWAY_MIN_COMMITTED_CASES }, (_, i) => ({
          id: `ps-${i}`,
          case_type: "product_support",
          status: "completed",
        })),
      ],
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
        },
        {
          id: "exp1",
          engagement_type: "office_visit_360",
          status: "completed",
          engagement_type_label: "360 Experience",
        },
      ] as ProviderEngagementSummary[],
    });

    expect(atOutcomes.currentStage).toBe("outcomes");
    expect(atOutcomes.readinessByStage.outcomes.complete).toBe(true);
    expect(atOutcomes.completedStageRequirements).toContain("outcomes");

    const missingOutcomes = deriveSalesPathwayState({
      providerId: "p1",
      contact: discoveryAccessReadyContact(),
      cases: [],
      engagements: [],
    });
    expect(missingOutcomes.currentStage).not.toBe("outcomes");
  });

  it("8. overview workspace href is read-only navigation into canonical workspace", () => {
    const href = salesPathwayWorkspaceHref("p1", "discovery", "scheduling_owner");
    expect(href).toContain("tab=operations");
    expect(href).toContain("workspace=discovery_mapping");
    expect(href).toContain("mapping=1");
    expect(href).toContain("signal=scheduling_owner");

    const a = deriveSalesPathwayState({
      providerId: "p1",
      contact: {},
    });
    const b = deriveSalesPathwayState({
      providerId: "p1",
      contact: {},
    });
    expect(a).toEqual(b);
  });
});
