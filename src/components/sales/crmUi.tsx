"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { SalesMetricCard, sc } from "@/components/sales/salesCommandUi";

/** Reusable metric tile — same implementation as Sales Command, CRM-polished shell. */
export const MetricCard = SalesMetricCard;

export type CrmBadgeTone = "brand" | "neutral" | "info" | "success" | "warning" | "danger" | "muted";

const badgeToneStyles: Record<
  CrmBadgeTone,
  { bg: string; fg: string; border: string }
> = {
  brand: {
    bg: "color-mix(in srgb, var(--brand-600) 14%, var(--surface))",
    fg: "var(--brand-700)",
    border: "color-mix(in srgb, var(--brand-600) 28%, var(--border))",
  },
  neutral: {
    bg: "color-mix(in srgb, var(--crm-navy) 6%, var(--surface))",
    fg: "color-mix(in srgb, var(--foreground) 88%, var(--muted))",
    border: "var(--crm-card-edge)",
  },
  info: {
    bg: "color-mix(in srgb, var(--crm-cyan) 12%, var(--surface))",
    fg: "color-mix(in srgb, var(--crm-cyan) 55%, var(--foreground))",
    border: "color-mix(in srgb, var(--crm-cyan-bright) 25%, var(--border))",
  },
  success: {
    bg: "color-mix(in srgb, var(--success) 12%, var(--surface))",
    fg: "var(--success)",
    border: "color-mix(in srgb, var(--success) 28%, var(--border))",
  },
  warning: {
    bg: "color-mix(in srgb, var(--warning) 14%, var(--surface))",
    fg: "var(--warning)",
    border: "color-mix(in srgb, var(--warning) 30%, var(--border))",
  },
  danger: {
    bg: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
    fg: "var(--danger)",
    border: "color-mix(in srgb, var(--danger) 28%, var(--border))",
  },
  muted: {
    bg: "color-mix(in srgb, var(--foreground) 6%, var(--surface))",
    fg: "var(--muted)",
    border: "color-mix(in srgb, var(--foreground) 8%, var(--border))",
  },
};

export function crmBadgeStyle(tone: CrmBadgeTone, compact?: boolean): CSSProperties {
  const t = badgeToneStyles[tone];
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: compact ? 10 : 11,
    fontWeight: 800,
    letterSpacing: compact ? "0.04em" : "0.02em",
    padding: compact ? "3px 9px" : "5px 12px",
    borderRadius: 999,
    background: t.bg,
    color: t.fg,
    border: `1px solid ${t.border}`,
    whiteSpace: "nowrap",
    maxWidth: "100%",
    boxShadow: "0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent)",
  };
}

export function CrmStatusBadge({
  children,
  tone = "neutral",
  compact,
  title: ariaTitle,
}: {
  children: ReactNode;
  tone?: CrmBadgeTone;
  compact?: boolean;
  title?: string;
}) {
  return (
    <span style={crmBadgeStyle(tone, compact)} title={ariaTitle}>
      {children}
    </span>
  );
}

/** Surgical case list / detail status → pill styles (shared with cases hub). */
export function caseStatusBadgeStyle(status: string): CSSProperties {
  const s = String(status).toLowerCase();
  const map: Record<string, CrmBadgeTone> = {
    scheduled: "info",
    confirmed: "brand",
    completed: "success",
    docs_needed: "warning",
    billing_review: "warning",
    invoiced: "success",
    closed: "muted",
    cancelled: "danger",
  };
  const tone = map[s] || "neutral";
  return crmBadgeStyle(tone);
}

/** Observation vs product-support case type pill. */
export function caseTypeBadgeStyle(caseType: string | null | undefined): CSSProperties {
  const s = String(caseType ?? "").trim().toLowerCase();
  if (s === "observation") {
    return {
      ...crmBadgeStyle("brand"),
      background: "color-mix(in srgb, #7c3aed 14%, var(--surface))",
      color: "#5b21b6",
      border: "1px solid color-mix(in srgb, #7c3aed 28%, var(--border))",
    };
  }
  return crmBadgeStyle("neutral");
}

export function CrmProductBadge({ label, short }: { label: string; short?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: short ? 11 : 12,
        fontWeight: 750,
        padding: short ? "4px 10px" : "5px 12px",
        borderRadius: 10,
        background: "linear-gradient(135deg, color-mix(in srgb, var(--crm-navy) 8%, var(--surface)), color-mix(in srgb, var(--brand-600) 6%, var(--surface)))",
        color: "var(--foreground)",
        border: "1px solid var(--crm-card-edge)",
        boxShadow: "0 1px 0 color-mix(in srgb, var(--crm-cyan-bright) 12%, transparent)",
        maxWidth: "100%",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          marginRight: 8,
          background: "linear-gradient(145deg, var(--brand-600), var(--crm-cyan-bright))",
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </span>
  );
}

