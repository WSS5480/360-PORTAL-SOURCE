import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActiveProviderDebriefWorkspace } from "./ActiveProviderDebriefWorkspace";
import type { ActiveProviderDebriefGuide } from "@/lib/surgical-sales/engagements/buildActiveProviderDebriefGuide";
import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";

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

vi.mock("@/components/sales/EngagementRepLifecycleStrip", () => ({
  EngagementRepLifecycleStrip: () => null,
}));

vi.mock("@/lib/surgical-sales/engagements/beginEngagementCallClient", () => ({
  beginEngagementCallClient: vi.fn(async () => ({ ok: true })),
}));

const guide: ActiveProviderDebriefGuide = {
  providerName: "Mark Onion",
  engagementTypeLabel: "Observation Debrief",
  executionGuide: {
    meetingObjective: "Confirm whether visualization friction is routine enough to pursue ACSIS.",
    whatWeObserved: ["Extra visualization time before fixation (4 of 5 observations)"],
    whatToValidate: ["Does extra visualization time before fixation affect how you experience these cases?"],
    conversationStarters: [
      "When visualization is tight, what do you do differently before mesh fixation?",
      "How often does this slow the case down?",
    ],
    recommendedOutcome: "Evaluation Case",
    primaryHypothesis: "Visualization challenges may warrant an ACSIS evaluation.",
    source: "saved_prepare_workspace",
  },
  outcomes: [],
  outcomeRecorded: false,
  outcomeId: null,
  outcomeLabel: null,
  suggestedOutcomeId: null,
};

const data = {
  provider_snapshot: {
    display_name: "Mark Onion",
    organization_name: "Pilot Hospital",
  },
  upcoming_engagement: { status: "in_progress" },
  live_session: { live_notes: "", outcome_recorded: false, outcome_id: null, outcome_label: null },
} as unknown as PrepareForMeetingView;

describe("ActiveProviderDebriefWorkspace", () => {
  it("shows polished guide sections without outcome radios", () => {
    const onEnd = vi.fn();
    render(
      <ActiveProviderDebriefWorkspace
        engagementId="eng-1"
        guide={guide}
        data={data}
        onReload={vi.fn()}
        onError={vi.fn()}
        onEndEngagement={onEnd}
      />,
    );

    expect(screen.getByText(/Meeting objective/i)).toBeInTheDocument();
    expect(screen.getByText(/Your read going in/i)).toBeInTheDocument();
    expect(screen.getByText(/Pilot Hospital/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Outcome$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Possible next step/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /End Debrief/i }));
    expect(onEnd).toHaveBeenCalledWith(null, "");
  });
});
