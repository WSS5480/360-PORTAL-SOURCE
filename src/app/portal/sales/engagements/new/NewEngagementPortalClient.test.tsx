import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import {
  getLastCreatedEngagement,
  newEngagementHandlers,
  newEngagementTestIds,
  resetNewEngagementHandlerState,
} from "@/test/msw/newEngagementHandlers";
import { createEngagementWizardCss } from "./createEngagementWizardCss";
import { engagementWizardMobileCss } from "./engagementWizardMobileCss";
import { missionCardByName } from "./engagementMissionTestUtils";
import NewEngagementPortalClient from "./NewEngagementPortalClient";
import {
  DEBRIEF_CREATE_SCREEN_TITLE,
  DEBRIEF_PREPARE_NOW_LABEL,
  DEBRIEF_SCHEDULE_FOR_LATER_LABEL,
  DEBRIEF_START_NOW_LABEL,
  ENGAGEMENT_PREPARE_NOW_LABEL,
  ENGAGEMENT_SAVE_AND_PREPARE_LABEL,
  ENGAGEMENT_SAVE_LABEL,
  ENGAGEMENT_START_CALL_NOW_LABEL,
  INTRO_CALL_SAVE_WITHOUT_PREPARING_LABEL,
  buildProviderOverviewHref,
  engagementCreateScreenCopy,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";

const INTRO_CALL_COPY = engagementCreateScreenCopy("intro_call");
const FOLLOW_UP_COPY = engagementCreateScreenCopy("follow_up");
const DEBRIEF_COPY = engagementCreateScreenCopy("provider_debrief");

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
  resetNewEngagementHandlerState();
  nav.searchParams = new URLSearchParams();
  nav.mockPush.mockClear();
  server.use(...newEngagementHandlers);
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
  await waitForPageReady();
}

async function waitForPageReady() {
  await waitFor(() => {
    expect(screen.getByText(/What are you trying to accomplish/i)).toBeInTheDocument();
    expect(document.querySelectorAll(".create-engagement-mission-card").length).toBeGreaterThan(0);
  });
}

async function selectMission(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(missionCardByName(name));
}

