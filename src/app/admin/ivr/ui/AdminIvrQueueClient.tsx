// src/app/admin/ivr/ui/AdminIvrQueueClient.tsx
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatStatusLabel } from "@/lib/formatStatusLabel";

type QueueRow = {
  id: string;
  created_at: string | null;
  status: string | null;

  account_id: string | null;
  account_name: string | null;

  submitted_by_user_id?: string | null;
  submitted_by_user_email?: string | null;
  submitted_by_user_name?: string | null;

  patient_first_name: string | null;
  patient_last_name: string | null;

  primary_insurance: string | null;
  product: string | null;
  place_of_service: string | null;

  ivr_identifier?: string | null;

  upload_count: number;
  has_results_pdf: boolean;
  latest_verification_id: string | null;
  latest_verification_created_at: string | null;

  needs_additional_info: boolean;
  customer_responded: boolean;
  response_unread: boolean;

  latest_info_requested_at: string | null;
  latest_info_provided_at: string | null;
  latest_info_viewed_at: string | null;
};

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "NEW", label: "New" },
  { key: "IN_REVIEW", label: "In Review" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "COMPLETED", label: "Approved" },
  { key: "DENIED", label: "Denied" },
] as const;

type StatusKey = (typeof STATUS_TABS)[number]["key"];

const SORTS = [
  { key: "priority", label: "Priority" },
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

function safeStatus(s?: string | null): StatusKey | string {
  return (s || "NEW").toUpperCase();
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function fmtDateOnly(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString();
}

function fmtTimeOnly(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtShortDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function fmtMoney(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return Number(v).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function btn(disabled?: boolean, kind: "primary" | "ghost" | "danger" = "ghost"): CSSProperties {
  const base: CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 14%, var(--border))",
    background: "var(--surface)",
    color: "var(--foreground)",
    userSelect: "none",
  };

  if (kind === "primary") return { ...base, background: "var(--foreground)", color: "white" };
  if (kind === "danger")
    return {
      ...base,
      borderColor: "rgba(220,0,0,0.22)",
      background: "rgba(220,0,0,0.06)",
      color: "crimson",
    };
  return base;
}

function chip(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? "color-mix(in srgb, var(--brand-600) 24%, var(--border))" : "var(--border)",
    background: active ? "var(--brand-050)" : "color-mix(in srgb, var(--surface) 86%, transparent)",
    color: active ? "var(--brand-800)" : "var(--foreground)",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    transition: "transform 120ms ease, background 120ms ease, border-color 120ms ease",
  };
}

function kpiPill(tone: "neutral" | "warn" | "danger" | "success"): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    fontSize: 12,
    fontWeight: 950,
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    whiteSpace: "nowrap",
    boxShadow: "var(--shadow-1)",
  };

  if (tone === "danger")
    return { ...base, background: "rgba(220,0,0,0.06)", borderColor: "rgba(220,0,0,0.18)", color: "crimson" };
  if (tone === "warn")
    return { ...base, background: "rgba(255,165,0,0.16)", borderColor: "rgba(255,165,0,0.22)", color: "#7a4b00" };
  if (tone === "success")
    return {
      ...base,
      background: "rgba(0,140,60,0.08)",
      borderColor: "rgba(0,140,60,0.18)",
      color: "rgb(0,120,55)",
    };
  return base;
}

function statusPill(status: string): CSSProperties {
  const s = safeStatus(status);

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  };

  if (s === "NEW")
    return { ...base, background: "rgba(255,165,0,0.16)", borderColor: "rgba(255,165,0,0.25)", color: "#7a4b00" };
  if (s === "IN_REVIEW")
    return { ...base, background: "rgba(90,140,255,0.10)", borderColor: "rgba(90,140,255,0.22)", color: "#204aa8" };
  if (s === "SUBMITTED") return base;
  if (s === "COMPLETED")
    return { ...base, background: "rgba(0,140,60,0.08)", borderColor: "rgba(0,140,60,0.18)", color: "rgb(0,120,55)" };
  if (s === "DENIED")
    return { ...base, background: "rgba(220,0,0,0.06)", borderColor: "rgba(220,0,0,0.18)", color: "crimson" };
  return base;
}

function infoBadge(r: QueueRow): { label: string; tone: "neutral" | "warn" | "danger" | "success" } {
  if (r.response_unread) return { label: "Unread customer response", tone: "warn" };
  if (r.needs_additional_info) return { label: "Needs customer info", tone: "danger" };
  if (r.customer_responded) return { label: "Response received", tone: "success" };
  return { label: "No active request", tone: "neutral" };
}

