"use client";

import Link from "next/link";
import React from "react";
import { CrmStatusBadge } from "@/components/sales/crmUi";
import {
  TIME_OFF_STATUS_LABELS,
  TIME_OFF_TYPE_LABELS,
  type TimeOffRequestType,
  type TimeOffStatus,
} from "@/lib/sales/timeOffRequests";

type RequestRow = {
  id: string;
  requester_name: string | null;
  requester_email: string | null;
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
  if (s === e) return s;
  return `${s} – ${e}`;
}

function repLabel(row: RequestRow) {
  return row.requester_name?.trim() || row.requester_email?.trim() || "Unknown rep";
}

export default function AdminTimeOffClient() {
  const [requests, setRequests] = React.useState<RequestRow[]>([]);
  const [filter, setFilter] = React.useState<"pending" | "all">("pending");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [reviewing, setReviewing] = React.useState<RequestRow | null>(null);
  const [reviewComment, setReviewComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sales/time-off-requests?status=${filter}`, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) {
        setErr(j.error || "Failed to load");
        return;
      }
      setRequests(j.requests || []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function review(decision: "approved" | "denied") {
    if (!reviewing) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/sales/time-off-requests/${encodeURIComponent(reviewing.id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, review_comment: reviewComment.trim() || null }),
      });
      const j = await res.json();
      if (!j.ok) {
        setErr(j.error || "Review failed");
        return;
      }
      setReviewing(null);
      setReviewComment("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 20 }}>
      <header>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
          Sales admin
        </div>
        <h1 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 950, letterSpacing: "-0.03em" }}>Time off requests</h1>
        <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
          Review PTO, sick leave, and personal day requests from the sales team. Email notifications will be wired later.
        </p>
      </header>

      {err ? (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.2)",
            color: "rgb(153,27,27)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid",
              borderColor: filter === f ? "color-mix(in srgb, var(--brand-600) 30%, var(--border))" : "var(--border)",
              background: filter === f ? "var(--brand-050)" : "var(--surface)",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {f === "pending" ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` : "All requests"}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : requests.length === 0 ? (
        <div
          style={{
            padding: 32,
            borderRadius: 16,
            border: "1px dashed var(--border)",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 14,
          }}
        >
          {filter === "pending" ? "No pending time-off requests." : "No requests yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                background: "var(--surface)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 900, fontSize: 15 }}>{repLabel(r)}</span>
                <CrmStatusBadge tone={statusTone(r.status)}>{TIME_OFF_STATUS_LABELS[r.status]}</CrmStatusBadge>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{TIME_OFF_TYPE_LABELS[r.request_type]}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{formatRange(r.start_date, r.end_date)}</div>
              {r.notes ? <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{r.notes}</div> : null}
              {r.review_comment ? (
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <strong>Your note:</strong> {r.review_comment}
                  {r.reviewer_name ? ` (${r.reviewer_name})` : ""}
                </div>
              ) : null}
              {r.status === "pending" ? (
                <div style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewing(r);
                      setReviewComment("");
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border))",
                      background: "var(--brand-050)",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                      color: "var(--brand-700)",
                    }}
                  >
                    Review request
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {reviewing ? (
        <div
          role="presentation"
          onClick={() => !submitting && setReviewing(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 100,
          }}
        >
          <div
            role="dialog"
            aria-labelledby="review-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, 100%)",
              padding: 24,
              borderRadius: 16,
              background: "var(--surface)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              display: "grid",
              gap: 16,
            }}
          >
            <h2 id="review-dialog-title" style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
              Review time off
            </h2>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              <strong>{repLabel(reviewing)}</strong> requested {TIME_OFF_TYPE_LABELS[reviewing.request_type].toLowerCase()} for{" "}
              <strong>{formatRange(reviewing.start_date, reviewing.end_date)}</strong>.
              {reviewing.notes ? (
                <>
                  <br />
                  <span style={{ color: "var(--muted)" }}>{reviewing.notes}</span>
                </>
              ) : null}
            </div>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
                Comment (optional)
              </span>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Reason, coverage notes, or approval details…"
                rows={3}
                maxLength={2000}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void review("approved")}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--brand-600)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void review("denied")}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid color-mix(in srgb, var(--danger) 40%, var(--border))",
                  background: "color-mix(in srgb, var(--danger) 8%, var(--surface))",
                  color: "var(--danger)",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Deny
              </button>
              <Link
                href="/admin/sales/time-off"
                onClick={() => setReviewing(null)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: "none",
                  color: "var(--foreground)",
                  textAlign: "center",
                }}
              >
                Full queue
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
