"use client";

import React from "react";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { buildObservationReadinessSummary } from "@/lib/surgical-sales/buildObservationReadinessSummary";
import { dedupeObservationIntelligenceBullets } from "@/lib/surgical-sales/observationCaseIntelligenceDedup";
import { buildCaseSchedulingStatusSummary } from "@/lib/surgical-sales/caseExecutionHeaderHelpers";
import { buildObservationOverviewGoals } from "@/lib/surgical-sales/observationOverviewGoals";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

function SnapshotRow({ label, value, empty }: { label: string; value: string | null; empty?: string }) {
  const display = value?.trim() || empty || "—";
  const isEmpty = !value?.trim();
  return (
    <div className={`case-obs-snapshot-row${isEmpty ? " case-obs-snapshot-row--empty" : ""}`}>
      <span className="case-obs-snapshot-label">{label}</span>
      <span className="case-obs-snapshot-value">{display}</span>
    </div>
  );
}

function SnapshotList({ label, items, empty }: { label: string; items: string[]; empty: string }) {
  return (
    <div className="case-obs-snapshot-block">
      <span className="case-obs-snapshot-label">{label}</span>
      {items.length > 0 ? (
        <ul className="case-obs-snapshot-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="case-obs-snapshot-empty">{empty}</p>
      )}
    </div>
  );
}

export function CaseObservationSnapshot({
  caseRow,
  engagement,
  operationalContext,
  providerContact,
  planning,
  productsLabel,
}: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  operationalContext?: CaseOperationalContextView | null;
  providerContact?: Record<string, unknown> | null;
  planning?: ProviderPlanningCompletion | null;
  productsLabel: string;
}) {
  const summary = React.useMemo(
    () =>
      buildObservationReadinessSummary({
        caseRow,
        operationalContext,
        providerContact,
        planning,
      }),
    [caseRow, operationalContext, providerContact, planning],
  );

  const goals = React.useMemo(
    () => buildObservationOverviewGoals(caseRow, engagement ?? null),
    [caseRow, engagement],
  );

  const goalText = goals.length > 0 ? goals.map((goal) => goal.text).join(" · ") : null;
  const blockers = dedupeObservationIntelligenceBullets(
    [...summary.needsConfirmation, ...summary.nextBestQuestions],
    4,
  );
  const knownIntel = summary.known.slice(0, 4);
  const schedulingStatus = buildCaseSchedulingStatusSummary(caseRow);

  return (
    <section className="case-obs-snapshot" aria-labelledby="case-obs-snapshot-title">
      <h2 id="case-obs-snapshot-title" className="case-obs-snapshot-title">
        Case snapshot
      </h2>
      <div className="case-obs-snapshot-card">
        <SnapshotRow label="Goal" value={goalText} empty="No goal set yet" />
        <SnapshotList label="Known intelligence" items={knownIntel} empty="Capture notes to build intelligence" />
        <SnapshotList
          label="Still need to confirm"
          items={blockers}
          empty="Nothing flagged right now"
        />
        <SnapshotRow label="Products involved" value={productsLabel === "None attached" ? null : productsLabel} empty="None attached" />
        <SnapshotRow label="Scheduling" value={schedulingStatus} />
      </div>
    </section>
  );
}
