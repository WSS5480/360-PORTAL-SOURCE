/**
 * Mission Board post-complete dictation — reuses tactical debrief OIE parse → review → auto-accept pipeline.
 */

import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildDebriefDiscoveryPersistPayload } from "@/lib/surgical-sales/debriefDiscoveryMappingPipeline";
import { acceptAllDebriefReviewUpdates } from "@/lib/surgical-sales/debriefReviewItemState";
import { simulateDebriefReviewOutcomeAcceptance } from "@/lib/surgical-sales/simulateDebriefReviewOutcomeAcceptance";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import {
  buildMissionBoardDebriefDictationReport,
  type MissionBoardDebriefDictationReport,
} from "@/lib/surgical-sales/missionBoardDebriefDictationReport";

export type MissionBoardDebriefDictationPipelineResult = {
  logUpdate: LogUpdateParseResult;
  report: MissionBoardDebriefDictationReport;
};

export function finalizeMissionBoardDebriefLogUpdate(input: {
  parse: LogUpdateParseResult;
  dictation: string;
  providerContact?: Record<string, unknown> | null;
  providerLabel?: string | null;
  pathwayGate: PathwayGateInput;
  sourceLabel?: string;
  /** Post-observation provider debrief — keep extraction but do not auto-accept field patches. */
  skipAutoAccept?: boolean;
}): MissionBoardDebriefDictationPipelineResult {
  const dictation = input.dictation.trim();
  const guardContext = buildDebriefReviewDecisionContext({
    providerContact: input.providerContact,
    providerLabel: input.providerLabel,
  });
  const proposedContacts = buildInitialProposedContacts({
    review: input.parse,
    sourceReference: "Mission Board debrief dictation",
  });
  const extraction = buildDebriefIntelligenceExtractionReview({
    review: input.parse,
    proposedContacts,
    sourceReference: "Mission Board debrief dictation",
  });

  let logUpdate = input.parse;
  if (!input.skipAutoAccept) {
    logUpdate = simulateDebriefReviewOutcomeAcceptance({
      review: input.parse,
      dictation,
      extraction,
      proposedContacts,
      guardContext,
    });

    const hasAcceptedFields = logUpdate.fieldUpdates.some((u) => u.accepted);
    if (logUpdate.usesProviderIntelligence && !hasAcceptedFields) {
      logUpdate = acceptAllDebriefReviewUpdates(logUpdate);
    }
  }

  const persistPayload = buildDebriefDiscoveryPersistPayload({
    logUpdate,
    sourceLabel: input.sourceLabel ?? "Mission Board debrief dictation",
    existingContact: input.pathwayGate.contact,
    proposedContacts,
  });

  const report = buildMissionBoardDebriefDictationReport({
    dictation,
    logUpdate,
    extraction,
    proposedContacts,
    persistPayload,
    pathwayGate: input.pathwayGate,
  });

  return { logUpdate, report };
}
