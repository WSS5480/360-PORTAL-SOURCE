"use client";

import React from "react";
import type {
  ProviderOverviewCommandIntelligenceItem,
  ProviderOverviewIntelligenceSummary,
} from "@/lib/surgical-sales/buildProviderOverviewIntelligenceSummary";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";

function CommandIntelligenceCard({ item }: { item: ProviderOverviewCommandIntelligenceItem }) {
  return (
    <article
      className={`pov-cc-command-card pov-cc-command-card--${item.tone}`}
      data-command-id={item.id}
      data-testid={`pov-command-${item.id}`}
    >
      <h3 className="pov-cc-command-card__label">{item.label}</h3>
      <p className="pov-cc-command-card__value">{item.value}</p>
      {item.detailLine ? (
        <p className="pov-cc-command-card__detail">{item.detailLine}</p>
      ) : null}
    </article>
  );
}

function commandSummaryLine(items: ProviderOverviewCommandIntelligenceItem[]): string {
  return items.map((item) => `${item.label}: ${item.value}`).join(" · ");
}

export function ProviderOverviewIntelligenceSummary({
  summary,
}: {
  summary: ProviderOverviewIntelligenceSummary;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const items = summary.commandIntelligence;
  const primaryAction = items.find((item) => item.id === "next_best_action");

  return (
    <section
      className={`pov-cc-intel-zone pov-cc-command-zone${
        expanded ? " pov-cc-intel-zone--expanded" : " pov-cc-intel-zone--collapsed"
      }`}
      data-testid="pov-intelligence-summary"
    >
      <button
        type="button"
        className="pov-cc-intel-zone__strip"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="pov-cc-intel-zone__strip-copy">
          <p className="pov-cc-intel-zone__kicker">{BRIEF.fieldBriefingKicker}</p>
          <h2 className="pov-cc-intel-zone__title">{BRIEF.fieldBriefing}</h2>
          <p className="pov-cc-intel-zone__summary">
            {!expanded ? (
              <span className="pov-cc-intel-zone__stat">{commandSummaryLine(items)}</span>
            ) : primaryAction ? (
              <span className="pov-cc-intel-zone__stat pov-cc-intel-zone__stat--action">
                {primaryAction.label}: {primaryAction.value}
              </span>
            ) : null}
          </p>
        </div>
        <span className="pov-cc-intel-zone__toggle">{expanded ? "Hide details" : "Expand"}</span>
      </button>

      {expanded ? (
        <div className="pov-cc-intel-zone__details">
          <p className="pov-cc-intel-zone__lead">
            Synthesized from validated field reads — what to carry into the next touch.
          </p>
          <div className="pov-cc-command-grid">
            {items.map((item) => (
              <CommandIntelligenceCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : (
        <div className="pov-cc-command-grid pov-cc-command-grid--compact" aria-hidden={false}>
          {items.map((item) => (
            <CommandIntelligenceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
