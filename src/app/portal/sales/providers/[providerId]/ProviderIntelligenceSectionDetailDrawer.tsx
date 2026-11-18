"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { INTELLIGENCE_CARD_SECTION_LABELS } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import {
  buildOperationalMappingSectionBrief,
  buildSectionOperationalMappingProgress,
  intelligenceMappingCtaLabel,
} from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import { buildIntelligenceSectionCardSummary } from "@/lib/surgical-sales/providerIntelligenceSectionSummary";
import { operationalIntelligenceChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import { truncateScanFinding } from "@/lib/surgical-sales/providerIntelligenceSectionDisclosure";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  buildIntelligenceSectionProgressPills,
  buildIntelligenceSectionScanSummary,
  fieldScanSummaryLine,
} from "@/lib/surgical-sales/intelligenceSectionScanView";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { intelligenceSectionEmptyConfirmed, intelligenceSectionEmptyOpenQuestions } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import { providerIntelligenceScanCardCss } from "./providerIntelligenceScanCardCss";

export function ProviderIntelligenceSectionDetailDrawer({
  open,
  sectionId,
  contact,
  planning,
  fieldMetadata,
  sectionConfidence,
  onClose,
  onContinueMapping,
  onCaptureField,
}: {
  open: boolean;
  sectionId: ProviderIntelligenceSectionId | null;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  sectionConfidence?: IntelligenceSectionConfidence;
  onClose: () => void;
  onContinueMapping: () => void;
  onCaptureField?: (dbKey: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const progress = React.useMemo(() => {
    if (!sectionId) return null;
    return buildSectionOperationalMappingProgress(sectionId, contact, {
      planning,
      confidence: sectionConfidence,
      fieldMetadata,
    });
  }, [sectionId, contact, planning, sectionConfidence, fieldMetadata]);

  const brief = React.useMemo(() => {
    if (!sectionId) return null;
    return buildOperationalMappingSectionBrief(sectionId, contact, planning, sectionConfidence);
  }, [sectionId, contact, planning, sectionConfidence]);

  const summary = React.useMemo(() => {
    if (!sectionId) return null;
    return buildIntelligenceSectionCardSummary(sectionId, contact, planning, {
      maxFindings: 8,
      maxMissing: 12,
    });
  }, [sectionId, contact, planning]);

  const topGap = summary?.missing[0] ?? null;
  const scanSummary =
    sectionId && progress
      ? buildIntelligenceSectionScanSummary({
          sectionId,
          progress,
          topGap,
          contact,
        })
      : "";

  const sourceNotes = React.useMemo(() => {
    if (!sectionId || !fieldMetadata) return [];
    const keys = summary?.findings.map((f) => f.dbKey) ?? [];
    const lines: string[] = [];
    for (const dbKey of keys) {
      const meta = fieldMetadata[dbKey];
      const line = meta?.source_label?.trim();
      if (line) lines.push(`${operationalIntelligenceChipLabel(dbKey, dbKey)}: ${line}`);
    }
    return lines.slice(0, 4);
  }, [sectionId, fieldMetadata, summary?.findings]);

  const recommendedNext =
    brief?.tacticalQuestions[0] ??
    (topGap ? fieldScanSummaryLine(topGap.dbKey) : null) ??
    (sectionId ? intelligenceSectionEmptyOpenQuestions(sectionId) : null);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open || !sectionId || !progress || !brief || !summary) return null;

  const sectionLabel = PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId];
  const pills = buildIntelligenceSectionProgressPills(progress);
  const ctaLabel = intelligenceMappingCtaLabel(progress);

  return createPortal(
    <div
      className="provider-intel-detail-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="provider-intel-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-intel-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{providerIntelligenceScanCardCss}</style>
        <header className="provider-intel-detail-head">
          <div className="provider-intel-detail-head-row">
            <h2 id="provider-intel-detail-title" className="provider-intel-detail-title">
              {sectionLabel}
            </h2>
            <button
              type="button"
              className="provider-intel-detail-close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <div className="provider-intel-scan-card-pills">
            <span
              className={`provider-intel-confidence-badge provider-intel-confidence-badge--${progress.readinessTone}`}
            >
              {progress.statusBadge}
            </span>
            {pills.map((pill) => (
              <span
                key={pill.id}
                className={`provider-intel-scan-pill provider-intel-scan-pill--${pill.variant}`}
              >
                {pill.label}
              </span>
            ))}
          </div>
          <p className="provider-intel-scan-card-summary">
            {sanitizeIntelligenceTabUserCopy(scanSummary)}
          </p>
        </header>

        <div className="provider-intel-detail-body">
          <section className="provider-intel-detail-block">
            <h3 className="provider-intel-detail-kicker">
              {INTELLIGENCE_CARD_SECTION_LABELS.confirmed}
            </h3>
            {summary.findings.length > 0 ? (
              <ul className="provider-intel-detail-list">
                {summary.findings.map((row) => (
                  <li key={row.dbKey}>
                    <strong>{operationalIntelligenceChipLabel(row.dbKey, row.label)}</strong>
                    <br />
                    {sanitizeIntelligenceTabUserCopy(truncateScanFinding(row.display, 200))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="provider-intel-detail-empty">
                {intelligenceSectionEmptyConfirmed(sectionId)}
              </p>
            )}
          </section>

          <section className="provider-intel-detail-block">
            <h3 className="provider-intel-detail-kicker">
              {INTELLIGENCE_CARD_SECTION_LABELS.stillLearning}
            </h3>
            {summary.missing.length > 0 ? (
              <ul className="provider-intel-detail-list">
                {summary.missing.map((gap) => (
                  <li key={gap.dbKey}>
                    {onCaptureField ? (
                      <button
                        type="button"
                        className="provider-intel-detail-gap-btn"
                        onClick={() => onCaptureField(gap.dbKey)}
                      >
                        {fieldScanSummaryLine(gap.dbKey)}
                      </button>
                    ) : (
                      fieldScanSummaryLine(gap.dbKey)
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="provider-intel-detail-empty">
                {intelligenceSectionEmptyOpenQuestions(sectionId)}
              </p>
            )}
          </section>

          {sourceNotes.length > 0 ? (
            <section className="provider-intel-detail-block">
              <h3 className="provider-intel-detail-kicker">Source / last touch</h3>
              <ul className="provider-intel-detail-list">
                {sourceNotes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="provider-intel-detail-block">
            <h3 className="provider-intel-detail-kicker">{PROVIDER_FIELD_OPS_SECTION.recommendedFieldMove}</h3>
            <p className="provider-intel-detail-next">
              {recommendedNext ? sanitizeIntelligenceTabUserCopy(recommendedNext) : null}
            </p>
          </section>
        </div>

        <footer className="provider-intel-detail-foot">
          <button
            type="button"
            className="provider-intel-detail-foot-primary"
            onClick={() => {
              onClose();
              onContinueMapping();
            }}
          >
            {ctaLabel}
          </button>
          <button type="button" className="provider-intel-detail-foot-secondary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
