import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  openMissionBoardIntroCallDebrief,
  prepareMissionBoardIntroCallForDebrief,
  resolveMissionBoardDictateCompleteOutcome,
} from "./missionBoardIntroCallCompleteClient";

const beginEngagementCallClient = vi.fn();
const endEngagementCallClient = vi.fn();

vi.mock("@/lib/surgical-sales/engagements/beginEngagementCallClient", () => ({
  beginEngagementCallClient: (...args: unknown[]) => beginEngagementCallClient(...args),
}));

vi.mock("@/lib/surgical-sales/engagements/endEngagementCallClient", () => ({
  endEngagementCallClient: (...args: unknown[]) => endEngagementCallClient(...args),
}));

describe("prepareMissionBoardIntroCallForDebrief", () => {
  beforeEach(() => {
    beginEngagementCallClient.mockReset();
    endEngagementCallClient.mockReset();
  });

  it("uses intro-call placeholder outcome when ending from mission board", () => {
    expect(resolveMissionBoardDictateCompleteOutcome("intro_call")).toBe("no_meaningful_update");
    expect(resolveMissionBoardDictateCompleteOutcome("follow_up")).toBe("touch_no_progress");
  });

  it("begins and ends a planned intro before debrief capture", async () => {
    beginEngagementCallClient.mockResolvedValue({ ok: true });
    endEngagementCallClient.mockResolvedValue({
      ok: true,
      debriefHref: "/portal/sales/engagements/e1/debrief",
    });

    const result = await prepareMissionBoardIntroCallForDebrief({
      engagementId: "e1",
      status: "planned",
      engagementType: "intro_call",
    });

    expect(beginEngagementCallClient).toHaveBeenCalledWith("e1", { missionBoardFastLog: true });
    expect(endEngagementCallClient).toHaveBeenCalledWith("e1", "no_meaningful_update");
    expect(result).toEqual({ ok: true });
  });

  it("ends an in-progress intro without calling begin again", async () => {
    endEngagementCallClient.mockResolvedValue({
      ok: true,
      debriefHref: "/portal/sales/engagements/e1/debrief",
    });

    const result = await prepareMissionBoardIntroCallForDebrief({
      engagementId: "e1",
      status: "in_progress",
      engagementType: "intro_call",
    });

    expect(beginEngagementCallClient).not.toHaveBeenCalled();
    expect(endEngagementCallClient).toHaveBeenCalledWith("e1", "no_meaningful_update");
    expect(result.ok).toBe(true);
  });

  it("skips begin/end when intro is already completed", async () => {
    const result = await prepareMissionBoardIntroCallForDebrief({
      engagementId: "e1",
      status: "completed",
    });

    expect(beginEngagementCallClient).not.toHaveBeenCalled();
    expect(endEngagementCallClient).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});

describe("openMissionBoardIntroCallDebrief", () => {
  beforeEach(() => {
    beginEngagementCallClient.mockReset();
    endEngagementCallClient.mockReset();
  });

  it("returns debrief href after preparing intro call", async () => {
    beginEngagementCallClient.mockResolvedValue({ ok: true });
    endEngagementCallClient.mockResolvedValue({
      ok: true,
      debriefHref: "/portal/sales/engagements/e1/debrief",
    });

    const result = await openMissionBoardIntroCallDebrief({
      engagementId: "e1",
      status: "planned",
      engagementType: "intro_call",
    });

    expect(result).toEqual({
      ok: true,
      debriefHref: "/portal/sales/engagements/e1/debrief",
    });
  });

  it("opens debrief directly when intro is already completed", async () => {    const result = await openMissionBoardIntroCallDebrief({
      engagementId: "e1",
      status: "completed",
    });

    expect(beginEngagementCallClient).not.toHaveBeenCalled();
    expect(endEngagementCallClient).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      debriefHref: "/portal/sales/engagements/e1/debrief",
    });
  });
});
