import { describe, expect, it } from "vitest";

import {
  assertDebriefIntelligenceExtractionScenario,
} from "@/lib/surgical-sales/debriefIntelligenceExtractionAssertions";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import {
  buildDebriefActionableReviewCards,
  DEBRIEF_REVIEW_CATEGORY_LABELS,
} from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
  followUpOutcomesByPriority,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  displayFollowUpAction,
  INTELLIGENCE_BRIEF_SECTION,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { buildDebriefReviewSummary } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewSummary";
import { contactsReadyToPersist } from "@/lib/surgical-sales/debriefDetectedContact";
import { buildDebriefRecommendedNextSteps } from "@/lib/surgical-sales/debriefRepFriendlyReview";
import { buildInitialProposedContacts } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const INTERNAL_TAXONOMY_RE =
  /→|Product fit signals|operational understanding|deployment gates|deployment readiness|readiness signals|deployment signals|Provider operational understanding/i;

const INTRO_CALL_EXPECT = {
  outcomeId: "follow_up_needed" as const,
  observationApprovalExplicit: false,
  observationInterestOrPartial: true,
  pathwayUnchangedByDebriefAlone: true,
  namedParticipants: [
    {
      displayName: "Jennifer",
      mentionLevels: ["workflow_participant" as const],
      rolePattern: /schedul/i,
    },
  ],
  minProposedContacts: 1,
  maxProposedContacts: 3,
  noAutoPersistReadyContacts: true,
  credentialingPathwayDetected: true,
  credentialingPlatformMustStayUnknown: true,
  categoriesMustInclude: ["access_intelligence", "clinical_focus", "people_contacts"] as const,
  signalKindsMustExclude: ["approval_signal"],
  nextStepPattern: /jennifer|contact|credential|platform|pathway/i,
  minRepFriendlyUpdates: 2,
  requireRepFriendlyReviewSections: true,
  preserveNamedPeopleInCopy: true,
  forbidGenericContactLabels: true,
  forbidTechnicalCrmLanguage: true,
  forbidInventedCredentialingPlatforms: true,
};

function runIntroCallFixture() {
  return runDebriefExtractionPipeline({ dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION });
}

