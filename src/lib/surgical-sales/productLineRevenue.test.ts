import { describe, expect, it } from "vitest";
import {
  buildProductLineChartPoints,
  buildProductLineYearView,
  productLineTerritoryTotals,
  type ProductLineClosedRow,
  type ProductLineQuotaRow,
} from "./productLineRevenue";

const QUOTA_2026: ProductLineQuotaRow[] = [
  { product_line: "BioTissue", year: 2026, month: 1, amount: 56366 },
  { product_line: "BioTissue", year: 2026, month: 2, amount: 57850 },
  { product_line: "BioTissue", year: 2026, month: 3, amount: 60293 },
  { product_line: "BioTissue", year: 2026, month: 4, amount: 62017 },
  { product_line: "BioTissue", year: 2026, month: 5, amount: 57284 },
  { product_line: "BioTissue", year: 2026, month: 6, amount: 62634 },
  { product_line: "BioTissue", year: 2026, month: 7, amount: 65073 },
  { product_line: "BioTissue", year: 2026, month: 8, amount: 62382 },
  { product_line: "BioTissue", year: 2026, month: 9, amount: 61162 },
  { product_line: "BioTissue", year: 2026, month: 10, amount: 67856 },
  { product_line: "BioTissue", year: 2026, month: 11, amount: 59821 },
  { product_line: "BioTissue", year: 2026, month: 12, amount: 69821 },
];

function closed(month: number, rgv: number, laredo: number): ProductLineClosedRow[] {
  return [
    { product_line: "BioTissue", year: 2026, month, region: "RGV", amount: rgv, source: "import", notes: null },
    { product_line: "BioTissue", year: 2026, month, region: "Laredo", amount: laredo, source: "import", notes: null },
  ];
}

const CLOSED_THRU_JUL: ProductLineClosedRow[] = [
  ...closed(1, 39725, 13200),
  ...closed(2, 40775, 15690),
  ...closed(3, 24225, 13500),
  ...closed(4, 44660, 13800),
  ...closed(5, 14400, 10200),
  ...closed(6, 150930, 16415),
  ...closed(7, 67377, 62446),
];

describe("buildProductLineYearView", () => {
  const now = new Date("2026-09-21T12:00:00Z");

  it("rebuilds the BioTissue spreadsheet totals through July", () => {
    const view = buildProductLineYearView({
      productLine: "BioTissue",
      year: 2026,
      quotas: QUOTA_2026,
      closed: CLOSED_THRU_JUL,
      now,
    });

    expect(view.closed).toBe(527343);
    expect(view.quota).toBe(742559);
    expect(view.quotaThroughEntered).toBe(421517);
    expect(view.varianceThroughEntered).toBe(105826);
    expect(view.months[5]?.closed).toBe(167345);
    expect(view.months[6]?.rgv).toBe(67377);
    expect(view.months[7]?.entered).toBe(false);
  });

  it("scores Q1 as missed at 25% and Q2 as hit at 35%", () => {
    const view = buildProductLineYearView({
      productLine: "BioTissue",
      year: 2026,
      quotas: QUOTA_2026,
      closed: CLOSED_THRU_JUL,
      now,
    });

    const q1 = view.quarters[0];
    const q2 = view.quarters[1];
    expect(q1?.status).toBe("missed");
    expect(q1?.commissionRate).toBe(0.25);
    expect(q1?.closed).toBe(147115);
    expect(q1?.commissionEstimate).toBe(36778.75);

    expect(q2?.status).toBe("hit");
    expect(q2?.commissionRate).toBe(0.35);
    expect(q2?.closed).toBe(250405);
    expect(q2?.commissionEstimate).toBe(87641.75);
  });

  it("marks a quarter as hit as soon as closed passes quota, even mid-quarter", () => {
    const view = buildProductLineYearView({
      productLine: "BioTissue",
      year: 2026,
      quotas: QUOTA_2026,
      closed: [...CLOSED_THRU_JUL, ...closed(8, 60000, 0)],
      now: new Date("2026-08-15T12:00:00Z"),
    });
    expect(view.quarters[2]?.status).toBe("hit");
    expect(view.quarters[2]?.commissionRate).toBe(0.35);
  });

  it("keeps Q3 in play when August and September are blank", () => {
    const view = buildProductLineYearView({
      productLine: "BioTissue",
      year: 2026,
      quotas: QUOTA_2026,
      closed: CLOSED_THRU_JUL,
      now,
    });

    const q3 = view.quarters[2];
    expect(q3?.status).toBe("in_play");
    expect(q3?.commissionRate).toBeNull();
    expect(q3?.closed).toBe(129823);
    expect(q3?.remainingToHit).toBe(58794);
    expect(q3?.enteredMonthCount).toBe(1);
  });

  it("does not treat blank months as zero closed for Q4 2025", () => {
    const view = buildProductLineYearView({
      productLine: "BioTissue",
      year: 2025,
      quotas: [],
      closed: [
        { product_line: "BioTissue", year: 2025, month: 10, region: "RGV", amount: 33125, source: "import", notes: null },
        { product_line: "BioTissue", year: 2025, month: 10, region: "Laredo", amount: 13200, source: "import", notes: null },
        { product_line: "BioTissue", year: 2025, month: 11, region: "RGV", amount: 41150, source: "import", notes: null },
        { product_line: "BioTissue", year: 2025, month: 11, region: "Laredo", amount: 14400, source: "import", notes: null },
        { product_line: "BioTissue", year: 2025, month: 12, region: "RGV", amount: 56675, source: "import", notes: null },
        { product_line: "BioTissue", year: 2025, month: 12, region: "Laredo", amount: 13990, source: "import", notes: null },
      ],
      now,
    });

    expect(view.closed).toBe(172540);
    expect(view.quota).toBeNull();
    expect(view.quarters[3]?.status).toBe("no_quota");
    expect(view.quarters[3]?.closed).toBe(172540);
    expect(view.months[0]?.entered).toBe(false);
  });

  it("builds chart points from entered months only", () => {
    const view = buildProductLineYearView({
      productLine: "BioTissue",
      year: 2026,
      quotas: QUOTA_2026,
      closed: CLOSED_THRU_JUL,
      now,
    });
    const points = buildProductLineChartPoints(view);
    const mix = productLineTerritoryTotals(view);

    expect(points).toHaveLength(7);
    expect(points[5]?.closed).toBe(167345);
    expect(points[6]?.cumulativeClosed).toBe(527343);
    expect(points[6]?.cumulativeQuota).toBe(421517);
    expect(mix.rgv).toBe(382092);
    expect(mix.laredo).toBe(145251);
  });
});
