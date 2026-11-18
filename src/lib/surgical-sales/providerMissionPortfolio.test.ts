import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderMissionPortfolioSummary,
  filterProvidersByMissionMetric,
  providerMatchesMissionMetric,
} from "@/lib/surgical-sales/providerMissionPortfolio";

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    specialty: "Orthopedics",
    primary_organization_name: "Metro Surgical",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("providerMissionPortfolio", () => {
  it("counts providers by pathway stage", () => {
    const providers = [
      baseProvider({ id: "discovery" }),
      baseProvider({ id: "observe", relationship_pathway_stage_id: "observe" }),
      baseProvider({ id: "debrief", relationship_pathway_stage_id: "debrief" }),
    ];

    const summary = buildProviderMissionPortfolioSummary(providers);
    expect(summary.metrics.find((metric) => metric.id === "discovery")?.count).toBe(1);
    expect(summary.metrics.find((metric) => metric.id === "observe")?.count).toBe(1);
    expect(summary.metrics.find((metric) => metric.id === "debrief")?.count).toBe(1);
  });

  it("filters providers by pathway stage metric", () => {
    const observe = baseProvider({ id: "observe", relationship_pathway_stage_id: "observe" });
    const debrief = baseProvider({ id: "debrief", relationship_pathway_stage_id: "debrief" });

    expect(providerMatchesMissionMetric(observe, "observe")).toBe(true);
    expect(providerMatchesMissionMetric(debrief, "debrief")).toBe(true);

    const filtered = filterProvidersByMissionMetric([observe, debrief], "observe");
    expect(filtered.map((p) => p.id)).toEqual(["observe"]);
  });
});
