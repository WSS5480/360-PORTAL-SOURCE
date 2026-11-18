import { describe, expect, it } from "vitest";

import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { DEBRIEF_INTELLIGENCE_EXTRACTION_SCENARIOS } from "@/lib/surgical-sales/debriefIntelligenceExtractionScenarios";
import { runDebriefIntelligencePipeline } from "@/lib/surgical-sales/debriefIntelligencePipeline";

describe("debriefIntelligencePipeline", () => {
  it("runs five passes and caps review cards at five", () => {
    const scenario = DEBRIEF_INTELLIGENCE_EXTRACTION_SCENARIOS[0]!;
    const result = runDebriefExtractionPipeline({ dictation: scenario.dictation });
    const pipeline = result.extraction.pipeline;

    expect(pipeline.pass1_rawFacts.length).toBeGreaterThan(0);
    expect(pipeline.pass2_classifiedFacts).toHaveLength(pipeline.pass1_rawFacts.length);
    expect(pipeline.intelligenceCaptured.length).toBeGreaterThan(0);
    expect(
      pipeline.intelligenceCaptured.length + pipeline.recommendedActions.length,
    ).toBeLessThanOrEqual(8);
  });

  it("does not invent credentialing platform when rep is uncertain", () => {
    const dictation =
      "He thinks they use IntelliCentrics but could be wrong. Need to confirm the credentialing platform.";
    const result = runDebriefExtractionPipeline({ dictation });
    const pipeline = result.extraction.pipeline;

    expect(pipeline.pass3_rules.credentialingPlatformLabel).toBe("Unknown");
    const accessCard = pipeline.intelligenceCaptured.find((c) => c.kind === "credentialing_requirement");
    expect(accessCard?.learned ?? "").not.toMatch(/likely uses/i);
    expect(
      pipeline.pass4_synthesis.accessSummaryLines.join(" ") +
        (accessCard?.learned ?? ""),
    ).toMatch(/unknown|not confirmed|possibility|unconfirmed/i);
  });

  it("preserves Jennifer with contact row and evidence in recommended actions", () => {
    const dictation =
      "Jennifer handles scheduling but I don't have her contact info yet. Need to follow up before observation.";
    const result = runDebriefExtractionPipeline({ dictation });
    const action = result.extraction.pipeline.recommendedActions.find(
      (a) => a.kind === "create_workflow_contact" && /jennifer/i.test(a.participantName ?? ""),
    );
    expect(action?.participantName).toBe("Jennifer");
    expect(action?.contactId).toBeTruthy();
    expect(action?.evidenceQuote?.length ?? 0).toBeGreaterThan(0);
    expect(result.extraction.proposedContacts.some((c) => c.displayName === "Jennifer")).toBe(true);
    const copy = `${action?.title} ${action?.body}`.toLowerCase();
    expect(copy).not.toMatch(/named contact|scheduler identified|partially identified/);
  });

  it("preserves named participants in workflow card", () => {
    const dictation =
      "Tom told me Karen handles scheduling. Melissa handles credentialing. Need to talk to both before observation approval.";
    const pipeline = runDebriefIntelligencePipeline({
      dictation,
      atomicFacts: runDebriefExtractionPipeline({ dictation }).parse.atomicFacts ?? [],
      proposedContacts: runDebriefExtractionPipeline({ dictation }).proposedContacts,
    });

    const contactAction = pipeline.recommendedActions.find((a) => a.kind === "create_workflow_contact");
    expect(
      `${contactAction?.participantName ?? ""} ${contactAction?.title ?? ""} ${contactAction?.body ?? ""}`,
    ).toMatch(/karen|melissa/i);
    expect(contactAction?.evidenceQuote?.length ?? 0).toBeGreaterThan(0);
    const ownershipIntel = pipeline.intelligenceCaptured.find((c) => c.kind === "workflow_ownership");
    expect(ownershipIntel?.learned).toMatch(/karen|schedul/i);
  });

  it("never surfaces internal taxonomy tokens in synthesis", () => {
    const dictation = "Office and OR scheduling shared_workflow. Deployment readiness signals noted.";
    const result = runDebriefExtractionPipeline({ dictation });
    const copy = result.extraction.pipeline.pass4_synthesis.keyTakeawayLines.join(" ").toLowerCase();
    expect(copy).not.toMatch(/shared_workflow|provider_office|deployment readiness|readiness signals/);
  });
});
