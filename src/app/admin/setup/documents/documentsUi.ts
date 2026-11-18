import type React from "react";

export const DOC_UI = {
  brand: "var(--brand-600)",
  brand700: "var(--brand-700)",
  ink: "#0f172a",
  muted: "#64748b",
  line: "rgba(15,23,42,0.10)",
  lineSoft: "rgba(15,23,42,0.06)",
  panelBg: "#ffffff",
  subtleBg: "rgba(248,250,252,0.92)",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: `1px solid ${DOC_UI.line}`,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 600,
  background: "white",
  color: DOC_UI.ink,
};

export function ghostBtn(extra?: React.CSSProperties): React.CSSProperties {
  return {
    border: `1px solid ${DOC_UI.line}`,
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 850,
    fontSize: 12.5,
    cursor: "pointer",
    background: "white",
    color: DOC_UI.ink,
    ...extra,
  };
}

export function primaryBtn(disabled?: boolean): React.CSSProperties {
  return {
    border: "none",
    borderRadius: 10,
    padding: "9px 14px",
    fontWeight: 900,
    fontSize: 12.5,
    cursor: disabled ? "wait" : "pointer",
    background: DOC_UI.brand,
    color: "white",
    opacity: disabled ? 0.65 : 1,
  };
}

export function iconBtn(active?: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? "rgba(30,136,229,0.28)" : DOC_UI.line}`,
    borderRadius: 9,
    padding: "7px 10px",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    background: active ? "rgba(30,136,229,0.1)" : "white",
    color: active ? DOC_UI.brand700 : DOC_UI.ink,
  };
}

export type ViewMode = "list" | "grid";

export type AccessFilter = "all" | "all_reps" | "territory_managers" | "admin_only";
