import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ObservationCaseBriefing } from "./ObservationCaseBriefing";
import { ObservationCaseFieldNotes } from "./ObservationCaseFieldNotes";
import { ObservationCaseIntelligenceTab } from "./ObservationCaseIntelligenceTab";
import { ProductSupportCaseBriefing } from "./ProductSupportCaseBriefing";
import { ProductSupportCaseFieldNotes } from "./ProductSupportCaseFieldNotes";

const identity = {
  caseTypeLabel: "Observation Case",
  providerName: "Dr. Smith",
  specialty: null,
  facilityName: "Metro General",
  procedureType: "General Surgery",
  dateLine: "Jun 4, 2026",
  dateLineWithTime: "Jun 4, 2026 · 7:30 AM",
  statusLabel: "Scheduled",
  openQuestionsCount: null,
  readyForDebrief: false,
  optionalSignals: [],
  internalCaseNumber: null,
};

describe("case type overview and execute content", () => {
  it("observation briefing hides capture while case is still scheduled", () => {
    render(
      <ObservationCaseBriefing
        identity={identity}
        caseRow={{ status: "scheduled", observation_goal: "Validate product fit during this procedure." }}
        onSaveNote={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("heading", { name: /case brief/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /capture what happened/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Dictation" })).not.toBeInTheDocument();
  });

  it("observation briefing shows inline capture when case is in progress", () => {
    render(
      <ObservationCaseBriefing
        identity={identity}
        caseRow={{ status: "confirmed", observation_goal: "Validate product fit during this procedure." }}
        activities={[{ activity_type: "note", body: "Started case" }]}
        onSaveNote={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("heading", { name: /capture what happened/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Dictation" })).toBeInTheDocument();
  });

  it("observation field notes is capture-only", () => {
    render(
      <ObservationCaseFieldNotes
        activities={[
          { id: "n1", activity_type: "note", body: "Case started", created_at: "2026-06-05T13:05:00Z" },
        ]}
        onSaveNote={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("button", { name: "Start Dictation" })).toBeInTheDocument();
    expect(screen.getByText("Case started")).toBeInTheDocument();
    expect(screen.queryByText(/things learned/i)).not.toBeInTheDocument();
  });

  it("observation intelligence shows evidence-based learning sections", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ status: "confirmed", live_observation_competitors: "Competitor tray observed" }}
        activities={[{ id: "n1", activity_type: "note", body: "Saw competitor tray", created_at: "2026-06-04T12:00:00Z" }]}
        providerContact={{ observation_count: 1 }}
      />,
    );

    expect(screen.getByTestId("case-intelligence-status-summary")).toBeInTheDocument();
    expect(screen.getAllByText("0 of 5 observation cases complete").length).toBeGreaterThan(0);
    expect(screen.getByText("1 in-progress case note captured")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Today's Focus" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Evidence Progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Provider Context" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "This Observation" })).toBeInTheDocument();
    const stillNeed = screen.getByTestId("case-intelligence-still-need");
    expect(within(stillNeed).getByText(/provider frustration/i)).toBeInTheDocument();
    expect(stillNeed.querySelectorAll(".case-obs-case-brief-list-item").length).toBeLessThanOrEqual(3);
    expect(screen.getByTestId("case-intelligence-readiness")).toBeInTheDocument();
    expect(screen.getByTestId("case-intelligence-evidence-coverage")).toBeInTheDocument();
    expect(screen.getByText("Program unlock")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate Debrief" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Plan Debrief" })).not.toBeInTheDocument();
  });

  it("observation intelligence omits empty category cards and still-learning duplicates", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{
          status: "completed",
          observation_completed_at: "2026-06-05T18:00:00Z",
          live_observation_competitors: "Competitor tray observed",
        }}
        activities={[{ id: "n1", activity_type: "note", body: "Saw competitor tray", created_at: "2026-06-04T12:00:00Z" }]}
        providerContact={{ observation_count: 1 }}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Today's Focus" })).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing captured yet.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "This Observation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Observation Complete" })).not.toBeInTheDocument();
  });

  it("product support briefing shows mission dashboard cards", () => {
    render(
      <ProductSupportCaseBriefing
        caseRow={{}}
        products={[]}
        onStartDictation={vi.fn()}
        onOpenProducts={vi.fn()}
        onUploadDocument={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /Today's mission/i })).toBeInTheDocument();
  });

  it("product support field notes shows dictation and chronological timeline", () => {
    render(
      <ProductSupportCaseFieldNotes
        activities={[
          { id: "n1", activity_type: "note", body: "Case started", created_at: "2026-06-05T13:05:00Z" },
        ]}
        onSaveNote={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("button", { name: "Start Dictation" })).toBeInTheDocument();
    expect(screen.getByText("Case started")).toBeInTheDocument();
  });
});
