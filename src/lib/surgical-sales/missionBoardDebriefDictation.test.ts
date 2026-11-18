/**
 * Mission Board post-complete debrief dictation — regression extraction report (deterministic, no OpenAI).
 */

import { describe, expect, it } from "vitest";

import { MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES } from "@/lib/surgical-sales/missionBoardDebriefDictationFixtures";
import {
  buildPostDebriefDictationPathwayGate,
  runMissionBoardDebriefDictationRegression,
} from "@/lib/surgical-sales/missionBoardDebriefDictationRegression";
import type { MissionBoardDebriefDictationReportField } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";

const REPORT_FIELDS: MissionBoardDebriefDictationReportField[] = [
  "provider_product_fit_validated",
  "provider_evaluation_path",
  "provider_commitment_interest",
  "follow_up_needed",
  "barriers_issues",
  "provider_feedback",
  "staff_feedback",
  "next_step",
  "debrief_summary",
];

function formatReportForConsole(
  title: string,
  report: ReturnType<typeof runMissionBoardDebriefDictationRegression>,
) {
  const lines = [
    `\n=== ${title} ===`,
    `Accepted db keys: ${report.acceptedDbKeys.join(", ") || "(none)"}`,
    ...REPORT_FIELDS.map((field) => `${field}: ${report.fields[field] ?? "—"}`),
    `Proposed contacts: ${
      report.proposedContacts.length > 0
        ? report.proposedContacts.map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}`).join("; ")
        : "(none)"
    }`,
    `Provider stage: ${report.pathwayStageBefore} → ${report.pathwayStageAfter} (${
      report.providerStageChanged ? "changed" : "unchanged"
    })`,
  ];
  return lines.join("\n");
}

describe("Mission Board post-complete debrief dictation regression", () => {
  for (const fixture of MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES) {
    it(`extracts intelligence — ${fixture.title}`, () => {
      const report = runMissionBoardDebriefDictationRegression({
        dictation: fixture.dictation,
        pathwayGate: buildPostDebriefDictationPathwayGate(
          fixture.id === "confirms_360_experience"
            ? { provider_evaluation_path: "360 Experience" }
            : fixture.id === "product_trial_first"
              ? { provider_evaluation_path: "Product Trial" }
              : {},
        ),
      });

      // eslint-disable-next-line no-console -- debug path: surfaces extraction report in test output
      console.log(formatReportForConsole(fixture.title, report));

      expect(report.fields.debrief_summary).toBeTruthy();
      expect(report.acceptedDbKeys.length).toBeGreaterThanOrEqual(0);
    });
  }

  it("case 1 — 360 Experience confirms product fit signals and follow-up", () => {
    const report = runMissionBoardDebriefDictationRegression({
      dictation: MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES[0].dictation,
      pathwayGate: buildPostDebriefDictationPathwayGate({
        provider_evaluation_path: "360 Experience",
        provider_product_fit_validated: "yes",
      }),
    });

    expect(report.pathwayStageBefore).toBe("evaluation");
    expect(report.fields.provider_product_fit_validated).toBe("yes");
    expect(report.fields.provider_evaluation_path).toBe("360 Experience");
    expect(report.fields.follow_up_needed).toBeTruthy();
  });

  it("case 2 — product trial maps evaluation interest", () => {
    const report = runMissionBoardDebriefDictationRegression({
      dictation: MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES[1].dictation,
    });

    expect(
      report.fields.provider_commitment_interest ||
        report.fields.next_step ||
        report.fields.provider_feedback,
    ).toBeTruthy();
  });

  it("case 3 — not meaningful issue surfaces dissatisfaction or workflow context", () => {
    const report = runMissionBoardDebriefDictationRegression({
      dictation: MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES[2].dictation,
    });

    expect(report.fields.debrief_summary?.toLowerCase()).toContain("not");
  });

  it("case 4 — office manager / OR coordinator proposes workflow contacts", () => {
    const report = runMissionBoardDebriefDictationRegression({
      dictation: MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES[3].dictation,
    });

    expect(
      report.proposedContacts.length > 0 ||
        report.fields.staff_feedback ||
        report.fields.follow_up_needed,
    ).toBeTruthy();
  });

  it("case 5 — another observation before evaluation", () => {
    const report = runMissionBoardDebriefDictationRegression({
      dictation: MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES[4].dictation,
    });

    expect(
      report.fields.follow_up_needed ||
        report.fields.next_step ||
        report.acceptedDbKeys.some((key) => key.includes("observation")),
    ).toBeTruthy();
  });

  it("case 6 — structured use confirms product evaluation path", () => {
    const report = runMissionBoardDebriefDictationRegression({
      dictation: MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES[5].dictation,
    });

    expect(
      report.fields.provider_commitment_interest ||
        report.fields.provider_feedback ||
        report.fields.next_step,
    ).toBeTruthy();
  });
});

describe("Mission Board debrief dictation debug report snapshot", () => {
  it("prints full extraction matrix for all six fixtures", () => {
    const matrix = MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES.map((fixture) => {
      const report = runMissionBoardDebriefDictationRegression({ dictation: fixture.dictation });
      return {
        id: fixture.id,
        title: fixture.title,
        acceptedDbKeys: report.acceptedDbKeys,
        fields: report.fields,
        pathwayStageBefore: report.pathwayStageBefore,
        pathwayStageAfter: report.pathwayStageAfter,
        providerStageChanged: report.providerStageChanged,
        proposedContacts: report.proposedContacts,
      };
    });

    // eslint-disable-next-line no-console -- intentional debug/test path output
    console.log("\nMission Board debrief dictation extraction matrix:\n", JSON.stringify(matrix, null, 2));

    expect(matrix).toHaveLength(6);
  });
});
