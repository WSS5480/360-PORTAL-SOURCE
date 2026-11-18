import { describe, expect, it } from "vitest";
import {
  buildDiscoveryOpenQuestionRows,
  openQuestionForIncompleteSignal,
} from "./discoveryIntelligenceOpenQuestions";
import { DISCOVERY_FIELD_STATUS } from "./discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

describe("discoveryIntelligenceOpenQuestions", () => {
  it("returns scheduling question only when scheduling owner is Unknown", () => {
    expect(
      openQuestionForIncompleteSignal(
        "scheduling_owner",
        F.unknown,
      ),
    ).toBe("Who owns observation scheduling?");
    expect(
      openQuestionForIncompleteSignal(
        "scheduling_owner",
        F.captured,
      ),
    ).toBeNull();
  });

  it("skips observation approval question when Approved", () => {
    const rows = buildDiscoveryOpenQuestionRows({
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_coordinator_contact: "Jane",
      },
      confidenceForDbKeys: () => "Captured — needs validation",
      lastUpdatedForDbKeys: () => "—",
    });
    const labels = rows.map((r) => r.label);
    expect(labels).not.toContain("Has the provider agreed to support observation access?");
    expect(labels).not.toContain("Who owns observation scheduling?");
  });

  it("includes workflow question when procedure mix is empty", () => {
    const rows = buildDiscoveryOpenQuestionRows({
      contact: { provider_relationship_stage: "early_discovery" },
      confidenceForDbKeys: () => "Not on file",
      lastUpdatedForDbKeys: () => "—",
    });
    expect(rows.map((r) => r.label)).toContain("How well is the procedure workflow understood?");
  });
});
