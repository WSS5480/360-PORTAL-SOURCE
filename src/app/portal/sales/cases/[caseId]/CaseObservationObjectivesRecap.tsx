"use client";

import React from "react";
import {
  observationObjectivesFromCaseRow,
  observationObjectivesHasContent,
} from "@/lib/surgical-sales/observationObjectives";

export function CaseObservationObjectivesRecap({ caseRow }: { caseRow: Record<string, unknown> }) {
  const objectives = observationObjectivesFromCaseRow(caseRow);
  if (!observationObjectivesHasContent(objectives)) {
    return (
      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>
        No observation objectives were recorded for this case.
      </p>
    );
  }

  const rows = [
    { label: "Primary objective", value: objectives.observation_goal },
    { label: "Key questions", value: objectives.observation_key_questions },
    { label: "Signals to validate", value: objectives.observation_signals_to_validate },
  ].filter((r) => r.value.trim());

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
        background: "color-mix(in srgb, var(--brand-600) 4%, var(--surface))",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--muted)" }}>
        Observation objectives
      </div>
      {rows.map((row) => (
        <div key={row.label} style={{ fontSize: 12, lineHeight: 1.45 }}>
          <div style={{ fontWeight: 800, color: "var(--muted)", fontSize: 11, marginBottom: 2 }}>{row.label}</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{row.value}</div>
        </div>
      ))}
    </div>
  );
}
