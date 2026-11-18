import { describe, expect, it } from "vitest";
import { buildProviderOperationalRisks } from "./buildProviderOperationalRisks";

describe("buildProviderOperationalRisks", () => {
  it("surfaces credentialing and OR access risks for empty prospect", () => {
    const risks = buildProviderOperationalRisks({
      contact: {
        provider_observation_access_path: "",
        provider_observation_feasibility: "",
        provider_credentialing_status: "",
        provider_observation_credentialing_needed: "",
      },
      commercialStage: "early_discovery",
    });

    const ids = risks.map((r) => r.id);
    expect(ids).toContain("credentialing_unknown");
    expect(ids).toContain("or_access_blockers");

    const cred = risks.find((r) => r.id === "credentialing_unknown");
    expect(cred?.severity).toBe("high");
    expect(cred?.consequence.length).toBeGreaterThan(20);
    expect(cred?.mitigation.length).toBeGreaterThan(20);
  });

  it("includes scheduling uncertainty when coordinator is unknown", () => {
    const risks = buildProviderOperationalRisks({
      contact: { provider_observation_coordinator_contact: "" },
      commercialStage: "observation",
    });

    expect(risks.some((r) => r.id === "scheduling_uncertainty")).toBe(true);
  });
});
