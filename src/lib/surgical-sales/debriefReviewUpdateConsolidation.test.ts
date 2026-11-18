import { describe, expect, it } from "vitest";

import {
  buildDebriefActionableReviewCards,
  buildReviewUpdateItemsForExtraction,
} from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewSections } from "@/lib/surgical-sales/buildDebriefReviewSections";
import { buildRepFriendlySuggestedUpdates } from "@/lib/surgical-sales/debriefRepFriendlyReview";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import { isContactCandidateReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

const JENNIFER_DICTATION =
  "Jennifer in his office usually handles scheduling coordination. I don't have her contact information yet.";

function runJenniferScenario() {
  const facts: DebriefAtomicFact[] = [
    {
      fact_type: "workflow_contact",
      entity: "Jennifer",
      attribute: "role",
      value: "Scheduling Coordinator",
      confidence: "medium",
      evidence: "Jennifer in his office usually handles scheduling coordination.",
    },
  ];

  const parse = buildParseResultFromDebriefFacts({
    sourceText: JENNIFER_DICTATION,
    facts,
    context: { providerId: "provider-test", writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS] },
    existingFields: {},
    mappingSource: "openai",
  });

  const proposedContacts = buildInitialProposedContacts({
    review: parse,
    sourceReference: "test",
  });

  const extraction = buildDebriefIntelligenceExtractionReview({
    review: parse,
    proposedContacts,
    sourceReference: "test",
  });

  const items = buildReviewUpdateItemsForExtraction({
    extraction,
    dictation: JENNIFER_DICTATION,
    proposedContacts,
  });

  const cards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts,
    dictation: JENNIFER_DICTATION,
  });

  return { parse, extraction, proposedContacts, items, cards };
}

describe("Review Updates consolidation", () => {
  it("Jennifer scheduling fact yields one contact card and one follow-up task at most", () => {
    const { items, cards, extraction, parse, proposedContacts } = runJenniferScenario();

    const contactItems = items.filter((i) => i.type === "contact_candidate");
    const followUpItems = items.filter((i) => i.type === "follow_up_task");

    expect(contactItems).toHaveLength(1);
    expect(contactItems[0]?.displayName).toBe("Jennifer");
    expect(contactItems[0]?.roleValue).toMatch(/schedul/i);
    expect(contactItems[0]?.confidence).toBe("Medium");
    expect(contactItems[0]?.contactDetailsMissing).toBe(true);

    expect(followUpItems).toHaveLength(1);
    expect(followUpItems[0]?.taskTitle).toMatch(/get jennifer's phone or email/i);

    expect(items.filter((i) => i.type === "observation_access")).toHaveLength(0);
    expect(items.some((i) => i.type === "credentialing")).toBe(false);

    const contactCards = cards.filter((c) => c.category === "workflow_participant");
    const followUpCards = cards.filter((c) => c.category === "follow_up_task");

    expect(contactCards).toHaveLength(1);
    expect(followUpCards).toHaveLength(1);
    expect(cards.filter((c) => c.category === "observation_access")).toHaveLength(0);

    const jenniferContact = contactCards[0];
    expect(isContactCandidateReviewCard(jenniferContact!)).toBe(true);
    expect(jenniferContact!.confidence).toBe("Medium");
    expect(jenniferContact!.roleValue).toMatch(/schedul/i);
    expect(
      jenniferContact!.fields.some(
        (f) => f.label === "Contact Info" && f.value === "Contact details still being learned",
      ),
    ).toBe(
      true,
    );

    const cardCopy = cards
      .flatMap((c) => [c.headline, ...c.fields.map((f) => f.value), ...c.evidenceQuotes])
      .join(" ");
    expect(cardCopy).not.toMatch(/\bMissing\b/i);
    expect(cardCopy).not.toMatch(/\bNot captured\b/i);
    expect(cardCopy).not.toMatch(/handles scheduling\./i);
    expect(cardCopy).not.toMatch(/workflow intelligence/i);

    expect(buildDebriefReviewSections(extraction).intelligenceCaptured).toHaveLength(0);
    expect(
      buildRepFriendlySuggestedUpdates({
        extraction,
        review: parse,
        proposedContacts,
      }),
    ).toHaveLength(0);

    const confidences = new Set(
      cards.filter((c) => c.confidence).map((c) => c.confidence as string),
    );
    expect(confidences.has("High")).toBe(false);
    expect([...confidences].every((c) => c === "Medium")).toBe(true);
  });

  it("does not render CRM field updates as separate review cards", () => {
    const { cards, parse } = runJenniferScenario();
    expect(parse.fieldUpdates.some((f) => f.dbKey === "provider_scheduling_contact")).toBe(true);
    expect(cards.some((c) => /provider office scheduling contact/i.test(c.headline))).toBe(false);
    expect(cards.some((c) => c.linkedFieldUpdateIds.length > 0)).toBe(true);
  });
});
