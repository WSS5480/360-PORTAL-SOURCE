import { describe, expect, it } from "vitest";
import {
  CLINICAL_INSIGHT_GROUP_LABEL,
  clinicalInsightGroupIdFromLabel,
  clinicalInsightGroupIdFromOutcome,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { groupClinicalInsightOutcomes } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";

function clinicalOutcome(input: {
  id: string;
  categoryLabel: string;
  displayValue: string;
  primaryLine?: string;
}): IntelligenceBriefOutcome {
  const primaryLine = input.primaryLine ?? input.displayValue;
  return {
    id: input.id,
    kind: "clinical_insight",
    cardIds: [input.id],
    summaryLine: primaryLine,
    primaryLine,
    subtitle: input.categoryLabel,
    bullets: [],
    evidenceQuotes: [],
    linkedFieldUpdateIds: [],
  };
}

describe("clinical insight grouping", () => {
  it("maps singular category labels to plural section headers", () => {
    expect(clinicalInsightGroupIdFromLabel("Clinical Frustration")).toBe("clinical_frustration");
    expect(CLINICAL_INSIGHT_GROUP_LABEL.clinical_frustration).toBe("Clinical Frustrations");
    expect(CLINICAL_INSIGHT_GROUP_LABEL.clinical_trend).toBe("Clinical Trends");
    expect(CLINICAL_INSIGHT_GROUP_LABEL.procedure_focus).toBe("Procedure Focus");
  });

  it("groups frustrations, trends, and procedure focus separately", () => {
    const groups = groupClinicalInsightOutcomes([
      clinicalOutcome({
        id: "f1",
        categoryLabel: "Clinical Frustration",
        displayValue: "Visualization",
      }),
      clinicalOutcome({
        id: "f2",
        categoryLabel: "Clinical Frustration",
        displayValue: "Fixation",
      }),
      clinicalOutcome({
        id: "t1",
        categoryLabel: "Clinical Trend",
        displayValue: "Increasing Case Volume",
      }),
      clinicalOutcome({
        id: "p1",
        categoryLabel: "Procedure Focus",
        displayValue: "Robotic Ventral Hernia Repair",
      }),
    ]);

    expect(groups.map((group) => group.groupLabel)).toEqual([
      "Clinical Frustrations",
      "Clinical Trends",
      "Procedure Focus",
    ]);
    expect(groups[0]?.outcomes.map((outcome) => outcome.primaryLine)).toEqual([
      "Visualization",
      "Fixation",
    ]);
    expect(groups[1]?.outcomes[0]?.primaryLine).toBe("Increasing Case Volume");
    expect(groups[2]?.outcomes[0]?.primaryLine).toBe("Robotic Ventral Hernia Repair");
  });

  it("routes pure procedure focus out of the clinical trends bucket", () => {
    expect(
      clinicalInsightGroupIdFromOutcome({
        kind: "clinical_insight",
        subtitle: "Clinical Trend",
        primaryLine: "Robotic ventral and inguinal hernia repair",
        bullets: ["Clinical Trend", "Robotic ventral and inguinal hernia repair"],
      }),
    ).toBe("procedure_focus");

    expect(
      clinicalInsightGroupIdFromOutcome({
        kind: "clinical_insight",
        subtitle: "Clinical Trend",
        primaryLine: "Robotic ventral hernia repair",
        bullets: ["Clinical Trend", "Increasing Procedure Volume"],
      }),
    ).toBe("clinical_trend");

    const groups = groupClinicalInsightOutcomes([
      clinicalOutcome({
        id: "p1",
        categoryLabel: "Procedure Focus",
        displayValue: "Robotic ventral and inguinal hernia repair",
        primaryLine: "Robotic ventral and inguinal hernia repair",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.groupLabel).toBe("Procedure Focus");
  });

  it("dedupes identical clinical trend outcomes within a group but keeps distinct procedures", () => {
    const groups = groupClinicalInsightOutcomes([
      clinicalOutcome({
        id: "t1",
        categoryLabel: "Clinical Trend",
        displayValue: "Increasing Procedure Volume",
        primaryLine: "Robotic ventral hernia repair · Increasing Procedure Volume",
      }),
      clinicalOutcome({
        id: "t1-dup",
        categoryLabel: "Clinical Trend",
        displayValue: "Increasing Procedure Volume",
        primaryLine: "Robotic ventral hernia repair · Increasing Procedure Volume",
      }),
      clinicalOutcome({
        id: "t2",
        categoryLabel: "Clinical Trend",
        displayValue: "Increasing Procedure Volume",
        primaryLine: "Abdominal wall reconstruction · Increasing Procedure Volume",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.outcomes).toHaveLength(2);
    expect(groups[0]?.outcomes[0]?.cardIds).toEqual(["t1", "t1-dup"]);
    expect(groups[0]?.outcomes[1]?.primaryLine).toBe(
      "Abdominal wall reconstruction · Increasing Procedure Volume",
    );
  });
});
