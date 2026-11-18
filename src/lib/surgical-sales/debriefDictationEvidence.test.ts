import { describe, expect, it } from "vitest";
import {
  formatIntelligenceUpdateLine,
  buildRepFriendlySuggestedUpdates,
} from "@/lib/surgical-sales/debriefRepFriendlyReview";
import {
  quoteIsAnchoredInDictation,
  resolveDictationEvidenceQuote,
  resolveIntelligenceItemDictationEvidence,
} from "@/lib/surgical-sales/debriefDictationEvidence";
import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefIntelligenceUpdateItem } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

const CREDENTIALING_DICTATION =
  "Vendor credentialing has to be completed first and sometimes takes several weeks before we can schedule observation.";

describe("debriefDictationEvidence", () => {
  it("anchors AI source quotes in original dictation", () => {
    const quote = "Vendor credentialing has to be completed first and sometimes takes several weeks.";
    expect(quoteIsAnchoredInDictation(quote, CREDENTIALING_DICTATION)).toBe(true);
    expect(
      resolveDictationEvidenceQuote({
        dictation: CREDENTIALING_DICTATION,
        candidates: [quote],
        hintText: "credentialing required before observation",
      }),
    ).toBe(`"${quote}"`);
  });

  it("finds best matching sentence when only paraphrase candidates exist", () => {
    const evidence = resolveDictationEvidenceQuote({
      dictation: CREDENTIALING_DICTATION,
      candidates: ["Credentialing is required before observation"],
      hintText: "vendor credentialing observation scheduling",
    });
    expect(evidence).toMatch(/Vendor credentialing has to be completed first/i);
  });

  it("formats update line as rep-friendly destination", () => {
    expect(
      formatIntelligenceUpdateLine("access_intelligence", "provider_credentialing_required", "Credentialing Required"),
    ).toBe("Observation readiness");
  });
});

describe("buildRepFriendlySuggestedUpdates evidence requirement", () => {
  it("omits intelligence updates without dictation evidence", () => {
    const review = {
      sourceText: CREDENTIALING_DICTATION,
      fieldUpdates: [
        {
          id: "ai-confirmed-0",
          label: "Credentialing Required",
          dbKey: "provider_credentialing_required",
          proposedValue: "Vendor credentialing is required before observation can be scheduled.",
          accepted: false,
          conflict: null,
          proposedScope: "provider",
          scopeReason: "",
          proposedDestination: "provider",
          destinationReason: "",
        },
      ],
      aiMapping: {
        summary: "",
        confidence: "high",
        reasoning: "",
        source_scope: "test",
        operational_signals: [],
        confirmed_updates: [
          {
            domain: "credentialing",
            label: "Credentialing Required",
            value: "Vendor credentialing is required before observation can be scheduled.",
            confidence: "high",
            save_target: "provider",
            reasoning:
              'Source quote: "Vendor credentialing has to be completed first and sometimes takes several weeks."',
          },
        ],
        partial_updates: [],
        still_to_validate: [],
        recommended_next_moves: [],
        do_not_update: [],
      },
    } as LogUpdateParseResult;

    const item: DebriefIntelligenceUpdateItem = {
      id: "ai-confirmed-0",
      field: review.fieldUpdates[0]!,
      extractedStatement: "Credentialing required",
      intelligenceFieldLabel: "Credentialing Required",
      proposedValue: "Vendor credentialing is required before observation can be scheduled.",
      confidenceTier: "high_confidence",
      confidenceLabel: "High",
      sourceQuote: null,
      evidenceQuote:
        "Vendor credentialing has to be completed first and sometimes takes several weeks.",
      primaryCategory: "access_intelligence",
      secondaryCategories: [],
      signalKind: "confirmed_fact",
      category: "confirmed_fact",
      suggestedUpdate: "Credentialing required",
      requiresRepConfirmation: false,
      discoverySignalId: null,
      hasConflict: false,
    };

    const extraction = {
      summary: null,
      intelligenceUpdates: [item],
      unresolvedItems: [],
      platformMatches: [],
    } as DebriefIntelligenceExtractionReview;

    expect(resolveIntelligenceItemDictationEvidence({ item, review })).toMatch(
      /Vendor credentialing has to be completed first/i,
    );

    const groups = buildRepFriendlySuggestedUpdates({
      extraction,
      review,
      proposedContacts: [],
      includeItemIds: new Set(["ai-confirmed-0"]),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]!.updates[0]!.evidenceQuote).toMatch(
      /Vendor credentialing has to be completed first/i,
    );
    expect(groups[0]!.updates[0]!.updateLine).toBe("Observation readiness");
  });
});
