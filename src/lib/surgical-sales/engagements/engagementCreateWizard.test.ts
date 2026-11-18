import { describe, expect, it } from "vitest";

import {
  buildEngagementCreatePayload,
  emptyEngagementBasicsDraft,
  resolveEngagementCreateBackHref,
  resolveHrefAfterEngagementCreate,
} from "./engagementCreateWizard";

describe("engagementCreateWizard", () => {
  it("resolveEngagementCreateBackHref returns provider overview when provider_id is set", () => {
    expect(
      resolveEngagementCreateBackHref({
        providerId: "00000000-0000-4000-8000-000000000099",
      }),
    ).toBe("/portal/sales/providers/00000000-0000-4000-8000-000000000099?tab=overview");
  });

  it("resolveEngagementCreateBackHref prefers return_to over provider overview", () => {
    expect(
      resolveEngagementCreateBackHref({
        providerId: "00000000-0000-4000-8000-000000000099",
        returnTo: "/portal/sales/cases/new?case_type=observation",
      }),
    ).toBe("/portal/sales/cases/new?case_type=observation");
  });

  it("resolveEngagementCreateBackHref falls back to engagements list", () => {
    expect(resolveEngagementCreateBackHref({})).toBe("/portal/sales/engagements");
  });

  it("builds a planned save payload with optional schedule", () => {
    const basics = {
      ...emptyEngagementBasicsDraft(),
      engagement_type: "follow_up",
      provider_id: "00000000-0000-4000-8000-000000000001",
      organization_id: "00000000-0000-4000-8000-000000000002",
      engagement_date: "2026-06-15",
      engagement_time: "09:30",
    };

    const payload = buildEngagementCreatePayload({
      basics,
      workflowDraft: {
        observation_goal: "Should not persist at create",
        next_action: "Also stripped",
      },
      providerLabel: "Dr. Smith",
      organizationLabel: "Memorial Hospital",
      save_mode: "final",
      postCreateAction: "save",
    });

    expect(payload.status).toBe("planned");
    expect(payload.provider_id).toBe(basics.provider_id);
    expect(payload.organization_id).toBe(basics.organization_id);
    expect(payload.engagement_date).toBe("2026-06-15");
    expect(payload.scheduled_at).toBeTruthy();
    expect(payload.observation_goal).toBeUndefined();
    expect(payload.planning_mode).toBe("plan_first");
    expect(payload.planning_status).toBe("not_planned");
    expect(payload.briefing_id).toBeNull();
  });

  it("omits schedule fields when no date is set", () => {
    const basics = {
      ...emptyEngagementBasicsDraft(),
      engagement_type: "intro_call",
      provider_id: "00000000-0000-4000-8000-000000000001",
      organization_id: "00000000-0000-4000-8000-000000000002",
    };

    const payload = buildEngagementCreatePayload({
      basics,
      workflowDraft: {},
      providerLabel: "Dr. Smith",
      organizationLabel: "Memorial Hospital",
      save_mode: "final",
      postCreateAction: "save",
    });

    expect(payload.engagement_date).toBeUndefined();
    expect(payload.scheduled_date).toBeUndefined();
    expect(payload.scheduled_at).toBeUndefined();
  });

  it("start engagement now sets in_progress with today schedule", () => {
    const basics = {
      ...emptyEngagementBasicsDraft(),
      engagement_type: "intro_call",
      provider_id: "00000000-0000-4000-8000-000000000001",
      organization_id: "00000000-0000-4000-8000-000000000002",
    };

    const payload = buildEngagementCreatePayload({
      basics,
      workflowDraft: { observation_goal: "Ignored" },
      providerLabel: "Dr. Smith",
      organizationLabel: "Memorial Hospital",
      save_mode: "final",
      postCreateAction: "start_call",
    });

    expect(payload.status).toBe("in_progress");
    expect(payload.engagement_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.scheduled_at).toBeTruthy();
    expect(payload.observation_goal).toBeUndefined();
    expect(payload.planning_mode).toBe("plan_first");
    expect(payload.planning_status).toBe("not_planned");
  });

  it("resolveHrefAfterEngagementCreate routes by post action", () => {
    const id = "eng-1";
    expect(resolveHrefAfterEngagementCreate(id, "save")).toBe("/portal/sales/engagements/eng-1");
    expect(resolveHrefAfterEngagementCreate(id, "prepare")).toBe(
      "/portal/sales/engagements/eng-1/prepare",
    );
    expect(resolveHrefAfterEngagementCreate(id, "start_call")).toBe(
      "/portal/sales/engagements/eng-1/active",
    );
  });
});
