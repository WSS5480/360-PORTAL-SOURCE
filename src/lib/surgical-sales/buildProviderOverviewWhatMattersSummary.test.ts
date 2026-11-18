import { describe, expect, it } from "vitest";

import { buildProviderOverviewWhatMattersSummary } from "./buildProviderOverviewWhatMattersSummary";



describe("buildProviderOverviewWhatMattersSummary", () => {

  it("excludes intelligence-gap and absence bullets from sparse accounts", () => {

    const lines = buildProviderOverviewWhatMattersSummary({

      providerId: "prov-1",

      relationshipStage: "early_discovery",

      newEngagementHref: "/engagements/new",

      intelligenceHref: "/providers/prov-1?tab=intelligence",

      engagements: [],

      contact: {},

    });



    expect(lines.length).toBeLessThanOrEqual(5);

    expect(lines.some((line) => /limited procedural understanding/i.test(line.text))).toBe(false);

    expect(lines.some((line) => /no engagements/i.test(line.text))).toBe(false);

    expect(lines.some((line) => /credentialing path still open/i.test(line.text))).toBe(false);

  });



  it("surfaces operational mission context without clinical signal inventories", () => {

    const lines = buildProviderOverviewWhatMattersSummary({

      providerId: "prov-2",

      relationshipStage: "early_discovery",

      newEngagementHref: "/engagements/new",

      intelligenceHref: "/providers/prov-2?tab=intelligence",

      engagements: [],

      contact: {

        provider_procedure_focus: "Robotic ventral hernia repair",

        provider_scheduling_contact: "Karen — OR scheduling",

      },

    });



    expect(lines.some((line) => /robotic ventral/i.test(line.text))).toBe(false);

    expect(lines.some((line) => /scheduler/i.test(line.text))).toBe(true);

  });



  it("shows linked scheduler name instead of stale debrief narrative on overview", () => {
    const lines = buildProviderOverviewWhatMattersSummary({
      providerId: "prov-apple",
      relationshipStage: "active_evaluation",
      newEngagementHref: "/engagements/new",
      intelligenceHref: "/providers/prov-apple?tab=intelligence",
      engagements: [],
      contact: {
        provider_scheduling_contact:
          "He mentioned that Karen in his office usually helps coordinate his OR schedule and would probably be the best person to start with for finding a good case date.",
        provider_observation_coordinator_contact: "Karen · Scheduler · Observation scheduling",
        provider_intelligence_field_metadata: {
          provider_observation_coordinator_contact: {
            lifecycle_state: "validated",
            validated_at: "2026-06-02T00:00:00Z",
          },
        },
      },
    });

    const schedulerLine = lines.find((line) => /scheduler/i.test(line.text));
    expect(schedulerLine?.text).toMatch(/Scheduler:\s*Karen/i);
    expect(schedulerLine?.text).not.toMatch(/mentioned that Karen/i);
  });

  it("hides credentialing and scheduler admin lines after a completed observation case", () => {
    const lines = buildProviderOverviewWhatMattersSummary({
      providerId: "prov-post-obs",
      relationshipStage: "active_evaluation",
      newEngagementHref: "/engagements/new",
      intelligenceHref: "/providers/prov-post-obs?tab=intelligence",
      engagements: [],
      cases: [{ id: "obs-1", case_type: "observation", status: "completed" }],
      contact: {
        provider_observation_credentialing_needed: "Credentialing required before vendor can observe",
        provider_observation_feasibility: "Credentialing required before vendor can observe",
        provider_scheduling_contact: "Jennifer in his office handles OR scheduling",
        provider_observation_coordinator_contact: "Jennifer · Scheduler · Observation scheduling",
        provider_intelligence_field_metadata: {
          provider_observation_coordinator_contact: {
            lifecycle_state: "validated",
            validated_at: "2026-06-02T00:00:00Z",
          },
        },
      },
    });

    expect(lines.some((line) => /credentialing required/i.test(line.text))).toBe(false);
    expect(lines.some((line) => /scheduler:/i.test(line.text))).toBe(false);
  });

  it("still shows scheduler during discovery before any observation case is completed", () => {
    const lines = buildProviderOverviewWhatMattersSummary({
      providerId: "prov-pre-obs",
      relationshipStage: "early_discovery",
      newEngagementHref: "/engagements/new",
      intelligenceHref: "/providers/prov-pre-obs?tab=intelligence",
      engagements: [],
      cases: [{ id: "obs-1", case_type: "observation", status: "scheduled" }],
      contact: {
        provider_observation_coordinator_contact: "Jennifer · Scheduler · Observation scheduling",
        provider_intelligence_field_metadata: {
          provider_observation_coordinator_contact: {
            lifecycle_state: "validated",
            validated_at: "2026-06-02T00:00:00Z",
          },
        },
      },
    });

    expect(lines.some((line) => /scheduler:/i.test(line.text))).toBe(true);
  });



  it("falls back to the latest note when structured intel is thin", () => {

    const lines = buildProviderOverviewWhatMattersSummary({

      providerId: "prov-3",

      relationshipStage: "early_discovery",

      newEngagementHref: "/engagements/new",

      intelligenceHref: "/providers/prov-3?tab=intelligence",

      engagements: [],

      contact: {},

      activity_timeline: [{ kind: "note", summary: "Met at society dinner — wants to see a case" }],

    });



    expect(lines.some((line) => /society dinner/i.test(line.text))).toBe(true);

  });

});

