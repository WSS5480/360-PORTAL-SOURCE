import { describe, expect, it } from "vitest";
import { buildProviderRelationshipOperationalMaturity } from "./buildProviderRelationshipOperationalMaturity";

describe("buildProviderRelationshipOperationalMaturity", () => {
  it("returns field-authentic scan lines for captured relationship signals", () => {
    const view = buildProviderRelationshipOperationalMaturity({
      provider_communication_style: "advocate|notes:Open after cases",
      provider_responsiveness: "same_day",
      provider_observation_coordinator_contact: "Jane OR scheduler",
      provider_observation_access_path: "coordinator|none",
      provider_support_expectations: "high_touch",
      provider_follow_up_approach: "in_person",
    });

    expect(view.indicators).toHaveLength(6);
    const surgeon = view.indicators.find((i) => i.id === "surgeon_engagement");
    expect(surgeon?.scanLine).toMatch(/post-case/i);
    expect(view.indicators.find((i) => i.id === "staff_responsiveness")?.scanLine).toMatch(
      /responsive between case days/i,
    );
    expect(view.documentedCount).toBeGreaterThanOrEqual(4);
    expect(view.headline.length).toBeGreaterThan(12);
  });

  it("surfaces guarded access and scheduler friction examples", () => {
    const view = buildProviderRelationshipOperationalMaturity({
      provider_communication_style: "cold",
      provider_observation_access_path: "committee|scheduler|notes:Needs incumbent sponsor",
    });

    expect(view.indicators.find((i) => i.id === "surgeon_engagement")?.scanLine).toMatch(
      /guarded access/i,
    );
    expect(view.indicators.find((i) => i.id === "scheduler_accessibility")?.scanLine).toMatch(
      /incumbent sponsor|difficult/i,
    );
    expect(view.tone).not.toBe("success");
  });

  it("marks undocumented dimensions as unknown", () => {
    const view = buildProviderRelationshipOperationalMaturity({});
    expect(view.openCount).toBe(6);
    expect(view.headline).toMatch(/still developing for field planning/i);
  });
});
