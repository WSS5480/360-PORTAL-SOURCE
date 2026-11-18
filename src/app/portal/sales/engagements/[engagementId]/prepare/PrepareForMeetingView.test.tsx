import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrepareForMeetingView as PrepareView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { PROVIDER_DEBRIEF_ACTIVE_PREPARE_BANNER } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { PrepareForMeetingView } from "./PrepareForMeetingView";
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

// The planning workspace fetches its own data; out of scope for footer behavior.
const debriefBriefingProps = vi.fn();
vi.mock("./PrepareProviderDebriefFieldBriefing", () => ({
  PrepareProviderDebriefFieldBriefing: (props: { engagementId?: string }) => {
    debriefBriefingProps(props);
    return <div data-testid="debrief-briefing-stub" />;
  },
}));

function debriefPrepareView(status: "planned" | "in_progress" | "completed" = "planned"): PrepareView {
  return {
    engagement_id: ENGAGEMENT_ID,
    upcoming_engagement: {
      status,
      status_label: status === "in_progress" ? "Active" : status === "completed" ? "Completed" : "Planned",
      type_label: "Observation Debrief",
      title: "Observation Debrief",
      datetime_label: null,
      organization_name: "Metro General",
    },
    provider_snapshot: {
      display_name: "Dr. John Apple",
      organization_name: "Metro General",
      provider_id: "provider-1",
    },
    capture_scope: {
      organizationId: "org-1",
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
  } as unknown as PrepareView;
}

function Harness({ status = "planned" as "planned" | "in_progress" | "completed" }) {
  const [actionError, setActionError] = React.useState<string | null>(null);
  return (
    <PrepareForMeetingView
      data={debriefPrepareView(status)}
      engagement={{}}
      engagementDetailHref={`/portal/sales/engagements/${ENGAGEMENT_ID}`}
      planningError={null}
      onPlanningError={() => {}}
      onEngagementUpdated={() => {}}
      onPrepareRefresh={() => {}}
      actionError={actionError}
      onActionError={setActionError}
    />
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  nav.mockPush.mockClear();
  nav.mockReplace.mockClear();
  debriefBriefingProps.mockClear();
});

describe("PrepareForMeetingView — provider debrief", () => {
  it("passes engagementId into the debrief planning workspace", () => {
    render(<Harness />);
    expect(debriefBriefingProps).toHaveBeenCalledWith(
      expect.objectContaining({ engagementId: ENGAGEMENT_ID }),
    );
  });

  it("uses the provider debrief shell and start engagement footer", () => {
    render(<Harness />);
    expect(document.querySelector(".prepare-for-meeting-page--provider-debrief")).toBeTruthy();
    expect(document.querySelector(".dpb-command")).toBeTruthy();
    expect(document.querySelector(".dpb-main")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start Engagement" })).toBeInTheDocument();
    expect(screen.getByText("Debrief planning")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Dr. John Apple" })).toBeInTheDocument();
  });

  it("shows active banner and resume link when debrief is in progress", () => {
    render(<Harness status="in_progress" />);
    expect(screen.getByText(PROVIDER_DEBRIEF_ACTIVE_PREPARE_BANNER)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resume Engagement" })).toHaveAttribute(
      "href",
      `/portal/sales/engagements/${ENGAGEMENT_ID}/active`,
    );
    expect(screen.queryByRole("button", { name: "Start Engagement" })).toBeNull();
  });
});
