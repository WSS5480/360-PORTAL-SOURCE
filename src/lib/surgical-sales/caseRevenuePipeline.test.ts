import { describe, expect, it } from "vitest";
import { buildRevenuePipelineView } from "./caseRevenuePipeline";

function caseRow(over: Partial<Parameters<typeof buildRevenuePipelineView>[0][number]> & { id: string }) {
  return {
    case_date: null,
    status: "scheduled",
    case_type: "product_support",
    expected_revenue: 0,
    actual_revenue: null,
    ...over,
  };
}

describe("buildRevenuePipelineView", () => {
  const today = "2026-09-14";

  it("puts future scheduled expected revenue in upcoming pipeline", () => {
    const view = buildRevenuePipelineView(
      [
        caseRow({
          id: "u1",
          case_date: "2026-09-20",
          status: "scheduled",
          expected_revenue: 4500,
        }),
      ],
      today,
    );
    expect(view.summary.upcoming).toBe(4500);
    expect(view.summary.booked_month).toBe(0);
    expect(view.upcoming_cases[0]?.revenue_source).toBe("expected");
    expect(view.upcoming_cases[0]?.sales_rep_display).toBeNull();
  });

  it("keeps the assigned rep name on team pipeline rows", () => {
    const view = buildRevenuePipelineView(
      [
        caseRow({
          id: "u2",
          case_date: "2026-09-20",
          status: "scheduled",
          expected_revenue: 2400,
          sales_rep_display: "Giancarlo Delatorre",
        }),
      ],
      today,
    );
    expect(view.upcoming_cases[0]?.sales_rep_display).toBe("Giancarlo Delatorre");
  });

  it("rolls expected per-case revenue into booked when actual is blank", () => {
    const view = buildRevenuePipelineView(
      [
        caseRow({
          id: "b1",
          case_date: "2026-09-10",
          status: "completed",
          expected_revenue: 4500,
          actual_revenue: null,
        }),
      ],
      today,
    );
    expect(view.summary.booked_month).toBe(4500);
    expect(view.booked_cases[0]?.amount).toBe(4500);
    expect(view.booked_cases[0]?.revenue_source).toBe("expected");
  });

  it("prefers actual revenue for booked cases", () => {
    const view = buildRevenuePipelineView(
      [
        caseRow({
          id: "b2",
          case_date: "2026-09-08",
          status: "invoiced",
          expected_revenue: 4500,
          actual_revenue: 4100,
        }),
      ],
      today,
    );
    expect(view.summary.booked_month).toBe(4100);
    expect(view.booked_cases[0]?.revenue_source).toBe("actual");
  });

  it("excludes observation cases without products", () => {
    const view = buildRevenuePipelineView(
      [
        caseRow({
          id: "o1",
          case_date: "2026-09-20",
          status: "scheduled",
          case_type: "observation",
          product_id: null,
          expected_revenue: 8000,
          requires_billing_workflow: false,
        }),
      ],
      today,
    );
    expect(view.summary.upcoming).toBe(0);
    expect(view.upcoming_cases).toHaveLength(0);
  });
});
