/**
 * Cross-view synchronization — reviewed debrief intelligence is the single source of truth.
 */

import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceBriefingView } from "@/lib/surgical-sales/buildProviderIntelligenceBriefingView";
import { buildProviderOverviewAccessIntelligence } from "@/lib/surgical-sales/buildProviderOverviewAccessIntelligence";
import { buildProviderOverviewIntelligenceSummary } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceSummary";
import {
  buildProviderFieldIntelligenceModel,
  PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { buildDebriefIntelligenceExtractionReview, buildInitialProposedContacts } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefDiscoveryPersistPayload } from "@/lib/surgical-sales/debriefDiscoveryMappingPipeline";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import { simulateDebriefReviewOutcomeAcceptance } from "@/lib/surgical-sales/simulateDebriefReviewOutcomeAcceptance";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000099";
const ACTOR = { userId: "test-user", userName: "Test Rep" };

function persistTomSandyContact(): Record<string, unknown> {
  const dictation = INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION;
  const facts = buildRegressionAtomicFactsFromDictation(dictation);
  const parse = buildParseResultFromDebriefFacts({
    sourceText: dictation,
    facts,
    context: {
      providerId: PROVIDER_ID,
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    },
    existingFields: {},
    mappingSource: "regression_stand_in",
  });
  const proposedContacts = buildInitialProposedContacts({ review: parse, sourceReference: "test" });
  const extraction = buildDebriefIntelligenceExtractionReview({
    review: parse,
    proposedContacts,
    sourceReference: "test",
  });
  const guardContext = buildDebriefReviewDecisionContext({
    providerLabel: "Tom Sandy",
    providerContact: { first_name: "Tom", last_name: "Sandy" },
  });
  const logUpdate = simulateDebriefReviewOutcomeAcceptance({
    review: parse,
    dictation,
    extraction,
    proposedContacts,
    guardContext,
  });
  const payload = buildDebriefDiscoveryPersistPayload({
    logUpdate,
    sourceLabel: "Intro call debrief",
    existingContact: { first_name: "Tom", last_name: "Sandy" },
    actor: ACTOR,
    proposedContacts,
  });
  return payload.contactPatch as Record<string, unknown>;
}

function commandItem(contact: Record<string, unknown>, id: string) {
  const summary = buildProviderOverviewIntelligenceSummary({ contact });
  return summary.commandIntelligence.find((item) => item.id === id);
}

describe("provider field intelligence synchronization", () => {
  const contact = persistTomSandyContact();
  const model = buildProviderFieldIntelligenceModel({ contact });

  it("Tom Sandy — overview shows derived access readiness, not raw scheduler field", () => {
    expect(model.scheduler.primaryLine).toMatch(/Jennifer \(Referenced\)/i);
    expect(model.scheduler.secondaryLine).toMatch(/Contact information needed/i);
    expect(model.scheduler.displayValue).not.toBe(PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN);

    const accessReadiness = commandItem(contact, "access_readiness");
    expect(accessReadiness?.value).toMatch(/Learning|Conditional/i);
    expect(accessReadiness?.label).toBe("Access status");
    expect(accessReadiness?.value).not.toBe(PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN);

    const access = buildProviderOverviewAccessIntelligence({ contact });
    const accessScheduler = access.rows.find((r) => r.id === "scheduler");
    expect(accessScheduler?.captured).toBe(true);
    expect(accessScheduler?.value).toMatch(/Jennifer \(Referenced\)/i);
    expect(accessScheduler?.value).not.toBe(PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN);
  });

  it("Tom Sandy — overview derives conditional access readiness from credentialing intelligence", () => {
    expect(model.credentialing.primaryLine).toBe("Credentialing Required");
    expect(model.credentialing.secondaryLine).toBe("Platform Unknown");

    const accessReadiness = commandItem(contact, "access_readiness");
    expect(accessReadiness?.value).toMatch(/Conditional|Learning/i);
    expect(accessReadiness?.detailLine).toMatch(/Credentialing/i);
  });

  it("Tom Sandy — overview derives learning/conditional access readiness from observation interest", () => {
    expect(model.observationApproval.primaryLine).toBe("Permission Requested");
    expect(model.observationApproval.secondaryLine).toMatch(/permission requested/i);

    const accessReadiness = commandItem(contact, "access_readiness");
    expect(accessReadiness?.value).toMatch(/Learning|Conditional/i);
    expect(accessReadiness?.value).not.toBe(PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN);

    const briefing = buildProviderIntelligenceBriefingView({
      contact,
      providerId: PROVIDER_ID,
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
        } as never,
      ],
    });
    const briefingCorpus = [
      ...briefing.whatWeKnow,
      ...briefing.openQuestions,
    ]
      .map((item) => item.text)
      .join(" ");
    expect(briefingCorpus).toMatch(/permission requested/i);
    expect(briefingCorpus).not.toMatch(/not approved/i);
    expect(briefingCorpus).not.toMatch(/observation approval not captured/i);
  });

  it("Tom Sandy — clinical procedures appear in command intelligence and briefing", () => {
    expect(model.clinical.procedures.some((p) => /robotic ventral hernia/i.test(p))).toBe(true);
    expect(model.clinical.procedures.some((p) => /abdominal wall reconstruction/i.test(p))).toBe(true);

    const clinical = commandItem(contact, "clinical_understanding");
    expect(clinical?.value).toMatch(/Partial|Strong/i);
    expect(clinical?.detailLine).toMatch(/robotic ventral hernia/i);

    const briefing = buildProviderIntelligenceBriefingView({
      contact,
      providerId: PROVIDER_ID,
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
        } as never,
      ],
    });
    const verifiedText = briefing.whatWeKnow.map((item) => item.text).join(" ");
    expect(verifiedText).toMatch(/robotic ventral hernia/i);
    expect(verifiedText).toMatch(/abdominal wall reconstruction/i);
  });

  it("Tom Sandy — mission engine blockers align with field intelligence gaps", () => {
    const readiness = buildProviderObservationReadiness(contact);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining(["Scheduler Contact", "Credentialing Pathway"]),
    );
    expect(model.readiness.blockers).toEqual(readiness.blockers);
  });

  it("never shows receptive observation and Not captured for the same signal", () => {
    const accessReadiness = commandItem(contact, "access_readiness");
    const access = buildProviderOverviewAccessIntelligence({ contact });
    const accessObs = access.rows.find((r) => r.id === "observation_status");

    expect(accessReadiness?.value).not.toBe(PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN);
    expect(accessObs?.value).not.toBe(PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN);

    const briefing = buildProviderIntelligenceBriefingView({
      contact,
      providerId: PROVIDER_ID,
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
        } as never,
      ],
    });
    const allBriefing = [
      ...briefing.whatWeKnow,
      ...briefing.openQuestions,
    ].map((i) => i.text);
    expect(allBriefing.some((t) => /permission requested|interested/i.test(t))).toBe(true);
    expect(allBriefing.some((t) => /not captured/i.test(t))).toBe(false);
  });
});
