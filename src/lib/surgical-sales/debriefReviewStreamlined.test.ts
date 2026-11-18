import { describe, expect, it } from "vitest";
import { ANDY_KAREN_DEBRIEF_REGRESSION_NOTE } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import {
  buildDebriefInsightGroups,
  buildKeyInsightLines,
  groupsNeedingAttention,
  shouldAutoAcceptFieldSilently,
  toConciseInsightText,
} from "./debriefReviewStreamlined";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

describe("debriefReviewStreamlined", () => {
  it("strips verbose partial-lead phrasing", () => {
    expect(
      toConciseInsightText(
        "[Partial lead] Provider did not shut down observation; access appears possible if routed through the right people.",
      ),
    ).toBe("Observation access appears possible.");
  });

  it("preserves named scheduling contacts in concise lines", () => {
    expect(
      toConciseInsightText(
        "Karen (provider office) appears to handle scheduling on the surgeon's side and works with OR scheduling.",
      ),
    ).toMatch(/Karen/i);
    expect(
      toConciseInsightText(
        "Karen (provider office) appears to handle scheduling on the surgeon's side and works with OR scheduling.",
      ),
    ).not.toMatch(/Scheduling ownership partially identified/i);
  });

  it("builds grouped key insights for Andy/Karen regression shape", () => {
    const extraction = {
      intelligenceUpdates: [
        {
          id: "ai-partial-0",
          discoverySignalId: "observation_approval",
          primaryCategory: "access_intelligence",
          secondaryCategories: ["relationship_intelligence"],
          signalKind: "interest_signal",
          field: { id: "ai-partial-0", dbKey: "observation_feasibility", accepted: true, proposedValue: "Provider did not shut down observation; access appears possible if routed through the right people." },
          proposedValue: "Provider did not shut down observation; access appears possible if routed through the right people.",
          intelligenceFieldLabel: "Observation access",
          confidenceTier: "needs_review",
          hasConflict: false,
        },
        {
          id: "ai-partial-1",
          discoverySignalId: "scheduling_owner",
          primaryCategory: "people_contacts",
          secondaryCategories: ["access_intelligence"],
          signalKind: "inferred_signal",
          field: { id: "ai-partial-1", dbKey: "provider_scheduling_contact", accepted: true, proposedValue: "Karen appears to handle scheduling." },
          proposedValue: "Karen appears to handle scheduling.",
          intelligenceFieldLabel: "Scheduling owner",
          confidenceTier: "needs_review",
          hasConflict: false,
        },
      ],
      platformMatches: [
        {
          id: "plat-1",
          mentionedName: "IntelliCentrics",
          matchedPlatformName: "IntelliCentrics",
          confidenceTier: "needs_review",
        },
      ],
      unresolvedItems: ["Who officially approves observation access?"],
    } as DebriefIntelligenceExtractionReview;

    const review = { usesProviderIntelligence: true, fieldUpdates: [], aiMapping: null } as LogUpdateParseResult;
    const groups = buildDebriefInsightGroups({
      extraction,
      review,
      proposedContacts: [
        {
          id: "c-karen",
          displayName: "Karen",
          disposition: "pending",
          contactDetailsMissing: true,
        } as never,
      ],
    });

    const lines = buildKeyInsightLines(groups);
    expect(lines.some((l) => /Observation access appears possible/i.test(l))).toBe(true);
    expect(lines.some((l) => /Karen/i.test(l))).toBe(true);
    expect(groupsNeedingAttention(groups).length).toBeGreaterThan(0);
  });

  it("pre-selects confirmed medium and high fields but not low", () => {
    const review = {
      usesProviderIntelligence: true,
      fieldUpdates: [
        {
          id: "ai-confirmed-0",
          label: "Scheduling",
          dbKey: "provider_scheduling_contact",
          proposedValue: "Jennifer handles scheduling coordination.",
          accepted: false,
          conflict: null,
          proposedScope: "provider",
          scopeReason: "",
          proposedDestination: "provider",
          destinationReason: "",
        },
        {
          id: "ai-confirmed-1",
          label: "Weak",
          dbKey: "provider_observation_feasibility",
          proposedValue: "Might be possible eventually.",
          accepted: false,
          conflict: null,
          proposedScope: "provider",
          scopeReason: "",
          proposedDestination: "provider",
          destinationReason: "",
        },
      ],
      aiMapping: {
        summary: "s",
        confidence: "high",
        reasoning: "r",
        source_scope: "visit",
        operational_signals: [],
        confirmed_updates: [
          {
            domain: "workflow",
            label: "Scheduling",
            value: "Jennifer handles scheduling coordination.",
            confidence: "medium",
            save_target: "provider",
            reasoning: 'Source quote: "Jennifer handles scheduling coordination."',
          },
          {
            domain: "or_access",
            label: "Weak",
            value: "Might be possible eventually.",
            confidence: "low",
            save_target: "provider",
            reasoning: "weak",
          },
        ],
        partial_updates: [],
        still_to_validate: [],
        recommended_next_moves: [],
        do_not_update: [],
      },
      mappingSource: "openai",
    } as LogUpdateParseResult;

    expect(shouldAutoAcceptFieldSilently(review.fieldUpdates[0]!, review)).toBe(true);
    expect(shouldAutoAcceptFieldSilently(review.fieldUpdates[1]!, review)).toBe(false);
  });

  it("does not echo raw debrief paragraphs in concise lines", () => {
    const snippet = ANDY_KAREN_DEBRIEF_REGRESSION_NOTE.slice(0, 120);
    const concise = toConciseInsightText(snippet, 200);
    expect(concise.length).toBeLessThan(200);
    expect(concise).not.toMatch(/from your note/i);
  });
});
