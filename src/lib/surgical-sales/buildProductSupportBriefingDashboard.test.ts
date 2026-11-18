import { describe, expect, it } from "vitest";
import { buildProductSupportBriefingDashboard } from "./buildProductSupportBriefingDashboard";

describe("buildProductSupportBriefingDashboard", () => {
  it("builds mission bullets and snapshot without paragraphs", () => {
    const dashboard = buildProductSupportBriefingDashboard({
      caseRow: { case_room_assignment: "OR 4", status: "confirmed" },
      products: [{ id: "p1", name: "Mesh kit", expectedQuantity: 2 }],
      supportRepName: "Brandon",
      poAttached: true,
    });

    expect(dashboard.missionBullets.length).toBeGreaterThanOrEqual(3);
    expect(dashboard.missionBullets.length).toBeLessThanOrEqual(5);
    expect(dashboard.snapshotRows.some((row) => row.label === "OR / Room" && row.value === "OR 4")).toBe(true);
    expect(dashboard.snapshotRows.some((row) => row.label === "PO attached" && row.value === "Yes")).toBe(true);
    expect(dashboard.snapshotRows.some((row) => row.label === "Revenue per case")).toBe(true);
  });

  it("formats revenue per case in the snapshot", () => {
    const dashboard = buildProductSupportBriefingDashboard({
      caseRow: { expected_revenue: 4500, actual_revenue: 4200, status: "completed" },
      products: [],
    });
    const row = dashboard.snapshotRows.find((r) => r.label === "Revenue per case");
    expect(row?.value).toMatch(/\$4,500/);
    expect(row?.value).toMatch(/\$4,200/);
  });

  it("hides trending signals until repeated evidence exists", () => {
    const none = buildProductSupportBriefingDashboard({
      caseRow: {},
      products: [],
      activities: [{ activity_type: "note", body: "Training requested once" }],
    });
    expect(none.trendingSignals).toHaveLength(0);

    const repeated = buildProductSupportBriefingDashboard({
      caseRow: {},
      products: [],
      activities: [
        { activity_type: "note", body: "Training requested for staff" },
        { activity_type: "note", body: "Another training request today" },
      ],
    });
    expect(repeated.trendingSignals.some((signal) => /training/i.test(signal.text))).toBe(true);
  });
});
