"use client";

import React from "react";
import { buildProductSupportBriefingDashboard } from "@/lib/surgical-sales/buildProductSupportBriefingDashboard";
import type { ProductSupportOverviewProductLine } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  PRODUCT_SUPPORT_BRIEFING_LEADS,
  PRODUCT_SUPPORT_DETAIL_SECTION_LABELS,
} from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import { CaseFieldWatchBriefingPanel } from "@/components/sales/CaseFieldWatchBriefingPanel";
import { productSupportCaseBriefingCss } from "./productSupportCaseBriefingCss";

export function ProductSupportCaseBriefing({
  caseRow,
  products,
  providerContact,
  operationalContext,
  activities,
  priorCases,
  specialty,
  universalFactsReadModel,
  supportRepName,
  poAttached,
  disabled,
  onStartDictation,
  onOpenProducts,
  onUploadDocument,
  onViewAllInsights,
  onViewWatchList,
  onViewCaseDetails,
}: {
  caseRow: Record<string, unknown>;
  products: ProductSupportOverviewProductLine[];
  providerContact?: Record<string, unknown> | null;
  operationalContext?: CaseOperationalContextView | null;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
  priorCases?: Array<Record<string, unknown>>;
  specialty?: string | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  supportRepName?: string | null;
  poAttached?: boolean;
  disabled?: boolean;
  onStartDictation?: () => void;
  onOpenProducts?: () => void;
  onUploadDocument?: () => void;
  onViewAllInsights?: () => void;
  onViewWatchList?: () => void;
  onViewCaseDetails?: () => void;
}) {
  const dashboard = React.useMemo(
    () =>
      buildProductSupportBriefingDashboard({
        caseRow,
        products,
        providerContact,
        operationalContext,
        activities,
        priorCases,
        specialty,
        universalFactsReadModel,
        supportRepName,
        poAttached,
      }),
    [
      activities,
      caseRow,
      operationalContext,
      poAttached,
      priorCases,
      products,
      providerContact,
      specialty,
      supportRepName,
      universalFactsReadModel,
    ],
  );

  return (
    <div className="case-ps-briefing-grid">
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseBriefingCss }} />

      <section className="case-ps-briefing-card" aria-labelledby="case-ps-mission-title">
        <div className="case-ps-briefing-card-head">
          <div>
            <h2 id="case-ps-mission-title" className="case-ps-briefing-card-title">
              {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.todaysMission}
            </h2>
            <p className="case-ps-briefing-card-lead">{PRODUCT_SUPPORT_BRIEFING_LEADS.mission}</p>
          </div>
        </div>
        <ul className="case-ps-briefing-list">
          {dashboard.missionBullets.map((bullet) => (
            <li key={bullet}>
              <span className="case-ps-briefing-check" aria-hidden>
                ✓
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="case-ps-briefing-card" aria-labelledby="case-ps-known-title">
        <div>
          <h2 id="case-ps-known-title" className="case-ps-briefing-card-title">
            {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.whatWeKnow}
          </h2>
          <p className="case-ps-briefing-card-lead">{PRODUCT_SUPPORT_BRIEFING_LEADS.known}</p>
        </div>
        {dashboard.knownInsights.length > 0 ? (
          <ul className="case-ps-briefing-list">
            {dashboard.knownInsights.map((insight) => (
              <li key={insight.id}>
                <span className="case-ps-briefing-check" aria-hidden>
                  ✓
                </span>
                <span>{insight.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="case-ps-briefing-card-lead">
            No prior context on file yet — capture field notes during the case and they will show up here.
          </p>
        )}
        {onViewAllInsights ? (
          <button type="button" className="case-ps-briefing-link" onClick={onViewAllInsights}>
            View all insights
          </button>
        ) : null}
      </section>

      <section className="case-ps-briefing-card" aria-labelledby="case-ps-watch-title">
        <div>
          <h2 id="case-ps-watch-title" className="case-ps-briefing-card-title">
            {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.watchForToday}
          </h2>
          <p className="case-ps-briefing-card-lead">{PRODUCT_SUPPORT_BRIEFING_LEADS.watch}</p>
        </div>
        <CaseFieldWatchBriefingPanel briefing={dashboard.watchBriefing} />
        {onViewWatchList ? (
          <button type="button" className="case-ps-briefing-link" onClick={onViewWatchList}>
            View full watch list
          </button>
        ) : null}
      </section>

      {dashboard.trendingSignals.length > 0 ? (
        <section className="case-ps-briefing-card" aria-labelledby="case-ps-trending-title">
          <div>
            <h2 id="case-ps-trending-title" className="case-ps-briefing-card-title">
              {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.trendingSignals}
            </h2>
            <p className="case-ps-briefing-card-lead">{PRODUCT_SUPPORT_BRIEFING_LEADS.trending}</p>
          </div>
          <ul className="case-ps-briefing-list">
            {dashboard.trendingSignals.map((signal) => (
              <li key={signal.id} className="case-ps-briefing-signal">
                <span>{signal.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        className="case-ps-briefing-card case-ps-briefing-card--accent case-ps-briefing-card--quick-actions"
        aria-labelledby="case-ps-quick-actions-title"
      >
        <div>
          <h2 id="case-ps-quick-actions-title" className="case-ps-briefing-card-title">
            {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.quickActions}
          </h2>
          <p className="case-ps-briefing-card-lead">{PRODUCT_SUPPORT_BRIEFING_LEADS.quickActions}</p>
        </div>
        <div className="case-ps-briefing-actions">
          <button
            type="button"
            className="case-ps-briefing-dictate-btn"
            disabled={disabled}
            onClick={onStartDictation}
          >
            Start Dictation
          </button>
          <button type="button" className="case-ps-briefing-secondary-btn" disabled={disabled} onClick={onOpenProducts}>
            Open products used
          </button>
          <button
            type="button"
            className="case-ps-briefing-secondary-btn"
            disabled={disabled}
            onClick={onUploadDocument}
          >
            Upload PO or document
          </button>
        </div>
      </section>

      <section className="case-ps-briefing-card" aria-labelledby="case-ps-snapshot-title">
        <div>
          <h2 id="case-ps-snapshot-title" className="case-ps-briefing-card-title">
            {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.caseSnapshot}
          </h2>
          <p className="case-ps-briefing-card-lead">{PRODUCT_SUPPORT_BRIEFING_LEADS.snapshot}</p>
        </div>
        <div className="case-ps-briefing-snapshot">
          {dashboard.snapshotRows.map((row) => (
            <div key={row.label} className="case-ps-briefing-snapshot-row">
              <span className="case-ps-briefing-snapshot-label">{row.label}</span>
              <span className="case-ps-briefing-snapshot-value">{row.value}</span>
            </div>
          ))}
        </div>
        {onViewCaseDetails ? (
          <button type="button" className="case-ps-briefing-link" onClick={onViewCaseDetails}>
            View case details
          </button>
        ) : null}
      </section>
    </div>
  );
}
