"use client";

import Link from "next/link";
import React from "react";
import {
  buildProviderCaseTabRows,
  type ProviderCaseKeySignal,
  type ProviderCaseTabRow,
} from "@/lib/surgical-sales/buildProviderCaseTabRow";
import { providerCasesTabCss } from "./providerCasesTabCss";

function CaseStatusPill({ status }: { status: ProviderCaseTabRow["status"] }) {
  return <span className={`pct-status pct-status--${status.id}`}>{status.label}</span>;
}

function CompletionChecks({ completion }: { completion: ProviderCaseTabRow["completion"] }) {
  return (
    <ul className="pct-completion-list" aria-label="Case completion">
      {completion.items.map((item) => (
        <li
          key={item.id}
          className={`pct-completion-item${item.done ? " pct-completion-item--done" : ""}`}
        >
          <span className="pct-completion-icon" aria-hidden>
            {item.done ? "✓" : "○"}
          </span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function KeySignalChips({ signals }: { signals: ProviderCaseKeySignal[] }) {
  if (signals.length === 0) {
    return <span className="pct-signal--empty">No signals yet</span>;
  }

  return (
    <div className="pct-signals" aria-label="Key signals">
      {signals.map((signal) => (
        <span key={signal.label} className={`pct-signal pct-signal--${signal.tone}`} title={signal.label}>
          {signal.label}
        </span>
      ))}
    </div>
  );
}

function CaseRowActions({ row }: { row: ProviderCaseTabRow }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <div className="pct-actions">
      <Link href={row.addNoteHref} className="pct-link pct-link--desktop" data-surgical-press>
        + Add note
      </Link>
      <Link href={row.detailHref} className="pct-link" data-surgical-press>
        View details
      </Link>
      <div className="pct-menu" ref={menuRef}>
        <button
          type="button"
          className="pct-menu-btn"
          aria-label="More actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ⋮
        </button>
        {menuOpen ? (
          <div className="pct-menu-panel" role="menu">
            <Link
              href={row.addNoteHref}
              className="pct-menu-item pct-menu-item--mobile"
              role="menuitem"
              data-surgical-press
              onClick={() => setMenuOpen(false)}
            >
              Add note
            </Link>
            <Link
              href={row.intelligenceHref}
              className="pct-menu-item"
              role="menuitem"
              data-surgical-press
              onClick={() => setMenuOpen(false)}
            >
              Open intelligence
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProviderCaseRow({ row }: { row: ProviderCaseTabRow }) {
  return (
    <li className="pct-row">
      <div className="pct-row-main">
        <div className="pct-col pct-col--case">
          <div className="pct-mobile-head">
            <span className="pct-row-type">{row.caseTypeLabel}</span>
            <CaseStatusPill status={row.status} />
          </div>
          <p className="pct-row-title">
            <Link href={row.detailHref} data-surgical-press>
              {row.procedureTitle}
            </Link>
          </p>
          <p className="pct-row-sub">
            {row.caseSubtitle}
            <span className="pct-row-sub-sep" aria-hidden>
              {" "}
              ·{" "}
            </span>
            <span className="pct-date pct-date--inline">{row.dateLine}</span>
          </p>
        </div>

        <div className="pct-col pct-col--status">
          <CaseStatusPill status={row.status} />
        </div>
      </div>

      <div className="pct-row-meta">
        <div className="pct-col pct-col--date">
          <span className="pct-section-label">Date</span>
          <span className="pct-date">{row.dateLine}</span>
        </div>

        <div className="pct-col pct-col--completion">
          <span className="pct-section-label">Completion</span>
          <CompletionChecks completion={row.completion} />
          {row.dictationCompletedLine ? (
            <p className="pct-dictation-complete">
              Dictation completed · {row.dictationCompletedLine}
            </p>
          ) : null}
        </div>

        <div className="pct-col pct-col--signals">
          <span className="pct-section-label">Key signals</span>
          <KeySignalChips signals={row.keySignals} />
        </div>

        <div className="pct-col pct-col--actions">
          <span className="pct-section-label">Actions</span>
          <CaseRowActions row={row} />
        </div>
      </div>
    </li>
  );
}

function CasesLegend() {
  const items = [
    { id: "completed", label: "Completed", className: "pct-legend-dot--completed" },
    { id: "in_progress", label: "In progress", className: "pct-legend-dot--in_progress" },
    { id: "scheduled", label: "Scheduled", className: "pct-legend-dot--scheduled" },
    { id: "planned", label: "Planned", className: "pct-legend-dot--planned" },
    { id: "cancelled", label: "Cancelled", className: "pct-legend-dot--cancelled" },
  ];

  return (
    <ul className="pct-legend" aria-label="Status legend">
      {items.map((item) => (
        <li key={item.id} className="pct-legend-item">
          <span className={`pct-legend-dot ${item.className}`} aria-hidden />
          {item.label}
        </li>
      ))}
      <li className="pct-legend-item">
        <span className="pct-completion-icon" aria-hidden>
          ✓
        </span>
        Completion item done
      </li>
    </ul>
  );
}

export function ProviderCasesTab({
  cases,
  addCaseHref,
}: {
  cases: Record<string, unknown>[];
  addCaseHref: string;
}) {
  const rows = React.useMemo(() => buildProviderCaseTabRows(cases), [cases]);
  const caseCountLabel = `${cases.length} ${cases.length === 1 ? "Case" : "Cases"}`;
  const tabSummary =
    cases.length === 0
      ? "Track observation coverage, product support, and field learning for this provider."
      : "A clean timeline of linked cases, completion status, and reusable field signals.";

  return (
    <section className="pct provider-tab-workspace" aria-label="Provider cases">
      <style dangerouslySetInnerHTML={{ __html: providerCasesTabCss }} />

      <div className="pct-head">
        <div className="pct-head-copy">
          <span className="pct-head-eyebrow">Provider case history</span>
          <h2 className="pct-head-title">{caseCountLabel}</h2>
          <p className="pct-head-subtitle">{tabSummary}</p>
        </div>
        <Link href={addCaseHref} className="pct-head-action" data-surgical-press>
          Add case
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="pct-empty">
          <strong>No cases linked yet</strong>
          <p>Start with an observation or support case to build provider-specific learning.</p>
          <div>
            <Link href={addCaseHref} className="pct-empty-cta" data-surgical-press>
              + Add case
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ol className="pct-list" aria-label="Provider cases">
            {rows.map((row) => (
              <ProviderCaseRow key={row.caseId} row={row} />
            ))}
          </ol>
          <CasesLegend />
        </>
      )}
    </section>
  );
}

export function ProviderCasesTabPreview({
  cases,
  limit = 3,
}: {
  cases: Record<string, unknown>[];
  limit?: number;
}) {
  const rows = React.useMemo(
    () => buildProviderCaseTabRows(cases).slice(0, limit),
    [cases, limit],
  );

  if (rows.length === 0) return null;

  return (
    <ol className="pct-list" aria-label="Recent cases">
      <style dangerouslySetInnerHTML={{ __html: providerCasesTabCss }} />
      {rows.map((row) => (
        <ProviderCaseRow key={row.caseId} row={row} />
      ))}
    </ol>
  );
}
