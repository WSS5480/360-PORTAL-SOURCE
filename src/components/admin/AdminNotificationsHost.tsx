"use client";

import Link from "next/link";
import React from "react";
type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  metadata_json?: { request_id?: string };
  read_at: string | null;
  created_at: string;
};

type RequestPreview = {
  id: string;
  requester_name: string | null;
  requester_email: string | null;
  request_type: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  status: string;
};

export function AdminNotificationsHost({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationRow[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<NotificationRow | null>(null);
  const [reviewRequest, setReviewRequest] = React.useState<RequestPreview | null>(null);
  const [reviewComment, setReviewComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const bootstrappedRef = React.useRef(false);

  const load = React.useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      const j = (await res.json()) as {
        ok?: boolean;
        notifications?: NotificationRow[];
        unread_count?: number;
      };
      if (j.ok && j.notifications) {
        const list = j.notifications;
        setItems(list);
        const unreadN =
          typeof j.unread_count === "number" ? j.unread_count : list.filter((x) => !x.read_at).length;
        setUnread(unreadN);

        if (!bootstrappedRef.current) {
          for (const n of list) seenIdsRef.current.add(n.id);
          bootstrappedRef.current = true;
        } else {
          const fresh = list.find(
            (n) => !n.read_at && n.notification_type === "time_off_request" && !seenIdsRef.current.has(n.id),
          );
          if (fresh) {
            seenIdsRef.current.add(fresh.id);
            setToast(fresh);
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  React.useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  React.useEffect(() => {
    if (!isAdmin) return;
    const t = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(t);
  }, [isAdmin, load]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 12_000);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!isAdmin) return null;

  async function markRead(id: string) {
    try {
      await fetch(`/api/admin/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      await load();
    } catch {
      /* ignore */
    }
  }

  async function openReviewFromNotification(n: NotificationRow) {
    const requestId = n.metadata_json?.request_id;
    if (!requestId) return;
    void markRead(n.id);
    setToast(null);
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/sales/time-off-requests?status=all`, { cache: "no-store" });
      const j = await res.json();
      const row = (j.requests || []).find((r: RequestPreview) => r.id === requestId);
      if (row && row.status === "pending") {
        setReviewRequest(row);
        setReviewComment("");
      } else {
        window.location.href = "/admin/sales/time-off";
      }
    } catch {
      window.location.href = "/admin/sales/time-off";
    }
  }

  async function review(decision: "approved" | "denied") {
    if (!reviewRequest) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/sales/time-off-requests/${encodeURIComponent(reviewRequest.id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, review_comment: reviewComment.trim() || null }),
      });
      const j = await res.json();
      if (j.ok) {
        setReviewRequest(null);
        setReviewComment("");
        await load();
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  function repLabel(r: RequestPreview) {
    return r.requester_name?.trim() || r.requester_email?.trim() || "Sales rep";
  }

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <button
          type="button"
          aria-expanded={open}
          aria-label="Admin notifications"
          onClick={() => {
            setOpen((v) => !v);
            void load();
          }}
          style={{
            position: "relative",
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "white",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            boxShadow: "var(--shadow-1)",
          }}
        >
          <span style={{ fontSize: 18 }} aria-hidden>
            🔔
          </span>
          {unread > 0 ? (
            <span
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 999,
                background: "var(--brand-600)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 900,
                display: "grid",
                placeItems: "center",
              }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>

        {open ? (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "min(380px, calc(100vw - 32px))",
              maxHeight: "min(70vh, 420px)",
              overflow: "auto",
              borderRadius: 14,
              border: "1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border))",
              background: "var(--surface)",
              boxShadow: "var(--shadow-1)",
              zIndex: 60,
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 900, fontSize: 13 }}>Alerts</span>
              <button
                type="button"
                onClick={() => void load()}
                style={{ border: "none", background: "none", color: "var(--brand-700)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
              >
                {loading ? "…" : "Refresh"}
              </button>
            </div>
            {items.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>No alerts.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {items.map((n) => (
                  <li
                    key={n.id}
                    style={{
                      borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
                      background: n.read_at ? undefined : "var(--brand-050)",
                    }}
                  >
                    <div style={{ padding: "12px 14px", display: "grid", gap: 6 }}>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>{n.title}</div>
                      <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", whiteSpace: "pre-wrap" }}>{n.body}</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        {n.notification_type === "time_off_request" && n.metadata_json?.request_id ? (
                          <button
                            type="button"
                            onClick={() => void openReviewFromNotification(n)}
                            style={{
                              border: "none",
                              background: "none",
                              color: "var(--brand-700)",
                              fontWeight: 900,
                              fontSize: 12,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            Review now
                          </button>
                        ) : null}
                        <Link href="/admin/sales/time-off" style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-700)" }}>
                          Time off queue
                        </Link>
                        {!n.read_at ? (
                          <button
                            type="button"
                            onClick={() => void markRead(n.id)}
                            style={{ border: "none", background: "none", color: "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}
                          >
                            Dismiss
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {toast ? (
        <div
          role="alert"
          style={{
            position: "fixed",
            top: 72,
            right: 20,
            zIndex: 200,
            width: "min(380px, calc(100vw - 40px))",
            padding: "16px 18px",
            borderRadius: 14,
            border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
            background: "var(--surface)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14 }}>{toast.title}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{toast.body}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {toast.metadata_json?.request_id ? (
              <button
                type="button"
                onClick={() => void openReviewFromNotification(toast)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--brand-600)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Review
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void markRead(toast.id);
                setToast(null);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {reviewRequest ? (
        <div
          role="presentation"
          onClick={() => !submitting && setReviewRequest(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 210,
          }}
        >
          <div
            role="dialog"
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
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Time off request</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              <strong>{repLabel(reviewRequest)}</strong> — {String(reviewRequest.start_date).slice(0, 10)} to{" "}
              {String(reviewRequest.end_date).slice(0, 10)}
              {reviewRequest.notes ? (
                <>
                  <br />
                  <span style={{ color: "var(--muted)" }}>{reviewRequest.notes}</span>
                </>
              ) : null}
            </p>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Optional comment for the rep…"
              rows={3}
              maxLength={2000}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 14, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void review("approved")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--brand-600)",
                  color: "#fff",
                  fontWeight: 900,
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
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid color-mix(in srgb, var(--danger) 40%, var(--border))",
                  background: "color-mix(in srgb, var(--danger) 8%, var(--surface))",
                  color: "var(--danger)",
                  fontWeight: 900,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
