import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import {
  newEngagementHandlers,
  newEngagementTestIds,
  resetNewEngagementHandlerState,
} from "@/test/msw/newEngagementHandlers";
import { EngagementFieldBriefingCard } from "./EngagementFieldBriefingCard";

let locationHref = "http://localhost:3000/";

beforeEach(() => {
  resetNewEngagementHandlerState();
  server.use(...newEngagementHandlers);
  locationHref = "http://localhost:3000/";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return locationHref;
      },
      set href(value: string) {
        locationHref = value;
      },
      assign(value: string) {
        locationHref = value;
      },
    },
  });
});

afterEach(() => {
  cleanup();
});

function BriefingGenerationHarness() {
  const [engagement, setEngagement] = React.useState<Record<string, unknown>>({
    engagement_type: "intro_call",
    planning_mode: "quick_add",
    planning_status: "not_planned",
    briefing_id: null,
  });
  const prepareHref = `/portal/sales/engagements/${newEngagementTestIds.engagementId}/prepare`;

  return (
    <EngagementFieldBriefingCard
      engagementId={newEngagementTestIds.engagementId}
      engagement={engagement}
      prepareHref={prepareHref}
      planFilled={0}
      planTotal={5}
      onReload={async () => {
        setEngagement((prev) => ({
          ...prev,
          planning_mode: "plan_first",
          planning_status: "planning_in_progress",
        }));
      }}
    />
  );
}

describe("EngagementFieldBriefingCard", () => {
  it("supports generating a field briefing later from a quick-add engagement", async () => {
    const user = userEvent.setup();
    render(<BriefingGenerationHarness />);

    expect(screen.getByText(/No field briefing created yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Field Briefing/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Generate Field Briefing/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Not Started$/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/No field briefing created yet/i)).not.toBeInTheDocument();
    expect(locationHref).toContain(`/portal/sales/engagements/${newEngagementTestIds.engagementId}/prepare`);
  });

  it("shows planned briefing state when planning_status is planned", () => {
    render(
      <EngagementFieldBriefingCard
        engagementId={newEngagementTestIds.engagementId}
        engagement={{
          engagement_type: "intro_call",
          planning_mode: "plan_first",
          planning_status: "planned",
          briefing_id: newEngagementTestIds.engagementId,
          prepared_at: "2026-06-01T12:00:00.000Z",
        }}
        prepareHref={`/portal/sales/engagements/${newEngagementTestIds.engagementId}/prepare`}
        planFilled={5}
        planTotal={5}
      />,
    );

    expect(screen.getByText(/^Ready$/i)).toBeInTheDocument();
    expect(screen.queryByText(/No field briefing created yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Prepare$/i })).toBeInTheDocument();
  });
});
