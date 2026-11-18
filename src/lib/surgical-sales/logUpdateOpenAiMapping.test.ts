import { describe, expect, it } from "vitest";
import {
  LogUpdateOpenAiMappingSchema,
  confirmedUpdateToFieldRow,
  partialUpdateToFieldRow,
  buildIntelligenceReviewFromMapping,
  normalizeLogUpdateOpenAiPayload,
} from "./logUpdateOpenAiMapping";

describe("logUpdateOpenAiMapping", () => {
  const sampleMapping = {
    summary: "Scheduler approves observations after vendor credentialing clears.",
    confidence: "high" as const,
    reasoning: "Note describes access pathway end-to-end.",
    source_scope: "provider_visit",
    operational_signals: [],
    confirmed_updates: [
      {
        domain: "or_access" as const,
        label: "OR access path",
        value: "Vendor credentialing then scheduler approval",
        confidence: "high" as const,
        save_target: "organization" as const,
        reasoning: "Note states the full access pathway.",
      },
    ],
    partial_updates: [
      {
        domain: "credentialing" as const,
        label: "Credentialing turnaround",
        value: "Pending vendor clearance",
        still_needs: ["How many weeks to clear"],
        confidence: "medium" as const,
        save_target: "organization" as const,
        reasoning: "Status mentioned but timeline not stated.",
      },
    ],
    still_to_validate: [
      {
        domain: "scheduling" as const,
        question: "Who is the named scheduler contact?",
        priority: "high" as const,
      },
    ],
    recommended_next_moves: [
      {
        action: "Confirm credentialing timeline with coordinator",
        owner_type: "rep" as const,
        priority: "high" as const,
      },
    ],
    do_not_update: [],
  };

  it("validates required JSON shape", () => {
    const parsed = LogUpdateOpenAiMappingSchema.safeParse(sampleMapping);
    expect(parsed.success).toBe(true);
  });

  it("maps confirmed updates to provider field rows", () => {
    const update = {
      ...sampleMapping.confirmed_updates[0],
      target: "organization" as const,
      reason: sampleMapping.confirmed_updates[0].reasoning,
    };
    const row = confirmedUpdateToFieldRow(update, 0, {}, new Set(["provider_observation_access_path"]));
    expect(row?.dbKey).toBe("provider_observation_access_path");
    expect(row?.accepted).toBe(true);
  });

  it("preselects partial updates at medium confidence", () => {
    const update = {
      ...sampleMapping.partial_updates[0],
      target: "organization" as const,
      reason: sampleMapping.partial_updates[0].reasoning,
    };
    const row = partialUpdateToFieldRow(update, 0, {}, new Set(["provider_credentialing_notes"]));
    if (row) {
      expect(row.accepted).toBe(true);
    }
  });

  it("coerces domain aliases from model output", () => {
    const coerced = normalizeLogUpdateOpenAiPayload(
      {
        summary: "Learned access path",
        confirmed_updates: [
          {
            domain: "OR Access",
            label: "Path",
            value: "Vendor credentialing",
            confidence: "HIGH",
            save_target: "organization",
            reasoning: "Stated in note",
          },
        ],
      },
      "Vendor credentialing required",
    );
    const parsed = LogUpdateOpenAiMappingSchema.safeParse(coerced);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.confirmed_updates[0]?.domain).toBe("or_access");
      expect(parsed.data.confirmed_updates[0]?.confidence).toBe("high");
    }
  });

  it("builds intelligence review from mapping", () => {
    const review = buildIntelligenceReviewFromMapping(sampleMapping);
    expect(review.summary).toBe(sampleMapping.summary);
    expect(review.partiallyConfirmed).toHaveLength(1);
    expect(review.suggestedNextActions ?? []).toHaveLength(1);
  });
});