function ufRunsFromTomIntro(): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    declared_source_type: "intro_call",
  });
  return [
    {
      capture_id: "tom-sandy-intro",
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `tom-sandy-uf-${index}`,
        capture_id: "tom-sandy-intro",
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

describe("intro call debrief review — Tom Sandy / Jennifer regression", () => {
  it("satisfies shared debrief intelligence extraction scenario expectations", () => {
    const result = runIntroCallFixture();
    assertDebriefIntelligenceExtractionScenario(result, INTRO_CALL_EXPECT);
  });

  it("credentialing required with unknown platform — IntelliCentrics not confirmed on file", () => {
    const result = runIntroCallFixture();
    const rules = result.extraction.pipeline?.pass3_rules;
    expect(rules?.credentialingPlatformLabel).toBe("Unknown");
    expect(rules?.credentialingPlatformConfirmed).toBe(false);

    const credentialingLearned = result.extraction.pipeline?.intelligenceCaptured
      .filter((item) => item.kind === "credentialing_requirement")
      .map((item) => item.learned)
      .join(" ");
    expect(credentialingLearned).toMatch(/credential|vendor|required|unknown/i);
    expect(credentialingLearned.toLowerCase()).not.toMatch(
      /credentialing goes through intellicentrics \(confirmed/i,
    );
  });

  it("Jennifer is a workflow participant with review-contact action, not auto support contact", () => {
    const result = runIntroCallFixture();
    const jennifer = result.proposedContacts.find((c) => /^jennifer$/i.test(c.displayName));
    expect(jennifer, "Jennifer proposed contact").toBeTruthy();
    expect(jennifer!.mentionLevel).toBe("workflow_participant");
    expect(jennifer!.mentionLevel).not.toBe("confirmed_support_contact");
    expect(contactsReadyToPersist(result.proposedContacts)).toHaveLength(0);

    const cards = buildDebriefActionableReviewCards({
      extraction: result.extraction,
      proposedContacts: result.proposedContacts,
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    });
    const jenniferCard = cards.find(
      (c) => c.category === "workflow_participant" && /jennifer/i.test(c.displayName),
    );
    expect(jenniferCard, "Jennifer contact candidate card").toBeTruthy();
    expect(jenniferCard!.actions.some((a) => a.type === "create_contact")).toBe(true);
    expect(jenniferCard!.headline).toMatch(/jennifer/i);
    expect(jenniferCard!.headline).not.toMatch(/named contact|support contact identified/i);
  });

  it("clinical focus captures robotic ventral hernia and abdominal wall reconstruction", () => {
    const result = runIntroCallFixture();
    const cards = buildDebriefActionableReviewCards({
      extraction: result.extraction,
      proposedContacts: result.proposedContacts,
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    });
    const clinicalCards = cards.filter((c) => c.category === "clinical_focus");
    expect(clinicalCards.length, "clinical focus review cards").toBeGreaterThan(0);
    const blob = clinicalCards
      .map((c) => [c.clinicalCategoryLabel, c.clinicalDisplayValue, c.insightTitle].filter(Boolean).join(" "))
      .join(" ");
    expect(blob).toMatch(/Clinical Trend|Increasing Procedure Volume|Increasing Case Volume/i);
  });

  it("keeps explicit volume trends and excludes planning-only clinical facts", () => {
    const pipeline = runIntroCallFixture();
    const debriefRuns = ufRunsFromTomIntro();
    const proposedContacts = buildInitialProposedContacts({
      review: pipeline.parse,
      sourceReference: "provider:tom-sandy",
    });
    const composed = composeDebriefReviewDisplay({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      logUpdate: { ...pipeline.parse, debriefUniversalFactsRuns: debriefRuns },
      debriefRuns,
      proposedContacts,
    });

    const clinicalFacts = debriefRuns.flatMap((run) =>
      run.facts.filter((fact) =>
        ["procedure_volume_trend", "procedure_focus", "technology_preference"].includes(
          fact.concept,
        ),
      ),
    );
    const clinicalFactText = clinicalFacts
      .map((fact) => `${fact.concept}: ${fact.normalized_label} ${fact.evidence_text}`)
      .join("\n");
    const clinicalCards = composed.actionableCards.filter((card) => card.category === "clinical_focus");
    const clinicalCardText = clinicalCards
      .map((card) => `${card.headline} ${(card.evidenceQuotes ?? []).join(" ")}`)
      .join("\n");

    expect(clinicalFacts).toHaveLength(2);
    expect(clinicalCards).toHaveLength(2);
    expect(clinicalFactText).toMatch(/Robotic ventral hernia repair · Increasing procedure volume/i);
    expect(clinicalFactText).toMatch(/Abdominal wall reconstruction · Increasing procedure volume/i);
    expect(clinicalFactText).not.toMatch(/upcoming robotic hernia cases/i);
    expect(clinicalCardText).not.toMatch(/upcoming robotic hernia cases/i);
    expect(clinicalCardText).toMatch(/doing more robotic ventral hernia repairs lately/i);
    expect(clinicalCardText).toMatch(/higher volume of abdominal wall reconstruction cases/i);
  });

  it("recommended next steps include Jennifer contact info and credentialing pathway", () => {
    const result = runIntroCallFixture();
    const nextSteps = buildDebriefRecommendedNextSteps({
      review: result.parse,
      extraction: result.extraction,
      proposedContacts: result.proposedContacts,
      followUp: { required: [], helpful: [] },
    });
    const combined = nextSteps.join(" ");
    expect(combined).toMatch(/jennifer/i);
    expect(combined).toMatch(/contact|phone|email/i);
    expect(combined).toMatch(/credential|platform|pathway/i);
    expect(combined).not.toMatch(/get surgical's phone/i);
  });

  it("intelligence brief covers contacts, observation access, clinical insights, and follow-up actions", () => {
    const result = runIntroCallFixture();
    const cards = buildDebriefActionableReviewCards({
      extraction: result.extraction,
      proposedContacts: result.proposedContacts,
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    });
    const brief = buildDebriefIntelligenceBrief({ cards });

    expect(brief.contacts.some((c) => /jennifer/i.test(c.primaryLine))).toBe(true);
    // Interest-only debriefs must not surface "Not Yet Approved" — absence of
    // approval is implied by the Interested status.
    expect(brief.observationAccess?.bullets).toEqual(
      expect.arrayContaining(["Interested", "Credentialing Required"]),
    );
    expect(brief.observationAccess?.bullets).not.toContain("Not Yet Approved");
    expect(brief.clinicalInsights.length).toBeGreaterThanOrEqual(1);
    expect(brief.followUpActions.length).toBeGreaterThanOrEqual(2);

    const outcomes = buildIntelligenceBriefOutcomes(brief);
    expect(outcomes.filter((outcome) => outcome.kind === "clinical_insight").length).toBeGreaterThanOrEqual(1);
    // Cross-section dedup: contact-info and credentialing follow-ups are
    // already represented by the Jennifer contact row and the credentialing
    // requirements chip, so they must not repeat as Follow-Up rows.
    const followUpLines = outcomes
      .filter((outcome) => outcome.kind === "follow_up")
      .map((outcome) => outcome.summaryLine.toLowerCase());
    expect(followUpLines.length).toBeGreaterThanOrEqual(1);
    expect(followUpLines.some((line) => /jennifer/.test(line) && /contact/.test(line))).toBe(false);
    expect(followUpLines.some((line) => /credential/.test(line))).toBe(false);

    const grouped = followUpOutcomesByPriority(outcomes);
    expect(grouped.high.length + grouped.medium.length + grouped.low.length).toBeGreaterThanOrEqual(1);

    const summary = buildDebriefReviewSummary({ outcomes, providerLabel: "Tom Sandy" });
    expect(summary.takeaways.join("\n")).toMatch(/Jennifer identified as scheduling coordinator/i);
    expect(summary.takeaways.join("\n")).toMatch(/observation|credential/i);

    const briefCopy = [
      INTELLIGENCE_BRIEF_SECTION.contacts,
      INTELLIGENCE_BRIEF_SECTION.observationAccess,
      INTELLIGENCE_BRIEF_SECTION.clinicalInsights,
      INTELLIGENCE_BRIEF_SECTION.followUpActions,
      ...brief.contacts.map((c) => [c.primaryLine, c.subtitle ?? ""].join(" ")),
      ...(brief.observationAccess?.bullets ?? []),
      ...brief.clinicalInsights.map((c) => c.primaryLine),
      ...brief.followUpActions.map((f) => f.primaryLine),
    ].join("\n");

    expect(briefCopy).not.toMatch(/Contact Candidate|Possible Role|Confidence|Observation Status/i);
    expect(briefCopy).toMatch(/jennifer/i);
    expect(brief.followUpActions.some((f) => /jennifer/i.test(f.primaryLine))).toBe(true);
    expect(
      brief.followUpActions.some((f) =>
        /credential|pathway/i.test(displayFollowUpAction(f.primaryLine)),
      ),
    ).toBe(true);
  });

  it("actionable review cards cover five categories without Learned summaries or internal taxonomy", () => {
    const result = runIntroCallFixture();
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

    const reviewCopy = cards
      .flatMap((c) => {
        const shared = [DEBRIEF_REVIEW_CATEGORY_LABELS[c.category], ...c.evidenceQuotes, ...c.actions.map((a) => a.label)];
        if (c.category === "workflow_participant") {
          return [c.displayName, c.roleValue ?? "", c.confidence, ...shared];
        }
        if (c.category === "observation_access") {
          return [c.observationStatus, c.approval, c.credentialing, ...shared];
        }
        if (c.category === "clinical_focus") {
          return [c.insightTitle, ...shared];
        }
        if (c.category === "follow_up_task") {
          return [c.taskTitle, c.followUpReason ?? "", c.suggestedDue ?? "", ...shared];
        }
        return [c.topicTitle, ...shared];
      })
      .join("\n");

    expect(reviewCopy).not.toMatch(INTERNAL_TAXONOMY_RE);
    expect(reviewCopy).not.toMatch(/\bLearned\b/i);
    expect(reviewCopy).not.toMatch(/access summary|key takeaway|appears possible/i);
    const allowedCategories = new Set([
      "workflow_participant",
      "observation_access",
      "clinical_focus",
      "organization_intelligence",
      "follow_up_task",
      "product_intelligence",
    ]);
    expect(cards.every((c) => allowedCategories.has(c.category))).toBe(true);
  });
});

function nextStepsFrom(result: ReturnType<typeof runIntroCallFixture>): string[] {
  return buildDebriefRecommendedNextSteps({
    review: result.parse,
    extraction: result.extraction,
    proposedContacts: result.proposedContacts,
    followUp: { required: [], helpful: [] },
  });
}
