"use client";

import {
  FIELD_BRIEFING_PRIMARY_QUESTION_BADGE,
  FIELD_BRIEFING_QUESTION_QUEUE_LABEL,
  LIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { asksForFieldExecution, type PrepareTacticalAsk } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";

export function FieldBriefingQuestionQueue({
  asks,
  emptyHint,
  className = "",
}: {
  asks: PrepareTacticalAsk[];
  emptyHint: string;
  className?: string;
}) {
  const activeAsks = asksForFieldExecution(asks);
  const primaryAsk = activeAsks[0] ?? null;
  const secondaryAsks = activeAsks.slice(1);

  return (
    <section
      className={`pfm-briefing-question-queue ${className}`.trim()}
      aria-labelledby="pfm-briefing-question-queue-title"
    >
      <h2 id="pfm-briefing-question-queue-title" className="pfm-briefing-question-queue__title">
        {FIELD_BRIEFING_QUESTION_QUEUE_LABEL}
      </h2>

      {primaryAsk ? (
        <div className="pfm-briefing-primary-question" aria-label="Primary question">
          <span className="pfm-briefing-primary-question__badge">{FIELD_BRIEFING_PRIMARY_QUESTION_BADGE}</span>
          <p className="pfm-briefing-primary-question__text">{primaryAsk.text}</p>
        </div>
      ) : (
        <p className="pfm-briefing-question-queue__empty">{emptyHint}</p>
      )}

      {secondaryAsks.length > 0 ? (
        <div className="pfm-briefing-secondary-questions">
          <h3 className="pfm-briefing-secondary-questions__title">
            {LIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL}
          </h3>
          <ol className="pfm-briefing-secondary-questions__list" role="list">
            {secondaryAsks.map((ask, index) => (
              <li key={ask.id} className="pfm-briefing-secondary-questions__item">
                <span className="pfm-briefing-secondary-questions__order" aria-hidden>
                  {index + 1}
                </span>
                <p className="pfm-briefing-secondary-questions__text">{ask.text}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
