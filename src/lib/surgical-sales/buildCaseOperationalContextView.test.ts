import { describe, expect, it } from "vitest";

import {
  buildCaseOperationalContextView,
  caseListOperationalPrepHint,
} from "@/lib/surgical-sales/buildCaseOperationalContextView";

describe("buildCaseOperationalContextView", () => {
  it("builds readiness dimensions from case logistics and inherited context", () => {
    const view = buildCaseOperationalContextView({
      caseRow: {
        case_implants_on_site: "yes|On site",
        case_trays_sterilization_status: "ready|Sterilized",
        case_support_coverage: "rep_in_room|Rep assigned",
        case_operational_risks: "late_tray|Tray may arrive late",
      },
      surgeonContact: {
        provider_procedure_focus: "hernia|Hernia focus",
        provider_technique_preferences: "laparoscopic",
        provider_facility_spd_tray_behavior: "SPD prefers 24h notice",
        provider_observation_access_path: "scheduler|Through scheduler",
        provider_observation_credentialing_needed: "yes|Vendor credentialing required",
      },
      organizationName: "Metro General",
    });

    expect(view.dimensions.map((d) => d.id)).toEqual([
      "implants_on_site",
      "trays_ready",
      "support_coverage",
      "facility_logistics",
      "provider_preferences",
      "case_risks",
    ]);
    expect(view.facility.items.length).toBeGreaterThan(0);
    expect(view.provider.items.length).toBeGreaterThan(0);
    expect(view.caseDay.items.length).toBe(7);
    expect(view.readinessSummary).toMatch(/case day|Inherited/i);
    expect(view.readyCount).toBeGreaterThanOrEqual(3);
  });

  it("formats list prep hint from logistics fields", () => {
    expect(
      caseListOperationalPrepHint({
        case_implants_on_site: "yes",
        case_trays_sterilization_status: "",
        case_support_coverage: "",
        case_operational_risks: "",
      }),
    ).toMatch(/Case prep/);
  });
});
