import { describe, expect, it } from "vitest";
import { ANDY_KAREN_DEBRIEF_REGRESSION_NOTE } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import {
  classifyDebriefIntelligenceCategories,
  debriefExplicitProductFitConnection,
  DEBRIEF_INTELLIGENCE_CATEGORIES,
  resolveProductFitSignalConfidence,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";
import {
  buildFieldUniversalExtractedItem,
  classifyExtractionSignalKind,
} from "@/lib/surgical-sales/debriefUniversalExtraction";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";

describe("debriefIntelligenceCategories", () => {
  it("defines eight normalized categories", () => {
    expect(DEBRIEF_INTELLIGENCE_CATEGORIES).toHaveLength(8);
  });

  it("maps observation interest to access primary and relationship secondary", () => {
    const { primaryCategory, secondaryCategories } = classifyDebriefIntelligenceCategories({
      domain: "or_access",
      label: "Observation access",
      value: "Not opposed to observation",
      evidence: "didn't shut down the observation idea",
      signalKind: "interest_signal",
    });
    expect(primaryCategory).toBe("access_intelligence");
    expect(secondaryCategories).toContain("relationship_intelligence");
  });

  it("maps Karen scheduling partial to people primary and access secondary", () => {
    const { primaryCategory, secondaryCategories } = classifyDebriefIntelligenceCategories({
      domain: "scheduling",
      label: "Scheduling owner",
      value: "Karen handles scheduling",
      evidence: ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
      signalKind: "inferred_signal",
      isContact: true,
      mentionLevel: "workflow_participant",
      schedulingContact: true,
    });
    expect(primaryCategory).toBe("people_contacts");
    expect(secondaryCategories).toContain("access_intelligence");
  });

  it("maps product interest to product_fit_signals", () => {
    const { primaryCategory } = classifyDebriefIntelligenceCategories({
      domain: "product_fit",
      label: "Product interest",
      value: "Interested in ACSIS",
      signalKind: "product_interest",
    });
    expect(primaryCategory).toBe("product_fit_signals");
  });

  it("maps unresolved questions to next_steps", () => {
    const { primaryCategory } = classifyDebriefIntelligenceCategories({
      domain: "next_steps",
      label: "Unresolved",
      value: "Who officially approves observation access?",
      signalKind: "unknown",
    });
    expect(primaryCategory).toBe("next_steps");
  });

  describe("product-fit overreach guardrails", () => {
    it("keeps vague workflow friction in workflow_intelligence only", () => {
      const note = "Turnover delays are frustrating";
      expect(debriefExplicitProductFitConnection(note)).toBe(false);
      expect(classifyExtractionSignalKind({ label: "OR friction", value: note })).toBe("pain_point");

      const { primaryCategory, secondaryCategories } = classifyDebriefIntelligenceCategories({
        domain: "workflow",
        label: "OR friction",
        value: note,
        signalKind: "pain_point",
      });
      expect(primaryCategory).toBe("workflow_intelligence");
      expect(secondaryCategories).not.toContain("product_fit_signals");
    });

    it("classifies implied product linkage as product_fit with medium confidence", () => {
      const note = "Turnover delays could be helped by our setup";
      expect(debriefExplicitProductFitConnection(note)).toBe(true);
      expect(classifyExtractionSignalKind({ label: "Product fit", value: note, domain: "product_fit" })).toBe(
        "product_interest",
      );
      expect(resolveProductFitSignalConfidence(note)).toBe("medium");

      const { primaryCategory } = classifyDebriefIntelligenceCategories({
        domain: "product_fit",
        label: "Product fit",
        value: note,
        signalKind: "product_interest",
      });
      expect(primaryCategory).toBe("product_fit_signals");
    });

    it("classifies direct product inquiry as product_fit with high confidence", () => {
      const note = "He asked about ACSIS";
      expect(debriefExplicitProductFitConnection(note)).toBe(true);
      expect(resolveProductFitSignalConfidence(note)).toBe("high");

      const { primaryCategory } = classifyDebriefIntelligenceCategories({
        domain: "product_fit",
        label: "Product interest",
        value: note,
        signalKind: "product_interest",
      });
      expect(primaryCategory).toBe("product_fit_signals");
    });

    it("downgrades AI product_fit domain when dictation is workflow-only", () => {
      const { primaryCategory } = classifyDebriefIntelligenceCategories({
        domain: "product_fit",
        label: "Workflow pain",
        value: "Turnover delays are frustrating",
        signalKind: "pain_point",
      });
      expect(primaryCategory).toBe("workflow_intelligence");
    });
  });
});

describe("debriefUniversalExtraction category fields", () => {
  it("includes primary and secondary categories on field items", () => {
    const field: LogUpdateRoutedFieldUpdate = {
      id: "ai-confirmed-0",
      label: "Product interest",
      dbKey: "provider_preference_card_signals",
      proposedValue: "Interested in ACSIS",
      accepted: false,
      conflict: null,
      proposedScope: "provider",
      scopeReason: "",
      proposedDestination: "provider",
      destinationReason: "",
    };
    const review: LogUpdateParseResult = {
      sourceText: "interested in ACSIS",
      suggestedUpdates: [],
      fieldUpdates: [field],
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
        source_scope: "test",
        operational_signals: [],
        confirmed_updates: [
          {
            domain: "product_fit",
            label: "Product interest",
            value: "Interested in ACSIS",
            confidence: "medium",
            save_target: "provider",
            reasoning: "",
          },
        ],
        partial_updates: [],
        still_to_validate: [],
        recommended_next_moves: [],
        do_not_update: [],
      },
      mappingSource: "openai",
    };

    const item = buildFieldUniversalExtractedItem(field, review);
    expect(item.primaryCategory).toBe("product_fit_signals");
    expect(item.signalKind).toBe(classifyExtractionSignalKind({
      domain: "product_fit",
      label: field.label,
      value: field.proposedValue,
      confidence: "medium",
    }));
  });
});
