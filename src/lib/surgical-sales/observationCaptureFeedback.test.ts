import { describe, expect, it } from "vitest";

import type { ObservationFact } from "@/lib/surgical-sales/observationIntelligence/observationFactTypes";
import {
  buildObservationCaptureFeedback,
  buildObservationCaptureFeedbackFromUniversalCapture,
  resolveObservationCaptureFeedback,
  OBSERVATION_CAPTURE_FEEDBACK_DEFERRED_MESSAGE,
} from "./observationCaptureFeedback";
import type { UniversalCaptureEnvelope } from "@/lib/surgical-sales/universalExtractor/runUniversalExtractorShadow";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";

/** Canonical Dr. Lettuce note — contains the minimized readiness-delay false positive. */
const ROUTINE_CASE_NOTE =
  "Pretty routine case overall. They're still using Bard Mesh. One thing I noticed was the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation. Didn't seem angry about it, but it definitely slowed things down. Staff was good. Everyone seemed to know what they were doing. There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major. Still too early for me to know if there's a real opportunity here.";

const DR_LETTUCE_ACSIS_OBSERVATION_NOTE = [
  "Observation with Dr. Lettuce today.",
  "Robotic ventral hernia repair.",
  "Currently using standard rigid suction irrigation.",
  "Had a few moments where access was difficult in tighter anatomy and the assistant had to reposition several times.",
  "Dr. Lettuce mentioned visualization can be challenging in deeper portions of the case.",
  "Asked a few questions about ACSIS and how it compares to what they're using now.",
  "Didn't make any commitments but seemed interested.",
  "Suggested we get ACSIS into a future case so he can see it in action.",
  "Follow up with Jennifer and identify an appropriate evaluation case.",
].join("\n\n");

function v2Facts(): ObservationFact[] {
  return [
    {
      type: "current_product",
      value: "Bard Mesh",
      evidence: "They're still using Bard Mesh.",
      polarity: "neutral",
      confirmation_state: "witnessed",
      validation: { status: "accepted" },
    },
    {
      type: "workflow_issue",
      value: "extra visualization time before fixation",
      evidence:
        "the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation",
      polarity: "negative",
      confirmation_state: "witnessed",
      validation: { status: "accepted" },
    },
    {
      type: "staff_efficiency",
      value: "coordinated team",
      evidence: "Everyone seemed to know what they were doing.",
      polarity: "positive",
      confirmation_state: "witnessed",
      validation: { status: "accepted" },
    },
    {
      type: "workflow_delay",
      value: "delay caused by readiness issue",
      evidence:
        "There was a little waiting around at one point because they were looking for something that wasn't ready. Nothing major.",
      polarity: "negative",
      confirmation_state: "witnessed",
      validation: { status: "suppressed", reason: "minimized" },
    },
  ];
}

function v2Extraction(): Record<string, unknown> {
  return {
    facts: v2Facts(),
    extractedAt: "2026-06-09T00:00:00.000Z",
    model: "facts-v2-ai",
    validation_version: 1,
  };
}

