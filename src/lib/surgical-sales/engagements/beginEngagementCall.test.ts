import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  loadEngagement: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      update: mocks.update,
    }),
  },
}));

vi.mock("@/lib/surgical-sales/engagements/engagementAccess", () => ({
  loadEngagementForPortalActor: mocks.loadEngagement,
}));

import { beginEngagementCallForActor } from "./beginEngagementCall";

describe("beginEngagementCallForActor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue({
      eq: () => ({ error: null }),
    });
  });

  it("rejects begin when engagement is planned and not prepared", async () => {
    mocks.loadEngagement.mockResolvedValue({
      id: "e1",
      status: "planned",
      archived_at: null,
      planning_status: "not_planned",
      debrief_intelligence_snapshot: null,
    });

    const result = await beginEngagementCallForActor("e1", "user-1");
    expect(result).toEqual({
      ok: false,
      error: "Prepare the engagement before starting.",
      status: 409,
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("sets status to in_progress when briefing is prepared", async () => {
    mocks.loadEngagement.mockResolvedValue({
      id: "e1",
      status: "planned",
      prepared_at: "2026-06-01T12:00:00.000Z",
      planning_status: "planned",
      archived_at: null,
      debrief_intelligence_snapshot: null,
    });

    const result = await beginEngagementCallForActor("e1", "user-1");
    expect(result).toEqual({ ok: true, status_changed: true });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in_progress" }),
    );
  });

  it("allows unprepared begin for mission board fast-log paths", async () => {
    mocks.loadEngagement.mockResolvedValue({
      id: "e1",
      status: "planned",
      planning_status: "not_planned",
      archived_at: null,
      debrief_intelligence_snapshot: null,
    });

    const result = await beginEngagementCallForActor("e1", "user-1", {
      allowUnpreparedBegin: true,
    });
    expect(result).toEqual({ ok: true, status_changed: true });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in_progress" }),
    );
  });

  it("does not change status when engagement is already in progress", async () => {
    mocks.loadEngagement.mockResolvedValue({
      id: "e1",
      status: "in_progress",
      archived_at: null,
      debrief_intelligence_snapshot: {
        start_mission: { opened_at: "2026-01-01T00:00:00.000Z", live_notes: "notes" },
      },
    });

    const result = await beginEngagementCallForActor("e1", "user-1");
    expect(result).toEqual({ ok: true, status_changed: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
