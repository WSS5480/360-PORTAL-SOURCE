"use client";

import React from "react";
import {
  buildOptionalIntelligenceOverviewItems,
  buildProviderOverviewOptionalIntelligenceView,
  OPTIONAL_INTELLIGENCE_SECTION_LEAD,
  OPTIONAL_INTELLIGENCE_SECTION_TITLE,
} from "@/lib/surgical-sales/optionalIntelligenceCategories";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";

/** Read-only optional intelligence on provider profile — capture entry points removed. */
export function OptionalIntelligenceOverviewSection({
  contact,
  defaultOpen = false,
  compact = false,
  layout = "list",
  nested = false,
}: {
  contact: Record<string, unknown>;
  defaultOpen?: boolean;
  compact?: boolean;
  layout?: "list" | "overview";
  nested?: boolean;
}) {
  const overviewView = React.useMemo(
    () => (layout === "overview" ? buildProviderOverviewOptionalIntelligenceView({ contact }) : null),
    [contact, layout],
  );
  const items = React.useMemo(
    () => (layout === "list" ? buildOptionalIntelligenceOverviewItems({ contact }) : []),
    [contact, layout],
  );

  if (layout === "overview" && overviewView) {
    const overviewBody = (
      <>
        {overviewView.hasData ? (
          <ul className="pov-optional-intel__flat-list">
            {overviewView.rows.map((row) => (
              <li key={row.id} className="pov-optional-intel__flat-row">
                <span className="pov-optional-intel__flat-label">{row.label}:</span>{" "}
                <span className="pov-optional-intel__flat-value">{row.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pov-bottom-accordion__empty">{BRIEF.noSupplementaryBriefingYet}</p>
        )}
      </>
    );

    if (nested) {
      return (
        <section
          className={`pov-supporting-subsection pov-optional-intel pov-optional-intel--overview${compact ? " pov-optional-intel--compact" : ""}`}
          data-testid="pov-optional-intelligence"
        >
          <h4 className="pov-supporting-subsection__title">{OPTIONAL_INTELLIGENCE_SECTION_TITLE}</h4>
          <div className="pov-optional-intel__body pov-optional-intel__body--overview">{overviewBody}</div>
        </section>
      );
    }

    return (
      <details
        className={`pov-bottom-accordion pov-optional-intel pov-optional-intel--overview${compact ? " pov-optional-intel--compact" : ""}`}
        data-testid="pov-optional-intelligence"
      >
        <summary className="pov-bottom-accordion__summary">
          <span className="pov-bottom-accordion__summary-label">{OPTIONAL_INTELLIGENCE_SECTION_TITLE}</span>
          {overviewView.capturedCount > 0 ? (
            <span
              className="pov-bottom-accordion__badge"
              aria-label={`${overviewView.capturedCount} captured`}
            >
              {overviewView.capturedCount}
            </span>
          ) : null}
        </summary>
        <div className="pov-bottom-accordion__body pov-optional-intel__body pov-optional-intel__body--overview">
          {overviewBody}
        </div>
      </details>
    );
  }

  const capturedCount = items.length;

  return (
    <details
      className={`pov-optional-intel${compact ? " pov-optional-intel--compact" : ""}`}
      data-testid="pov-optional-intelligence"
      open={defaultOpen}
    >
      <summary className="pov-optional-intel__summary">
        <span>{OPTIONAL_INTELLIGENCE_SECTION_TITLE}</span>
        {capturedCount > 0 ? (
          <span className="pov-optional-intel__count">{capturedCount}</span>
        ) : null}
      </summary>
      <div className="pov-optional-intel__body">
        <p className="pov-optional-intel__lead">{OPTIONAL_INTELLIGENCE_SECTION_LEAD}</p>
        {items.length > 0 ? (
          <ul className="pov-optional-intel__list">
            {items.map((item) => (
              <li key={item.id} className="pov-optional-intel__item">
                <p className="pov-optional-intel__item-label">{item.label}</p>
                <p className="pov-optional-intel__item-summary">{item.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pov-optional-intel__empty">{BRIEF.noSupplementaryBriefingYet}</p>
        )}
      </div>
    </details>
  );
}
