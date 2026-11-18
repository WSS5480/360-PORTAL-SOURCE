import { describe, expect, it } from "vitest";

import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceExtractionReview,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  INTELLIGENCE_BRIEF_CONFIRMED,
  INTELLIGENCE_BRIEF_SECTION,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  ACCESS_PATHWAY_STATEMENT_OBSERVATION_ALLOWED,
  normalizeAccessPathwayFromContext,
  normalizeIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/normalizeIntelligenceBriefForReview";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import { routeLogUpdateToProviderFields } from "@/lib/surgical-sales/logUpdateProviderRouting";

const CREDENTIALING_OBSERVATION_NOTE = "We can observe once credentialing is complete.";

function runAccessPathwayScenario(dictation = CREDENTIALING_OBSERVATION_NOTE) {
  const facts: DebriefAtomicFact[] = [
    {
      fact_type: "observation_access",
      entity: "",
      attribute: "feasibility",
      value: "Allowed after credentialing",
      confidence: "high",
      evidence: dictation,
    },
    {
      fact_type: "credentialing",
      entity: "",
      attribute: "requirement",
      value: "required before observation",
      confidence: "high",
      evidence: dictation,
    },
    {
      fact_type: "facility_intelligence",
      entity: "",
      attribute: "access_pathway",
      value: "vendor credentialing",
      confidence: "medium",
      evidence: dictation,
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
    mappingSource: "openai",
  });

  const extraction = buildDebriefIntelligenceExtractionReview({
    review: parse,
    proposedContacts: [],
    sourceReference: "test",
  });

  const cards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts: [],
    dictation,
  });

  const brief = buildDebriefIntelligenceBrief({ cards });
  const outcomes = buildIntelligenceBriefOutcomes(brief, {
    sourceText: dictation,
    fieldUpdates: parse.fieldUpdates,
  });

  return { parse, cards, brief, outcomes };
}

describe("normalizeIntelligenceBriefForReview", () => {
  it("uses provider-intelligence review section labels", () => {
    expect(INTELLIGENCE_BRIEF_SECTION.observationAccess).toBe("Access Pathway");
    expect(INTELLIGENCE_BRIEF_SECTION.contacts).toBe("Contacts");
    expect(INTELLIGENCE_BRIEF_SECTION.productIntelligence).toBe("Product Interest");
    expect(INTELLIGENCE_BRIEF_SECTION.workflowInsights).toBe("Workflow & Priorities");
    expect(INTELLIGENCE_BRIEF_SECTION.followUpActions).toBe("Next Actions");
  });

  it("collapses credentialing + observation routing labels into one confirmed pathway", () => {
    const fieldUpdates = routeLogUpdateToProviderFields(CREDENTIALING_OBSERVATION_NOTE, {});
    expect(fieldUpdates.map((field) => field.label)).toEqual([
      "Vendor credentialing on file",
      "Whether observation is allowed",
      "Credentialing required before observation",
    ]);

    const norm = normalizeAccessPathwayFromContext(CREDENTIALING_OBSERVATION_NOTE, fieldUpdates);
    expect(norm?.statement).toBe(ACCESS_PATHWAY_STATEMENT_OBSERVATION_ALLOWED);
    expect(norm?.statusLine).toBe(INTELLIGENCE_BRIEF_CONFIRMED);

    const outcomes = normalizeIntelligenceBriefOutcomes(
      [
        {
          id: "vendor",
          kind: "workflow_insight",
          cardIds: ["vendor"],
          summaryLine: "Vendor credentialing on file",
          bullets: ["Vendor credentialing on file"],
          evidenceQuotes: [CREDENTIALING_OBSERVATION_NOTE],
          linkedFieldUpdateIds: [fieldUpdates[0]!.id],
        },
        {
          id: "allowance",
          kind: "workflow_insight",
          cardIds: ["allowance"],
          summaryLine: "Whether observation is allowed",
          bullets: ["Whether observation is allowed"],
          evidenceQuotes: [CREDENTIALING_OBSERVATION_NOTE],
          linkedFieldUpdateIds: [fieldUpdates[1]!.id],
        },
      ],
      { sourceText: CREDENTIALING_OBSERVATION_NOTE, fieldUpdates },
    );

    const accessPathway = outcomes.filter((outcome) => outcome.kind === "observation_access");
    expect(accessPathway).toHaveLength(1);
    expect(accessPathway[0]?.summaryLine).toBe(ACCESS_PATHWAY_STATEMENT_OBSERVATION_ALLOWED);
    expect(accessPathway[0]?.statusLine).toBe(INTELLIGENCE_BRIEF_CONFIRMED);
    expect(outcomes.filter((outcome) => outcome.kind === "workflow_insight")).toHaveLength(0);
    expect(accessPathway[0]?.linkedFieldUpdateIds).toEqual(
      expect.arrayContaining(fieldUpdates.map((field) => field.id)),
    );
  });

  it("renders one access pathway outcome for multi-fact credentialing dictation", () => {
    const { outcomes } = runAccessPathwayScenario();

    const accessPathway = outcomes.filter((outcome) => outcome.kind === "observation_access");
    expect(accessPathway).toHaveLength(1);
    expect(accessPathway[0]?.summaryLine).toBe(ACCESS_PATHWAY_STATEMENT_OBSERVATION_ALLOWED);
    expect(accessPathway[0]?.statusLine).toBe(INTELLIGENCE_BRIEF_CONFIRMED);
    expect(accessPathway[0]?.observationFields).toBeUndefined();

    const renderedLines = outcomes.map((outcome) => outcome.summaryLine).join("\n");
    expect(renderedLines).not.toContain("Vendor credentialing on file");
    expect(renderedLines).not.toContain("Whether observation is allowed");
    expect(renderedLines).not.toContain("Credentialing required before observation");
    expect(renderedLines).not.toContain("Facility observation access pathway");
  });
});
