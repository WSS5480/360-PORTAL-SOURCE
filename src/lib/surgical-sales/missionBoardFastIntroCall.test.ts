import { describe, expect, it } from "vitest";

import { buildMissionBoardIntroCallPayload } from "./missionBoardFastIntroCall";

describe("buildMissionBoardIntroCallPayload", () => {
  it("creates a lightweight planned intro call with schedule fields", () => {
    const payload = buildMissionBoardIntroCallPayload({
      providerId: "p1",
      organizationId: "org-1",
      providerLabel: "Tony Lettuce",
      organizationLabel: "Pilot Hospital",
      engagementDate: "2026-06-15",
      engagementTime: "14:30",
      note: "Call from mission board",
    });

    expect(payload.engagement_type).toBe("intro_call");
    expect(payload.status).toBe("planned");
    expect(payload.planning_mode).toBe("quick_add");
    expect(payload.engagement_date).toBe("2026-06-15");
    expect(payload.scheduled_at).toBeTruthy();
    expect(payload.notes).toBe("Call from mission board");
  });
});
