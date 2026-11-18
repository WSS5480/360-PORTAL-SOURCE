import { describe, expect, it } from "vitest";
import {
  formatObservationProgramProgressCount,
  providerObservationProgramDebriefUnlocked,
  resolveProviderCompletedObservationCount,
} from "./observationProgramGate";

describe("observationProgramGate", () => {
  it("formats program progress counts", () => {
    expect(formatObservationProgramProgressCount(1)).toBe("1 / 5 Complete");
    expect(formatObservationProgramProgressCount(2)).toBe("2 / 5 Complete");
  });

  it("unlocks debrief only at five completed observations", () => {
    expect(providerObservationProgramDebriefUnlocked(4)).toBe(false);
    expect(providerObservationProgramDebriefUnlocked(5)).toBe(true);
  });

  it("reads completed observation count from provider contact", () => {
    expect(
      resolveProviderCompletedObservationCount({
        caseRow: { id: "case-1" },
        providerContact: { observation_count: 3 },
      }),
    ).toBe(3);
  });

  it("does not treat a single inflated provider count as a completed current case", () => {
    expect(
      resolveProviderCompletedObservationCount({
        caseRow: { id: "case-1", status: "confirmed" },
        providerContact: { observation_count: 1 },
      }),
    ).toBe(0);
  });

  it("counts the current case after completion even when provider count is stale", () => {
    expect(
      resolveProviderCompletedObservationCount({
        caseRow: { id: "case-1", status: "completed", observation_completed_at: "2026-06-08T18:00:00Z" },
        providerContact: { observation_count: 0 },
      }),
    ).toBe(1);
  });

  it("uses the freshest current case row when prior cases include the same id", () => {
    expect(
      resolveProviderCompletedObservationCount({
        caseRow: { id: "case-1", status: "completed", observation_completed_at: "2026-06-08T18:00:00Z" },
        priorCases: [{ id: "case-1", status: "confirmed" }],
        providerContact: { observation_count: 0 },
      }),
    ).toBe(1);
  });
});
