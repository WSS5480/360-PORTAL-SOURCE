import { describe, expect, it } from "vitest";

import { buildProposedContactFromExtraction } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  combineContactRoleValues,
  dedupeClinicalInsights,
  dedupeDebriefActionableReviewCards,
  dedupeFollowUpTasks,
  dedupeProposedContactsForReview,
  mergeEvidenceQuotes,
  personMergeKey,
} from "@/lib/surgical-sales/debriefReviewIntelligenceDedup";
import { normalizeContactCandidateCard } from "@/lib/surgical-sales/debriefActionableReviewCardNormalize";
import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

describe("debriefReviewIntelligenceDedup", () => {
  it("merges multiple Jennifer mentions into one participant with aggregated evidence and role", () => {
    const dictation =
      "He mentioned Jennifer in his office. Jennifer is involved in scheduling. Jennifer handles scheduling coordination.";
    const contacts = [
      buildProposedContactFromExtraction({
        name: "Jennifer",
        quote: "He mentioned Jennifer in his office",
        sourceReference: "debrief",
        debriefText: dictation,
        index: 0,
      }),
      buildProposedContactFromExtraction({
        name: "Jennifer",
        quote: "Jennifer is involved in scheduling",
        sourceReference: "debrief",
        debriefText: dictation,
        index: 1,
      }),
      buildProposedContactFromExtraction({
        name: "Jennifer",
        quote: "Jennifer handles scheduling coordination",
        sourceReference: "debrief",
        debriefText: dictation,
        index: 2,
      }),
    ];

    const merged = dedupeProposedContactsForReview(contacts, dictation);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.primaryContact.displayName).toBe("Jennifer");
    expect(merged[0]!.role).toMatch(/schedul/i);
    expect(merged[0]!.evidenceQuotes.length).toBe(3);
    expect(personMergeKey("Jennifer")).toBe(personMergeKey("jennifer"));
  });

  it("merges related clinical fact keys into one insight group", () => {
    const insights = dedupeClinicalInsights({
      facts: [
        {
          fact_key: "clinical_robotic_ventral_hernia",
          evidence_quote: "doing more robotic ventral hernia repairs",
          confidence: "Medium",
        },
        {
          fact_key: "clinical_robotic_ventral_hernia_increasing",
          evidence_quote: "volume has been increasing lately",
          confidence: "High",
        },
      ],
    });

    expect(insights).toHaveLength(1);
    expect(insights[0]!.headline).toMatch(/Robotic Ventral Hernia Repairs Increasing/i);
    expect(insights[0]!.evidenceQuotes.length).toBe(2);
    expect(insights[0]!.confidence).toBe("High");
  });

  it("collapses semantically similar follow-up tasks", () => {
    const tasks = dedupeFollowUpTasks([
      { text: "Get Jennifer's phone or email." },
      { text: "Identify Jennifer's contact information." },
      { text: "Confirm which credentialing platform is required." },
      { text: "Confirm credentialing pathway." },
    ]);

    expect(tasks.some((t) => /jennifer/i.test(t.headline))).toBe(true);
    expect(tasks.filter((t) => /jennifer/i.test(t.headline))).toHaveLength(1);
    expect(tasks.filter((t) => /credential|platform|pathway/i.test(t.headline)).length).toBeLessThanOrEqual(2);
  });

  it("dedupeDebriefActionableReviewCards prevents duplicate cards", () => {
    const cards: DebriefActionableReviewCard[] = [
      normalizeContactCandidateCard({
        id: "a",
        category: "workflow_participant",
        headline: "Jennifer",
        displayName: "Jennifer",
        contactId: "a",
        fields: [{ label: "Possible Role", value: "Workflow Participant" }],
        evidenceQuotes: ['"mentioned Jennifer"'],
        confidence: "Medium",
        actions: [],
        linkedFieldUpdateIds: [],
        linkedIntelligenceIds: [],
      }),
      normalizeContactCandidateCard({
        id: "b",
        category: "workflow_participant",
        headline: "Jennifer",
        displayName: "Jennifer",
        contactId: "b",
        fields: [{ label: "Role", value: "Scheduling Coordinator" }],
        evidenceQuotes: ['"handles scheduling"'],
        confidence: "High",
        actions: [],
        linkedFieldUpdateIds: [],
        linkedIntelligenceIds: [],
      }),
      {
        id: "c1",
        category: "clinical_focus",
        headline: "Robotic Ventral Hernia Repairs Increasing",
        insightTitle: "Robotic Ventral Hernia Repairs Increasing",
        fields: [],
        evidenceQuotes: ['"ventral hernia"'],
        actions: [],
        linkedFieldUpdateIds: [],
        linkedIntelligenceIds: [],
      },
      {
        id: "c2",
        category: "clinical_focus",
        headline: "Robotic Ventral Hernia Cases Discussed",
        insightTitle: "Robotic Ventral Hernia Cases Discussed",
        fields: [],
        evidenceQuotes: ['"robotic ventral"'],
        actions: [],
        linkedFieldUpdateIds: [],
        linkedIntelligenceIds: [],
      },
    ];

    const deduped = dedupeDebriefActionableReviewCards(cards);
    expect(deduped.filter((c) => c.category === "workflow_participant")).toHaveLength(1);
    expect(deduped.find((c) => c.category === "workflow_participant")?.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Role", value: "Scheduling Coordinator" })]),
    );
    expect(
      mergeEvidenceQuotes(deduped.map((c) => c.evidenceQuotes)).length,
    ).toBeGreaterThanOrEqual(2);
    expect(deduped.filter((c) => c.category === "clinical_focus")).toHaveLength(1);
  });

  it("merges duplicate person cards into one contact with combined roles (Lisa regression)", () => {
    const cards: DebriefActionableReviewCard[] = [
      normalizeContactCandidateCard({
        id: "lisa-1",
        category: "workflow_participant",
        headline: "Lisa",
        displayName: "Lisa",
        contactId: "lisa-1",
        roleLabel: "Possible Role",
        roleValue: "Scheduling Team",
        fields: [{ label: "Possible Role", value: "Scheduling Team" }],
        evidenceQuotes: ['"Lisa handles the scheduling"'],
        confidence: "Medium",
        actions: [],
        linkedFieldUpdateIds: [],
        linkedIntelligenceIds: [],
      }),
      normalizeContactCandidateCard({
        id: "lisa-2",
        category: "workflow_participant",
        headline: "Lisa",
        displayName: "Lisa",
        contactId: "lisa-2",
        roleLabel: "Role",
        roleValue: "Office Manager",
        fields: [{ label: "Role", value: "Office Manager" }],
        evidenceQuotes: ['"Lisa is the office manager"'],
        confidence: "High",
        actions: [],
        linkedFieldUpdateIds: [],
        linkedIntelligenceIds: [],
      }),
    ];

    const deduped = dedupeDebriefActionableReviewCards(cards);
    const people = deduped.filter((c) => c.category === "workflow_participant");
    expect(people).toHaveLength(1);
    const lisa = people[0]!;
    expect(lisa.displayName).toBe("Lisa");
    expect(lisa.roleValue).toBe("Office Manager, Scheduling Coordinator");
    expect(
      lisa.fields.filter((f) => f.label === "Role" || f.label === "Possible Role"),
    ).toEqual([{ label: "Role", value: "Office Manager, Scheduling Coordinator" }]);
  });

  it("combineContactRoleValues normalizes scheduling variants and drops placeholders", () => {
    expect(combineContactRoleValues(["Scheduling Team", "Office Manager"])).toBe(
      "Office Manager, Scheduling Coordinator",
    );
    expect(
      combineContactRoleValues(["Workflow Participant", "Scheduling Coordinator"]),
    ).toBe("Scheduling Coordinator");
    expect(combineContactRoleValues(["Workflow Participant"])).toBe("Workflow Participant");
    expect(combineContactRoleValues([undefined, "", null])).toBeNull();
    expect(combineContactRoleValues(["Office Manager", "office manager"])).toBe("Office Manager");
  });
});
