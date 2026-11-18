"use client";

import Link from "next/link";
import React from "react";

type NotificationRow = {
  id: string;
  case_id: string;
  notification_type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  metadata_json?: unknown;
};

export function SurgicalSalesNotificationsHost() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationRow[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/sales/surgical-notifications", { cache: "no-store" });
      const j = (await res.json()) as {
        ok?: boolean;
        notifications?: NotificationRow[];
        unread_count?: number;
      };
      if (j.ok && j.notifications) {
        setItems(j.notifications);
        setUnread(typeof j.unread_count === "number" ? j.unread_count : j.notifications.filter((x) => !x.read_at).length);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const t = window.setInterval(() => void load(), 120_000);
    return () => window.clearInterval(t);
  }, [load]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/portal/sales/surgical-notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      await load();
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed",
        top: 14,
        right: 16,
        zIndex: 200,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label="Case notifications"
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
        style={{
          position: "relative",
          width: 44,
          height: 44,
          borderRadius: 12,
          border: "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
          background: "var(--surface)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 1px 2px color-mix(in srgb, var(--foreground) 8%, transparent)",
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>
          🔔
        </span>
        {unread > 0 ? (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "var(--brand-600)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
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
            top: 50,
            right: 0,
            width: "min(380px, calc(100vw - 32px))",
            maxHeight: "min(70vh, 420px)",
            overflow: "auto",
            borderRadius: 14,
            border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
            background: "var(--surface)",
            boxShadow: "0 12px 40px color-mix(in srgb, var(--foreground) 18%, transparent)",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 14 }}>Case alerts</span>
            <button
              type="button"
              onClick={() => void load()}
              style={{
                border: "none",
                background: "none",
                color: "var(--brand-700)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {loading ? "…" : "Refresh"}
            </button>
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>No notifications yet.</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {items.map((n) => (
                <li
                  key={n.id}
                  style={{
                    borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
                    background: n.read_at ? undefined : "color-mix(in srgb, var(--brand-600) 5%, var(--surface))",
                  }}
                >
                  <div style={{ padding: "12px 14px", display: "grid", gap: 6 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "var(--foreground)" }}>{n.title}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>{n.body}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 4 }}>
                      <Link
                        href={`/portal/sales/cases/${encodeURIComponent(n.case_id)}`}
                        style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-700)" }}
                        onClick={() => void markRead(n.id)}
                      >
                        Open case
                      </Link>
                      {!n.read_at ? (
                        <button
                          type="button"
                          onClick={() => void markRead(n.id)}
                          style={{
                            border: "none",
                            background: "none",
                            color: "var(--muted)",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Mark read
                        </button>
                      ) : null}
                      <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
