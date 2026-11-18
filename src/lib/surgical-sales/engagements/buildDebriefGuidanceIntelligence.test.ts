import { describe, expect, it } from "vitest";

import {

  buildDebriefGuidanceIntelligence,

  rebuildDebriefGuidanceIntelligenceFromWorkspaceDraft,

} from "./buildDebriefGuidanceIntelligence";

import {

  intelligenceContainsRecursiveQuestions,

  type DebriefGuidanceIntelligenceItem,

} from "./debriefGuidanceIntelligenceTypes";

import { buildDebriefExecutionGuideFromWorkspace } from "./buildDebriefExecutionGuideFromWorkspace";

import { buildDebriefPrepareWorkspaceView } from "./debriefPrepareWorkspace";

import type { DebriefPrioritizedPattern } from "./debriefIntelligencePrioritization";



function pattern(label: string, count: number, total = 5): DebriefPrioritizedPattern {

  return { label, count, total, importance: 0 };

}



const MIXED_PATTERNS = [

  pattern("Incumbent mesh used consistently", 5),

  pattern("Extra visualization time before fixation", 2),

  pattern("Staff appeared comfortable with current process", 5),

];



const UNRESOLVED_PROMPTS = [

  "Listen for provider frustration during the case",

  "Listen for staff frustration, delays, workarounds, or complaints",

  "Determine whether confirming products were stocked before the case happens consistently across cases",

];



function buildIntelligence(overrides: {

  patterns?: DebriefPrioritizedPattern[];

  unresolvedObservationPrompts?: string[];

} = {}) {

  return buildDebriefGuidanceIntelligence({

    patterns: overrides.patterns ?? MIXED_PATTERNS,

    unresolvedObservationPrompts: overrides.unresolvedObservationPrompts ?? UNRESOLVED_PROMPTS,

    providerName: "Alex Surgeon",

    procedureLabel: "Complex abdominal repair",

  });

}



describe("buildDebriefGuidanceIntelligence staged pipeline", () => {

  it("generates each stage from observation sources only — never from prior generated text", () => {

    const intelligence = buildIntelligence();



    for (const item of intelligence.items) {

      expect(item.validationQuestion).not.toMatch(/^Does Ask whether/i);

      expect(item.qualificationQuestion).not.toMatch(/^Does Ask whether/i);

      if (item.qualificationQuestion.trim()) {
        expect(item.validationQuestion).not.toContain(item.qualificationQuestion);
      }

      if (item.sourcePatternLabel) {

        expect(item.validationQuestion.toLowerCase()).not.toBe(`ask whether ${item.sourcePatternLabel.toLowerCase()}`);

      }

    }



    expect(intelligenceContainsRecursiveQuestions(intelligence)).toBe(false);

  });



  it("converts unresolved observation prompts once into debrief validation questions", () => {

    const intelligence = buildIntelligence();

    expect(

      intelligence.whatToValidate.some((line) => /miss any provider or staff frustrations/i.test(line)),

    ).toBe(true);

    expect(intelligence.whatToValidate.join(" ")).not.toMatch(/\blisten for\b/i);

  });



  it("does not emit listen-for-during-the-case instructions or terse placeholders", () => {

    const intelligence = buildIntelligence();

    const combined = [

      ...intelligence.whatToValidate,

      ...intelligence.conversationStarters,

      intelligence.primaryHypothesis,

    ].join(" ");



    expect(combined).not.toMatch(/\blisten for\b.*\bduring the case\b/i);

    expect(combined).not.toMatch(/^Workflow delays\?$/m);

  });



  it("keeps positive workflow as context validation, not pain framing", () => {

    const intelligence = buildIntelligence();

    const staffFinding = intelligence.findingsToValidate.find((row) =>

      /Staff appeared comfortable/i.test(row.sourcePatternLabel),

    );

    expect(staffFinding).toBeTruthy();

    expect(staffFinding!.meaning).toMatch(/use as context/i);

    expect(staffFinding!.validationQuestion).toMatch(/current workflow acceptable/i);

    expect(intelligence.commercialQualification.join(" ")).not.toMatch(/friction|pain/i);

  });



  it("frames repeated product use as current-state validation", () => {

    const intelligence = buildIntelligence();

    const productFinding = intelligence.findingsToValidate.find((row) =>

      /Incumbent mesh used consistently/i.test(row.sourcePatternLabel),

    );

    expect(productFinding).toBeTruthy();

    expect(productFinding!.displayFinding).toMatch(/Incumbent mesh was used across observed cases/i);

    expect(productFinding!.validationQuestion).toMatch(/standard product/i);

    expect(intelligence.commercialQualification.join(" ")).not.toMatch(/satisfied with/i);

  });



  it("gates commercial qualification on primary high-priority issue only", () => {

    const intelligence = buildIntelligence();

    expect(intelligence.recommendedOutcome).toBe("Follow Up / Continue Discovery");

    expect(intelligence.commercialQualification.length).toBeLessThanOrEqual(3);

    expect(intelligence.commercialQualification.some((line) => /visualization issue/i.test(line))).toBe(true);

    expect(intelligence.commercialQualification.some((line) => /next step/i.test(line))).toBe(true);

    expect(intelligence.recommendedOutcome).not.toMatch(/Evaluation Case|Product Trial/i);

  });



  it("uses low-opportunity outcome when only positive or product patterns exist", () => {

    const intelligence = buildDebriefGuidanceIntelligence({

      patterns: [pattern("Staff appeared organized", 5), pattern("Incumbent mesh used consistently", 5)],

      providerName: "Alex Surgeon",

    });

    expect(intelligence.recommendedOutcome).toMatch(/Follow Up \/ Low Opportunity/i);

    expect(intelligence.commercialQualification).toHaveLength(0);

    expect(intelligence.conversationStarters).toHaveLength(0);

  });



  it("separates observation findings from generated questions", () => {

    const intelligence = buildIntelligence();

    expect(intelligence.whatWeObserved.every((line) => !/\?$/.test(line) || line.includes("observations"))).toBe(true);

    expect(intelligence.whatToValidate.every((line) => /\?/.test(line) || /^(Do|Did|Are|Is)/i.test(line))).toBe(true);

    for (const observed of intelligence.whatWeObserved) {

      for (const validate of intelligence.whatToValidate) {

        expect(validate).not.toBe(observed);

      }

    }

  });

});