async function goToDetailsWithIntroCall(user: ReturnType<typeof userEvent.setup>) {
  await selectMission(user, "Intro Call");
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

function headerStepLabel() {
  const meta = document.querySelector(".create-engagement-header-meta");
  return meta?.textContent?.trim() ?? "";
}

describe("NewEngagementPortalClient", () => {
  it("save without preparing creates planned record and opens detail page", async () => {
    const user = userEvent.setup();
    await renderNewEngagementPage();
    await goToDetailsWithIntroCall(user);
    await fillRequiredDetails(user);
    await user.click(screen.getByRole("button", { name: INTRO_CALL_SAVE_WITHOUT_PREPARING_LABEL }));

    await waitFor(() => {
      expect(getLastCreatedEngagement()).not.toBeNull();
    });

    const created = getLastCreatedEngagement()!;
    expect(created.engagement_type).toBe("intro_call");
    expect(created.status).toBe("planned");
    expect(created.planning_mode).toBe("plan_first");
    expect(created.planning_status).toBe("not_planned");
    expect(created.briefing_id).toBeNull();

    await waitFor(() => {
      expect(nav.mockPush).toHaveBeenCalledWith(
        `/portal/sales/engagements/${created.id}`,
      );
    });

    expect(screen.queryByText(/Skip preparation/i)).not.toBeInTheDocument();
  });

  it("prepare now opens prepare after create", async () => {
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

    await waitFor(() => {
      expect(nav.mockPush).toHaveBeenCalledWith(
        `/portal/sales/engagements/${created.id}/prepare`,
      );
    });
  });

  it("does not offer start intro call on the create screen", async () => {
    const user = userEvent.setup();
    await renderNewEngagementPage();
    await goToDetailsWithIntroCall(user);
    await fillRequiredDetails(user);

    expect(
      screen.queryByRole("button", { name: INTRO_CALL_COPY.startNowLabel }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: INTRO_CALL_SAVE_WITHOUT_PREPARING_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ENGAGEMENT_PREPARE_NOW_LABEL })).toBeInTheDocument();
  });

  it("shows Next only after type is selected", async () => {
    const user = userEvent.setup();
    await renderNewEngagementPage();

    expect(screen.getByText(/Select an engagement type to continue/i)).toBeInTheDocument();
    expect(document.querySelector(".create-engagement-footer-actions")).toBeNull();
    expect(screen.queryByRole("button", { name: ENGAGEMENT_SAVE_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ENGAGEMENT_START_CALL_NOW_LABEL })).not.toBeInTheDocument();

    await selectMission(user, "Intro Call");

    expect(screen.getByRole("button", { name: /^Next$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Prepare First$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Schedule touchpoint$/i })).not.toBeInTheDocument();
  });

  it("details step shows save and prepare actions with prepare emphasized", async () => {
    const user = userEvent.setup();
    await renderNewEngagementPage();
    await goToDetailsWithIntroCall(user);

    const footer = document.querySelector(".create-engagement-footer");
    expect(footer).not.toBeNull();
    const actions = within(footer as HTMLElement);
    expect(actions.getByRole("button", { name: INTRO_CALL_SAVE_WITHOUT_PREPARING_LABEL })).toBeInTheDocument();
    expect(actions.getByRole("button", { name: ENGAGEMENT_PREPARE_NOW_LABEL })).toBeInTheDocument();
    expect(actions.queryByRole("button", { name: INTRO_CALL_COPY.startNowLabel })).not.toBeInTheDocument();
    // Old CRM labels are fully retired from the details step.
    expect(actions.queryByRole("button", { name: ENGAGEMENT_SAVE_LABEL })).not.toBeInTheDocument();
    expect(actions.queryByRole("button", { name: ENGAGEMENT_SAVE_AND_PREPARE_LABEL })).not.toBeInTheDocument();
    expect(actions.queryByRole("button", { name: ENGAGEMENT_START_CALL_NOW_LABEL })).not.toBeInTheDocument();
    // Prepare carries primary emphasis for planned conversation types.
    expect(actions.getByRole("button", { name: ENGAGEMENT_PREPARE_NOW_LABEL })).toHaveClass("primary");
  });

  describe("mission-specific launches skip the type picker", () => {
    async function renderDeepLinkedPage(engagementType: string) {
      nav.searchParams = new URLSearchParams({ engagement_type: engagementType });
      render(
        <>
          <style
            dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
          />
          <NewEngagementPortalClient />
        </>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText(/^Provider/i)).toBeInTheDocument();
      });
    }

    it("Plan Debrief opens debrief preparation details directly", async () => {
      await renderDeepLinkedPage("provider_debrief");

      // Lands on the details step with the mission already applied.
      expect(screen.getByRole("heading", { name: DEBRIEF_CREATE_SCREEN_TITLE })).toBeInTheDocument();
      // Deep-linked launches drop wizard stepper chrome (no Step 1/2 meta, no tabs).
      expect(headerStepLabel()).toBe("Required fields only");
      expect(document.querySelector(".create-engagement-segments")).toBeNull();
      // No mission selector, no recommended-mission pitch.
      expect(screen.queryByText(/What are you trying to accomplish/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Recommended Next Mission/i)).not.toBeInTheDocument();
      expect(document.querySelectorAll(".create-engagement-mission-card")).toHaveLength(0);
    });

    it("Intro Call opens intro call preparation details directly and saves the right type", async () => {
      const user = userEvent.setup();
      await renderDeepLinkedPage("intro_call");

      expect(screen.getByRole("heading", { name: INTRO_CALL_COPY.title })).toBeInTheDocument();
      expect(screen.queryByText(/Recommended Next Mission/i)).not.toBeInTheDocument();

      // Creation still works end-to-end from the deep-linked flow.
      await fillRequiredDetails(user);
      await user.click(screen.getByRole("button", { name: ENGAGEMENT_PREPARE_NOW_LABEL }));
      await waitFor(() => {
        expect(getLastCreatedEngagement()).not.toBeNull();
      });
      const created = getLastCreatedEngagement()!;
      expect(created.engagement_type).toBe("intro_call");
      await waitFor(() => {
        expect(nav.mockPush).toHaveBeenCalledWith(`/portal/sales/engagements/${created.id}/prepare`);
      });
    });

    it("returns to provider overview when launched from a provider context", async () => {
      const user = userEvent.setup();
      nav.searchParams = new URLSearchParams({
        engagement_type: "intro_call",
        provider_id: newEngagementTestIds.providerId,
        organization_id: newEngagementTestIds.organizationId,
      });
      render(
        <>
          <style
            dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
          />
          <NewEngagementPortalClient />
        </>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText(/^Provider/i)).toBeInTheDocument();
      });

      const providerBackHref = buildProviderOverviewHref(newEngagementTestIds.providerId);
      expect(screen.getByRole("link", { name: /← Back/i })).toHaveAttribute("href", providerBackHref);

      await user.click(screen.getByRole("button", { name: /^Back$/i }));
      expect(nav.mockPush).toHaveBeenCalledWith(providerBackHref);
    });

    it("hides Recommended Next Mission when navigating back to the type step without provider context", async () => {
      const user = userEvent.setup();
      await renderDeepLinkedPage("intro_call");

      await user.click(screen.getByRole("button", { name: /^Back$/i }));
      await waitFor(() => {
        expect(screen.getByText(/What are you trying to accomplish/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/Recommended Next Mission/i)).not.toBeInTheDocument();
    });

    it("generic New Engagement still shows the mission selector with recommendation", async () => {
      await renderNewEngagementPage();

      expect(headerStepLabel()).toMatch(/Step 1 of 2/i);
      expect(screen.getByText(/What are you trying to accomplish/i)).toBeInTheDocument();
      expect(screen.getByText(/Recommended Next Mission/i)).toBeInTheDocument();
      expect(
        document.querySelectorAll(".create-engagement-mission-card").length,
      ).toBeGreaterThan(0);
      // No save actions before a type is chosen.
      expect(screen.queryByRole("button", { name: ENGAGEMENT_SAVE_LABEL })).not.toBeInTheDocument();
    });

    it("invalid engagement_type falls back to the type picker", async () => {
      nav.searchParams = new URLSearchParams({ engagement_type: "not_a_real_type" });
      render(
        <>
          <style
            dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
          />
          <NewEngagementPortalClient />
        </>,
      );
      await waitForPageReady();
      expect(headerStepLabel()).toMatch(/Step 1 of 2/i);
      expect(screen.getByText(/Recommended Next Mission/i)).toBeInTheDocument();
    });
  });

  describe("observation debrief launch (Plan Debrief)", () => {
    async function renderDebriefLaunch() {
      nav.searchParams = new URLSearchParams({
        engagement_type: "provider_debrief",
        provider_id: newEngagementTestIds.providerId,
        organization_id: newEngagementTestIds.organizationId,
      });
      render(
        <>
          <style
            dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
          />
          <NewEngagementPortalClient />
        </>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText(/^Provider/i)).toBeInTheDocument();
      });
    }

    it("uses field-execution language instead of the CRM wizard", async () => {
      await renderDebriefLaunch();

      // Page renamed.
      expect(screen.getByRole("heading", { name: DEBRIEF_CREATE_SCREEN_TITLE })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /^New engagement$/i })).not.toBeInTheDocument();

      // Intent-based actions replace CRM buttons.
      expect(screen.getByRole("button", { name: DEBRIEF_SCHEDULE_FOR_LATER_LABEL })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: DEBRIEF_PREPARE_NOW_LABEL })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: DEBRIEF_START_NOW_LABEL })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: ENGAGEMENT_SAVE_LABEL })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: ENGAGEMENT_SAVE_AND_PREPARE_LABEL })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: ENGAGEMENT_START_CALL_NOW_LABEL })).not.toBeInTheDocument();

      // Prepare Now carries the primary emphasis.
      expect(screen.getByRole("button", { name: DEBRIEF_PREPARE_NOW_LABEL })).toHaveClass("primary");

      // Scheduling is collapsed behind the optional toggle.
      expect(screen.getByRole("button", { name: DEBRIEF_COPY.schedulingToggleLabel ?? "" })).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Date$/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^Time$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^More options$/i)).not.toBeInTheDocument();
    });

    it("scenario 1: Prepare Now opens the debrief prep workspace with no extra clicks", async () => {
      const user = userEvent.setup();
      await renderDebriefLaunch();

      await user.click(screen.getByRole("button", { name: DEBRIEF_PREPARE_NOW_LABEL }));

      await waitFor(() => {
        expect(getLastCreatedEngagement()).not.toBeNull();
      });
      const created = getLastCreatedEngagement()!;
      expect(created.engagement_type).toBe("provider_debrief");
      expect(created.status).toBe("planned");
      await waitFor(() => {
        expect(nav.mockPush).toHaveBeenCalledWith(`/portal/sales/engagements/${created.id}/prepare`);
      });
    });

    it("scenario 2: expand scheduling, pick date/time, Schedule for Later returns to the provider page", async () => {
      const user = userEvent.setup();
      await renderDebriefLaunch();

      await user.click(screen.getByRole("button", { name: DEBRIEF_COPY.schedulingToggleLabel ?? "" }));
      const dateInput = await screen.findByLabelText(/^Date$/i);
      fireEvent.change(dateInput, { target: { value: "2026-06-18" } });
      fireEvent.change(screen.getByLabelText(/^Time$/i), { target: { value: "14:30" } });

      await user.click(screen.getByRole("button", { name: DEBRIEF_SCHEDULE_FOR_LATER_LABEL }));

      await waitFor(() => {
        expect(getLastCreatedEngagement()).not.toBeNull();
      });
      const created = getLastCreatedEngagement()!;
      expect(created.engagement_type).toBe("provider_debrief");
      expect(created.engagement_date).toBe("2026-06-18");
      expect(created.scheduled_at).toBeTruthy();
      expect(created.status).toBe("planned");

      // Field context, not the CRM engagement detail page.
      await waitFor(() => {
        expect(nav.mockPush).toHaveBeenCalledWith(
          `/portal/sales/providers/${newEngagementTestIds.providerId}?tab=overview`,
        );
      });
    });

    it("scenario 3: Start Debrief launches the live debrief screen immediately", async () => {
      const user = userEvent.setup();
      await renderDebriefLaunch();

      await user.click(screen.getByRole("button", { name: DEBRIEF_START_NOW_LABEL }));

      await waitFor(() => {
        expect(getLastCreatedEngagement()).not.toBeNull();
      });
      const created = getLastCreatedEngagement()!;
      expect(created.engagement_type).toBe("provider_debrief");
      expect(created.status).toBe("in_progress");
      expect(created.scheduled_at).toBeTruthy();
      await waitFor(() => {
        expect(nav.mockPush).toHaveBeenCalledWith(`/portal/sales/engagements/${created.id}/active`);
      });
    });

    it("other mission launches use the same intent-based template (intro call)", async () => {
      nav.searchParams = new URLSearchParams({ engagement_type: "intro_call" });
      render(
        <>
          <style
            dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
          />
          <NewEngagementPortalClient />
        </>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText(/^Provider/i)).toBeInTheDocument();
      });

      expect(screen.getByRole("heading", { name: INTRO_CALL_COPY.title })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /^New engagement$/i })).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Confirm the provider and organization/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Prepare Now opens the playbook/i),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: INTRO_CALL_SAVE_WITHOUT_PREPARING_LABEL })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: ENGAGEMENT_PREPARE_NOW_LABEL })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: INTRO_CALL_COPY.startNowLabel })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: ENGAGEMENT_SAVE_LABEL })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/^Date$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Time$/i)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: INTRO_CALL_COPY.schedulingToggleLabel ?? "" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/^More options$/i)).not.toBeInTheDocument();
      // Prepare is primary for planned conversations.
      expect(screen.getByRole("button", { name: ENGAGEMENT_PREPARE_NOW_LABEL })).toHaveClass("primary");
    });

    it("relationship touches emphasize Start instead of Prepare (follow-up)", async () => {
      nav.searchParams = new URLSearchParams({ engagement_type: "follow_up" });
      render(
        <>
          <style
            dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
          />
          <NewEngagementPortalClient />
        </>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText(/^Provider/i)).toBeInTheDocument();
      });

      expect(screen.getByRole("heading", { name: FOLLOW_UP_COPY.title })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: FOLLOW_UP_COPY.startNowLabel })).toHaveClass("primary");
      expect(screen.getByRole("button", { name: ENGAGEMENT_PREPARE_NOW_LABEL })).not.toHaveClass("primary");
    });

    it("schedule for later on a mission launch with provider returns to the provider page", async () => {
      const user = userEvent.setup();
      nav.searchParams = new URLSearchParams({
        engagement_type: "intro_call",
        provider_id: newEngagementTestIds.providerId,
        organization_id: newEngagementTestIds.organizationId,
      });
      render(
        <>
          <style
            dangerouslySetInnerHTML={{ __html: `${createEngagementWizardCss}\n${engagementWizardMobileCss}` }}
          />
          <NewEngagementPortalClient />
        </>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText(/^Provider/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: INTRO_CALL_SAVE_WITHOUT_PREPARING_LABEL }));
      await waitFor(() => {
        expect(getLastCreatedEngagement()).not.toBeNull();
      });
      await waitFor(() => {
        expect(nav.mockPush).toHaveBeenCalledWith(
          `/portal/sales/providers/${newEngagementTestIds.providerId}?tab=overview`,
        );
      });
    });
  });
});