describe("buildObservationCaptureFeedback", () => {
  it("returns rep-facing finding chips for a v2 validated note", () => {
    const items = buildObservationCaptureFeedback({
      caseId: "case-1",
      noteBody: ROUTINE_CASE_NOTE,
      aiExtraction: v2Extraction(),
    });

    expect(items.length).toBeGreaterThan(0);
    const joined = items.map((item) => item.text).join("\n");
    expect(joined).toMatch(/Bard Mesh/i);
    expect(joined).toMatch(/visualization/i);
    // Suppressed false-positive delay must not appear in capture feedback.
    expect(joined).not.toMatch(/readiness/i);
    // No internal ontology labels in rep-facing chips.
    expect(joined).not.toMatch(/staff burden:|provider concern:|workflow_/i);
  });

  it("falls back to the legacy display path when no extraction envelope is returned", () => {
    const items = buildObservationCaptureFeedback({
      caseId: "case-1",
      noteBody: ROUTINE_CASE_NOTE,
      aiExtraction: null,
    });

    expect(items.length).toBeGreaterThan(0);
    expect(items.map((item) => item.text).join("\n")).toMatch(/Bard Mesh/i);
  });

  it("returns nothing for an empty note body", () => {
    expect(buildObservationCaptureFeedback({ caseId: "case-1", noteBody: "  " })).toEqual([]);
  });

  describe("validation gate parity with the Intelligence tab", () => {
    /** Note that explicitly disclaims frustration — "did not appear to create frustration"
     * slips past the legacy regex negation guard (which only covers "did not seem ..."). */
    const NO_FRUSTRATION_NOTE =
      "They were using Bard Mesh again. The surgeon spent extra time improving visualization before fixation, but the additional time did not appear to create any frustration for the surgeon. No product complaints were heard. Staff workflow was smooth and coordinated.";

    const acceptedFacts: ObservationFact[] = [
      {
        type: "current_product",
        value: "Bard Mesh",
        evidence: "They were using Bard Mesh again.",
        polarity: "neutral",
        confirmation_state: "witnessed",
        validation: { status: "accepted" },
      },
      {
        type: "workflow_issue",
        value: "extra visualization time before fixation",
        evidence: "The surgeon spent extra time improving visualization before fixation",
        polarity: "negative",
        confirmation_state: "witnessed",
        validation: { status: "accepted" },
      },
      {
        type: "staff_efficiency",
        value: "coordinated team",
        evidence: "Staff workflow was smooth and coordinated.",
        polarity: "positive",
        confirmation_state: "witnessed",
        validation: { status: "accepted" },
      },
    ];

    it("does not invent provider frustration when the v2 envelope carries validation_version", () => {
      const items = buildObservationCaptureFeedback({
        caseId: "case-1",
        noteBody: NO_FRUSTRATION_NOTE,
        aiExtraction: {
          facts: acceptedFacts,
          extractedAt: "2026-06-10T00:00:00.000Z",
          model: "facts-v2-ai",
          validation_version: 1,
        },
      });

      const joined = items.map((item) => item.text).join("\n");
      expect(joined).toMatch(/Bard Mesh/i);
      expect(joined).not.toMatch(/frustrat/i);
    });

    it("falls back to legacy body re-parse when validation_version is missing — why the notes API must return it", () => {
      // Same extraction minus the gate key: the display path treats the note as
      // legacy and regex re-parses the body, resurrecting a frustration finding
      // the v2 pipeline never extracted. The notes route response must include
      // validation_version so capture-time chips never take this branch for v2 notes.
      const items = buildObservationCaptureFeedback({
        caseId: "case-1",
        noteBody: NO_FRUSTRATION_NOTE,
        aiExtraction: {
          facts: acceptedFacts,
          extractedAt: "2026-06-10T00:00:00.000Z",
          model: "facts-v2-ai",
        },
      });

      expect(items.map((item) => item.text).join("\n")).toMatch(/frustrat/i);
    });
  });
});

