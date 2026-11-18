"use client";

import React from "react";
import { buildObservationDebriefReadinessView } from "@/lib/surgical-sales/buildObservationDebriefReadinessView";
import { GENERATE_DEBRIEF_LABEL } from "@/lib/surgical-sales/observationProgramGate";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationCaseDebriefReadinessCss } from "./observationCaseDebriefReadinessCss";

function ReadinessBlock({
  title,
  items,
  emptyCopy,
}: {
  title: string;
  items: string[];
  emptyCopy: string;
}) {
  return (
    <article className="case-obs-debrief-readiness-block">
      <h3 className="case-obs-debrief-readiness-block-title">{title}</h3>
      {items.length > 0 ? (
        <ul className="case-obs-debrief-readiness-list">
          {items.map((item) => (
            <li key={`${title}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="case-obs-debrief-readiness-empty">{emptyCopy}</p>
      )}
    </article>
  );
}

export function ObservationCaseDebriefReadiness({
  caseRow,
  disabled,
  compact = false,
  variant = "full",
  debriefUnlocked = false,
  onPlanDebrief,
  fieldExecution = false,
}: {
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  compact?: boolean;
  variant?: "full" | "after-action" | "planner";
  debriefUnlocked?: boolean;
  onPlanDebrief?: () => void;
  fieldExecution?: boolean;
}) {
  if (!debriefUnlocked) return null;
  const view = React.useMemo(() => buildObservationDebriefReadinessView(caseRow), [caseRow]);
  const isAfterAction = variant === "after-action";
  const isPlanner = variant === "planner";
  const sectionTitle = isPlanner
    ? OBSERVATION_DETAIL_SECTION_LABELS.debriefPlanner
    : isAfterAction
      ? OBSERVATION_DETAIL_SECTION_LABELS.afterObservation
      : OBSERVATION_DETAIL_SECTION_LABELS.debriefReadiness;

  return (
    <section
      className={`case-obs-debrief-readiness case-obs-detail-card${view.hasIntelligence ? " case-obs-debrief-readiness--active" : ""}${compact ? " case-obs-detail-card--compact" : ""}${isAfterAction ? " case-obs-debrief-readiness--after-action" : ""}${isPlanner ? " case-obs-debrief-readiness--planner" : ""}`}
      aria-labelledby="case-obs-debrief-readiness-title"
    >
      <style dangerouslySetInnerHTML={{ __html: observationCaseDebriefReadinessCss }} />

      <div className="case-obs-debrief-readiness-head">
        <h2 id="case-obs-debrief-readiness-title" className="case-obs-detail-card-title">
          {sectionTitle}
        </h2>
        <p className="case-obs-debrief-readiness-lead">
          {fieldExecution
            ? view.hasIntelligence
              ? "Topics to cover with the provider after the case."
              : "Dictate a few notes first — debrief topics will appear here."
            : isPlanner && !view.hasIntelligence
              ? "Capture field notes first — debrief topics will build after the observation."
              : isAfterAction && !view.hasIntelligence
                ? "Capture field notes first — debrief topics will build after the observation."
                : isPlanner
                  ? "Suggested topics and next steps based on what you captured in the field."
                  : view.readinessSummary}
        </p>
      </div>

      {!isAfterAction || view.hasIntelligence ? (
        <>
          {!isAfterAction && !isPlanner && !fieldExecution ? (
            <div className="case-obs-debrief-readiness-grid">
              <ReadinessBlock
                title="Pain Points Identified"
                items={view.painPoints}
                emptyCopy="No pain points captured yet."
              />
              <ReadinessBlock
                title="Competitive Products Seen"
                items={view.competitiveProducts}
                emptyCopy="No competitive products captured yet."
              />
              <ReadinessBlock
                title="Potential Product Fits"
                items={view.potentialProductFits}
                emptyCopy="No product fit signals captured yet."
              />
              <ReadinessBlock
                title="Unanswered Questions"
                items={view.unansweredQuestions}
                emptyCopy="Add learning questions to guide the debrief."
              />
            </div>
          ) : null}

      {view.suggestedTopics.length > 0 ? (
        <div className="case-obs-debrief-readiness-topics" aria-label="Suggested debrief topics">
          <h3 className="case-obs-debrief-readiness-block-title">Suggested Debrief Topics</h3>
          {view.suggestedTopics.map((topic) => (
            <article key={topic.id} className="case-obs-debrief-readiness-topic">
              <div className="case-obs-debrief-readiness-topic-source">
                <span className="case-obs-debrief-readiness-topic-label">{topic.sourceLabel}</span>
                <span className="case-obs-debrief-readiness-topic-value">{topic.sourceValue}</span>
              </div>
              <span className="case-obs-debrief-readiness-topic-arrow" aria-hidden>
                →
              </span>
              <p className="case-obs-debrief-readiness-topic-suggestion">{topic.topic}</p>
            </article>
          ))}
        </div>
      ) : null}

      {!fieldExecution && view.suggestedObjectives.length > 0 ? (
        <div className="case-obs-debrief-readiness-objectives" aria-label="Suggested conversation objectives">
          <h3 className="case-obs-debrief-readiness-block-title">Suggested Conversation Objectives</h3>
          {view.suggestedObjectives.map((objective) => (
            <p key={objective} className="case-obs-debrief-readiness-objective">
              {objective}
            </p>
          ))}
        </div>
          ) : null}
        </>
      ) : null}

      {onPlanDebrief ? (
        <div className="case-obs-debrief-readiness-cta">
          <button
            type="button"
            className="case-obs-debrief-readiness-cta-btn"
            disabled={disabled || !view.hasIntelligence}
            onClick={onPlanDebrief}
          >
            {GENERATE_DEBRIEF_LABEL}
          </button>
          {!view.hasIntelligence ? (
            <p className="case-obs-debrief-readiness-cta-note">
              {fieldExecution
                ? "Dictate notes on the Briefing tab to unlock debrief planning."
                : "Capture observation notes first — debrief topics will build after the case."}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
