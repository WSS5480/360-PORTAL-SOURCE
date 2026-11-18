/**
 * Golden dictations for DIP vs UF extraction parity gate (Phase 0).
 */

import { DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS } from "@/lib/surgical-sales/debriefExtractionRegressionFixtures";
import {
  INTRO_CALL_SANDY_BERRY_DICTATION,
  INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
} from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";

export type DebriefExtractionParityFixture = {
  id: string;
  label: string;
  dictation: string;
  declaredSource: "intro_call" | "debrief_note" | "discovery_note";
};

export const DEBRIEF_EXTRACTION_PARITY_FIXTURES: DebriefExtractionParityFixture[] = [
  ...DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    dictation: scenario.dictation,
    declaredSource: "debrief_note" as const,
  })),
  {
    id: "tom_sandy_jennifer_intro",
    label: "Tom Sandy intro call (Jennifer scheduler)",
    dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    declaredSource: "intro_call",
  },
  {
    id: "sandy_berry_intro",
    label: "Sandy Berry intro call",
    dictation: INTRO_CALL_SANDY_BERRY_DICTATION,
    declaredSource: "intro_call",
  },
  {
    id: "dr_fig_procedure_volume",
    label: "Dr Fig-style procedure volume dictation",
    dictation:
      "Clinically he has been doing more complex abdominal wall reconstruction cases and more robotic ventral hernia repairs than last year. He uses Acumed for many of his ventral cases.",
    declaredSource: "intro_call",
  },
];

/** Dictations exported for parity reuse by regression suites. */
export const PARITY_GOLDEN_DICTATIONS = DEBRIEF_EXTRACTION_PARITY_FIXTURES.map((fixture) => fixture.dictation);
