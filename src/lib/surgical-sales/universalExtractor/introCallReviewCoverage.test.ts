import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import {
  buildIntelligenceBriefOutcomes,
  groupClinicalInsightOutcomes,
  type IntelligenceBriefOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const DR_ELENA_VEGA_INTRO = `I met with Dr. Elena Vega today for an introductory conversation. The discussion went well and she seemed open to continuing the relationship. She did not approve observation today but was receptive and said we should coordinate with her office team.

He mentioned that Rachel handles most case scheduling and would be the best contact for observation timing. I still need her direct contact information.

Clinically, Dr. Vega said lumbar fusion volume has increased compared to prior years and cervical disc cases remain a major focus. Referral volume has been strong for complex spine deformity work.

During product discussion she said they currently use Medtronic for many lumbar fusion procedures. She mentioned occasional frustrations with instrumentation availability and OR efficiency when multiple spine cases run on the same day.

She emphasized workflow efficiency and consistency as priorities for the surgical team. Reducing setup steps can improve turnover and staff satisfaction.

No formal evaluation was discussed. She suggested observing a case before a detailed alternative solutions conversation.

My next step is to connect with Rachel regarding scheduling requirements and determine whether observation access can be arranged for an upcoming lumbar fusion case.`;

const DR_MARCUS_CHEN_INTRO = `Introductory call with Dr. Marcus Chen went well. He is open to continuing the relationship and was receptive to observation after coordinating with his team, though nothing was approved today.

Amanda handles most scheduling for his hernia cases and would be the right person for observation access. I still need her phone number.

Clinically he is doing more robotic inguinal hernia repairs and ventral hernia volume has picked up. Referral volume for complex abdominal wall cases has been strong.

They currently use Bard mesh for many ventral cases. He mentioned instrumentation availability frustrations and OR efficiency concerns when multiple hernia cases stack on one day.

Workflow efficiency, consistency, and turnover time matter to his team. Staff satisfaction improves when setup steps are reduced.

No formal evaluation was planned. Observing a case first makes sense before discussing alternatives.

My next step is to connect with Amanda about scheduling and line up a robotic hernia observation.`;

const DR_PRIYA_KAPOOR_INTRO = `Met Dr. Priya Kapoor for an intro conversation. She seemed open to continuing discussions and was receptive to observation after office coordination, but observation was not approved today.

Daniel coordinates trauma scheduling and would be the best contact for case observation timing. I still need his email.

Clinically she reported ankle fracture volume has increased compared to prior years and pilon fracture cases remain a major focus. Referral volume for lower extremity trauma has been strong.

They use Stryker for many ankle fracture procedures. She noted instrumentation availability issues and OR efficiency friction when multiple trauma cases overlap.

Consistency, workflow efficiency, and turnover are priorities for the OR team. Fewer setup steps help staff satisfaction.

No formal product evaluation was discussed. Case observation should come before a deeper alternatives conversation.

My next step is to connect with Daniel regarding scheduling requirements for an upcoming ankle fracture observation.`;

const DR_MARK_SALT_INTRO = `I met with Dr. Mark Salt today for an introductory conversation. Overall the discussion went well and he seemed open to continuing the relationship. He did not formally approve a case observation today, but he was receptive to the idea and said we should continue the conversation after coordinating with his office staff.

He mentioned that Jennifer handles most of the scheduling and coordination for cases and would likely be the best person to work with regarding observation access and timing. I still need her direct contact information, but she appears to be the primary scheduling coordinator.

Clinically, Dr. Salt said they have been seeing an increase in distal radius fractures and upper extremity trauma cases compared to previous years. He noted that referral volume has been strong and that complex fracture patterns are becoming more common in his practice.

During the product discussion, he stated they currently use Acumed for many of their distal radius fracture procedures. While he seemed generally comfortable with their current approach, he mentioned there are occasional frustrations related to instrumentation availability and operating room efficiency when multiple trauma cases are being managed on the same day.

He emphasized that consistency and workflow efficiency are important priorities for both himself and the surgical team. He also mentioned that reducing unnecessary steps during case setup can have a meaningful impact on turnover time and staff satisfaction.

No formal product evaluation was discussed during this meeting. Dr. Salt suggested that observing a case would be the best next step before having a more detailed conversation about alternative solutions. He appeared interested in continuing discussions once we have a better understanding of his current workflow.

My next step is to connect with Jennifer regarding scheduling requirements and determine whether observation access can be arranged for an upcoming distal radius fracture case.`;

const DR_TOM_LETTUCE_INTRO = `This was my first visit with Dr. Tom Lettuce's office today. I introduced myself and explained who we are and the products we represent. I didn't get much time with the surgeon because he was heading into the OR, but he was friendly and said he'd be willing to talk after I observe a case.

I spent a few minutes with Sarah, the scheduling coordinator. She handles observation requests and asked me to email her available dates. She also said she likes at least two weeks' notice when arranging observations.

Sarah mentioned that Dr. Lettuce currently uses Bard Soft Mesh for most ventral hernia repairs. She wasn't sure if he has evaluated any alternative products recently but said he's usually open to looking at new technology if it solves a problem for him.

Overall it was a positive introduction. My next step is to send Sarah available observation dates and schedule my first case.`;

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

function composedReview(dictation: string, captureId: string) {
  const pipeline = runDebriefExtractionPipeline({ dictation });
  const debriefRuns = ufRunsFromDictation(dictation, captureId);
  return composeDebriefReviewDisplay({
    dictation,
    logUpdate: {
      ...pipeline.parse,
      debriefUniversalFactsRuns: debriefRuns,
    },
    debriefRuns,
    proposedContacts: pipeline.proposedContacts,
  });
}

function outcomesByKind(outcomes: IntelligenceBriefOutcome[]) {
  return {
    clinical: outcomes.filter((row) => row.kind === "clinical_insight"),
    product: outcomes.filter((row) => row.kind === "product_intelligence"),
    workflow: outcomes.filter((row) => row.kind === "workflow_insight"),
    observation: outcomes.filter((row) => row.kind === "observation_access"),
    contact: outcomes.filter((row) => row.kind === "contact"),
    followUp: outcomes.filter((row) => row.kind === "follow_up"),
  };
}

function assertIntroCallReviewCoverage(
  dictation: string,
  captureId: string,
  contactName: string,
  options?: { minClinical?: number },
) {
  const minClinical = options?.minClinical ?? 2;
  const { facts } = extractUniversalSurgicalFacts({
    raw_note: dictation,
    declared_source_type: "intro_call",
  });
  expect(facts.some((fact) => fact.concept === "contact_role")).toBe(true);

  const composed = composedReview(dictation, captureId);
  expect(composed.displaySource).toBe("uf_authority");

  const outcomes = buildIntelligenceBriefOutcomes(composed.brief);
  const grouped = outcomesByKind(outcomes);

  expect(grouped.clinical.length).toBeGreaterThanOrEqual(minClinical);
  const clinicalLines = grouped.clinical.map((row) => row.primaryLine ?? row.summaryLine);
  if (minClinical >= 2) {
    expect(new Set(clinicalLines).size).toBeGreaterThanOrEqual(2);
    expect(clinicalLines.every((line) => line.trim().length > 0)).toBe(true);
  }

  const clinicalGroups = groupClinicalInsightOutcomes(outcomes);
  const groupedClinicalCount = clinicalGroups.reduce((sum, group) => sum + group.outcomes.length, 0);
  expect(groupedClinicalCount).toBeGreaterThanOrEqual(minClinical);

  expect(grouped.product.length).toBeGreaterThanOrEqual(1);
  expect(grouped.workflow.length).toBeGreaterThanOrEqual(2);
  expect(
    grouped.workflow.every((row) => !/commercial disposition|relationship:/i.test(row.summaryLine)),
  ).toBe(true);
  expect(grouped.observation.length).toBeGreaterThanOrEqual(1);
  expect(grouped.contact.length).toBeGreaterThanOrEqual(1);
  const contactSurfaces = [
    ...grouped.contact.map((row) => row.summaryLine),
    ...composed.actionableCards
      .filter((card) => card.category === "workflow_participant")
      .map((card) => card.headline),
  ];
  expect(contactSurfaces.some((line) => new RegExp(contactName, "i").test(line))).toBe(true);

  expect(
    composed.actionableCards.filter((card) => (card.evidenceQuotes?.length ?? 0) > 0).length,
  ).toBeGreaterThanOrEqual(4);
  expect(outcomes.filter((row) => row.evidenceQuotes.length > 0).length).toBeGreaterThanOrEqual(6);

  expect(outcomes.length).toBeGreaterThanOrEqual(10);
}

describe("intro call review coverage — UF authority", () => {
  beforeEach(() => {
    vi.stubEnv("UF_AUTHORITY_REVIEW", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("surfaces distinct clinical, workflow, access, contact, product, and follow-up outcomes for Dr. Elena Vega", () => {
    assertIntroCallReviewCoverage(DR_ELENA_VEGA_INTRO, "capture-vega", "Rachel");
  });

  it("surfaces full review coverage for Dr. Marcus Chen hernia intro", () => {
    assertIntroCallReviewCoverage(DR_MARCUS_CHEN_INTRO, "capture-chen", "Amanda");
  });

  it("surfaces full review coverage for Dr. Priya Kapoor trauma intro", () => {
    assertIntroCallReviewCoverage(DR_PRIYA_KAPOOR_INTRO, "capture-kapoor", "Daniel");
  });

  it("surfaces Salt intro without commercial disposition noise and with evidence quotes", () => {
    assertIntroCallReviewCoverage(DR_MARK_SALT_INTRO, "capture-salt", "Jennifer", {
      minClinical: 1,
    });
  });

  it("keeps current product and open-new-technology interest as separate product outcomes", () => {
    const composed = composedReview(DR_TOM_LETTUCE_INTRO, "capture-lettuce");
    const outcomes = buildIntelligenceBriefOutcomes(composed.brief);
    const productLines = outcomes
      .filter((row) => row.kind === "product_intelligence")
      .map((row) => `${row.summaryLine} ${row.statusLine ?? ""} ${row.productImpactLine ?? ""}`)
      .join("\n");

    expect(productLines).toMatch(/Bard Soft Mesh/i);
    expect(productLines).toMatch(/open to new technology/i);
  });
});
