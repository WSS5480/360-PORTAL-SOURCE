import { describe, expect, it } from "vitest";
import {
  buildEngagementMobileActionTray,
  resolveEngagementMobileActionPhase,
} from "./engagementMobileActionTray";

describe("resolveEngagementMobileActionPhase", () => {
  it("maps planned to pre_visit", () => {
    expect(resolveEngagementMobileActionPhase("planned")).toBe("pre_visit");
  });

  it("maps in_progress to post_visit", () => {
    expect(resolveEngagementMobileActionPhase("in_progress")).toBe("post_visit");
  });

  it("maps completed to visit_closed", () => {
    expect(resolveEngagementMobileActionPhase("completed")).toBe("visit_closed");
  });
});

describe("buildEngagementMobileActionTray", () => {
  it("uses Prepare as primary before briefing is ready", () => {
    const tray = buildEngagementMobileActionTray({
      engagementId: "e1",
      status: "planned",
      linkedCaseId: null,
      hasProvider: true,
    });
    expect(tray.phase).toBe("pre_visit");
    expect(tray.primary).toEqual({
      id: "primary",
      label: "Prepare",
      href: "/portal/sales/engagements/e1/prepare",
    });
    expect(tray.secondaries.map((s) => s.id)).toEqual(["case"]);
  });

  it("uses Start Engagement action when briefing is ready but touch is still planned", () => {
    const tray = buildEngagementMobileActionTray({
      engagementId: "e-prep",
      status: "planned",
      linkedCaseId: null,
      hasProvider: true,
      engagement: { prepared_at: "2026-06-01T12:00:00.000Z", planning_status: "planned" },
    });
    expect(tray.primary).toEqual({
      id: "primary",
      label: "Start Engagement",
      action: "start_engagement",
    });
  });

  it("uses Resume Engagement as primary during active touch", () => {
    const tray = buildEngagementMobileActionTray({
      engagementId: "e2",
      status: "in_progress",
      linkedCaseId: "c9",
      hasProvider: false,
    });
    expect(tray.primary.label).toBe("Resume Engagement");
    expect(tray.primary.href).toContain("/active");
    expect(tray.primary.href).not.toContain("/debrief");
  });

  it("routes Debrief when touch is complete without debrief", () => {
    const tray = buildEngagementMobileActionTray({
      engagementId: "e3",
      status: "completed",
      linkedCaseId: null,
      hasProvider: true,
    });
    expect(tray.primary.label).toBe("Continue Debrief");
    expect(tray.primary.href).toContain("/debrief");
  });
});
