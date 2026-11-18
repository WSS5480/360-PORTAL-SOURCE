import { describe, expect, it } from "vitest";



import {

  buildMissionBoardObservationCasePreview,

  resolveMissionBoardObservationCasePreview,

  resolveNextScheduledObservationCase,

} from "./missionBoardNextObservationCase";

import { buildProviderObservationCaseRollup } from "./providerObservationCaseCollection";

import {

  deriveMissionBoardNextCaseActions,

  deriveMissionBoardObservationCaseActions,

  deriveMissionBoardObservationViewAllLabel,

  deriveMissionBoardSecondaryActions,

  deriveMissionBoardStagePrimaryAction,

} from "./deriveMissionBoardCardActions";

import { buildProviderMissionBoardCardModel } from "./buildProviderMissionBoardCardModel";

import type { ProviderDirectoryRow } from "./providerDirectory";



function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {

  return {

    id: "p1",

    first_name: "Tony",

    last_name: "Lettuce",

    specialty: "General Surgery",

    primary_organization_name: "Pilot Hospital",

    primary_organization_id: "org-1",

    organization_count: 1,

    additional_organizations_count: 0,

    territory: "TX",

    planning_status: "not_started",

    linked_opportunities_count: 0,

    recent_case_count: 0,

    last_activity_at: null,

    relationship_pathway_stage_id: "observe",

    observation_count: 0,

    ...overrides,

  };

}



function observationRollup(

  scheduledCases: NonNullable<ProviderDirectoryRow["observation_cases"]>["scheduledCases"],

): NonNullable<ProviderDirectoryRow["observation_cases"]> {

  return {

    completedCount: 0,

    upcomingCount: scheduledCases.length,

    progressTotal: 5,

    scheduledCases,

    nextScheduled: scheduledCases[0] ?? null,

  };

}



describe("missionBoardNextObservationCase", () => {

  it("resolves the soonest incomplete observation case", () => {

    const preview = resolveMissionBoardObservationCasePreview({

      facilityLabel: "Pilot Hospital",

      cases: [

        {

          id: "case-later",

          case_type: "observation",

          status: "scheduled",

          case_date: "2026-06-20",

          procedure_type: "TAR repair",

        },

        {

          id: "case-sooner",

          case_type: "observation",

          status: "scheduled",

          case_date: "2026-06-11",

          case_time: "08:00",

          procedure_type: "Robotic ventral hernia repair",

        },

        {

          id: "case-done",

          case_type: "observation",

          status: "completed",

          case_date: "2026-05-01",

          procedure_type: "Old case",

        },

      ],

    });



    expect(preview?.caseId).toBe("case-sooner");

    expect(preview?.procedureLabel).toBe("Robotic ventral hernia repair");

    expect(preview?.statusLabel).toBe("Scheduled");

    expect(preview?.facilityLabel).toBe("Pilot Hospital");

    expect(preview?.dateTimeLabel).toMatch(/Jun 11, 2026/);

    expect(preview?.dateTimeLabel).toMatch(/08:00/);

  });



  it("ignores commercial-only case rows and completed observations", () => {

    expect(

      resolveNextScheduledObservationCase([

        { id: "c1", case_type: "product_support", status: "scheduled", case_date: "2026-06-11" },

        { id: "c2", case_type: "observation", status: "completed", case_date: "2026-06-10" },

      ]),

    ).toBeNull();

  });



  it("builds execution status label for in-progress observations", () => {

    const preview = buildMissionBoardObservationCasePreview({

      facilityLabel: "Pilot Hospital",

      caseRow: {

        id: "case-1",

        case_type: "observation",

        status: "confirmed",

        procedure_type: "Abdominal wall reconstruction",

        case_date: "2026-06-11",

      },

    });



    expect(preview.statusLabel).toBe("In Progress");

  });

});



