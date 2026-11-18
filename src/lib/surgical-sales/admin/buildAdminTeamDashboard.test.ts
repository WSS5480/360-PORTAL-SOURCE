import { describe, expect, it } from "vitest";
import { buildAdminTeamDashboard } from "@/lib/surgical-sales/admin/buildAdminTeamDashboard";

const now = new Date("2026-06-15T12:00:00.000Z");

describe("buildAdminTeamDashboard", () => {
  it("assembles funnel, KPIs, reps, and providers", () => {
    const payload = buildAdminTeamDashboard({
      now,
      period: {
        key: "month",
        label: "June 2026",
        start: "2026-06-01",
        end: "2026-06-30",
        prior_label: "May 2026",
      },
      prior: { start: "2026-05-01", end: "2026-05-31", label: "May 2026" },
      internalReps: [{ user_id: "rep-1", display_name: "Alex Rep", email: "alex@example.com" }],
      cases: [
        {
          id: "case-1",
          sales_rep_id: "rep-1",
          surgeon_contact_id: "prov-1",
          case_type: "observation",
          status: "completed",
          case_date: "2026-06-10",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-10T00:00:00.000Z",
        },
        {
          id: "case-2",
          sales_rep_id: "rep-1",
          surgeon_contact_id: "prov-1",
          case_type: "product_support",
          status: "completed",
          case_date: "2026-06-12",
          created_at: "2026-06-02T00:00:00.000Z",
          updated_at: "2026-06-12T00:00:00.000Z",
          case_support_case_result: "successful",
          expected_revenue: 4500,
          actual_revenue: 4100,
        },
      ],
      engagements: [
        {
          id: "eng-1",
          sales_rep_id: "rep-1",
          provider_id: "prov-1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
          debrief_completed_at: "2026-06-11T00:00:00.000Z",
          updated_at: "2026-06-11T00:00:00.000Z",
        },
      ],
      contacts: [
        {
          id: "prov-1",
          role_type: "surgeon",
          first_name: "Pat",
          last_name: "Surgeon",
          account_id: "org-1",
          updated_at: "2026-06-10T00:00:00.000Z",
          provider_clinical_frustrations: "Access is tight in obese patients",
        },
      ],
      orgNameById: new Map([["org-1", "Metro Hospital"]]),
      repNameById: new Map([["rep-1", "Alex Rep"]]),
      docTypesByCase: new Map(),
      closedCaseActivities: [],
      productLinesByCase: new Map([["case-2", [{ actual_quantity: 1 }]]]),
      notesByCase: new Map([["case-1", [{ case_id: "case-1", created_at: "2026-06-10T12:00:00.000Z" }]]]),
      providerIdsWithIntelInPeriod: new Set(["prov-1"]),
      notes30dCutoff: "2026-05-16T00:00:00.000Z",
      readModelEnabled: false,
    });

    expect(payload.read_model_enabled).toBe(false);

    expect(payload.pathway_funnel).toHaveLength(5);
    expect(payload.kpis.find((k) => k.id === "cases_in_period")?.value).toBe(2);
    expect(payload.kpis.find((k) => k.id === "observations_completed")?.value).toBe(1);
    expect(payload.kpis.find((k) => k.id === "supported_product_cases")?.value).toBe(1);
    expect(payload.kpis).toHaveLength(3);
    expect(payload.kpis.find((k) => k.id === "active_reps")).toBeUndefined();
    expect(payload.kpis.find((k) => k.id === "debriefs_completed")).toBeUndefined();
    expect(payload.kpis.find((k) => k.id === "providers_new_intelligence")).toBeUndefined();
    expect(payload.case_revenue.expected).toBe(4500);
    expect(payload.case_revenue.actual).toBe(4100);
    expect(payload.case_revenue.cases_with_expected).toBe(1);
    expect(payload.reps[0]?.metrics.expected_revenue).toBe(4500);
    expect(payload.reps[0]?.metrics.actual_revenue).toBe(4100);
    expect(payload.reps).toHaveLength(1);
    expect(payload.reps[0]?.metrics.observations).toBe(1);
    expect(payload.reps[0]?.metrics.supported_product_cases).toBe(1);
    expect(payload.providers).toHaveLength(1);
    expect(payload.providers[0]?.display_name).toContain("Pat");
    expect(payload.providers[0]?.organization_name).toBe("Metro Hospital");
    expect(payload.providers[0]?.has_signals).toBe(true);
    expect(payload.providers[0]?.intelligence_bullets.length).toBeGreaterThan(0);
  });

  it("flags stale provider attention on reps", () => {
    const payload = buildAdminTeamDashboard({
      now,
      period: {
        key: "month",
        label: "June 2026",
        start: "2026-06-01",
        end: "2026-06-30",
        prior_label: "May 2026",
      },
      prior: { start: "2026-05-01", end: "2026-05-31", label: "May 2026" },
      internalReps: [{ user_id: "rep-1", display_name: "Alex Rep", email: null }],
      cases: [
        {
          id: "case-1",
          sales_rep_id: "rep-1",
          surgeon_contact_id: "prov-1",
          case_type: "observation",
          status: "completed",
          case_date: "2026-01-10",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-10T00:00:00.000Z",
        },
      ],
      engagements: [],
      contacts: [{ id: "prov-1", role_type: "surgeon", first_name: "Pat", last_name: "Surgeon", account_id: "org-1" }],
      orgNameById: new Map([["org-1", "Metro Hospital"]]),
      repNameById: new Map([["rep-1", "Alex Rep"]]),
      docTypesByCase: new Map(),
      closedCaseActivities: [],
      productLinesByCase: new Map(),
      notesByCase: new Map(),
      providerIdsWithIntelInPeriod: new Set(),
      notes30dCutoff: "2026-05-16T00:00:00.000Z",
    });

    expect(payload.providers[0]?.is_stale).toBe(true);
    expect(payload.reps[0]?.attention).toBe("stale_providers");
    expect(payload.reps[0]?.metrics.stale_providers).toBe(1);
  });
});
