"use client";

import Link from "next/link";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { buildObservationReadinessSummary } from "@/lib/surgical-sales/buildObservationReadinessSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export function CaseObservationReadinessSummary({
  caseRow,
  operationalContext,
  providerContact,
  planning,
  providerId,
}: {
  caseRow: Record<string, unknown>;
  operationalContext?: CaseOperationalContextView | null;
  providerContact?: Record<string, unknown> | null;
  planning?: ProviderPlanningCompletion | null;
  providerId?: string | null;
}) {
  const summary = buildObservationReadinessSummary({
    caseRow,
    operationalContext,
    providerContact,
    planning,
  });

  const sections = [
    { id: "known", title: "Known", lines: summary.known, empty: "Capture notes on Overview — confirmed signals appear here." },
    {
      id: "needs-confirmation",
      title: "Needs confirmation",
      lines: summary.needsConfirmation,
      empty: "Nothing partial on file.",
    },
    {
      id: "next-questions",
      title: "Next best questions",
      lines: summary.nextBestQuestions,
      empty: "No high-priority questions — keep observing.",
    },
  ] as const;

  return (
    <>
      <section className="case-obs-readiness" aria-labelledby="case-obs-readiness-title">
        <div className="case-obs-readiness-head">
          <h3 id="case-obs-readiness-title" className="case-obs-readiness-title">
            Field intelligence
          </h3>
          {providerId ? (
            <Link
              href={`/portal/sales/providers/${encodeURIComponent(providerId)}?tab=intelligence`}
              className="case-obs-overview-section-link"
              data-surgical-press
            >
              Provider profile
            </Link>
          ) : null}
        </div>
        <p className="case-obs-readiness-lead">
          Highest-value signals only — AI organizes your quick notes; confirm what matters for progression.
        </p>

        {!summary.hasContent ? (
          <p className="case-obs-overview-empty">Start with a quick note on Overview. Intelligence builds as you observe.</p>
        ) : (
          <div className="case-obs-readiness-groups">
            {sections.map((section) => (
              <div key={section.id} className="case-obs-readiness-group">
                <h4 className="case-obs-readiness-group-title">{section.title}</h4>
                {section.lines.length > 0 ? (
                  <ul className={`case-obs-readiness-list case-obs-readiness-list--${section.id}`}>
                    {section.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="case-obs-readiness-empty-group">{section.empty}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
