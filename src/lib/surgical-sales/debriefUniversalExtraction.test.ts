import { describe, expect, it } from "vitest";
import {
  buildFieldUniversalExtractedItem,
  canAutoApplyExtractedItem,
  classifyExtractionSignalKind,
  requiresRepConfirmationForExtraction,
} from "@/lib/surgical-sales/debriefUniversalExtraction";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";

function fieldRow(overrides: Partial<LogUpdateRoutedFieldUpdate> = {}): LogUpdateRoutedFieldUpdate {
  return {
    id: "ai-confirmed-0",
    label: "Product interest",
    dbKey: "provider_preference_card_signals",
    proposedValue: "Interested in ACSIS but fit not validated yet",
    accepted: false,
    conflict: null,
    proposedScope: "provider",
    scopeReason: "",
    proposedDestination: "provider",
    destinationReason: "",
    ...overrides,
  };
}

function baseReview(overrides: Partial<LogUpdateParseResult> = {}): LogUpdateParseResult {
  return {
    sourceText: "He seemed interested in ACSIS but I still need to see a case.",
    suggestedUpdates: [],
    fieldUpdates: [fieldRow()],
    intelligenceReview: {
      confirmedUpdates: [],
      partiallyConfirmed: [],
      stillWorthConfirming: [],
      relatedOperationalAreas: [],
    },
    stillMissing: [],
    saveAsNoteAccepted: true,
    usesProviderIntelligence: true,
    aiMapping: {
      summary: "",
      confidence: "medium",
      reasoning: "",
      source_scope: "engagement:test",
      operational_signals: [],
      confirmed_updates: [
        {
          domain: "product_fit",
          label: "Product interest",
          value: "Interested in ACSIS but fit not validated yet",
          confidence: "medium",
          save_target: "provider",
          reasoning: 'Source quote: "interested in ACSIS"',
        },
      ],
      partial_updates: [],
      still_to_validate: [],
      recommended_next_moves: [],
      do_not_update: [],
    },
    mappingSource: "openai",
    ...overrides,
  };
}

describe("debriefUniversalExtraction", () => {
  it("classifies signal kinds separately from intelligence categories", () => {
    expect(
      classifyExtractionSignalKind({
        domain: "product_fit",
        label: "Product interest",
        value: "Interested in ACSIS",
        evidence: "seemed interested in ACSIS",
        confidence: "medium",
      }),
    ).toBe("product_interest");

    expect(
      classifyExtractionSignalKind({
        domain: "or_access",
        label: "Observation access",
        value: "Not opposed to observation",
        evidence: "didn't shut down the observation idea",
        confidence: "high",
      }),
    ).toBe("interest_signal");

    expect(
      classifyExtractionSignalKind({
        domain: "or_access",
        label: "Observation approval",
        value: "Observation approved for next month",
        evidence: "She approved observation yesterday",
        confidence: "high",
      }),
    ).toBe("approval_signal");
  });

  it("classifies pain points as signal kind pain_point with workflow intelligence category", () => {
    const item = buildFieldUniversalExtractedItem(
      fieldRow({
        label: "Workflow pain",
        proposedValue: "Frustrations with visualization during cases",
        dbKey: "provider_workflow_pain_points",
      }),
      baseReview({
        fieldUpdates: [
          fieldRow({
            label: "Workflow pain",
            proposedValue: "Frustrations with visualization during cases",
            dbKey: "provider_workflow_pain_points",
          }),
        ],
        aiMapping: {
          ...baseReview().aiMapping!,
          confirmed_updates: [
            {
              domain: "workflow",
              label: "Workflow pain",
              value: "Frustrations with visualization during cases",
              confidence: "medium",
              save_target: "provider",
              reasoning: "",
            },
          ],
        },
      }),
    );
    expect(item.signalKind).toBe("pain_point");
    expect(item.primaryCategory).toBe("workflow_intelligence");
  });

  it("classifies next steps vs completed actions", () => {
    expect(
      classifyExtractionSignalKind({
        domain: "scheduling",
        label: "Follow-up",
        value: "Need to get her contact info",
        confidence: "medium",
      }),
    ).toBe("next_step");

    expect(
      classifyExtractionSignalKind({
        domain: "scheduling",
        label: "Completed",
        value: "Already scheduled the observation",
        confidence: "high",
      }),
    ).toBe("completed_action");
  });

  it("requires rep confirmation for low confidence and does not auto-apply", () => {
    expect(requiresRepConfirmationForExtraction({ confidence: "low", signalKind: "confirmed_fact" })).toBe(
      true,
    );
    expect(
      canAutoApplyExtractedItem({
        confidence: "low",
        requiresRepConfirmation: true,
        signalKind: "confirmed_fact",
      }),
    ).toBe(false);
    expect(
      canAutoApplyExtractedItem({
        confidence: "high",
        requiresRepConfirmation: false,
        signalKind: "confirmed_fact",
      }),
    ).toBe(true);
    expect(
      canAutoApplyExtractedItem({
        confidence: "medium",
        requiresRepConfirmation: false,
        signalKind: "confirmed_fact",
      }),
    ).toBe(true);
  });

  it("builds field items with intelligence categories and evidence", () => {
    const item = buildFieldUniversalExtractedItem(fieldRow(), baseReview());
    expect(item.evidenceQuote.length).toBeGreaterThan(0);
    expect(item.suggestedUpdate.length).toBeGreaterThan(0);
    expect(item.primaryCategory).toBe("product_fit_signals");
    expect(item.confidence).toBe("medium");
    expect(item.requiresRepConfirmation).toBe(true);
  });
});
