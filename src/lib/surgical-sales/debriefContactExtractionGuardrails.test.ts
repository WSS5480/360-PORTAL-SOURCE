import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { isContactNameParsingArtifact, isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import { buildLogUpdateIntelligenceReview } from "@/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import { extractUniversalCategorySignals } from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { extractFollowUpTaskLinesFromDebriefReview } from "@/lib/surgical-sales/engagements/engagementDebriefVisitRecord";
import { buildProviderFieldNoteFollowUpSyncPayload } from "@/lib/surgical-sales/logUpdateReviewCommit";

const TOM_LETTUCE_PROVIDER = {
  first_name: "Tom",
  last_name: "Lettuce",
  display_name: "Tom Lettuce",
};

const JESSICA_SUPPORT_CONTEXT: DebriefIntelligenceExtractionContext = {
  pathwayStageId: "discovery",
  pathwayStageLabel: "Discovery",
  discoveryReadinessPercent: 40,
  openQuestions: [],
  signalStatuses: [],
  supportContacts: [
    {
      contactId: "contact-jessica",
      name: "Jessica",
      contactType: "scheduling",
      workflowRole: "Scheduling Coordinator",
      ownershipType: "organization",
      contactDetailsMissing: false,
    },
  ],
  credentialingPlatforms: [],
  providerPlatformName: null,
  upcomingEngagements: [],
  pastEngagements: [],
  productFocus: null,
  notesHistory: [],
};

const LETTUCE_LOUNGE_NOTE = [
  "Ran into Dr. Lettuce in the physician lounge after rounds.",
  "He was friendly and mentioned they are doing more robotic ventral hernia repair and seeing larger ventral defects lately.",
  "Observation access is not approved yet, but he did not seem opposed to it.",
  "Jessica handles scheduling for his cases and can help coordinate an observation.",
  "Other than following up with Jessica next week, no other actions today.",
].join(" ");

const OFFICE_DROP_IN_NOTE = [
  "Intro call with Dr. Pepper went very well. She was enthusiastic about continuing the conversation.",
  "Maya, her office manager, coordinates scheduling with the hospital.",
  "Dr. Pepper prefers to observe before any product trial.",
  "Plan to email available dates to Maya by Friday.",
].join(" ");

const OBSERVATION_CASE_NOTE = [
  "Observed Dr. Salt during a laparoscopic cholecystectomy today.",
  "Renee coordinated the case and had the room ready early.",
  "Dr. Salt mentioned Symbotex as their current mesh standard.",
  "My next step is to send clinical data on larger defect handling.",
].join(" ");

const HOSPITAL_CAFE_NOTE = [
  "Met Dr. Berry in the hospital cafeteria.",
  "He declined observation for now but Nora runs scheduling if we revisit.",
  "Foot and ankle reconstruction is a growing part of his practice.",
  "Need to schedule a follow-up office visit with Nora next month.",
].join(" ");

function emptyLogUpdate(dictation: string): LogUpdateParseResult {
  return {
    sourceText: dictation,
    suggestedUpdates: [],
    fieldUpdates: [],
    intelligenceReview: buildLogUpdateIntelligenceReview(dictation, [], {}),
    stillMissing: [],
    saveAsNoteAccepted: true,
    usesProviderIntelligence: true,
  };
}

function ufRuns(dictation: string, providerName: string, captureId: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "discovery_note",
    context: { provider_display_name: providerName },
  });
  return [
    {
      capture_id: captureId,
      declared_source_type: "discovery_note",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `${captureId}-${index}`,
        capture_id: captureId,
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

function contactHeadlines(cards: { headline: string; category: string; displayName?: string }[]): string[] {
  return cards
    .filter((card) => card.category === "workflow_participant")
    .map((card) => card.displayName?.trim() || card.headline.trim());
}

describe("Universal contact extraction guardrails", () => {
  beforeEach(() => {
    vi.stubEnv("UF_AUTHORITY_REVIEW", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects parsing artifacts like Lettuce In", () => {
    expect(isContactNameParsingArtifact("Lettuce In")).toBe(true);
    expect(isPlausiblePersonName("Lettuce In")).toBe(false);
    expect(isPlausiblePersonName("Pepper Prefers")).toBe(false);
  });

  it("extracts following-up-with phrasing as next action", () => {
    const signals = extractUniversalCategorySignals(
      "Other than following up with Jessica next week, no other actions today.",
      { providerName: "Tom Lettuce" },
    );
    expect(signals.some((signal) => signal.concept === "next_action")).toBe(true);
  });

  it("does not propose the assigned provider or known Jessica on lounge note", () => {
    const logUpdate = emptyLogUpdate(LETTUCE_LOUNGE_NOTE);
    const guardContext = buildDebriefReviewDecisionContext({
      providerContact: TOM_LETTUCE_PROVIDER,
      discoveryContext: JESSICA_SUPPORT_CONTEXT,
    });
    const proposedContacts = buildInitialProposedContacts({
      review: logUpdate,
      discoveryContext: JESSICA_SUPPORT_CONTEXT,
      sourceReference: "test:lettuce-lounge",
      providerContact: TOM_LETTUCE_PROVIDER,
      guardContext,
    });

    expect(proposedContacts.map((contact) => contact.displayName)).not.toContain("Lettuce");
    expect(proposedContacts.map((contact) => contact.displayName)).not.toContain("Lettuce In");
    expect(proposedContacts.map((contact) => contact.displayName)).not.toContain("Jessica");
    expect(proposedContacts.map((contact) => contact.displayName)).not.toContain("Tom Lettuce");

    const composed = composeDebriefReviewDisplay({
      dictation: LETTUCE_LOUNGE_NOTE,
      logUpdate,
      debriefRuns: ufRuns(LETTUCE_LOUNGE_NOTE, "Tom Lettuce", "lettuce-lounge"),
      discoveryContext: JESSICA_SUPPORT_CONTEXT,
      providerContact: TOM_LETTUCE_PROVIDER,
      providerLabel: "Tom Lettuce",
      guardContext,
    });

    const contacts = contactHeadlines(composed.actionableCards);
    expect(contacts).not.toContain("Lettuce In");
    expect(contacts).not.toContain("Lettuce");
    expect(contacts).not.toContain("Jessica");
    expect(composed.actionableCards.some((card) => /follow(?:ing)?\s+up\s+with\s+Jessica/i.test(card.headline))).toBe(
      true,
    );
  });

  it("keeps Maya but not Dr. Pepper on office drop-in note", () => {
    const logUpdate = emptyLogUpdate(OFFICE_DROP_IN_NOTE);
    const composed = composeDebriefReviewDisplay({
      dictation: OFFICE_DROP_IN_NOTE,
      logUpdate,
      debriefRuns: ufRuns(OFFICE_DROP_IN_NOTE, "Dr. Pepper", "pepper-office"),
      providerContact: { first_name: "Dr", last_name: "Pepper", display_name: "Dr. Pepper" },
      providerLabel: "Dr. Pepper",
    });

    const headlines = composed.actionableCards.map((card) => card.headline);
    expect(headlines.some((headline) => /Maya/i.test(headline))).toBe(true);
    expect(headlines.some((headline) => /Pepper\s+Prefers/i.test(headline))).toBe(false);
    expect(headlines.some((headline) => /Pepper\s+—/i.test(headline))).toBe(false);
  });

  it("keeps Renee but not Dr. Salt on observation debrief", () => {
    const logUpdate = emptyLogUpdate(OBSERVATION_CASE_NOTE);
    const composed = composeDebriefReviewDisplay({
      dictation: OBSERVATION_CASE_NOTE,
      logUpdate,
      debriefRuns: ufRuns(OBSERVATION_CASE_NOTE, "Dr. Salt", "salt-observation"),
      providerContact: { first_name: "Dr", last_name: "Salt", display_name: "Dr. Salt" },
      providerLabel: "Dr. Salt",
    });

    const contacts = contactHeadlines(composed.actionableCards);
    expect(contacts.some((name) => /Renee/i.test(name))).toBe(true);
    expect(contacts.some((name) => /Salt/i.test(name))).toBe(false);
    expect(composed.actionableCards.some((card) => /send clinical data/i.test(card.headline))).toBe(true);
  });

  it("keeps Nora but not Dr. Berry on hospital cafe note", () => {
    const logUpdate = emptyLogUpdate(HOSPITAL_CAFE_NOTE);
    const composed = composeDebriefReviewDisplay({
      dictation: HOSPITAL_CAFE_NOTE,
      logUpdate,
      debriefRuns: ufRuns(HOSPITAL_CAFE_NOTE, "Dr. Berry", "berry-cafe"),
      providerContact: { first_name: "Dr", last_name: "Berry", display_name: "Dr. Berry" },
      providerLabel: "Dr. Berry",
    });

    const contacts = contactHeadlines(composed.actionableCards);
    expect(contacts.some((name) => /Nora/i.test(name))).toBe(true);
    expect(contacts.some((name) => /Berry/i.test(name))).toBe(false);
  });

  it("builds follow-up sync payload from lounge note without engagement id", () => {
    const logUpdate = emptyLogUpdate(LETTUCE_LOUNGE_NOTE);
    const payload = buildProviderFieldNoteFollowUpSyncPayload({
      review: logUpdate,
      proposedContacts: [],
    });

    expect(payload).not.toBeNull();
    expect(payload?.engagement_id).toBeUndefined();
    expect(payload?.follow_up_tasks.join(" ")).toMatch(/Jessica/i);
  });

  it("extracts Jessica follow-up line for provider field note save", () => {
    const logUpdate = emptyLogUpdate(LETTUCE_LOUNGE_NOTE);
    const lines = extractFollowUpTaskLinesFromDebriefReview({
      dictation: LETTUCE_LOUNGE_NOTE,
      logUpdate,
      proposedContacts: [],
      providerContact: TOM_LETTUCE_PROVIDER,
      providerLabel: "Tom Lettuce",
    });

    expect(lines.join(" ")).toMatch(/Jessica/i);
  });
});
