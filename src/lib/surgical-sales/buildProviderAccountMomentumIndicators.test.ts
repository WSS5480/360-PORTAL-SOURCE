import { describe, expect, it } from "vitest";
import { buildProviderAccountMomentumIndicators } from "./buildProviderAccountMomentumIndicators";

const NOW = new Date("2026-06-15T12:00:00Z").getTime();

describe("buildProviderAccountMomentumIndicators", () => {
  it("flags engagement inactive when no recent motion", () => {
    const momentum = buildProviderAccountMomentumIndicators({
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage: "prospect",
      commercialStage: "early_discovery",
      engagements: [],
      activity_timeline: [],
      nowMs: NOW,
    });

    expect(momentum.indicators.some((i) => i.id === "engagement_inactive")).toBe(true);
  });

  it("surfaces discovery accelerating with recent activity and visits", () => {
    const momentum = buildProviderAccountMomentumIndicators({
      contact: {
        provider_relationship_stage: "engagement_active",
        provider_observation_feasibility: "easy",
      },
      relationshipStage: "engagement_active",
      commercialStage: "observation",
      engagements: [
        {
          id: "e1",
          status: "completed",
          updated_at: "2026-06-10T10:00:00Z",
        } as never,
        {
          id: "e2",
          status: "planned",
          scheduled_at: "2026-06-20T10:00:00Z",
          pre_call_total: 5,
          pre_call_filled: 5,
          pre_call_complete: true,
        } as never,
      ],
      activity_timeline: [{ at: "2026-06-12T09:00:00Z", title: "Note added" }],
      nowMs: NOW,
    });

    expect(momentum.indicators.some((i) => i.id === "discovery_accelerating")).toBe(true);
  });

  it("surfaces intelligence capture stalled when many gaps and thin activity", () => {
    const momentum = buildProviderAccountMomentumIndicators({
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage: "prospect",
      commercialStage: "early_discovery",
      engagements: [
        {
          id: "e1",
          status: "planned",
          scheduled_at: "2026-06-18T10:00:00Z",
          pre_call_total: 5,
          pre_call_filled: 1,
          pre_call_complete: false,
        } as never,
      ],
      activity_timeline: [{ at: "2026-04-01T09:00:00Z", title: "Old note" }],
      nowMs: NOW,
    });

    expect(momentum.indicators.some((i) => i.id === "intelligence_capture_stalled")).toBe(true);
  });

  it("surfaces observation pathway strengthening when readiness is firming", () => {
    const momentum = buildProviderAccountMomentumIndicators({
      contact: {
        provider_relationship_stage: "observation_scheduled",
        provider_observation_feasibility: "easy",
        provider_observation_coordinator_contact: "Jane scheduler",
        provider_observation_cadence_preference: "weekly",
        provider_ideal_observation_cases: "hernia",
        provider_observation_access_path: "none",
        provider_observation_credentialing_needed: "cleared",
      },
      relationshipStage: "observation_scheduled",
      commercialStage: "observation",
      engagements: [{ id: "e1", status: "planned", scheduled_at: "2026-06-20T10:00:00Z" } as never],
      activity_timeline: [{ at: "2026-06-14T09:00:00Z", title: "Intel update" }],
      nowMs: NOW,
    });

    expect(momentum.indicators.some((i) => i.id === "observation_pathway_strengthening")).toBe(
      true,
    );
  });
});
