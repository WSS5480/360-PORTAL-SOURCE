"use client";

import React from "react";
import { CrmStatusBadge } from "@/components/sales/crmUi";
import { PortalEmptyState } from "@/components/sales/PortalEmptyState";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import {
  TIME_OFF_REQUEST_TYPES,
  TIME_OFF_STATUS_LABELS,
  TIME_OFF_TYPE_LABELS,
  type TimeOffRequestType,
  type TimeOffStatus,
} from "@/lib/sales/timeOffRequests";

type RequestRow = {
  id: string;
  request_type: TimeOffRequestType;
  start_date: string;
  end_date: string;
  notes: string | null;
  status: TimeOffStatus;
  review_comment: string | null;
  reviewed_at: string | null;
  reviewer_name: string | null;
  created_at: string;
};

function statusTone(status: TimeOffStatus): "warning" | "success" | "danger" | "muted" {
  if (status === "pending") return "warning";
  if (status === "approved") return "success";
  if (status === "denied") return "danger";
  return "muted";
}

function formatRange(start: string, end: string) {
  const s = String(start).slice(0, 10);
  const e = String(end).slice(0, 10);
  if (s === e) return new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(s)} – ${fmt(e)}`;
}

export default function SalesTimeOffClient() {
  const [requests, setRequests] = React.useState<RequestRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);

  const [requestType, setRequestType] = React.useState<TimeOffRequestType>(TIME_OFF_REQUEST_TYPES.PTO);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/sales/time-off-requests", { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) {
        setErr(userFacingError(j.error, "We could not load your time-off requests. Please try again."));
        return;
      }
      setRequests(j.requests || []);
      setErr(null);
    } catch (e) {
      setErr(userFacingError(e, "We could not load your time-off requests. Please try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setErr("Please select start and end dates.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/portal/sales/time-off-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_type: requestType,
          start_date: startDate,
          end_date: endDate,
          notes: notes.trim() || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) {
        setErr(userFacingError(j.error, "That request could not be submitted. Please try again."));
        return;
      }
      setShowForm(false);
      setNotes("");
      setStartDate("");
      setEndDate("");
      setRequestType(TIME_OFF_REQUEST_TYPES.PTO);
      await load();
    } catch (e) {
      setErr(userFacingError(e, "That request could not be submitted. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(id: string) {
    if (!window.confirm("Cancel this pending request?")) return;
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/time-off-requests/${encodeURIComponent(id)}`, { method: "PATCH" });
      const j = await res.json();
      if (!j.ok) {
        setErr(userFacingError(j.error, "That request could not be cancelled. Please try again."));
        return;
      }
      await load();
    } catch (e) {
      setErr(userFacingError(e, "That request could not be cancelled. Please try again."));
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  return (
    <SalesCommandPage
      title="Time off"
      subtitle="Request PTO, sick leave, or personal days. Your manager will review and you'll see the decision here."
      actions={
        <button type="button" style={sc.btnPrimary} onClick={() => setShowForm(true)}>
          + New request
        </button>
      }
    >
      <div className="sales-time-off-page">
      {err ? (
        <div role="alert" style={sc.alertError}>
          {err}
        </div>
      ) : null}

      {showForm ? (
        <div style={sc.modalBackdrop} role="presentation" onClick={() => !submitting && setShowForm(false)}>
          <div
            role="dialog"
            aria-labelledby="time-off-form-title"
            className="sales-time-off-modal"
            style={{ ...sc.modalPanel, maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="time-off-form-title" style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>
              Request time off
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
              Submit at least a few days ahead when possible. Email confirmations will be added soon.
            </p>
            <form onSubmit={(e) => void submit(e)} style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sc.kicker}>Type</span>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as TimeOffRequestType)}
                  style={sc.input}
                >
                  {Object.entries(TIME_OFF_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sales-time-off-date-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={sc.kicker}>Start date</span>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate || e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    style={sc.input}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={sc.kicker}>End date</span>
                  <input
                    type="date"
                    required
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={sc.input}
                  />
                </label>
              </div>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sc.kicker}>Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Coverage plan, partial-day details, etc."
                  rows={3}
                  maxLength={2000}
                  style={{ ...sc.input, resize: "vertical", minHeight: 80 }}
                />
              </label>
              <div className="sales-time-off-modal-actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" style={sc.btnSecondary} disabled={submitting} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" style={sc.btnPrimary} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 28 }}>
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Pending</h3>
            {pending.length > 0 ? <CrmStatusBadge tone="warning">{pending.length}</CrmStatusBadge> : null}
          </div>
          {loading ? (
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
          ) : pending.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              No pending requests. Tap <strong>New request</strong> when you need time off.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {pending.map((r) => (
                <RequestCard key={r.id} row={r} onCancel={() => void cancelRequest(r.id)} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>History</h3>
          {!loading && history.length === 0 ? (
            <PortalEmptyState
              title="No past requests yet"
              description="Approved, denied, and cancelled requests will show up here."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {history.map((r) => (
                <RequestCard key={r.id} row={r} />
              ))}
            </div>
          )}
        </section>
      </div>
      </div>
    </SalesCommandPage>
  );
}

function RequestCard({ row, onCancel }: { row: RequestRow; onCancel?: () => void }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
        background: "var(--surface)",
        display: "grid",
        gap: 8,
      }}
    >
      <div className="sales-time-off-card-head" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{TIME_OFF_TYPE_LABELS[row.request_type]}</span>
        <CrmStatusBadge tone={statusTone(row.status)}>{TIME_OFF_STATUS_LABELS[row.status]}</CrmStatusBadge>
        <span className="sales-time-off-card-submitted" style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
          Submitted {new Date(row.created_at).toLocaleDateString()}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 650 }}>{formatRange(row.start_date, row.end_date)}</div>
      {row.notes ? <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{row.notes}</div> : null}
      {row.review_comment ? (
        <div
          style={{
            marginTop: 4,
            padding: "10px 12px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--brand-600) 6%, var(--surface))",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <strong>Manager note:</strong> {row.review_comment}
          {row.reviewer_name ? (
            <span style={{ color: "var(--muted)" }}> — {row.reviewer_name}</span>
          ) : null}
        </div>
      ) : null}
      {onCancel ? (
        <div style={{ marginTop: 4 }}>
          <button type="button" style={sc.btnDangerOutline} onClick={onCancel}>
            Cancel request
          </button>
        </div>
      ) : null}
    </div>
  );
}
