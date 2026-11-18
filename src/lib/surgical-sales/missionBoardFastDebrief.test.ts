import { describe, expect, it } from "vitest";



import { buildMissionBoardDebriefPayload } from "./missionBoardFastDebrief";



describe("buildMissionBoardDebriefPayload", () => {

  it("creates a lightweight planned provider_debrief with schedule fields", () => {

    const payload = buildMissionBoardDebriefPayload({

      providerId: "p1",

      organizationId: "org-1",

      providerLabel: "Tony Lettuce",

      organizationLabel: "Pilot Hospital",

      engagementDate: "2026-06-15",

      engagementTime: "14:30",

      note: "Debrief from mission board",

    });



    expect(payload.engagement_type).toBe("provider_debrief");

    expect(payload.status).toBe("planned");

    expect(payload.planning_mode).toBe("quick_add");

    expect(payload.engagement_date).toBe("2026-06-15");

    expect(payload.scheduled_at).toBeTruthy();

    expect(payload.notes).toBe("Debrief from mission board");

  });

});


