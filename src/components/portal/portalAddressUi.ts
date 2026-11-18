/** Shared helpers for portal billing/shipping address forms (Create order, Virtual warehouse fulfill). */

import type { CSSProperties } from "react";

export type AddressDraft = {
  label: string;
  company: string;
  attn: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string;
  email: string;
  notes: string;
  saveToBook: boolean;
  makeDefault: boolean;
};

export function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function emptyAddressDraft(label: string): AddressDraft {
  return {
    label,
    company: "",
    attn: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal: "",
    country: "US",
    phone: "",
    email: "",
    notes: "",
    saveToBook: false,
    makeDefault: false,
  };
}

export function addressLooksNonEmpty(d: AddressDraft): boolean {
  const fields = [d.company, d.attn, d.line1, d.line2, d.city, d.state, d.postal, d.country, d.phone, d.email, d.notes];
  return fields.some((x) => safeStr(x).length > 0);
}

export function draftAddressMinComplete(d: AddressDraft): boolean {
  return safeStr(d.line1).length > 0 && safeStr(d.city).length > 0 && safeStr(d.postal).length > 0;
}

export function draftAddressOneLine(d: AddressDraft | null): string {
  if (!d) return "—";
  const parts: string[] = [];
  if (safeStr(d.company)) parts.push(safeStr(d.company));
  if (safeStr(d.line1)) parts.push(safeStr(d.line1));
  const csz = [safeStr(d.city), safeStr(d.state), safeStr(d.postal)].filter(Boolean).join(" ");
  if (csz) parts.push(csz);
  if (safeStr(d.country)) parts.push(safeStr(d.country));
  return parts.filter(Boolean).join(" · ") || "—";
}

export function prettyAddressOneLine(v: unknown): string {
  if (!v || typeof v !== "object") return "—";
  const o = v as Record<string, unknown>;
  const parts: string[] = [];
  if (safeStr(o.company)) parts.push(safeStr(o.company));
  if (safeStr(o.line1)) parts.push(safeStr(o.line1));
  const csz = [safeStr(o.city), safeStr(o.state), safeStr(o.postal)].filter(Boolean).join(" ");
  if (csz) parts.push(csz);
  if (safeStr(o.country)) parts.push(safeStr(o.country));
  return parts.filter(Boolean).join(" · ") || "—";
}

export function inputStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.14)",
    fontWeight: 900,
    fontSize: 13,
    background: "white",
    boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
  };
}

export function labelStyle(): CSSProperties {
  return { fontWeight: 950, fontSize: 12, opacity: 0.8, letterSpacing: 0.3 };
}
