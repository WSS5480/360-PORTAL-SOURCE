import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewFieldBriefing,
  FIELD_BRIEFING_SECTION,
} from "./buildProviderOverviewFieldBriefing";
import {
  PROVIDER_OVERVIEW_BANNED_INTERNAL_LABELS,
} from "./providerOverviewBriefingVocabulary";
import {
  emptyProviderCommercialIntelligence,
} from "./providerCommercialIntelligenceModel";

describe("buildProviderOverviewFieldBriefing", () => {
  it("structures briefing into access, known facts, gaps, and next mission", () => {
    const briefing = buildProviderOverviewFieldBriefing({
      contact: { provider_relationship_stage: "prospect" },
    });

    expect(briefing.title).toBe(FIELD_BRIEFING_SECTION.title);
    expect(briefing.accessStatus.headline).toBe("Observation permission not yet confirmed");
    expect(briefing.whatWeKnow).toEqual([]);
    expect(briefing.intelligenceGaps.length).toBe(0);
    expect(briefing.nextMission.objective).toBeTruthy();
    expect(briefing.nextMission.whyItMatters).toBeTruthy();
    expect(briefing.nextMission.expectedOutcome).toBeTruthy();
  });

  it("does not expose CRM storage category labels", () => {
    const briefing = buildProviderOverviewFieldBriefing({
      contact: { provider_relationship_stage: "prospect" },
    });

    const serialized = JSON.stringify(briefing);
    for (const banned of PROVIDER_OVERVIEW_BANNED_INTERNAL_LABELS) {
      expect(serialized).not.toMatch(new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
  });

  it("derives approved access status from validated observation approval", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.updated_at = "2026-06-01T00:00:00.000Z";
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "approved";
    commercial.observation.access_status = "approved";
    commercial.observation.readiness = "ready";
    commercial.observation.credentialing_required = "no";

    const briefing = buildProviderOverviewFieldBriefing({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "yes",
      },
    });

    expect(briefing.accessStatus.headline).toBe("Observation access confirmed");
    expect(briefing.accessStatus.approvalStatus.toLowerCase()).toContain("confirmed");
  });

  it("does not surface speculative intelligence gaps from blank CRM fields", () => {
    const briefing = buildProviderOverviewFieldBriefing({
      contact: {
        provider_observation_feasibility: "yes",
        provider_relationship_stage: "early_discovery",
      },
    });

    const gapText = briefing.intelligenceGaps.map((g) => g.text.toLowerCase()).join(" ");
    expect(/evaluation|procedure mix|first[- ]case validation/i.test(gapText)).toBe(false);
    expect(briefing.intelligenceGaps.length).toBeLessThanOrEqual(3);
    expect(briefing.intelligenceGapDomains.map((d) => d.id)).toEqual(["access", "workflow", "clinical"]);
  });

  it("includes confirmed contacts and procedures in what we know", () => {
    const briefing = buildProviderOverviewFieldBriefing({
      contact: {
        provider_procedure_focus: "Robotic colorectal",
        provider_intelligence_field_metadata: {
          provider_procedure_focus: {
            lifecycle_state: "validated",
            validated_at: "2026-06-01T00:00:00.000Z",
          },
        },
      },
      relatedContacts: [
        {
          id: "c-1",
          first_name: "Jamie",
          last_name: "Lee",
          role_type: "scheduler",
        },
      ],
    });

    const known = briefing.whatWeKnow.map((item) => item.text.toLowerCase()).join(" ");
    expect(known).toMatch(/colorectal|procedure|performs/);
    expect(known).toMatch(/jamie|scheduler|identified contact/);
  });

  it("recommends scheduling mission when access is ready", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.updated_at = "2026-06-01T00:00:00.000Z";
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "approved";
    commercial.observation.access_status = "approved";
    commercial.observation.readiness = "ready";
    commercial.observation.credentialing_required = "no";
    commercial.scheduling.scheduler_identified = "yes";
    commercial.scheduling.scheduler_contact_linked = "yes";
    commercial.scheduling.scheduling_workflow_known = "yes";

    const briefing = buildProviderOverviewFieldBriefing({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "yes",
        provider_scheduling_contact: "Maria Chen — OR scheduling",
      },
    });

    expect(briefing.nextMission.objective.toLowerCase()).toMatch(/schedule|observation/);
  });

  it("advances mission with approval and recommends schedule observation from evidence", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "approved";
    commercial.observation.access_status = "approved";

    const briefing = buildProviderOverviewFieldBriefing({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            lifecycle_state: "validated",
            validated_at: "2026-06-01T00:00:00.000Z",
          },
        },
        provider_relationship_pathway_stage_id: "discovery",
      },
    });

    expect(briefing.missionProgress.levelId).toBe("approved");
    expect(briefing.nextMission.objective.toLowerCase()).toMatch(/schedule|observation/);
    expect(
      briefing.accessStatus.executionRecommendations.some((r) => /schedule/i.test(r)) ||
        briefing.nextMission.objective.toLowerCase().includes("schedule"),
    ).toBe(true);
  });
});
