import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import {
  engagementCreationRegressionHandlers,
  getLogUpdateCallCount,
  newEngagementTestIds,
  resetEngagementCreationRegressionState,
} from "@/test/msw/engagementCreationRegressionHandlers";
import { getLastCreatedEngagement } from "@/test/msw/newEngagementHandlers";
import { createEngagementWizardCss } from "@/app/portal/sales/engagements/new/createEngagementWizardCss";
import { engagementWizardMobileCss } from "@/app/portal/sales/engagements/new/engagementWizardMobileCss";
import { missionCardByName } from "@/app/portal/sales/engagements/new/engagementMissionTestUtils";
import NewEngagementPortalClient from "@/app/portal/sales/engagements/new/NewEngagementPortalClient";
import { EngagementRecordPanel } from "@/app/portal/sales/engagements/[engagementId]/EngagementRecordPanel";
import { IntroCallFieldBriefing } from "@/app/portal/sales/engagements/[engagementId]/prepare/IntroCallFieldBriefing";
import { prepareForMeetingMobileCss } from "@/app/portal/sales/engagements/[engagementId]/prepare/prepareForMeetingMobileCss";
import {
  ENGAGEMENT_EDIT_ENGAGEMENT_LABEL,
  ENGAGEMENT_LOG_OUTCOME_LABEL,
  ENGAGEMENT_PREPARE_NOW_LABEL,
  ENGAGEMENT_SCHEDULE_FOR_LATER_LABEL,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  bootstrapIntroCallPathwayTacticalAsks,
  INTRO_CALL_START_MISSION_OBJECTIVE,
  INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS,
} from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import {
  FIELD_BRIEFING_EDIT_BRIEF_LABEL,
  FIELD_BRIEFING_EDIT_MODE_KICKER,
  FIELD_BRIEFING_PREPARE_MODE_KICKER,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { engagementAllowsOutcomeIntelligenceApply } from "@/lib/surgical-sales/engagements/engagementOutcomeIntelligence";
import { buildStoredTacticalDebriefNotes } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";

const nav = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.mockPush, replace: vi.fn() }),
  useSearchParams: () => nav.searchParams,
}));

vi.mock("@/components/portal/PortalMobileMenuButton", () => ({
  PortalMobileMenuButton: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  resetEngagementCreationRegressionState();
  nav.searchParams = new URLSearchParams();
  nav.mockPush.mockClear();
  server.use(...engagementCreationRegressionHandlers);
});

async function renderNewEngagementPage() {
  render(
    <>
      <style
        dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
      />
      <NewEngagementPortalClient />
    </>,
  );
  await waitFor(() => {
    expect(screen.getByText(/What are you trying to accomplish/i)).toBeInTheDocument();
  });
}

async function selectIntroCall(user: ReturnType<typeof userEvent.setup>) {
  await user.click(missionCardByName("Intro Call"));
}

async function goToDetailsWithIntroCall(user: ReturnType<typeof userEvent.setup>) {
  await selectIntroCall(user);
  await user.click(screen.getByRole("button", { name: /^Next$/i }));
  await waitFor(() => {
    expect(screen.getByLabelText(/^Provider/i)).toBeInTheDocument();
  });
}

async function fillRequiredDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/^Provider/i), newEngagementTestIds.providerId);
  await waitFor(() => {
    expect(screen.getByLabelText(/^Organization/i)).not.toBeDisabled();
  });
  await user.selectOptions(screen.getByLabelText(/^Organization/i), newEngagementTestIds.organizationId);
}

