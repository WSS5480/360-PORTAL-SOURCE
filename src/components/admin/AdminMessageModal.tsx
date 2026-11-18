"use client";

import React, { useEffect } from "react";

export default function AdminMessageModal(props: {
  open: boolean;
  title: string;
  body: string;
  variant?: "success" | "error";
  confirmLabel?: string;
  onClose: () => void;
}) {
  const { open, title, body, variant = "success", confirmLabel = "Got it", onClose } = props;
  const isSuccess = variant === "success";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-message-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "color-mix(in srgb, #061225 62%, transparent)",
        backdropFilter: "blur(6px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 432,
          borderRadius: 22,
          overflow: "hidden",
          background: "var(--surface)",
          border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
          boxShadow:
            "0 28px 70px rgba(0,0,0,0.22), 0 0 0 1px color-mix(in srgb, var(--brand-600) 6%, transparent)",
        }}
      >
        <div
          style={{
            height: 5,
            background: isSuccess
              ? "linear-gradient(90deg, var(--brand-600) 0%, color-mix(in srgb, var(--success) 55%, var(--brand-600)) 100%)"
              : "linear-gradient(90deg, #dc2626, #ea580c)",
          }}
        />

        <div style={{ padding: "22px 22px 16px", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div
            aria-hidden
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              lineHeight: 1,
              fontWeight: 950,
              background: isSuccess
                ? "color-mix(in srgb, var(--brand-600) 12%, white)"
                : "color-mix(in srgb, #ef4444 10%, white)",
              border: isSuccess
                ? "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))"
                : "1px solid color-mix(in srgb, #ef4444 25%, var(--border))",
              color: isSuccess ? "var(--brand-700)" : "#b91c1c",
            }}
          >
            {isSuccess ? "✓" : "!"}
          </div>

          <div style={{ minWidth: 0, flex: 1, paddingTop: 2 }}>
            <h2
              id="admin-message-modal-title"
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 950,
                letterSpacing: -0.35,
                color: "var(--foreground)",
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--muted)",
                whiteSpace: "pre-line",
              }}
            >
              {body}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "8px 22px 22px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
            background: "color-mix(in srgb, var(--foreground) 2.5%, var(--surface))",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "11px 24px",
              borderRadius: 12,
              border: "none",
              fontWeight: 950,
              fontSize: 14,
              cursor: "pointer",
              color: "white",
              background: "var(--brand-600)",
              boxShadow: "0 3px 14px color-mix(in srgb, var(--brand-600) 38%, transparent)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
