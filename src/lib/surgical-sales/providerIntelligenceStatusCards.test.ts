import { describe, expect, it } from "vitest";
import {
  buildProviderIntelligenceStatusCards,
  statusCardConfidenceFromSection,
} from "./providerIntelligenceStatusCards";

describe("providerIntelligenceStatusCards", () => {
  it("uses operational summaries not abstract confidence tiers", () => {
    const cards = buildProviderIntelligenceStatusCards({});
    const labels = cards.map((c) => c.confidenceLabel).join(" ");
    expect(labels).not.toMatch(/low confidence|partial confidence|strong confidence/i);
    expect(labels).toMatch(/not validated|unclear|still learning|developing|limited|thin|TBD/i);
  });

  it("maps section confidence to card tiers", () => {
    expect(statusCardConfidenceFromSection("unknown")).toBe("low");
    expect(statusCardConfidenceFromSection("partial")).toBe("partial");
    expect(statusCardConfidenceFromSection("confirmed")).toBe("strong");
    expect(statusCardConfidenceFromSection("validated")).toBe("validated");
  });

  it("returns four strategic status cards", () => {
    const cards = buildProviderIntelligenceStatusCards({});
    expect(cards).toHaveLength(4);
    expect(cards.map((c) => c.title)).toEqual([
      "OR access",
      "Workflow",
      "Commercial",
      "Relationship",
    ]);
  });

  it("builds observation interpretation with capture CTA when coordinator missing", () => {
    const cards = buildProviderIntelligenceStatusCards({
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "cleared",
    });
    const obs = cards.find((c) => c.id === "observation_pathway")!;
    expect(obs.confidence).not.toBe("low");
    expect(obs.interpretation).toMatch(/Allowed/i);
    expect(obs.interpretation).toMatch(/scheduling owner|credentialing/i);
    expect(obs.interpretation).toMatch(/scheduling owner|coordinator/i);
    expect(obs.topMissingSignal).toMatch(/OR scheduling owner/i);
    expect(obs.ctaLabel).toBe("Confirm OR scheduling owner");
    expect(obs.ctaMode).toBe("capture");
  });

  it("includes scan metrics for console cards", () => {
    const cards = buildProviderIntelligenceStatusCards({});
    for (const card of cards) {
      expect(card.scanSummary.length).toBeGreaterThan(0);
      expect(card.scanSummary.length).toBeLessThanOrEqual(97);
      expect(card.blockerCount).toBeGreaterThanOrEqual(0);
      expect(card.validatedSignalCount).toBeGreaterThanOrEqual(0);
      expect(card.emergingSignalCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("exposes lane scan fields: key blocker and next unlock", () => {
    const cards = buildProviderIntelligenceStatusCards({
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "cleared",
    });
    const obs = cards.find((c) => c.id === "observation_pathway")!;
    expect(obs.keyBlocker.length).toBeGreaterThan(3);
    expect(obs.nextUnlock).toMatch(/scheduling|OR access/i);
    expect(obs.nextUnlock).not.toMatch(/^Unlocks /i);
  });

  it("offers review CTA when area is validated", () => {
    const cards = buildProviderIntelligenceStatusCards({
      provider_procedure_focus: "hernia,bariatric",
      provider_technique_preferences: "laparoscopic,robotic",
      provider_technique_detail: "standard_lap|Xi dock preference and tray setup notes",
      provider_case_volume_estimate: "high",
      provider_credentialing_status: "cleared",
      provider_current_vendors: "incumbent_a",
      provider_or_team_dynamics: "Charge RN runs turnover; PA gates vendor conversations.",
    });
    const workflow = cards.find((c) => c.id === "workflow_understanding")!;
    if (workflow.confidence === "validated" || workflow.confidence === "strong") {
      expect(workflow.ctaMode).toBe("review");
      expect(workflow.ctaLabel).toBe("Review workflow map");
    }
  });
});
