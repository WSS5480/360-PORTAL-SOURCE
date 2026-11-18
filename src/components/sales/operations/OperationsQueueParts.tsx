"use client";

import Link from "next/link";
import {
  OPS_READINESS_ICON,
  type DirectoryReadinessGap,
  type DirectoryReadinessSummary,
  type TacticalActionChip,
} from "@/lib/surgical-sales/operationsDirectorySignals";

export function OperationsReadinessList({
  gaps,
  className,
  maxVisible = 4,
  showReadyItems = true,
  intelligenceSectionLabel = "Discovery Targets",
}: {
  gaps: DirectoryReadinessGap[];
  className?: string;
  maxVisible?: number;
  /** When false, only warn/gap items render (ready ✓ items hidden). */
  showReadyItems?: boolean;
  intelligenceSectionLabel?: string;
}) {
  const pool = showReadyItems ? gaps : gaps.filter((g) => g.tone === "warn" || g.tone === "gap");
  if (!pool.length) {
    return <span className="ops-queue-readiness-empty">Readiness on track</span>;
  }
  const visible = pool.slice(0, maxVisible);
  const extra = pool.length - visible.length;
  return (
    <ul
      className={className ? `ops-queue-readiness-list ${className}` : "ops-queue-readiness-list"}
      aria-label={intelligenceSectionLabel}
    >
      {visible.map((g) => (
        <li key={g.id} className={`ops-queue-readiness-item ops-queue-readiness-item--${g.tone}`}>
          <span className="ops-queue-readiness-item__icon" aria-hidden>
            {OPS_READINESS_ICON[g.tone]}
          </span>
          <span className="ops-queue-readiness-item__label">{g.label}</span>
        </li>
      ))}
      {extra > 0 ? (
        <li className="ops-queue-readiness-item ops-queue-readiness-item--more" aria-label={`${extra} more`}>
          +{extra}
        </li>
      ) : null}
    </ul>
  );
}

export function OperationsReadinessBlock({
  summary,
  className,
  maxVisible = 4,
  intelligenceSectionLabel,
}: {
  summary: DirectoryReadinessSummary;
  className?: string;
  maxVisible?: number;
  intelligenceSectionLabel?: string;
}) {
  return (
    <div className={className ? `ops-queue-readiness-block ${className}` : "ops-queue-readiness-block"}>
      <p className="ops-queue-readiness-headline">{summary.headline}</p>
      {summary.subline ? <p className="ops-queue-readiness-subline">{summary.subline}</p> : null}
      <OperationsReadinessList
        gaps={summary.gaps}
        maxVisible={maxVisible}
        showReadyItems={summary.openGapCount === 0}
        intelligenceSectionLabel={intelligenceSectionLabel}
      />
    </div>
  );
}

/** @deprecated Use OperationsReadinessList */
export function OperationsSignalList({
  signals,
  className,
  maxVisible = 4,
}: {
  signals: DirectoryReadinessGap[];
  className?: string;
  maxVisible?: number;
}) {
  return <OperationsReadinessList gaps={signals} className={className} maxVisible={maxVisible} />;
}

export function OperationsTacticalChips({
  actions,
  className,
}: {
  actions: TacticalActionChip[];
  className?: string;
}) {
  if (!actions.length) return null;
  return (
    <div className={className ? `ops-queue-chips ${className}` : "ops-queue-chips"} role="group" aria-label="Tactical actions">
      {actions.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={`ops-queue-chip${a.emphasis ? " ops-queue-chip--emphasis" : ""}`}
          data-surgical-press
          onClick={(e) => e.stopPropagation()}
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}
