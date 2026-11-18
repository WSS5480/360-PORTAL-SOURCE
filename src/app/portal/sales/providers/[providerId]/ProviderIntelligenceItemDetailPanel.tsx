"use client";

import React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

import {
  buildIntelligenceItemDetailView,
  type IntelligenceItemDetailView,
  type IntelligenceItemRecommendedStep,
  type IntelligenceItemValidationRow,
} from "@/lib/surgical-sales/buildIntelligenceItemDetailView";
import type { ValidationQueueScope } from "@/lib/surgical-sales/buildOperationalIntelligenceWorkspaceView";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { intelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import { intelligenceItemDetailCss } from "./intelligenceItemDetailCss";
import {
  ScopeBadge,
  StatusChip,
  statusLabelToVariant,
} from "./providerIntelligenceUi";

export function ProviderIntelligenceItemDetailPanel({
  open,
  itemId,
  statusOverride,
  contact,
  planning,
  providerId,
  organizationName,
  providerName,
  fieldMetadata,
  engagements,
  briefingHref,
  disabled = false,
  onClose,
  onLogUpdate,
  onAskNextTouch,
  onCaptureField,
  onMarkNotRelevant,
}: {
  open: boolean;
  itemId: string | null;
  statusOverride?: string;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  providerId: string;
  organizationName?: string | null;
  providerName?: string | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  engagements?: ProviderEngagementSummary[];
  briefingHref: string;
  disabled?: boolean;
  onClose: () => void;
  onLogUpdate: () => void;
  onAskNextTouch: () => void;
  onCaptureField: (dbKey?: string) => void;
  onMarkNotRelevant?: (dbKey: string) => void | Promise<void>;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [sourceOpen, setSourceOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) setSourceOpen(false);
  }, [open, itemId]);

  const view = React.useMemo(() => {
    if (!itemId) return null;
    return buildIntelligenceItemDetailView({
      itemId,
      contact,
      planning,
      organizationName,
      providerName,
      fieldMetadata,
      engagements,
      statusOverride,
    });
  }, [
    itemId,
    contact,
    planning,
    organizationName,
    providerName,
    fieldMetadata,
    engagements,
    statusOverride,
  ]);

  const contextBuckets = React.useMemo(
    () => (view ? splitContextByScope(view) : { facility: [], provider: [] }),
    [view],
  );

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

  if (!mounted || !open || !view) return null;

  return createPortal(
    <div
      className="oid-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="oid-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oid-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{intelligenceItemDetailCss}</style>

        <header className="oid-hero">
          <div className="oid-hero-accent" aria-hidden />
          <div className="oid-hero-top">
            <div className="oid-hero-copy">
              <h2 id="oid-detail-title" className="oid-title">
                {view.title}
              </h2>
              <div className="oid-hero-badges">
                <ScopeBadge scope={view.summary.scope} />
                <StatusChip
                  label={view.summary.status}
                  variant={statusLabelToVariant(view.summary.status)}
                />
              </div>
              <p className="oid-implication">{view.summary.whyMatters}</p>
              <p className="oid-subtitle">{view.subtitle}</p>
              <p className="oid-applies">
                <span className="oid-applies-label">Applies to</span>
                {view.summary.appliesTo}
              </p>
            </div>
            <button type="button" className="oid-close" aria-label="Close detail" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="oid-hero-action">
            <span className="oid-hero-action-label">Primary next action</span>
            <p className="oid-hero-action-text">{view.summary.primaryNextAction}</p>
          </div>
        </header>

        <div className="oid-scroll">
          <DetailBlock title="Still exploring" titleId="oid-validate">
            <ul className="oid-validate-grid">
              {view.stillToValidate.map((row) => (
                <ValidationItemCard
                  key={row.id}
                  row={row}
                  contact={contact}
                  disabled={disabled}
                  defaultDbKey={view.primaryDbKey}
                  onCaptureField={onCaptureField}
                  onAskNextTouch={onAskNextTouch}
                  onMarkNotRelevant={onMarkNotRelevant}
                />
              ))}
            </ul>
          </DetailBlock>

          <DetailBlock title="Facility context" titleId="oid-facility">
            <ContextIntelCard
              scope="Facility"
              lines={contextBuckets.facility}
              emptyMessage={
                view.summary.scope === "Facility"
                  ? view.whatWeKnow.emptyMessage
                  : "No facility-level signals captured for this item yet."
              }
            />
          </DetailBlock>

          <DetailBlock title="Provider context" titleId="oid-provider">
            <ContextIntelCard
              scope="Provider"
              lines={contextBuckets.provider}
              emptyMessage={
                view.summary.scope === "Provider"
                  ? view.whatWeKnow.emptyMessage
                  : "No provider-specific signals captured for this item yet."
              }
            />
          </DetailBlock>

          <DetailBlock title="Next steps" titleId="oid-next">
            {view.fieldQuestions.length > 0 ? (
              <div className="oid-ask-block">
                <p className="oid-ask-kicker">Ask on next touch</p>
                <ul className="oid-ask-list">
                  {view.fieldQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <ol className="oid-steps">
              {view.recommendedSteps.map((step, index) => (
                <li key={step.id} className="oid-step">
                  <div className="oid-step-step-wrap" aria-hidden>
                    <span className="oid-step-step-label">Step</span>
                    <span className="oid-step-index">{index + 1}</span>
                  </div>
                  <div className="oid-step-body">
                    <span className="oid-step-label">{step.label}</span>
                    <p className="oid-step-purpose">Why</p>
                    <p className="oid-step-desc">{step.description}</p>
                  </div>
                  <StepAction
                    step={step}
                    disabled={disabled}
                    briefingHref={briefingHref}
                    onLogUpdate={onLogUpdate}
                    onAskNextTouch={onAskNextTouch}
                    onCaptureField={() => onCaptureField(view.primaryDbKey)}
                  />
                </li>
              ))}
            </ol>
          </DetailBlock>

          <SourceHistorySection
            history={view.sourceHistory}
            open={sourceOpen}
            onToggle={() => setSourceOpen((v) => !v)}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function splitContextByScope(view: IntelligenceItemDetailView): {
  facility: string[];
  provider: string[];
} {
  const lines = view.whatWeKnow.lines;
  if (view.summary.scope === "Facility") {
    return { facility: lines, provider: [] };
  }
  if (view.summary.scope === "Provider") {
    return { facility: [], provider: lines };
  }
  return { facility: [], provider: lines };
}

function validationRowStatus(
  contact: Record<string, unknown>,
  dbKey: string | undefined,
  defaultStatus: string,
): string {
  if (!dbKey) return defaultStatus;
  const raw = String(contact[dbKey] ?? "").trim();
  if (fieldHasIntelligenceSignal(dbKey, raw)) return "Confirmed";
  return "Needs validation";
}

function validationRowHint(row: IntelligenceItemValidationRow): string {
  if (row.dbKey) {
    const guidance = intelligenceGapFieldGuidance(row.dbKey);
    if (guidance?.bestInteraction) {
      return sanitizeIntelligenceTabUserCopy(guidance.bestInteraction);
    }
  }
  return sanitizeIntelligenceTabUserCopy(
    `Confirm ${row.label.toLowerCase()} on your next field touch.`,
  );
}

function DetailBlock({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="oid-block" aria-labelledby={titleId}>
      <h3 id={titleId} className="oid-block-title">
        {title}
      </h3>
      <div className="oid-block-body">{children}</div>
    </section>
  );
}

function ContextIntelCard({
  scope,
  lines,
  emptyMessage,
}: {
  scope: ValidationQueueScope;
  lines: string[];
  emptyMessage: string;
}) {
  const tone = scope === "Facility" ? "facility" : "provider";

  return (
    <article className={`oid-ctx-card oid-ctx-card--${tone}`}>
      <header className="oid-ctx-card-head">
        <ScopeBadge scope={scope} />
        <span className="oid-ctx-card-count">
          {lines.length > 0 ? `${lines.length} signal${lines.length === 1 ? "" : "s"}` : "None yet"}
        </span>
      </header>
      {lines.length > 0 ? (
        <ul className="oid-ctx-card-list">
          {lines.map((line) => (
            <li key={line} className="oid-ctx-card-item">
              <span className={`oid-ctx-accent oid-ctx-accent--${tone}`} aria-hidden />
              <span className="oid-ctx-text">{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="oid-empty">{emptyMessage}</p>
      )}
    </article>
  );
}

function ValidationItemCard({
  row,
  contact,
  disabled,
  defaultDbKey,
  onCaptureField,
  onAskNextTouch,
  onMarkNotRelevant,
}: {
  row: IntelligenceItemValidationRow;
  contact: Record<string, unknown>;
  disabled?: boolean;
  defaultDbKey?: string;
  onCaptureField: (dbKey?: string) => void;
  onAskNextTouch: () => void;
  onMarkNotRelevant?: (dbKey: string) => void | Promise<void>;
}) {
  const dbKey = row.dbKey ?? defaultDbKey;
  const status = validationRowStatus(contact, dbKey, "Needs validation");
  const hint = validationRowHint(row);

  return (
    <li className="oid-validate-card">
      <div className="oid-validate-card-main">
        <div className="oid-validate-card-top">
          <span className="oid-validate-label">{row.label}</span>
          <StatusChip label={status} variant={statusLabelToVariant(status)} />
        </div>
        <p className="oid-validate-hint">{hint}</p>
      </div>
      <div className="oid-validate-actions" role="group" aria-label={`Actions for ${row.label}`}>
        <button
          type="button"
          className="oid-act"
          disabled={disabled}
          onClick={() => onCaptureField(dbKey)}
        >
          Update
        </button>
        <button type="button" className="oid-act oid-act--info" disabled={disabled} onClick={onAskNextTouch}>
          Ask next touch
        </button>
        {dbKey && onMarkNotRelevant ? (
          <button
            type="button"
            className="oid-act"
            disabled={disabled}
            onClick={() => void onMarkNotRelevant(dbKey)}
          >
            Not relevant
          </button>
        ) : null}
      </div>
    </li>
  );
}

function StepAction({
  step,
  disabled,
  briefingHref,
  onLogUpdate,
  onAskNextTouch,
  onCaptureField,
}: {
  step: IntelligenceItemRecommendedStep;
  disabled?: boolean;
  briefingHref: string;
  onLogUpdate: () => void;
  onAskNextTouch: () => void;
  onCaptureField: () => void;
}) {
  if (step.kind === "briefing") {
    return (
      <Link href={briefingHref} className="oid-btn oid-btn--primary">
        {step.label}
      </Link>
    );
  }
  if (step.kind === "log") {
    if (!LOG_UPDATE_UI_ENABLED) return null;
    return (
      <button type="button" className="oid-btn oid-btn--primary" disabled={disabled} onClick={onLogUpdate}>
        {step.label}
      </button>
    );
  }
  if (step.kind === "ask") {
    return (
      <button type="button" className="oid-btn oid-btn--primary" disabled={disabled} onClick={onAskNextTouch}>
        {step.label}
      </button>
    );
  }
  return (
    <button type="button" className="oid-btn oid-btn--primary" disabled={disabled} onClick={onCaptureField}>
      {step.label}
    </button>
  );
}

function SourceHistorySection({
  history,
  open,
  onToggle,
}: {
  history: IntelligenceItemDetailView["sourceHistory"];
  open: boolean;
  onToggle: () => void;
}) {
  const hasContent =
    history.lastUpdate || history.sourceEngagement || history.rawNotes;

  return (
    <section className="oid-source">
      <button type="button" className="oid-source-trigger" aria-expanded={open} onClick={onToggle}>
        <span className="oid-source-trigger-text">
          <span className="oid-source-title">Source and history</span>
          <span className="oid-source-sub">Attribution and raw capture notes</span>
        </span>
        <span className="oid-source-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div className="oid-source-body">
          {hasContent ? (
            <>
              <p className="oid-source-line">
                <strong>Last update</strong>
                <span>{history.lastUpdate ?? "None yet"}</span>
              </p>
              {history.sourceEngagement ? (
                <p className="oid-source-line">
                  <strong>Source</strong>
                  <span>{history.sourceEngagement}</span>
                </p>
              ) : null}
              {history.rawNotes ? (
                <p className="oid-source-line">
                  <strong>Notes</strong>
                  <span>{history.rawNotes}</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="oid-empty">No source or history captured for this item yet.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
