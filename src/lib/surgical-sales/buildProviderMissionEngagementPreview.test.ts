import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderMissionEngagementOpenItems,
  buildProviderMissionEngagementPreview,
  deriveMissionEngagementLocation,
  missionEngagementTypeLabel,
} from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import { formatEngagementMissionWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    specialty: "Orthopedics",
    primary_organization_name: "Test Hospital",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildProviderMissionEngagementPreview", () => {
  it("maps engagement types to mission-facing labels", () => {
    expect(missionEngagementTypeLabel("intro_call")).toBe("Intro Meeting");
    expect(missionEngagementTypeLabel("observation_request")).toBe("Observation Access Request");
    expect(missionEngagementTypeLabel("or_visit")).toBe("Observation");
    expect(missionEngagementTypeLabel("product_demo")).toBe("Product Evaluation");
  });

  it("formats mission when labels with Today and Tomorrow", () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const date = `${y}-${m}-${d}`;
    expect(
      formatEngagementMissionWhenLabel({
        engagement_date: date,
        scheduled_at: `${date}T14:00:00.000Z`,
      }),
    ).toMatch(/^Today /);
  });

  it("builds a full mission engagement preview", () => {
    const provider = baseProvider();
    const preview = buildProviderMissionEngagementPreview(
      {
        id: "eng-1",
        engagement_type: "intro_call",
        engagement_date: "2026-05-29",
        scheduled_at: "2026-05-29T14:00:00.000Z",
        observation_goal: "Validate workflow fit",
        organization_name: "Test Hospital",
      },
      provider,
    );

    expect(preview.type_label).toBe("Intro Meeting");
    expect(preview.location_label).toBe("Test Hospital");
    expect(preview.primary_goal).toBe("Validate workflow fit");
    expect(preview.href).toContain("eng-1");
  });

  it("uses virtual location for intro calls without facility context", () => {
    expect(
      deriveMissionEngagementLocation(
        { id: "eng-1", engagement_type: "intro_call" },
        baseProvider({ primary_organization_name: null, primary_organization_id: null }),
      ),
    ).toBe("Virtual");
  });

  it("limits open items to two engagement-relevant blockers", () => {
    const provider = baseProvider({ planning_completion: undefined });
    const items = buildProviderMissionEngagementOpenItems(
      {
        id: "eng-1",
        engagement_type: "observation_request",
        engagement_date: null,
        scheduled_at: null,
        case_id: null,
      },
      provider,
    );
    expect(items.length).toBeLessThanOrEqual(2);
    expect(items.some((item) => item.label === "Observation not scheduled")).toBe(true);
  });
});
