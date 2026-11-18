"use client";

import Link from "next/link";
import React from "react";

const baseBorder: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
};

export type PortalOrderHeroStat = { label: string; value: string | number };

export default function PortalOrderHero(props: {
  title: string;
  accountName: string;
  backHref: string;
  backLabel: string;
  /** e.g. discount/terms line(s) — plain text rows */
  metaLines?: React.ReactNode[];
  /** Shown on the same row as the title (e.g. chart), top-right on wide layouts */
  titleRight?: React.ReactNode;
  stats: PortalOrderHeroStat[];
  /** Tighter padding and typography (e.g. Virtual warehouse hero with chart). */
  density?: "default" | "compact";
}) {
  const compact = props.density === "compact";
  return (
    <div
      style={{
        borderRadius: 22,
        overflow: "hidden",
        border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
        background:
          "radial-gradient(900px 240px at 20% 10%, color-mix(in srgb, var(--brand-600) 42%, transparent), transparent 60%)," +
          "linear-gradient(180deg, #061225, #050b16)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div style={{ padding: compact ? 12 : 18, display: "grid", gap: compact ? 6 : 10 }}>
        <div
          style={{
            fontSize: compact ? 11 : 12,
            color: "rgba(255,255,255,0.70)",
            fontWeight: 950,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            lineHeight: 1.2,
          }}
        >
          360 Portal
        </div>
        <div
          style={{
            display: "flex",
            alignItems: compact ? "center" : "flex-start",
            justifyContent: "space-between",
            gap: compact ? 12 : 16,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontSize: compact ? 22 : 28,
              fontWeight: 950,
              letterSpacing: -0.3,
              margin: 0,
              lineHeight: compact ? 1.15 : 1.2,
              color: "white",
              flex: "1 1 200px",
              minWidth: 0,
            }}
          >
            {props.title}
          </h1>
          {props.titleRight ? (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              {props.titleRight}
            </div>
          ) : null}
        </div>
        <div style={{ color: "rgba(255,255,255,0.78)", fontSize: compact ? 13 : 14, lineHeight: 1.35 }}>
          Account: <b style={{ color: "white" }}>{props.accountName}</b>
        </div>
        {props.metaLines?.map((line, i) => (
          <div key={i} style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 800 }}>
            {line}
          </div>
        ))}
        <div style={{ marginTop: compact ? -2 : 0 }}>
          <Link
            href={props.backHref}
            style={{
              ...baseBorder,
              padding: compact ? "6px 10px" : "8px 12px",
              borderRadius: 12,
              fontSize: compact ? 13 : 14,
              color: "white",
              textDecoration: "none",
              fontWeight: 900,
              background: "rgba(255,255,255,0.10)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {props.backLabel}
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          borderTop: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {props.stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: compact ? "10px 14px" : "14px 18px",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              borderRight: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              style={{
                fontSize: compact ? 11 : 12,
                fontWeight: 900,
                color: "rgba(255,255,255,0.72)",
                textTransform: "uppercase",
              }}
            >
              {stat.label}
            </div>
            <div style={{ fontSize: compact ? 16 : 18, fontWeight: 950, color: "white" }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
