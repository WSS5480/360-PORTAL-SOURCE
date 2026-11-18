import { describe, expect, it } from "vitest";
import {
  buildObservationAccessCredentialingPrerequisitePatch,
  buildObservationAccessUnlockPlanningPatch,
  isObservationAccessConditionallyAllowed,
  reconcileObservationAccessPlanningPatch,
  resolveObservationAccessWorkflowState,
} from "./observationAccessWorkflowState";
import { resolveObservationApprovalStatus } from "./discoveryIntelligenceSignalStatus";
import { DISCOVERY_FIELD_STATUS } from "./discoveryIntelligenceSignalStatus";
import {
  resolveDiscoveryWorkflowMovePhase,
  resolveDiscoveryOverviewWorkflowSummary,
} from "./providerOverviewDiscoveryNextMove";
import { DISCOVERY_OVERVIEW_FOCUS_CREDENTIALING_BEFORE_OBSERVATION } from "./observationAccessWorkflowState";
import { deriveDiscoveryWorkflowRecommendation } from "./deriveProviderWorkflowRecommendation";

describe("observationAccessWorkflowState", () => {
  it("maps credentialing_required to conditionally allowed with credentialing blocker", () => {
    const contact = {
      provider_observation_feasibility: "credentialing_required",
      provider_observation_credentialing_needed: "required",
    };
    expect(resolveObservationAccessWorkflowState(contact)).toEqual({
      observationAccessStatus: "conditionally_allowed",
      accessBlocker: "credentialing_required",
      credentialingStatus: "required",
    });
    expect(isObservationAccessConditionallyAllowed(contact)).toBe(true);
    expect(resolveObservationApprovalStatus(contact)).toBe(DISCOVERY_FIELD_STATUS.conditional);
  });

  it("builds prerequisite patch when rep selects not until credentialed", () => {
    expect(buildObservationAccessCredentialingPrerequisitePatch("credentialing_required")).toEqual({
      provider_observation_feasibility: "credentialing_required",
      provider_observation_credentialing_needed: "required",
    });
  });

  it("routes discovery workflow to credentialing completion", () => {
    const contact = {
      provider_observation_feasibility: "credentialing_required",
      provider_observation_credentialing_needed: "required",
    };
    expect(resolveDiscoveryWorkflowMovePhase(contact)).toBe("needs_access_completion");
    expect(resolveDiscoveryOverviewWorkflowSummary(contact).currentFocus).toBe(
      DISCOVERY_OVERVIEW_FOCUS_CREDENTIALING_BEFORE_OBSERVATION,
    );
    const action = deriveDiscoveryWorkflowRecommendation({
      contact,
      providerId: "p1",
      newEngagementHref: "/engagements/new?provider_id=p1",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
        } as never,
      ],
    });
    expect(action.label).toMatch(/start credentialing/i);
    expect(action.href).toContain("provider_observation_credentialing_needed");
  });

  it("unlocks observation access when credentialing is cleared", () => {
    const contact = {
      provider_observation_feasibility: "credentialing_required",
      provider_observation_credentialing_needed: "cleared",
      provider_credentialing_status: "cleared",
      provider_intelligence_field_metadata: {
        provider_observation_credentialing_needed: {
          source_type: "profile",
          source_label: "Test",
          updated_at: "2026-05-20T12:00:00.000Z",
          validated_at: "2026-05-20T12:00:00.000Z",
        },
        provider_credentialing_status: {
          source_type: "profile",
          source_label: "Test",
          updated_at: "2026-05-20T12:00:00.000Z",
          validated_at: "2026-05-20T12:00:00.000Z",
        },
      },
    };
    expect(buildObservationAccessUnlockPlanningPatch(contact)).toEqual({
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "cleared",
      provider_credentialing_status: "cleared",
    });
    expect(
      reconcileObservationAccessPlanningPatch({
        existingContact: contact,
        planningPatch: { provider_observation_credentialing_needed: "cleared" },
      }),
    ).toMatchObject({
      provider_observation_feasibility: "easy",
    });
    expect(
      resolveObservationAccessWorkflowState({
        ...contact,
        provider_observation_feasibility: "easy",
      }).observationAccessStatus,
    ).toBe("allowed");
  });
});
