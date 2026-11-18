import { cleanup, render, screen } from "@testing-library/react";

import React from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

import { MissionBoardFastDebriefModal } from "./MissionBoardFastDebriefModal";



vi.mock("@/lib/surgical-sales/missionBoardFastDebrief", () => ({

  createMissionBoardDebrief: vi.fn(),

}));



const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";



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



afterEach(() => {

  cleanup();

});



describe("MissionBoardFastDebriefModal", () => {

  it("opens date/time scheduling modal for Create Debrief", () => {

    render(

      <MissionBoardFastDebriefModal

        provider={baseProvider()}

        onClose={() => {}}

        onCreate={() => {}}

      />,

    );



    expect(screen.getByTestId("mission-board-debrief-create-modal")).toBeInTheDocument();

    expect(screen.getByText("Schedule Debrief")).toBeInTheDocument();

    expect(screen.getByLabelText("Date")).toBeInTheDocument();

    expect(screen.getByLabelText("Time")).toBeInTheDocument();

    expect(screen.queryByTestId("mission-board-debrief-launcher-modal")).not.toBeInTheDocument();

  });

});


