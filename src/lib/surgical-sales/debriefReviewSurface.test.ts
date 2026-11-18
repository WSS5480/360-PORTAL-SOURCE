import { describe, expect, it } from "vitest";
import { formatDebriefReviewFoundSummary, formatDebriefReviewFoundSummaryLegacy } from "./debriefApprovalUx";
import {
  buildDebriefFollowUpGroups,
  buildDebriefReviewContextLine,
  buildDebriefReviewSummaryCounts,
  intelligenceCardTitle,
  sanitizeDebriefUserCopy,
} from "./debriefReviewSurface";
import type { DebriefIntelligenceExtractionReview } from "./buildDebriefIntelligenceExtractionReview";

describe("debriefReviewSurface", () => {
  it("formats streamlined operational signal summary", () => {
    expect(
      formatDebriefReviewFoundSummary({
        signalsCount: 3,
        validationCount: 2,
        dependenciesCount: 1,
      }),
    ).toEqual({
      headline: "Fast operator review",
      detailLine:
        "3 operational signals identified · 2 require validation · 1 workflow dependency detected",
    });
  });

  it("formats legacy found summary lines", () => {
    expect(formatDebriefReviewFoundSummaryLegacy({ usableUpdates: 5, followUpItems: 4 })).toEqual({
      usableLine: "We found 5 usable updates",
      followUpLine: "4 follow-up items",
    });
  });

  it("builds context line from provider, org, and engagement type", () => {
    expect(
      buildDebriefReviewContextLine({
        providerLabel: "Andy Smith",
        organizationLabel: "Test2",
        engagementTypeLabel: "Intro Call",
      }),
    ).toBe("Andy Smith • Test2 • Intro Call");
  });

  it("strips system language from follow-up copy", () => {
    expect(sanitizeDebriefUserCopy("Partially mapped organization intelligence")).not.toMatch(
      /organization intelligence/i,
    );
  });

  it("strips maturity tokens from displayed values", () => {
    expect(sanitizeDebriefUserCopy("discussed_only|Verbal understanding — hernia flow")).not.toMatch(
      /discussed_only/i,
    );
    expect(sanitizeDebriefUserCopy("discussed_only|Verbal understanding — hernia flow")).toMatch(
      /live procedures/i,
    );
  });

  it("caps follow-up groups", () => {
    const groups = buildDebriefFollowUpGroups({
      unresolvedItems: [
        "Who officially approves observation access?",
        "Karen phone/email",
        "Credentialing workflow steps",
        "Workflow maturity suggestion: developing",
      ],
    });
    expect(groups.required.length).toBeLessThanOrEqual(2);
    expect(groups.helpful.length).toBeLessThanOrEqual(3);
    expect(groups.required[0]).toMatch(/approves vendor observation access/i);
  });

  it("summarizes usable updates and follow-up counts", () => {
    const extraction = {
      intelligenceUpdates: [{ id: "1" }, { id: "2" }],
      platformMatches: [{ id: "p1" }],
    } as DebriefIntelligenceExtractionReview;

    expect(
      buildDebriefReviewSummaryCounts({
        extraction,
        proposedContacts: [{ id: "c1", disposition: "pending" } as never],
        followUp: { required: ["Who approves?"], helpful: ["Karen email"] },
      }),
    ).toEqual({ usableUpdates: 4, followUpItems: 2 });
  });

  it("maps scheduling fields to friendly card titles", () => {
    expect(
      intelligenceCardTitle({
        intelligenceFieldLabel: "Scheduling owner",
      } as never),
    ).toBe("Scheduling contact found");
  });
});
