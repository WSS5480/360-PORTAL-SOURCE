/**

 * Debrief intelligence pipeline — structured facts architecture:

 * OpenAI atomic facts → normalize/dedupe → classify → rules → review cards (templates only).

 */



import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";

import {

  flattenExtractedFacts,

  runPass1FromAtomicFacts,

} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

import { runPass2Classification } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass2Classification";

import {

  acceptedClassifiedFacts,

  runPass3RulesEngine,

} from "@/lib/surgical-sales/debriefIntelligencePipeline/pass3Rules";

import { runPass3ReviewRendering } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass3ReviewRendering";

import type { DebriefIntelligencePipelineResult } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";



export type {

  DebriefRawFact,

  DebriefClassifiedFact,

  DebriefRulesOutcome,

  DebriefPass4Synthesis,

  DebriefIntelligenceCapturedItem,

  DebriefRecommendedAction,

  DebriefIntelligencePipelineResult,

  DebriefFactClassification,

  DebriefIntelligenceCapturedKind,

  DebriefRecommendedActionKind,

  DebriefExtractedFacts,

  DebriefExtractedFactRecord,

  DebriefFactKey,

} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";



export type {

  DebriefAtomicFact,

  DebriefAtomicFactRejection,

  DebriefAtomicFactRejectionReason,

  DebriefFactExtractionResult,

} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";



export {

  normalizeAndDedupeAtomicFacts,

  normalizeAndDedupeAtomicFactsWithRejections,

  atomicFactsToExtractedFacts,

  buildParseResultFromDebriefFacts,

  buildFieldUpdatesFromClassifiedFacts,

  proposedContactsFromAtomicFacts,

  flattenExtractedFacts,

  runPass1FromAtomicFacts,

} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";



export { runOpenAiDebriefFactExtraction } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFactExtraction";

export {
  buildReviewUpdateItems,
  buildReviewUpdateItemsAudited,
  type ReviewUpdateItem,
  type ReviewUpdateItemType,
  MAX_FOLLOW_UP_DECISIONS,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateItems";

export {
  buildDebriefReviewDecisions,
  type DebriefReviewDecision,
  type DebriefReviewDecisionType,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisions";

export { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";



/** @deprecated Use runPass1FromAtomicFacts */

export { runPass1FactExtraction } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass1FactExtraction";

export { runPass1RawFactExtraction } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass1RawFacts";

export { runPass2Classification } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass2Classification";

export { runPass3RulesEngine, acceptedClassifiedFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass3Rules";

export { runPass3ReviewRendering } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass3ReviewRendering";

/** @deprecated Pass 4 merged into Pass 3 rendering */

export { runPass4Synthesis } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass4Synthesis";

/** @deprecated Pass 5 merged into Pass 3 rendering */

export { runPass5IntelligenceCaptured } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass5IntelligenceCaptured";

/** @deprecated Pass 6 merged into Pass 3 rendering */

export { runPass6RecommendedActions } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass6RecommendedActions";

/** @deprecated Use runPass5IntelligenceCaptured */

export { runPass5ReviewCards } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass5ReviewCards";



export function runDebriefIntelligencePipeline(input: {

  dictation: string;

  atomicFacts: DebriefAtomicFact[];

  proposedContacts: DebriefProposedContactItem[];

}): DebriefIntelligencePipelineResult {

  const pass1_extractedFacts = runPass1FromAtomicFacts(input.atomicFacts, input.dictation);

  const pass1_rawFacts = flattenExtractedFacts(pass1_extractedFacts);

  const pass2_classifiedFacts = runPass2Classification(pass1_rawFacts);

  const pass3_rules = runPass3RulesEngine({

    dictation: input.dictation,

    classifiedFacts: pass2_classifiedFacts,

    proposedContacts: input.proposedContacts,

  });

  const acceptedFacts = acceptedClassifiedFacts(pass2_classifiedFacts, pass3_rules);

  const rendered = runPass3ReviewRendering({

    dictation: input.dictation,

    review: null,

    acceptedFacts,

    rules: pass3_rules,

    proposedContacts: input.proposedContacts,

  });



  return {

    pass1_extractedFacts,

    pass1_rawFacts,

    pass2_classifiedFacts,

    pass3_rules,

    pass4_synthesis: rendered.synthesis,

    intelligenceCaptured: rendered.intelligenceCaptured,

    recommendedActions: rendered.recommendedActions,

    pass5_reviewCards: rendered.intelligenceCaptured,

  };

}


