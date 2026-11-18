/**
 * Post-debrief execution propagation — observation readiness, next best action, clinical intel.
 */

import { describe, expect, it } from "vitest";

import {
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildProviderOverviewBody } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { buildProviderOverviewIntelligenceSummary } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceSummary";
import { buildProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import { buildOrganizationOperationalReadinessCards } from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import { buildProviderProfilePathwayNextAction } from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import { contactsReadyToPersist } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  buildDebriefDiscoveryPersistPayload,
} from "@/lib/surgical-sales/debriefDiscoveryMappingPipeline";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import { formatProcedureInterestsOverviewSummary } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { buildProviderOverviewMissionStatus } from "@/lib/surgical-sales/buildProviderOverviewMissionStatus";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { buildPrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { discoverySignalOperationalNote } from "@/lib/surgical-sales/discoveryIntelligenceSignalBriefing";
import { resolveDiscoverySignalConfidenceNuance } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  buildProviderObservationReadiness,
  ADVANCE_OBSERVATION_ACCESS_OBJECTIVE,
  PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT,
  PROVIDER_ACCESS_FOLLOW_UP_CTA,
} from "@/lib/surgical-sales/providerObservationReadiness";
import { simulateDebriefReviewOutcomeAcceptance } from "@/lib/surgical-sales/simulateDebriefReviewOutcomeAcceptance";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000099";
const ACTOR = { userId: "test-user", userName: "Test Rep" };
const SOURCE_NOTE = "Intro call debrief — Tom Sandy @ Test3 Hospital";

function persistTomSandyDebrief() {
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
  const proposedContacts = buildInitialProposedContacts({
    review: parse,
    sourceReference: "test",
  });
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
    sourceLabel: SOURCE_NOTE,
    existingContact: { first_name: "Tom", last_name: "Sandy" },
    actor: ACTOR,
  });
  return {
    dictation,
    contact: payload.contactPatch as Record<string, unknown>,
    proposedContacts,
    logUpdate,
  };
}

