"use client";

import React from "react";
import {
  CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS,
  type CaseIntelligenceFieldDef,
} from "@/lib/surgical-sales/caseIntelligenceFields";
import { IntelligenceScopeBadge } from "@/components/sales/intelligenceCapture/IntelligenceScopeBadge";
import { userFacingError } from "@/lib/errors/userFacingError";

function readCaseText(caseRow: Record<string, unknown>, key: string): string {
  const v = caseRow[key];
  return v == null ? "" : String(v);
}

export function CaseIntelligenceLogisticsSection({
  caseId,
  caseRow,
  disabled,
  onSaved,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  onSaved?: (saved: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS) {
      initial[field.dbKey] = readCaseText(caseRow, field.dbKey);
    }
    return initial;
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const next: Record<string, string> = {};
    for (const field of CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS) {
      next[field.dbKey] = readCaseText(caseRow, field.dbKey);
    }
    setDraft(next);
  }, [caseRow]);

  async function saveField(field: CaseIntelligenceFieldDef) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field.dbKey]: draft[field.dbKey]?.trim() || null }),
      });
      const j = (await res.json()) as { ok?: boolean; case?: Record<string, unknown>; error?: string };
      if (!res.ok || !j.ok || !j.case) {
        throw new Error(j.error ?? "Save failed");
      }
      onSaved?.(j.case);
    } catch (e) {
      setError(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="case-intel-logistics" aria-labelledby="case-intel-logistics-title">
      <header className="case-intel-logistics-head">
        <div>
          <h3 id="case-intel-logistics-title" className="case-intel-logistics-title">
            Case logistics
          </h3>
          <p className="case-intel-logistics-kicker">
            Logistics for this scheduled case — not stored on the provider profile.
          </p>
        </div>
        <IntelligenceScopeBadge scope="case" compact />
      </header>
      <div className="case-intel-logistics-grid">
        {CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS.map((field) => (
          <label key={field.dbKey} className="case-intel-logistics-field">
            <span className="case-intel-logistics-label">{field.label}</span>
            {field.helper ? <span className="case-intel-logistics-helper">{field.helper}</span> : null}
            <textarea
              rows={2}
              value={draft[field.dbKey] ?? ""}
              disabled={disabled || saving}
              onChange={(e) => setDraft((d) => ({ ...d, [field.dbKey]: e.target.value }))}
              onBlur={() => void saveField(field)}
            />
          </label>
        ))}
      </div>
      {error ? (
        <p className="case-intel-logistics-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
