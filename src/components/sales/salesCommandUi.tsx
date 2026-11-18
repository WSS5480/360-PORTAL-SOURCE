"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";

const borderBrandSoft = "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))";
const borderBrand = "1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border))";
const crmEdge = "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 10%, var(--border)))";

/** Shared layout + surface styles for Sales Command (portal /sales/*). */
export const sc = {
  pageWrap: {
    display: "grid",
    gap: 28,
    maxWidth: 1180,
    margin: "0 auto",
    width: "100%",
    minWidth: 0,
    padding: "4px clamp(12px, 3vw, 20px) 48px",
    boxSizing: "border-box",
  } satisfies CSSProperties,

  heroAccent: {
    height: 4,
    borderRadius: 999,
    width: "min(200px, 55%)",
    background: "var(--crm-ribbon, linear-gradient(90deg, var(--brand-600), #2dd4bf, var(--brand-600)))",
    opacity: 0.95,
    boxShadow: "0 0 20px color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 20%, transparent)",
  } satisfies CSSProperties,

  kicker: {
    fontSize: 11,
    letterSpacing: "0.14em",
    fontWeight: 800,
    color: "color-mix(in srgb, var(--brand-700) 70%, var(--muted))",
    textTransform: "uppercase" as const,
  } satisfies CSSProperties,

  pageTitle: {
    margin: "10px 0 0",
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.035em",
    lineHeight: 1.12,
    color: "var(--foreground)",
  } satisfies CSSProperties,

  pageSubtitle: {
    margin: "10px 0 0",
    color: "var(--muted)",
    fontSize: 15,
    maxWidth: 640,
    lineHeight: 1.55,
  } satisfies CSSProperties,

  toolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
    alignItems: "center",
    justifyContent: "flex-end",
  } satisfies CSSProperties,

  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 16px",
    minHeight: 44,
    borderRadius: 14,
    border: borderBrand,
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
    color: "var(--brand-700)",
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 9%, var(--surface)) 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 4%, var(--surface)) 100%)",
    boxShadow:
      "0 10px 24px color-mix(in srgb, var(--brand-600) 10%, transparent), inset 0 1px 0 color-mix(in srgb, white 55%, transparent)",
    transition:
      "background 0.15s ease, border-color 0.15s ease, transform 0.12s ease, opacity 0.12s ease, filter 0.15s ease, box-shadow 0.15s ease",
    touchAction: "manipulation",
  } satisfies CSSProperties,

  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 18px",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 35%, var(--brand-600))",
    background: "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 92%, white) 0%, var(--brand-600) 55%, color-mix(in srgb, var(--brand-700) 88%, var(--brand-600)) 100%)",
    color: "white",
    fontWeight: 750,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
    boxShadow:
      "0 12px 28px color-mix(in srgb, var(--brand-600) 36%, transparent), 0 1px 0 color-mix(in srgb, white 30%, transparent) inset",
    transition: "filter 0.15s ease, transform 0.12s ease, opacity 0.12s ease, box-shadow 0.15s ease",
    touchAction: "manipulation",
  } satisfies CSSProperties,

  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 16px",
    minHeight: 44,
    borderRadius: 14,
    border: crmEdge,
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--surface-2) 88%, white) 0%, color-mix(in srgb, var(--brand-600) 5%, var(--surface)) 100%)",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    color: "var(--foreground)",
    boxShadow: "0 8px 20px color-mix(in srgb, var(--foreground) 5%, transparent)",
    transition: "background 0.15s ease, border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease",
    touchAction: "manipulation",
  } satisfies CSSProperties,

  btnDangerOutline: {
    padding: "6px 12px",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--danger) 40%, var(--border))",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    color: "var(--danger)",
    background: "color-mix(in srgb, var(--danger) 6%, var(--surface))",
  } satisfies CSSProperties,

  btnSm: {
    padding: "6px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    background: "var(--surface)",
  } satisfies CSSProperties,

  linkBrand: {
    fontWeight: 750,
    color: "var(--brand-700)",
    textDecoration: "none",
    fontSize: 13,
  } satisfies CSSProperties,

  /**
   * `linkBrand` for links that stand on their own as an action or a record name,
   * rather than sitting inside a sentence. A bare text link is only ~17px tall,
   * which is too small to hit reliably with a thumb.
   */
  linkBrandAction: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 44,
    fontWeight: 750,
    color: "var(--brand-700)",
    textDecoration: "none",
    fontSize: 13,
  } satisfies CSSProperties,

  alertError: {
    padding: "14px 16px",
    borderRadius: 12,
    background: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
    border: "1px solid color-mix(in srgb, var(--danger) 28%, var(--border))",
    color: "var(--danger)",
    fontSize: 14,
    fontWeight: 600,
  } satisfies CSSProperties,

  filterBar: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    alignItems: "center",
    padding: "16px 18px",
    borderRadius: 20,
    border: crmEdge,
    background: "linear-gradient(135deg, color-mix(in srgb, var(--crm-navy, #0c1929) 5%, var(--surface)) 0%, color-mix(in srgb, var(--brand-600) 6%, var(--surface)) 100%)",
    boxShadow: "var(--crm-card-shadow, 0 4px 22px color-mix(in srgb, var(--foreground) 6%, transparent)), inset 0 1px 0 color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 8%, transparent)",
  } satisfies CSSProperties,

  tableShell: {
    borderRadius: 16,
    border: crmEdge,
    background:
      "linear-gradient(180deg, var(--crm-surface-elevated, var(--surface)) 0%, color-mix(in srgb, var(--brand-600) 2.5%, var(--surface)) 100%)",
    overflow: "auto",
    boxShadow:
      "var(--crm-card-shadow, 0 16px 44px color-mix(in srgb, var(--crm-navy, var(--foreground)) 8%, transparent)), inset 0 1px 0 color-mix(in srgb, white 70%, transparent)",
  } satisfies CSSProperties,

  panel: {
    borderRadius: 20,
    border: crmEdge,
    background:
      "linear-gradient(160deg, color-mix(in srgb, var(--surface) 96%, white) 0%, color-mix(in srgb, var(--brand-600) 3%, var(--surface)) 56%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 4%, var(--surface)) 100%)",
    padding: "22px 22px 20px",
    boxShadow:
      "var(--crm-card-shadow, 0 16px 42px color-mix(in srgb, var(--crm-navy, var(--foreground)) 7%, transparent)), inset 0 1px 0 color-mix(in srgb, white 72%, transparent)",
  } satisfies CSSProperties,

  panelFunnel: {
    borderRadius: 22,
    border: "1px solid color-mix(in srgb, var(--brand-600) 32%, var(--border))",
    background:
      "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 9%, var(--surface)) 0%, var(--surface) 40%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 5%, var(--surface)) 100%)",
    padding: "22px 22px 20px",
    boxShadow:
      "0 18px 46px color-mix(in srgb, var(--brand-600) 16%, transparent), inset 0 1px 0 color-mix(in srgb, white 68%, transparent), var(--crm-card-shadow, 0 2px 16px transparent)",
  } satisfies CSSProperties,

  panelTitle: {
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: "-0.02em",
    color: "var(--foreground)",
  } satisfies CSSProperties,

  panelDesc: {
    margin: 0,
    fontSize: 13,
    color: "var(--muted)",
    lineHeight: 1.45,
  } satisfies CSSProperties,

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "color-mix(in srgb, #0f172a 55%, transparent)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 80,
  } satisfies CSSProperties,

  modalPanel: {
    width: "min(520px, 100%)",
    borderRadius: 22,
    background: "var(--crm-surface-elevated, var(--surface))",
    border: crmEdge,
    boxShadow:
      "0 34px 74px color-mix(in srgb, var(--crm-navy, #0c1929) 24%, transparent), 0 0 0 1px color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 16%, transparent), inset 0 1px 0 color-mix(in srgb, white 70%, transparent)",
    padding: 24,
    maxHeight: "90vh",
    overflow: "auto",
  } satisfies CSSProperties,

  /** Wider modal for multi-section forms (e.g. opportunities). */
  modalPanelLg: {
    width: "min(720px, 100%)",
    borderRadius: 16,
    background: "var(--surface)",
    border: borderBrandSoft,
    boxShadow: "0 24px 48px color-mix(in srgb, var(--foreground) 14%, transparent)",
    padding: "28px 28px 24px",
    maxHeight: "92vh",
    overflow: "auto",
  } satisfies CSSProperties,

  formSectionTitle: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "color-mix(in srgb, var(--brand-700) 85%, var(--muted))",
    marginBottom: 12,
    marginTop: 4,
  } satisfies CSSProperties,

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
    fontSize: 16,
    background: "var(--surface)",
    color: "var(--foreground)",
  } satisfies CSSProperties,

  sectionLabel: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--muted)",
    marginBottom: 10,
  } satisfies CSSProperties,
} as const;

