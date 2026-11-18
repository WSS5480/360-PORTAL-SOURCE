"use client";

import { useEffect, useMemo, useState } from "react";
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

  upload_count: number;
  has_results_pdf: boolean;
  latest_verification_id: string | null;
  latest_verification_created_at: string | null;

  // additional info workflow
  needs_additional_info: boolean;
  customer_responded: boolean;
  response_unread: boolean;

  latest_info_requested_at: string | null;
  latest_info_provided_at: string | null;
  latest_info_viewed_at: string | null;
};

const STATUS_OPTIONS = ["ALL", "NEW", "IN_REVIEW", "SUBMITTED", "COMPLETED", "DENIED"] as const;

function upper(s?: string | null) {
  return String(s || "").trim().toUpperCase();
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

function fmtShortDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

/** ---------------------- LONGHAND-ONLY STYLES ---------------------- */
/** RULE: no `border:`, no `borderBottom:`, etc. Use width/style/color separately. */

function borderBox(color = "rgba(0,0,0,0.10)"): React.CSSProperties {
  return {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color,
  };
}

function chipBase(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
    ...borderBox("rgba(0,0,0,0.12)"),
    background: "rgba(0,0,0,0.02)",
    color: "rgba(0,0,0,0.78)",
  };
}

function kpiPill(tone: "neutral" | "success" | "warning" | "danger"): React.CSSProperties {
  const base = chipBase();

  if (tone === "success") {
    return {
      ...base,
      background: "rgba(0,140,60,0.08)",
      borderColor: "rgba(0,140,60,0.20)",
      color: "rgb(0,120,55)",
    };
  }
  if (tone === "warning") {
    return {
      ...base,
      background: "rgba(255,165,0,0.16)",
      borderColor: "rgba(255,165,0,0.28)",
      color: "#7a4b00",
    };
  }
  if (tone === "danger") {
    return {
      ...base,
      background: "rgba(220,0,0,0.06)",
      borderColor: "rgba(220,0,0,0.20)",
      color: "crimson",
    };
  }

  // neutral: keep base (still includes borderColor)
  return base;
}

function statusPill(statusUpper: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
    ...borderBox("rgba(0,0,0,0.12)"),
    background: "rgba(0,0,0,0.02)",
    color: "rgba(0,0,0,0.78)",
  };

  if (statusUpper === "COMPLETED") {
    return {
      ...base,
      borderColor: "rgba(0,140,60,0.24)",
      background: "rgba(0,140,60,0.10)",
      color: "rgb(0,120,55)",
    };
  }
  if (statusUpper === "DENIED") {
    return {
      ...base,
      borderColor: "rgba(220,0,0,0.22)",
      background: "rgba(220,0,0,0.08)",
      color: "crimson",
    };
  }
  if (statusUpper === "IN_REVIEW") {
    return {
      ...base,
      borderColor: "rgba(255,165,0,0.30)",
      background: "rgba(255,165,0,0.14)",
      color: "#7a4b00",
    };
  }
  if (statusUpper === "SUBMITTED") {
    return {
      ...base,
      borderColor: "rgba(30,136,229,0.22)",
      background: "rgba(30,136,229,0.10)",
      color: "rgba(10,80,160,1)",
    };
  }
  if (statusUpper === "NEW") {
    return {
      ...base,
      borderColor: "rgba(0,0,0,0.16)",
      background: "rgba(0,0,0,0.06)",
      color: "rgba(0,0,0,0.85)",
    };
  }

  return base;
}

function infoBadge(kind: "needs" | "new" | "responded" | "none"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
    ...borderBox("rgba(0,0,0,0.12)"),
    background: "rgba(0,0,0,0.02)",
    color: "rgba(0,0,0,0.70)",
  };

  if (kind === "needs") {
    return { ...base, background: "rgba(220,0,0,0.06)", borderColor: "rgba(220,0,0,0.20)", color: "crimson" };
  }
  if (kind === "new") {
    return { ...base, background: "rgba(255,165,0,0.16)", borderColor: "rgba(255,165,0,0.28)", color: "#7a4b00" };
  }
  if (kind === "responded") {
    return { ...base, background: "rgba(0,140,60,0.08)", borderColor: "rgba(0,140,60,0.20)", color: "rgb(0,120,55)" };
  }
  return base;
}

