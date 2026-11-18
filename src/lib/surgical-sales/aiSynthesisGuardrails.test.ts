import { describe, expect, it } from "vitest";
import {
  AI_SYNTHESIS_GUARDRAIL_RULES,
  buildSynthesizedIntelligenceItem,
  guardConfidenceAgainstOverInference,
  isSynthesizedMeaningCardEligible,
  sanitizeUnansweredIntelligenceCopy,
  separateRawNoteFromSynthesis,
} from "./aiSynthesisGuardrails";

describe("aiSynthesisGuardrails", () => {
  it("documents enforced guardrail rules", () => {
    expect(AI_SYNTHESIS_GUARDRAIL_RULES.length).toBeGreaterThanOrEqual(7);
    expect(AI_SYNTHESIS_GUARDRAIL_RULES.join(" ")).toMatch(/raw fragments/i);
    expect(AI_SYNTHESIS_GUARDRAIL_RULES.join(" ")).toMatch(/facility policies/i);
  });

  it("reframes failure-tone unanswered copy", () => {
    expect(sanitizeUnansweredIntelligenceCopy("Credentialing path unclear")).toMatch(/still learning/i);
    expect(sanitizeUnansweredIntelligenceCopy("2 unresolved gaps")).toMatch(/open items/i);
  });

  it("rejects raw note passthrough as card synthesis", () => {
    const raw = "Met with scheduler today about credentialing.";
    expect(
      isSynthesizedMeaningCardEligible({
        operational_meaning: raw,
        evidence: raw,
        signal: "Visit",
      }),
    ).toBe(false);
  });

  it("downgrades high confidence when evidence is thin", () => {
    expect(
      guardConfidenceAgainstOverInference({
        confidence: "high",
        operational_meaning:
          "Vendor credentialing and scheduler approval are both required before any observation case can be booked at this facility.",
        evidence: "credentialing",
      }),
    ).toBe("medium");
  });

  it("marks complete synthesized meaning as card-eligible", () => {
    expect(
      isSynthesizedMeaningCardEligible({
        operational_meaning:
          "Vendor credentialing is required before the scheduler will approve observation cases at this facility.",
        evidence: "Scheduler said vendor credentialing is required before observation.",
        signal: "Credentialing gate",
      }),
    ).toBe(true);
  });

  it("builds synthesized items with scope, confidence, source, meaning, and durability", () => {
    const item = buildSynthesizedIntelligenceItem({
      domain: "or_access",
      signal: "Credentialing gate",
      confidence: "high",
      evidence: "Scheduler said vendor credentialing is required before observation.",
      operational_meaning:
        "Vendor credentialing is required before the scheduler will approve observation cases at this facility.",
      target: "organization",
      reason: "Facility access rule stated in note.",
      dbKey: "provider_observation_credentialing_needed",
    });

    expect(item).not.toBeNull();
    expect(item?.scope).toBe("organization");
    expect(item?.destination).toBe("facility");
    expect(item?.confidence).toMatch(/high|medium/);
    expect(item?.source).toContain("Scheduler");
    expect(item?.operational_meaning).toContain("credentialing");
    expect(item?.durability).toBe("durable");
    expect(item?.displayEligible).toBe(true);
    expect(item?.persistEligible).toBe(true);
  });

  it("keeps provider preferences off facility scope", () => {
    const item = buildSynthesizedIntelligenceItem({
      domain: "workflow",
      signal: "Technique preference",
      confidence: "high",
      evidence: "Surgeon prefers robotic ventral hernia approach.",
      operational_meaning: "Surgeon prefers robotic approach for ventral hernia cases.",
      target: "organization",
      reason: "AI suggested facility.",
      dbKey: "provider_technique_preferences",
    });

    expect(item?.scope).toBe("provider");
    expect(item?.destination).toBe("provider");
  });

  it("separates raw notes from synthesized meaning", () => {
    const split = separateRawNoteFromSynthesis({
      rawNote: "Met scheduler — credentialing first.",
      operational_meaning:
        "Vendor credentialing must clear before the scheduler approves observation.",
    });
    expect(split.rawNote).toContain("Met scheduler");
    expect(split.synthesized).toContain("credentialing");
  });
});
