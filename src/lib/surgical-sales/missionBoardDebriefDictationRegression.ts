/**
 * Deterministic regression runner for Mission Board post-complete debrief dictation (no live OpenAI).
 */

import { buildDebriefParseForRegression } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { finalizeMissionBoardDebriefLogUpdate } from "@/lib/surgical-sales/missionBoardDebriefDictationPipeline";
import type { MissionBoardDebriefDictationReport } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import { SALES_PATHWAY_MIN_OBSERVATIONS } from "@/lib/surgical-sales/salesPathwayCanonical";
import { productFitValidatedContact } from "@/lib/surgical-sales/salesPathwayTestFixtures";

export function buildPostDebriefDictationPathwayGate(
  contactExtra: Record<string, unknown> = {},
): PathwayGateInput {
  return {
    contact: productFitValidatedContact({
      provider_observation_sequence_complete: "yes",
      ...contactExtra,
    }),
    cases: Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, index) => ({
      id: `obs-case-${index + 1}`,
      case_type: "observation",
      status: "completed",
      debrief_completed: true,
    })),
    engagements: [
      {
        id: "debrief-eng-1",
        engagement_type: "provider_debrief",
        status: "completed",
        debrief_completed: true,
      },
    ],
  };
}

export function runMissionBoardDebriefDictationRegression(input: {
  dictation: string;
  pathwayGate?: PathwayGateInput;
  providerLabel?: string;
}): MissionBoardDebriefDictationReport {
  const pathwayGate = input.pathwayGate ?? buildPostDebriefDictationPathwayGate();
  const parse = buildDebriefParseForRegression({ dictation: input.dictation });
  const { report } = finalizeMissionBoardDebriefLogUpdate({
    parse,
    dictation: input.dictation,
    providerContact: pathwayGate.contact,
    providerLabel: input.providerLabel ?? "Dr. Test Provider",
    pathwayGate,
    sourceLabel: "Mission Board debrief dictation regression",
  });
  return report;
}