describe("post-debrief execution propagation — Tom Sandy intro", () => {
  const fixture = persistTomSandyDebrief();

  it("Test A: observation readiness matches post-intro access state", () => {
    const readiness = buildProviderObservationReadiness(fixture.contact);
    expect(readiness).toMatchObject({
      providerInterest: "yes",
      observationApproved: "no",
      credentialingRequired: "yes",
      credentialingPathKnown: "no",
      schedulerIdentified: "partial",
      schedulerContactInfoCaptured: "no",
      candidateCasesIdentified: "no",
      observationDatesDiscussed: "no",
    });
    expect(readiness.readinessLevel).toBe("conditional");
    expect(readiness.blockers.length).toBeGreaterThanOrEqual(3);
  });

  it("Test B: provider overview recommends access follow-up, not another intro call", () => {
    const engagements = [
      {
        id: "eng-intro",
        engagement_type: "intro_call",
        status: "completed",
        engagement_type_label: "Intro call",
        status_label: "Completed",
        debrief_completed: true,
      },
    ] as import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary[];

    const pathwayAction = buildProviderProfilePathwayNextAction({
      contact: fixture.contact,
      providerId: PROVIDER_ID,
      pathwayStageId: "discovery",
      engagements,
    });
    expect(pathwayAction.label).toBe("Request Observation Approval");
    expect(pathwayAction.label).not.toBe("Create Intro Call");

    const narrative = buildProviderOverviewNarrative({
      providerId: PROVIDER_ID,
      contact: fixture.contact,
      relationshipStage: "prospect",
      engagements,
      newEngagementHref: `/portal/sales/providers/${PROVIDER_ID}/engagements/new`,
      newCaseHref: "/cases/new",
      intelligenceHref: `/portal/sales/providers/${PROVIDER_ID}?tab=intelligence`,
      createOpportunityHref: "/opportunities/new",
    });
    const body = buildProviderOverviewBody({
      narrative,
      contact: fixture.contact,
      providerId: PROVIDER_ID,
      intelligenceHref: `/portal/sales/providers/${PROVIDER_ID}?tab=intelligence`,
      briefingHref: "/briefing",
      newEngagementHref: `/portal/sales/providers/${PROVIDER_ID}/engagements/new`,
      activityHref: "/activity",
      engagements,
    });
    expect(body.nextBestAction.label).not.toBe("Create Intro Call");
    expect(body.nextBestAction.label).toMatch(/observation approval|permission/i);
    expect(body.pathwayStage.stageObjective).toBe(ADVANCE_OBSERVATION_ACCESS_OBJECTIVE);
  });

  it("Test C: Jennifer is proposed but not fully captured", () => {
    expect(
      fixture.proposedContacts.some((c) => /^jennifer$/i.test(c.displayName)),
    ).toBe(true);
    expect(contactsReadyToPersist(fixture.proposedContacts)).toHaveLength(0);
    const readiness = buildProviderObservationReadiness(fixture.contact);
    expect(readiness.schedulerIdentified).toBe("partial");
    expect(readiness.schedulerContactInfoCaptured).toBe("no");
  });

  it("Test D: clinical intelligence preserves procedures and volume trends", () => {
    const summary = formatProcedureInterestsOverviewSummary(fixture.contact);
    expect(summary).toMatch(/robotic ventral hernia/i);
    expect(summary).toMatch(/abdominal wall reconstruction/i);
    expect(summary).toMatch(/increasing/i);

    const intel = buildProviderOverviewIntelligenceSummary({ contact: fixture.contact });
    const procedures = intel.confirmed.find((r) => r.id === "procedure_interests");
    expect(procedures?.value).toMatch(/robotic ventral hernia/i);
    expect(procedures?.value).toMatch(/abdominal wall reconstruction/i);
  });

  it("Test E: organization profile receives facility access only", () => {
    const orgCards = buildOrganizationOperationalReadinessCards({ contact: fixture.contact });
    const synthesis = orgCards.map((c) => c.synthesisLine).join(" ");
    expect(synthesis).toMatch(/credential|access|schedul/i);
    expect(synthesis).not.toMatch(/abdominal wall reconstruction/i);

    const orgKeys = Object.keys(fixture.contact).filter((k) => isOrganizationIntelligenceDbKey(k));
    expect(orgKeys).not.toContain("provider_procedure_focus");
  });

  it("Test F: field metadata preserves debrief source attribution", () => {
    const meta = fixture.contact.provider_intelligence_field_metadata as Record<
      string,
      { source_label?: string; evidence_text?: string }
    >;
    expect(Object.keys(meta).length).toBeGreaterThan(0);
    const labels = Object.values(meta).map((m) => String(m.source_label ?? ""));
    expect(labels.some((l) => /intro|debrief|engagement/i.test(l))).toBe(true);
    const evidence = Object.values(meta)
      .map((m) => String(m.evidence_text ?? ""))
      .join(" ");
    expect(evidence).toMatch(/Jennifer|credentialing|robotic ventral hernia/i);
  });

  const engagements = [
    {
      id: "eng-intro",
      engagement_type: "intro_call",
      status: "completed",
      engagement_type_label: "Intro call",
      status_label: "Completed",
      debrief_completed: true,
    },
  ] as import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary[];

  it("Screen 1 — Provider Overview: next engagement, objective, access, blockers", () => {
    const narrative = buildProviderOverviewNarrative({
      providerId: PROVIDER_ID,
      contact: fixture.contact,
      relationshipStage: "prospect",
      engagements,
      newEngagementHref: `/portal/sales/providers/${PROVIDER_ID}/engagements/new`,
      newCaseHref: "/cases/new",
      intelligenceHref: `/portal/sales/providers/${PROVIDER_ID}?tab=intelligence`,
      createOpportunityHref: "/opportunities/new",
    });
    const body = buildProviderOverviewBody({
      narrative,
      contact: fixture.contact,
      providerId: PROVIDER_ID,
      intelligenceHref: `/portal/sales/providers/${PROVIDER_ID}?tab=intelligence`,
      briefingHref: "/briefing",
      newEngagementHref: `/portal/sales/providers/${PROVIDER_ID}/engagements/new`,
      activityHref: "/activity",
      engagements,
    });

    const mission = buildProviderOverviewMissionStatus({
      contact: fixture.contact,
      providerId: PROVIDER_ID,
      engagements,
      workflow: body.workflowAction,
      upcoming: body.upcomingTouch,
      currentGoal: body.pathwayStage.stageObjective,
      nextBestAction: body.nextBestAction,
      hero: body.tacticalHero,
      newEngagementHref: `/portal/sales/providers/${PROVIDER_ID}/engagements/new`,
    });

    expect(mission.mode).toBe("fallback");
    if (mission.mode === "fallback") {
      expect(mission.nextActionLabel).toMatch(/observation approval|permission/i);
      expect(mission.currentObjective.length).toBeGreaterThan(0);
    }

    expect(body.pathwayStage.stageObjective).toBe(ADVANCE_OBSERVATION_ACCESS_OBJECTIVE);

    const intel = buildProviderOverviewIntelligenceSummary({ contact: fixture.contact });
    const observation = intel.confirmed.find((r) => r.id === "observation_approval");
    expect(observation?.value).toMatch(/interested|permission not yet confirmed/i);
    expect([observation?.value, observation?.detailLine].filter(Boolean).join(" · ")).toMatch(
      /not yet confirmed|not approved|permission/i,
    );

    const blockerText = body.tacticalProgression.openItems.map((i) => i.label).join(" ");
    expect(blockerText).toMatch(/Scheduler Contact/i);
    expect(blockerText).toMatch(/Credentialing Pathway/i);
    expect(blockerText).toMatch(/Candidate Case/i);
  });

  it("Screen 2 — Provider Intelligence: Jennifer, credentialing, clinical trends", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: fixture.contact,
      engagements,
    });
    const access = view.groups.find((g) => g.id === "access_readiness");
    expect(access).toBeTruthy();

    const scheduling = access!.rows.find((r) => r.signalId === "scheduling_owner");
    expect(scheduling).toBeTruthy();
    const schedulingNote =
      discoverySignalOperationalNote(fixture.contact, scheduling!) ??
      scheduling!.evidenceSnippet ??
      "";
    expect(schedulingNote).toMatch(/Jennifer/i);
    expect(schedulingNote).toMatch(/contact info missing|referenced/i);

    const pathway = access!.rows.find((r) => r.signalId === "facility_vendor_pathway");
    const pathwayNuance = resolveDiscoverySignalConfidenceNuance(
      "facility_vendor_pathway",
      fixture.contact,
      pathway?.statusLabel,
    );
    expect(pathwayNuance).toMatch(/credentialing|vendor/i);

    const clinical = view.groups.find((g) => g.id === "clinical_fit");
    const workflow = clinical?.rows.find((r) => r.signalId === "workflow_visibility");
    const clinicalText = [
      workflow?.evidenceSnippet ?? "",
      String(fixture.contact.provider_procedure_focus ?? ""),
    ].join(" ");
    expect(clinicalText).toMatch(/robotic ventral hernia/i);
    expect(clinicalText).toMatch(/abdominal wall reconstruction/i);
    expect(clinicalText).toMatch(/increasing|higher volume/i);
  });

  it("Screen 3 — Organization Profile: facility access only, no Tom clinical on org", () => {
    const orgCards = buildOrganizationOperationalReadinessCards({ contact: fixture.contact });
    const synthesis = orgCards.map((c) => c.synthesisLine).join(" ");
    expect(synthesis).toMatch(/credential|vendor|schedul/i);
    expect(synthesis).not.toMatch(/robotic ventral hernia|abdominal wall reconstruction/i);

    for (const key of Object.keys(fixture.contact)) {
      if (!isOrganizationIntelligenceDbKey(key)) continue;
      const value = String(fixture.contact[key] ?? "");
      expect(value).not.toMatch(/robotic ventral hernia|abdominal wall reconstruction/i);
    }
  });

  it("Screen 4 — Future engagement prep: observation access briefing bullets", () => {
    const snapshot = buildProviderIntelligenceSnapshot(fixture.contact, PROVIDER_ID);
    const known = buildPrepareKnownIntelligence({
      provider: fixture.contact,
      snapshot,
    });
    const corpus = known.bullets.map((b) => `${b.label} ${b.value}`).join(" ");
    expect(corpus).toMatch(/receptive to observation/i);
    expect(corpus).toMatch(/not approved/i);
    expect(corpus).toMatch(/scheduler contact information needed/i);
    expect(corpus).toMatch(/credentialing path/i);
    expect(corpus).toMatch(/robotic hernia|AWR/i);
  });
});
