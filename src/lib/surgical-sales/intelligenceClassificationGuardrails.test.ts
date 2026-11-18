import { describe, expect, it } from "vitest";
import {
  classifyIntelligenceRow,
  reclassifyIntelligenceMapping,
  textIsRepOpenNeed,
} from "./intelligenceClassificationGuardrails";
import type { LogUpdateOpenAiMapping } from "./logUpdateOpenAiMapping";

describe("intelligenceClassificationGuardrails", () => {
  it("classifies hedged procedure mix as partial not confirmed", () => {
    expect(
      classifyIntelligenceRow({
        label: "Procedure mix known",
        value: "Open, lap, and robotic cases mentioned without breakdown",
        evidence: "mix of open, lap, and robotic but didn't get a great breakdown yet",
        confidence: "high",
      }),
    ).toBe("partial");
  });

  it("classifies rep open needs as still to validate", () => {
    expect(
      classifyIntelligenceRow({
        label: "Scheduling owner not identified",
        value: "Access coordinator unknown",
        evidence: "I still need to figure out who coordinates access or scheduling",
        confidence: "high",
      }),
    ).toBe("still_to_validate");
    expect(textIsRepOpenNeed("I still need to figure out who coordinates access")).toBe(true);
  });

  it("reclassifies wrongful confirmed rows from mapping", () => {
    const mapping: LogUpdateOpenAiMapping = {
      summary: "Visit note",
      confidence: "medium",
      reasoning: "From note",
      source_scope: "visit",
      operational_signals: [],
      confirmed_updates: [
        {
          domain: "case_mix",
          label: "Procedure mix known",
          value: "Open, lap, and robotic",
          confidence: "high",
          save_target: "provider",
          reasoning: "mentioned in note",
        },
        {
          domain: "scheduling",
          label: "Scheduling owner not identified",
          value: "Unknown coordinator",
          confidence: "high",
          save_target: "organization",
          reasoning: "rep still learning",
        },
      ],
      partial_updates: [],
      still_to_validate: [],
      recommended_next_moves: [],
      do_not_update: [],
    };

    const rawNote =
      "They do a mix of open, lap, and robotic cases, but I didn't get a great breakdown yet. I still need to figure out who coordinates access or scheduling.";

    const result = reclassifyIntelligenceMapping(mapping, { rawNote });

    expect(result.confirmed_updates).toHaveLength(0);
    expect(result.partial_updates.some((p) => /procedure mix partially mapped/i.test(p.label))).toBe(
      true,
    );
    expect(
      result.still_to_validate.some((q) => /who coordinates access or scheduling/i.test(q.question)),
    ).toBe(true);
  });
});
