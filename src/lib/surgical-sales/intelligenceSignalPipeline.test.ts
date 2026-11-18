import { describe, expect, it } from "vitest";
import { buildSynthesizedIntelligenceItem } from "./aiSynthesisGuardrails";
import {
  applyIntelligencePipelineToMapping,
  deriveMappingUpdatesFromSignals,
  normalizeExtractedSignals,
} from "./intelligenceSignalPipeline";
import type { LogUpdateOpenAiMapping } from "./logUpdateOpenAiMapping";

describe("intelligenceSignalPipeline", () => {
  it("suppresses low-quality CRM fragments from normalized signals", () => {
    const normalized = normalizeExtractedSignals([
      {
        domain: "relationship",
        signal: "Visit logged",
        confidence: "high",
        evidence: "I met with Dr. Candy today.",
        operational_meaning: "I met with Dr. Candy.",
        save_target: "provider",
        reasoning: "Rep visit note.",
        target: "provider",
      },
    ]);
    expect(normalized).toHaveLength(0);
  });

  it("builds synthesis items for facility access signals", () => {
    const item = buildSynthesizedIntelligenceItem({
      domain: "or_access",
      signal: "Observation pathway",
      confidence: "high",
      evidence:
        "Scheduler confirmed vendor credentialing is required before any observation case can be approved at this hospital.",
      operational_meaning:
        "OR observation requires vendor credentialing clearance before the scheduler will approve cases at this facility.",
      target: "organization",
      reason: "Facility access pathway stated in note.",
    });
    expect(item?.displayEligible).toBe(true);
    expect(item?.scope).toBe("organization");
  });

  it("maps high-quality operational signals to profile updates", () => {
    const normalized = normalizeExtractedSignals([
      {
        domain: "or_access",
        signal: "Observation pathway",
        confidence: "high",
        evidence:
          "Scheduler confirmed vendor credentialing is required before any observation case can be approved at this hospital.",
        operational_meaning:
          "OR observation requires vendor credentialing clearance before the scheduler will approve cases at this facility.",
        save_target: "organization",
        reasoning: "Facility access pathway stated in note.",
        target: "organization",
      },
    ]);

    expect(normalized).toHaveLength(1);
    const derived = deriveMappingUpdatesFromSignals(normalized);
    const updates = [...derived.confirmed_updates, ...derived.partial_updates];
    expect(updates).toHaveLength(1);
    expect(updates[0]?.value).toContain("credentialing");
    expect(updates.some((u) => /met with/i.test(u.value))).toBe(false);
  });

  it("routes medium confidence to partial updates for approval", () => {
    const normalized = normalizeExtractedSignals([
      {
        domain: "scheduling",
        signal: "Coordinator rhythm",
        confidence: "medium",
        evidence: "Tuesdays are lighter OR days.",
        operational_meaning: "Tuesday cases are the preferred observation window when access is approved.",
        save_target: "provider",
        reasoning: "Scheduling pattern mentioned without named contact.",
        target: "provider",
      },
    ]);

    const derived = deriveMappingUpdatesFromSignals(normalized);
    expect(derived.confirmed_updates).toHaveLength(0);
    expect(derived.partial_updates).toHaveLength(1);
  });

  it("merges overlapping signals on the same field", () => {
    const normalized = normalizeExtractedSignals([
      {
        domain: "or_access",
        signal: "Access path",
        confidence: "high",
        evidence: "Vendor credentialing first.",
        operational_meaning: "Vendor credentialing is required before observation cases are approved.",
        save_target: "provider",
        reasoning: "Pathway step one.",
        target: "provider",
      },
      {
        domain: "or_access",
        signal: "Scheduler gate",
        confidence: "high",
        evidence: "Scheduler signs off after credentialing.",
        operational_meaning: "Scheduler approval follows vendor credentialing clearance.",
        save_target: "provider",
        reasoning: "Pathway step two.",
        target: "provider",
      },
    ]);

    const derived = deriveMappingUpdatesFromSignals(normalized);
    expect(derived.confirmed_updates.length).toBeLessThanOrEqual(2);
  });

  it("attaches synthesis metadata on normalized signals", () => {
    const normalized = normalizeExtractedSignals([
      {
        domain: "relationship",
        signal: "Relationship stage",
        confidence: "high",
        evidence: "Intro call felt early — still proving workflow value.",
        operational_meaning:
          "Relationship is still early-stage and workflow impact proof is the main open thread on this account.",
        save_target: "provider",
        reasoning: "Stated on intro call.",
        target: "provider",
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.source).toContain("Intro call");
    expect(normalized[0]?.synthesis.scope).toBe("provider");
    expect(normalized[0]?.synthesis.durability).toBe("durable");
    expect(normalized[0]?.synthesis.operational_meaning).toMatch(/early-stage/i);
  });

  it("applies pipeline to operational_signals on mapping", () => {
    const mapping: LogUpdateOpenAiMapping = {
      summary: "Raw note.",
      confidence: "medium",
      reasoning: "Synthesized from signals.",
      source_scope: "field_note",
      operational_signals: [
        {
          domain: "workflow",
          signal: "Deployment friction",
          confidence: "high",
          evidence: "Surgeon worried about workflow disruption.",
          operational_meaning:
            "Workflow impact concerns remain unresolved and are blocking deployment enthusiasm.",
          save_target: "provider",
          reasoning: "Barrier to adoption.",
        },
      ],
      confirmed_updates: [],
      partial_updates: [],
      still_to_validate: [],
      recommended_next_moves: [],
      do_not_update: [],
    };

    const piped = applyIntelligencePipelineToMapping(mapping);
    expect(piped.confirmed_updates.length).toBeGreaterThan(0);
    expect(piped.summary).toContain("Workflow");
  });
});
