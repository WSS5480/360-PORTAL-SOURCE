import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  loadEngagement: vi.fn(),
  update: vi.fn(),
  loadPrepare: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        mocks.update(patch);
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: { id: "e1", ...patch },
                error: null,
              }),
            }),
          }),
        };
      },
    }),
  },
}));

vi.mock("@/lib/surgical-sales/engagements/engagementAccess", () => ({
  loadEngagementForPortalActor: mocks.loadEngagement,
}));

vi.mock("@/lib/surgical-sales/engagements/loadPrepareForMeetingView", () => ({
  loadPrepareForMeetingViewForActor: mocks.loadPrepare,
}));

vi.mock("@/lib/surgical-sales/engagements/engagementPlanningModel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/surgical-sales/engagements/engagementPlanningModel")>();
  return {
    ...actual,
    syncEngagementPlanningPatch: (row: Record<string, unknown>) => row,
  };
});

import { openPrepareMissionForActor } from "./openPrepareMission";

describe("openPrepareMissionForActor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadEngagement.mockResolvedValue({
      id: "e1",
      status: "planned",
      planning_status: "not_planned",
      briefing_status: "not_planned",
    });
    mocks.loadPrepare.mockResolvedValue({
      ok: true,
      prepare: { engagement_id: "e1" },
      engagement: { id: "e1", status: "planned", planning_status: "planning_in_progress" },
    });
  });

  it("does not set engagement status to in_progress when opening prepare", async () => {
    const result = await openPrepareMissionForActor("e1", "user-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.engagement.status).toBe("planned");
    }
    const patches = mocks.update.mock.calls.map((c) => c[0] as Record<string, unknown>);
    for (const patch of patches) {
      expect(patch.status).toBeUndefined();
    }
  });
});
