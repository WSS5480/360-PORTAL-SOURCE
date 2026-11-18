import { describe, expect, it } from "vitest";
import { buildDiscoveryOverviewSynthesis } from "./buildDiscoveryOverviewSynthesis";
import {
  DISCOVERY_OVERVIEW_FOCUS,
  DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE,
} from "./providerOverviewDiscoveryNextMove";

describe("buildDiscoveryOverviewSynthesis", () => {
  it("returns not-started synthesis for brand-new providers", () => {
    const synthesis = buildDiscoveryOverviewSynthesis({
      contact: { provider_relationship_stage: "prospect" },
    });

    expect(synthesis.currentFocus).toBeNull();
    expect(synthesis.nextFieldMove).toMatch(/intro call|engagement/i);
    expect(synthesis.groups.every((g) => g.summary === "No field intelligence has been captured yet.")).toBe(
      true,
    );
  });

  it("surfaces approval-pending focus and obtain-approval next move after field evidence exists", () => {
    const synthesis = buildDiscoveryOverviewSynthesis({
      contact: { provider_relationship_stage: "prospect" },
      engagements: [
        {
          id: "eng-1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "completed",
          status_label: "Completed",
          pre_call_filled: 0,
          pre_call_total: 5,
          pre_call_complete: false,
          outcome_label: "Completed",
        },
      ],
    });

    expect(synthesis.currentFocus).toBe("Will provider allow observation?");
    expect(synthesis.nextFieldMove).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval);
    expect(synthesis.groups.map((g) => g.id)).toEqual([
      "access_readiness",
      "clinical_fit",
      "champion_landscape",
    ]);
    const access = synthesis.groups.find((g) => g.id === "access_readiness")!;
    expect(access.summary).toBe("Provider observation approval pending");
    expect(access.title).toBe("Observation access");
  });

  it("surfaces access-readiness focus when provider is interested but not approved", () => {
    const synthesis = buildDiscoveryOverviewSynthesis({
      contact: {
        provider_relationship_stage: "prospect",
        provider_evaluation_openness: "open",
      },
      engagements: [
        {
          id: "eng-1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "completed",
          status_label: "Completed",
          pre_call_filled: 0,
          pre_call_total: 5,
          pre_call_complete: false,
          outcome_label: "Completed",
        },
      ],
    });

    expect(synthesis.currentFocus).toBe("Will provider allow observation?");
    expect(synthesis.nextFieldMove).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval);
  });

  it("surfaces scheduling-owner focus after approval without coordinator", () => {
    const synthesis = buildDiscoveryOverviewSynthesis({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_relationship_stage: "prospect",
      },
    });

    expect(synthesis.currentFocus).toBeNull();
    expect(synthesis.nextFieldMove).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.schedulingOwner);
    const access = synthesis.groups.find((g) => g.id === "access_readiness")!;
    expect(access.summary).toMatch(/scheduling owner/i);
  });

  it("surfaces access-path focus when scheduling owner is known but pathway is unknown", () => {
    const synthesis = buildDiscoveryOverviewSynthesis({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_observation_coordinator_contact: "Maria Lopez (Scheduler)",
        provider_relationship_stage: "prospect",
      },
    });

    expect(synthesis.currentFocus).toBeNull();
    expect(synthesis.nextFieldMove).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.accessPathway);
  });

  it("does not let clinical fit drive top-level focus before observation intel exists", () => {
    const synthesis = buildDiscoveryOverviewSynthesis({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_procedure_focus: "Lap colorectal",
        provider_relationship_stage: "prospect",
      },
    });

    expect(synthesis.currentFocus).toBeNull();
  });

  it("surfaces ready-to-schedule when access workflow is complete", () => {
    const validatedMeta = {
      source_type: "profile",
      source_label: "Test",
      updated_at: "2026-05-20T12:00:00.000Z",
      validated_at: "2026-05-20T12:00:00.000Z",
    };
    const synthesis = buildDiscoveryOverviewSynthesis({
      contact: {
        provider_observation_feasibility: "approved",
        provider_observation_coordinator_contact: "Maria",
        provider_observation_access_path: "none",
        provider_observation_credentialing_needed: "cleared",
        provider_credentialing_status: "cleared",
        provider_observation_best_days_case_types: "Tue AM lap cases",
        observation_history: "Observed lap workflow",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: validatedMeta,
          provider_observation_access_path: validatedMeta,
          provider_observation_credentialing_needed: validatedMeta,
          provider_credentialing_status: validatedMeta,
          provider_observation_best_days_case_types: validatedMeta,
          provider_observation_coordinator_contact: validatedMeta,
        },
        provider_relationship_stage: "prospect",
      },
    });

    expect(synthesis.currentFocus).toBe(DISCOVERY_OVERVIEW_FOCUS.readyToSchedule);
    expect(synthesis.nextFieldMove).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.createObservation);
  });
});
