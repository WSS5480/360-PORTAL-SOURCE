import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { MissionBoardAddCaseModal } from "./MissionBoardAddCaseModal";

vi.mock("@/lib/surgical-sales/missionBoardFastObservation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/surgical-sales/missionBoardFastObservation")>();
  return {
    ...actual,
    createMissionBoardCase: vi.fn(),
  };
});

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
    relationship_pathway_stage_id: "observe",
  };
}

afterEach(() => {
  cleanup();
});

describe("MissionBoardAddCaseModal", () => {
  it("opens directly to observation case details when initial type is observation", () => {
    server.use(
      http.get("/api/portal/sales/surgical-cases/new-defaults", () =>
        HttpResponse.json({ ok: true, defaults: { procedure_suggestions: [] } }),
      ),
    );

    render(
      <MissionBoardAddCaseModal
        provider={baseProvider()}
        initialCaseType="observation"
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByTestId("mission-board-add-case-modal")).toHaveClass(
      "mission-board-add-case-panel",
    );
    expect(screen.getByText("Add observation case")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Procedure")).toBeInTheDocument();
    expect(screen.queryByText(/New Engagement/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Choose the case type")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mission-board-case-type-product_support")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });

  it("keeps the case type chooser for generic add case", () => {
    render(<MissionBoardAddCaseModal provider={baseProvider()} onClose={() => {}} onSave={() => {}} />);

    expect(screen.getByText("Add case")).toBeInTheDocument();
    expect(screen.getByText(/Choose the case type/i)).toBeInTheDocument();
    expect(screen.getByTestId("mission-board-case-type-observation")).toBeInTheDocument();
    expect(screen.getByTestId("mission-board-case-type-product_support")).toBeInTheDocument();
  });
});