/** Cancel / primary rows: stack full-width on phones (case detail modals, new-case contact modal, etc.). */
export const surgicalCaseModalActionsCss = `
.case-modal-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
@media (max-width: 480px) {
  .case-modal-actions { flex-direction: column-reverse; }
  .case-modal-actions > button { width: 100%; justify-content: center; }
  .surgical-new-case-submit { width: 100%; }
}
`;

/** Mobile observation-status modal — centered in viewport, scrollable body, sticky actions. */
export const observationStatusModalCss = `
@media (max-width: 768px) {
  .observation-status-modal-backdrop {
    align-items: center !important;
    justify-content: center !important;
    padding: 8px !important;
    min-height: 100dvh !important;
  }

  .observation-status-modal-panel {
    width: 100% !important;
    max-width: none !important;
    max-height: calc(100dvh - 16px) !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 14px !important;
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto !important;
    overflow: hidden !important;
  }

  .observation-status-modal-header {
    padding: 12px 14px 10px !important;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  }

  .observation-status-modal-header h2 {
    margin: 0 !important;
    font-size: 16px !important;
  }

  .observation-status-modal-current {
    margin: 6px 0 0 !important;
    font-size: 12px !important;
    color: var(--muted);
    line-height: 1.35;
  }

  .observation-status-modal-body {
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 12px 14px 4px;
  }

  .observation-status-modal-body [data-obs-status-field] {
    margin-bottom: 10px !important;
  }

  .observation-status-modal-error {
    margin: 0 14px 8px !important;
  }

  .observation-status-modal-actions.case-modal-actions {
    position: sticky;
    bottom: 0;
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    gap: 8px !important;
    margin-top: 0 !important;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px)) !important;
    border-top: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    backdrop-filter: blur(10px);
  }

  .observation-status-modal-actions.case-modal-actions > button {
    width: 100% !important;
    flex: none !important;
    min-height: 44px;
    justify-content: center;
  }
}
`;

