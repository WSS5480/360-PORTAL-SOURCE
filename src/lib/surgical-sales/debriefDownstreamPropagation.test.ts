/**
 * Debrief downstream propagation harness (Tom Sandy intro + approval follow-up).
 *
 * Manual verification checklist (after Save Updates in UI):
 * 1. Provider Intelligence tab — procedure focus, partial observation, credentialing, scheduler lead.
 * 2. Organization account — facility credentialing only (no procedure focus on org).
 * 3. New follow-up / observation_request engagement — prep shows access/credentialing gaps.
 * 4. New observation case — not approved; planning shows unresolved access signals.
 * 5. Second debrief with explicit approval — profile Approved; observation CTA advances.
 */

import { describe, expect, it } from "vitest";

import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { buildOrganizationOperationalReadinessCards } from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import { buildProviderOverviewIntelligenceSummary } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceSummary";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  buildDebriefDiscoveryPersistPayload,
} from "@/lib/surgical-sales/debriefDiscoveryMappingPipeline";
import {
  INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
  OBSERVATION_APPROVED_CREDENTIALING_COMPLETE_DEBRIEF,
} from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import { contactsReadyToPersist } from "@/lib/surgical-sales/debriefDetectedContact";
import { buildEngagementIntelligenceReadiness } from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import { buildPrepareRisksBarriers } from "@/lib/surgical-sales/engagements/prepareForMeetingRisksBarriers";
import { buildPrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import {
  markIntelligenceFieldsValidated,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { simulateDebriefReviewOutcomeAcceptance } from "@/lib/surgical-sales/simulateDebriefReviewOutcomeAcceptance";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000099";
const ACTOR = { userId: "test-user", userName: "Test Rep" };

const TOM_SANDY_CONTEXT = buildDebriefReviewDecisionContext({
  providerLabel: "Tom Sandy",
  providerContact: { first_name: "Tom", last_name: "Sandy" },
});

function parseDebriefDictation(dictation: string): LogUpdateParseResult {
  const facts = buildRegressionAtomicFactsFromDictation(dictation);
  return buildParseResultFromDebriefFacts({
    sourceText: dictation,
    facts,
    context: {
      providerId: PROVIDER_ID,
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    },
    existingFields: {},
    mappingSource: "regression_stand_in",
  });
}

function persistContactAfterDebriefSave(dictation: string, existingContact: Record<string, unknown> = {}) {
  const parse = parseDebriefDictation(dictation);
  const proposedContacts = buildInitialProposedContacts({
    review: parse,
    sourceReference: "test",
  });
  const extraction = buildDebriefIntelligenceExtractionReview({
    review: parse,
    proposedContacts,
    sourceReference: "test",
  });
  const reviewAccepted = simulateDebriefReviewOutcomeAcceptance({
    review: parse,
    dictation,
    extraction,
    proposedContacts,
    guardContext: TOM_SANDY_CONTEXT,
  });
  const payload = buildDebriefDiscoveryPersistPayload({
    logUpdate: reviewAccepted,
    sourceLabel: "Engagement debrief",
    existingContact,
    actor: ACTOR,
  });
  return {
    contact: payload.contactPatch as Record<string, unknown>,
    reviewAccepted,
    proposedContacts,
    payload,
  };
}

function withValidatedObservationApproval(contact: Record<string, unknown>): Record<string, unknown> {
  const feasibility = String(contact.provider_observation_feasibility ?? "").trim();
  const nextFeasibility =
    /\bapproved\b/i.test(feasibility) || feasibility === "yes"
      ? feasibility || "approved"
      : "approved";
  const patch = {
    ...contact,
    provider_observation_feasibility: nextFeasibility,
    provider_credentialing_status:
      String(contact.provider_credentialing_status ?? "").trim() || "complete",
    provider_observation_credentialing_needed:
      String(contact.provider_observation_credentialing_needed ?? "").trim() || "not_required",
  };
  const meta = markIntelligenceFieldsValidated({
    existing:
      (patch.provider_intelligence_field_metadata as Record<string, unknown>) ?? {},
    dbKeys: [
      "provider_observation_feasibility",
      "provider_credentialing_status",
      "provider_observation_credentialing_needed",
    ],
    fieldValues: patch,
    actor: ACTOR,
  });
  return { ...patch, provider_intelligence_field_metadata: meta };
}

describe("debrief downstream propagation", () => {
  describe("intro call — Tom Sandy / Jennifer", () => {
    const dictation = INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION;

    it("does not auto-persist Jennifer as a support contact", () => {
      const { proposedContacts } = persistContactAfterDebriefSave(dictation);
      expect(proposedContacts.some((c) => /^jennifer$/i.test(c.displayName))).toBe(true);
      expect(contactsReadyToPersist(proposedContacts)).toHaveLength(0);
    });

    it("provider overview reflects observation interest, credentialing, procedures, and scheduler lead", () => {
      const { contact } = persistContactAfterDebriefSave(dictation);
      const summary = buildProviderOverviewIntelligenceSummary({ contact });

      const observation = [...summary.confirmed, ...summary.stillLearning].find(
        (r) => r.id === "observation_approval",
      );
      expect(observation?.value).toMatch(/interested|interest|discussed|conditional/i);
      expect(observation?.value).not.toMatch(/^approved$/i);

      const credentialing = [...summary.confirmed, ...summary.stillLearning].find(
        (r) => r.id === "credentialing",
      );
      expect(credentialing?.value).toBeTruthy();
      expect(credentialing?.value).not.toBe("Not captured");

      const procedures = summary.confirmed.find((r) => r.id === "procedure_interests");
      expect(procedures?.value).toMatch(/hernia|abdominal wall|robotic/i);

      const scheduler = [...summary.confirmed, ...summary.stillLearning].find(
        (r) => r.id === "scheduler",
      );
      expect(scheduler?.value).toMatch(/jennifer|partial lead|scheduling/i);
    });

    it("organization readiness shows facility access signals without procedure focus", () => {
      const { contact } = persistContactAfterDebriefSave(dictation);
      const orgCards = buildOrganizationOperationalReadinessCards({ contact });
      const synthesis = orgCards.map((c) => c.synthesisLine).join(" ");
      expect(synthesis).toMatch(/credential|access|schedul/i);
      expect(synthesis).not.toMatch(/abdominal wall reconstruction/i);

      const orgFieldKeys = Object.keys(contact).filter((k) =>
        isOrganizationIntelligenceDbKey(k),
      );
      expect(orgFieldKeys).not.toContain("provider_procedure_focus");
      expect(orgFieldKeys).not.toContain("provider_technique_preferences");
    });

    it("observation_request engagement surfaces access pre-visit blockers", () => {
      const { contact } = persistContactAfterDebriefSave(dictation);
      const readiness = buildEngagementIntelligenceReadiness({
        provider: contact,
        engagementType: "observation_request",
        providerId: PROVIDER_ID,
      });
      expect(readiness.preVisitBlockers.length).toBeGreaterThan(0);
      const keys = readiness.preVisitBlockers.map((b) => b.dbKey);
      expect(
        keys.some((k) =>
          [
            "provider_observation_feasibility",
            "provider_observation_access_path",
            "provider_credentialing_status",
            "provider_observation_credentialing_needed",
          ].includes(k),
        ),
      ).toBe(true);
    });

    it("follow-up engagement risks include access/credentialing from saved observation readiness", () => {
      const { contact } = persistContactAfterDebriefSave(dictation);
      const snapshot = buildProviderIntelligenceSnapshot(contact, PROVIDER_ID);
      const known = buildPrepareKnownIntelligence({
        provider: contact,
        snapshot,
      });
      const risks = buildPrepareRisksBarriers({
        provider: contact,
        snapshot,
        knownIntelligence: known,
        opportunity: null,
        engagement: {},
        engagementType: "follow_up",
      });
      const labels = risks.risks.map((r) => r.label).join(" ");
      expect(labels).toMatch(/access|coordinator|credential/i);
    });

    it("does not treat provider as observation-approved before explicit approval debrief", () => {
      const { contact } = persistContactAfterDebriefSave(dictation);
      expect(hasProviderObservationApprovalValidated(contact)).toBe(false);
    });

    it("dedupes identical second save without duplicating procedure focus metadata keys", () => {
      const first = persistContactAfterDebriefSave(dictation);
      const second = persistContactAfterDebriefSave(dictation, first.contact);
      const meta1 = first.contact.provider_intelligence_field_metadata as Record<string, unknown>;
      const meta2 = second.contact.provider_intelligence_field_metadata as Record<string, unknown>;
      expect(Object.keys(meta2).length).toBeGreaterThanOrEqual(Object.keys(meta1).length);
      const focus1 = String(first.contact.provider_procedure_focus ?? "");
      const focus2 = String(second.contact.provider_procedure_focus ?? "");
      expect(focus2).toBe(focus1);
    });

    it("discovery groups retain observation and scheduling evidence after persist", () => {
      const { contact } = persistContactAfterDebriefSave(dictation);
      const groups = buildDiscoveryIntelligenceGroupsView({ contact });
      const rows = groups.groups.flatMap((g) => g.rows);
      const observation = rows.find((r) => r.signalId === "observation_approval");
      const observationEvidence = String(observation?.evidenceSnippet ?? "");
      expect(observationEvidence).toMatch(
        /not opposed|not a problem|interested|observation interest:\s*yes/i,
      );
      const scheduling = rows.find((r) => r.signalId === "scheduling_owner");
      const schedulingEvidence = String(scheduling?.evidenceSnippet ?? "");
      expect(schedulingEvidence).toMatch(/jennifer|schedul/i);
    });
  });

  describe("follow-up debrief — observation approved", () => {
    const dictation = OBSERVATION_APPROVED_CREDENTIALING_COMPLETE_DEBRIEF;

    it("updates approval and clears feasibility blockers after validated save", () => {
      const intro = persistContactAfterDebriefSave(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION);
      expect(hasProviderObservationApprovalValidated(intro.contact)).toBe(false);

      const followUp = persistContactAfterDebriefSave(dictation, intro.contact);
      let contact = withValidatedObservationApproval(followUp.contact);

      expect(hasProviderObservationApprovalValidated(contact)).toBe(true);

      const summary = buildProviderOverviewIntelligenceSummary({ contact });
      const observation = [...summary.confirmed, ...summary.stillLearning].find(
        (r) => r.id === "observation_approval",
      );
      expect(observation?.value).toMatch(/approved/i);
      expect(observation?.value).not.toMatch(/interest noted/i);

      const readiness = buildEngagementIntelligenceReadiness({
        provider: contact,
        engagementType: "observation_request",
        providerId: PROVIDER_ID,
      });
      expect(
        readiness.preVisitBlockers.some((b) => b.dbKey === "provider_observation_feasibility"),
      ).toBe(false);
    });
  });
});
