import { describe, expect, it } from "vitest";

import {
  buildDebriefActionableReviewCards,
  buildReviewDecisionsForExtraction,
} from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  buildDebriefReviewDecisions,
  MAX_FOLLOW_UP_DECISIONS,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisions";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";

const TOM_SANDY_CONTEXT = buildDebriefReviewDecisionContext({
  providerLabel: "Tom Sandy",
  providerContact: { first_name: "Tom", last_name: "Sandy" },
});

function runScenario(input: {
  dictation: string;
  facts?: DebriefAtomicFact[];
  guardContext?: ReturnType<typeof buildDebriefReviewDecisionContext>;
}) {
  const facts = input.facts ?? buildRegressionAtomicFactsFromDictation(input.dictation);
  const parse = buildParseResultFromDebriefFacts({
    sourceText: input.dictation,
    facts,
    context: {
      providerId: "provider-test",
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    },
    existingFields: {},
    mappingSource: "regression_stand_in",
  });
  const guardContext = input.guardContext ?? TOM_SANDY_CONTEXT;
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
    dictation: input.dictation,
    atomicFacts: parse.atomicFacts ?? [],
    fieldUpdates: parse.fieldUpdates ?? [],
    proposedContacts,
    guardContext,
  });
  const cards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts,
    dictation: input.dictation,
    guardContext,
  });
  return { parse, extraction, proposedContacts, decisions, cards, guardContext };
}

