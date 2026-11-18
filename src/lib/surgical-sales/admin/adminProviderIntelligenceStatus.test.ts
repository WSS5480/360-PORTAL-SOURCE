import { describe, expect, it } from "vitest";
import {
  countStaleProvidersByRep,
  isProviderIntelligenceStale,
} from "@/lib/surgical-sales/admin/adminProviderIntelligenceStatus";

describe("adminProviderIntelligenceStatus", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("marks providers with cases and old capture as stale", () => {
    expect(
      isProviderIntelligenceStale({
        now,
        caseCount: 2,
        lastCapturedAt: "2026-03-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("does not mark providers without cases as stale", () => {
    expect(
      isProviderIntelligenceStale({
        now,
        caseCount: 0,
        lastCapturedAt: null,
      }),
    ).toBe(false);
  });

  it("counts stale providers per rep", () => {
    const counts = countStaleProvidersByRep([
      { rep_user_id: "rep-1", is_stale: true },
      { rep_user_id: "rep-1", is_stale: true },
      { rep_user_id: "rep-2", is_stale: false },
    ]);
    expect(counts.get("rep-1")).toBe(2);
    expect(counts.get("rep-2")).toBeUndefined();
  });
});
