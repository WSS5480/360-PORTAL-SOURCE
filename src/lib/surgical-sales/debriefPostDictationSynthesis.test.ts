import { describe, expect, it } from "vitest";

import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import {
  buildDebriefExecutiveBriefing,
  buildWorkflowParticipants,
  sanitizeSalesLanguageCopy,
} from "@/lib/surgical-sales/debriefPostDictationSynthesis";
import {
  repIndicatesCredentialingPlatformUnknown,
  resolveCredentialingPlatformLabel,
} from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

describe("debriefPostDictationSynthesis", () => {
  it("treats hedged credentialing platform mentions as Unknown", () => {
    const dictation =
      "He thinks they use IntelliCentrics but could be wrong. Need to confirm the credentialing platform.";
    expect(repIndicatesCredentialingPlatformUnknown(dictation)).toBe(true);
    expect(resolveCredentialingPlatformLabel(dictation).label).toBe("Unknown");
  });

  it("does not invent a platform when the rep says unknown", () => {
    const dictation = "Credentialing platform is unknown. Vendor approval still required.";
    expect(resolveCredentialingPlatformLabel(dictation)).toEqual({
      label: "Unknown",
      confidence: "Medium",
      invented: false,
    });
  });

  it("preserves named scheduling coordinators in access synthesis", () => {
    const dictation =
      "Jennifer handles scheduling in the office. Observation seems possible after credentialing.";
    const review = { sourceText: dictation, aiMapping: { recommended_next_moves: [] } } as LogUpdateParseResult;
    const participants = buildWorkflowParticipants({ dictation, proposedContacts: [] });
    const briefing = buildDebriefExecutiveBriefing({ dictation, review, proposedContacts: [] });

    expect(participants.some((p) => /jennifer/i.test(p.name))).toBe(true);
    const copy = briefing.access.bodyLines.join("\n");
    expect(copy).toMatch(/jennifer/i);
    expect(copy).not.toMatch(/scheduling ownership identified/i);
  });

  it("builds an Access Summary in executive key takeaways", () => {
    const dictation =
      "Tom said observation is fine once credentialing clears. Karen handles scheduling.";
    const review = {
      sourceText: dictation,
      usesProviderIntelligence: false,
      fieldUpdates: [],
      intelligenceReview: { summary: null, stillWorthConfirming: [] },
    } as LogUpdateParseResult;
    const extraction = buildDebriefIntelligenceExtractionReview({ review });

    expect(extraction.executiveBriefing.keyTakeawayLines[0]).toMatch(/access summary/i);
    expect(extraction.organizedNarrative).toMatch(/access summary/i);
  });

  it("strips internal taxonomy tokens from sales copy", () => {
    expect(sanitizeSalesLanguageCopy("shared_workflow partially mapped operational signals")).not.toMatch(
      /shared_workflow|partially mapped|operational signals/i,
    );
  });
});