describe("provider observation case collection", () => {

  it("builds rollup with completed and upcoming counts", () => {

    const rollup = buildProviderObservationCaseRollup({

      facilityLabel: "Pilot Hospital",

      completedCount: 2,

      cases: [

        { id: "case-1", case_type: "observation", status: "scheduled", case_date: "2026-06-11" },

        { id: "case-2", case_type: "observation", status: "scheduled", case_date: "2026-06-12" },

        { id: "case-done", case_type: "observation", status: "completed", case_date: "2026-05-01" },

      ],

    });



    expect(rollup.completedCount).toBe(2);

    expect(rollup.upcomingCount).toBe(2);

    expect(rollup.nextScheduled?.caseId).toBe("case-1");

  });

});



describe("mission board observation card actions", () => {

  const scheduledCase = {

    caseId: "case-1",

    procedureLabel: "Robotic ventral hernia repair",

    dateTimeLabel: "Jun 11, 2026 · 08:00",

    caseDate: "2026-06-11",

    caseTime: "08:00",

    facilityLabel: "Pilot Hospital",

    statusLabel: "Scheduled",

  };



  it("always keeps Add Observation as the observe-stage primary action", () => {

    const provider = baseProvider({ observation_cases: observationRollup([scheduledCase]) });

    const primary = deriveMissionBoardStagePrimaryAction(provider, "observe");

    expect(primary.label).toBe("Add Observation");

    expect(primary.kind).toBe("fast_observation");

  });



  it("scopes next-case actions to the upcoming case id", () => {

    const provider = baseProvider({ observation_cases: observationRollup([scheduledCase]) });

    const actions = deriveMissionBoardNextCaseActions(provider);



    expect(actions.map((action) => action.label)).toEqual([

      "Open",

      "Mark Complete",

      "Dictate & Complete",

      "Reschedule",

    ]);

    expect(actions.every((action) => action.caseId === "case-1")).toBe(true);

  });



  it("builds per-case actions for queue rows", () => {

    const actions = deriveMissionBoardObservationCaseActions(scheduledCase);

    expect(actions.find((action) => action.id === "mark_complete")?.caseId).toBe("case-1");

    expect(actions.find((action) => action.id === "open")?.href).toContain("case-1");

  });



  it("shows view-all label and completion-only progress when scheduled cases exist", () => {

    const provider = baseProvider({ observation_cases: observationRollup([scheduledCase]) });

    const model = buildProviderMissionBoardCardModel(provider);



    expect(model.progressLabel).toMatch(/0 Of 5 Complete/i);

    expect(model.progressLabel).not.toMatch(/scheduled/i);

    expect(model.observationViewAllLabel).toBe("View all scheduled observations (1)");

    expect(model.nextCaseActions).toHaveLength(4);

    expect(deriveMissionBoardSecondaryActions(provider, "observe")).toEqual([]);

  });



  it("shows view-all label for multiple scheduled cases", () => {

    const provider = baseProvider({

      observation_cases: observationRollup([

        scheduledCase,

        {

          caseId: "case-2",

          procedureLabel: "Case two",

          dateTimeLabel: "Jun 12, 2026",

          caseDate: "2026-06-12",

          caseTime: null,

          facilityLabel: "Pilot Hospital",

          statusLabel: "Scheduled",

        },

      ]),

    });



    expect(deriveMissionBoardObservationViewAllLabel(provider)).toBe(

      "View all scheduled observations (2)",

    );

  });



  it("shows add observation primary and dictate secondary when no scheduled case exists", () => {

    const provider = baseProvider({ observation_cases: observationRollup([]) });



    const primary = deriveMissionBoardStagePrimaryAction(provider, "observe");

    expect(primary.label).toBe("Add Observation");

    expect(primary.kind).toBe("fast_observation");



    const secondary = deriveMissionBoardSecondaryActions(provider, "observe");

    expect(secondary.map((action) => action.label)).toEqual(["Field Note"]);

  });



  it("does not count scheduled observations toward completed progress", () => {

    const provider = baseProvider({

      observation_count: 2,

      observation_cases: observationRollup([scheduledCase]),

    });



    const model = buildProviderMissionBoardCardModel(provider);

    expect(model.progressCompleted).toBe(2);

    expect(model.progressTotal).toBe(5);

    expect(model.nextScheduledObservation?.caseId).toBe("case-1");

  });

});

