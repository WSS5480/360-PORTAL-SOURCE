import { describe, expect, it } from "vitest";

import {
  buildDebriefActionableReviewCards,
} from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
  flattenedClinicalOutcomes,
  followUpOutcomesByPriority,
  groupClinicalInsightOutcomes,
  intelligenceBriefItemCount,
  orderedFollowUpOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  displayClinicalInsight,
  displayFollowUpAction,
  INTELLIGENCE_BRIEF_CONTACT_STATUS,
  INTELLIGENCE_BRIEF_OBSERVATION_LABEL,
  INTELLIGENCE_BRIEF_SECTION,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { buildDebriefReviewSummary } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewSummary";
import { buildDebriefReviewDecisions } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisions";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandin";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";

const FORBIDDEN_BRIEF_STRINGS = [
  "Confidence",
  "Possible Role",
  "Procedures / case mix",
  "Technique / modality",
  "Communication preference",
  "Contact Candidate",
  "Observation Status",
  "Save Access Intelligence",
  "Add Clinical Insight",
  "Referenced but not captured",
  "referenced but not captured",
  "Category",
];

const TOM_SANDY_CONTEXT = buildDebriefReviewDecisionContext({
  providerLabel: "Tom Sandy",
  providerContact: { first_name: "Tom", last_name: "Sandy" },
});

