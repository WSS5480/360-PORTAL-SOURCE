import { describe, expect, it } from "vitest";
import { buildProviderOverviewExecutionCtas } from "./buildProviderOverviewExecutionCtas";
import { emptyProviderCommercialIntelligence } from "./providerCommercialIntelligenceModel";

describe("buildProviderOverviewExecutionCtas", () => {
  it("permission pending: primary is update status, not a forced approval engagement", () => {
    const ctas = buildProviderOverviewExecutionCtas({
      contact: {},
      providerId: "prov-1",
      newEngagementHref: "/engagements/new",
      noteHref: "/note",
      intelligenceHref: "/intelligence",
    });

    expect(ctas.phase).toBe("permission_pending");
    expect(ctas.primary.label).toBe("Update Permission Status");
    expect(ctas.primary.customAction).toBe("openObservationApproval");
    expect(ctas.secondary?.label).toBe("Schedule intro call");
    expect(ctas.secondary?.href).toMatch(/engagement_type=intro_call/);
    expect(ctas.quickActions.map((a) => a.label)).toEqual([
      "Add Scheduler",
      "Add Credentialing Note",
      "Request Observation Permission",
    ]);
    expect(ctas.quickActions.find((a) => a.id === "request_observation_permission")?.customAction).toBe(
      "openObservationApproval",
    );
  });

  it("permission confirmed: primary is add observation case", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.observation.approval_status = "approved";

    const ctas = buildProviderOverviewExecutionCtas({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
      },
      providerId: "prov-2",
      newEngagementHref: "/engagements/new?provider_id=prov-2",
      noteHref: "/note",
      intelligenceHref: "/intelligence",
    });

    expect(ctas.phase).toBe("permission_confirmed");
    expect(ctas.primary.label).toBe("Add Observation Case");
    expect(ctas.primary.href).toContain("case_type=observation");
    expect(ctas.primary.label).not.toBe("Request Observation Approval");
    expect(ctas.quickActions.some((a) => a.label === "Start Observation Planning")).toBe(false);
  });

  it("observation scheduled: primary opens observation case when one exists", () => {
    const ctas = buildProviderOverviewExecutionCtas({
      contact: { provider_observation_feasibility: "approved" },
      providerId: "prov-3",
      newEngagementHref: "/engagements/new",
      noteHref: "/note",
      intelligenceHref: "/intelligence",
      cases: [
        {
          id: "case-1",
          case_type: "observation",
          status: "scheduled",
        },
      ],
    });

    expect(ctas.phase).toBe("observation_scheduled");
    expect(ctas.primary.label).toBe("Open Next Observation");
    expect(ctas.primary.href).toContain("case-1");
    expect(ctas.quickActions.map((a) => a.label)).toContain("View Case Details");
    expect(ctas.quickActions.map((a) => a.label)).toContain("Add Another Observation Case");
  });

  it("routes completed observation series to Plan Provider Debrief", () => {
    const completedCases = Array.from({ length: 5 }, (_, index) => ({
      id: `case-${index + 1}`,
      case_type: "observation",
      status: "completed",
      surgeon_contact_id: "prov-3",
    }));

    const ctas = buildProviderOverviewExecutionCtas({
      contact: { provider_observation_feasibility: "approved" },
      providerId: "prov-3",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=prov-3",
      noteHref: "/note",
      intelligenceHref: "/intelligence",
      cases: completedCases,
    });

    expect(ctas.phase).toBe("debrief_ready");
    expect(ctas.primary.label).toBe("Schedule Debrief");
    expect(ctas.primary.href).toMatch(/provider_debrief|engagement_type=provider_debrief/);
    expect(ctas.guidanceLine).toMatch(/Schedule provider debrief/i);
    expect(ctas.primary.label).not.toBe("Add Observation Case");
  });

  it("debrief stage with completed debrief does not suggest add observation case", () => {
    const completedCases = Array.from({ length: 5 }, (_, index) => ({
      id: `case-${index + 1}`,
      case_type: "observation",
      status: "completed",
    }));

    const ctas = buildProviderOverviewExecutionCtas({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: { validated_at: "2026-05-01T00:00:00.000Z" },
        },
      },
      providerId: "prov-onion",
      stageId: "debrief",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=prov-onion",
      noteHref: "/note",
      intelligenceHref: "/intel",
      cases: completedCases,
      engagements: [
        {
          id: "debrief-1",
          engagement_type: "provider_debrief",
          engagement_type_label: "Provider debrief",
          status: "completed",
          status_label: "Completed",
          debrief_completed: true,
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          briefing_status: "complete",
          briefing_status_label: "Complete",
          planning_status: "complete",
          planning_status_label: "Complete",
          outcome_label: "Completed",
        },
      ],
    });

    expect(ctas.phase).toBe("debrief");
    expect(ctas.primary.label).not.toBe("Add Observation Case");
    expect(ctas.primary.label).toBe("Advance to Evaluation");
    expect(ctas.primary.customAction).toBe("openDebriefStatus");
    expect(ctas.guidanceLine).toMatch(/advance to Evaluation/i);
  });

  it("observe stage uses add observation primary instead of permission phase fallback", () => {
    const ctas = buildProviderOverviewExecutionCtas({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: { validated_at: "2026-05-01T00:00:00.000Z" },
        },
      },
      providerId: "prov-observe",
      stageId: "observe",
      newEngagementHref: "/engagements/new?provider_id=prov-observe",
      noteHref: "/note",
      intelligenceHref: "/intel",
    });

    expect(ctas.phase).toBe("observe");
    expect(ctas.primary.label).toBe("Add Observation");
  });
});