describe("three-layer reasoning separation", () => {

  it("never puts open observation gaps in What We Noticed", () => {

    const intelligence = buildIntelligence();

    expect(intelligence.whatWeObserved.join(" ")).not.toMatch(/open observation gap/i);

    expect(intelligence.findingsToValidate.every((row) => !/open observation gap/i.test(row.displayFinding))).toBe(

      true,

    );

    expect(intelligence.informationGaps.length).toBeGreaterThan(0);

  });



  it("routes information gaps only into What To Validate", () => {

    const intelligence = buildIntelligence();

    for (const gap of intelligence.informationGaps) {

      expect(intelligence.whatToValidate).toContain(gap.discoveryQuestion);

      expect(intelligence.whatWeObserved).not.toContain(gap.discoveryQuestion);

    }

    expect(intelligence.whatWeObserved.join(" ")).not.toMatch(/provider frustration during cases/i);

  });



  it("keeps product use and positive workflow as context in observed findings only", () => {

    const intelligence = buildIntelligence();

    expect(intelligence.whatWeObserved.some((line) => /was used across observed cases/i.test(line))).toBe(true);

    expect(intelligence.whatWeObserved.some((line) => /Staff appeared comfortable/i.test(line))).toBe(true);

    expect(intelligence.whatWeObserved.join(" ")).not.toMatch(/frustration|pain|problem/i);

  });



  it("caps commercial qualification and ties it to the primary observed issue", () => {

    const intelligence = buildIntelligence();

    expect(intelligence.conversationStarters.length).toBeLessThanOrEqual(3);

    expect(intelligence.conversationStarters).toEqual(intelligence.commercialQualification);

    expect(intelligence.conversationStarters.join(" ")).toMatch(/visualization issue|annoying or slowing you down/i);

    expect(intelligence.conversationStarters.join(" ")).not.toMatch(/standard product|current workflow acceptable/i);

  });



  it("matches expected Active separation for mixed observation program", () => {

    const intelligence = buildIntelligence();

    expect(intelligence.whatWeObserved).toEqual(

      expect.arrayContaining([

        "Incumbent mesh was used across observed cases.",

        expect.stringMatching(/Extra visualization time before fixation/i),

        "Staff appeared comfortable with current process.",

      ]),

    );

    expect(intelligence.whatToValidate).toEqual(

      expect.arrayContaining([

        expect.stringMatching(/happen often enough to matter, or only in certain case types/i),

        expect.stringMatching(/standard product for these cases/i),

        "Is the current workflow acceptable from your perspective?",

        "Did we miss any provider or staff frustrations during the observed cases?",

      ]),

    );

    expect(intelligence.conversationStarters).toEqual(

      expect.arrayContaining([

        "When you think about the cases we observed, is anything consistently annoying or slowing you down?",

        "Does the visualization issue affect case flow enough to be worth addressing?",

        "What would need to be true for you to consider a next step?",

      ]),

    );

  });

});



