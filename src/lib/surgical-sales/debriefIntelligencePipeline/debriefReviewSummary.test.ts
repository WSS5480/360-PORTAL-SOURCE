import { describe, expect, it } from "vitest";

import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  buildDebriefReviewSummary,
  buildExecutiveDebriefTakeaways,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewSummary";
import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";

describe("buildDebriefReviewSummary", () => {
  it("derives Tom Sandy executive takeaways with named contacts and specific follow-ups", () => {
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
    const cards = buildDebriefActionableReviewCards({
      extraction,
      proposedContacts,
      dictation,
      guardContext: buildDebriefReviewDecisionContext({
        providerLabel: "Tom Sandy",
        providerContact: { first_name: "Tom", last_name: "Sandy" },
      }),
    });
    const outcomes = buildIntelligenceBriefOutcomes(buildDebriefIntelligenceBrief({ cards }));
    const summary = buildDebriefReviewSummary({
      outcomes,
      providerLabel: "Tom Sandy",
    });

    expect(summary.providerLabel).toBe("Tom Sandy");
    expect(summary.takeaways.length).toBeGreaterThanOrEqual(3);
    expect(summary.takeaways.length).toBeLessThanOrEqual(6);
    expect(summary.takeaways).toEqual(
      expect.arrayContaining([
        "Observation interest noted",
        "Credentialing required",
        "Jennifer identified as scheduling coordinator",
      ]),
    );
    expect(summary.takeaways.join("\n")).not.toMatch(
      /Observation Status|Possible Role|Confidence|Clinical Trend/i,
    );
  });

  it("summarizes clinical frustrations without topic labels", () => {
    const takeaways = buildExecutiveDebriefTakeaways([
      {
        id: "c1",
        kind: "clinical_insight",
        cardIds: ["c1"],
        summaryLine: "Clinical Frustration · Visualization",
        primaryLine: "Visualization",
        subtitle: "Clinical Frustration",
        bullets: [],
        evidenceQuotes: [],
        linkedFieldUpdateIds: [],
      },
      {
        id: "c2",
        kind: "clinical_insight",
        cardIds: ["c2"],
        summaryLine: "Clinical Frustration · Fixation",
        primaryLine: "Fixation",
        subtitle: "Clinical Frustration",
        bullets: [],
        evidenceQuotes: [],
        linkedFieldUpdateIds: [],
      },
    ]);

    expect(takeaways).toEqual(["Validated pain point identified"]);
  });

  it("prefers observation approved over interest and pending approval", () => {
    const takeaways = buildExecutiveDebriefTakeaways([
      {
        id: "o1",
        kind: "observation_access",
        cardIds: ["o1"],
        summaryLine: "Observation access",
        bullets: [],
        evidenceQuotes: [],
        linkedFieldUpdateIds: [],
        observationFields: {
          status: "Interested",
          approval: "Approved",
          requirements: "Credentialing Required",
        },
      },
    ]);

    expect(takeaways).toEqual(["Observation approved", "Credentialing required"]);
    expect(takeaways).not.toContain("Observation interest noted");
    expect(takeaways).not.toContain("Observation not yet approved");
  });

  it("reports credentialing no longer required — never Credentialing required — on reversal", () => {
    const takeaways = buildExecutiveDebriefTakeaways([
      {
        id: "o1",
        kind: "observation_access",
        cardIds: ["o1"],
        summaryLine: "Observation access",
        bullets: [],
        evidenceQuotes: [],
        linkedFieldUpdateIds: [],
        observationFields: {
          status: "Needs Follow-Up",
          approval: "",
          requirements: "Credentialing Not Required",
        },
      },
    ]);

    expect(takeaways).not.toContain("Credentialing required");
    expect(takeaways).toContain("Credentialing no longer required");
  });

  it("suppresses the approval line when the rep already confirmed it via engagement outcome", () => {
    const takeaways = buildExecutiveDebriefTakeaways(
      [
        {
          id: "o1",
          kind: "observation_access",
          cardIds: ["o1"],
          summaryLine: "Observation access",
          bullets: [],
          evidenceQuotes: [],
          linkedFieldUpdateIds: [],
          observationFields: {
            status: "Interested",
            approval: "Approved",
            requirements: "Credentialing Required",
          },
        },
        {
          id: "c1",
          kind: "clinical_insight",
          cardIds: ["c1"],
          summaryLine: "Clinical Frustration · Visualization",
          primaryLine: "Visualization",
          subtitle: "Clinical Frustration",
          bullets: [],
          evidenceQuotes: [],
          linkedFieldUpdateIds: [],
        },
      ],
      {
        observationApproved: true,
        observationDenied: false,
        credentialingKnown: false,
        schedulingOwnerOnFile: null,
      },
    );

    // Workflow state is the authority — only newly learned intelligence remains.
    expect(takeaways).not.toContain("Observation approved");
    expect(takeaways).not.toContain("Observation interest noted");
    expect(takeaways).toContain("Credentialing required");
    expect(takeaways).toContain("Validated pain point identified");
  });

  it("suppresses the credentialing line when credentialing is already validated on file", () => {
    const takeaways = buildExecutiveDebriefTakeaways(
      [
        {
          id: "o1",
          kind: "observation_access",
          cardIds: ["o1"],
          summaryLine: "Observation access",
          bullets: [],
          evidenceQuotes: [],
          linkedFieldUpdateIds: [],
          observationFields: {
            status: "Interested",
            approval: "Not yet approved",
            requirements: "Credentialing Required",
          },
        },
      ],
      {
        observationApproved: false,
        observationDenied: false,
        credentialingKnown: true,
        schedulingOwnerOnFile: null,
      },
    );

    expect(takeaways).not.toContain("Credentialing required");
    expect(takeaways).toContain("Observation interest noted");
  });

  it("suppresses the scheduling-coordinator line when the same person is already on file", () => {
    const contactOutcome = {
      id: "ct1",
      kind: "contact" as const,
      cardIds: ["ct1"],
      summaryLine: "Jennifer — Scheduling Coordinator",
      primaryLine: "Jennifer",
      subtitle: "Scheduling Coordinator",
      bullets: [],
      evidenceQuotes: [],
      linkedFieldUpdateIds: [],
    };

    const suppressed = buildExecutiveDebriefTakeaways([contactOutcome], {
      observationApproved: false,
      observationDenied: false,
      credentialingKnown: false,
      schedulingOwnerOnFile: "Jennifer (office scheduling)",
    });
    expect(suppressed).not.toContain("Jennifer identified as scheduling coordinator");

    // A different person is still news.
    const kept = buildExecutiveDebriefTakeaways([contactOutcome], {
      observationApproved: false,
      observationDenied: false,
      credentialingKnown: false,
      schedulingOwnerOnFile: "Margaret (OR desk)",
    });
    expect(kept).toContain("Jennifer identified as scheduling coordinator");
  });

  it("drops the AI field update that restates an on-file observation approval", () => {
    const dictation =
      "Great visit. Dr. Sandy confirmed again that observation is approved and we just need to pick a date.";
    const facts: DebriefAtomicFact[] = [
      {
        fact_type: "observation_access",
        entity: "",
        attribute: "status",
        value: "approved",
        confidence: "high",
        evidence: "Dr. Sandy confirmed again that observation is approved.",
      },
    ];

    const parse = buildParseResultFromDebriefFacts({
      sourceText: dictation,
      facts,
      context: {
        providerId: "provider-test",
        writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
      },
      // Approval already recorded via the rep's engagement outcome.
      existingFields: { provider_observation_feasibility: "approved" },
      mappingSource: "regression_stand_in",
    });

    expect(
      parse.fieldUpdates.some((u) => u.dbKey === "provider_observation_feasibility"),
    ).toBe(false);

    // Without the on-file state, the same fact still produces the update.
    const fresh = buildParseResultFromDebriefFacts({
      sourceText: dictation,
      facts,
      context: {
        providerId: "provider-test",
        writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
      },
      existingFields: {},
      mappingSource: "regression_stand_in",
    });
    expect(
      fresh.fieldUpdates.some((u) => u.dbKey === "provider_observation_feasibility"),
    ).toBe(true);
  });
});
