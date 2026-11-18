import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildInitialProposedContacts } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { DR_ONION_INTRO_CALL_DICTATION, MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import {
  buildIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { filterDecisionRequiredOutcomes } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisionOutcomes";
import { findProposedContactForPersonName } from "@/lib/surgical-sales/debriefDetectedContact";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function ufRunsFromDictation(dictation: string, captureId: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "intro_call",
  });
  return [
    {
      capture_id: captureId,
      declared_source_type: "intro_call",
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

describe("Mark Onion contact suggestions — UF/DIP id alignment", () => {
  beforeEach(() => {
    vi.stubEnv("UF_AUTHORITY_REVIEW", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("links UF workflow cards to proposed contacts so Contact suggestions can render", () => {
    const dictation = DR_ONION_INTRO_CALL_DICTATION;
    const pipeline = runDebriefExtractionPipeline({ dictation });
    const proposedContacts = buildInitialProposedContacts({
      review: pipeline.parse,
      sourceReference: "provider:test",
    });
    expect(proposedContacts.some((contact) => /jennifer/i.test(contact.displayName))).toBe(true);

    const debriefRuns = ufRunsFromDictation(dictation, "capture-onion-contact");
    const composed = composeDebriefReviewDisplay({
      dictation,
      logUpdate: { ...pipeline.parse, debriefUniversalFactsRuns: debriefRuns },
      debriefRuns,
      proposedContacts,
    });

    const jenniferCard = composed.actionableCards.find(
      (card) => card.category === "workflow_participant" && /jennifer/i.test(card.headline),
    );
    expect(jenniferCard).toBeTruthy();
    expect(jenniferCard?.contactId?.startsWith("uf:")).toBe(false);

    const proposedJennifer = findProposedContactForPersonName("Jennifer", proposedContacts);
    expect(proposedJennifer).toBeTruthy();
    expect(jenniferCard?.contactId).toBe(proposedJennifer?.id);

    const outcomes = buildIntelligenceBriefOutcomes(composed.brief);
    const contactDecisions = filterDecisionRequiredOutcomes({ outcomes, proposedContacts });
    expect(contactDecisions.some((row) => /jennifer/i.test(row.primaryLine))).toBe(true);
    expect(
      contactDecisions.every((row) =>
        Boolean(findProposedContactForPersonName(row.primaryLine, proposedContacts)),
      ),
    ).toBe(true);
  });

  it("uses full Jennifer Reynolds name from proposed contacts on UF workflow card", () => {
    const dictation = MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION;
    const pipeline = runDebriefExtractionPipeline({ dictation });
    const proposedContacts = buildInitialProposedContacts({
      review: pipeline.parse,
      sourceReference: "provider:mark-onion",
    });
    expect(proposedContacts.some((c) => c.displayName === "Jennifer Reynolds")).toBe(true);

    const debriefRuns = ufRunsFromDictation(dictation, "capture-mark-onion-fullname");
    const composed = composeDebriefReviewDisplay({
      dictation,
      logUpdate: { ...pipeline.parse, debriefUniversalFactsRuns: debriefRuns },
      debriefRuns,
      proposedContacts,
    });

    const jenniferCard = composed.actionableCards.find(
      (card) => card.category === "workflow_participant" && /jennifer/i.test(card.headline),
    );
    expect(jenniferCard?.headline).toBe("Jennifer Reynolds");
  });
});
