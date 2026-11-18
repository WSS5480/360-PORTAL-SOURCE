"use client";

import type { ClassifiedEngagementOutcome } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import {
  INTRO_CALL_CONVERSATION_RESULT_LEAD,
  INTRO_CALL_CONVERSATION_RESULT_TITLE,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

const OUTCOME_TONE: Record<
  StartMissionOutcomeId,
  "success" | "neutral" | "negative"
> = {
  observation_approved: "success",
  follow_up_needed: "neutral",
  observation_denied: "negative",
  no_meaningful_update: "negative",
  touch_success: "success",
  touch_follow_up: "neutral",
  touch_no_progress: "negative",
};

export type ConversationResultDisplay = ClassifiedEngagementOutcome & {
  evidence?: string;
};

export function PrepareIntroCallConversationResultPanel({
  result,
  title = INTRO_CALL_CONVERSATION_RESULT_TITLE,
  lead = INTRO_CALL_CONVERSATION_RESULT_LEAD,
  compact = false,
}: {
  result: ConversationResultDisplay;
  title?: string;
  lead?: string;
  /** Hide duplicate header when the sheet already shows the title. */
  compact?: boolean;
}) {
  const tone = OUTCOME_TONE[result.outcomeId as StartMissionOutcomeId] ?? "neutral";
  const evidence = result.evidence?.trim();
  const showEvidence =
    Boolean(evidence) && evidence!.toLowerCase() !== result.rationale.trim().toLowerCase();

  return (
    <section
      className="pfm-debrief-conversation-result"
      aria-labelledby="intro-call-conversation-result-title"
      data-testid="intro-call-conversation-result"
    >
      {compact ? null : (
        <header className="pfm-debrief-conversation-result__head">
          <p className="pfm-debrief-conversation-result__kicker">Intelligence review complete</p>
          <h2 id="intro-call-conversation-result-title" className="pfm-debrief-conversation-result__title">
            {title}
          </h2>
          <p className="pfm-debrief-conversation-result__lead">{lead}</p>
        </header>
      )}
      <div
        className={`pfm-debrief-conversation-result__card pfm-debrief-conversation-result__card--${tone}`}
      >
        <p className="pfm-debrief-conversation-result__label">{result.label}</p>
        <p className="pfm-debrief-conversation-result__rationale">{result.rationale}</p>
        {showEvidence ? (
          <p className="pfm-debrief-conversation-result__evidence">“{evidence}”</p>
        ) : null}
      </div>
    </section>
  );
}