function timeVal(s?: string | null) {
  const d = s ? new Date(s) : null;
  const t = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  return t;
}

function onChipKeyDown(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onActivate();
  }
}

export default function AdminIvrQueueClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const statusParam = (sp.get("status") || "NEW").toUpperCase();
  const statusValue: StatusKey = (STATUS_TABS as readonly { key: StatusKey; label: string }[]).some(
    (t) => t.key === (statusParam as StatusKey)
  )
    ? (statusParam as StatusKey)
    : "NEW";

  const sortParamRaw = (sp.get("sort") || "").toLowerCase().trim();
  const sortValue: SortKey =
    (SORTS as readonly { key: SortKey; label: string }[]).some((s) => s.key === (sortParamRaw as SortKey))
      ? (sortParamRaw as SortKey)
      : statusValue === "ALL"
      ? "priority"
      : "newest";

  const limit = Math.min(Math.max(Number(sp.get("limit") || "50"), 10), 200);
  const offset = Math.max(Number(sp.get("offset") || "0"), 0);

  const q = sp.get("q") || "";
  const hasUploads = sp.get("has_uploads") === "1";
  const hasPdf = sp.get("has_pdf") === "1";

  const [rows, setRows] = useState<QueueRow[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsErr, setCountsErr] = useState<string | null>(null);

  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [countsUpdatedAt, setCountsUpdatedAt] = useState<string | null>(null);

  function pushParams(next: URLSearchParams) {
    router.push(`/admin/ivr?${next.toString()}`);
  }

  function setParamBool(next: URLSearchParams, key: string, on: boolean) {
    if (on) next.set(key, "1");
    else next.delete(key);
  }

  function clearAllFilters() {
    const next = new URLSearchParams(sp.toString());
    next.delete("q");
    next.delete("has_uploads");
    next.delete("has_pdf");
    next.set("status", "NEW");
    next.set("sort", "newest");
    next.set("offset", "0");
    pushParams(next);
  }

  function clearSearchOnly() {
    const next = new URLSearchParams(sp.toString());
    next.delete("q");
    next.set("offset", "0");
    pushParams(next);
  }

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      const trimmed = qInput.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.set("offset", "0");
      pushParams(next);
    }, 300);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  async function fetchCountForStatus(s: StatusKey) {
    const qs = new URLSearchParams();
    qs.set("status", s);
    qs.set("limit", "1");
    qs.set("offset", "0");
    if (q.trim()) qs.set("q", q.trim());
    if (hasUploads) qs.set("has_uploads", "1");
    if (hasPdf) qs.set("has_pdf", "1");

    const res = await fetch(`/api/admin/ivr?${qs.toString()}`, { method: "GET", cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || `Count failed (${res.status})`);
    return Number(json.count || 0);
  }

  async function refreshCounts() {
    try {
      setCountsErr(null);
      const entries = await Promise.all(
        STATUS_TABS.map(async (t) => {
          const n = await fetchCountForStatus(t.key);
          return [t.key, n] as const;
        })
      );
      const next: Record<string, number> = {};
      for (const [k, v] of entries) next[k] = v;
      setCounts(next);
      setCountsUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      setCountsErr(e?.message || "Failed to load counts");
      setCounts({});
    }
  }

  useEffect(() => {
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hasUploads, hasPdf]);

  // main data fetch
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      qs.set("status", statusValue);
      qs.set("limit", String(limit));
      qs.set("offset", String(offset));
      if (q.trim()) qs.set("q", q.trim());
      if (hasUploads) qs.set("has_uploads", "1");
      if (hasPdf) qs.set("has_pdf", "1");

      const res = await fetch(`/api/admin/ivr?${qs.toString()}`, { method: "GET", cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (cancelled) return;

      if (!res.ok || !json?.ok) {
        setError(json?.error || `Request failed (${res.status})`);
        setRows([]);
        setCount(0);
        setLoading(false);
        return;
      }

      setRows(Array.isArray(json.data) ? json.data : []);
      setCount(Number(json.count || 0));
      setLoading(false);
      setLastUpdatedAt(new Date().toISOString());
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [statusValue, limit, offset, q, hasUploads, hasPdf]);

  const pageFrom = count === 0 ? 0 : offset + 1;
  const pageTo = Math.min(offset + limit, count);

  const canPrev = offset > 0;
  const canNext = offset + limit < count;

  const displayRows = useMemo(() => {
    const copy = [...rows];

    function rank(r: QueueRow) {
      if (r.response_unread) return 0;
      if (r.needs_additional_info) return 1;
      const st = safeStatus(r.status);
      if (st === "NEW") return 2;
      if (r.customer_responded) return 3;
      return 4;
    }

    if (sortValue === "priority") {
      copy.sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return timeVal(b.created_at) - timeVal(a.created_at);
      });
      return copy;
    }

    if (sortValue === "oldest") {
      copy.sort((a, b) => timeVal(a.created_at) - timeVal(b.created_at));
      return copy;
    }

    copy.sort((a, b) => timeVal(b.created_at) - timeVal(a.created_at));
    return copy;
  }, [rows, sortValue]);

  const kpis = useMemo(() => {
    const needs = displayRows.filter((r) => r.needs_additional_info).length;
    const unread = displayRows.filter((r) => r.response_unread).length;
    const hasPdfCount = displayRows.filter((r) => r.has_results_pdf).length;
    const hasUploadsCount = displayRows.filter((r) => (r.upload_count || 0) > 0).length;
    return { needs, unread, hasPdfCount, hasUploadsCount };
  }, [displayRows]);

  const controlCard: CSSProperties = {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: 16,
    padding: 12,
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
  };

  const livePill: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  };

  return (
    <div>
      {/* Control strip */}
      <div style={controlCard}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ minWidth: 320, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, marginBottom: 6 }}>Search</div>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Patient, account, insurance, product, POS…"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "rgba(0,0,0,0.16)",
                fontSize: 14,
                background: "white",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = "0 0 0 4px rgba(30,136,229,0.16)";
                e.currentTarget.style.borderColor = "rgba(30,136,229,0.55)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.16)";
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Server-side search includes account name.</div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 900 }}>
              <input
                type="checkbox"
                checked={hasUploads}
                onChange={(e) => {
                  const next = new URLSearchParams(sp.toString());
                  setParamBool(next, "has_uploads", e.target.checked);
                  next.set("offset", "0");
                  pushParams(next);
                }}
              />
              Has uploads
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 900 }}>
              <input
                type="checkbox"
                checked={hasPdf}
                onChange={(e) => {
                  const next = new URLSearchParams(sp.toString());
                  setParamBool(next, "has_pdf", e.target.checked);
                  next.set("offset", "0");
                  pushParams(next);
                }}
              />
              Has results PDF
            </label>

            <div style={{ minWidth: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, marginBottom: 6 }}>Sort</div>
              <select
                value={sortValue}
                onChange={(e) => {
                  const nextSort = String(e.target.value || "newest") as SortKey;
                  const next = new URLSearchParams(sp.toString());
                  next.set("sort", nextSort);
                  next.set("offset", "0");
                  pushParams(next);
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "rgba(0,0,0,0.16)",
                  fontSize: 14,
                  background: "white",
                  outline: "none",
                }}
                title={sortValue === "priority" ? "Priority: Unread → Needs info → New → Other" : undefined}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="button" onClick={refreshCounts} style={btn(false, "ghost")}>
              Refresh counts
            </button>

            <button type="button" onClick={clearAllFilters} style={btn(false, "danger")}>
              Clear filters
            </button>
          </div>
        </div>

        {/* Status chips w/ counts */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {STATUS_TABS.map((t) => {
            const active = statusValue === t.key;
            const c = counts[t.key];
            const activate = () => {
              const next = new URLSearchParams(sp.toString());
              next.set("status", t.key);
              next.set("offset", "0");
              if (t.key === "ALL" && !next.get("sort")) next.set("sort", "priority");
              pushParams(next);
            };

            return (
              <span
                key={t.key}
                style={{
                  ...chip(active),
                  ...(active ? {} : { transform: "translateY(0)" }),
                }}
                onClick={activate}
                onKeyDown={(e) => onChipKeyDown(e, activate)}
                role="button"
                tabIndex={0}
                title={countsErr ? "Counts failed to load" : undefined}
              >
                {t.label} <span style={{ opacity: active ? 0.9 : 0.7 }}>({Number.isFinite(c) ? c : "—"})</span>
              </span>
            );
          })}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={livePill} title={`Queue updated at ${lastUpdatedAt ? fmtShortDateTime(lastUpdatedAt) : "—"}`}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(16,185,129,0.85)" }} />
              Live
              <span style={{ opacity: 0.75, fontWeight: 900 }}>• {lastUpdatedAt ? fmtTimeOnly(lastUpdatedAt) : "—"}</span>
            </span>

            <span style={livePill} title={`Counts updated at ${countsUpdatedAt ? fmtShortDateTime(countsUpdatedAt) : "—"}`}>
              Counts <span style={{ opacity: 0.75, fontWeight: 900 }}>• {countsUpdatedAt ? fmtTimeOnly(countsUpdatedAt) : "—"}</span>
            </span>

            <span style={livePill} title={sortValue === "priority" ? "Priority: Unread → Needs info → New → Other" : undefined}>
              Sorted: {sortValue === "priority" ? "Priority" : sortValue === "oldest" ? "Oldest" : "Newest"}
            </span>

            {countsErr ? <span style={{ fontSize: 12, fontWeight: 900, color: "crimson" }}>{countsErr}</span> : null}
          </div>
        </div>

        {/* KPI pills */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={kpiPill(kpis.needs ? "danger" : "neutral")}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: kpis.needs ? "rgba(220,0,0,0.65)" : "rgba(0,0,0,0.25)" }} />
            <span style={{ opacity: 0.9 }}>Needs info</span>
            <span style={{ fontSize: 16, fontWeight: 950 }}>{kpis.needs}</span>
          </span>

          <span style={kpiPill(kpis.unread ? "warn" : "neutral")}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: kpis.unread ? "rgba(255,165,0,0.85)" : "rgba(0,0,0,0.25)" }} />
            <span style={{ opacity: 0.9 }}>Unread responses</span>
            <span style={{ fontSize: 16, fontWeight: 950 }}>{kpis.unread}</span>
          </span>

          <span style={kpiPill(kpis.hasPdfCount ? "success" : "neutral")}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: kpis.hasPdfCount ? "rgba(0,140,60,0.75)" : "rgba(0,0,0,0.25)" }} />
            <span style={{ opacity: 0.9 }}>Has PDF</span>
            <span style={{ fontSize: 16, fontWeight: 950 }}>{kpis.hasPdfCount}</span>
          </span>

          <span style={kpiPill(kpis.hasUploadsCount ? "success" : "neutral")}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: kpis.hasUploadsCount ? "rgba(0,140,60,0.75)" : "rgba(0,0,0,0.25)" }} />
            <span style={{ opacity: 0.9 }}>Has uploads</span>
            <span style={{ fontSize: 16, fontWeight: 950 }}>{kpis.hasUploadsCount}</span>
          </span>

          <div style={{ marginLeft: "auto", fontSize: 13, opacity: 0.85 }}>
            {count > 0 ? (
              <>
                Showing <b>{pageFrom}</b>–<b>{pageTo}</b> of <b>{count}</b>
              </>
            ) : (
              <>
                Total: <b>0</b>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, marginBottom: 12 }}>
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => {
            const next = new URLSearchParams(sp.toString());
            next.set("offset", String(Math.max(offset - limit, 0)));
            pushParams(next);
          }}
          style={btn(!canPrev, "ghost")}
        >
          ← Prev
        </button>

        <button
          type="button"
          disabled={!canNext}
          onClick={() => {
            const next = new URLSearchParams(sp.toString());
            next.set("offset", String(offset + limit));
            pushParams(next);
          }}
          style={btn(!canNext, "ghost")}
        >
          Next →
        </button>

        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
          {sortValue === "priority" ? (
            <>Priority: <b>Unread</b> → <b>Needs info</b> → <b>New</b> → <b>Other</b></>
          ) : (
            <>Tip: set <b>Sort: Priority</b> to bubble urgent items to the top.</>
          )}
        </div>
      </div>

      {loading && <div style={{ padding: 12 }}>Loading…</div>}
      {error && <div style={{ padding: 12, color: "crimson", fontWeight: 900 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", background: "var(--surface)", boxShadow: "var(--shadow-1)" }}>
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                  {["Created", "Status", "Info", "Patient", "Account", "User", "Insurance", "Product", "POS", "Uploads", "Results", ""].map((h) => (
                    <th
                      key={h || "actions"}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        fontSize: 12,
                        fontWeight: 950,
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayRows.map((r, idx) => {
                  const patient =
                    r.patient_first_name || r.patient_last_name ? `${r.patient_first_name || ""} ${r.patient_last_name || ""}`.trim() : "—";

                  const detailHref = `/admin/ivr/${encodeURIComponent(r.id)}#additional-info`;

                  const resultsPdfHref =
                    r.latest_verification_id
                      ? `/admin/ivr/${encodeURIComponent(r.id)}/verification/${encodeURIComponent(r.latest_verification_id)}/pdf`
                      : null;

                  const info = infoBadge(r);

                  const userLine =
                    (r.submitted_by_user_name && r.submitted_by_user_name.trim()) ||
                    (r.submitted_by_user_email && r.submitted_by_user_email.trim()) ||
                    shortId(r.submitted_by_user_id) ||
                    "—";

                  const zebra = idx % 2 === 0 ? "var(--surface)" : "color-mix(in srgb, var(--surface) 92%, var(--background))";

                  const ident = safeStr(r.ivr_identifier).trim();
                  const createdDate = fmtDateOnly(r.created_at);
                  const createdTooltip = r.created_at ? fmtShortDateTime(r.created_at) : "—";

                  return (
                    <tr
                      key={r.id}
                      style={{ background: zebra }}
                      onClick={() => router.push(detailHref)}
                      title="Open IVR"
                    >
                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <div style={{ fontWeight: 950 }} title={createdTooltip}>
                          {createdDate}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 950 }}>{ident ? ident : "—"}</div>
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <span style={statusPill(String(r.status || "NEW"))}>
                          {safeStatus(r.status) === "COMPLETED" ? "APPROVED" : formatStatusLabel(r.status)}
                        </span>
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <span style={kpiPill(info.tone)}>{info.label}</span>
                        {/* dates only to save space */}
                        {r.latest_info_requested_at ? (
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }} title={fmtShortDateTime(r.latest_info_requested_at)}>
                            Req: {fmtDateOnly(r.latest_info_requested_at)}
                          </div>
                        ) : null}
                        {r.latest_info_provided_at ? (
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }} title={fmtShortDateTime(r.latest_info_provided_at)}>
                            Resp: {fmtDateOnly(r.latest_info_provided_at)}
                          </div>
                        ) : null}
                        {r.latest_info_viewed_at ? (
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }} title={fmtShortDateTime(r.latest_info_viewed_at)}>
                            Viewed: {fmtDateOnly(r.latest_info_viewed_at)}
                          </div>
                        ) : null}
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <div style={{ fontWeight: 950 }}>{patient}</div>
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <div style={{ fontWeight: 950 }}>{r.account_name || "—"}</div>
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <div style={{ fontWeight: 950 }}>{userLine}</div>
                        {r.submitted_by_user_email && r.submitted_by_user_name ? (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{r.submitted_by_user_email}</div>
                        ) : r.submitted_by_user_id ? (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{shortId(r.submitted_by_user_id)}</div>
                        ) : (
                          <div style={{ fontSize: 12, opacity: 0.6 }}>—</div>
                        )}
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {r.primary_insurance ? <div style={{ fontWeight: 950 }}>{r.primary_insurance}</div> : <span style={{ opacity: 0.7 }}>—</span>}
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {r.product ? <div style={{ fontWeight: 950 }}>{r.product}</div> : <span style={{ opacity: 0.7 }}>—</span>}
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {r.place_of_service ? <div style={{ fontWeight: 950 }}>{r.place_of_service}</div> : <span style={{ opacity: 0.7 }}>—</span>}
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <div style={{ fontWeight: 950 }}>{r.upload_count ?? 0}</div>
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {r.has_results_pdf && resultsPdfHref ? (
                          <button
                            type="button"
                            style={{ ...btn(false, "ghost"), padding: "8px 10px", borderRadius: 12 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(resultsPdfHref, "_blank", "noopener,noreferrer");
                            }}
                            title={r.latest_verification_created_at ? fmtShortDateTime(r.latest_verification_created_at) : "Open PDF"}
                          >
                            PDF →
                          </button>
                        ) : (
                          <span style={{ opacity: 0.7 }}>—</span>
                        )}
                      </td>

                      {/* Actions (keeps row clickable but avoids anchor conflicts) */}
                      <td style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <button
                          type="button"
                          style={{ ...btn(false, "primary"), padding: "8px 10px", borderRadius: 12 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(detailHref);
                          }}
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {displayRows.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ padding: 14, fontSize: 13, opacity: 0.9 }}>
                      <div style={{ fontWeight: 950, marginBottom: 6 }}>No IVRs match these filters.</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <button type="button" style={btn(false, "ghost")} onClick={clearSearchOnly}>
                          Clear search
                        </button>
                        <button type="button" style={btn(false, "danger")} onClick={clearAllFilters}>
                          Clear all filters
                        </button>
                        <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                          Tip: try <b>All</b> and set <b>Sort: Priority</b>.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: 12, fontSize: 12, opacity: 0.75, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            PHI Notice: Authorized use only.
          </div>
        </div>
      )}
    </div>
  );
}