describe("resolveObservationCaptureFeedback (read model)", () => {
  const universalCapture: UniversalCaptureEnvelope = {
    capture_id: "capture-1",
    fact_ids: ["fact-1"],
    universal: {
      model: "universal-surgical-rules-v1",
      extracted_at: "2026-06-10T12:00:00Z",
      extraction_ms: 12,
      declared_source_type: "observation_case",
      raw_note: ROUTINE_CASE_NOTE,
      shadow_mode: true,
      facts: [
        {
          concept: "current_product",
          normalized_label: "Bard Mesh was used during the case",
          assertion_level: "observed",
          source_type: "observation_case",
          evidence_text: "They're still using Bard Mesh.",
          confidence: "high",
          negated: false,
          uncertain: false,
          product_mentioned: "Bard Mesh",
        },
      ],
      suppressed_facts: [],
    },
  };

  it("returns UF adapter chips when read model is enabled", () => {
    const result = resolveObservationCaptureFeedback({
      caseId: "case-1",
      noteBody: ROUTINE_CASE_NOTE,
      universalCapture,
      readModelEnabled: true,
    });

    expect(result?.status).toBe("chips");
    if (result?.status === "chips") {
      expect(result.items[0]?.text).toBe("Bard Mesh was used during the case");
      expect(result.items[0]?.id).toMatch(/^uf-current-/);
    }
  });

  it("falls back to OIE chips when read model is enabled but UF is empty", () => {
    const result = resolveObservationCaptureFeedback({
      caseId: "case-1",
      noteBody: ROUTINE_CASE_NOTE,
      aiExtraction: v2Extraction(),
      universalCapture: null,
      readModelEnabled: true,
    });

    expect(result?.status).toBe("chips");
    if (result?.status === "chips") {
      const joined = result.items.map((item) => item.text).join("\n");
      expect(joined).toMatch(/Bard Mesh/i);
      expect(joined).toMatch(/visualization/i);
      expect(joined).not.toMatch(/^uf-/i);
    }
  });

  it("defers only when read model is enabled and both UF and OIE are empty", () => {
    const result = resolveObservationCaptureFeedback({
      caseId: "case-1",
      noteBody: "  ",
      readModelEnabled: true,
    });

    expect(result).toEqual({
      status: "deferred",
      message: OBSERVATION_CAPTURE_FEEDBACK_DEFERRED_MESSAGE,
    });
  });

  it("buildObservationCaptureFeedbackFromUniversalCapture matches This Observation adapter ids", () => {
    const items = buildObservationCaptureFeedbackFromUniversalCapture({
      caseId: "case-1",
      universalCapture,
    });
    expect(items[0]?.id).toMatch(/^uf-current-/);
  });

  it("keeps ACSIS observation questions as interest, not product usage", () => {
    const universal = runUniversalSurgicalExtraction(
      {
        raw_note: DR_LETTUCE_ACSIS_OBSERVATION_NOTE,
        declared_source_type: "observation_case",
      },
      () => Date.parse("2026-06-24T19:07:00Z"),
    );
    const capture: UniversalCaptureEnvelope = {
      capture_id: "capture-lettuce-acsis",
      fact_ids: universal.facts.map((_, index) => `fact-${index}`),
      universal,
    };

    const result = resolveObservationCaptureFeedback({
      caseId: "case-1",
      noteBody: DR_LETTUCE_ACSIS_OBSERVATION_NOTE,
      universalCapture: capture,
      readModelEnabled: true,
    });

    expect(result?.status).toBe("chips");
    if (result?.status !== "chips") return;

    const chipText = result.items.map((item) => item.text).join("\n");
    expect(chipText).toMatch(/Current setup: standard rigid suction irrigation/i);
    expect(chipText).toMatch(/Access (?:was difficult|difficulty)/i);
    expect(chipText).toMatch(/Visualization was challenging/i);
    expect(chipText).toMatch(/ACSIS interest/i);
    expect(chipText).not.toMatch(/ACSIS was used/i);
    expect(chipText).not.toMatch(/Now was used/i);
  });

  it("does not display UF current_product facts unless evidence directly states product use", () => {
    const universalCaptureWithInvalidUsage: UniversalCaptureEnvelope = {
      capture_id: "capture-invalid-product-use",
      fact_ids: ["fact-invalid-use", "fact-interest"],
      universal: {
        model: "universal-surgical-rules-v1",
        extracted_at: "2026-06-24T19:07:00Z",
        extraction_ms: 1,
        declared_source_type: "observation_case",
        raw_note: "Asked about ACSIS and compared ACSIS to current setup.",
        shadow_mode: true,
        facts: [
          {
            concept: "current_product",
            normalized_label: "Current product: ACSIS",
            assertion_level: "observed",
            source_type: "observation_case",
            evidence_text: "Asked about ACSIS and compared ACSIS to current setup.",
            confidence: "high",
            negated: false,
            uncertain: false,
            product_mentioned: "ACSIS",
          },
          {
            concept: "product_interest",
            normalized_label: "Product interest: ACSIS",
            assertion_level: "provider_reported",
            source_type: "observation_case",
            evidence_text: "Asked about ACSIS and compared ACSIS to current setup.",
            confidence: "high",
            negated: false,
            uncertain: false,
            product_mentioned: "ACSIS",
          },
        ],
        suppressed_facts: [],
      },
    };

    const result = resolveObservationCaptureFeedback({
      caseId: "case-1",
      noteBody: "Asked about ACSIS and compared ACSIS to current setup.",
      universalCapture: universalCaptureWithInvalidUsage,
      readModelEnabled: true,
    });

    expect(result?.status).toBe("chips");
    if (result?.status !== "chips") return;
    const text = result.items.map((item) => item.text).join("\n");
    expect(text).toMatch(/ACSIS interest/i);
    expect(text).not.toMatch(/ACSIS was used/i);
  });
});
