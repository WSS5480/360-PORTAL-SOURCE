import { describe, expect, it } from "vitest";
import { buildStoredTacticalDebriefNotes } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import {
  deriveDiscoveryWorkflowRecommendation,
  hasCompletedDebriefedIntro,
  isStaleEngagementTypeRecommendation,
  PROVIDER_PROGRESSION_CTA,
} from "./deriveProviderWorkflowRecommendation";
import { resolveDiscoveryNextFieldAction } from "./providerOverviewDiscoveryProgression";

const NEW_ENG = "/portal/sales/engagements/new?provider_id=p1";
const PROVIDER_ID = "p1";

describe("deriveProviderWorkflowRecommendation", () => {
  it("recommends start intro call when no engagements exist", () => {
    const rec = deriveDiscoveryWorkflowRecommendation({
      contact: { provider_relationship_stage: "prospect" },
      engagements: [],
      providerId: PROVIDER_ID,
      newEngagementHref: NEW_ENG,
    });
    expect(rec.label).toBe(PROVIDER_PROGRESSION_CTA.startIntroCall);
    expect(rec.href).toContain("engagement_type=intro_call");
  });

  it("recommends continue discovery after intro is completed and debriefed", () => {
    const engagements = [
      {
        id: "e1",
        engagement_type: "intro_call",
        engagement_type_label: "Intro Call",
        status: "completed",
        notes: buildStoredTacticalDebriefNotes({ narrative: "Strong interest." }),
        debrief_completed: true,
        debrief_completed_at: "2026-06-09T10:00:00.000Z",
      },
    ] as never[];

    expect(hasCompletedDebriefedIntro(engagements)).toBe(true);

    const rec = deriveDiscoveryWorkflowRecommendation({
      contact: { provider_relationship_stage: "prospect" },
      engagements,
      providerId: PROVIDER_ID,
      newEngagementHref: NEW_ENG,
    });

    expect(rec.label).toBe(PROVIDER_PROGRESSION_CTA.continueDiscovery);
    expect(rec.label).not.toMatch(/intro call/i);
    expect(rec.href).toContain("provider_observation_feasibility");
  });

  it("recommends validate scheduling workflow when scheduling owner is unknown", () => {
    const rec = deriveDiscoveryWorkflowRecommendation({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Test",
            updated_at: "2026-06-01T12:00:00.000Z",
            validated_at: "2026-06-01T12:00:00.000Z",
          },
        },
      },
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
          notes: buildStoredTacticalDebriefNotes({ narrative: "Done" }),
        },
      ] as never[],
      providerId: PROVIDER_ID,
      newEngagementHref: NEW_ENG,
    });

    expect(rec.label).toBe(PROVIDER_PROGRESSION_CTA.validateSchedulingWorkflow);
    expect(rec.href).toContain("workflow=scheduling_owner");
  });

  it("recommends prepare for touch when intro is still upcoming", () => {
    const rec = deriveDiscoveryWorkflowRecommendation({
      contact: { provider_relationship_stage: "prospect" },
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "scheduled",
          scheduled_at: "2026-06-27T14:00:00.000Z",
        },
      ] as never[],
      providerId: PROVIDER_ID,
      newEngagementHref: NEW_ENG,
    });

    expect(rec.label).toBe(PROVIDER_PROGRESSION_CTA.prepareForTouch);
    expect(rec.href).toContain("/engagements/e1/prepare");
  });

  it("flags stale intro call labels after intro completion", () => {
    const engagements = [
      {
        id: "e1",
        engagement_type: "intro_call",
        status: "completed",
        debrief_completed: true,
        notes: buildStoredTacticalDebriefNotes({ narrative: "Done" }),
      },
    ] as never[];

    expect(isStaleEngagementTypeRecommendation("Intro Call", engagements)).toBe(true);
    expect(isStaleEngagementTypeRecommendation("Continue discovery", engagements)).toBe(false);
  });
});

describe("resolveDiscoveryNextFieldAction integration", () => {
  it("does not return Intro Call as label after debriefed intro", () => {
    const action = resolveDiscoveryNextFieldAction({
      contact: { provider_relationship_stage: "prospect" },
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "completed",
          debrief_completed: true,
          notes: buildStoredTacticalDebriefNotes({ narrative: "Captured interest." }),
        },
      ] as never[],
      providerId: PROVIDER_ID,
      briefingHref: "/portal/sales/providers/p1?tab=briefing",
      newEngagementHref: NEW_ENG,
      fallbackLabel: "Intro Call",
      fallbackDetail: "Validate provider willingness.",
      fallbackHref: "/z",
      pathwayStageId: "discovery",
    });

    expect(action.label).toBe(PROVIDER_PROGRESSION_CTA.continueDiscovery);
    expect(action.label).not.toBe("Intro Call");
  });
});
