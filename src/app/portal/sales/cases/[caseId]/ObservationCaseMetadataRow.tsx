"use client";

import React from "react";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import {
  formatObservationCaseExecutionStatusLabel,
  resolveObservationCaseExecutionStatus,
} from "@/lib/surgical-sales/observationCaseExecutionStatus";
import { observationCaseBriefingCss } from "./observationCaseBriefingCss";
import { observationCaseSummaryCss } from "./observationCaseSummaryCss";

type MetadataActivity = { activity_type?: string };

export function ObservationCaseMetadataRow({
  identity,
  caseRow,
  activities,
}: {
  identity: CaseIdentity;
  caseRow: Record<string, unknown>;
  activities?: MetadataActivity[];
}) {
  const executionStatus = React.useMemo(
    () => resolveObservationCaseExecutionStatus({ caseRow, activities }),
    [activities, caseRow],
  );
  const statusLabel = formatObservationCaseExecutionStatusLabel(executionStatus);
  const dateLabel = identity.dateLineWithTime || identity.dateLine;
  const expectedRevenue = Number(caseRow.expected_revenue ?? 0);
  const revenueLabel =
    Number.isFinite(expectedRevenue) && expectedRevenue > 0
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(expectedRevenue)
      : "—";

  const items = [
    { label: "Provider", value: identity.providerName },
    { label: "Facility", value: identity.facilityName },
    { label: "Procedure", value: identity.procedureType || "—" },
    { label: "Date", value: dateLabel },
    { label: "Revenue", value: revenueLabel },
    { label: "Status", value: statusLabel, status: executionStatus },
  ];

  return (
    <div className="case-obs-metadata-row" aria-label="Case metadata">
      <style dangerouslySetInnerHTML={{ __html: `${observationCaseBriefingCss}\n${observationCaseSummaryCss}` }} />
      {items.map((item) => (
        <div key={item.label} className="case-obs-metadata-item">
          <p className="case-obs-metadata-label">{item.label}</p>
          {item.status ? (
            <span className={`case-obs-summary-status case-obs-summary-status--${item.status}`}>
              {item.value}
            </span>
          ) : (
            <p className="case-obs-metadata-value">{item.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}