function runTomSandyProductionScenario() {
  const dictation =
    "I met with Tom Sandy for the intro call. He wasn't opposed to having me observe a case, but he said we need to work through a couple things first. He mentioned that Jennifer in his office usually handles a lot of the scheduling coordination and works closely with the hospital OR scheduling team, but I do not have her phone or email yet. Tom said vendor credentialing is normally required before anybody can get into the OR. When I asked about observation access he said it's usually not a problem once the credentialing process is complete and the timing works for the surgical schedule. Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago. No observation was approved today and we didn't discuss specific dates. My next step is to identify Jennifer's contact information, confirm the credentialing pathway, and better understand what upcoming robotic hernia cases might be available for observation.";

  const facts: DebriefAtomicFact[] = [
    {
      fact_type: "workflow_contact",
      entity: "Jennifer",
      attribute: "role",
      value: "Scheduling Coordinator",
      confidence: "high",
      evidence:
        "He mentioned that Jennifer in his office usually handles a lot of the scheduling coordination and works closely with the hospital OR scheduling team.",
    },
    {
      fact_type: "observation_access",
      entity: "",
      attribute: "status",
      value: "interested",
      confidence: "medium",
      evidence:
        "He wasn't opposed to having me observe a case, but he said we need to work through a couple things first.",
    },
    {
      fact_type: "observation_access",
      entity: "",
      attribute: "status",
      value: "not approved today",
      confidence: "high",
      evidence: "No observation was approved today and we didn't discuss specific dates.",
    },
    {
      fact_type: "credentialing",
      entity: "",
      attribute: "requirement",
      value: "required",
      confidence: "high",
      evidence: "Tom said vendor credentialing is normally required before anybody can get into the OR.",
    },
    {
      fact_type: "clinical_focus",
      entity: "",
      attribute: "increasing_procedure_volume",
      value: "Robotic ventral hernia repair · Increasing procedure volume",
      confidence: "medium",
      evidence:
        "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.",
    },
    {
      fact_type: "clinical_focus",
      entity: "",
      attribute: "increasing_procedure_volume",
      value: "Abdominal wall reconstruction · Increasing procedure volume",
      confidence: "medium",
      evidence:
        "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.",
    },
    {
      fact_type: "follow_up",
      entity: "",
      attribute: "action",
      value:
        "My next step is to identify Jennifer's contact information, confirm the credentialing pathway, and better understand what upcoming robotic hernia cases might be available for observation",
      confidence: "medium",
      evidence:
        "My next step is to identify Jennifer's contact information, confirm the credentialing pathway, and better understand what upcoming robotic hernia cases might be available for observation.",
    },
  ];

  const parse = buildParseResultFromDebriefFacts({
    sourceText: dictation,
    facts,
    context: {
      providerId: "provider-test",
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
  const decisions = buildDebriefReviewDecisions({
    dictation,
    atomicFacts: parse.atomicFacts ?? [],
    fieldUpdates: parse.fieldUpdates ?? [],
    proposedContacts,
    guardContext: TOM_SANDY_CONTEXT,
  });
  const cards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts,
    dictation,
    guardContext: TOM_SANDY_CONTEXT,
  });
  const brief = buildDebriefIntelligenceBrief({ cards, decisions });
  return { dictation, decisions, cards, brief, extraction, proposedContacts };
}

function runIntroCallScenario() {
  const dictation = INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION;
  const facts = buildRegressionAtomicFactsFromDictation(dictation);
  const parse = buildParseResultFromDebriefFacts({
    sourceText: dictation,
    facts,
    context: {
      providerId: "provider-test",
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
  const cards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts,
    dictation,
    guardContext: TOM_SANDY_CONTEXT,
  });
  return { cards, brief: buildDebriefIntelligenceBrief({ cards }) };
}

function briefRenderText(brief: ReturnType<typeof buildDebriefIntelligenceBrief>): string {
  const lines: string[] = [
    INTELLIGENCE_BRIEF_SECTION.contacts,
    ...brief.contacts.map((c) => [c.primaryLine, c.subtitle ?? ""].filter(Boolean).join(" — ")),
    INTELLIGENCE_BRIEF_SECTION.observationAccess,
    ...(brief.observationAccess?.bullets ?? []),
    INTELLIGENCE_BRIEF_SECTION.clinicalInsights,
    ...brief.clinicalInsights.map((c) => c.primaryLine),
    INTELLIGENCE_BRIEF_SECTION.followUpActions,
    ...brief.followUpActions.map((f) => f.primaryLine),
  ];
  return lines.join("\n");
}

describe("buildDebriefIntelligenceBrief", () => {
  it("maps Tom Sandy production facts into four intelligence brief sections", () => {
    const { brief } = runTomSandyProductionScenario();

    expect(brief.contacts).toHaveLength(1);
    expect(brief.contacts[0]?.primaryLine).toBe("Jennifer");
    expect(brief.contacts[0]?.subtitle).toMatch(/scheduling coordinator/i);

    expect(brief.observationAccess).not.toBeNull();
    // Interest-only debriefs no longer surface a redundant "Not Yet Approved" chip.
    expect(brief.observationAccess?.bullets).toEqual([
      "Interested",
      "Credentialing Required",
    ]);

    expect(brief.clinicalInsights).toHaveLength(2);
    expect(brief.clinicalInsights.map((c) => c.categoryLabel)).toEqual([
      "Clinical Trend",
      "Clinical Trend",
    ]);
    expect(brief.clinicalInsights.map((c) => c.displayValue)).toEqual([
      "Increasing Procedure Volume",
      "Increasing Procedure Volume",
    ]);

    expect(brief.followUpActions).toHaveLength(3);
    expect(brief.followUpActions.map((f) => f.primaryLine)).toEqual([
      "Get Jennifer contact information",
      "Confirm credentialing pathway",
      "Identify upcoming robotic hernia observation opportunities",
    ]);
  });

  it("groups clinical insight outcomes under category section headers", () => {
    const { brief } = runTomSandyProductionScenario();
    const groups = groupClinicalInsightOutcomes(buildIntelligenceBriefOutcomes(brief));

    expect(groups).toHaveLength(1);
    expect(groups[0]?.groupLabel).toBe("Clinical Trends");
    expect(groups[0]?.outcomes.map((outcome) => outcome.primaryLine)).toEqual([
      "Robotic ventral hernia repair",
      "Abdominal wall reconstruction",
    ]);
  });

  it("contains no schema-oriented review strings in the brief model", () => {
    const { brief } = runTomSandyProductionScenario();
    const rendered = briefRenderText(brief);
    for (const forbidden of FORBIDDEN_BRIEF_STRINGS) {
      expect(rendered).not.toContain(forbidden);
    }
  });

  it("counts individual conversation outcomes for approval panel hint", () => {
    const { brief } = runTomSandyProductionScenario();
    // Follow-ups already represented by the Jennifer contact row and the
    // Credentialing Required chip are suppressed (cross-section dedup).
    expect(intelligenceBriefItemCount(brief)).toBe(5);
    const outcomes = buildIntelligenceBriefOutcomes(brief);
    expect(outcomes).toHaveLength(5);
    expect(outcomes.filter((outcome) => outcome.kind === "clinical_insight")).toHaveLength(2);
    expect(outcomes.filter((outcome) => outcome.kind === "follow_up")).toHaveLength(1);
  });

  it("builds structured observation fields and contact summary lines on outcomes", () => {
    const { brief } = runTomSandyProductionScenario();
    const outcomes = buildIntelligenceBriefOutcomes(brief);

    const contact = outcomes.find((outcome) => outcome.kind === "contact");
    expect(contact?.summaryLine).toMatch(/Jennifer — Scheduling Coordinator/i);
    expect(contact?.statusLine).toBe(INTELLIGENCE_BRIEF_CONTACT_STATUS);

    const observation = outcomes.find((outcome) => outcome.kind === "observation_access");
    expect(observation?.summaryLine).toBe("Observation access");
    expect(observation?.observationFields).toEqual({
      status: "Interested",
      // Interest-only: absence of approval is implied, no redundant chip.
      approval: "",
      requirements: "Credentialing Required",
    });
    expect(contact?.pathwayImpactLine).toBe("Observation logistics can now be coordinated.");
    expect(observation?.pathwayImpactLine).toBe("Access remains dependent on vendor clearance.");
  });

  it("suppresses follow-ups already represented by confirmed intelligence", () => {
    const { brief } = runTomSandyProductionScenario();
    const outcomes = buildIntelligenceBriefOutcomes(brief);
    const followUpLines = outcomes
      .filter((outcome) => outcome.kind === "follow_up")
      .map((outcome) => outcome.summaryLine);

    // "Get Jennifer contact information" duplicates the Jennifer contact row;
    // "Confirm credentialing pathway" duplicates the Credentialing Required chip.
    expect(followUpLines).toEqual([
      "Identify upcoming robotic hernia observation opportunities",
    ]);

    const grouped = followUpOutcomesByPriority(outcomes);
    expect(grouped.high).toHaveLength(0);
    expect(grouped.medium.map((outcome) => outcome.summaryLine)).toEqual([
      "Identify upcoming robotic hernia observation opportunities",
    ]);
    expect(grouped.low).toHaveLength(0);
  });

  it("builds debrief review summary takeaways from outcomes", () => {
    const { brief } = runTomSandyProductionScenario();
    const outcomes = buildIntelligenceBriefOutcomes(brief);
    const summary = buildDebriefReviewSummary({
      outcomes,
      providerLabel: "Tom Sandy",
    });

    expect(summary.providerLabel).toBe("Tom Sandy");
    expect(summary.takeaways).toEqual([
      "Observation interest noted",
      "Credentialing required",
      "Jennifer identified as scheduling coordinator",
      "Identify upcoming robotic hernia observation opportunities",
    ]);
    expect(summary.takeaways.join("\n")).not.toMatch(
      /Observation Status|Possible Role|Confidence|Clinical Trend/i,
    );
  });

  it("formats clinical insight titles as normalized procedure focus lines", () => {
    expect(
      displayClinicalInsight("Robotic ventral hernia repair · Increasing procedure volume"),
    ).toBe("Robotic ventral hernia repair");
    expect(
      displayClinicalInsight("Abdominal wall reconstruction · Increasing case volume"),
    ).toBe("Abdominal wall reconstruction");
  });

  it("uses business-language observation field labels in copy constants", () => {
    expect(INTELLIGENCE_BRIEF_OBSERVATION_LABEL.status).toBe("Status");
    expect(INTELLIGENCE_BRIEF_OBSERVATION_LABEL.approval).toBe("Approval");
    expect(INTELLIGENCE_BRIEF_OBSERVATION_LABEL.requirements).toBe("Requirements");
  });

  it("formats follow-up display titles without possessive phone template", () => {
    expect(displayFollowUpAction("Get Jennifer's phone or email.")).toBe(
      "Get Jennifer contact information",
    );
    expect(
      displayFollowUpAction(
        "Better understand what upcoming robotic hernia cases might be available for observation",
      ),
    ).toBe("Identify upcoming robotic hernia observation opportunities");
  });

  it("maps intro-call regression dictation through cards into brief sections", () => {
    const { brief } = runIntroCallScenario();
    expect(brief.contacts.some((c) => /jennifer/i.test(c.primaryLine))).toBe(true);
    expect(brief.observationAccess?.bullets.some((b) => /interested/i.test(b))).toBe(true);
    expect(brief.clinicalInsights.length).toBeGreaterThan(0);
    expect(brief.followUpActions.length).toBeGreaterThanOrEqual(2);
  });
});

function organizationCard(topicTitle: string) {
  return {
    id: `org-${topicTitle.slice(0, 12)}`,
    category: "organization_intelligence" as const,
    headline: topicTitle,
    topicTitle,
    evidenceQuotes: [],
    actions: [],
    linkedFieldUpdateIds: [],
    linkedIntelligenceIds: [],
    fields: [],
  };
}

describe("business-outcome review redesign", () => {
  it("uses business card names — not extraction taxonomy — for review sections", () => {
    expect(INTELLIGENCE_BRIEF_SECTION.contacts).toBe("Contacts");
    expect(INTELLIGENCE_BRIEF_SECTION.observationAccess).toBe("Access Pathway");
    expect(INTELLIGENCE_BRIEF_SECTION.clinicalInsights).toBe("Clinical Trends");
    expect(INTELLIGENCE_BRIEF_SECTION.productIntelligence).toBe("Product Interest");
    expect(INTELLIGENCE_BRIEF_SECTION.workflowInsights).toBe("Workflow & Priorities");
    expect(INTELLIGENCE_BRIEF_SECTION.followUpActions).toBe("Next Actions");
  });

  it("routes non-credentialing facility findings to the Workflow Insights card", () => {
    const brief = buildDebriefIntelligenceBrief({
      cards: [organizationCard("Facility intelligence")],
    });
    expect(brief.workflowInsights).toHaveLength(1);
    expect(brief.observationAccess).toBeNull();

    const outcomes = buildIntelligenceBriefOutcomes(brief);
    const workflow = outcomes.find((outcome) => outcome.kind === "workflow_insight");
    expect(workflow?.summaryLine).toBe("Facility intelligence");
  });

  it("keeps credentialing facility findings on the Observation Access card", () => {
    const brief = buildDebriefIntelligenceBrief({
      cards: [organizationCard("Facility vendor credentialing")],
    });
    expect(brief.workflowInsights).toHaveLength(0);
    expect(brief.observationAccess).not.toBeNull();
  });

  it("orders follow-ups flat by urgency without rep-visible priority chips", () => {
    const { brief } = runTomSandyProductionScenario();
    const outcomes = buildIntelligenceBriefOutcomes(brief);
    const ordered = orderedFollowUpOutcomes(outcomes);
    const grouped = followUpOutcomesByPriority(outcomes);
    expect(ordered).toEqual([...grouped.high, ...grouped.medium, ...grouped.low]);
  });

  it("confirmed scheduling contact removes the contradictory still-to-confirm item", () => {
    const { extraction, proposedContacts } = runTomSandyProductionScenario();
    expect(proposedContacts.some((c) => /jennifer/i.test(c.displayName))).toBe(true);
    // Jennifer is identified as the scheduling coordinator in this review, so
    // no unresolved item may simultaneously ask to confirm the scheduling owner.
    expect(
      extraction.unresolvedItems.some(
        (item) => /schedul/i.test(item) && /(owner|coordinator|who|named|confirm)/i.test(item),
      ),
    ).toBe(false);
  });

  it("flattens clinical outcomes (deduped) without sub-category headings", () => {
    const { brief } = runTomSandyProductionScenario();
    const outcomes = buildIntelligenceBriefOutcomes(brief);
    const flat = flattenedClinicalOutcomes(outcomes);
    expect(flat.map((outcome) => outcome.primaryLine)).toEqual([
      "Robotic ventral hernia repair",
      "Abdominal wall reconstruction",
    ]);
  });
});
