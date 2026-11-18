import { describe, expect, it } from "vitest";
import {
  buildEngagementOpenHref,
  buildEngagementPrimaryAction,
  buildEngagementSurfaceActionsFromSummary,
  engagementWorkflowPrimaryCtaLabel,
  resolveEngagementWorkflowState,
} from "./engagementWorkflowState";
import type { ProviderEngagementSummary } from "./providerEngagementSummary";

describe("engagementWorkflowState", () => {
  it("maps planned without briefing to planned", () => {
    expect(
      resolveEngagementWorkflowState({
        status: "planned",
        planningStatus: "not_planned",
      }),
    ).toBe("planned");
  });

  it("maps planned with briefing ready to prepared", () => {
    expect(
      resolveEngagementWorkflowState({
        status: "planned",
        preparedAt: "2026-06-01T12:00:00.000Z",
      }),
    ).toBe("prepared");
  });

  it("maps in_progress to live workspace state", () => {
    expect(resolveEngagementWorkflowState({ status: "in_progress" })).toBe("in_progress");
  });

  it("maps completed without debrief to completed", () => {
    expect(
      resolveEngagementWorkflowState({
        status: "completed",
        hasDebrief: false,
      }),
    ).toBe("completed");
  });

  it("maps completed with debrief to closed", () => {
    expect(
      resolveEngagementWorkflowState({
        status: "completed",
        hasDebrief: true,
      }),
    ).toBe("closed");
  });

  it("routes Open by state", () => {
    expect(buildEngagementOpenHref("e1", "planned")).toContain("/prepare");
    expect(buildEngagementOpenHref("e1", "prepared")).toContain("/prepare");
    expect(buildEngagementOpenHref("e1", "in_progress")).toContain("/active");
    expect(buildEngagementOpenHref("e1", "completed")).toContain("/debrief");
    expect(buildEngagementOpenHref("e1", "closed")).toContain("/debrief");
  });

  it("uses one primary label per state", () => {
    expect(engagementWorkflowPrimaryCtaLabel("planned")).toBe("Prepare");
    expect(engagementWorkflowPrimaryCtaLabel("prepared", "intro_call")).toBe("Start Engagement");
    expect(engagementWorkflowPrimaryCtaLabel("prepared", "office_visit")).toBe("Start Engagement");
    expect(engagementWorkflowPrimaryCtaLabel("in_progress")).toBe("Resume Engagement");
    expect(engagementWorkflowPrimaryCtaLabel("completed")).toBe("Continue Debrief");
    expect(engagementWorkflowPrimaryCtaLabel("closed")).toBe("View Debrief");
  });

  it("builds primary action with matching label and href", () => {
    const action = buildEngagementPrimaryAction({
      engagementId: "e1",
      state: "in_progress",
    });
    expect(action.label).toBe("Resume Engagement");
    expect(action.href).toContain("/active");
  });
});

describe("buildEngagementSurfaceActionsFromSummary", () => {
  it("keeps Prepare alongside Start when briefing is ready", () => {
    const actions = buildEngagementSurfaceActionsFromSummary({
      id: "e1",
      engagement_type: "intro_call",
      status: "planned",
      prepared_at: "2026-06-01T12:00:00.000Z",
    } as ProviderEngagementSummary);
    expect(actions.primary.label).toBe("Start Engagement");
    expect(actions.primary.href).toContain("/active");
    expect(actions.primaryUsesBeginCall).toBe(true);
    expect(actions.prepareSecondary?.href).toContain("/prepare");
  });

  it("keeps Prepare alongside Resume when engagement is active", () => {
    const actions = buildEngagementSurfaceActionsFromSummary({
      id: "e1",
      engagement_type: "or_visit",
      status: "in_progress",
      prepared_at: "2026-06-01T12:00:00.000Z",
    } as ProviderEngagementSummary);
    expect(actions.primary.label).toBe("Resume Engagement");
    expect(actions.primary.href).toContain("/active");
    expect(actions.prepareSecondary?.label).toBe("Prepare");
    expect(actions.primaryUsesBeginCall).toBe(false);
  });

  it("routes unprepared planned engagements to Prepare only", () => {
    const actions = buildEngagementSurfaceActionsFromSummary({
      id: "e1",
      engagement_type: "follow_up",
      status: "planned",
      planning_status: "not_planned",
    } as ProviderEngagementSummary);
    expect(actions.primary.label).toBe("Prepare");
    expect(actions.primary.href).toContain("/prepare");
    expect(actions.primaryUsesBeginCall).toBe(false);
  });
});
