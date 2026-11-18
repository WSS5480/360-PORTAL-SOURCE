import { describe, expect, it } from "vitest";

import { extractObservationFactsV2 } from "./extractObservationFactsV2";

/** Canonical Dr. Lettuce note (torture case ROUTINE_CASE_NOTE). */
const ROUTINE_CASE_NOTE =
  "Pretty routine case overall. They're still using Bard Mesh. One thing I noticed was the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation. Didn't seem angry about it, but it definitely slowed things down. Staff was good. Everyone seemed to know what they were doing. There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major. Still too early for me to know if there's a real opportunity here.";

/**
 * Recorded OpenAI response for the canonical note — the §8 acceptance fixture.
 * Values are pinned to the existing regex vocabulary by the system prompt.
 */
const RECORDED_OPENAI_RESPONSE = JSON.stringify({
  facts: [
    {
      type: "current_product",
      value: "Bard Mesh",
      evidence: "They're still using Bard Mesh.",
      polarity: "neutral",
      confirmation_state: "witnessed",
    },
    {
      type: "workflow_issue",
      value: "extra visualization time before fixation",
      evidence:
        "the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation",
      polarity: "negative",
      confirmation_state: "witnessed",
    },
    {
      type: "visualization_challenge",
      value: "extra visualization time before fixation",
      evidence:
        "the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation",
      polarity: "negative",
      confirmation_state: "witnessed",
    },
    {
      type: "fixation_challenge",
      value: "visualization delay before fixation",
      evidence: "he wasn't getting the view he wanted before fixation",
      polarity: "negative",
      confirmation_state: "witnessed",
    },
    {
      type: "staff_efficiency",
      value: "coordinated team",
      evidence: "Everyone seemed to know what they were doing.",
      polarity: "positive",
      confirmation_state: "witnessed",
    },
    {
      type: "workflow_delay",
      value: "delay caused by readiness issue",
      evidence:
        "There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major.",
      polarity: "negative",
      confirmation_state: "witnessed",
    },
    {
      type: "workflow_issue",
      value: "delay caused by readiness issue",
      evidence:
        "There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major.",
      polarity: "negative",
      confirmation_state: "witnessed",
    },
  ],
});

describe("extractObservationFactsV2", () => {
  it("acceptance fixture: Dr. Lettuce note through a recorded OpenAI response", async () => {
    const extraction = await extractObservationFactsV2(ROUTINE_CASE_NOTE, {
      aiCall: async () => RECORDED_OPENAI_RESPONSE,
    });

    expect(extraction.model).toBe("facts-v2-ai");
    expect(extraction.validation_version).toBe(1);
    expect(typeof extraction.extraction_ms).toBe("number");
    expect(Array.isArray(extraction.legacy_facts)).toBe(true);

    const byKey = new Map(
      extraction.facts.map((fact) => [`${fact.type}:${fact.value}`, fact]),
    );

    // Product — canonical casing, accepted.
    const product = byKey.get("current_product:Bard Mesh");
    expect(product?.validation?.status).toBe("accepted");
    expect(product?.polarity).toBe("neutral");

    // Visualization — canonical value, accepted.
    const visualization = byKey.get(
      "visualization_challenge:extra visualization time before fixation",
    );
    expect(visualization?.validation?.status).toBe("accepted");

    // Positive staff — canonical value, accepted, positive polarity.
    const staff = byKey.get("staff_efficiency:coordinated team");
    expect(staff?.validation?.status).toBe("accepted");
    expect(staff?.polarity).toBe("positive");

    // Readiness delay — present in the envelope but suppressed (minimized).
    const delay = byKey.get("workflow_delay:delay caused by readiness issue");
    expect(delay?.validation).toEqual({ status: "suppressed", reason: "minimized" });
    const delayTwin = byKey.get("workflow_issue:delay caused by readiness issue");
    expect(delayTwin?.validation?.status).toBe("suppressed");
  });

  it("falls back to validated rules extraction on timeout", async () => {
    const extraction = await extractObservationFactsV2(ROUTINE_CASE_NOTE, {
      timeoutMs: 10,
      aiCall: ({ signal }) =>
        new Promise<string>((_, reject) => {
          signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });

    expect(extraction.model).toBe("facts-v2-rules-fallback");
    expect(extraction.validation_version).toBe(1);
    // Fallback output is still validated — minimized delay suppressed.
    const delay = extraction.facts.find(
      (fact) => fact.type === "workflow_delay" && fact.value === "delay caused by readiness issue",
    );
    expect(delay?.validation?.status).toBe("suppressed");
    const product = extraction.facts.find((fact) => fact.value === "Bard Mesh");
    expect(product?.validation?.status).toBe("accepted");
  });

  it("falls back on invalid JSON", async () => {
    const extraction = await extractObservationFactsV2(ROUTINE_CASE_NOTE, {
      aiCall: async () => "not json at all",
    });
    expect(extraction.model).toBe("facts-v2-rules-fallback");
  });

  it("falls back on schema-invalid payload", async () => {
    const extraction = await extractObservationFactsV2(ROUTINE_CASE_NOTE, {
      aiCall: async () => JSON.stringify({ facts: [{ type: "made_up_type", value: "x" }] }),
    });
    expect(extraction.model).toBe("facts-v2-rules-fallback");
  });

  it("accepts a clean zero-fact AI response without falling back", async () => {
    const extraction = await extractObservationFactsV2("Nothing notable today.", {
      aiCall: async () => JSON.stringify({ facts: [] }),
    });
    expect(extraction.model).toBe("facts-v2-ai");
    expect(extraction.facts).toEqual([]);
    expect(extraction.validation_version).toBe(1);
  });

  it("suppresses AI delay facts derived from explicit absence statements", async () => {
    const smoothNote =
      "Very smooth case today. There were very few interruptions or delays. The operating room appeared well organized and the team worked efficiently. No obvious workflow barriers. No room readiness issues and no supply-related delays.";

    const extraction = await extractObservationFactsV2(smoothNote, {
      aiCall: async () =>
        JSON.stringify({
          facts: [
            {
              type: "workflow_delay",
              value: "delay caused by readiness issue",
              evidence: "No room readiness issues and no supply-related delays.",
              polarity: "negative",
              confirmation_state: "witnessed",
            },
            {
              type: "staff_efficiency",
              value: "coordinated team",
              evidence: "the team worked efficiently",
              polarity: "positive",
              confirmation_state: "witnessed",
            },
          ],
        }),
    });

    expect(extraction.model).toBe("facts-v2-ai");
    const delay = extraction.facts.find(
      (fact) => fact.value === "delay caused by readiness issue",
    );
    expect(delay?.validation).toEqual({ status: "suppressed", reason: "negated_evidence" });

    const staff = extraction.facts.find((fact) => fact.type === "staff_efficiency");
    expect(staff?.validation?.status).toBe("accepted");
  });

  it("drops AI facts with hallucinated evidence via the validator", async () => {
    const extraction = await extractObservationFactsV2(ROUTINE_CASE_NOTE, {
      aiCall: async () =>
        JSON.stringify({
          facts: [
            {
              type: "provider_frustration",
              value: "provider clinical frustration observed",
              evidence: "The surgeon was visibly furious and threw instruments.",
              polarity: "negative",
              confirmation_state: "witnessed",
            },
          ],
        }),
    });
    expect(extraction.model).toBe("facts-v2-ai");
    expect(extraction.facts).toEqual([]);
  });
});
