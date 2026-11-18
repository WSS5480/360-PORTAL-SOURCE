"use client";

import React from "react";
import { DEBRIEF_COMPLETION_REVIEW_HEADINGS } from "@/lib/surgical-sales/engagements/debriefCompletionCommercialCopy";
import { flattenDebriefCompletionProfileUpdates } from "@/lib/surgical-sales/engagements/buildDebriefCompletionCommercialReview";
import type { DebriefCompletionCommercialReview } from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";

function FindingList({
  items,
}: {
  items: Array<{ label: string; detail?: string; evidence?: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="ai-debrief-key-takeaways-list">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <span className="ai-debrief-key-takeaways-check" aria-hidden>
            •
          </span>
          <span>
            <strong>{item.detail?.trim() || item.label}</strong>
            {item.evidence ? (
              <span className="ai-debrief-update-card__quote"> — “{item.evidence}”</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RecordUpdateList({
  items,
}: {
  items: Array<{ label: string; detail?: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="ai-debrief-completion-record-list">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <span className="ai-debrief-completion-record-label">{item.label}</span>
          {item.detail ? (
            <span className="ai-debrief-completion-record-value">{item.detail}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function DebriefCompletionCommercialReviewPanel({
  review,
}: {
  review: DebriefCompletionCommercialReview;
}) {
  const outcomeLine = review.commercialFindings.opportunitiesIdentified[0];
  const outcomeEvidence = outcomeLine?.evidence?.trim();
  const keyFindings = [
    ...review.commercialFindings.validatedPainPoints,
    ...review.commercialFindings.qualifiedPainPoints,
    ...review.commercialFindings.rejectedPainPoints,
  ];
  const recordUpdates = flattenDebriefCompletionProfileUpdates(review.providerProfileUpdates);
  const showClinicalRead =
    review.whatWeLearned.trim().length > 0 &&
    !keyFindings.some((row) => review.whatWeLearned.toLowerCase().includes((row.detail ?? row.label).toLowerCase()));

  return (
    <div
      className="ai-debrief-review ai-debrief-review--rep-friendly ai-debrief-review--completion-compact"
      data-testid="debrief-completion-commercial-review"
    >
      <section
        className="ai-debrief-summary ai-debrief-completion-outcome"
        aria-label={DEBRIEF_COMPLETION_REVIEW_HEADINGS.nextStep}
      >
        <p className="ai-debrief-completion-outcome-kicker">{DEBRIEF_COMPLETION_REVIEW_HEADINGS.nextStep}</p>
        <p className="ai-debrief-completion-outcome-title">
          <strong>{review.recommendedNextStep.selectedLabel}</strong>
        </p>
        <p className="ai-debrief-summary__takeaway-text">{review.recommendedNextStep.reason}</p>
        {outcomeEvidence ? (
          <p className="ai-debrief-update-card__quote ai-debrief-completion-outcome-quote">
            “{outcomeEvidence}”
          </p>
        ) : null}
      </section>

      {showClinicalRead ? (
        <section className="ai-debrief-review-section" aria-label={DEBRIEF_COMPLETION_REVIEW_HEADINGS.whatWeLearned}>
          <h3 className="ai-debrief-review-section__title">{DEBRIEF_COMPLETION_REVIEW_HEADINGS.whatWeLearned}</h3>
          <p className="ai-debrief-summary__takeaway-text">{review.whatWeLearned}</p>
        </section>
      ) : null}

      {keyFindings.length > 0 ? (
        <section className="ai-debrief-review-section" aria-label={DEBRIEF_COMPLETION_REVIEW_HEADINGS.keyFindings}>
          <h3 className="ai-debrief-review-section__title">{DEBRIEF_COMPLETION_REVIEW_HEADINGS.keyFindings}</h3>
          <FindingList items={keyFindings} />
        </section>
      ) : null}

      {recordUpdates.length > 0 ? (
        <section className="ai-debrief-review-section" aria-label={DEBRIEF_COMPLETION_REVIEW_HEADINGS.recordUpdates}>
          <h3 className="ai-debrief-review-section__title">{DEBRIEF_COMPLETION_REVIEW_HEADINGS.recordUpdates}</h3>
          <RecordUpdateList items={recordUpdates} />
        </section>
      ) : null}
    </div>
  );
}
