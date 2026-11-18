import { describe, expect, it } from "vitest";
import {
  patchBodyForMeetingStateChip,
  resolveMeetingStateChip,
} from "./engagementMeetingState";
import { resolveEngagementOperationalBannerId } from "./engagementOperationalBanner";

describe("engagementMeetingState (legacy patch helpers)", () => {
  it("maps banner-ready prep to prepared chip for patches", () => {
    expect(
      resolveMeetingStateChip({
        status: "planned",
        engagementType: "intro_call",
        preparation: { is_prepared: true },
        preVisitBlockerCount: 0,
        discoveryObjectiveCount: 2,
      }),
    ).toBe("prepared");
  });

  it("clears prepare fields when reverting to planned", () => {
    expect(patchBodyForMeetingStateChip("planned").status).toBe("planned");
    expect(patchBodyForMeetingStateChip("planned").prepared_at).toBeNull();
    expect(patchBodyForMeetingStateChip("planned").prepare_checklist_json).toEqual({});
  });

  it("aligns debrief banner with in_progress status", () => {
    expect(
      resolveEngagementOperationalBannerId({
        status: "in_progress",
        engagementType: "intro_call",
        preparation: { is_prepared: true },
        readiness: { preVisitBlockerCount: 0, discoveryObjectiveCount: 0 },
      }),
    ).toBe("post_visit_debrief_required");
    expect(patchBodyForMeetingStateChip("debrief_needed").status).toBe("in_progress");
  });
});
