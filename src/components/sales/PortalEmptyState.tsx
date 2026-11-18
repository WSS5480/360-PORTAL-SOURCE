"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { sc } from "@/components/sales/salesCommandUi";

export type PortalEmptyAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

function actionStyle(a: PortalEmptyAction, compact: boolean | undefined): CSSProperties {
  const pad = compact ? "10px 14px" : "11px 16px";
  const fs = compact ? 13 : 14;
  const base =
    a.variant === "primary"
      ? { ...sc.btnPrimary, padding: pad, fontSize: fs, minHeight: 44 }
      : { ...sc.btnSecondary, padding: pad, fontSize: fs, minHeight: 44 };
  return { ...base, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" };
}

export function PortalEmptyState({
  icon,
  title,
  description,
  compact,
  actions,
  footer,
}: {
  /** Optional emoji or small illustration shown above the title. */
  icon?: ReactNode;
  title: string;
  description?: string;
  compact?: boolean;
  actions?: PortalEmptyAction[];
  footer?: ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 10%, var(--border)))",
        padding: compact ? "16px 18px" : "22px 22px 24px",
        background:
          "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 5%, var(--surface)) 0%, var(--surface) 45%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 4%, var(--surface)) 100%)",
        boxShadow: "var(--crm-card-shadow, 0 2px 16px color-mix(in srgb, var(--foreground) 5%, transparent))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "var(--crm-ribbon, linear-gradient(90deg, var(--brand-600), #2dd4bf))",
          opacity: 0.95,
        }}
      />
      <div style={{ position: "relative" }}>
        {icon != null ? (
          <div
            aria-hidden
            style={{
              width: compact ? 48 : 56,
              height: compact ? 48 : 56,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: compact ? 26 : 30,
              lineHeight: 1,
              marginBottom: compact ? 12 : 14,
              background:
                "linear-gradient(145deg, color-mix(in srgb, var(--brand-600) 12%, var(--surface)), var(--surface))",
              border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 10%, var(--border)))",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--foreground) 5%, transparent)",
            }}
          >
            {icon}
          </div>
        ) : null}
        <div
          style={{
            fontWeight: 900,
            color: "var(--foreground)",
            marginBottom: 8,
            fontSize: compact ? 15 : 16,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        {description ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: compact ? 13 : 14, lineHeight: 1.55, maxWidth: 520 }}>
            {description}
          </p>
        ) : null}
        {actions && actions.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: compact ? 14 : 16 }}>
            {actions.map((a) => (
              <Link key={`${a.href}-${a.label}`} href={a.href} data-surgical-press style={actionStyle(a, compact)}>
                {a.label}
              </Link>
            ))}
          </div>
        ) : null}
        {footer ? <div style={{ marginTop: compact ? 14 : 16, display: "flex", flexWrap: "wrap", gap: 10 }}>{footer}</div> : null}
      </div>
    </div>
  );
}
