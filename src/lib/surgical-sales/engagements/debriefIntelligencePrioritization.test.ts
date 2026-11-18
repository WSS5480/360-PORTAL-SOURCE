import { describe, expect, it } from "vitest";
import type { DebriefPrioritizedPattern } from "./debriefIntelligencePrioritization";
import {
  buildCommercialSignalFromPrimaryPattern,
  buildHypothesisAlignedQuestions,
  buildHypothesisFromPrimaryPattern,
  classifyDebriefCommercialSignalTier,
  isLowValuePositiveWorkflowSignal,
  scoreDebriefCommercialPriority,
  selectPrimaryHypothesisPattern,
  sortDebriefKnownFactsPatterns,
} from "./debriefIntelligencePrioritization";
import {
  buildCommercialSignalDraft,
  buildHypothesisDraft,
  buildPrioritizedLearnItems,
  buildPrioritizedSuggestedQuestions,
} from "./debriefPreparePlanningAssist";

function pattern(
  label: string,
  count: number,
  total = 5,
): DebriefPrioritizedPattern {
  return { label, count, total, importance: scoreDebriefCommercialPriority({ label, count, total }) };
}

const DR_LETTUCE_PATTERNS = [
  pattern("Bard Mesh used consistently", 5),
  pattern("Extra visualization time before fixation", 2),
  pattern("Staff appeared comfortable with current process", 5),
];

describe("debriefIntelligencePrioritization", () => {
  it("repeated staff organized 5/5 + visualization 2/5 chooses visualization for hypothesis", () => {
    const patterns = [
      pattern("Staff appeared organized", 5),
      pattern("Extra visualization time before fixation", 2),
    ];

    const primary = selectPrimaryHypothesisPattern(patterns);
    expect(primary?.label).toMatch(/Extra visualization time before fixation/i);

    const hypothesis = buildHypothesisFromPrimaryPattern({
      pattern: primary,
      providerDisplayName: "Dr. Lettuce",
      procedureLabel: "Robotic ventral hernia",
    });
    expect(hypothesis).toMatch(/visualization/i);
    expect(hypothesis).not.toMatch(/staff appeared organized/i);
  });

  it("Bard Mesh 5/5 appears in What We Know but does not become the main hypothesis by itself", () => {
    const ordered = sortDebriefKnownFactsPatterns(DR_LETTUCE_PATTERNS);
    expect(ordered[0]?.label).toMatch(/Bard Mesh used consistently/i);
    expect(ordered.some((row) => /Extra visualization time before fixation/i.test(row.label))).toBe(true);

    const primary = selectPrimaryHypothesisPattern(DR_LETTUCE_PATTERNS);
    expect(primary?.label).toMatch(/Extra visualization time before fixation/i);
    expect(primary?.label).not.toMatch(/Bard Mesh/i);
  });

  it("staff organized/comfortable does not generate workflow friction", () => {
    const staffOnly = [pattern("Staff appeared comfortable with current process", 5)];
    expect(classifyDebriefCommercialSignalTier(staffOnly[0].label)).toBe("low");
    expect(selectPrimaryHypothesisPattern(staffOnly)).toBeNull();

    const hypothesis = buildHypothesisDraft({
      draft: {
        meetingObjective: "",
        knownFacts: ["Staff appeared comfortable with current process (5 of 5 observations)"],
        whyItMatters: "",
        suggestedHypothesis: "",
        suggestedLearnItems: [],
        suggestedQuestions: [],
        providerName: "Tony Lettuce",
        procedureLabel: "Robotic ventral hernia",
      },
      patterns: staffOnly,
      providerName: "Tony Lettuce",
      procedureLabel: "Robotic ventral hernia",
    });

    expect(hypothesis).not.toMatch(/workflow friction/i);
    expect(hypothesis).toMatch(/no clear commercial issue|worth addressing/i);
  });

  it("if only low-value positive workflow signals exist, hypothesis stays conservative", () => {
    const patterns = [
      pattern("Staff appeared organized", 5),
      pattern("Staff workflow appeared smooth", 4),
    ];

    expect(selectPrimaryHypothesisPattern(patterns)).toBeNull();
    const hypothesis = buildHypothesisFromPrimaryPattern({
      pattern: null,
      providerDisplayName: "Dr. Lettuce",
    });
    expect(hypothesis).toMatch(/No clear commercial issue/i);
  });

  it("repeated clinical challenge beats repeated normal workflow", () => {
    const patterns = [
      pattern("Staff appeared organized", 5),
      pattern("Provider frustration during fixation decisions", 2),
    ];

    const primary = selectPrimaryHypothesisPattern(patterns);
    expect(primary?.label).toMatch(/Provider frustration/i);
    expect(scoreDebriefCommercialPriority(patterns[1]!)).toBeGreaterThan(
      scoreDebriefCommercialPriority(patterns[0]!),
    );
  });

  it("questions are generated from the highest-priority commercial issue", () => {
    const primary = selectPrimaryHypothesisPattern(DR_LETTUCE_PATTERNS);
    const questions = buildHypothesisAlignedQuestions({ pattern: primary });

    expect(questions[0]).toMatch(/visualization seemed to take extra time/i);
    expect(questions.join(" ")).toMatch(/larger or more complex repairs/i);
    expect(questions.join(" ")).not.toMatch(/staff appeared comfortable/i);
  });
});

describe("debriefIntelligencePrioritization — Dr. Lettuce prepare output", () => {
  it("prioritizes visualization over comfortable staff for planning sections", () => {
    const planningContext = {
      draft: {
        meetingObjective: "",
        knownFacts: [
          "Bard Mesh used consistently (5 of 5 observations)",
          "Extra visualization time before fixation (2 of 5 observations)",
          "Staff appeared comfortable with current process (5 of 5 observations)",
        ],
        whyItMatters: "",
        suggestedHypothesis: "",
        suggestedLearnItems: [],
        suggestedQuestions: [],
        providerName: "Tony Lettuce",
        procedureLabel: "Robotic ventral hernia",
      },
      patterns: DR_LETTUCE_PATTERNS,
      providerName: "Tony Lettuce",
      procedureLabel: "Robotic ventral hernia",
    };

    const hypothesis = buildHypothesisDraft(planningContext);
    const commercialSignal = buildCommercialSignalDraft(planningContext);
    const learnItems = buildPrioritizedLearnItems(planningContext);
    const questions = buildPrioritizedSuggestedQuestions(planningContext);

    expect(hypothesis).toMatch(/Visualization challenges may occur/i);
    expect(hypothesis).toMatch(/Dr\. Lettuce/i);
    expect(hypothesis).not.toMatch(/workflow friction/i);
    expect(hypothesis).not.toMatch(/comfortable with current process/i);

    expect(commercialSignal).toMatch(/visualization time/i);
    expect(commercialSignal).not.toMatch(/comfortable with current process/i);

    expect(learnItems.some((item) => /visualization become difficult/i.test(item))).toBe(true);
    expect(questions.some((q) => /visualization seemed to take extra time/i.test(q))).toBe(true);

    expect(isLowValuePositiveWorkflowSignal("Staff appeared comfortable with current process")).toBe(true);
    expect(
      buildCommercialSignalFromPrimaryPattern({
        pattern: selectPrimaryHypothesisPattern(DR_LETTUCE_PATTERNS),
        supportingPatterns: DR_LETTUCE_PATTERNS,
      }),
    ).not.toMatch(/comfortable with current process/i);
  });
});
