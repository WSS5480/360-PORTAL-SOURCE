"use client";

import React from "react";
import Link from "next/link";
import type { ProviderIntelligenceTabView } from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import type { IntelligenceDomainCardView } from "@/lib/surgical-sales/buildProviderIntelligenceDomainView";
import { DISCOVERY_INTELLIGENCE_UI } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import {
  buildIntelligenceLearningGapsForDisplay,
  INTELLIGENCE_LEARNING_GAPS_TITLE,
  type IntelligenceLearningGap,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { intelligenceGapChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import { ProviderGapFieldGuidance } from "./ProviderGapFieldGuidance";
import { ProviderIntelligenceUnlocksNextLine } from "./ProviderIntelligenceUnlocksNextLine";
import { ProviderIntelligenceDomainCards } from "./ProviderIntelligenceDomainCards";

function domainHasCapturedKnowledge(domain: IntelligenceDomainCardView): boolean {
  return (
    domain.knownFacts.length > 0 ||
    domain.confirmedFindings.length > 0 ||
    domain.supportingObservations.length > 0
  );
}

function IntelligenceEvidenceTrail({
  items,
  emptyLabel,
}: {
  items: ProviderIntelligenceTabView["timeline"];
  emptyLabel: string;
}) {
  return (
    <details className="dig-knowledge-evidence">
      <summary className="dig-knowledge-evidence-summary">
        <span className="dig-knowledge-evidence-title">{DISCOVERY_INTELLIGENCE_UI.evidenceTrailTitle}</span>
        <span className="dig-knowledge-evidence-meta">{DISCOVERY_INTELLIGENCE_UI.evidenceTrailMeta}</span>
      </summary>
      {items.length === 0 ? (
        <p className="dig-knowledge-evidence-empty">{emptyLabel}</p>
      ) : (
        <ol className="dig-intel-timeline-list">
          {items.map((item) => (
            <li key={item.id} className="dig-intel-timeline-item">
              <Link href={item.href} className="dig-intel-timeline-link">
                <span className="dig-intel-timeline-title">{item.title}</span>
                {item.detail ? <span className="dig-intel-timeline-detail">{item.detail}</span> : null}
                <span className="dig-intel-timeline-meta">
                  <span className="dig-intel-timeline-source">{item.sourceLabel}</span>
                  <span className="dig-intel-timeline-when">{item.whenLabel}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

function MissingIntelligenceRow({
  gap,
  onCaptureGap,
}: {
  gap: IntelligenceLearningGap;
  onCaptureGap: () => void;
}) {
  return (
    <li
      className={`dig-knowledge-gap-row dig-knowledge-gap-row--${gap.state === "unknown" ? "unknown" : "emerging"}`}
    >
      <button type="button" className="dig-knowledge-gap-row-main" onClick={onCaptureGap}>
        <span className="dig-knowledge-gap-row-label">
          {intelligenceGapChipLabel(gap.dbKey, gap.state)}
        </span>
        <ProviderGapFieldGuidance guidance={gap.fieldGuidance} compact />
        <ProviderIntelligenceUnlocksNextLine line={gap.unlocksNext} compact />
      </button>
    </li>
  );
}

function MissingIntelligenceSection({
  contact,
  planning,
  onCaptureGap,
  maxItems = 8,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  onCaptureGap: () => void;
  maxItems?: number;
}) {
  const gaps = React.useMemo(
    () => buildIntelligenceLearningGapsForDisplay(contact, planning, maxItems),
    [contact, planning, maxItems],
  );

  if (gaps.length === 0) return null;

  return (
    <section className="dig-zone dig-zone--knowledge-gaps" aria-labelledby="dig-knowledge-gaps-title">
      <div className="dig-zone-head">
        <h2 id="dig-knowledge-gaps-title" className="dig-zone-title">
          {DISCOVERY_INTELLIGENCE_UI.knowledgeWorkspaceSecondary}
        </h2>
        <span className="dig-zone-meta">{INTELLIGENCE_LEARNING_GAPS_TITLE}</span>
      </div>
      <ul className="dig-knowledge-gap-list">
        {gaps.map((gap) => (
          <MissingIntelligenceRow key={gap.dbKey} gap={gap} onCaptureGap={onCaptureGap} />
        ))}
      </ul>
    </section>
  );
}

export function ProviderIntelligenceProgressiveView({
  view,
  domains = [],
  contact,
  planning,
  onCaptureGap,
  onMapIntelligence,
}: {
  view: ProviderIntelligenceTabView;
  domains?: IntelligenceDomainCardView[];
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  onCaptureGap: () => void;
  onMapIntelligence?: () => void;
}) {
  const hasCapturedKnowledge = domains.some(domainHasCapturedKnowledge);

  return (
    <div className="dig-knowledge-workspace" data-intelligence-state={view.stateId}>
      <header className="dig-knowledge-header">
        <div className="dig-knowledge-header-main">
          <h1 className="dig-knowledge-title">{view.pageTitle}</h1>
          <p className="dig-knowledge-subtitle">{view.subtitle}</p>
        </div>
        <div className="dig-knowledge-header-actions">
          {LOG_UPDATE_UI_ENABLED ? (
            <button type="button" className="dig-action dig-action--secondary" onClick={onCaptureGap}>
              Log field note
            </button>
          ) : null}
          {onMapIntelligence ? (
            <button type="button" className="dig-action dig-action--ghost" onClick={onMapIntelligence}>
              Map intelligence
            </button>
          ) : null}
        </div>
      </header>

      <section className="dig-zone dig-zone--knowledge-known" aria-labelledby="dig-knowledge-known-title">
        <div className="dig-zone-head">
          <h2 id="dig-knowledge-known-title" className="dig-zone-title">
            {DISCOVERY_INTELLIGENCE_UI.knowledgeWorkspacePrimary}
          </h2>
        </div>
        {!hasCapturedKnowledge ? (
          <p className="dig-knowledge-known-empty">{DISCOVERY_INTELLIGENCE_UI.knowledgeWorkspaceEmpty}</p>
        ) : null}
        <ProviderIntelligenceDomainCards domains={domains} />
      </section>

      <MissingIntelligenceSection contact={contact} planning={planning} onCaptureGap={onCaptureGap} />

      <IntelligenceEvidenceTrail items={view.timeline} emptyLabel={view.timelineEmptyLabel} />
    </div>
  );
}
