"use client";

import React from "react";
import {
  isSurgicalProductNameRedundantWithFamily,
  resolveSurgicalProductFamilyKey,
  SURGICAL_PRODUCT_FAMILY_VISUAL,
  type SurgicalProductFamilyKey,
} from "@/lib/surgical-sales/productFamilyVisual";

function FamilyGlyph({ family, color }: { family: SurgicalProductFamilyKey; color: string }) {
  const stroke = color;
  const common = { width: 14, height: 14, viewBox: "0 0 24 24" as const, fill: "none" as const, "aria-hidden": true as const };
  switch (family) {
    case "acsis":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="1.75" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="1.75" opacity={0.85} />
          <rect x="4" y="13" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="1.75" opacity={0.85} />
          <rect x="13" y="13" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="1.75" opacity={0.65} />
        </svg>
      );
    case "endolumik":
      return (
        <svg {...common}>
          <path
            d="M5 12c3-5 11-5 14 0-3 5-11 5-14 0Z"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M8 12h8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity={0.85} />
        </svg>
      );
    case "skeletal_dynamics":
      return (
        <svg {...common}>
          <path
            d="M12 4v4M12 16v4M8 8l2.5 2.5M13.5 13.5L16 16M16 8l-2.5 2.5M10.5 13.5L8 16"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.25" stroke={stroke} strokeWidth="1.75" />
        </svg>
      );
    case "biotissue":
      return (
        <svg {...common}>
          <path
            d="M12 5c-4 3-6 6-5 9 1 2.5 4 4 5 4s4-1.5 5-4c1-3-1-6-5-9Z"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M9 11c1.5 1 3.5 1 5 0" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity={0.8} />
        </svg>
      );
    case "merakris":
      return (
        <svg {...common}>
          <rect x="5" y="6" width="14" height="12" rx="2" stroke={stroke} strokeWidth="1.75" />
          <path d="M8 10h8M8 13h6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity={0.85} />
        </svg>
      );
    case "telabio":
      return (
        <svg {...common}>
          <path
            d="M12 4l7 4v8l-7 4-7-4V8l7-4Z"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M12 8v8M8.5 10l7 4M8.5 14l7-4" stroke={stroke} strokeWidth="1.35" strokeLinecap="round" opacity={0.75} />
        </svg>
      );
  }
}

export function SurgicalProductFamilyBadge({ productName }: { productName: string | null | undefined }) {
  const key = resolveSurgicalProductFamilyKey(productName);
  if (!key) return null;
  const v = SURGICAL_PRODUCT_FAMILY_VISUAL[key];
  return (
    <span
      title={v.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px 3px 6px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: "0.04em",
        textTransform: "uppercase" as const,
        background: v.badgeBackground,
        color: v.badgeColor,
        border: `1px solid ${v.badgeBorder}`,
        flexShrink: 0,
      }}
    >
      <FamilyGlyph family={key} color={v.badgeColor} />
      {v.badgeShort}
    </span>
  );
}

/** Badge + product name; hides duplicate text when name is exactly the family label. */
export function SurgicalProductFamilyProductLine({
  productName,
  nameStyle,
}: {
  productName: string | null | undefined;
  nameStyle?: React.CSSProperties;
}) {
  const key = resolveSurgicalProductFamilyKey(productName);
  const redundant = isSurgicalProductNameRedundantWithFamily(productName);
  const baseNameStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 650,
    minWidth: 0,
    lineHeight: 1.35,
    ...nameStyle,
  };
  if (!productName?.trim()) {
    return <span style={{ ...baseNameStyle, color: "var(--muted)" }}>—</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, minWidth: 0 }}>
      {key ? <SurgicalProductFamilyBadge productName={productName} /> : null}
      {redundant ? null : <span style={baseNameStyle}>{productName}</span>}
    </div>
  );
}