describe("engagement creation regression — UI", () => {
  describe("Test 1: Intro Call + Save Engagement", () => {
    it("creates a planned engagement without generating briefing or intelligence side effects", async () => {
      const user = userEvent.setup();
      await renderNewEngagementPage();
      await goToDetailsWithIntroCall(user);
      await fillRequiredDetails(user);
      await user.click(screen.getByRole("button", { name: ENGAGEMENT_SCHEDULE_FOR_LATER_LABEL }));

      await waitFor(() => {
        expect(getLastCreatedEngagement()).not.toBeNull();
      });

      const created = getLastCreatedEngagement()!;
      expect(created.engagement_type).toBe("intro_call");
      expect(created.status).toBe("planned");
      expect(created.planning_status).toBe("not_planned");
      expect(created.briefing_id).toBeNull();
      expect(created.observation_goal).toBeUndefined();
      expect(created.pre_observation_probes).toBeUndefined();
      expect(getLogUpdateCallCount()).toBe(0);

      await waitFor(() => {
        expect(nav.mockPush).toHaveBeenCalledWith(
          `/portal/sales/engagements/${created.id}`,
        );
      });
    });
  });

  describe("Test 2: Intro Call + Save & Prepare", () => {
    it("opens field briefing with suggested prep labels and no confirmed provider intelligence writes", async () => {
      const user = userEvent.setup();
      await renderNewEngagementPage();

      await goToDetailsWithIntroCall(user);
      await fillRequiredDetails(user);
      await user.click(screen.getByRole("button", { name: ENGAGEMENT_PREPARE_NOW_LABEL }));

      await waitFor(() => {
        expect(getLastCreatedEngagement()).not.toBeNull();
      });

      const created = getLastCreatedEngagement()!;
      expect(created.planning_mode).toBe("plan_first");
      expect(created.planning_status).toBe("not_planned");
      expect(created.briefing_id).toBeNull();
      expect(getLogUpdateCallCount()).toBe(0);

      await waitFor(() => {
        expect(nav.mockPush).toHaveBeenCalledWith(
          `/portal/sales/engagements/${created.id}/prepare`,
        );
      });

      const introBriefingAsks = bootstrapIntroCallPathwayTacticalAsks({
        stored: null,
        knownIntelligence: { bullets: [], last_key_insight: null },
      });
      const onBriefingSaved = vi.fn();
      const onBriefingError = vi.fn();

      cleanup();
      render(
        <>
          <style dangerouslySetInnerHTML={{ __html: prepareForMeetingMobileCss }} />
          <IntroCallFieldBriefing
            engagementId={String(created.id)}
            providerName="Jordan Rivera"
            organizationName="Metro General"
            engagementTypeLabel="Intro Call"
            specialty="General Surgery"
            locationLabel={null}
            knownIntelligence={{ bullets: [], last_key_insight: null }}
            recentActivity={{ items: [], timeline_href: "/portal/sales/providers/p1" }}
            lastEngagementTitle={null}
            lastEngagementDateLabel={null}
            planFields={{
              observation_goal: null,
              pre_observation_probes: null,
              pre_observation_value_hypothesis: null,
              pre_observation_planned_close: null,
              engagement_purpose: null,
              next_action: null,
            }}
            tacticalAsks={introBriefingAsks}
            onBriefingSaved={onBriefingSaved}
            onBriefingError={onBriefingError}
          />
        </>,
      );

      expect(screen.getByText("Provider mission brief")).toBeInTheDocument();
      expect(screen.getByText("Jordan Rivera")).toBeInTheDocument();
      expect(document.querySelector(".pfm-exec-briefing__site")?.textContent).toBe("Metro General");
      expect(screen.getByText(FIELD_BRIEFING_PREPARE_MODE_KICKER)).toBeInTheDocument();
      expect(screen.getByText(/Question queue/i)).toBeInTheDocument();
      expect(screen.getByText(INTRO_CALL_START_MISSION_OBJECTIVE)).toBeInTheDocument();
      expect(screen.getByText(INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS[0])).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Start Engagement$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: FIELD_BRIEFING_EDIT_BRIEF_LABEL })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Save Briefing/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Suggested/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Confirmed/i)).not.toBeInTheDocument();
      expect(getLogUpdateCallCount()).toBe(0);

      await user.click(screen.getByRole("button", { name: FIELD_BRIEFING_EDIT_BRIEF_LABEL }));
      expect(screen.getByText(FIELD_BRIEFING_EDIT_MODE_KICKER)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save Briefing/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Start Engagement$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: FIELD_BRIEFING_EDIT_BRIEF_LABEL })).not.toBeInTheDocument();
    });
  });

  describe("Test 3: Log outcome — Karen handles scheduling", () => {
    it("allows provider intelligence only after outcome notes are saved", async () => {
      const notes = buildStoredTacticalDebriefNotes({
        narrative: "Karen handles scheduling.",
      });

      expect(
        engagementAllowsOutcomeIntelligenceApply({
          notes: null,
          debrief_completed: false,
        }),
      ).toBe(false);

      expect(
        engagementAllowsOutcomeIntelligenceApply({
          notes,
          debrief_completed: true,
        }),
      ).toBe(true);

      expect(getLogUpdateCallCount()).toBe(0);
    });
  });

  describe("Test 4: New planned engagement detail page", () => {
    it("renders mission-aware intro call record with pathway defaults and edit controls", () => {
      render(
        <EngagementRecordPanel
          engagementId={newEngagementTestIds.engagementId}
          engagement={{
            engagement_type: "intro_call",
            status: "planned",
            planning_mode: "quick_add",
            planning_status: "not_planned",
            briefing_id: null,
            provider_id: newEngagementTestIds.providerId,
            organization_id: newEngagementTestIds.organizationId,
          }}
          provider={{ id: newEngagementTestIds.providerId, display_name: "Jordan Rivera" }}
          organization={{ id: newEngagementTestIds.organizationId, name: "Metro General" }}
          linkedCaseId={null}
          linkedOpportunity={null}
        />,
      );

      expect(screen.getByText("Intro Call")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "Jordan Rivera" })).toBeInTheDocument();
      expect(screen.getByText("Metro General")).toBeInTheDocument();
      expect(screen.getByText("Planned")).toBeInTheDocument();
      expect(screen.getByText("Goal")).toBeInTheDocument();
      expect(screen.getByText("Preparation")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.queryByText("Scheduling")).not.toBeInTheDocument();
      expect(screen.queryByText("Preparation Status")).not.toBeInTheDocument();

      expect(screen.getByRole("link", { name: /^Prepare$/i })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /^Start Engagement$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: ENGAGEMENT_LOG_OUTCOME_LABEL })).not.toBeInTheDocument();
      expect(screen.queryByText("Question queue")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: ENGAGEMENT_EDIT_ENGAGEMENT_LABEL }),
      ).toBeInTheDocument();
    });
  });
});
