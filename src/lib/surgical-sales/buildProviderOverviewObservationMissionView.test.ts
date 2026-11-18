import { describe, expect, it } from "vitest";
import { buildProviderOverviewObservationMissionView } from "./buildProviderOverviewObservationMissionView";

describe("buildProviderOverviewObservationMissionView", () => {
  it("builds a compact command view for the next scheduled observation", () => {
    const view = buildProviderOverviewObservationMissionView({
      contact: {
        primary_organization_name: "Pilot Hospital",
      },
      providerId: "prov-1",
      completedCount: 0,
      addObservationHref: "/cases/new?case_type=observation",
      cases: [
        {
          id: "case-1",
          case_type: "observation",
          status: "scheduled",
          case_date: "2026-06-11",
          procedure_type: "Robotic ventral hernia repair",
        },
        {
          id: "case-2",
          case_type: "observation",
          status: "scheduled",
          case_date: "2026-06-12",
          procedure_type: "Inguinal hernia repair",
        },
      ],
    });

    expect(view.headerProgress).toBe("0 of 5 complete · 2 scheduled");
    expect(view.missionObjective).toBe("Complete 5 observed cases.");
    expect(view.nextObservation?.procedureLabel).toBe("Robotic ventral hernia repair");
    expect(view.nextObservation?.metaLine).toMatch(/Jun 11, 2026 · Pilot Hospital/);
    expect(view.nextObservation?.statusLabel).toBe("Scheduled");
    expect(view.actions.map((action) => action.label)).toEqual([
      "Open Next Case",
      "Mark Complete",
      "Dictate & Complete",
    ]);
    expect(view.viewAllLabel).toBe("View all observation cases (2)");
  });

  it("uses organization from contact when preview facility is missing", () => {
    const view = buildProviderOverviewObservationMissionView({
      contact: {
        organization_name: "Metro Surgical Center",
      },
      providerId: "prov-2",
      completedCount: 1,
      addObservationHref: "/cases/new",
      cases: [
        {
          id: "case-1",
          case_type: "observation",
          status: "scheduled",
          case_date: "2026-06-11",
          procedure_type: "TAR repair",
        },
      ],
    });

    expect(view.nextObservation?.metaLine).toMatch(/Metro Surgical Center/);
    expect(view.nextObservation?.metaLine).not.toMatch(/No organization/i);
    expect(view.viewAllHref).toBeNull();
  });

  it("shows empty state when no scheduled cases exist", () => {
    const view = buildProviderOverviewObservationMissionView({
      contact: {},
      providerId: "prov-3",
      completedCount: 2,
      addObservationHref: "/cases/new?case_type=observation",
      cases: [],
    });

    expect(view.emptyMessage).toBe("No observation scheduled yet");
    expect(view.nextObservation).toBeNull();
    expect(view.actions).toEqual([
      {
        id: "add_observation",
        label: "Add Observation",
        href: "/cases/new?case_type=observation",
      },
    ]);
  });
});