/** Section title row: accent rail + optional kicker, title, description, actions. */
export function CrmSectionHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 14,
        marginBottom: 18,
        marginTop: 6,
      }}
    >
      <div style={{ display: "flex", gap: 12, minWidth: 0, flex: "1 1 220px" }}>
        <div
          aria-hidden
          style={{
            width: 4,
            minWidth: 4,
            borderRadius: 4,
            background: "var(--crm-ribbon)",
            minHeight: 44,
            alignSelf: "stretch",
            boxShadow: "0 0 12px color-mix(in srgb, var(--crm-cyan-bright) 25%, transparent)",
          }}
        />
        <div style={{ minWidth: 0 }}>
          {kicker ? (
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "color-mix(in srgb, var(--brand-700) 55%, var(--muted))",
                marginBottom: 4,
              }}
            >
              {kicker}
            </div>
          ) : null}
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.2, color: "var(--foreground)" }}>{title}</h2>
          {description ? (
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.5, maxWidth: 720 }}>{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>{actions}</div>
      ) : null}
    </div>
  );
}

/** Fixed bottom action area — thumb-friendly; pair with page `paddingBottom` for content clearance. */
export function CrmStickyActionBar({
  children,
  "aria-label": ariaLabel = "Quick actions",
}: {
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <div className="crm-sticky-action-bar" role="navigation" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

/** Elevated surface for roster cards (contacts, accounts). */
export function CrmContactCard({
  children,
  highlight,
  style,
}: {
  children: ReactNode;
  highlight?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${highlight ? "color-mix(in srgb, var(--brand-600) 35%, var(--border))" : "var(--crm-card-edge)"}`,
        background: "var(--crm-surface-elevated)",
        boxShadow: highlight ? "0 8px 32px color-mix(in srgb, var(--brand-600) 16%, transparent), var(--crm-card-shadow)" : "var(--crm-card-shadow)",
        padding: 16,
        display: "grid",
        gap: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Base styles merged by `CrmCaseCard` and the surgical cases list. */
export const crmCaseCardBaseStyle: CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--crm-card-edge)",
  background: "var(--crm-surface-elevated)",
  boxShadow: "var(--crm-card-shadow)",
  padding: 18,
  cursor: "pointer",
  transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease, filter 0.2s ease",
  position: "relative",
  outline: "none",
};

/** Interactive case card shell — use inside cases hub / org detail; merge product accent + shadow as needed. */
export function CrmCaseCard({
  children,
  style,
  ...rest
}: { children: ReactNode; style?: CSSProperties } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div style={{ ...crmCaseCardBaseStyle, ...style }} {...rest}>
      {children}
    </div>
  );
}

/** Section wrapper for grouped case lists (today / this week). */
export const crmSectionShellStyle: CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--crm-card-edge)",
  background: "linear-gradient(180deg, color-mix(in srgb, var(--crm-navy) 4%, var(--surface)) 0%, var(--surface) 24%)",
  padding: "22px 22px 24px",
  boxShadow: "var(--crm-card-shadow)",
};

/** Organization directory card (list view). */
export const crmOrganizationCardStyle: CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--crm-card-edge)",
  background: "var(--crm-surface-elevated)",
  boxShadow: "var(--crm-card-shadow)",
  padding: "16px 18px",
  display: "grid",
  gap: 12,
  minHeight: 0,
  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
};

/** Compact row surface for feeds, timelines, and task lists on the dashboard. */
export const crmListRowCardStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--crm-card-edge)",
  background: "var(--crm-surface-elevated)",
  padding: "14px 16px",
  boxShadow: "var(--crm-card-shadow)",
  listStyle: "none",
};

export function crmAccountStatusTone(status: string | null | undefined): CrmBadgeTone {
  const s = String(status || "").toLowerCase();
  if (s === "active" || s === "customer") return "success";
  if (s === "prospect" || s === "lead") return "info";
  if (s === "inactive" || s === "churned") return "muted";
  if (s === "on_hold") return "warning";
  return "neutral";
}

export { sc };
export { PortalEmptyState } from "@/components/sales/PortalEmptyState";
