import { describe, expect, it } from "vitest";
import {
  extractSuspectedContactFromSchedulingContext,
  isSchedulingOnlyNamedEntityEvidence,
  namedEntityEvidenceBelongsToSignal,
  partialLeadBelongsToSignal,
  suspectedContactForPartialUpdate,
} from "./namedEntityIntelligenceGuardrails";
import { buildParseResultFromOpenAiMapping } from "./logUpdateOpenAiMapping";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "./intelligenceScopeInference";
import type { LogUpdateOpenAiMapping } from "./structuredIntelligenceAnalysis";

function emptyMapping(): LogUpdateOpenAiMapping {
  return {
    summary: "",
    confidence: "medium",
    reasoning: "",
    source_scope: "debrief",
    operational_signals: [],
    confirmed_updates: [],
    partial_updates: [],
    still_to_validate: [],
    recommended_next_moves: [],
    do_not_update: [],
  };
}

describe("namedEntityIntelligenceGuardrails", () => {
  it("detects scheduling-only named entity evidence", () => {
    expect(
      isSchedulingOnlyNamedEntityEvidence("Karen appears to be involved in scheduling."),
    ).toBe(true);
    expect(
      isSchedulingOnlyNamedEntityEvidence(
        "Robotic hernia case volume appears to be increasing.",
      ),
    ).toBe(false);
  });

  it("allows Karen scheduling evidence on scheduling cards only", () => {
    const evidence = "Karen coordinates scheduling with the OR scheduling team.";
    expect(namedEntityEvidenceBelongsToSignal("scheduling_owner", evidence)).toBe(true);
    expect(namedEntityEvidenceBelongsToSignal("observation_approval", evidence)).toBe(true);
    expect(namedEntityEvidenceBelongsToSignal("workflow_visibility", evidence)).toBe(false);
    expect(namedEntityEvidenceBelongsToSignal("opportunity_clinical_frustrations", evidence)).toBe(
      false,
    );
    expect(namedEntityEvidenceBelongsToSignal("product_alignment", evidence)).toBe(false);
  });

  it("does not attach Karen partial leads to workflow fields", () => {
    expect(
      partialLeadBelongsToSignal({
        signalId: "workflow_visibility",
        fieldText: "[Partial lead] Karen\nRobotic hernia case volume appears to be increasing.",
      }),
    ).toBe(false);
    expect(
      partialLeadBelongsToSignal({
        signalId: "scheduling_owner",
        fieldText: "[Partial lead] Karen\nKaren coordinates scheduling with OR scheduling.",
        evidenceText: "Karen coordinates scheduling with the OR scheduling team.",
      }),
    ).toBe(true);
  });

  it("extracts scheduling contacts only from scheduling context", () => {
    expect(
      extractSuspectedContactFromSchedulingContext(
        "Karen from the office helps coordinate scheduling.",
      ),
    ).toBe("Karen");
    expect(
      extractSuspectedContactFromSchedulingContext(
        "Robotic hernia case volume appears to be increasing.",
      ),
    ).toBeNull();
  });

  it("does not pull Karen from full note into workflow partial updates", () => {
    const note =
      "Karen helps coordinate scheduling. They are doing more robotic hernia work lately.";
    expect(
      suspectedContactForPartialUpdate({
        domain: "workflow",
        label: "Procedure workflow understanding",
        value: "Robotic hernia case volume appears to be increasing.",
        reasoning: "Case mix noted in debrief.",
        rawNote: note,
      }),
    ).toBeNull();
    expect(
      suspectedContactForPartialUpdate({
        domain: "scheduling",
        label: "Scheduling owner",
        value: "Karen coordinates scheduling.",
        reasoning: "Debrief extraction",
        rawNote: note,
      }),
    ).toBe("Karen");
  });

  it("does not attach Karen to workflow partial updates from a mixed debrief", () => {
    const note =
      "Karen helps coordinate scheduling. They are doing more robotic hernia work lately.";
    const mapping = emptyMapping();
    mapping.partial_updates.push({
      domain: "workflow",
      label: "Procedure workflow partially mapped",
      value: "Robotic hernia case volume appears to be increasing.",
      still_needs: ["Which cases and how workflow pain shows up in room"],
      confidence: "medium",
      save_target: "provider",
      reasoning: "Case mix noted in debrief.",
      source_scope: "provider workflow",
    });

    const parse = buildParseResultFromOpenAiMapping({
      sourceText: note,
      mapping,
      context: {
        providerId: "provider-test-1",
        writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
      },
      existingFields: {},
    });

    const workflowField = parse.fieldUpdates.find((f) => f.dbKey === "provider_procedure_focus");
    expect(workflowField?.proposedValue ?? "").not.toMatch(/\[Partial lead\]\s*Karen/i);
  });
});