describe("buildDebriefReviewDecisions", () => {
  it("noisy Tom Sandy dictation — deduped decisions without provider contact", () => {
    const { decisions, cards } = runScenario({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    });

    const contacts = decisions.filter((d) => d.type === "contact_candidate");
    const followUps = decisions.filter((d) => d.type === "follow_up_task");
    const observation = decisions.find((d) => d.type === "observation_access_update");

    expect(contacts.map((d) => d.displayName)).toEqual(["Jennifer"]);
    expect(contacts.some((d) => /tom/i.test(d.displayName ?? ""))).toBe(false);
    expect(followUps.length).toBeLessThanOrEqual(MAX_FOLLOW_UP_DECISIONS);
    expect(followUps.some((d) => /tom/i.test(d.taskTitle ?? ""))).toBe(false);
    expect(observation?.observationStatus).toMatch(/interested/i);
    expect(observation?.approval).toBe("Not Confirmed");
    expect(observation?.credentialingSummary).toMatch(/required/i);
    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(cards.length).toBeLessThanOrEqual(7);

    const createContact = cards.find((c) => c.category === "workflow_participant");
    expect(createContact?.actions.some((a) => a.type === "create_contact")).toBe(true);
    expect(createContact?.actions.some((a) => a.type === "link_contact")).toBe(true);
    expect(createContact?.actions.some((a) => a.type === "ignore")).toBe(true);

    const obsCard = cards.find((c) => c.category === "observation_access");
    expect(obsCard?.actions.some((a) => a.type === "update_access_status")).toBe(true);

    const clinical = cards.filter((c) => c.category === "clinical_focus");
    expect(clinical.every((c) => c.actions.some((a) => a.type === "add_clinical_focus"))).toBe(true);
  });

  it("clean Jennifer-only dictation — one contact and one follow-up", () => {
    const dictation =
      "Jennifer in his office usually handles scheduling coordination. I don't have her contact information yet.";
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
    const { decisions } = runScenario({ dictation, facts });

    expect(decisions.filter((d) => d.type === "contact_candidate")).toHaveLength(1);
    expect(decisions.filter((d) => d.type === "follow_up_task")).toHaveLength(1);
    expect(decisions.filter((d) => d.type === "follow_up_task")[0]?.taskTitle).toMatch(
      /get jennifer's phone or email/i,
    );
  });

  it("no-contact observation-only dictation — no contact candidates", () => {
    const dictation =
      "When I asked about observation access he said it's usually not a problem once credentialing is complete. No observation was approved today.";
    const { decisions } = runScenario({ dictation });

    expect(decisions.filter((d) => d.type === "contact_candidate")).toHaveLength(0);
    expect(decisions.some((d) => d.type === "observation_access_update")).toBe(true);
  });

  it("provider-name false positive — Tom Sandy never becomes contact or follow-up", () => {
    const dictation =
      "Met with Tom Sandy today. Tom said vendor credentialing is required. I don't have Tom's contact information yet.";
    const facts: DebriefAtomicFact[] = [
      {
        fact_type: "workflow_contact",
        entity: "Tom",
        attribute: "role",
        value: "Workflow participant",
        confidence: "medium",
        evidence: "Tom said vendor credentialing is required.",
      },
      {
        fact_type: "workflow_contact",
        entity: "Tom Sandy",
        attribute: "role",
        value: "Provider",
        confidence: "medium",
        evidence: "Met with Tom Sandy today.",
      },
      {
        fact_type: "credentialing",
        entity: "",
        attribute: "requirement",
        value: "discussed",
        confidence: "medium",
        evidence: "Tom said vendor credentialing is required.",
      },
    ];
    const { decisions, cards } = runScenario({ dictation, facts });

    expect(decisions.filter((d) => d.type === "contact_candidate")).toHaveLength(0);
    expect(decisions.filter((d) => d.type === "follow_up_task")).toHaveLength(0);
    expect(cards.filter((c) => c.category === "workflow_participant")).toHaveLength(0);
  });

  it("duplicate clinical facts — one card per clinical concept", () => {
    const dictation =
      "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.";
    const facts: DebriefAtomicFact[] = [
      {
        fact_type: "clinical_focus",
        entity: "",
        attribute: "procedure",
        value: "Robotic ventral hernia volume increasing",
        confidence: "medium",
        evidence: dictation,
      },
      {
        fact_type: "clinical_focus",
        entity: "",
        attribute: "procedure",
        value: "Robotic ventral hernia volume increasing",
        confidence: "medium",
        evidence: dictation,
      },
      {
        fact_type: "clinical_focus",
        entity: "",
        attribute: "procedure",
        value: "Abdominal wall reconstruction volume increasing",
        confidence: "medium",
        evidence: dictation,
      },
    ];
    const { decisions, cards } = runScenario({ dictation, facts });

    // One card per concept: VH volume trend, AWR volume trend, robotic technique.
    const clinicalDecisions = decisions.filter((d) => d.type === "clinical_focus_update");
    expect(clinicalDecisions).toHaveLength(3);
    expect(clinicalDecisions.map((d) => d.insightTitle ?? "").join("\n")).toMatch(/Robotic ventral hernia repair/);
    expect(clinicalDecisions.map((d) => d.insightTitle ?? "").join("\n")).toMatch(/Abdominal wall reconstruction/);
    expect(clinicalDecisions.map((d) => d.insightTitle ?? "").join("\n")).toMatch(/Technique \/ Modality · Robotic/);
    expect(cards.filter((c) => c.category === "clinical_focus")).toHaveLength(3);
  });

  it("buildReviewDecisionsForExtraction returns canonical decision types", () => {
    const { extraction, proposedContacts } = runScenario({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    });
    const decisions = buildReviewDecisionsForExtraction({
      extraction,
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      proposedContacts,
      guardContext: TOM_SANDY_CONTEXT,
    });
    expect(decisions.every((d) => d.dedupeKey.length > 0)).toBe(true);
    expect(new Set(decisions.map((d) => d.dedupeKey)).size).toBe(decisions.length);
  });

  it("production-like OpenAI facts — curly apostrophes and negated approval", () => {
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
        evidence: "He wasn't opposed to having me observe a case, but he said we need to work through a couple things first.",
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
        attribute: "procedure",
        value: "Robotic ventral hernia volume increasing",
        confidence: "medium",
        evidence:
          "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.",
      },
      {
        fact_type: "clinical_focus",
        entity: "",
        attribute: "procedure",
        value: "Abdominal wall reconstruction volume increasing",
        confidence: "medium",
        evidence:
          "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.",
      },
      {
        fact_type: "follow_up",
        entity: "",
        attribute: "action",
        value: `My next step is to identify Jennifer\u2019s contact information, confirm the credentialing pathway, and better understand what upcoming robotic hernia cases might be available for observation`,
        confidence: "medium",
        evidence: `My next step is to identify Jennifer\u2019s contact information, confirm the credentialing pathway, and better understand what upcoming robotic hernia cases might be available for observation.`,
      },
    ];

    const { decisions, cards } = runScenario({ dictation, facts });

    const contact = decisions.find((d) => d.type === "contact_candidate");
    const observation = decisions.find((d) => d.type === "observation_access_update");
    const followUps = decisions.filter((d) => d.type === "follow_up_task");

    expect(contact?.displayName).toBe("Jennifer");
    expect(contact?.roleValue).toMatch(/scheduling coordinator/i);
    expect(observation?.observationStatus).toBe("Interested");
    expect(observation?.approval).toBe("Not Confirmed");
    expect(observation?.credentialingSummary).toBe("Required");
    expect(followUps.some((d) => /get jennifer's phone or email/i.test(d.taskTitle ?? ""))).toBe(true);
    expect(followUps.some((d) => /get s's phone or email/i.test(d.taskTitle ?? ""))).toBe(false);
    expect(followUps.some((d) => /get tom's phone or email/i.test(d.taskTitle ?? ""))).toBe(false);
    expect(followUps).toHaveLength(3);
    expect(followUps.map((d) => d.taskTitle)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/get jennifer's phone or email/i),
        expect.stringMatching(/confirm the credentialing pathway/i),
        expect.stringMatching(/upcoming robotic hernia cases/i),
      ]),
    );
    expect(decisions.some((d) => d.observationStatus === "Approved")).toBe(false);

    const obsCard = cards.find((c) => c.category === "observation_access");
    expect(obsCard?.observationStatus).toBe("Interested");
    expect(obsCard?.approval).toBe("Not Confirmed");
    expect(obsCard?.credentialing).toBe("Required");
  });
});
