import { describe, expect, it } from "vitest";
import {
  buildCaseHeaderStatusIndicators,
  buildCaseSchedulingStatusSummary,
  caseExecutionTypeTitle,
  providerSpecialtyLabel,
} from "./caseExecutionHeaderHelpers";

describe("caseExecutionHeaderHelpers", () => {
  it("maps case types to execution titles", () => {
    expect(caseExecutionTypeTitle("observation")).toBe("Observation Case");
    expect(caseExecutionTypeTitle("product_support")).toBe("Coverage Case");
  });

  it("resolves specialty from provider intelligence", () => {
    expect(
      providerSpecialtyLabel(
        { provider_procedure_focus: "raw|General Surgery" },
        { procedures: "Hernia repair|General Surgery" } as never,
      ),
    ).toBe("General Surgery");
  });

  it("summarizes scheduling from case access fields", () => {
    expect(
      buildCaseSchedulingStatusSummary({
        observation_access_scheduling_owner: "Maria — OR desk",
        observation_access_pathway: "Vendor rep escort",
      }),
    ).toBe("Maria — OR desk · Vendor rep escort");
    expect(buildCaseSchedulingStatusSummary({})).toBe("Scheduling not confirmed");
  });

  it("builds actionable observation header indicators", () => {
    const indicators = buildCaseHeaderStatusIndicators({
      caseRow: {
        observation_access_pathway: "Vendor escort",
        observation_access_scheduling_owner: "OR desk",
        observation_access_credentialing: "unknown",
      },
      caseType: "observation",
      statusLabel: "Draft",
    });
    expect(indicators.map((item) => item.label)).toEqual([
      "Draft",
      "Observation approved",
      "Scheduler known",
      "Credentialing unknown",
    ]);
    expect(indicators.find((item) => item.id === "access")?.tone).toBe("ok");
    expect(indicators.find((item) => item.id === "credentialing")?.tone).toBe("warn");
  });

  it("builds coverage support indicators", () => {
    const indicators = buildCaseHeaderStatusIndicators({
      caseRow: {},
      caseType: "product_support",
      statusLabel: "Scheduled",
      hasProducts: false,
      billingScore: 1,
      requiresBilling: true,
    });
    expect(indicators.some((item) => item.label === "No products")).toBe(true);
    expect(indicators.some((item) => item.label === "Billing 1/3")).toBe(true);
  });
});
