import { describe, expect, it } from "vitest";

import {
  ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
} from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";

import {
  classifyPersonMentionFromDebrief,
  contactLeadEligibleForReviewCard,
  extractContactLeadsFromDebriefText,
  extractMentionedPeopleFromDebriefText,
  isVagueContactPhrase,
  personMentionEligibleForSupportContactReview,
  personMentionEligibleForWorkflowParticipantReview,
} from "@/lib/surgical-sales/debriefContactLeadExtraction";

import { extractContactNamesFromDebriefText } from "@/lib/surgical-sales/debriefDetectedContact";

import { buildInitialProposedContacts } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { proposedContactsFromAtomicFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

const RIGHT_PEOPLE_SENTENCE =
  "if we work through the right people it usually isn't a problem getting into cases";

const MELISSA_SCHEDULING_NOTE =
  "Melissa handles scheduling but I don't have her contact info";

describe("debriefContactLeadExtraction", () => {
  it("does not extract a contact from vague right-people language", () => {
    expect(isVagueContactPhrase(RIGHT_PEOPLE_SENTENCE)).toBe(true);
    expect(extractContactLeadsFromDebriefText(RIGHT_PEOPLE_SENTENCE)).toEqual([]);
    expect(extractContactNamesFromDebriefText(RIGHT_PEOPLE_SENTENCE)).toEqual([]);
  });

  it("ignores pronoun-only scheduling references", () => {
    expect(
      extractContactNamesFromDebriefText(
        "Sounds like she handles most of the scheduling stuff on their side.",
      ),
    ).toEqual([]);
  });

  it("does not treat mentioned-if as a contact name", () => {
    expect(
      extractContactNamesFromDebriefText(
        "He mentioned if we work through the right people it usually is not a problem.",
      ),
    ).toEqual([]);
  });

  it("classifies Melissa as workflow participant without contact info", () => {
    expect(
      classifyPersonMentionFromDebrief({
        name: "Melissa",
        quote: MELISSA_SCHEDULING_NOTE,
        debriefText: MELISSA_SCHEDULING_NOTE,
      }),
    ).toBe("workflow_participant");

    const leads = extractContactNamesFromDebriefText(MELISSA_SCHEDULING_NOTE);
    expect(leads).toHaveLength(1);
    expect(leads[0]?.name).toBe("Melissa");
    expect(leads[0]?.mentionLevel).toBe("workflow_participant");
  });

  it("extracts Sarah from comma-attribution scheduler phrasing", () => {
    const names = extractContactNamesFromDebriefText(
      "Sarah, the surgery scheduler, handles all observation requests and asked me to email her.",
    ).map((contact) => contact.name);
    expect(names).toEqual(["Sarah"]);
  });

  it("rejects surname + sentiment verb name artifacts", () => {
    expect(
      extractContactNamesFromDebriefText(
        "Overall it was positive and Dr. Ham seemed open to continuing the conversation.",
      ),
    ).toEqual([]);
  });

  it("extracts only Karen and Mike from the full regression debrief", () => {
    const names = extractContactNamesFromDebriefText(ANDY_KAREN_DEBRIEF_REGRESSION_NOTE)
      .map((c) => c.name)
      .sort();
    expect(names).toEqual(["Karen", "Mike"]);
  });

  it("marks Karen as workflow participant, not a support contact without info", () => {
    const level = classifyPersonMentionFromDebrief({
      name: "Karen",
      quote: "Karen from his office handles most of the scheduling",
      debriefText: ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
    });
    expect(level).toBe("workflow_participant");
    expect(personMentionEligibleForSupportContactReview({ level })).toBe(false);
    expect(personMentionEligibleForWorkflowParticipantReview({ level })).toBe(true);
    expect(
      contactLeadEligibleForReviewCard({
        name: "Karen",
        quote: "Karen handles scheduling",
        confidence: "strong",
        level,
      }),
    ).toBe(true);
  });

  it("weak name-only mentions stay mentioned_person, not support contacts", () => {
    const text = "He also mentioned Steve a few times in passing.";
    expect(extractContactNamesFromDebriefText(text)).toEqual([]);
    const mentioned = extractMentionedPeopleFromDebriefText(text).map((p) => p.name);
    expect(mentioned).toContain("Steve");
  });

  it("extracts names from bullet-style dictation", () => {
    const names = extractContactNamesFromDebriefText(
      "scheduling — Karen\nproduct eval — Mike handles that side",
    )
      .map((c) => c.name)
      .sort();
    expect(names).toEqual(["Karen", "Mike"]);
  });

  it("extracts lowercase dictation names near ownership verbs", () => {
    const names = extractContactNamesFromDebriefText(
      "karen from his office handles most of the scheduling stuff",
    ).map((c) => c.name);
    expect(names).toContain("Karen");
  });

  it("extracts Jennifer from intro-call in-his-office scheduling phrasing", () => {
    const names = extractContactNamesFromDebriefText(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION)
      .map((c) => ({ name: c.name, level: c.mentionLevel }));
    const jennifer = names.find((c) => c.name === "Jennifer");
    expect(jennifer).toBeTruthy();
    expect(jennifer!.level).toBe("workflow_participant");
    expect(names.some((c) => c.name === "Surgical")).toBe(false);
  });

  it("buildInitialProposedContacts skips vague sentence debriefs", () => {
    const review: LogUpdateParseResult = {
      sourceText: RIGHT_PEOPLE_SENTENCE,
      suggestedUpdates: [],
      fieldUpdates: [],
      intelligenceReview: {
        confirmedUpdates: [],
        partiallyConfirmed: [],
        stillWorthConfirming: [],
        relatedOperationalAreas: [],
      },
      stillMissing: [],
      saveAsNoteAccepted: true,
      usesProviderIntelligence: true,
      aiMapping: null,
      mappingSource: "openai",
    };
    expect(
      buildInitialProposedContacts({
        review,
        sourceReference: "engagement:test",
      }),
    ).toEqual([]);
  });

  it("does not treat mentioned-that or That handles scheduling as person names", () => {
    const credentialingNote =
      "That all is required but mentioned that vendor credentialing usually has to be complete before observation.";
    expect(extractContactNamesFromDebriefText(credentialingNote)).toEqual([]);
    expect(extractContactLeadsFromDebriefText(credentialingNote)).toEqual([]);

    expect(
      extractContactNamesFromDebriefText("That handles scheduling on their side."),
    ).toEqual([]);
  });

  it("does not treat 'did not' dictation fragments as contact names", () => {
    const note =
      "We did not get into a detailed product discussion today. He specifically mentioned Jennifer Reynolds as someone who helps coordinate scheduling.";
    const names = extractContactNamesFromDebriefText(note).map((c) => c.name);

    expect(names).toContain("Jennifer Reynolds");
    expect(names).not.toContain("Did Not");
  });

  it("does not treat provider title mentions as contact names", () => {
    const note =
      "Spoke with Dr. Lettuce today. Jennifer appears to be involved in scheduling. My next step is to continue building the relationship with Dr. Onion.";
    const names = extractContactNamesFromDebriefText(note).map((c) => c.name);

    expect(names).toEqual(["Jennifer"]);
  });

  it("merges text-extracted contacts when atomic facts omit workflow_contact", () => {
    const review: LogUpdateParseResult = {
      sourceText: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      suggestedUpdates: [],
      fieldUpdates: [],
      intelligenceReview: {
        confirmedUpdates: [],
        partiallyConfirmed: [],
        stillWorthConfirming: [],
        relatedOperationalAreas: [],
      },
      stillMissing: [],
      saveAsNoteAccepted: true,
      usesProviderIntelligence: true,
      aiMapping: null,
      mappingSource: "openai",
      atomicFacts: [
        {
          fact_type: "follow_up",
          entity: "unknown",
          attribute: "action",
          value: "identify Jennifer's contact information",
          evidence: "My next step is to identify Jennifer's contact information.",
          confidence: "medium",
        },
        {
          fact_type: "observation_access",
          entity: "Tom Sandy",
          attribute: "status",
          value: "not opposed",
          evidence: "He wasn't opposed to having me observe a case.",
          confidence: "high",
        },
      ],
    };

    const contacts = buildInitialProposedContacts({
      review,
      sourceReference: "engagement:test",
    });

    expect(contacts.some((contact) => /jennifer/i.test(contact.displayName))).toBe(true);
  });

  it("extracts Jennifer Reynolds from specifically-mentioned scheduling phrasing", () => {
    const note =
      "He specifically mentioned Jennifer Reynolds as someone who helps coordinate scheduling and office logistics.";
    const names = extractContactNamesFromDebriefText(note).map((c) => c.name);
    expect(names).toContain("Jennifer Reynolds");
  });

  it("extracts Jennifer, not Confirmed, from assertion-style scheduling phrasing", () => {
    const note = "Confirmed that Jennifer handles all rep scheduling and observation requests.";
    const names = extractContactNamesFromDebriefText(note).map((c) => c.name);
    expect(names).toEqual(["Jennifer"]);
  });

  it("repairs assertion-word atomic contact entities before proposed contact review", () => {
    const note = "Confirmed that Jennifer handles all rep scheduling and observation requests.";
    const contacts = proposedContactsFromAtomicFacts({
      dictation: note,
      sourceReference: "field-note",
      facts: [
        {
          fact_type: "workflow_contact",
          entity: "Confirmed",
          attribute: "role",
          value: "Scheduling Coordinator",
          evidence: note,
          confidence: "high",
        },
      ],
    });

    expect(contacts.map((contact) => contact.displayName)).toEqual(["Jennifer"]);
    expect(contacts[0]?.roleLabel).toBe("Scheduling Coordinator");
  });
});