describe("Prepare and Active shared intelligence object", () => {

  it("renders the same intelligence object from workspace draft and execution guide", () => {

    const intelligence = buildIntelligence();

    const workspace = buildDebriefPrepareWorkspaceView({

      draft: {

        meetingObjective: "",

        knownFacts: MIXED_PATTERNS.map((row) => `${row.label} (${row.count} of ${row.total} observations)`),

        whyItMatters: "",

        suggestedHypothesis: intelligence.primaryHypothesis,

        suggestedLearnItems: intelligence.whatToValidate,

        suggestedQuestions: intelligence.conversationStarters,

        providerName: "Alex Surgeon",

        procedureLabel: "Complex abdominal repair",

        strongestObservedPattern: "Extra visualization time before fixation",

        guidanceIntelligence: intelligence,

      },

      saved: null,

    });



    const executionGuide = buildDebriefExecutionGuideFromWorkspace({ workspace, savedSnapshot: null });



    expect(workspace.guidanceIntelligence).toBe(intelligence);

    expect(executionGuide.guidanceIntelligence).toEqual(intelligence);

    expect(executionGuide.whatToValidate).toEqual(intelligence.whatToValidate);

    expect(executionGuide.conversationStarters).toEqual(intelligence.conversationStarters);

    expect(executionGuide.whatWeObserved).toEqual(intelligence.whatWeObserved);

  });



  it("rebuilds from raw known facts only when intelligence snapshot is absent", () => {

    const rebuilt = rebuildDebriefGuidanceIntelligenceFromWorkspaceDraft({

      knownFacts: MIXED_PATTERNS.map((row) => `${row.label} (${row.count} of ${row.total} observations)`),

      providerName: "Alex Surgeon",

    });



    expect(intelligenceContainsRecursiveQuestions(rebuilt)).toBe(false);

    expect(rebuilt.whatToValidate.length).toBeGreaterThan(0);

    expect(rebuilt.whatWeObserved.join(" ")).not.toMatch(/open observation gap/i);

  });

});



describe("regression: no recursive question generation", () => {

  it("never produces Does Ask whether phrasing", () => {

    const intelligence = buildIntelligence();

    const allText = [

      ...intelligence.items.flatMap((item: DebriefGuidanceIntelligenceItem) => [

        item.finding,

        item.meaning,

        item.validationQuestion,

        item.qualificationQuestion,

        item.nextStepQuestion,

      ]),

      intelligence.primaryHypothesis,

      ...intelligence.informationGaps.map((gap) => gap.discoveryQuestion),

      ...intelligence.commercialQualification,

    ].join(" ");



    expect(allText).not.toMatch(/\bDoes Ask whether\b/i);

    expect(allText).not.toMatch(/\bAsk whether Ask whether\b/i);

  });

  it("dedupes overlapping validation questions and filters commercial disposition leaks", () => {
    const intelligence = buildDebriefGuidanceIntelligence({
      patterns: [
        pattern("Extra visualization time before fixation", 4),
        pattern("Bard Mesh used consistently", 5),
        pattern("Provider frustration during fixation decisions", 2),
        pattern("Exposure and access challenges in larger cases", 4),
      ],
      unresolvedObservationPrompts: [
        "Determine whether extra visualization time before fixation happens consistently across cases",
        "Determine whether commercial disposition: need more observations for visualization challenges happens consistently across cases",
        "Listen for staff frustration, delays, workarounds, or complaints",
      ],
      providerName: "Mark Onion",
      procedureLabel: "Complex abdominal wall cases",
    });

    expect(intelligence.whatToValidate.length).toBeLessThanOrEqual(5);
    expect(intelligence.whatToValidate.join("\n")).not.toMatch(/commercial disposition/i);
    const blob = intelligence.whatToValidate.join("\n").toLowerCase();
    const visualizationQuestions = intelligence.whatToValidate.filter((line) =>
      /visuali|exposure|access|fixation/.test(line.toLowerCase()),
    );
    expect(visualizationQuestions.length).toBeLessThanOrEqual(1);
    const meshQuestions = intelligence.whatToValidate.filter((line) => /bard mesh/i.test(line));
    expect(meshQuestions.length).toBeLessThanOrEqual(1);
    expect(blob).toMatch(/bard mesh|standard product/i);
  });

});


