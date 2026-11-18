import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildMissionBoardIntroCallDictateCompleteToast,
  finalizeMissionBoardIntroCallDebriefAfterCapture,
  runMissionBoardIntroCallDictateComplete,
} from "./missionBoardIntroCallDictateComplete";

const prepareMissionBoardIntroCallForDebrief = vi.fn();

vi.mock("@/lib/surgical-sales/missionBoardIntroCallCompleteClient", () => ({
  prepareMissionBoardIntroCallForDebrief: (...args: unknown[]) =>
    prepareMissionBoardIntroCallForDebrief(...args),
}));

describe("buildMissionBoardIntroCallDictateCompleteToast", () => {
  it("summarizes fields applied and pathway change", () => {
    const toast = buildMissionBoardIntroCallDictateCompleteToast({
      fieldsApplied: 2,
      report: {
        fields: {
          provider_product_fit_validated: null,
          provider_evaluation_path: null,
          provider_commitment_interest: null,
          follow_up_needed: null,
          barriers_issues: null,
          provider_feedback: null,
          staff_feedback: null,
          next_step: null,
          debrief_summary: null,
        },
        acceptedDbKeys: ["provider_observation_access_path"],
        pathwayStageBefore: "discovery",
        pathwayStageAfter: "evaluation",
        providerStageChanged: true,
        followUpTasks: [],
        proposedContacts: [],
      },
    });

    expect(toast.title).toBe("Intro call completed");
    expect(toast.detail).toContain("2 provider fields updated");
    expect(toast.detail).toContain("Pathway advanced to evaluation");
  });
});

describe("finalizeMissionBoardIntroCallDebriefAfterCapture", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("posts finalize action after capture intelligence saves", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true, engagementId: "e1", finalized: true }),
    } as Response);

    await finalizeMissionBoardIntroCallDebriefAfterCapture({
      providerId: "p1",
      engagementId: "e1",
      narrative: "Provider wants to schedule an observation next week.",
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/portal/sales/providers/p1/mission-board-intro-dictate-complete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "finalize",
          engagement_id: "e1",
          narrative: "Provider wants to schedule an observation next week.",
        }),
      }),
    );
  });
});

describe("runMissionBoardIntroCallDictateComplete", () => {
  beforeEach(() => {
    prepareMissionBoardIntroCallForDebrief.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("prepares intro call then posts dictation without navigating", async () => {
    prepareMissionBoardIntroCallForDebrief.mockResolvedValue({ ok: true });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          ok: true,
          engagementId: "e1",
          fieldsApplied: 1,
          report: {
            fields: {
              provider_product_fit_validated: null,
              provider_evaluation_path: null,
              provider_commitment_interest: null,
              follow_up_needed: null,
              barriers_issues: null,
              provider_feedback: null,
              staff_feedback: null,
              next_step: null,
              debrief_summary: "Summary",
            },
            acceptedDbKeys: ["provider_observation_access_path"],
            pathwayStageBefore: "discovery",
            pathwayStageAfter: "discovery",
            providerStageChanged: false,
            followUpTasks: [],
            proposedContacts: [],
          },
        }),
    } as Response);

    const result = await runMissionBoardIntroCallDictateComplete({
      providerId: "p1",
      engagementId: "e1",
      engagementStatus: "planned",
      engagementType: "intro_call",
      narrative: "Provider wants to schedule an observation next week.",
    });

    expect(prepareMissionBoardIntroCallForDebrief).toHaveBeenCalledWith({
      engagementId: "e1",
      status: "planned",
      engagementType: "intro_call",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/portal/sales/providers/p1/mission-board-intro-dictate-complete",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.toast.title).toBe("Intro call completed");
  });

  it("throws when prepare fails", async () => {
    prepareMissionBoardIntroCallForDebrief.mockResolvedValue({
      ok: false,
      message: "Could not end engagement",
    });

    await expect(
      runMissionBoardIntroCallDictateComplete({
        providerId: "p1",
        engagementId: "e1",
        narrative: "Provider wants to schedule an observation next week.",
      }),
    ).rejects.toThrow("Could not end engagement");
  });
});
