import { describe, expect, it } from "vitest";
import {
  EARLY_DISCOVERY_NEXT_FIELD_ACTION_DETAIL,
  buildRelationshipFirstDiscoveryRequirements,
  isRelationshipFirstDiscovery,
  resolveDiscoveryNextFieldAction,
  sanitizeDiscoveryNextFieldDetail,
} from "./providerOverviewDiscoveryProgression";

describe("providerOverviewDiscoveryProgression", () => {
  it("treats brand-new providers as relationship-first", () => {
    expect(
      isRelationshipFirstDiscovery({
        contact: { provider_relationship_stage: "early_discovery" },
        engagements: [],
      }),
    ).toBe(true);
  });

  it("stays relationship-first after intro is scheduled until observation approval", () => {
    expect(
      isRelationshipFirstDiscovery({
        contact: { provider_relationship_stage: "prospect" },
        engagements: [{ id: "e1", engagement_type: "intro_call", status: "scheduled" }],
      }),
    ).toBe(true);
  });

  it("recommends intro call prep when intro is scheduled and approval is open", () => {
    const action = resolveDiscoveryNextFieldAction({
      contact: { provider_relationship_stage: "prospect" },
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "scheduled",
          scheduled_at: "2026-05-27T14:00:00Z",
        } as never,
      ],
      providerId: "p1",
      briefingHref: "/portal/sales/providers/p1?tab=briefing",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      fallbackLabel: "Log field update",
      fallbackDetail: "Confirm access path and identify who owns scheduling.",
      fallbackHref: "/intelligence",
      pathwayStageId: "discovery",
    });

    expect(action.detail).toContain("obtain observation approval");
    expect(action.label).toBe("Prepare for touch");
    expect(action.href).toContain("/engagements/e1/prepare");
  });

  it("evolves recommendation after intro call is debriefed", () => {
    const action = resolveDiscoveryNextFieldAction({
      contact: { provider_relationship_stage: "prospect" },
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "completed",
          debrief_completed: true,
          notes: "--- tactical debrief ---\n\nWhat happened:\nMet surgeon",
        } as never,
      ],
      providerId: "p1",
      briefingHref: "/portal/sales/providers/p1?tab=briefing",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      fallbackLabel: "Intro Call",
      fallbackDetail: "Validate provider willingness.",
      fallbackHref: "/z",
      pathwayStageId: "discovery",
    });

    expect(action.label).toBe("Continue discovery");
    expect(action.label).not.toMatch(/^intro call$/i);
  });

  it("recommends intro call before access mapping on new providers", () => {
    const action = resolveDiscoveryNextFieldAction({
      contact: { provider_relationship_stage: "early_discovery" },
      engagements: [],
      providerId: "p1",
      briefingHref: "/portal/sales/providers/p1?tab=briefing",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      fallbackLabel: "Log field update",
      fallbackDetail: "Confirm access path and identify who owns scheduling.",
      fallbackHref: "/intelligence",
      pathwayStageId: "discovery",
    });

    expect(action.label).toBe("Start intro call");
    expect(action.detail).toContain("obtain observation approval");
    expect(action.href).toContain("engagement_type=intro_call");
  });

  it("strips access-mapping copy from next field action in relationship-first phase", () => {
    expect(
      sanitizeDiscoveryNextFieldDetail(
        "Confirm access path and identify who owns scheduling.",
        "relationship_first",
      ),
    ).toBe(EARLY_DISCOVERY_NEXT_FIELD_ACTION_DETAIL);
  });

  it("orders early discovery requirements around relationship and openness", () => {
    const reqs = buildRelationshipFirstDiscoveryRequirements({
      contact: {},
      engagements: [],
    });
    expect(reqs.map((r) => r.label)).toEqual([
      "Understand provider interest",
      "Assess observation openness",
      "Understand workflow fit",
    ]);
    expect(reqs.every((r) => !r.met)).toBe(true);
  });
});
