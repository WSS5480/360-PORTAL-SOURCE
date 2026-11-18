"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { IVRRow } from "../page";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString();
}

function safeStatus(s?: string | null) {
  return (s || "NEW").toUpperCase();
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isNeedsAction(r: IVRRow) {
  return Boolean(r.additional_info_requested_at) && !r.additional_info_submitted_at;
}

function isResponded(r: IVRRow) {
  return Boolean(r.additional_info_submitted_at);
}

type RowWithSubmitter = IVRRow & {
  submitted_by_name?: string | null;
  submitted_by_email?: string | null;
};

function baseBorder(): React.CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" };
}

function card(): React.CSSProperties {
  return {
    ...baseBorder(),
    borderRadius: 16,
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
    overflow: "hidden",
  };
}

function th(): React.CSSProperties {
  return {
    textAlign: "left",
    padding: 12,
    fontSize: 12,
    fontWeight: 950,
    color: "var(--muted)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    position: "sticky",
    top: 0,
    background: "color-mix(in srgb, var(--surface) 92%, transparent)",
    backdropFilter: "blur(8px)",
    zIndex: 1,
    whiteSpace: "nowrap",
  };
}

function td(): React.CSSProperties {
  return { padding: 12, fontSize: 13, verticalAlign: "top", borderBottom: "1px solid rgba(0,0,0,0.06)" };
}

function tdRight(): React.CSSProperties {
  return { ...td(), textAlign: "right", whiteSpace: "nowrap" };
}

function inputStyle(): React.CSSProperties {
  return {
    minWidth: 260,
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "var(--surface)",
    outline: "none",
  };
}

function selectStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "var(--surface)",
    outline: "none",
  };
}

function softBtn(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "var(--surface)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function miniBtn(): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "var(--surface)",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
  };
}

function chip(active: boolean, tone: "neutral" | "danger" | "info" | "success" | "warning"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    userSelect: "none",
    background: active ? "var(--brand-700)" : "var(--surface)",
    color: active ? "white" : "var(--foreground)",
    whiteSpace: "nowrap",
  };

  if (active) return base;

  if (tone === "danger") return { ...base, background: "color-mix(in srgb, var(--danger) 7%, var(--surface))" };
  if (tone === "info") return { ...base, background: "var(--brand-050)" };
  if (tone === "success") return { ...base, background: "color-mix(in srgb, var(--success) 8%, var(--surface))" };
  if (tone === "warning") return { ...base, background: "color-mix(in srgb, var(--warning) 10%, var(--surface))" };
  return { ...base, background: "color-mix(in srgb, var(--surface) 86%, var(--background))" };
}

function dot(tone: "danger" | "info" | "success" | "warning" | "muted"): React.CSSProperties {
  const base: React.CSSProperties = { width: 8, height: 8, borderRadius: 999, display: "inline-block" };
  if (tone === "danger") return { ...base, background: "var(--danger)" };
  if (tone === "info") return { ...base, background: "var(--brand-600)" };
  if (tone === "success") return { ...base, background: "var(--success)" };
  if (tone === "warning") return { ...base, background: "var(--warning)" };
  return { ...base, background: "color-mix(in srgb, var(--muted) 70%, transparent)" };
}

function statusPill(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    whiteSpace: "nowrap",
    background: "var(--surface)",
  };

  switch (status) {
    case "COMPLETED":
      return {
        ...base,
        borderColor: "color-mix(in srgb, var(--success) 28%, var(--border))",
        background: "color-mix(in srgb, var(--success) 12%, var(--surface))",
        color: "color-mix(in srgb, var(--success) 78%, black)",
      };
    case "DENIED":
      return {
        ...base,
        borderColor: "color-mix(in srgb, var(--danger) 28%, var(--border))",
        background: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
        color: "color-mix(in srgb, var(--danger) 78%, black)",
      };
    case "SUBMITTED":
      return {
        ...base,
        borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))",
        background: "var(--brand-050)",
        color: "var(--brand-700)",
      };
    case "IN_REVIEW":
      return {
        ...base,
        borderColor: "color-mix(in srgb, var(--warning) 28%, var(--border))",
        background: "color-mix(in srgb, var(--warning) 12%, var(--surface))",
        color: "color-mix(in srgb, var(--warning) 70%, black)",
      };
    default:
      return { ...base, background: "color-mix(in srgb, var(--surface) 86%, var(--background))", color: "var(--muted)" };
  }
}

