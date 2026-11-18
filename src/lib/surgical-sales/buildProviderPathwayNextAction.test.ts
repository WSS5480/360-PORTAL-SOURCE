import { describe, expect, it } from "vitest";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderPathwayNextAction,
  resolveScheduledFieldBlockerAction,
} from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import { PREPARE_DEBRIEF_LABEL } from "@/lib/surgical-sales/providerObservationProgress";
import { discoveryAccessReadyContact } from "@/lib/surgical-sales/salesPathwayTestFixtures";

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

function introScheduled(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return baseProvider({
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
    ...overrides,
  });
}

describe("buildProviderPathwayNextAction", () => {
  describe("discovery", () => {
    it("shows Create Intro Call when no intro exists", () => {
      const action = buildProviderPathwayNextAction(baseProvider());
      expect(action.label).toBe("Create Intro Call");
      expect(action.ctaLabel).toBeUndefined();
    });

    it("routes Create Intro Call to the canonical engagement creation page (W1 dead link)", () => {
      const action = buildProviderPathwayNextAction(baseProvider());
      expect(action.label).toBe("Create Intro Call");
      const href = new URL(String(action.ctaHref), "http://local");
      expect(href.pathname).toBe("/portal/sales/engagements/new");
      expect(href.searchParams.get("provider_id")).toBe("p1");
      expect(href.searchParams.get("organization_id")).toBe("org-1");
      expect(href.searchParams.get("engagement_type")).toBe("intro_call");
      // The old provider-scoped path does not exist as a route.
      expect(String(action.ctaHref)).not.toContain("/providers/p1/engagements/new");
    });

    it("omits organization_id from Create Intro Call href when provider has no organization", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({ primary_organization_id: null }),
      );
      expect(action.label).toBe("Create Intro Call");
      const href = new URL(String(action.ctaHref), "http://local");
      expect(href.pathname).toBe("/portal/sales/engagements/new");
      expect(href.searchParams.get("provider_id")).toBe("p1");
      expect(href.searchParams.get("organization_id")).toBeNull();
    });

    it("never shows Create Intro Call when intro is scheduled", () => {
      const action = buildProviderPathwayNextAction(introScheduled());
      expect(action.label).toBe("Prepare Intro Call");
      expect(action.label).not.toBe("Create Intro Call");
      expect(action.ctaLabel).toBe("Open Briefing");
      expect(action.ctaHref).toContain("e-intro");
    });

    it("shows Request Observation Approval after intro completed without approval", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "discovery",
          last_contacted_at: new Date().toISOString(),
          provider_observation_feasibility: "interested",
        }),
        {
          engagements: [
            {
              id: "e-intro",
              engagement_type: "intro_call",
              status: "completed",
              engagement_type_label: "Intro call",
              status_label: "Completed",
            } as import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary,
          ],
        },
      );
      expect(action.label).toBe("Request Observation Approval");
    });

    it("shows Add First Observation Case when observation is approved", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "discovery",
          ...discoveryAccessReadyContact(),
        }),
      );
      expect(action.label).toBe("Add First Observation Case");
      expect(action.ctaHref).toContain("case_type=observation");
    });

    it("shows Open Next Observation when approved and an observation case exists", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "discovery",
          ...discoveryAccessReadyContact(),
        }),
        {
          cases: [
            {
              id: "case-obs",
              case_type: "observation",
              status: "scheduled",
            },
          ],
        },
      );
      expect(action.label).toBe("Open Next Observation");
      expect(action.ctaHref).toContain("case-obs");
    });
  });

  describe("observation", () => {
    it("shows schedule next observation and progress for 1–4 completed", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "observe",
          observation_count: 2,
          recent_case_count: 1,
          ...discoveryAccessReadyContact(),
        }),
      );
      expect(action.label).toBe("Add Next Observation Case");
      expect(action.observationProgress).toEqual({ completed: 2, total: 5 });
    });

    it("opens active observation case when one is already on file", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "observe",
          observation_count: 1,
          recent_case_count: 1,
          ...discoveryAccessReadyContact(),
        }),
        {
          cases: [
            {
              id: "case-active",
              case_type: "observation",
              status: "scheduled",
            },
          ],
        },
      );
      expect(action.label).toBe("Open Next Observation");
      expect(action.ctaHref).toContain("case-active");
      expect(action.observationProgress).toEqual({ completed: 1, total: 5 });
    });

    it("does not show capture notes instead of scheduling during the observation series", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "observe",
          observation_count: 2,
          recent_case_count: 2,
          ...discoveryAccessReadyContact(),
        }),
      );
      expect(action.label).toBe("Add Next Observation Case");
    });

    it("shows add observation case #5 when four are complete", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "observe",
          observation_count: 4,
          recent_case_count: 4,
          ...discoveryAccessReadyContact(),
        }),
      );
      expect(action.label).toBe("Add Observation Case 5");
      expect(action.observationProgress).toEqual({ completed: 4, total: 5 });
    });

    it("shows Prepare Debrief after five observations", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "observe",
          observation_count: 5,
          recent_case_count: 5,
          ...discoveryAccessReadyContact(),
        }),
      );
      expect(action.label).toBe(PREPARE_DEBRIEF_LABEL);
      expect(action.observationProgress).toEqual({ completed: 5, total: 5 });
    });
  });

  describe("debrief", () => {
    it("shows Prepare Debrief when debrief is due and none is scheduled", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({ relationship_pathway_stage_id: "debrief", observation_count: 5 }),
      );
      expect(action.label).toBe(PREPARE_DEBRIEF_LABEL);
    });

    it("shows Prepare Debrief when debrief is scheduled", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "debrief",
          upcoming_engagement_count: 1,
          upcoming_engagement: {
            id: "e-debrief",
            href: "/portal/sales/engagements/e-debrief",
            engagement_type: "provider_debrief",
            type_label: "Observation Debrief",
            datetime_label: "Jun 12",
            location_label: "Virtual",
            primary_goal: "Review observations",
            open_items: [],
          },
        }),
      );
      expect(action.label).toBe(PREPARE_DEBRIEF_LABEL);
      expect(action.ctaLabel).toBe("Open Briefing");
    });
  });

  describe("evaluation and commitment", () => {
    it("shows evaluation path and schedule action in evaluation stage", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({ relationship_pathway_stage_id: "evaluation" }),
      );
      expect(action.label).toBe("Choose Evaluation Path");
    });

    it("shows product trial schedule action when path is selected and opportunities are linked", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "evaluation",
          linked_opportunities_count: 1,
          provider_evaluation_path: "Product Trial",
        } as never),
      );
      expect(action.evaluationPath).toBe("Product Trial");
      expect(action.label).toBe("Schedule product trial case");
    });

    it("shows product trial prepare when evaluation touch is scheduled", () => {
      const action = buildProviderPathwayNextAction(
        baseProvider({
          relationship_pathway_stage_id: "evaluation",
          provider_evaluation_path: "Product Trial",
          upcoming_engagement_count: 1,
          upcoming_engagement: {
            id: "e-demo",
            href: "/portal/sales/engagements/e-demo",
            engagement_type: "product_demo",
            type_label: "Product Evaluation",
            datetime_label: "Jun 15",
            location_label: "Metro Surgical",
            primary_goal: "Confirm product interest",
            open_items: [],
          },
        } as never),
      );
      expect(action.evaluationPath).toBe("Product Trial");
      expect(action.label).toBe("Prepare product trial case");
    });

    it("shows commitment and outcomes actions", () => {
      expect(
        buildProviderPathwayNextAction(baseProvider({ relationship_pathway_stage_id: "commitment" }))
          .label,
      ).toBe("Confirm Structured Use");
      expect(
        buildProviderPathwayNextAction(
          baseProvider({
            relationship_pathway_stage_id: "commitment",
            provider_commitment_confirmed: "yes",
            provider_commitment_type: "use_next_case",
          } as never),
        ).label,
      ).toBe("Move to Outcomes");
      expect(
        buildProviderPathwayNextAction(baseProvider({ relationship_pathway_stage_id: "outcomes" }))
          .label,
      ).toBe("Log Outcome Update");
    });
  });

  describe("scheduled field blockers", () => {
    it("does not override milestone next actions with optional intelligence gaps", () => {
      expect(
        resolveScheduledFieldBlockerAction(
          baseProvider({
            relationship_pathway_stage_id: "discovery",
          }),
        ),
      ).toBeNull();

      expect(
        buildProviderPathwayNextAction(
          baseProvider({
            relationship_pathway_stage_id: "discovery",
            upcoming_engagement_count: 1,
            provider_observation_feasibility: "approved",
            provider_intelligence_field_metadata: {
              provider_observation_feasibility: {
                source_type: "profile",
                source_label: "Test",
                updated_at: "2026-05-20T12:00:00.000Z",
                validated_at: "2026-05-20T12:00:00.000Z",
              },
            },
            upcoming_engagement: {
              id: "e-obs",
              href: "/portal/sales/engagements/e-obs",
              engagement_type: "or_visit",
              type_label: "Observation",
              datetime_label: "Jun 8",
              location_label: "Metro Surgical",
              primary_goal: "Observe",
              open_items: [],
            },
          }),
        ).label,
      ).toBe("Add First Observation Case");
    });
  });
});
