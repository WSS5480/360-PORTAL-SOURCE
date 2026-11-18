import { describe, expect, it } from "vitest";
import { buildProviderNextDiscoveryPriorities } from "./buildProviderNextDiscoveryPriorities";

describe("buildProviderNextDiscoveryPriorities", () => {
  it("returns refresh mission when no evidence on file", () => {
    const items = buildProviderNextDiscoveryPriorities({ contact: {} });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("refresh");
    expect(items[0]?.headline).toMatch(/revisit|account shift/i);
  });

  it("surfaces seek approval when provider interest is captured", () => {
    const items = buildProviderNextDiscoveryPriorities({
      contact: { provider_observation_feasibility: "Provider open to vendor observation" },
      relationshipStage: "prospect",
    });
    expect(items.some((p) => p.headline.includes("Seek observation approval"))).toBe(true);
    expect(items[0]?.drivers).toContain("evidence_chain");
  });

  it("surfaces credentialing recommendation when credentialing required on file", () => {
    const items = buildProviderNextDiscoveryPriorities({
      contact: {
        provider_observation_feasibility: "yes",
        provider_observation_credentialing_needed: "Credentialing required before vendor can observe",
      },
      relationshipStage: "observation_requested",
    });
    const cred = items.find((p) => p.id === "confirm_credentialing_process");
    expect(cred?.headline).toBe("Confirm credentialing process");
    expect(cred?.rationale).toMatch(/Credentialing required/);
  });

  it("surfaces scheduling contact confirmation when scheduler referenced", () => {
    const items = buildProviderNextDiscoveryPriorities({
      contact: {
        provider_observation_feasibility: "yes",
        provider_observation_coordinator_contact: "Work through Emily — contact info not captured",
      },
      relationshipStage: "observation_requested",
    });
    expect(items.some((p) => /scheduling contact/i.test(p.headline))).toBe(true);
  });

  it("attaches mission brief fields to evidence-based priorities", () => {
    const items = buildProviderNextDiscoveryPriorities({
      contact: { provider_observation_feasibility: "Provider interested in observation" },
    });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.missionTitle.length).toBeGreaterThan(0);
      expect(item.operationalConsequence.operationalProblem.length).toBeGreaterThan(0);
      expect(item.operationalImpact.length).toBeGreaterThan(0);
      expect(item.unlockValue.length).toBeGreaterThan(0);
      expect(item.captureMethod.length).toBeGreaterThan(0);
      expect(item.confidenceGain.length).toBeGreaterThan(0);
      expect(item.urgencyLabel.length).toBeGreaterThan(0);
    }
  });

  it("enriches deployment queue tactical fields for evidence chains", () => {
    const items = buildProviderNextDiscoveryPriorities({
      contact: {
        provider_observation_feasibility: "yes",
        provider_observation_credentialing_needed: "Credentialing required",
      },
      relationshipStage: "observation_requested",
    });
    const cred = items.find((p) => p.id === "confirm_credentialing_process");
    expect(cred?.leverageScore).toBeGreaterThanOrEqual(56);
    expect(cred?.captureSource.length).toBeGreaterThan(2);
    expect(cred?.interactionTiming.length).toBeGreaterThan(2);
  });
});