function pillBtn(active: boolean): React.CSSProperties {
  return {
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 999,
    ...borderBox(active ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)"),
    fontSize: 12,
    fontWeight: 950,
    background: active ? "rgba(0,0,0,0.90)" : "white",
    color: active ? "white" : "rgba(0,0,0,0.85)",
    cursor: "pointer",
    userSelect: "none",
  };
}

function btnPrimary(disabled?: boolean): React.CSSProperties {
  return {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12,
    ...borderBox("rgba(0,0,0,0.12)"),
    background: "rgba(0,0,0,0.92)",
    color: "white",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}

function btnGhost(disabled?: boolean): React.CSSProperties {
  return {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12,
    ...borderBox("rgba(0,0,0,0.16)"),
    background: "white",
    color: "rgba(0,0,0,0.88)",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 12,
    ...borderBox("rgba(0,0,0,0.18)"),
    fontSize: 14,
    background: "white",
    outline: "none",
  };
}

function thStyle(): React.CSSProperties {
  return {
    textAlign: "left",
    padding: 10,
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(0,0,0,0.08)",
    background: "rgba(0,0,0,0.02)",
  };
}

function tdStyle(): React.CSSProperties {
  return {
    padding: 10,
    fontSize: 13,
    verticalAlign: "top",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(0,0,0,0.06)",
  };
}

/** ---------------------- COMPONENT ---------------------- */

export default function AdminIvrQueueClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const status = upper(sp.get("status") || "NEW");
  const limit = Math.min(Math.max(Number(sp.get("limit") || "50"), 10), 200);
  const offset = Math.max(Number(sp.get("offset") || "0"), 0);

  const q = sp.get("q") || "";
  const hasUploads = sp.get("has_uploads") === "1";
  const hasPdf = sp.get("has_pdf") === "1";

  const statusValue = useMemo(() => {
    return (STATUS_OPTIONS as readonly string[]).includes(status as any) ? (status as any) : "NEW";
  }, [status]);

  const [rows, setRows] = useState<QueueRow[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [qInput, setQInput] = useState(q);

  // global header counts (always accurate, independent of tab)
  const [countNew, setCountNew] = useState(0);
  const [countApproved, setCountApproved] = useState(0); // COMPLETED
  const [countDenied, setCountDenied] = useState(0);
  const [countsErr, setCountsErr] = useState<string | null>(null);

  function pushParams(next: URLSearchParams) {
    router.push(`/admin/ivr?${next.toString()}`);
  }

  useEffect(() => {
    setQInput(q);
  }, [q]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      const trimmed = qInput.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.set("offset", "0");
      pushParams(next);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 350);

    return () => clearTimeout(t);
  }, [qInput]);

  async function fetchCountForStatus(s: "NEW" | "COMPLETED" | "DENIED") {
    const qs = new URLSearchParams();
    qs.set("status", s);
    qs.set("limit", "1");
    qs.set("offset", "0");
    const res = await fetch(`/api/admin/ivr?${qs.toString()}`, { method: "GET", cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed count for ${s} (${res.status})`);
    return Number(json.count || 0);
  }

  async function refreshHeaderCounts() {
    try {
      setCountsErr(null);
      const [n, a, d] = await Promise.all([
        fetchCountForStatus("NEW"),
        fetchCountForStatus("COMPLETED"),
        fetchCountForStatus("DENIED"),
      ]);
      setCountNew(n);
      setCountApproved(a);
      setCountDenied(d);
    } catch (e: any) {
      setCountsErr(e?.message || "Failed to load KPI counts");
      setCountNew(0);
      setCountApproved(0);
      setCountDenied(0);
    }
  }

  useEffect(() => {
    refreshHeaderCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusValue, limit, offset, q, hasUploads, hasPdf]);

  // main fetch
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      qs.set("status", String(statusValue));
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

  // KPIs for current page slice
  const kpis = useMemo(() => {
    const total = rows.length;
    const needs = rows.filter((r) => Boolean(r.needs_additional_info)).length;
    const unread = rows.filter((r) => Boolean(r.response_unread)).length;
    const hasPdfCount = rows.filter((r) => Boolean(r.has_results_pdf)).length;
    const hasUploadsCount = rows.filter((r) => (r.upload_count || 0) > 0).length;
    const approved = rows.filter((r) => upper(r.status) === "COMPLETED").length;
    const denied = rows.filter((r) => upper(r.status) === "DENIED").length;
    return { total, needs, unread, hasPdfCount, hasUploadsCount, approved, denied };
  }, [rows]);

  // Priority ordering in ALL
  const displayRows = useMemo(() => {
    const copy = [...rows];

    function infoRank(r: QueueRow) {
      const st = upper(r.status);
      if (st === "NEW") return 0;
      if (r.needs_additional_info) return 1;
      if (r.response_unread) return 2;
      if (r.customer_responded) return 3;
      return 4;
    }

    function timeVal(s?: string | null) {
      const d = s ? new Date(s) : null;
      const t = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
      return t;
    }

    if (statusValue === "ALL") {
      copy.sort((a, b) => {
        const ra = infoRank(a);
        const rb = infoRank(b);
        if (ra !== rb) return ra - rb;
        return timeVal(b.created_at) - timeVal(a.created_at);
      });
    }

    return copy;
  }, [rows, statusValue]);

  const urgentText =
    countNew > 0 ? `${countNew} NEW IVR${countNew === 1 ? "" : "s"} need immediate attention` : "No NEW IVRs right now";

  return (
    <div>
      {/* KPI / urgency bar */}
      <div
        style={{
          ...borderBox("rgba(0,0,0,0.10)"),
          borderRadius: 14,
          padding: 12,
          background: countNew > 0 ? "rgba(255,165,0,0.12)" : "rgba(0,0,0,0.02)",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ minWidth: 260 }}>
          <div style={{ fontWeight: 950, fontSize: 13 }}>{urgentText}</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            Tip: use <b>ALL</b> to triage everything, or jump directly to <b>NEW</b>.
            {countsErr ? <span style={{ marginLeft: 8, color: "crimson", fontWeight: 900 }}>{countsErr}</span> : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={kpiPill(countNew > 0 ? "warning" : "neutral")}>
            NEW: <span style={{ fontSize: 14 }}>{countNew}</span>
          </span>

          <span style={kpiPill(countApproved > 0 ? "success" : "neutral")}>
            Approved: <span style={{ fontSize: 14 }}>{countApproved}</span>
          </span>

          <span style={kpiPill(countDenied > 0 ? "danger" : "neutral")}>
            Denied: <span style={{ fontSize: 14 }}>{countDenied}</span>
          </span>

          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(sp.toString());
              next.set("status", "NEW");
              next.set("offset", "0");
              pushParams(next);
            }}
            style={btnPrimary(countNew === 0)}
            disabled={countNew === 0}
            title={countNew === 0 ? "No NEW IVRs" : "Show NEW IVRs"}
          >
            View NEW →
          </button>

          <button type="button" onClick={refreshHeaderCounts} style={btnGhost()}>
            Refresh
          </button>
        </div>
      </div>

      {/* Search + toggles */}
      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ minWidth: 320, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.8, marginBottom: 6 }}>Search</div>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Patient, account, insurance, product, POS, codes…"
            style={inputStyle()}
          />
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Search is server-side and includes account name.</div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 900 }}>
            <input
              type="checkbox"
              checked={hasUploads}
              onChange={(e) => {
                const next = new URLSearchParams(sp.toString());
                if (e.target.checked) next.set("has_uploads", "1");
                else next.delete("has_uploads");
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
                if (e.target.checked) next.set("has_pdf", "1");
                else next.delete("has_pdf");
                next.set("offset", "0");
                pushParams(next);
              }}
            />
            Has results PDF
          </label>
        </div>
      </div>

      {/* Status pills + totals */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        {STATUS_OPTIONS.map((s) => {
          const active = statusValue === s;
          const label = s === "COMPLETED" ? "APPROVED" : s;
          return (
            <button
              key={s}
              type="button"
              style={pillBtn(active)}
              onClick={() => {
                const next = new URLSearchParams(sp.toString());
                next.set("status", s);
                next.set("offset", "0");
                pushParams(next);
              }}
            >
              {label}
            </button>
          );
        })}

        <div style={{ marginLeft: "auto", fontSize: 13, opacity: 0.85, fontWeight: 900 }}>
          {count > 0 ? (
            <>
              Showing <span style={{ fontWeight: 950 }}>{pageFrom}</span>–<span style={{ fontWeight: 950 }}>{pageTo}</span> of{" "}
              <span style={{ fontWeight: 950 }}>{count}</span>
            </>
          ) : (
            <>
              Total: <span style={{ fontWeight: 950 }}>0</span>
            </>
          )}
        </div>
      </div>

      {/* Page KPIs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <span style={kpiPill(kpis.needs ? "danger" : "neutral")}>
          Needs info: <span style={{ fontSize: 14 }}>{kpis.needs}</span>
        </span>
        <span style={kpiPill(kpis.unread ? "warning" : "neutral")}>
          New responses: <span style={{ fontSize: 14 }}>{kpis.unread}</span>
        </span>
        <span style={kpiPill(kpis.approved ? "success" : "neutral")}>
          Approved (page): <span style={{ fontSize: 14 }}>{kpis.approved}</span>
        </span>
        <span style={kpiPill(kpis.denied ? "danger" : "neutral")}>
          Denied (page): <span style={{ fontSize: 14 }}>{kpis.denied}</span>
        </span>
        <span style={kpiPill(kpis.hasPdfCount ? "success" : "neutral")}>
          Has PDF: <span style={{ fontSize: 14 }}>{kpis.hasPdfCount}</span>
        </span>
        <span style={kpiPill(kpis.hasUploadsCount ? "success" : "neutral")}>
          Has uploads: <span style={{ fontSize: 14 }}>{kpis.hasUploadsCount}</span>
        </span>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => {
            const next = new URLSearchParams(sp.toString());
            next.set("offset", String(Math.max(offset - limit, 0)));
            pushParams(next);
          }}
          style={btnGhost(!canPrev)}
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
          style={btnGhost(!canNext)}
        >
          Next →
        </button>
      </div>

      {loading && <div style={{ padding: 12, fontWeight: 900 }}>Loading…</div>}
      {error && <div style={{ padding: 12, color: "crimson", fontWeight: 950 }}>{error}</div>}

      {!loading && !error && (
        <div
          style={{
            ...borderBox("rgba(0,0,0,0.10)"),
            borderRadius: 14,
            overflow: "hidden",
            background: "white",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle()}>Created</th>
                <th style={thStyle()}>Status</th>
                <th style={thStyle()}>Info</th>
                <th style={thStyle()}>Patient</th>
                <th style={thStyle()}>Account</th>
                <th style={thStyle()}>User</th>
                <th style={thStyle()}>Insurance</th>
                <th style={thStyle()}>Product</th>
                <th style={thStyle()}>POS</th>
                <th style={thStyle()}>Uploads</th>
                <th style={thStyle()}>Results</th>
                <th style={thStyle()}>Open</th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((r, idx) => {
                const st = upper(r.status || "NEW");
                const statusLabel = st === "COMPLETED" ? "APPROVED" : formatStatusLabel(r.status);

                const patient =
                  r.patient_first_name || r.patient_last_name
                    ? `${r.patient_first_name || ""} ${r.patient_last_name || ""}`.trim()
                    : "—";

                const accountLabel = r.account_name || "—";
                const detailHref = `/admin/ivr/${encodeURIComponent(r.id)}#additional-info`;

                const resultsPdfHref =
                  r.latest_verification_id
                    ? `/admin/ivr/${encodeURIComponent(r.id)}/verification/${encodeURIComponent(r.latest_verification_id)}/pdf`
                    : null;

                const showNeeds = Boolean(r.needs_additional_info);
                const showNew = !showNeeds && Boolean(r.response_unread);
                const showResponded = !showNeeds && !showNew && Boolean(r.customer_responded);

                const infoKind: "needs" | "new" | "responded" | "none" = showNeeds
                  ? "needs"
                  : showNew
                    ? "new"
                    : showResponded
                      ? "responded"
                      : "none";

                const userLine =
                  (r.submitted_by_user_name && r.submitted_by_user_name.trim()) ||
                  (r.submitted_by_user_email && r.submitted_by_user_email.trim()) ||
                  shortId(r.submitted_by_user_id) ||
                  "—";

                const zebra = idx % 2 === 0 ? "white" : "rgba(0,0,0,0.01)";

                return (
                  <tr
                    key={r.id}
                    style={{ background: zebra }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = zebra;
                    }}
                  >
                    <td style={tdStyle()}>
                      <div style={{ fontWeight: 950 }}>{fmtShortDate(r.created_at)}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{shortId(r.id)}</div>
                    </td>

                    <td style={tdStyle()}>
                      <div style={statusPill(st)}>{statusLabel}</div>
                      {st === "NEW" ? (
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Immediate attention</div>
                      ) : null}
                    </td>

                    <td style={tdStyle()}>
                      <span style={infoBadge(infoKind)}>
                        {infoKind === "needs"
                          ? "Needs customer info"
                          : infoKind === "new"
                            ? "NEW response"
                            : infoKind === "responded"
                              ? "Customer responded"
                              : "No active request"}
                      </span>

                      {r.latest_info_requested_at ? (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Req: {fmtDateTime(r.latest_info_requested_at)}</div>
                      ) : null}
                      {r.latest_info_provided_at ? (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Resp: {fmtDateTime(r.latest_info_provided_at)}</div>
                      ) : null}
                      {r.latest_info_viewed_at ? (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Viewed: {fmtDateTime(r.latest_info_viewed_at)}</div>
                      ) : null}
                    </td>

                    <td style={tdStyle()}>
                      <div style={{ fontWeight: 950 }}>{patient}</div>
                    </td>

                    <td style={tdStyle()}>
                      <div style={{ fontWeight: 950 }}>{accountLabel}</div>
                    </td>

                    <td style={tdStyle()}>
                      <div style={{ fontWeight: 950 }}>{userLine}</div>
                      {r.submitted_by_user_email && r.submitted_by_user_name ? (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{r.submitted_by_user_email}</div>
                      ) : r.submitted_by_user_id ? (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{shortId(r.submitted_by_user_id)}</div>
                      ) : (
                        <div style={{ fontSize: 12, opacity: 0.6 }}>—</div>
                      )}
                    </td>

                    <td style={tdStyle()}>
                      {r.primary_insurance ? <div style={{ fontWeight: 950 }}>{r.primary_insurance}</div> : <span style={{ opacity: 0.7 }}>—</span>}
                    </td>

                    <td style={tdStyle()}>
                      {r.product ? <div style={{ fontWeight: 950 }}>{r.product}</div> : <span style={{ opacity: 0.7 }}>—</span>}
                    </td>

                    <td style={tdStyle()}>
                      {r.place_of_service ? (
                        <div style={{ fontWeight: 950 }}>{r.place_of_service}</div>
                      ) : (
                        <span style={{ opacity: 0.7 }}>—</span>
                      )}
                    </td>

                    <td style={tdStyle()}>
                      <div style={{ fontWeight: 950 }}>{r.upload_count ?? 0}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{(r.upload_count ?? 0) > 0 ? "files attached" : "no files"}</div>
                    </td>

                    <td style={tdStyle()}>
                      {r.has_results_pdf && resultsPdfHref ? (
                        <>
                          <a href={resultsPdfHref} style={{ fontWeight: 950 }} target="_blank" rel="noopener noreferrer">
                            PDF →
                          </a>
                          {r.latest_verification_created_at ? (
                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                              {fmtShortDate(r.latest_verification_created_at)}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span style={{ opacity: 0.7 }}>—</span>
                      )}
                    </td>

                    <td style={tdStyle()}>
                      <a href={detailHref} style={{ fontWeight: 950, textDecoration: "none" }}>
                        Open →
                      </a>
                    </td>
                  </tr>
                );
              })}

              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: 12, fontSize: 13, opacity: 0.8 }}>
                    No IVRs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
