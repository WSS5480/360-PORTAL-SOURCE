"use client";

import React from "react";
import Link from "next/link";
import type { ProviderIntelligenceTabView } from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import type { ProviderDossierSectionView, ProviderDossierView } from "@/lib/surgical-sales/buildProviderDossierView";
import { DISCOVERY_INTELLIGENCE_UI } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

function DossierSourceLine({
  sourceKind,
  sourceLabel,
}: {
  sourceKind: ProviderDossierSectionView["known"][0]["sourceKind"];
  sourceLabel: string | null;
}) {
  if (!sourceLabel) return null;

  const kindLabel =
    sourceKind === "engagement"
      ? "Engagement"
      : sourceKind === "observation"
        ? "Observation"
        : sourceKind === "debrief"
          ? "Debrief"
          : sourceKind === "case"
            ? "Case"
            : "Field note";

  return (
    <span className="pi-dossier-fact-card__source">
      {kindLabel}: {sourceLabel}
    </span>
  );
}

function DossierKnowledgeCard({ card }: { card: ProviderDossierSectionView["known"][0] }) {
  return (
    <article className="pi-dossier-fact-card" aria-label={card.label}>
      <header className="pi-dossier-fact-card__head">
        <h4 className="pi-dossier-fact-card__label">{card.label}</h4>
        {card.capturedLabel ? <span className="pi-dossier-fact-card__when">{card.capturedLabel}</span> : null}
      </header>
      <p className="pi-dossier-fact-card__value">{card.value}</p>
      <DossierSourceLine sourceKind={card.sourceKind} sourceLabel={card.sourceLabel} />
    </article>
  );
}

function DossierSectionConfidence({ section }: { section: ProviderDossierSectionView }) {
  return (
    <div
      className={`pi-dossier-confidence pi-dossier-confidence--${section.confidence}`}
      role="status"
      aria-label={`Confidence: ${section.confidenceLabel}`}
    >
      <p className="pi-dossier-confidence__label">Confidence</p>
      <p className="pi-dossier-confidence__value">{section.confidenceLabel}</p>
      <span
        className="pi-dossier-confidence__meter"
        style={{ width: `${section.confidenceProgress}%` }}
        aria-hidden
      />
    </div>
  );
}

function DossierSectionBlock({ section }: { section: ProviderDossierSectionView }) {
  return (
    <article
      className="pi-dossier-section mc-surface mc-surface--raised mc-surface--accent-top"
      aria-labelledby={`pi-dossier-section-${section.id}`}
      data-dossier-section={section.id}
    >
      <header className="pi-dossier-section__head">
        <div className="pi-dossier-section__titles">
          <h2 id={`pi-dossier-section-${section.id}`} className="pi-dossier-section__title">
            {section.title}
          </h2>
          <p className="pi-dossier-section__purpose">{section.purpose}</p>
        </div>
        <DossierSectionConfidence section={section} />
      </header>

      <div className="pi-dossier-section__lanes">
        <div className="pi-dossier-lane pi-dossier-lane--known">
          <h3 className="pi-dossier-lane__title">Known</h3>
          {section.known.length === 0 ? (
            <p className="pi-dossier-lane__empty">Nothing captured in this lane yet.</p>
          ) : (
            <div className="pi-dossier-fact-grid">
              {section.known.map((card) => (
                <DossierKnowledgeCard key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>

        <div className="pi-dossier-lane pi-dossier-lane--unknown">
          <h3 className="pi-dossier-lane__title">Unknown</h3>
          {section.unknown.length === 0 ? (
            <p className="pi-dossier-lane__empty pi-dossier-lane__empty--clear">No open items in this lane.</p>
          ) : (
            <ul className="pi-dossier-unknown-list">
              {section.unknown.map((item) => (
                <li key={item.id} className="pi-dossier-unknown-item">
                  <span className="pi-dossier-unknown-item__label">{item.label}</span>
                  {item.detail ? <span className="pi-dossier-unknown-item__detail">{item.detail}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
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
    <details className="pi-dossier-evidence mc-surface dig-knowledge-evidence">
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

export function ProviderDossierView({
  dossier,
  timelineView,
  onCaptureNote,
  onMapIntelligence,
}: {
  dossier: ProviderDossierView;
  timelineView: ProviderIntelligenceTabView;
  onCaptureNote: () => void;
  onMapIntelligence?: () => void;
}) {
  const { knowledgeCoverage } = dossier;

  return (
    <div
      className="pi-dossier-workspace mc-workspace mc-workspace--provider-intelligence"
      data-stage={dossier.pathwayStageId}
      data-mc-stage={dossier.pathwayStageId}
      data-intelligence-state={dossier.stateId}
    >
      <header className="pi-dossier-deck mc-deck mc-deck--inset" data-testid="provider-intelligence-header">
        <div className="mc-deck__inner pi-dossier-deck__inner">
          <div className="pi-dossier-deck__bar mc-deck__bar">
            <div className="mc-deck__identity">
              <p className="mc-deck__kicker">Field intelligence</p>
              <h1 className="mc-deck__title">{dossier.pageTitle}</h1>
            </div>
            <div className="pi-dossier-deck__coverage" data-testid="provider-intelligence-coverage">
              <span className="pi-dossier-deck__coverage-label">Current Knowledge Coverage</span>
              <span className="pi-dossier-deck__coverage-value">{knowledgeCoverage.coverageLabel}</span>
            </div>
          </div>
          <p className="pi-dossier-deck__lead">{dossier.subtitle}</p>
          <div className="pi-dossier-deck__actions">
            {LOG_UPDATE_UI_ENABLED ? (
              <button type="button" className="mc-cta mc-cta--secondary" onClick={onCaptureNote}>
                Log field note
              </button>
            ) : null}
            {onMapIntelligence ? (
              <button type="button" className="mc-cta mc-cta--surface" onClick={onMapIntelligence}>
                Map intelligence
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="pi-dossier-stack mc-stack">
        {dossier.sections.map((section) => (
          <DossierSectionBlock key={section.id} section={section} />
        ))}
        <IntelligenceEvidenceTrail items={timelineView.timeline} emptyLabel={timelineView.timelineEmptyLabel} />
      </div>
    </div>
  );
}
