"use client";

import React from "react";
import { parseOptionalCaseRevenue } from "@/lib/surgical-sales/newSurgicalCasePageLogic";
import { sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { productSupportCaseOverviewCss } from "./productSupportCaseOverviewCss";

function moneyLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  if (n <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function ProductSupportCaseRevenue({
  caseRow,
  disabled,
  onPatchCase,
}: {
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  onPatchCase?: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const expectedStored = caseRow.expected_revenue != null ? String(caseRow.expected_revenue) : "";
  const actualStored = caseRow.actual_revenue != null ? String(caseRow.actual_revenue) : "";
  const [editing, setEditing] = React.useState(false);
  const [expectedRevenue, setExpectedRevenue] = React.useState(expectedStored);
  const [actualRevenue, setActualRevenue] = React.useState(actualStored);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (editing) return;
    setExpectedRevenue(expectedStored);
    setActualRevenue(actualStored);
  }, [actualStored, editing, expectedStored]);

  const save = async () => {
    if (!onPatchCase || disabled) return;
    const expectedParsed = parseOptionalCaseRevenue(expectedRevenue);
    const actualParsed = parseOptionalCaseRevenue(actualRevenue);
    if (!expectedParsed.ok || !actualParsed.ok) {
      setError("Enter valid dollar amounts (zero or greater).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const patch: Record<string, unknown> = {
        expected_revenue: expectedParsed.value ?? 0,
        actual_revenue: actualParsed.value,
      };
      const ok = await onPatchCase(patch);
      if (!ok) throw new Error("Could not save revenue");
      setEditing(false);
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not save revenue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="case-ps-detail-card" aria-labelledby="case-ps-revenue-title">
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseOverviewCss }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 id="case-ps-revenue-title" className="case-ps-detail-card-title" style={{ margin: 0 }}>
          Revenue per case
        </h2>
        {!editing && onPatchCase ? (
          <button
            type="button"
            style={{ ...sc.btnSecondary, padding: "6px 10px", fontSize: 12 }}
            disabled={disabled}
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
          >
            Edit
          </button>
        ) : null}
      </div>

      {editing ? (
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Expected (USD)</span>
            <input
              value={expectedRevenue}
              onChange={(e) => setExpectedRevenue(e.target.value)}
              placeholder="e.g. 4500"
              inputMode="decimal"
              style={sc.input}
              disabled={saving || disabled}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Actual (USD)</span>
            <input
              value={actualRevenue}
              onChange={(e) => setActualRevenue(e.target.value)}
              placeholder="Optional until case closes"
              inputMode="decimal"
              style={sc.input}
              disabled={saving || disabled}
            />
          </label>
          {error ? (
            <p role="alert" style={{ margin: 0, color: "var(--danger)", fontWeight: 650, fontSize: 13 }}>
              {error}
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={sc.btnPrimary} disabled={saving || disabled} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              style={sc.btnSecondary}
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError(null);
                setExpectedRevenue(expectedStored);
                setActualRevenue(actualStored);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="case-ps-briefing-snapshot" style={{ marginTop: 12 }}>
          <div className="case-ps-briefing-snapshot-row">
            <span className="case-ps-briefing-snapshot-label">Expected</span>
            <span className="case-ps-briefing-snapshot-value">{moneyLabel(caseRow.expected_revenue as number | null)}</span>
          </div>
          <div className="case-ps-briefing-snapshot-row">
            <span className="case-ps-briefing-snapshot-label">Actual</span>
            <span className="case-ps-briefing-snapshot-value">{moneyLabel(caseRow.actual_revenue as number | null)}</span>
          </div>
        </div>
      )}
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
        Expected rolls into booked revenue on Pipeline when this case is completed. Enter actual if the close amount differs.
      </p>
    </section>
  );
}
