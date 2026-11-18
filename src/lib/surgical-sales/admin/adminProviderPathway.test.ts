import { describe, expect, it } from "vitest";
import {
  adminProviderPathwayLabels,
  deriveAdminProviderPathwayState,
} from "@/lib/surgical-sales/admin/adminProviderPathway";
import { deriveSalesPathwayState } from "@/lib/surgical-sales/deriveSalesPathwayState";
import { PATHWAY_CONTACT_OBSERVATION_SEQUENCE_COMPLETE } from "@/lib/surgical-sales/pathway/pathwayContactFlags";

describe("adminProviderPathway", () => {
  it("matches portal pathway derivation when full contact and case fields are present", () => {
    const contact = {
      id: "prov-1",
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: { validated_at: "2026-06-01T00:00:00.000Z" },
      },
      [PATHWAY_CONTACT_OBSERVATION_SEQUENCE_COMPLETE]: "yes",
    };

    const cases = [
      {
        id: "case-1",
        sales_rep_id: "rep-1",
        surgeon_contact_id: "prov-1",
        case_type: "observation",
        status: "completed",
        observation_completed_at: "2026-06-01T00:00:00.000Z",
        engagement_id: null,
      },
    ];

    const engagements = [
      {
        id: "eng-1",
        sales_rep_id: "rep-1",
        provider_id: "prov-1",
        engagement_type: "provider_debrief",
        status: "completed",
        debrief_completed: true,
        debrief_completed_at: "2026-06-02T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z",
      },
    ];

    const portal = deriveSalesPathwayState({
      providerId: "prov-1",
      contact,
      cases,
      engagements,
    });

    const admin = deriveAdminProviderPathwayState({
      providerId: "prov-1",
      contact,
      cases,
      engagements,
    });

    expect(admin.currentStage).toBe(portal.currentStage);
    expect(adminProviderPathwayLabels(admin).stage_label).toBe(portal.currentStageLabel);
  });

  it("counts observation completion via observation_completed_at", () => {
    const contact = {
      id: "prov-2",
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: { validated_at: "2026-06-01T00:00:00.000Z" },
      },
    };

    const cases = Array.from({ length: 5 }, (_, index) => ({
      id: `case-${index}`,
      sales_rep_id: "rep-1",
      surgeon_contact_id: "prov-2",
      case_type: "observation",
      status: "in_progress",
      observation_completed_at: `2026-06-0${index + 1}T00:00:00.000Z`,
      engagement_id: null,
    }));

    const state = deriveAdminProviderPathwayState({
      providerId: "prov-2",
      contact,
      cases,
      engagements: [],
    });

    expect(state.currentStage).toBe("debrief");
    expect(state.completed_observation_count).toBeGreaterThanOrEqual(5);
  });
});
