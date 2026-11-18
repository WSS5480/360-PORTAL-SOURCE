import { describe, expect, it } from "vitest";
import {
  intelligenceUnlocksNextArrow,
  intelligenceUnlocksNextCapability,
  intelligenceUnlocksNextLine,
} from "./providerIntelligenceUnlocksNext";

describe("providerIntelligenceUnlocksNext", () => {
  it("returns operational capability lines for anchor fields", () => {
    expect(intelligenceUnlocksNextCapability("provider_observation_coordinator_contact")).toMatch(
      /OR access planning/i,
    );
    expect(intelligenceUnlocksNextCapability("provider_procedure_focus")).toMatch(
      /evaluation positioning/i,
    );
    expect(intelligenceUnlocksNextCapability("provider_evaluation_openness")).toMatch(
      /economic buyer/i,
    );
  });

  it("formats unlock line with prefix", () => {
    expect(intelligenceUnlocksNextLine("provider_procedure_focus")).toMatch(
      /^targeted evaluation positioning/i,
    );
    expect(intelligenceUnlocksNextArrow("provider_observation_coordinator_contact")).toMatch(
      /^→ reliable OR access planning/i,
    );
  });
});
