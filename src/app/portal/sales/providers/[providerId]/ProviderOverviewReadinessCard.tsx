"use client";

import Link from "next/link";
import { useState } from "react";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import { appendProviderDiscoveryMappingParams } from "@/lib/surgical-sales/providerDiscoveryMappingNavigation";
import type {
  DiscoveryIntelligenceGroupView,
  DiscoveryReadinessSignalDetail,
  WorkflowRowAction,
} from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import {
  DISCOVERY_INTELLIGENCE_UI,
  overviewReadinessChipLabel,
} from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { OpsBlockersIcon, OpsReadinessGroupIcon } from "./providerOverviewOpsIcons";

function SecondaryAction({
  action,
  busy,
  onAction,
}: {
  action: WorkflowRowAction;
  busy: boolean;
  onAction: (action: WorkflowRowAction) => void;
}) {
  return (
    <button
      type="button"
      className="pov-ops-readiness-chip"
      disabled={busy}
      onClick={() => onAction(action)}
    >
      {overviewReadinessChipLabel(action)}
    </button>
  );
}

function CompactSignalRow({ signal }: { signal: DiscoveryReadinessSignalDetail }) {
  const meta = [
    signal.statusLabel,
    signal.confidenceLabel !== signal.statusLabel ? signal.confidenceLabel : null,
    signal.lastUpdatedLabel && signal.lastUpdatedLabel !== "—" ? signal.lastUpdatedLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="pov-ops-readiness-signal" data-signal-id={signal.signalId}>
      <span className="pov-ops-readiness-signal__topic">{signal.label}</span>
      <span className="pov-ops-readiness-signal__meta">{meta}</span>
      {signal.linkedContact ? (
        <span className="pov-ops-readiness-signal__contact">{signal.linkedContact}</span>
      ) : null}
    </div>
  );
}

export function ProviderOverviewReadinessCard({
  group,
  intelligenceHref,
  discoveryMappingHref,
  onAction,
}: {
  group: DiscoveryIntelligenceGroupView;
  intelligenceHref: string;
  discoveryMappingHref?: string;
  onAction?: (action: WorkflowRowAction) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canAct = Boolean(onAction);
  const intelLink = appendProviderDiscoveryMappingParams(
    discoveryMappingHref ?? intelligenceHref,
    { groupId: group.id as DiscoveryIntelligenceGroupId },
  );
  const blockers = group.blockers.length > 0 ? group.blockers : group.narrativeLines;
  const secondaryActions = group.quickActions;

  return (
    <article
      className={`pov-ops-readiness-card${group.progressConstrained ? " pov-ops-readiness-card--constrained" : ""}${expanded ? " pov-ops-readiness-card--expanded" : ""}`}
      data-discovery-group={group.id}
    >
      <header className="pov-ops-readiness-card__mast">
        <div className="pov-ops-readiness-card__identity">
          <span className="pov-ops-readiness-card__icon" aria-hidden>
            <OpsReadinessGroupIcon groupId={group.id} size={16} />
          </span>
          <div className="pov-ops-readiness-card__headings">
            <h3 className="pov-ops-readiness-card__title">{group.title}</h3>
            {group.subtitle ? (
              <p className="pov-ops-readiness-card__subtitle">{group.subtitle}</p>
            ) : null}
          </div>
        </div>
        <span className="pov-ops-readiness-card__progress">
          {group.progressLabel || DISCOVERY_INTELLIGENCE_UI.overviewReadiness.open}
        </span>
      </header>

      {group.summary ? (
        <p className="pov-ops-readiness-card__summary">{group.summary}</p>
      ) : null}

      {blockers.length > 0 ? (
        <section
          className="pov-ops-readiness-card__blockers-panel"
          aria-label={DISCOVERY_INTELLIGENCE_UI.overviewReadiness.blockers}
        >
          <div className="pov-ops-readiness-card__blockers-head">
            <OpsBlockersIcon className="pov-ops-readiness-card__blockers-icon" size={14} />
            <h4 className="pov-ops-readiness-card__section-label">
              {DISCOVERY_INTELLIGENCE_UI.overviewReadiness.blockers}
            </h4>
          </div>
          <ul className="pov-ops-readiness-card__blockers">
            {blockers.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {group.primaryAction && group.primaryActionLabel && canAct ? (
        <section className="pov-ops-readiness-card__actions">
          <button
            type="button"
            className="pov-ops-readiness-card__primary"
            onClick={() => onAction!(group.primaryAction!)}
          >
            {group.primaryActionLabel}
          </button>
        </section>
      ) : null}

      <footer className="pov-ops-readiness-card__footer">
        <button
          type="button"
          className="pov-ops-readiness-card__link"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded
            ? DISCOVERY_INTELLIGENCE_UI.overviewReadiness.hideDetails
            : secondaryActions.length > 0
              ? DISCOVERY_INTELLIGENCE_UI.overviewReadiness.detailsWithActions
              : DISCOVERY_INTELLIGENCE_UI.overviewReadiness.details}
        </button>
        <Link href={intelLink} className="pov-ops-readiness-card__link">
          {DISCOVERY_INTELLIGENCE_UI.overviewReadiness.fullIntelligence}
        </Link>
      </footer>

      {expanded ? (
        <div className="pov-ops-readiness-card__panel">
          {secondaryActions.length > 0 && canAct ? (
            <div className="pov-ops-readiness-card__chips" role="group" aria-label="More actions">
              {secondaryActions.map((action) => (
                <SecondaryAction
                  key={action.id}
                  action={action}
                  busy={false}
                  onAction={onAction!}
                />
              ))}
            </div>
          ) : null}
          {group.signals.map((signal) => (
            <CompactSignalRow key={signal.id} signal={signal} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
