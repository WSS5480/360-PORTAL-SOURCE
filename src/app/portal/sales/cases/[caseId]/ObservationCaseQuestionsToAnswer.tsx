"use client";

import React from "react";
import {
  buildObservationIntelligenceView,
  hasObservationIntelligenceContent,
} from "@/lib/surgical-sales/buildObservationIntelligenceView";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationCaseQuestionsToAnswerCss } from "./observationCaseQuestionsToAnswerCss";

export const OBSERVATION_QUESTIONS_TO_ANSWER = [
  { id: "current_products", label: "Current products used", categoryId: "product_fit_signals" as const },
  { id: "competitor_products", label: "Competitor products", categoryId: "competitor_products" as const },
  { id: "workflow_bottlenecks", label: "Workflow bottlenecks", categoryId: "workflow_friction" as const },
  { id: "provider_frustrations", label: "Provider frustrations", categoryId: "clinical_pain_points" as const },
  { id: "staff_frustrations", label: "Staff frustrations", categoryId: "staff_observations" as const },
] as const;

function questionStatus(
  categoryId: (typeof OBSERVATION_QUESTIONS_TO_ANSWER)[number]["categoryId"],
  caseRow: Record<string, unknown>,
  hasCapture: boolean,
): { label: string; tone: "open" | "partial" | "answered" } {
  const intelligence = buildObservationIntelligenceView(caseRow);
  const count =
    intelligence.categories.find((category) => category.id === categoryId)?.items.length ?? 0;

  if (count > 0) {
    return { label: `${count} captured`, tone: "answered" };
  }

  if (hasCapture) {
    return { label: "Still open", tone: "partial" };
  }

  return { label: "To learn", tone: "open" };
}

export function ObservationCaseQuestionsToAnswer({ caseRow }: { caseRow: Record<string, unknown> }) {
  const hasCapture = hasObservationIntelligenceContent(caseRow);

  return (
    <section
      className="case-obs-questions-to-answer case-obs-detail-card"
      aria-labelledby="case-obs-questions-to-answer-title"
    >
      <style dangerouslySetInnerHTML={{ __html: observationCaseQuestionsToAnswerCss }} />
      <header className="case-obs-questions-to-answer-head">
        <h2 id="case-obs-questions-to-answer-title" className="case-obs-detail-card-title">
          {OBSERVATION_DETAIL_SECTION_LABELS.questionsToAnswer}
        </h2>
        <p className="case-obs-questions-to-answer-lead">
          Answer these during the observation — notes populate intelligence automatically.
        </p>
      </header>
      <ul className="case-obs-questions-to-answer-list">
        {OBSERVATION_QUESTIONS_TO_ANSWER.map((question) => {
          const status = questionStatus(question.categoryId, caseRow, hasCapture);
          return (
            <li key={question.id} className="case-obs-questions-to-answer-row">
              <span className="case-obs-questions-to-answer-label">{question.label}</span>
              <span
                className={`case-obs-questions-to-answer-status case-obs-questions-to-answer-status--${status.tone}`}
              >
                {status.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
