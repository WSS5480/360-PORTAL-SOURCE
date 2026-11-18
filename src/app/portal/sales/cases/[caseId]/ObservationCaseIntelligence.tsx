"use client";

import React from "react";
import {
  buildObservationIntelligenceView,
  OBSERVATION_INTELLIGENCE_EMPTY,
} from "@/lib/surgical-sales/buildObservationIntelligenceView";
import {
  buildRepFriendlyIntelligenceBriefing,
  repFriendlyGroupsHaveItems,
  type RepFriendlyIntelligenceCategoryId,
} from "@/lib/surgical-sales/repFriendlyIntelligenceGroups";
import { observationCaseIntelligenceCss } from "./observationCaseIntelligenceCss";

const ACTION_HINTS: Record<RepFriendlyIntelligenceCategoryId, string> = {
  current_workflow: "Confirm what they use today and how the case actually runs.",
  challenges_friction: "Watch for repeated workflow pain, access issues, delays, or staff burden.",
  product_signals: "Connect questions, objections, and evaluation interest to product fit.",
  people_access: "Capture who can help with access, scheduling, credentialing, or influence.",
  next_steps: "Turn the note into a clear follow-up action.",
};

function cardStatus(hasItems: boolean): {
  label: string;
  tone: "confirmed" | "watch" | "open";
} {
  if (hasItems) return { label: "Confirmed", tone: "confirmed" };
  return { label: "Watch", tone: "watch" };
}

export function ObservationCaseIntelligence({
  caseRow,
  compact = false,
  hideTitle = false,
  filledOnly = false,
  title = "Observation Intelligence",
}: {
  caseRow: Record<string, unknown>;
  compact?: boolean;
  hideTitle?: boolean;
  filledOnly?: boolean;
  title?: string;
}) {
  const view = React.useMemo(() => buildObservationIntelligenceView(caseRow), [caseRow]);
  const briefing = React.useMemo(
    () =>
      buildRepFriendlyIntelligenceBriefing(
        view.categories.flatMap((category) =>
          category.items.map((text, index) => ({
            id: `${category.id}-${index}`,
            text,
            evidenceText: text,
            sourceNoteText: text,
            extractedFactId: `${category.id}-${index}`,
            sourceCategory: category.id,
          })),
        ),
      ),
    [view.categories],
  );
  const groupedCategories = briefing.groups;
  const categories = filledOnly
    ? groupedCategories.filter((category) => category.items.length > 0)
    : groupedCategories;
  const hasGroupedContent = repFriendlyGroupsHaveItems(groupedCategories);
  const showEmptyState = filledOnly && categories.length === 0;

  return (
    <section
      className={`case-obs-intelligence${compact ? " case-obs-intelligence--compact" : ""}${hasGroupedContent ? " case-obs-intelligence--active" : ""}`}
      aria-labelledby={hideTitle ? undefined : "case-obs-intelligence-title"}
    >
      <style dangerouslySetInnerHTML={{ __html: observationCaseIntelligenceCss }} />
      {hideTitle ? null : (
        <header className="case-obs-intelligence-head">
          <div>
            <p className="case-obs-intelligence-kicker">Field intelligence</p>
            <h2 id="case-obs-intelligence-title" className="case-obs-intelligence-title">
              {title}
            </h2>
            {!compact ? (
              <p className="case-obs-intelligence-lead">
                Actionable signals from the OR — each card tells you what was confirmed and what to do next.
              </p>
            ) : null}
          </div>
          {view.extractedAt ? (
            <p className="case-obs-intelligence-updated">
              Updated{" "}
              {new Date(view.extractedAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : null}
        </header>
      )}

      {showEmptyState ? (
        <div className="case-obs-intelligence-empty-card">
          <p className="case-obs-intelligence-empty-title">No intelligence captured yet</p>
          <p className="case-obs-intelligence-empty-copy">
            Capture field notes or use quick capture — signals populate here automatically.
          </p>
        </div>
      ) : (
        <>
          {hasGroupedContent ? (
            <p className="case-obs-intelligence-summary">{briefing.summary}</p>
          ) : null}
          <div className="case-obs-intelligence-grid" role="list">
            {categories.map((category) => {
              const hasItems = category.items.length > 0;
              const status = cardStatus(hasItems);
              const actionHint = ACTION_HINTS[category.id] ?? "Validate during observation.";
              const previewItems = category.items.slice(0, compact ? 2 : 4);

              return (
                <article
                  key={category.id}
                  className={`case-obs-intel-card case-obs-intel-card--${status.tone}${hasItems ? " case-obs-intel-card--filled" : ""}`}
                  role="listitem"
                  aria-label={category.title}
                >
                  <div className="case-obs-intel-card-head">
                    <div className="case-obs-intel-card-head-main">
                      <h3 className="case-obs-intel-card-title">{category.title}</h3>
                      <p className="case-obs-intel-card-hint">{actionHint}</p>
                    </div>
                    <span className={`case-obs-intel-card-badge case-obs-intel-card-badge--${status.tone}`}>
                      {status.label}
                    </span>
                  </div>

                  {hasItems ? (
                    <>
                      <div className="case-obs-intel-card-meter" aria-hidden>
                        <div
                          className="case-obs-intel-card-meter-fill"
                          style={{ width: `${Math.min(category.items.length * 25, 100)}%` }}
                        />
                      </div>
                      <ul className="case-obs-intel-card-signals">
                        {previewItems.map((item) => (
                          <li key={`${category.id}-${item.text}`}>{item.text}</li>
                        ))}
                      </ul>
                      {category.items.length > previewItems.length ? (
                        <p className="case-obs-intel-card-more">
                          +{category.items.length - previewItems.length} more signal
                          {category.items.length - previewItems.length === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="case-obs-intel-card-empty">{OBSERVATION_INTELLIGENCE_EMPTY}</p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {!filledOnly && !hasGroupedContent ? (
        <p className="case-obs-intelligence-footnote">
          {groupedCategories.length} intelligence lanes ready — capture notes to populate cards.
        </p>
      ) : null}
    </section>
  );
}
