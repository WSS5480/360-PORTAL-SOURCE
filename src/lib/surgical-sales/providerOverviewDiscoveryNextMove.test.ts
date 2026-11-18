import { describe, expect, it } from "vitest";
import {
  DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE,
  isDiscoveryAccessWorkflowComplete,
  resolveDiscoveryPathwayNextMoveLine,
  resolveDiscoveryWorkflowMovePhase,
  resolveDiscoveryWorkflowNextFieldAction,
} from "./providerOverviewDiscoveryNextMove";

describe("providerOverviewDiscoveryNextMove", () => {
  it("routes credentialing-required observation to access completion and credentialing CTA", () => {
    const contact = {
      provider_observation_feasibility: "credentialing_required",
      provider_observation_credentialing_needed: "required",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Discovery Mapping",
          updated_at: "2026-05-20T12:00:00.000Z",
        },
      },
    };
    expect(resolveDiscoveryWorkflowMovePhase(contact)).toBe("needs_access_completion");
    const action = resolveDiscoveryWorkflowNextFieldAction({
      contact,
      providerId: "p1",
      briefingHref: "/briefing",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      pathwayStageId: "discovery",
      fallbackLabel: "x",
      fallbackDetail: "y",
      fallbackHref: "/z",
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
  });

  it("returns obtain-approval next move before validation", () => {
    const contact = { provider_relationship_stage: "prospect" };
    expect(resolveDiscoveryWorkflowMovePhase(contact)).toBe("awaiting_approval");
    expect(resolveDiscoveryPathwayNextMoveLine(contact)).toBe(
      DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval,
    );
  });

  it("returns obtain-approval next move when interest is captured but not approved", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_evaluation_openness: "open",
    };
    expect(resolveDiscoveryPathwayNextMoveLine(contact)).toBe(
      DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval,
    );
  });

  it("returns scheduling-owner next move after approval without coordinator", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Test",
          updated_at: "2026-05-20T12:00:00.000Z",
          validated_at: "2026-05-20T12:00:00.000Z",
        },
      },
    };
    expect(resolveDiscoveryWorkflowMovePhase(contact)).toBe("needs_scheduling_owner");
    expect(resolveDiscoveryPathwayNextMoveLine(contact)).toBe(
      DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.schedulingOwner,
    );
    const action = resolveDiscoveryWorkflowNextFieldAction({
      contact,
      providerId: "p1",
      briefingHref: "/portal/sales/providers/p1?tab=briefing",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      pathwayStageId: "discovery",
      fallbackLabel: "x",
      fallbackDetail: "y",
      fallbackHref: "/z",
    });
    expect(action.label).toBe("Validate scheduling workflow");
    expect(action.href).toContain("workflow=scheduling_owner");
  });

  it("treats provider_scheduling_contact (Karen) as scheduling owner identified", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Test",
          updated_at: "2026-05-20T12:00:00.000Z",
          validated_at: "2026-05-20T12:00:00.000Z",
        },
      },
      provider_scheduling_contact: "Karen — office scheduler (partial lead)",
    };
    expect(resolveDiscoveryWorkflowMovePhase(contact)).toBe("needs_access_pathway");
  });

  it("returns access-pathway next move when coordinator exists", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Test",
          updated_at: "2026-05-20T12:00:00.000Z",
          validated_at: "2026-05-20T12:00:00.000Z",
        },
      },
      provider_observation_coordinator_contact: "Maria Lopez (Scheduler)",
    };
    expect(resolveDiscoveryWorkflowMovePhase(contact)).toBe("needs_access_pathway");
    expect(resolveDiscoveryPathwayNextMoveLine(contact)).toBe(
      DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.accessPathway,
    );
  });

  it("returns schedule observation when access workflow is complete", () => {
    const validatedMeta = {
      source_type: "profile",
      source_label: "Test",
      updated_at: "2026-05-20T12:00:00.000Z",
      validated_at: "2026-05-20T12:00:00.000Z",
    };
    const contact = {
      provider_observation_feasibility: "approved",
      provider_observation_coordinator_contact: "Maria",
      provider_observation_access_path: "none",
      provider_observation_credentialing_needed: "cleared",
      provider_credentialing_status: "cleared",
      provider_observation_best_days_case_types: "Tue AM lap cases",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: validatedMeta,
        provider_observation_access_path: validatedMeta,
        provider_observation_credentialing_needed: validatedMeta,
        provider_credentialing_status: validatedMeta,
        provider_observation_best_days_case_types: validatedMeta,
        provider_observation_coordinator_contact: validatedMeta,
      },
    };
    expect(isDiscoveryAccessWorkflowComplete(contact)).toBe(true);
    expect(resolveDiscoveryPathwayNextMoveLine(contact)).toBe(
      DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.createObservation,
    );
    const action = resolveDiscoveryWorkflowNextFieldAction({
      contact,
      providerId: "p1",
      briefingHref: "/briefing",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      pathwayStageId: "discovery",
      fallbackLabel: "x",
      fallbackDetail: "y",
      fallbackHref: "/z",
    });
    expect(action.label).toBe("Coordinate observation");
    expect(action.href).toContain("observation_request");
  });

  it("starts first engagement when approval is open and nothing is logged", () => {
    const action = resolveDiscoveryWorkflowNextFieldAction({
      contact: {},
      engagements: [],
      providerId: "p1",
      briefingHref: "/portal/sales/providers/p1?tab=briefing",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      pathwayStageId: "discovery",
      fallbackLabel: "x",
      fallbackDetail: "y",
      fallbackHref: "/z",
    });
    expect(action.label).toMatch(/start intro call/i);
    expect(action.href).toContain("provider_id=p1");
    expect(action.detail).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval);
  });
});
