import { describe, expect, it } from "vitest";
import {
  buildDiscoveryMappingIntelligenceItem,
  buildInterpretationForSignal,
  looksLikeRawEvidenceQuote,
  mappedCategoryLabelForSignal,
} from "./discoveryMappingIntelligenceItem";

describe("discoveryMappingIntelligenceItem", () => {
  it("separates raw evidence from interpretation for procedure mix", () => {
    const raw =
      "Jim mentioned they are seeing more complex abdominal wall reconstruction cases.";
    const item = buildDiscoveryMappingIntelligenceItem({
      dbKey: "provider_procedure_focus",
      signalId: "workflow_visibility",
      evidenceText: raw,
      fieldValue: "Robotic hernia case volume appears to be increasing.",
      captureContext: { source_type: "engagement", source_label: "Intro Call debrief" },
      questionText: "What procedure workflow details are still unclear?",
      status: "partial",
      confidence: "medium",
    });

    expect(item).toBeDefined();
    expect(item?.evidence_text).toBe(raw);
    expect(item?.interpretation).toMatch(/Procedure mix|Robotic hernia/i);
    expect(item?.interpretation).not.toBe(raw);
    expect(item?.mapped_category).toMatch(/Procedure focus \/ case mix/i);
    expect(item?.status).toBe("partial");
    expect(item?.confidence).toBe("medium");
  });

  it("does not treat raw quotes as interpretation", () => {
    expect(
      looksLikeRawEvidenceQuote(
        "Jim mentioned they are seeing more complex abdominal wall reconstruction cases.",
      ),
    ).toBe(true);
    expect(
      buildInterpretationForSignal(
        "workflow_visibility",
        "Jim mentioned they are seeing more complex abdominal wall reconstruction cases.",
        null,
      ),
    ).toMatch(/Procedure mix may be shifting/i);
  });

  it("labels mapped category with intelligence taxonomy", () => {
    expect(mappedCategoryLabelForSignal("scheduling_owner")).toMatch(
      /Access intelligence · Scheduling ownership/i,
    );
    expect(mappedCategoryLabelForSignal("workflow_visibility")).toMatch(
      /Sales intelligence · Procedure focus \/ case mix/i,
    );
  });
});
