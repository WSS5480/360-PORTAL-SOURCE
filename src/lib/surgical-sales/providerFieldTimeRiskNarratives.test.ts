import { describe, expect, it } from "vitest";
import {
  composeFieldTimeRiskNarrative,
  narrativeForFieldTimeRiskInput,
} from "./providerFieldTimeRiskNarratives";

describe("providerFieldTimeRiskNarratives", () => {
  it("returns direct field copy for open coordinator signal", () => {
    const n = narrativeForFieldTimeRiskInput("coordinator_mapped", "open", {});
    expect(n.whyFieldTimeFails).toMatch(/scheduling owner|wasted/i);
    expect(n.whyFieldTimeFails).not.toMatch(/assuming/i);
    expect(n.reducerSignal).toMatch(/coordinator|calendar|posting/i);
  });

  it("composes high-risk narrative with reducers", () => {
    const narrative = composeFieldTimeRiskNarrative({
      state: "high_wasted_field_risk",
      inputs: [
        { id: "or_access_known", status: "open" },
        { id: "coordinator_mapped", status: "open" },
        { id: "scheduling_clarity", status: "open" },
      ],
      contact: {
        provider_observation_access_path: "committee approval required",
      },
    });
    expect(narrative.tierLabel).toBe("High risk");
    expect(narrative.reducers.length).toBeGreaterThan(0);
    expect(narrative.reducers[0]!.reducerSignal.length).toBeGreaterThan(10);
  });
});
