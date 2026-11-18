import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";

import { ObservationCaseIntelligenceTab } from "./ObservationCaseIntelligenceTab";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function sectionPriority(testId: string): string | null {
  return screen.getByTestId(testId).getAttribute("data-priority");
}

describe("ObservationCaseIntelligenceTab", () => {
  it("renders mission briefing sections and collapsed readiness by default", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ status: "confirmed", live_observation_competitors: "Competitor tray observed" }}
        activities={[
          { id: "n1", activity_type: "note", body: "Saw competitor tray", created_at: "2026-06-04T12:00:00Z" },
        ]}
        providerContact={{ observation_count: 1 }}
      />,
    );

    expect(screen.getByTestId("case-intelligence-tab")).toBeInTheDocument();
    expect(screen.getByTestId("case-intelligence-status-summary")).toBeInTheDocument();
    expect(screen.getByTestId("case-intelligence-briefing")).toBeInTheDocument();
    expect(screen.getByTestId("case-intelligence-this-observation")).toBeInTheDocument();
    expect(screen.queryByTestId("case-intelligence-what-we-know")).not.toBeInTheDocument();
    expect(screen.queryByTestId("case-intelligence-still-need")).not.toBeInTheDocument();
    expect(screen.queryByTestId("case-intelligence-focus-next")).not.toBeInTheDocument();
    expect(screen.queryByTestId("case-intelligence-provider-briefing")).not.toBeInTheDocument();
    expect(screen.getByTestId("case-intelligence-evidence-progress")).toBeInTheDocument();
    expect(screen.getByText("Mark this case complete when your observation note is finished.")).toBeInTheDocument();

    expect(sectionPriority("case-intelligence-this-observation")).toBe("primary");

    const readiness = screen.getByTestId("case-intelligence-readiness") as HTMLDetailsElement;
    expect(readiness.open).toBe(false);
    expect(within(readiness).getByText("Debrief Readiness")).toBeInTheDocument();
    expect(
      within(readiness.querySelector(".case-obs-intel-readiness__summary") as HTMLElement).getByText(
        "Not Ready for Debrief",
      ),
    ).toBeInTheDocument();
  });

  it("prioritizes still need to learn before note capture", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ status: "scheduled" }}
        activities={[]}
        providerContact={{}}
      />,
    );

    expect(sectionPriority("case-intelligence-still-need")).toBe("primary");
    expect(sectionPriority("case-intelligence-what-we-know")).toBe("secondary");
    expect(sectionPriority("case-intelligence-this-observation")).toBe("tertiary");
    // Forward-looking focus only appears once notes are captured.
    expect(screen.queryByTestId("case-intelligence-focus-next")).not.toBeInTheDocument();
  });

  it("shows when intelligence is updating from a saved field note", () => {
    const { rerender } = render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ status: "confirmed" }}
        activities={[
          {
            id: "n1",
            activity_type: "note",
            body: "Fresh field note",
            created_at: "2026-06-04T12:00:00Z",
            metadata_json: { intelligence_processing: true },
          },
        ]}
        providerContact={{ observation_count: 1 }}
        intelligenceProcessingStartedAtMs={Date.now()}
      />,
    );

    expect(screen.getByText(/Building intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/extracting findings from your latest note/i)).toBeInTheDocument();
    expect(screen.getByText(/update automatically when ready/i)).toBeInTheDocument();
    expect(within(screen.getByTestId("case-intelligence-status-summary")).getByText("Updating")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check now/i })).not.toBeInTheDocument();

    rerender(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ status: "confirmed" }}
        activities={[
          {
            id: "n1",
            activity_type: "note",
            body: "Fresh field note",
            created_at: "2026-06-04T12:00:00Z",
            metadata_json: { intelligence_processing: false, ai_extraction: { facts: [] } },
          },
        ]}
        providerContact={{ observation_count: 1 }}
        intelligenceProcessingStartedAtMs={null}
      />,
    );

    expect(screen.queryByText(/Building intelligence/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check now/i })).not.toBeInTheDocument();
  });

  it("expands readiness details on user interaction", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ status: "confirmed", live_observation_competitors: "Competitor tray observed" }}
        activities={[
          { id: "n1", activity_type: "note", body: "Saw competitor tray", created_at: "2026-06-04T12:00:00Z" },
        ]}
        providerContact={{ observation_count: 1 }}
      />,
    );

    const readiness = screen.getByTestId("case-intelligence-readiness") as HTMLDetailsElement;
    fireEvent.click(screen.getByText("Details"));
    expect(readiness.open).toBe(true);
    expect(within(readiness).getByText("Debrief Readiness")).toBeInTheDocument();
    expect(within(readiness).getByText("Program unlock")).toBeInTheDocument();
    expect(within(readiness).getByText("Evidence coverage")).toBeInTheDocument();
    expect(within(readiness).queryByText("Program progress")).not.toBeInTheDocument();

    // Evidence pillars render with rep-facing labels and status pills.
    const areas = within(readiness).getByTestId("case-intelligence-evidence-progress");
    expect(within(areas).getByText("Observation Areas")).toBeInTheDocument();
    expect(within(areas).getByText("Products in use")).toBeInTheDocument();
    expect(within(areas).getByText("Provider frustrations")).toBeInTheDocument();
    expect(within(areas).getByText("Staff frustrations")).toBeInTheDocument();
    expect(within(areas).getByText("Workflow friction")).toBeInTheDocument();
    expect(within(areas).getByText("Product openings")).toBeInTheDocument();
  });

  it("opens debrief readiness by default after three completed program cases", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-4"
        caseRow={{ id: "case-4", status: "confirmed", live_observation_competitors: "Bard Mesh observed" }}
        activities={[
          { id: "n1", activity_type: "note", body: "Bard Mesh again", created_at: "2026-06-04T12:00:00Z" },
        ]}
        priorCases={[
          { id: "c1", status: "completed", live_observation_competitors: "Bard Mesh" },
          { id: "c2", status: "completed", live_observation_competitors: "Bard Mesh" },
          { id: "c3", status: "completed", live_observation_competitors: "Bard Mesh" },
        ]}
        providerContact={{ observation_count: 4 }}
      />,
    );

    const readiness = screen.getByTestId("case-intelligence-readiness") as HTMLDetailsElement;
    expect(readiness.open).toBe(true);
    expect(within(screen.getByTestId("case-intelligence-status-summary")).getByText("Evidence")).toBeInTheDocument();
  });

  it("shows empty-state guidance when no case evidence exists", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ status: "scheduled" }}
        activities={[]}
        providerContact={{}}
      />,
    );

    expect(
      within(screen.getByTestId("case-intelligence-status-summary")).getByText(
        /Add a case note to start capturing observations/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders rep-facing observation summaries in This Observation after note capture", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{
          id: "case-1",
          status: "confirmed",
          live_observation_competitors: "Bard Mesh observed",
        }}
        activities={[
          {
            id: "n1",
            activity_type: "note",
            body: "They were using Bard Mesh again. There were a couple points where they spent extra time getting a better view before placing fixation. The team seemed organized.",
            created_at: "2026-06-04T12:00:00Z",
          },
        ]}
        priorCases={[]}
        providerContact={{ observation_count: 1 }}
      />,
    );

    const thisObs = screen.getByTestId("case-intelligence-this-observation");
    expect(thisObs).toHaveAttribute("data-priority", "primary");
    expect(thisObs.querySelector(".case-obs-intel-group-stack")).toBeTruthy();
    expect(within(thisObs).getByRole("heading", { name: "Current Workflow" })).toBeInTheDocument();
    expect(within(thisObs).getByRole("heading", { name: "Challenges & Friction" })).toBeInTheDocument();

    const chipLabels = Array.from(thisObs.querySelectorAll(".case-obs-intel-chip-label")).map(
      (node) => node.textContent ?? "",
    );
    expect(chipLabels.length).toBeGreaterThan(0);
    expect(new Set(chipLabels.map((label) => label.trim().toLowerCase())).size).toBe(chipLabels.length);

    const joined = chipLabels.join("\n");
    expect(joined).toMatch(/Current product: Bard Mesh/i);
    expect(joined).toMatch(/Extra time improving visualization before fixation/i);
    expect(joined).toMatch(/Staff appeared organized/i);
    expect(joined).not.toMatch(/Visualization Delay/i);
    expect(joined).not.toMatch(/Product Used Surgery Used/i);
    expect(joined).not.toMatch(/staff burden:|provider concern:|uncertainty stocked/i);
  });

  it("falls back to dictated note intelligence when the UF case run has no displayable facts yet", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{
          id: "case-1",
          status: "confirmed",
          procedure_type: "Laparoscopic ventral hernia repair",
        }}
        activities={[
          {
            id: "n1",
            activity_type: "note",
            body: "Observed Dr. Lettuce during a laparoscopic ventral hernia repair today. Case went smoothly. He's still using his standard mesh and fixation approach. We talked briefly afterward, and he asked whether our mesh is available in a larger size for some of his more complex cases. He wasn't looking to switch today, just gathering information. The circulator mentioned they're getting low on inventory, so I'll follow up with materials management.",
            created_at: "2026-06-25T12:53:00Z",
          },
        ]}
        priorCases={[]}
        providerContact={{ display_name: "Tom Lettuce", observation_count: 1 }}
        universalFactsReadModel={{
          caseRuns: [
            {
              capture_id: "capture-empty",
              declared_source_type: "observation_case",
              extraction_model: "test",
              created_at: "2026-06-25T12:53:02Z",
              operational_note_id: "n1",
              facts: [],
            },
          ],
          programRuns: [],
        }}
      />,
    );

    const thisObs = screen.getByTestId("case-intelligence-this-observation");
    expect(thisObs.querySelector(".case-obs-intel-group-stack")).toBeTruthy();
    const chipLabels = Array.from(thisObs.querySelectorAll(".case-obs-intel-chip-label")).map(
      (node) => node.textContent ?? "",
    );
    expect(chipLabels.length).toBeGreaterThan(0);
    expect(chipLabels.join("\n")).toMatch(/mesh|inventory|larger size|fixation/i);
    expect(within(thisObs).queryByText(/Nothing noted for this case yet/i)).not.toBeInTheDocument();
  });

  it("renders This Observation from UF facts for the Lettuce mesh and inventory dictation", () => {
    const note =
      "Observed Dr. Lettuce during a laparoscopic ventral hernia repair today. Case went smoothly. He's still using his standard mesh and fixation approach. We talked briefly afterward, and he asked whether our mesh is available in a larger size for some of his more complex cases. He wasn't looking to switch today, just gathering information. The circulator mentioned they're getting low on inventory, so I'll follow up with materials management.";
    const extracted = extractUniversalSurgicalFacts({
      raw_note: note,
      declared_source_type: "observation_case",
      context: { provider_display_name: "Tom Lettuce" },
    });
    const createdAt = "2026-06-25T12:53:02Z";

    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{
          id: "case-1",
          status: "confirmed",
          procedure_type: "Laparoscopic ventral hernia repair",
        }}
        activities={[
          {
            id: "n1",
            activity_type: "note",
            body: note,
            created_at: "2026-06-25T12:53:00Z",
            metadata_json: { note_id: "n1" },
          },
        ]}
        priorCases={[]}
        providerContact={{ display_name: "Tom Lettuce", observation_count: 1 }}
        universalFactsReadModel={{
          caseRuns: [
            {
              capture_id: "capture-lettuce",
              declared_source_type: "observation_case",
              extraction_model: "test",
              created_at: createdAt,
              operational_note_id: "n1",
              facts: extracted.facts.map((fact, index) => ({
                ...fact,
                id: `fact-${index}`,
                capture_id: "capture-lettuce",
                provider_id: "provider-1",
                organization_id: "org-1",
                case_id: "case-1",
                encounter_id: null,
                suppressed: false,
                created_at: createdAt,
              })),
            },
          ],
          programRuns: [],
        }}
      />,
    );

    const thisObs = screen.getByTestId("case-intelligence-this-observation");
    const chipText = Array.from(thisObs.querySelectorAll(".case-obs-intel-chip-label"))
      .map((node) => node.textContent ?? "")
      .join("\n");

    expect(chipText).toMatch(/standard mesh and fixation approach/i);
    expect(chipText).toMatch(/larger size|available in a larger size|our mesh is available/i);
    expect(chipText).toMatch(/inventory running low|low on inventory/i);
    expect(chipText).not.toMatch(/Alternative product discussed:\s*mesh\b/i);
    expect(within(thisObs).queryByText(/Nothing noted for this case yet/i)).not.toBeInTheDocument();
  });

  it("renders the second Lettuce observation as multiple grounded chips", () => {
    const note =
      "Observed Dr. Lettuce again today during another ventral hernia repair. They were still using Bard Soft Mesh, so that's definitely looking like their standard product. The fixation issue I noticed last time really wasn't present today. Everything went pretty smoothly, so I'm less convinced that's an ongoing problem. I spoke with Sarah afterward, and she said they're interested in scheduling an evaluation with us sometime next month if the surgeon is open to it. Dr. Lettuce mentioned he likes how familiar the team is with their current mesh but wishes it conformed a little better on larger defects. No other workflow delays today, and the room ran pretty efficiently.";
    const extracted = extractUniversalSurgicalFacts({
      raw_note: note,
      declared_source_type: "observation_case",
      context: { provider_display_name: "Tom Lettuce" },
    });
    const createdAt = "2026-06-25T15:12:00Z";

    render(
      <ObservationCaseIntelligenceTab
        caseId="case-2"
        caseRow={{
          id: "case-2",
          status: "confirmed",
          procedure_type: "Ventral hernia repair",
        }}
        activities={[
          {
            id: "n2",
            activity_type: "note",
            body: note,
            created_at: "2026-06-25T15:11:00Z",
            metadata_json: { note_id: "n2" },
          },
        ]}
        priorCases={[]}
        providerContact={{ display_name: "Tom Lettuce", observation_count: 2 }}
        universalFactsReadModel={{
          caseRuns: [
            {
              capture_id: "capture-lettuce-second",
              declared_source_type: "observation_case",
              extraction_model: "test",
              created_at: createdAt,
              operational_note_id: "n2",
              facts: extracted.facts.map((fact, index) => ({
                ...fact,
                id: `fact-second-${index}`,
                capture_id: "capture-lettuce-second",
                provider_id: "provider-1",
                organization_id: "org-1",
                case_id: "case-2",
                encounter_id: null,
                suppressed: false,
                created_at: createdAt,
              })),
            },
          ],
          programRuns: [],
        }}
      />,
    );

    const thisObs = screen.getByTestId("case-intelligence-this-observation");
    const chipText = Array.from(thisObs.querySelectorAll(".case-obs-intel-chip-label"))
      .map((node) => node.textContent ?? "")
      .join("\n");

    expect(chipText).toMatch(/Bard Soft Mesh/i);
    expect(chipText).toMatch(/Evaluation scheduling interest|scheduling an evaluation/i);
    expect(chipText).toMatch(/Sarah.*Evaluation Contact/i);
    expect(chipText).toMatch(/Conformability on larger defects|conformed a little better/i);
    expect(chipText).toMatch(/Prior workflow issue was not observed today/i);
    expect(chipText).toMatch(/No workflow delays observed today/i);
    expect(within(thisObs).queryByText(/Nothing noted for this case yet/i)).not.toBeInTheDocument();
  });

  it("renders product use once and omits the generated observation summary", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ id: "case-1", status: "confirmed" }}
        activities={[
          {
            id: "n1",
            activity_type: "note",
            body: "They were still using Bard Soft Mesh, so that's definitely looking like their standard product.",
            created_at: "2026-06-25T12:53:00Z",
            metadata_json: { note_id: "note-1" },
          },
        ]}
        priorCases={[]}
        providerContact={{ display_name: "Tom Lettuce", observation_count: 1 }}
        universalFactsReadModel={{
          caseRuns: [
            {
              capture_id: "capture-1",
              declared_source_type: "observation_case",
              extraction_model: "test",
              created_at: "2026-06-25T12:00:00Z",
              operational_note_id: "note-1",
              facts: [
                {
                  id: "fact-current",
                  capture_id: "capture-1",
                  concept: "current_product",
                  normalized_label: "Current product: Bard Soft Mesh",
                  assertion_level: "validated",
                  source_type: "observation_case",
                  evidence_text: "They were still using Bard Soft Mesh.",
                  confidence: "high",
                  negated: false,
                  uncertain: false,
                  suppressed: false,
                  product_mentioned: "Bard Soft Mesh",
                  case_id: "case-1",
                  provider_id: null,
                  organization_id: null,
                  encounter_id: null,
                  created_at: "2026-06-25T12:00:00Z",
                },
                {
                  id: "fact-competitor",
                  capture_id: "capture-1",
                  concept: "competitor_product",
                  normalized_label: "Competitor product: Bard Soft Mesh",
                  assertion_level: "validated",
                  source_type: "observation_case",
                  evidence_text: "They were still using Bard Soft Mesh.",
                  confidence: "high",
                  negated: false,
                  uncertain: false,
                  suppressed: false,
                  product_mentioned: "Bard",
                  case_id: "case-1",
                  provider_id: null,
                  organization_id: null,
                  encounter_id: null,
                  created_at: "2026-06-25T12:00:00Z",
                },
              ],
            },
          ],
          programRuns: [],
        }}
      />,
    );

    const thisObs = screen.getByTestId("case-intelligence-this-observation");
    const chipLabels = Array.from(thisObs.querySelectorAll(".case-obs-intel-chip-label")).map(
      (node) => node.textContent ?? "",
    );
    const bardLabels = chipLabels.filter((text) => /bard/i.test(text));

    expect(within(thisObs).queryByText(/Current workflow:/i)).not.toBeInTheDocument();
    expect(within(thisObs).queryByText(/Main friction:/i)).not.toBeInTheDocument();
    expect(bardLabels).toEqual(["Current product: Bard Soft Mesh"]);
  });

  it("keeps observation evidence collapsed until requested for a single fact", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ id: "case-1", status: "confirmed" }}
        activities={[
          {
            id: "n1",
            activity_type: "note",
            body: "They were still using Bard Soft Mesh.",
            created_at: "2026-06-25T12:53:00Z",
            metadata_json: { note_id: "note-1" },
          },
        ]}
        priorCases={[]}
        providerContact={{ display_name: "Tom Lettuce", observation_count: 1 }}
        universalFactsReadModel={{
          caseRuns: [
            {
              capture_id: "capture-1",
              declared_source_type: "observation_case",
              extraction_model: "test",
              created_at: "2026-06-25T12:00:00Z",
              operational_note_id: "note-1",
              facts: [
                {
                  id: "fact-current",
                  capture_id: "capture-1",
                  concept: "current_product",
                  normalized_label: "Current product: Bard Soft Mesh",
                  assertion_level: "validated",
                  source_type: "observation_case",
                  evidence_text: "They were still using Bard Soft Mesh.",
                  confidence: "high",
                  negated: false,
                  uncertain: false,
                  suppressed: false,
                  product_mentioned: "Bard Soft Mesh",
                  case_id: "case-1",
                  provider_id: null,
                  organization_id: null,
                  encounter_id: null,
                  created_at: "2026-06-25T12:00:00Z",
                },
              ],
            },
          ],
          programRuns: [],
        }}
      />,
    );

    const thisObs = screen.getByTestId("case-intelligence-this-observation");
    expect(within(thisObs).getByText("Current product: Bard Soft Mesh")).toBeInTheDocument();
    expect(within(thisObs).queryByText(/They were still using Bard Soft Mesh\./i)).not.toBeVisible();

    fireEvent.click(within(thisObs).getAllByText("Evidence")[0]!);
    expect(within(thisObs).getByText(/They were still using Bard Soft Mesh\./i)).toBeVisible();
    expect(within(thisObs).getByText("Observation")).toBeVisible();
  });

  it("renders This Observation from current-note UF when refreshed before persisted UF is available", () => {
    const note =
      "Observed Dr. Lettuce during a laparoscopic ventral hernia repair today. Case went smoothly. He's still using his standard mesh and fixation approach. We talked briefly afterward, and he asked whether our mesh is available in a larger size for some of his more complex cases. He wasn't looking to switch today, just gathering information. The circulator mentioned they're getting low on inventory, so I'll follow up with materials management.";

    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{
          id: "case-1",
          status: "confirmed",
          procedure_type: "Laparoscopic ventral hernia repair",
        }}
        activities={[
          {
            id: "activity-1",
            activity_type: "note",
            body: note,
            created_at: "2026-06-25T12:53:00Z",
            metadata_json: {},
          },
        ]}
        priorCases={[]}
        providerContact={{ display_name: "Tom Lettuce", observation_count: 1 }}
        universalFactsReadModel={null}
      />,
    );

    const thisObs = screen.getByTestId("case-intelligence-this-observation");
    const chipText = Array.from(thisObs.querySelectorAll(".case-obs-intel-chip-label"))
      .map((node) => node.textContent ?? "")
      .join("\n");

    expect(chipText).toMatch(/standard mesh and fixation approach/i);
    expect(chipText).toMatch(/larger size|available in a larger size|our mesh is available/i);
    expect(chipText).toMatch(/inventory running low|low on inventory/i);
    expect(chipText).not.toMatch(/Alternative product discussed:\s*mesh\b/i);
    expect(within(thisObs).queryByText(/Nothing noted for this case yet/i)).not.toBeInTheDocument();
  });

  it("hides What We Know after capture when it only repeats the observation summary", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{
          id: "case-1",
          status: "confirmed",
          live_observation_competitors: "Bard Mesh observed",
        }}
        activities={[
          {
            id: "n1",
            activity_type: "note",
            body: "They were using Bard Mesh again.",
            created_at: "2026-06-04T12:00:00Z",
          },
        ]}
        priorCases={[]}
        providerContact={{ observation_count: 1 }}
      />,
    );

    expect(screen.queryByTestId("case-intelligence-what-we-know")).not.toBeInTheDocument();
  });

  it("shows at most three prioritized still-need objectives", () => {
    render(
      <ObservationCaseIntelligenceTab
        caseId="case-1"
        caseRow={{ status: "scheduled" }}
        activities={[]}
        providerContact={{}}
        priorCases={[
          {
            id: "case-prior",
            status: "completed",
            live_observation_competitors: "Product Alpha observed",
            live_observation_workflow: "Extra visualization time before fixation",
            notes: "Product Alpha observed during case.",
          },
        ]}
      />,
    );

    const stillNeed = screen.getByTestId("case-intelligence-still-need");
    const items = stillNeed.querySelectorAll(".case-obs-case-brief-list-item");
    expect(items.length).toBeLessThanOrEqual(3);
  });
});
