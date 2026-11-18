import { describe, expect, it } from "vitest";

import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import {
  buildDebriefActionableReviewCards,
  DEBRIEF_REVIEW_CATEGORY_LABELS,
} from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import { isContactCandidateReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

describe("buildDebriefActionableReviewCards", () => {
  it("Tom Sandy intro call — typed cards per entity, no Learned prose", () => {
    const result = runDebriefExtractionPipeline({ dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION });
    const cards = buildDebriefActionableReviewCards({
      extraction: result.extraction,
      proposedContacts: result.proposedContacts,
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    });

    expect(cards.length).toBeGreaterThan(0);

    const categories = new Set(cards.map((c) => c.category));
    expect(categories.has("workflow_participant")).toBe(true);
    expect(categories.has("observation_access")).toBe(true);
    expect(categories.has("clinical_focus")).toBe(true);
    expect(categories.has("follow_up_task")).toBe(true);

    const jennifer = cards.find(
      (c) => c.category === "workflow_participant" && /jennifer/i.test(c.displayName),
    );
    expect(jennifer).toBeTruthy();
    expect(isContactCandidateReviewCard(jennifer!)).toBe(true);
    expect(jennifer!.roleValue && /schedul/i.test(jennifer!.roleValue)).toBe(true);
    expect(jennifer!.evidenceQuotes.length).toBeGreaterThan(0);
    expect(jennifer!.actions.map((a) => a.label)).toEqual(
      expect.arrayContaining(["Review Contact", "Link Existing", "Dismiss"]),
    );

    const observation = cards.find((c) => c.category === "observation_access");
    expect(observation?.observationStatus).toMatch(/interested/i);
    expect(observation?.approval).toMatch(/not confirmed/i);
    expect(observation?.actions.some((a) => a.label === "Save Access Intelligence")).toBe(true);
    expect(observation?.evidenceQuotes.length).toBeGreaterThan(0);

    const clinical = cards.filter((c) => c.category === "clinical_focus");
    expect(clinical.length).toBeGreaterThan(0);
    expect(
      clinical.some(
        (c) =>
          /Clinical Trend|Increasing Procedure Volume|Increasing Case Volume/i.test(c.insightTitle) ||
          /Clinical Trend/i.test(c.clinicalCategoryLabel ?? ""),
      ),
    ).toBe(true);
    clinical.forEach((card) => {
      expect(card.evidenceQuotes.length).toBeGreaterThan(0);
      expect(card.actions.some((a) => a.label === "Add Clinical Insight")).toBe(true);
    });

    const followUps = cards.filter((c) => c.category === "follow_up_task");
    expect(followUps.length).toBeGreaterThan(0);
    expect(
      followUps.some(
        (c) => c.suggestedDue === "Next Touch" && c.actions.some((a) => a.label === "Create Task"),
      ),
    ).toBe(true);

    const copy = cards
      .flatMap((c) => {
        if (c.category === "workflow_participant") {
          return [c.displayName, c.roleValue ?? "", c.confidence, ...c.evidenceQuotes];
        }
        if (c.category === "observation_access") {
          return [c.observationStatus, c.approval, c.credentialing, ...c.evidenceQuotes];
        }
        if (c.category === "clinical_focus") {
          return [c.insightTitle, ...c.evidenceQuotes];
        }
        if (c.category === "follow_up_task") {
          return [c.taskTitle, c.followUpReason ?? "", c.suggestedDue ?? "", ...c.evidenceQuotes];
        }
        return [c.topicTitle, ...c.evidenceQuotes];
      })
      .join(" ");
    expect(copy).not.toMatch(/\bLearned\b/i);
    expect(copy).not.toMatch(/→|operational understanding|deployment gates/i);
    expect(copy).not.toMatch(/access summary|key takeaway|appears possible/i);

    for (const card of cards) {
      expect(DEBRIEF_REVIEW_CATEGORY_LABELS[card.category]).toBeTruthy();
      expect(card.actions.some((a) => a.type === "ignore")).toBe(true);
    }
  });

  it("same person with multiple role signals produces one contact card with combined roles (Lisa regression)", () => {
    const dictation =
      "I spoke with Lisa today. Lisa is the office manager there and Lisa also handles the scheduling for Dr. Field.";
    const atomicFacts: DebriefAtomicFact[] = [
      {
        fact_type: "workflow_contact",
        entity: "Lisa",
        attribute: "role",
        value: "Office Manager",
        confidence: "high",
        evidence: "Lisa is the office manager there",
      },
      {
        fact_type: "scheduling",
        entity: "Lisa",
        attribute: "scheduling role",
        value: "Scheduling Team",
        confidence: "medium",
        evidence: "Lisa also handles the scheduling for Dr. Field",
      },
    ];
    const extraction = {
      atomicFacts,
      fieldUpdates: [],
    } as unknown as DebriefIntelligenceExtractionReview;

    const cards = buildDebriefActionableReviewCards({
      extraction,
      proposedContacts: [],
      dictation,
    });

    const people = cards.filter(isContactCandidateReviewCard);
    expect(people).toHaveLength(1);
    const lisa = people[0]!;
    expect(lisa.displayName).toBe("Lisa");
    expect(lisa.roleValue).toBe("Office Manager, Scheduling Coordinator");
    expect(lisa.roleLabel).toBe("Role");
    expect(
      lisa.fields.filter((f) => f.label === "Role" || f.label === "Possible Role"),
    ).toHaveLength(1);
  });
});
