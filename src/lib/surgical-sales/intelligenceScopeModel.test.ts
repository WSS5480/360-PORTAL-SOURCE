import { describe, expect, it } from "vitest";



import {

  defaultCaptureScopeForDbKey,

  intelligenceScopeForDbKey,

  INTELLIGENCE_SCOPE_LABELS,

} from "@/lib/surgical-sales/intelligenceScopeModel";



describe("intelligenceScopeModel", () => {

  it("classifies organization-scoped facility fields", () => {

    expect(intelligenceScopeForDbKey("provider_credentialing_status")).toBe("organization");

    expect(intelligenceScopeForDbKey("provider_observation_access_path")).toBe("organization");

    expect(intelligenceScopeForDbKey("provider_facility_spd_tray_behavior")).toBe("organization");

    expect(intelligenceScopeForDbKey("provider_facility_room_turnover_patterns")).toBe("organization");

  });



  it("classifies provider-scoped surgeon fields", () => {

    expect(intelligenceScopeForDbKey("provider_procedure_focus")).toBe("provider");

    expect(intelligenceScopeForDbKey("provider_observation_feasibility")).toBe("provider");

    expect(intelligenceScopeForDbKey("provider_communication_style")).toBe("provider");

    expect(intelligenceScopeForDbKey("influence_level")).toBe("provider");

  });



  it("classifies case-scoped fields", () => {

    expect(intelligenceScopeForDbKey("observation_goal")).toBe("case");

    expect(intelligenceScopeForDbKey("pre_observation_probes")).toBe("case");

    expect(intelligenceScopeForDbKey("prepare_tactical_asks")).toBe("case");

    expect(intelligenceScopeForDbKey("live_observation_workflow")).toBe("case");

    expect(intelligenceScopeForDbKey("case_implants_on_site")).toBe("case");

    expect(intelligenceScopeForDbKey("case_operational_risks")).toBe("case");

  });



  it("defaults unknown keys to provider only when explicitly unmapped", () => {

    expect(defaultCaptureScopeForDbKey("unknown_custom_field")).toBe("provider");

    expect(intelligenceScopeForDbKey("unknown_custom_field")).toBeNull();

  });



  it("exposes human-readable scope labels", () => {

    expect(INTELLIGENCE_SCOPE_LABELS.organization).toMatch(/Organization|Facility/i);

    expect(INTELLIGENCE_SCOPE_LABELS.provider).toMatch(/Provider/i);

    expect(INTELLIGENCE_SCOPE_LABELS.case).toMatch(/Case/i);

  });

});