export function SalesCommandPage({
  title,
  subtitle,
  actions,
  children,
  kicker = "Sales Command",
  /** Less padding and smaller chrome. `dense` is for command-center dashboards (maximum above-the-fold data). */
  density = "default",
  /** White/light title for headers over the portal’s dark top gradient. */
  titleTone = "default",
  /** When true, only the page shell and children render (custom in-page hero/header). */
  omitBuiltInHeader = false,
  /** Edge-to-edge native mobile shell (cases-style); use with custom in-page header. */
  nativeLayout = false,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Eyebrow above the page title. Pass "" to hide (e.g. when the title alone is enough). */
  kicker?: string;
  density?: "default" | "tight" | "dense";
  titleTone?: "default" | "onDark";
  omitBuiltInHeader?: boolean;
  nativeLayout?: boolean;
}) {
  const dense = density === "dense";
  const tight = density === "tight" || dense;
  const onDark = titleTone === "onDark";
  const pageWrap: CSSProperties = nativeLayout
    ? { ...sc.pageWrap, padding: 0, gap: 0, maxWidth: "100%" }
    : dense
      ? { ...sc.pageWrap, padding: "0 clamp(10px, 2.5vw, 16px) 20px", gap: 6, maxWidth: 1320 }
      : tight
        ? { ...sc.pageWrap, padding: "0 clamp(12px, 3vw, 20px) 36px", gap: 14 }
        : sc.pageWrap;
  const heroAccent: CSSProperties = tight
    ? {
        ...sc.heroAccent,
        height: 2,
        width: dense ? "min(96px, 30%)" : "min(120px, 35%)",
        marginBottom: dense ? 4 : 6,
        ...(onDark
          ? {
              background:
                "linear-gradient(90deg, #7dd3fc, color-mix(in srgb, #5eead4 85%, white), #7dd3fc)",
              opacity: 1,
            }
          : {}),
      }
    : onDark
      ? {
          ...sc.heroAccent,
          background:
            "linear-gradient(90deg, #7dd3fc, color-mix(in srgb, #5eead4 85%, white), #7dd3fc)",
          opacity: 1,
        }
      : sc.heroAccent;
  const kickerStyle: CSSProperties = dense
    ? { ...sc.kicker, marginBottom: 1, fontSize: 11 }
    : tight
      ? { ...sc.kicker, marginBottom: 2 }
      : sc.kicker;
  const kickerResolved: CSSProperties = onDark
    ? { ...kickerStyle, color: "rgba(255,255,255,0.78)" }
    : kickerStyle;
  const pageTitle: CSSProperties = dense
    ? { ...sc.pageTitle, margin: "0", fontSize: 22, lineHeight: 1.14, letterSpacing: "-0.032em", wordBreak: "break-word" as const }
    : tight
      ? { ...sc.pageTitle, margin: "2px 0 0", fontSize: 26, lineHeight: 1.15, wordBreak: "break-word" as const }
      : { ...sc.pageTitle, wordBreak: "break-word" as const };
  const pageTitleResolved: CSSProperties = onDark ? { ...pageTitle, color: "#ffffff" } : pageTitle;
  const pageSubtitle: CSSProperties = dense
    ? { ...sc.pageSubtitle, margin: "4px 0 0", fontSize: 13, lineHeight: 1.38, maxWidth: 560 }
    : tight
      ? { ...sc.pageSubtitle, margin: "6px 0 0", fontSize: 14, lineHeight: 1.45 }
      : sc.pageSubtitle;
  const pageSubtitleResolved: CSSProperties = onDark
    ? { ...pageSubtitle, color: "rgba(255,255,255,0.88)" }
    : pageSubtitle;
  const showKicker = Boolean(kicker && kicker.trim());

  return (
    <div
      style={pageWrap}
      className={`surgical-case-motion crm-sales-page-bg${nativeLayout ? " sales-cmd-native-wrap" : ""}`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.surgical-cmd-header-actions { flex: 1 1 260px; justify-content: flex-end; }
.surgical-cmd-header--on-dark .surgical-cmd-header-actions a:not([class*="btn"]) { color: #7dd3fc !important; }
@media (max-width: 560px) {
  .surgical-cmd-header { flex-direction: column; align-items: stretch !important; }
  .surgical-cmd-header-actions { justify-content: stretch; gap: 10px !important; flex-wrap: nowrap; flex-direction: column; }
  .surgical-cmd-header-actions > a,
  .surgical-cmd-header-actions > button { width: 100%; justify-content: center; min-height: 48px; }
}
`,
        }}
      />
      {omitBuiltInHeader ? null : (
        <>
          <div style={heroAccent} aria-hidden />
          <header
            className={`surgical-cmd-header${onDark ? " surgical-cmd-header--on-dark" : ""}`}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: dense ? 10 : tight ? 12 : 20,
              alignItems: "flex-start",
            }}
          >
            <PortalMobileMenuButton className="sales-cmd-mobile-menu surgical-cmd-header-menu" />
            <div className="surgical-cmd-header-main" style={{ minWidth: 0, flex: "1 1 240px" }}>
              {showKicker ? <div style={kickerResolved}>{kicker}</div> : null}
              <h1 style={pageTitleResolved}>{title}</h1>
              {subtitle ? (
                typeof subtitle === "string" ? (
                  <p style={pageSubtitleResolved}>{subtitle}</p>
                ) : (
                  <div style={pageSubtitleResolved}>{subtitle}</div>
                )
              ) : null}
            </div>
            {actions ? (
              <div className="surgical-cmd-header-actions" style={sc.toolbar}>
                {actions}
              </div>
            ) : null}
          </header>
        </>
      )}
      {children}
    </div>
  );
}

export function SalesCmdLink({
  href,
  variant,
  children,
  style,
}: {
  href: string;
  variant: "primary" | "secondary";
  children: ReactNode;
  style?: CSSProperties;
}) {
  const base = variant === "primary" ? sc.btnPrimary : sc.btnSecondary;
  return (
    <Link href={href} style={{ ...base, ...style }} className={`sales-cmd-link sales-cmd-link--${variant}`}>
      {children}
    </Link>
  );
}

export function SalesSectionLabel({ children }: { children: ReactNode }) {
  return <div style={sc.sectionLabel}>{children}</div>;
}

export function SalesMetricCard({
  label,
  value,
  hint,
  tone = "default",
  size = "default",
  trend,
  trendPct,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "caution";
  /** Compact tiles for dense dashboard grids. */
  size?: "default" | "compact";
  trend?: "up" | "down" | "flat";
  /** Shown next to the trend arrow on compact cards, e.g. `+12%` or `−3%`. */
  trendPct?: string;
  href?: string;
}) {
  const border =
    tone === "caution"
      ? "1px solid color-mix(in srgb, #d97706 28%, var(--border))"
      : "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))";
  const compact = size === "compact";
  const trendGlyph = trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "flat" ? "→" : null;
  const trendColor =
    trend === "up"
      ? "var(--success)"
      : trend === "down"
        ? "color-mix(in srgb, var(--danger) 88%, var(--muted))"
        : "var(--muted)";

  const accentTop =
    tone === "caution"
      ? "color-mix(in srgb, #d97706 70%, var(--warning))"
      : "color-mix(in srgb, var(--brand-600) 85%, var(--crm-cyan-bright, #22d3ee))";

  const classicInner = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "color-mix(in srgb, var(--brand-700) 45%, var(--muted))",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            lineHeight: 1.15,
          }}
        >
          {label}
        </div>
        {trendGlyph ? (
          <span style={{ fontSize: 13, fontWeight: 800, color: trendColor }} aria-hidden>
            {trendGlyph}
          </span>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--foreground)",
        }}
      >
        {value}
      </div>
      {hint ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.45, fontWeight: 550 }}>
          {hint}
        </div>
      ) : null}
    </>
  );

  const showTrendCluster = Boolean(trendGlyph || (trendPct && trendPct.trim()));
  const compactInner = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 750,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            color: "var(--foreground)",
            fontVariantNumeric: "tabular-nums",
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          {value}
        </div>
        {showTrendCluster ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 750,
              fontVariantNumeric: "tabular-nums",
              color: trendGlyph ? trendColor : "var(--muted)",
            }}
            aria-label={trendPct ? `${trendGlyph || ""} ${trendPct}`.trim() : undefined}
          >
            {trendGlyph ? <span aria-hidden>{trendGlyph}</span> : null}
            {trendPct ? <span>{trendPct}</span> : null}
          </span>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 11.5,
          fontWeight: 650,
          letterSpacing: "-0.015em",
          lineHeight: 1.25,
          color: "color-mix(in srgb, var(--foreground) 92%, var(--muted))",
        }}
      >
        {label}
      </div>
      {hint ? (
        <div
          style={{
            marginTop: 2,
            fontSize: 11,
            color: "var(--muted)",
            lineHeight: 1.3,
            fontWeight: 500,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {hint}
        </div>
      ) : null}
    </>
  );

  const inner = compact ? compactInner : classicInner;

  const shellStyle: CSSProperties = compact
    ? {
        borderRadius: 10,
        border,
        borderTop: `2px solid ${accentTop}`,
        background:
          tone === "caution"
            ? "linear-gradient(160deg, color-mix(in srgb, #f59e0b 9%, var(--surface)) 0%, var(--surface) 100%)"
            : "linear-gradient(160deg, color-mix(in srgb, var(--brand-600) 4%, var(--surface)) 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 3%, var(--surface)) 100%)",
        padding: "6px 10px 7px",
        boxShadow:
          "0 5px 14px color-mix(in srgb, var(--foreground) 5%, transparent), inset 0 1px 0 color-mix(in srgb, white 65%, transparent)",
        transition: "box-shadow 0.18s ease, transform 0.16s ease, border-color 0.18s ease",
        minWidth: 0,
      }
    : {
        borderRadius: 16,
        border:
          tone === "caution"
            ? "1px solid color-mix(in srgb, #d97706 32%, var(--border))"
            : "1px solid var(--crm-card-edge, color-mix(in srgb, var(--brand-600) 12%, var(--border)))",
        borderLeftWidth: 4,
        borderLeftStyle: "solid",
        borderLeftColor: tone === "caution" ? "color-mix(in srgb, #d97706 75%, var(--warning))" : "var(--brand-600)",
        background:
          tone === "caution"
            ? "linear-gradient(155deg, color-mix(in srgb, #f59e0b 10%, var(--surface)) 0%, var(--surface) 52%, color-mix(in srgb, #f59e0b 4%, var(--surface)) 100%)"
            : "linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 7%, var(--surface)) 0%, var(--crm-surface-elevated, var(--surface)) 48%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 5%, var(--surface)) 100%)",
        padding: "16px 18px 17px",
        boxShadow:
          "var(--crm-card-shadow, 0 14px 32px color-mix(in srgb, var(--crm-navy, var(--foreground)) 7%, transparent)), inset 0 1px 0 color-mix(in srgb, white 70%, transparent)",
        transition: "box-shadow 0.18s ease, transform 0.16s ease, border-color 0.18s ease",
        minWidth: 0,
      };

  if (href) {
    return (
      <Link
        href={href}
        style={{ ...shellStyle, textDecoration: "none", color: "inherit", display: "block" }}
        className="sales-metric-card-link"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div style={shellStyle} className={href ? undefined : "sales-metric-card-tile"}>
      {inner}
    </div>
  );
}

export function SalesPanel({
  title,
  description,
  variant = "default",
  density = "default",
  headerExtra,
  children,
  nativeFlat = false,
}: {
  title: string;
  description?: string;
  variant?: "default" | "funnel";
  /** Tighter padding, lighter chrome, no title accent orb—better for data-heavy pages. */
  density?: "default" | "compact";
  /** Shown on the right of the title row (e.g. “View all →”). */
  headerExtra?: ReactNode;
  children: ReactNode;
  /** Flat native section chrome inside `.sc-native-page`. */
  nativeFlat?: boolean;
}) {
  const compact = density === "compact" || nativeFlat;
  const base = variant === "funnel" ? sc.panelFunnel : sc.panel;
  const shell: CSSProperties = {
    ...base,
    ...(compact
      ? {
          padding: "10px 12px 10px",
          boxShadow:
            "0 6px 18px color-mix(in srgb, var(--foreground) 4%, transparent), inset 0 1px 0 color-mix(in srgb, white 70%, transparent)",
          border: "1px solid color-mix(in srgb, var(--foreground) 5.5%, var(--border))",
        }
      : {}),
  };
  const headerBorder = compact
    ? description
      ? "1px solid color-mix(in srgb, var(--foreground) 5%, var(--border))"
      : "none"
    : "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))";
  const headerPadBottom = compact ? (description ? 6 : 0) : 2;
  return (
    <section
      className={nativeFlat ? "sales-cmd-panel-native" : undefined}
      style={{ ...shell, display: "grid", gap: compact ? 8 : 14 }}
    >
      <div
        style={{
          display: "grid",
          gap: description ? (compact ? 3 : 6) : 0,
          paddingBottom: headerPadBottom,
          borderBottom: headerBorder,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: compact ? 6 : 10,
            flexWrap: "wrap",
            width: "100%",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 10, flexWrap: "wrap", minWidth: 0 }}>
            {!compact ? (
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: "linear-gradient(145deg, var(--brand-600), var(--crm-cyan-bright, #22d3ee))",
                  boxShadow: "0 0 12px color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 35%, transparent)",
                  flexShrink: 0,
                }}
              />
            ) : null}
            <div style={{ ...sc.panelTitle, ...(compact ? { fontSize: 13, letterSpacing: "-0.018em" } : {}) }}>{title}</div>
          </div>
          {headerExtra ? <div style={{ flexShrink: 0 }}>{headerExtra}</div> : null}
        </div>
        {description ? (
          <p
            style={{
              ...sc.panelDesc,
              marginTop: compact ? 0 : 2,
              ...(compact ? { fontSize: 11.5, lineHeight: 1.38 } : {}),
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
