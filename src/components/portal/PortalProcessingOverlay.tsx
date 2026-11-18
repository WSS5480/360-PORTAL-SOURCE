"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

/**
 * Full-viewport blocking overlay with spinner — use during slow navigations
 * (e.g. place order → order page → payment) so users don’t leave early.
 */
export default function PortalProcessingOverlay(props: {
  show: boolean;
  title: string;
  subtitle?: string;
  zIndex?: number;
  /** When true, show a success check instead of the spinner (e.g. payment confirmed). */
  success?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!props.show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [props.show]);

  if (!props.show || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-busy="true"
      aria-live="polite"
      aria-label={props.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: props.zIndex ?? 240,
        background: "rgba(15, 23, 42, 0.58)",
        backdropFilter: "blur(5px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          borderRadius: 18,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-2)",
          padding: "28px 24px",
          display: "grid",
          gap: 18,
          justifyItems: "center",
          textAlign: "center",
        }}
      >
        {props.success ? (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--success, #16a34a) 18%, var(--surface))",
              border: "2px solid color-mix(in srgb, var(--success, #16a34a) 45%, var(--border))",
              display: "grid",
              placeItems: "center",
              fontSize: 26,
              lineHeight: 1,
            }}
            aria-hidden
          >
            ✓
          </div>
        ) : (
          <div
            className="portal-processing-spinner"
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              border: "3px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
              borderTopColor: "var(--brand-600)",
            }}
          />
        )}
        <div style={{ fontWeight: 950, fontSize: 17, lineHeight: 1.35, color: "var(--foreground)" }}>{props.title}</div>
        {props.subtitle ? (
          <div style={{ fontSize: 13, fontWeight: 750, lineHeight: 1.5, color: "var(--muted)" }}>{props.subtitle}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
