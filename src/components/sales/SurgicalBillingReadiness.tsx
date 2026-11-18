"use client";

import React from "react";
import type { BillingReadinessLevel } from "@/lib/surgical-sales/billingReadiness";
import { billingReadinessColors, billingReadinessLabel } from "@/lib/surgical-sales/billingReadiness";

export function SurgicalBillingReadinessDot({
  level,
  title,
  size = 10,
}: {
  level: BillingReadinessLevel;
  title?: string;
  size?: number;
}) {
  const c = billingReadinessColors(level);
  return (
    <span
      title={title || billingReadinessLabel(level)}
      aria-label={billingReadinessLabel(level)}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 999,
        background: c.dot,
        boxShadow: `0 0 0 2px color-mix(in srgb, ${c.dot} 25%, var(--surface))`,
        flexShrink: 0,
      }}
    />
  );
}

export function SurgicalBillingChecklistRows({
  po,
  invoice,
  quantities,
  variant = "portal",
}: {
  po: boolean;
  invoice: boolean;
  quantities: boolean;
  variant?: "portal" | "admin";
}) {
  const row = (ok: boolean, label: string) => (
    <div
      key={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: variant === "admin" ? 13 : 13,
        fontWeight: 600,
        color: ok ? (variant === "admin" ? "#15803d" : "var(--foreground)") : variant === "admin" ? "#64748b" : "var(--muted)",
      }}
    >
      <span style={{ fontSize: 15, width: 22, textAlign: "center" }}>{ok ? "✓" : "○"}</span>
      <span>{label}</span>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {row(po, "PO uploaded")}
      {row(invoice, "Invoice uploaded")}
      {row(quantities, "Quantities confirmed")}
    </div>
  );
}

export function SurgicalBillingReadinessBanner({
  level,
  children,
}: {
  level: BillingReadinessLevel;
  children: React.ReactNode;
}) {
  const c = billingReadinessColors(level);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${c.border}`,
        background:
          level === "ready"
            ? "color-mix(in srgb, #16a34a 7%, var(--surface))"
            : level === "partial"
              ? "color-mix(in srgb, #ca8a04 8%, var(--surface))"
              : "color-mix(in srgb, #dc2626 8%, var(--surface))",
      }}
    >
      <SurgicalBillingReadinessDot level={level} size={12} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
