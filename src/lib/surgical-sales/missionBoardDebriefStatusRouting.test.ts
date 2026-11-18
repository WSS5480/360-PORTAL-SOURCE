import { describe, expect, it } from "vitest";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";
const ENGAGEMENT_ID = "22222222-2222-4222-8222-222222222222";

function baseProvider(extra: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: PROVIDER_ID,
    organization_count: 1,
    specialty: "Orthopedics",
    primary_organization_name: "Metro General",
    primary_organization_id: "org-1",
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    relationship_pathway_stage_id: "debrief",
    ...extra,
  };
}

/** Mission Board Status always opens the debrief status modal (Discovery pattern). */
function resolveDebriefStatusSurface(_provider: ProviderDirectoryRow): "lifecycle" {
  return "lifecycle";
}

describe("Mission Board debrief status routing", () => {
  it("opens status modal for scheduled debrief", () => {
    expect(
      resolveDebriefStatusSurface(
        baseProvider({
          provider_debrief_engagement: {
            id: ENGAGEMENT_ID,
            status: "planned",
            debrief_completed: false,
          },
        }),
      ),
    ).toBe("lifecycle");
  });

  it("opens status modal when debrief is not scheduled", () => {
    expect(resolveDebriefStatusSurface(baseProvider())).toBe("lifecycle");
  });

  it("opens status modal for complete_debrief", () => {
    expect(
      resolveDebriefStatusSurface(
        baseProvider({
          provider_debrief_engagement: {
            id: ENGAGEMENT_ID,
            status: "completed",
            debrief_completed: false,
          },
        }),
      ),
    ).toBe("lifecycle");
  });
});
