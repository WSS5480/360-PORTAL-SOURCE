import { describe, expect, it } from "vitest";

import { buildSalesExecutionDashboardAlertCounts } from "./buildSalesExecutionDashboardAlerts";
import type { SurgicalCaseListRow } from "./enrichSurgicalCasesForList";

function baseCase(overrides: Partial<SurgicalCaseListRow> = {}): SurgicalCaseListRow {
  return {
    id: "case-1",
    case_number: "SC-1001",
    account_id: "acct-1",
    status: "scheduled",
    case_type: "observation",
    case_date: "2026-06-05",
    surgeon_contact_id: "provider-1",
    ...overrides,
  };
}

describe("buildSalesExecutionDashboardAlertCounts", () => {
  it("counts execution next steps but not optional access metadata gaps", () => {
    const counts = buildSalesExecutionDashboardAlertCounts(
      [
        baseCase({
          status: "completed",
          notes: "OR workflow notes",
          observation_goal: "Assess fit",
        }),
        baseCase({
          id: "case-2",
          status: "scheduled",
          case_date: "2026-06-03",
          observation_access_pathway: null,
          observation_access_scheduling_owner: null,
          observation_access_credentialing: "unknown",
        }),
      ],
      "2026-06-02",
    );

    expect(counts.cases_needing_action).toBe(2);
    expect(counts.observation_debrief_pending).toBe(1);
    expect(counts.scheduled_readiness_blocked).toBe(0);
  });

  it("counts imminent readiness blockers as execution alerts", () => {
    const counts = buildSalesExecutionDashboardAlertCounts(
      [
        baseCase({
          id: "case-3",
          status: "scheduled",
          case_date: "2026-06-03",
          observation_goal: "",
        }),
      ],
      "2026-06-02",
    );

    expect(counts.scheduled_observation_objectives_missing).toBe(1);
    expect(counts.cases_needing_action).toBe(1);
  });
});
