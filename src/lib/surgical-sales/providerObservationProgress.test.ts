import { describe, expect, it } from "vitest";



import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

import {

  buildProviderObservationProgress,

  deriveProviderObservationCount,

  formatProviderObservationProgressLabel,

  providerDebriefReady,

  providerObservationProgressFromRow,

  resolveNextObservationDateLabel,

  resolveObservationProgressRecommendedStep,
  resolveObservationStageNextActionLabel,

} from "./providerObservationProgress";

import { providerNeedsDebrief } from "@/lib/surgical-sales/salesExecutionNeedsAction";



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

    last_activity_at: new Date().toISOString(),

    ...overrides,

  };

}



describe("providerObservationProgress", () => {

  it("formats observation progress as count / total", () => {

    expect(formatProviderObservationProgressLabel(3, 5)).toBe("3 / 5");

    expect(formatProviderObservationProgressLabel(5, 5)).toBe("5 / 5");

  });



  it("derives observation count from observation_count field", () => {

    expect(deriveProviderObservationCount(baseProvider({ observation_count: 4 }))).toBe(4);

    expect(deriveProviderObservationCount(baseProvider({ recent_case_count: 3 }))).toBe(0);

  });



  it("recommends helpful next steps by observation count", () => {
    expect(resolveObservationProgressRecommendedStep(0)).toContain("Schedule first observation");
    expect(resolveObservationProgressRecommendedStep(2)).toContain("remaining observations");
    expect(resolveObservationProgressRecommendedStep(5)).toContain("generate provider debrief");
  });

  it("resolves first and final observation schedule labels", () => {
    expect(resolveObservationStageNextActionLabel(0)).toBe("Add First Observation Case");
    expect(resolveObservationStageNextActionLabel(2)).toBe("Add Next Observation Case");
    expect(resolveObservationStageNextActionLabel(4)).toBe("Add Observation Case 5");
    expect(resolveObservationStageNextActionLabel(5)).toBe("Prepare Debrief");
  });

  it("requires five observations before debrief readiness", () => {

    expect(providerDebriefReady(baseProvider({ observation_count: 4 }))).toBe(false);

    expect(providerDebriefReady(baseProvider({ observation_count: 5 }))).toBe(true);

  });



  it("does not flag debrief needed before five observations", () => {

    expect(

      providerNeedsDebrief(

        baseProvider({

          recent_case_count: 2,

          planning_completion: {

            status: "in_progress",

            percent: 75,

            sections: [

              {

                id: "observation_readiness",

                label: "Observation readiness",

                status: "complete",

                confidence: "validated",

                confidence_progress: 100,

              },

              {

                id: "clinical_workflow",

                label: "Clinical workflow",

                status: "complete",

                confidence: "confirmed",

                confidence_progress: 100,

              },

              {

                id: "org_environment",

                label: "Facility context",

                status: "complete",

                confidence: "confirmed",

                confidence_progress: 100,

              },

            ],

          },

        }),

      ),

    ).toBe(false);

  });



  it("flags debrief needed after five observations", () => {

    expect(

      providerNeedsDebrief(

        baseProvider({

          observation_count: 5,

          relationship_pathway_stage_id: "debrief",

        }),

      ),

    ).toBe(true);

  });



  it("builds progress view with remaining count and next observation date", () => {

    expect(buildProviderObservationProgress(3)).toEqual({

      completedObservationCount: 3,

      completed: 3,

      total: 5,

      debriefReady: false,

      summaryLabel: "3 / 5",

      displayLabel: "Observation Program Progress: 3 / 5",

      label: "3 / 5",

      remaining: 2,

      nextObservationDateLabel: null,

    });

    expect(buildProviderObservationProgress(5).debriefReady).toBe(true);

    expect(buildProviderObservationProgress(5).remaining).toBe(0);

  });



  it("resolves next observation date from upcoming observation engagement", () => {

    const progress = providerObservationProgressFromRow(

      baseProvider({

        observation_count: 2,

        relationship_pathway_stage_id: "observe",

        upcoming_engagement: {

          id: "e1",

          href: "/portal/sales/engagements/e1",

          engagement_type: "or_visit",

          type_label: "Observation",

          datetime_label: "Jun 12",

          location_label: "Metro OR",

          primary_goal: "Observe workflow",

          open_items: [],

        },

      }),

    );



    expect(progress.summaryLabel).toBe("2 / 5");

    expect(progress.remaining).toBe(3);

    expect(progress.nextObservationDateLabel).toBe("Jun 12");

  });



  it("resolves next observation date from scheduled engagements list", () => {

    expect(

      resolveNextObservationDateLabel({

        engagements: [

          {

            id: "e1",

            engagement_type: "or_visit",

            status: "scheduled",

            engagement_date: "2099-06-12",

          } as never,

        ],

      }),

    ).toMatch(/Jun 12, 2099/);

  });

});

