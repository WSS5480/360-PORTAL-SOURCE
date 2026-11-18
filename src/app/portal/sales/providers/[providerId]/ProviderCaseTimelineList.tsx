"use client";

import Link from "next/link";
import { buildProviderCaseTimelineRow } from "@/lib/surgical-sales/buildProviderCaseTimelineRow";

function caseTypeModifier(caseTypeLabel: string): string {
  return caseTypeLabel.toLowerCase().includes("observation") ? "observation" : "support";
}

export function ProviderCaseTimelineList({
  cases,
  empty,
  addCaseHref,
}: {
  cases: Record<string, unknown>[];
  empty: string;
  addCaseHref?: string;
}) {
  if (cases.length === 0) {
    return (
      <div className="provider-compact-empty-block">
        <p className="provider-compact-empty">{empty}</p>
        {addCaseHref ? (
          <Link href={addCaseHref} className="provider-compact-empty-cta">
            Add case
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <ol className="provider-case-timeline" aria-label="Provider case learning timeline">
      {cases.map((caseRow) => {
        const row = buildProviderCaseTimelineRow(caseRow);
        const typeModifier = caseTypeModifier(row.caseTypeLabel);

        return (
          <li key={row.caseId} className="provider-case-timeline-item">
            <Link href={row.detailHref} className="provider-case-timeline-link" data-surgical-press>
              <div className="provider-case-timeline-head">
                <span className={`provider-case-timeline-type provider-case-timeline-type--${typeModifier}`}>
                  {row.caseTypeLabel}
                </span>
                <span className="provider-case-timeline-date">{row.dateLine}</span>
              </div>

              <p className="provider-case-timeline-procedure">{row.procedureLabel}</p>

              <div className="provider-case-timeline-meta">
                <span className="provider-case-timeline-meta-item">
                  <span className="provider-case-timeline-meta-label">Status</span>
                  <span className="provider-case-timeline-meta-value">{row.statusLabel}</span>
                </span>
                {row.productsLabel ? (
                  <span className="provider-case-timeline-meta-item">
                    <span className="provider-case-timeline-meta-label">Products</span>
                    <span className="provider-case-timeline-meta-value">{row.productsLabel}</span>
                  </span>
                ) : null}
              </div>

              <div className="provider-case-timeline-outcome">
                <span className="provider-case-timeline-outcome-label">Outcome</span>
                <ul className="provider-case-timeline-outcome-list">
                  {row.outcomeLines.map((line) => (
                    <li key={`${row.caseId}-${line}`}>{line}</li>
                  ))}
                </ul>
              </div>

              {row.openQuestionsCount != null && row.openQuestionsCount > 0 ? (
                <p className="provider-case-timeline-questions">
                  <span className="provider-case-timeline-questions-label">Open Questions</span>
                  <span className="provider-case-timeline-questions-value">{row.openQuestionsCount}</span>
                </p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