function infoBadge(kind: "needs" | "responded"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    whiteSpace: "nowrap",
    background: "var(--surface)",
  };

  if (kind === "needs") {
    return {
      ...base,
      background: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
      borderColor: "color-mix(in srgb, var(--danger) 26%, var(--border))",
      color: "color-mix(in srgb, var(--danger) 78%, black)",
    };
  }

  return {
    ...base,
    background: "color-mix(in srgb, var(--success) 10%, var(--surface))",
    borderColor: "color-mix(in srgb, var(--success) 26%, var(--border))",
    color: "color-mix(in srgb, var(--success) 78%, black)",
  };
}

type SortKey = "created_desc" | "created_asc" | "patient_asc";
type PriorityKey = "ALL" | "NEEDS_ACTION" | "NEW" | "IN_REVIEW" | "COMPLETED";

function hasVerificationPdfForRow(statusUpper: string) {
  return statusUpper === "COMPLETED" || statusUpper === "DENIED";
}

function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

type ColumnKey = "provider" | "product" | "submitter" | "created" | "additionalInfo";

export default function PortalIvrListClient(props: { initialRows: IVRRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [needsActionOnly, setNeedsActionOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");
  const [priority, setPriority] = useState<PriorityKey>("ALL");

  const [showProvider, setShowProvider] = useState(true);
  const [showProduct, setShowProduct] = useState(true);
  const [showSubmitter, setShowSubmitter] = useState(true);
  const [showCreated, setShowCreated] = useState(true);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(true);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  const rows = useMemo(() => (Array.isArray(props.initialRows) ? props.initialRows : []), [props.initialRows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const needs = rows.filter((r) => isNeedsAction(r)).length;
    const newCount = rows.filter((r) => safeStatus(r.status) === "NEW").length;
    const inReview = rows.filter((r) => safeStatus(r.status) === "IN_REVIEW").length;
    const completed = rows.filter((r) => safeStatus(r.status) === "COMPLETED").length;
    return { total, needs, newCount, inReview, completed };
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let out = rows.slice();

    if (priority === "NEEDS_ACTION") out = out.filter((r) => isNeedsAction(r));
    else if (priority === "NEW") out = out.filter((r) => safeStatus(r.status) === "NEW");
    else if (priority === "IN_REVIEW") out = out.filter((r) => safeStatus(r.status) === "IN_REVIEW");
    else if (priority === "COMPLETED") out = out.filter((r) => safeStatus(r.status) === "COMPLETED");

    if (status !== "ALL") out = out.filter((r) => safeStatus(r.status) === status);
    if (needsActionOnly) out = out.filter((r) => isNeedsAction(r));

    if (qq) {
      out = out.filter((r) => {
        const rr = r as RowWithSubmitter;

        const patient = `${r.patient_last_name || ""} ${r.patient_first_name || ""}`.toLowerCase();
        const provider = `${r.provider_name || ""}`.toLowerCase();
        const prod = `${r.product || ""}`.toLowerCase();
        const pos = `${r.place_of_service || ""}`.toLowerCase();
        const id = `${r.id || ""}`.toLowerCase();
        const ident = `${(r as any).ivr_identifier || ""}`.toLowerCase();

        const submitName = `${rr.submitted_by_name || ""}`.toLowerCase();
        const submitEmail = `${rr.submitted_by_email || ""}`.toLowerCase();

        return (
          patient.includes(qq) ||
          provider.includes(qq) ||
          prod.includes(qq) ||
          pos.includes(qq) ||
          id.includes(qq) ||
          ident.includes(qq) ||
          submitName.includes(qq) ||
          submitEmail.includes(qq)
        );
      });
    }

    out.sort((a, b) => {
      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();

      switch (sortKey) {
        case "created_asc":
          return aCreated - bCreated;
        case "patient_asc": {
          const ap = `${a.patient_last_name || ""}, ${a.patient_first_name || ""}`.toLowerCase();
          const bp = `${b.patient_last_name || ""}, ${b.patient_first_name || ""}`.toLowerCase();
          return ap.localeCompare(bp);
        }
        case "created_desc":
        default:
          return bCreated - aCreated;
      }
    });

    return out;
  }, [rows, q, status, needsActionOnly, sortKey, priority]);

  const columns: Array<{
    key: ColumnKey;
    label: string;
    checked: boolean;
    setChecked: React.Dispatch<React.SetStateAction<boolean>>;
  }> = [
    { key: "provider", label: "Provider", checked: showProvider, setChecked: setShowProvider },
    { key: "product", label: "Product", checked: showProduct, setChecked: setShowProduct },
    { key: "submitter", label: "Submitted by", checked: showSubmitter, setChecked: setShowSubmitter },
    { key: "created", label: "Created", checked: showCreated, setChecked: setShowCreated },
    { key: "additionalInfo", label: "Additional info", checked: showAdditionalInfo, setChecked: setShowAdditionalInfo },
  ];

  function exportCsv() {
    // ✅ ID first
    const header = [
      "IVR Identifier",
      "Status",
      "Patient",
      ...(showProvider ? ["Provider"] : []),
      ...(showProduct ? ["Product"] : []),
      ...(showSubmitter ? ["Submitted By"] : []),
      ...(showCreated ? ["Created"] : []),
      ...(showAdditionalInfo ? ["Additional Info"] : []),
    ];

    const lines = [header.map(csvEscape).join(",")];

    for (const r of filtered) {
      const rr = r as RowWithSubmitter;

      const ident = safeStr((r as any).ivr_identifier) || "—";

      const st = safeStatus(r.status);
      const statusLabel = st === "COMPLETED" ? "APPROVED" : st;

      const patient =
        r.patient_last_name || r.patient_first_name
          ? `${r.patient_last_name || ""}, ${r.patient_first_name || ""}`.trim().replace(/^, /, "")
          : "—";

      const submitter = safeStr(rr.submitted_by_name) || safeStr(rr.submitted_by_email) || "—";

      let addInfo = "—";
      if (isNeedsAction(r)) addInfo = "Action required";
      else if (isResponded(r)) addInfo = "Submitted";

      const row: unknown[] = [ident, statusLabel, patient];

      if (showProvider) row.push(r.provider_name || "—");
      if (showProduct) row.push(r.product || "—");
      if (showSubmitter) row.push(submitter);
      if (showCreated) row.push(fmtDate(r.created_at));
      if (showAdditionalInfo) row.push(addInfo);

      lines.push(row.map(csvEscape).join(","));
    }

    downloadTextFile(
      `ivr-requests-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n"),
      "text/csv;charset=utf-8"
    );
  }

  return (
    <div style={card()}>
      <div style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.titleRow}>
            <div style={styles.title}>Requests</div>
            <span style={styles.kpiPill}>
              Total <b>{stats.total}</b>
            </span>
            <span style={styles.kpiPillDanger}>
              Needs action <b>{stats.needs}</b>
            </span>
          </div>

          <div style={styles.subTitle}>Search by patient, provider, product, request id, submitter, or identifier.</div>
        </div>

        <div className="portal-controls-stack portal-search-full-mobile" style={styles.controls}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={inputStyle()} />

          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle()}>
            {["ALL", "NEW", "IN_REVIEW", "SUBMITTED", "COMPLETED", "DENIED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={selectStyle()}>
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="patient_asc">Patient A→Z</option>
          </select>

          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={needsActionOnly} onChange={(e) => setNeedsActionOnly(e.target.checked)} />
            Needs action
          </label>

          <div style={{ position: "relative" }}>
            <button type="button" style={miniBtn()} onClick={() => setShowColumnsMenu((v) => !v)}>
              Columns ▾
            </button>

            {showColumnsMenu ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  width: 220,
                  zIndex: 30,
                  ...baseBorder(),
                  borderRadius: 14,
                  background: "var(--surface)",
                  boxShadow: "var(--shadow-1)",
                  padding: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 950, color: "var(--muted)", padding: "2px 6px 8px" }}>Show columns</div>

                {columns.map((c) => (
                  <label
                    key={c.key}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "8px 6px",
                      fontWeight: 900,
                      fontSize: 13,
                    }}
                  >
                    <input type="checkbox" checked={c.checked} onChange={(e) => c.setChecked(e.target.checked)} />
                    {c.label}
                  </label>
                ))}

                <div style={{ paddingTop: 6, display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" style={miniBtn()} onClick={() => setShowColumnsMenu(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button type="button" style={miniBtn()} onClick={exportCsv}>
            Export CSV
          </button>

          <button
            type="button"
            style={softBtn()}
            onClick={() => {
              setQ("");
              setStatus("ALL");
              setNeedsActionOnly(false);
              setSortKey("created_desc");
              setPriority("ALL");
            }}
          >
            Reset
          </button>

          <div style={styles.showing}>
            Showing <b>{filtered.length}</b>
          </div>
        </div>
      </div>

      <div style={styles.chips}>
        <div style={styles.chipsLabel}>Quick filters:</div>

        <span style={chip(priority === "ALL", "neutral")} onClick={() => setPriority("ALL")} role="button" tabIndex={0}>
          <span style={dot("muted")} />
          All
        </span>

        <span
          style={chip(priority === "NEEDS_ACTION", "danger")}
          onClick={() => setPriority("NEEDS_ACTION")}
          role="button"
          tabIndex={0}
        >
          <span style={dot("danger")} />
          Needs Action <span style={{ opacity: 0.7 }}>({stats.needs})</span>
        </span>

        <span style={chip(priority === "NEW", "info")} onClick={() => setPriority("NEW")} role="button" tabIndex={0}>
          <span style={dot("info")} />
          NEW <span style={{ opacity: 0.7 }}>({stats.newCount})</span>
        </span>

        <span style={chip(priority === "IN_REVIEW", "warning")} onClick={() => setPriority("IN_REVIEW")} role="button" tabIndex={0}>
          <span style={dot("warning")} />
          In Review <span style={{ opacity: 0.7 }}>({stats.inReview})</span>
        </span>

        <span
          style={chip(priority === "COMPLETED", "success")}
          onClick={() => setPriority("COMPLETED")}
          role="button"
          tabIndex={0}
        >
          <span style={dot("success")} />
          Approved <span style={{ opacity: 0.7 }}>({stats.completed})</span>
        </span>

        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", fontWeight: 900 }}>
          <b>PHI Notice:</b> Authorized use only.
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 18 }}>
          <div style={{ fontWeight: 950, fontSize: 14 }}>No results</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
            Try clearing filters or searching by patient/provider/product/identifier.
          </div>
          <button
            type="button"
            style={{ ...softBtn(), marginTop: 12 }}
            onClick={() => {
              setQ("");
              setStatus("ALL");
              setNeedsActionOnly(false);
              setSortKey("created_desc");
              setPriority("ALL");
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="portal-table-wrap" style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1020 }}>
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--surface) 86%, var(--background))" }}>
                  {/* ✅ ID FIRST */}
                  <th style={th()}>ID</th>
                  <th style={th()}>Status</th>
                  <th style={th()}>Patient</th>
                  {showProvider ? <th style={th()}>Provider</th> : null}
                  {showProduct ? <th style={th()}>Product</th> : null}
                  {showSubmitter ? <th style={th()}>Submitted by</th> : null}
                  {showCreated ? <th style={th()}>Created</th> : null}
                  {showAdditionalInfo ? <th style={th()}>Additional info</th> : null}
                  <th style={{ ...th(), textAlign: "right" }}>Open</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, idx) => {
                  const rr = r as RowWithSubmitter;

                  const st = safeStatus(r.status);
                  const needs = isNeedsAction(r);
                  const responded = isResponded(r);

                  const patient =
                    r.patient_last_name || r.patient_first_name
                      ? `${r.patient_last_name || ""}, ${r.patient_first_name || ""}`.trim().replace(/^, /, "")
                      : "—";

                  const ident = safeStr((r as any).ivr_identifier).trim();

                  const submitter = safeStr(rr.submitted_by_name) || safeStr(rr.submitted_by_email) || "—";
                  const submitterSub =
                    safeStr(rr.submitted_by_name) && safeStr(rr.submitted_by_email) ? safeStr(rr.submitted_by_email) : "";

                  const zebra = idx % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--surface) 88%, var(--background))";
                  const baseBg = needs ? "color-mix(in srgb, var(--danger) 5%, var(--surface))" : zebra;

                  const href = `/portal/ivr/${encodeURIComponent(r.id)}`;
                  const pdfHref = `/api/portal/ivr/${encodeURIComponent(r.id)}/verification-pdf`;
                  const showPdf = hasVerificationPdfForRow(st);

                  const onRowClick = () => {
                    window.location.href = href;
                  };

                  return (
                    <tr
                      key={r.id}
                      style={{ background: baseBg, cursor: "pointer" }}
                      onClick={onRowClick}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = needs
                          ? "color-mix(in srgb, var(--danger) 7%, var(--surface))"
                          : "color-mix(in srgb, var(--surface) 82%, var(--background))";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = baseBg;
                      }}
                      title="Open request"
                    >
                      {/* ✅ ID FIRST CELL */}
                      <td style={{ ...td(), fontWeight: 950, whiteSpace: "nowrap" }}>
                        {ident ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: 999,
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor: "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
                              background: "color-mix(in srgb, var(--brand-050) 60%, var(--surface))",
                              color: "var(--brand-700)",
                            }}
                            title="IVR Identifier"
                          >
                            {ident}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontWeight: 900 }}>—</span>
                        )}
                      </td>

                      <td style={{ ...td(), borderLeft: needs ? `4px solid var(--danger)` : "4px solid transparent" }}>
                        <span style={statusPill(st)}>{st === "COMPLETED" ? "APPROVED" : st}</span>
                      </td>

                      <td style={td()}>
                        <div style={{ fontWeight: 950 }}>{patient}</div>
                      </td>

                      {showProvider ? (
                        <td style={td()}>
                          <div style={{ fontWeight: 950 }}>{r.provider_name || "—"}</div>
                        </td>
                      ) : null}

                      {showProduct ? (
                        <td style={td()}>
                          {r.product ? <span style={{ fontWeight: 950 }}>{r.product}</span> : <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>
                      ) : null}

                      {showSubmitter ? (
                        <td style={td()}>
                          <div style={{ fontWeight: 950 }}>{submitter}</div>
                          {submitterSub ? (
                            <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>{submitterSub}</div>
                          ) : null}
                        </td>
                      ) : null}

                      {showCreated ? (
                        <td style={td()}>
                          <div style={{ fontWeight: 950 }}>{fmtDate(r.created_at)}</div>
                        </td>
                      ) : null}

                      {showAdditionalInfo ? (
                        <td style={td()}>
                          {needs ? (
                            <span style={infoBadge("needs")}>
                              <span style={dot("danger")} />
                              Action required
                            </span>
                          ) : responded ? (
                            <span style={infoBadge("responded")}>
                              <span style={dot("success")} />
                              Submitted
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                      ) : null}

                      <td style={tdRight()} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          {showPdf ? (
                            <a
                              href={pdfHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                borderRadius: 999,
                                borderWidth: 1,
                                borderStyle: "solid",
                                borderColor: "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
                                background: "var(--surface)",
                                fontWeight: 950,
                                color: "var(--brand-700)",
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                              }}
                              title="Open verification PDF"
                            >
                              PDF ↗
                            </a>
                          ) : null}

                          <Link
                            href={href}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 10px",
                              borderRadius: 999,
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor: needs
                                ? "color-mix(in srgb, var(--danger) 26%, var(--border))"
                                : "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
                              background: needs ? "color-mix(in srgb, var(--danger) 8%, var(--surface))" : "var(--surface)",
                              fontWeight: 950,
                              color: needs ? "color-mix(in srgb, var(--danger) 78%, black)" : "var(--brand-700)",
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {needs ? "Respond →" : "Open →"}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={styles.footerTip}>
            Tip: If you see <b>Action required</b>, open the request and submit the additional details to continue processing.
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: 14,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    flexWrap: "wrap",
    alignItems: "center",
    background: "var(--surface)",
  },
  titleRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  title: { fontWeight: 950, fontSize: 14 },
  kpiPill: {
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    color: "var(--foreground)",
  },
  kpiPillDanger: {
    fontSize: 12,
    fontWeight: 950,
    padding: "6px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--danger) 22%, var(--border))",
    background: "color-mix(in srgb, var(--danger) 7%, var(--surface))",
    color: "color-mix(in srgb, var(--danger) 78%, black)",
  },
  subTitle: { marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 800 },
  controls: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  checkboxLabel: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
    fontWeight: 900,
    color: "var(--foreground)",
  },
  showing: { fontSize: 12, color: "var(--muted)" },
  chips: {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    background: "color-mix(in srgb, var(--surface) 92%, var(--background))",
  },
  chipsLabel: { fontSize: 12, fontWeight: 950, color: "var(--muted)" },
  footerTip: {
    padding: 12,
    fontSize: 12,
    color: "var(--muted)",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    background: "color-mix(in srgb, var(--surface) 92%, var(--background))",
    lineHeight: 1.45,
  },
};
