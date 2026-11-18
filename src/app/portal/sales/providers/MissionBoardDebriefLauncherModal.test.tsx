import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import React from "react";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

import type { MissionBoardDebriefLauncherView } from "@/lib/surgical-sales/missionBoardDebriefLauncherView";

import { DEBRIEF_COMPLETE_LABEL, DEBRIEF_PREPARE_LABEL } from "@/lib/surgical-sales/debriefEngagementLifecycle";

import { MissionBoardDebriefLauncherModal } from "./MissionBoardDebriefLauncherModal";



const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";

const ENGAGEMENT_ID = "22222222-2222-4222-8222-222222222222";



const nav = vi.hoisted(() => ({

  mockPush: vi.fn(),

}));



const api = vi.hoisted(() => ({

  fetchLauncher: vi.fn(),

  runAction: vi.fn(),

}));



vi.mock("next/navigation", () => ({

  useRouter: () => ({ push: nav.mockPush, replace: vi.fn() }),

}));



vi.mock("next/link", () => ({

  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (

    <a href={href} {...rest}>

      {children}

    </a>

  ),

}));



vi.mock("@/lib/surgical-sales/missionBoardDebriefLauncherClient", () => ({

  fetchMissionBoardDebriefLauncher: api.fetchLauncher,

  runMissionBoardDebriefLauncherAction: api.runAction,

}));



function baseProvider(): ProviderDirectoryRow {

  return {

    id: PROVIDER_ID,

    specialty: "Orthopedics",

    primary_organization_name: "Metro General",

    primary_organization_id: "org-1",

    organization_count: 1,

    additional_organizations_count: 0,

    territory: "TX",

    planning_status: "not_started",

    linked_opportunities_count: 0,

    recent_case_count: 0,

    last_activity_at: null,

    relationship_pathway_stage_id: "debrief",

  };

}



function launcherView(

  engagement: MissionBoardDebriefLauncherView["existingEngagement"],

): MissionBoardDebriefLauncherView {

  return {

    providerName: "Dr. Apple",

    organizationName: "Metro General",

    objective: "Validate product fit with the provider.",

    whatWeKnow: ["Five observations complete"],

    biggestUnknown: "Whether they want to evaluate.",

    suggestedOpeningQuestion: "What stood out most from our observations?",

    existingEngagement: engagement,

    completedObservationCount: 5,

  };

}



function baseEngagement(

  extra: Partial<NonNullable<MissionBoardDebriefLauncherView["existingEngagement"]>>,

): NonNullable<MissionBoardDebriefLauncherView["existingEngagement"]> {

  return {

    engagementId: ENGAGEMENT_ID,

    status: "planned",

    lifecyclePhase: "scheduled",

    prepareHref: `/portal/sales/engagements/${ENGAGEMENT_ID}/prepare`,

    activeHref: `/portal/sales/engagements/${ENGAGEMENT_ID}/active`,

    debriefReviewHref: `/portal/sales/engagements/${ENGAGEMENT_ID}/debrief?mode=review`,

    debriefCompleteHref: `/portal/sales/engagements/${ENGAGEMENT_ID}/debrief`,

    resume: false,

    primaryActionLabel: DEBRIEF_PREPARE_LABEL,

    showCompleteDebrief: false,

    showPrepareFullBriefing: true,

    canDictateAndComplete: false,

    canQuickComplete: false,

    isDebriefComplete: false,

    ...extra,

  };

}



afterEach(() => {

  cleanup();

});



beforeEach(() => {

  nav.mockPush.mockClear();

  api.fetchLauncher.mockReset();

  api.runAction.mockReset();

});



describe("MissionBoardDebriefLauncherModal lifecycle routing", () => {

  it("scheduled debrief opens Prepare Debrief to prepare route", async () => {

    api.fetchLauncher.mockResolvedValue({

      ok: true,

      view: launcherView(

        baseEngagement({

          lifecyclePhase: "scheduled",

          primaryActionLabel: DEBRIEF_PREPARE_LABEL,

        }),

      ),

    });

    api.runAction.mockResolvedValue({

      ok: true,

      engagementId: ENGAGEMENT_ID,

      href: `/portal/sales/engagements/${ENGAGEMENT_ID}/prepare`,

      created: false,

    });



    render(<MissionBoardDebriefLauncherModal provider={baseProvider()} onClose={() => {}} />);



    await waitFor(() => {

      expect(screen.getByTestId("mission-board-debrief-prepare")).toBeInTheDocument();

    });



    fireEvent.click(screen.getByTestId("mission-board-debrief-prepare"));



    await waitFor(() => {

      expect(api.runAction).toHaveBeenCalledWith(PROVIDER_ID, "prepare");

      expect(nav.mockPush).toHaveBeenCalledWith(

        `/portal/sales/engagements/${ENGAGEMENT_ID}/prepare`,

      );

    });

  });



  it("prepared debrief starts through active route", async () => {

    api.fetchLauncher.mockResolvedValue({

      ok: true,

      view: launcherView(

        baseEngagement({

          lifecyclePhase: "prepared",

          primaryActionLabel: "Start Debrief",

        }),

      ),

    });

    api.runAction.mockResolvedValue({

      ok: true,

      engagementId: ENGAGEMENT_ID,

      href: `/portal/sales/engagements/${ENGAGEMENT_ID}/active`,

      created: false,

    });



    render(<MissionBoardDebriefLauncherModal provider={baseProvider()} onClose={() => {}} />);



    await waitFor(() => {

      expect(screen.getByTestId("mission-board-debrief-start")).toBeInTheDocument();

    });



    fireEvent.click(screen.getByTestId("mission-board-debrief-start"));



    await waitFor(() => {

      expect(api.runAction).toHaveBeenCalledWith(PROVIDER_ID, "start");

      expect(nav.mockPush).toHaveBeenCalledWith(

        `/portal/sales/engagements/${ENGAGEMENT_ID}/active`,

      );

    });

  });



  it("active debrief shows Complete Debrief link to debrief route", async () => {

    api.fetchLauncher.mockResolvedValue({

      ok: true,

      view: launcherView(

        baseEngagement({

          status: "in_progress",

          lifecyclePhase: "active",

          resume: true,

          primaryActionLabel: "Resume Debrief",

          showCompleteDebrief: true,

          canDictateAndComplete: true,

        }),

      ),

    });



    render(<MissionBoardDebriefLauncherModal provider={baseProvider()} onClose={() => {}} />);



    await waitFor(() => {

      expect(screen.getByTestId("mission-board-debrief-complete")).toBeInTheDocument();

    });

    expect(screen.getByText(DEBRIEF_COMPLETE_LABEL)).toBeInTheDocument();

  });

});


