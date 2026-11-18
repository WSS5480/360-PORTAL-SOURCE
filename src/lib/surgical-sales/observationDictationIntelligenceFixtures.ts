/**
 * Multi-observation dictation fixtures for extraction + intelligence aggregation tests.
 * Used by unit tests and Playwright — rules extractor only (no OpenAI).
 */

import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { adaptUniversalFactsToWhatWeKnowLines } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

export const OBSERVATION_DICTATION_PROVIDER = "Tom Lettuce";

export type ObservationDictationScenario = {
  id: string;
  name: string;
  dictation: string;
  expectVisible: RegExp[];
  expectHidden: RegExp[];
};

/** Original bug report dictation — "commented that" false product + AmchoPlast pitch. */
export const ROBOTIC_VENTRAL_HERNIA_DICTATION = [
  "Observed Dr. Tom Lettuce during a robotic ventral hernia repair today.",
  "He again used Bard Soft Mesh and commented that he's comfortable with it for routine cases because he knows exactly how it behaves.",
  "During fixation on a larger defect, he mentioned he sometimes wishes the mesh had a little more flexibility around the edges because it takes extra time to position the way he wants.",
  "I showed him the Amchoplast graft after the procedure and explained how some surgeons have found it easier to conform in larger defects.",
  "He wasn't ready to switch products but asked me to email him the published clinical data and said he'd be willing to evaluate it during another observation if the evidence looks compelling.",
  "Sarah coordinated today's case and asked me to reach out in about three weeks because they already have another complex ventral hernia scheduled.",
].join(" ");

export const OBSERVATION_DICTATION_SCENARIOS: ObservationDictationScenario[] = [
  {
    id: "obs-1-robotic-ventral",
    name: "robotic ventral hernia with AmchoPlast pitch",
    dictation: ROBOTIC_VENTRAL_HERNIA_DICTATION,
    expectVisible: [
      /Bard Soft Mesh/i,
      /AmchoPlast|Amchoplast/i,
      /robotic ventral hernia/i,
      /conformability|flexibility|larger defects?/i,
      /email.*(?:clinical|published)|published clinical data|clinical-data interest/i,
      /reach out.*(?:three|3)\s+weeks?/i,
      /Sarah/i,
      /willing to evaluate|evaluate.*observation/i,
    ],
    expectHidden: [
      /(?:Current|Competitor) product:\s*Commented That/i,
      /Routine or smooth case progression/i,
    ],
  },
  {
    id: "obs-2-inguinal-phalanx",
    name: "inguinal case with Phasix interest",
    dictation: [
      "Observed Dr. Tom Lettuce during an open inguinal hernia repair.",
      "He used Phasix for the repair and said the team already knows the handling profile.",
      "He asked whether AmchoPlast could be an option for contaminated fields and wanted published outcomes before any switch.",
      "Maya at the front desk asked me to send available dates next week for a follow-up visit.",
    ].join(" "),
    expectVisible: [/Phasix/i, /AmchoPlast|Amchoplast|published outcomes/i, /Maya|Send available dates|available dates|next week/i],
    expectHidden: [/(?:Current|Competitor) product:\s*(?:Commented That|Asked)/i],
  },
  {
    id: "obs-3-lap-chole-symbotex",
    name: "lap chole with Symbotex standard",
    dictation: [
      "Observed Dr. Lettuce during a laparoscopic cholecystectomy today.",
      "Renee coordinated the case and had the room ready early.",
      "Dr. Lettuce mentioned Symbotex as their current mesh standard for abdominal wall work.",
      "My next step is to send clinical data on larger defect handling.",
    ].join(" "),
    expectVisible: [/Symbotex/i, /Renee/i, /clinical data|clinical-data|larger defect|Next step recommended|Email the published/i],
    expectHidden: [/(?:Current|Competitor) product:\s*Commented That/i, /Lettuce\s+—\s+Scheduling/i],
  },
  {
    id: "obs-4-ventral-repeat-bard",
    name: "repeat ventral hernia still on Bard Soft Mesh",
    dictation: [
      "Observed Dr. Lettuce again today during another ventral hernia repair.",
      "They were still using Bard Soft Mesh, so that's definitely looking like their standard product.",
      "Everything went pretty smoothly today with no fixation delays.",
      "I spoke with Sarah afterward and she said they're interested in scheduling an evaluation next month if the surgeon is open to it.",
    ].join(" "),
    expectVisible: [/Bard Soft Mesh/i, /Sarah/i, /evaluation/i],
    expectHidden: [/(?:Current|Competitor) product:\s*Commented That/i],
  },
  {
    id: "obs-5-complex-ventral-eval",
    name: "complex ventral with evaluation green light",
    dictation: [
      "Observed a complex ventral hernia case with Dr. Lettuce.",
      "He used Bard Soft Mesh again on a larger defect and again spent extra time getting the edges to lie flat.",
      "After the case he said the clinical package I emailed looked solid and he'd be willing to evaluate AmchoPlast during another observation.",
      "Sarah asked me to reach out in two weeks to lock the date.",
    ].join(" "),
    expectVisible: [
      /Bard Soft Mesh/i,
      /AmchoPlast|Amchoplast/i,
      /willing to evaluate|evaluate/i,
      /reach out.*(?:two|2)\s+weeks?/i,
      /Sarah/i,
    ],
    expectHidden: [/(?:Current|Competitor) product:\s*(?:Commented That|After)/i],
  },
];

export function extractObservationDictationFacts(dictation: string, scenarioId: string) {
  return runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "observation_case",
    context: { provider_display_name: OBSERVATION_DICTATION_PROVIDER },
  });
}

export function ufRunsFromObservationDictations(
  scenarios: ObservationDictationScenario[] = OBSERVATION_DICTATION_SCENARIOS,
): UniversalFactExtractionRun[] {
  return scenarios.map((scenario, index) => {
    const extraction = extractObservationDictationFacts(scenario.dictation, scenario.id);
    const caseId = `obs-case-${index + 1}`;
    return {
      capture_id: `obs-capture-${scenario.id}`,
      declared_source_type: "observation_case" as const,
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, factIndex) => ({
        ...fact,
        id: `${scenario.id}-${factIndex}`,
        capture_id: `obs-capture-${scenario.id}`,
        provider_id: null,
        organization_id: null,
        case_id: caseId,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    };
  });
}

export function whatWeKnowFromObservationDictations(
  scenarios: ObservationDictationScenario[] = OBSERVATION_DICTATION_SCENARIOS,
): string {
  const programRuns = ufRunsFromObservationDictations(scenarios);
  const completedCaseIds = scenarios.map((_, index) => `obs-case-${index + 1}`);
  return adaptUniversalFactsToWhatWeKnowLines({
    programRuns,
    completedCaseIds,
    programCompletedCount: completedCaseIds.length,
    countStyle: "program_fraction",
  }).join("\n");
}

export function factLabelsFromDictation(dictation: string): string {
  const extraction = extractObservationDictationFacts(dictation, "inline");
  return extraction.facts
    .map((fact) => `${fact.concept}: ${fact.normalized_label} :: ${fact.evidence_text}`)
    .join("\n");
}
