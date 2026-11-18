import { describe, expect, it } from "vitest";
import { buildStructuredEvidenceForTopic } from "@/lib/surgical-sales/debriefReviewStructuredEvidence";
import {
  buildOperationalSignalsFromDebriefText,
  buildProviderOperationalState,
  mapDebriefNarrativeToOperationalSignals,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";

const VAGUE_SCHEDULING =
  "Karen came up a few times and seems to help with timing. Surgeon did not seem opposed to observation.";

describe("debriefReviewStructuredEvidence", () => {
  it("builds concise source, confidence, and reasoning for scheduling topic", () => {
    const { parse } = buildOperationalSignalsFromDebriefText({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });
    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
      parse,
    });
    const schedulingSignals = signals.filter((s) => s.domain === "scheduling_ownership");
    const state = buildProviderOperationalState({
      providerId: "p1",
      contact: {},
      gateInput: { contact: {} },
    });
    const fieldIds = parse.fieldUpdates
      .filter((f) => /scheduling/i.test(f.dbKey))
      .map((f) => f.id);

    const evidence = buildStructuredEvidenceForTopic({
      topicId: "scheduling",
      signals: schedulingSignals,
      parse,
      fieldUpdateIds: fieldIds,
      narrative: VAGUE_SCHEDULING,
    });

    expect(evidence.sourceQuote).toMatch(/Karen/i);
    expect(evidence.sourceQuote!.length).toBeLessThan(180);
    expect(evidence.confidenceLabel).toBe("Medium");
    expect(evidence.reasoning).toMatch(/authority is not confirmed/i);
    expect(evidence.reasoning!.length).toBeLessThan(180);
  });
});
