import { cleanup, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildBeginCallHref } from "@/lib/surgical-sales/engagements/beginEngagementCallClient";
import {
  buildEngagementActiveHref,
  buildEngagementLifecyclePrimaryHref,
  buildEngagementPrepareForMeetingHref,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { PROVIDER_DEBRIEF_ACTIVE_PREPARE_BANNER } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import PrepareForMeetingPortalClient from "./PrepareForMeetingPortalClient";

const ENGAGEMENT_ID = "11111111-1111-4111-8111-111111111111";

const nav = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.mockPush, replace: nav.mockReplace }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/portal/PortalMobileMenuButton", () => ({
  PortalMobileMenuButton: () => null,
}));

vi.mock("./PrepareProviderDebriefFieldBriefing", () => ({
  PrepareProviderDebriefFieldBriefing: () => <div data-testid="debrief-briefing-stub" />,
}));

function buildPreparePayload(status: string, emphasizeRecordOutcome = false) {
  return {
    ok: true,
    prepare: {
      engagement_id: ENGAGEMENT_ID,
      upcoming_engagement: {
        status,
        status_label: status === "in_progress" ? "Active" : status,
        type_label: "Observation Debrief",
        title: "Observation Debrief",
        datetime_label: null,
        organization_name: "Metro General",
      },
      provider_snapshot: {
        display_name: "Dr. John Apple",
        organization_name: "Metro General",
      },
      provider_debrief_briefing: {
        is_provider_debrief: true,
        plan_mode: "generic",
        completed_observation_count: 5,
        plan: null,
        linked_case_id: null,
        linked_case_href: null,
        missing_case_message: null,
      },
      preparation: { is_prepared: false, prepared_at: null, prepared_at_label: null, checklist: [] },
      outcome: { emphasize_record_outcome: emphasizeRecordOutcome },
    },
    engagement: {
      engagement_type: "provider_debrief",
      status,
    },
  };
}

function mockPrepareOpen(status: string, emphasizeRecordOutcome = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildPreparePayload(status, emphasizeRecordOutcome),
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  nav.mockPush.mockClear();
  nav.mockReplace.mockClear();
});

describe("PrepareForMeetingPortalClient — prepare routing", () => {
  it.each(["planned", "in_progress", "completed"] as const)(
    "keeps %s engagements on /prepare (no redirect to /active or detail)",
    async (status) => {
      mockPrepareOpen(status);
      render(<PrepareForMeetingPortalClient engagementId={ENGAGEMENT_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId("debrief-briefing-stub")).toBeInTheDocument();
      });

      expect(nav.mockReplace).not.toHaveBeenCalledWith(
        expect.stringContaining("/active"),
      );
      expect(nav.mockReplace).not.toHaveBeenCalledWith(
        `/portal/sales/engagements/${ENGAGEMENT_ID}`,
      );
      expect(nav.mockReplace).not.toHaveBeenCalledWith(
        expect.stringContaining("/debrief"),
      );
    },
  );

  it("shows active debrief banner when status is in_progress", async () => {
    mockPrepareOpen("in_progress");
    render(<PrepareForMeetingPortalClient engagementId={ENGAGEMENT_ID} />);

    await waitFor(() => {
      expect(screen.getByText(PROVIDER_DEBRIEF_ACTIVE_PREPARE_BANNER)).toBeInTheDocument();
    });
  });

  it("does not show active debrief banner when status is planned", async () => {
    mockPrepareOpen("planned");
    render(<PrepareForMeetingPortalClient engagementId={ENGAGEMENT_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("debrief-briefing-stub")).toBeInTheDocument();
    });

    expect(screen.queryByText(PROVIDER_DEBRIEF_ACTIVE_PREPARE_BANNER)).toBeNull();
  });
});

describe("PrepareForMeetingPortalClient — start and resume still use /active", () => {
  it("resume workflow routes in_progress engagements to /active", () => {
    expect(buildEngagementLifecyclePrimaryHref(ENGAGEMENT_ID, "in_progress")).toBe(
      buildEngagementActiveHref(ENGAGEMENT_ID),
    );
  });

  it("start-after-begin routes to /active", () => {
    expect(buildBeginCallHref(ENGAGEMENT_ID)).toBe(buildEngagementActiveHref(ENGAGEMENT_ID));
  });

  it("prepare launcher href stays on /prepare", () => {
    expect(buildEngagementPrepareForMeetingHref(ENGAGEMENT_ID)).toBe(
      `/portal/sales/engagements/${ENGAGEMENT_ID}/prepare`,
    );
  });
});
