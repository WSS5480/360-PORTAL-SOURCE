"use client";

import { Fragment, useMemo, useState } from "react";
import { REMOVE_REASON_OPTIONS } from "@/lib/inventory/removeReasonOptions";

const C = {
  border: "rgba(0,0,0,0.10)",
  borderSubtle: "rgba(0,0,0,0.06)",
  borderInput: "rgba(0,0,0,0.18)",
  bgSoft: "rgba(0,0,0,0.02)",
  shadow: "0 10px 26px rgba(0,0,0,0.06)",
};

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : String(iso);
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.borderInput,
    fontWeight: 900,
    fontSize: 13,
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
  };
}

type PreviewLine = {
  sku: string;
  identifier: string;
  qty: number;
  ok: boolean;
  error?: string;
  history?: {
    trace_rows: Array<{
      id: string;
      qty: number;
      serial_number: string | null;
      lot_number: string | null;
      location: string | null;
      created_at: string | null;
    }>;
    movements: Array<{
      id: string;
      created_at: string;
      delta: number;
      reason: string | null;
      source: string | null;
    }>;
    trace_at_other_locations?: string[];
  };
  preview?: {
    variant_id: string;
    size_label: string | null;
    prior_qty_on_hand: number;
    matchPath: string;
    available_in_trace_rows: number;
  };
};

type PreviewPayload = {
  ok: true;
  filename: string;
  slip: { warehouse_outbound: string | null; sales_order: string | null };
  parse_warnings: string[];
  summary: { line_count: number; ready: number; blocked: number };
  lines: PreviewLine[];
};

export default function InventoryPdfRemoveClient() {
  const [file, setFile] = useState<File | null>(null);
  const [removeReasonPreset, setRemoveReasonPreset] = useState<string>(REMOVE_REASON_OPTIONS[0]);
  const [removeReasonOther, setRemoveReasonOther] = useState("");
  const [location, setLocation] = useState("");

  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [commitResult, setCommitResult] = useState<{ applied: number } | null>(null);

  const reasonLabel = useMemo(() => {
    if (removeReasonPreset === "Other") {
      const o = removeReasonOther.trim();
      return o ? `Other: ${o}` : "";
    }
    return removeReasonPreset;
  }, [removeReasonPreset, removeReasonOther]);

  function resetFlow() {
    setFile(null);
    setStep("upload");
    setPreview(null);
    setCommitResult(null);
    setMsg(null);
  }

  async function runPreview() {
    if (!file) {
      setMsg({ tone: "warn", text: "Choose a PDF delivery slip first." });
      return;
    }
    if (removeReasonPreset === "Other" && !removeReasonOther.trim()) {
      setMsg({ tone: "warn", text: "Describe the reason when selecting Other." });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (location.trim()) fd.set("location", location.trim());
      const res = await fetch("/api/admin/inventory/remove-from-pdf/preview", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setMsg({ tone: "warn", text: data?.error || `Preview failed (${res.status})` });
        return;
      }
      setPreview(data as PreviewPayload);
      setStep("review");
      if (data.summary?.blocked > 0) {
        setMsg({
          tone: "warn",
          text: `${data.summary.blocked} line(s) cannot be removed yet — see the table. Fix stock or remove those lines from the PDF and try again.`,
        });
      } else {
        setMsg({
          tone: "ok",
          text: `Parsed ${data.summary.line_count} line(s). Review and confirm with reason: ${reasonLabel || "—"}`,
        });
      }
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (!preview || preview.summary.blocked > 0) {
      setMsg({ tone: "warn", text: "Cannot commit while some lines are blocked." });
      return;
    }
    if (removeReasonPreset === "Other" && !removeReasonOther.trim()) {
      setMsg({ tone: "warn", text: "Describe the reason when selecting Other." });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const lines = preview.lines
        .filter((l) => l.ok)
        .map((l) => ({ sku: l.sku, identifier: l.identifier, qty: l.qty }));

      const reasonPreset = removeReasonPreset === "Other" ? "Other" : removeReasonPreset;
      const reasonOther = removeReasonPreset === "Other" ? removeReasonOther.trim() : "";

      const res = await fetch("/api/admin/inventory/remove-from-pdf/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines,
          reason_preset: reasonPreset,
          reason_other: reasonOther,
          location: location.trim() || null,
          slip: preview.slip,
          filename: preview.filename,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setMsg({ tone: "warn", text: data?.error || `Commit failed (${res.status})` });
        return;
      }
      setCommitResult({ applied: data.applied ?? lines.length });
      setStep("done");
      setMsg({ tone: "ok", text: `Removed ${data.applied ?? lines.length} line(s) from inventory.` });
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.45 }}>
        Upload a <b>text-based</b> delivery slip PDF (Odoo &quot;Delivery Slip&quot; style with{" "}
        <code style={{ fontSize: 11 }}>[SKU]</code> rows). The portal extracts lot/serial lines, shows what will be removed, then you confirm.{" "}
        <span style={{ opacity: 0.9 }}>Scanned-image PDFs without embedded text cannot be parsed — use scan-out instead.</span>
      </div>

      {msg ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 13,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: msg.tone === "ok" ? "rgba(25, 135, 84, 0.35)" : "rgba(220, 53, 69, 0.35)",
            background: msg.tone === "ok" ? "rgba(25, 135, 84, 0.08)" : "rgba(220, 53, 69, 0.08)",
          }}
        >
          {msg.text}
        </div>
      ) : null}

      {step === "upload" && (
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Delivery slip PDF</div>
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
              }}
              style={{ fontSize: 13 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Removal reason</div>
            <select
              value={removeReasonPreset}
              onChange={(e) => setRemoveReasonPreset(e.target.value)}
              disabled={busy}
              style={inputStyle()}
            >
              {REMOVE_REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          {removeReasonPreset === "Other" ? (
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Describe reason</div>
              <input
                value={removeReasonOther}
                onChange={(e) => setRemoveReasonOther(e.target.value)}
                placeholder="Required for Other"
                disabled={busy}
                style={inputStyle()}
              />
            </label>
          ) : null}

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Restrict to location (optional)</div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Leave blank to match any bin"
              disabled={busy}
              style={inputStyle()}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={runPreview}
              disabled={busy}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "#111",
                background: "#111",
                color: "white",
                fontWeight: 950,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.65 : 1,
              }}
            >
              {busy ? "Parsing…" : "Preview removals"}
            </button>
          </div>
        </div>
      )}

      {step === "review" && preview && (
        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: C.border,
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: C.shadow,
            }}
          >
            <div style={{ padding: 10, background: C.bgSoft, fontWeight: 950, fontSize: 13 }}>
              {preview.filename}
              {preview.slip.warehouse_outbound ? ` · ${preview.slip.warehouse_outbound}` : ""}
              {preview.slip.sales_order ? ` · ${preview.slip.sales_order}` : ""}
            </div>
            {preview.parse_warnings?.length ? (
              <div style={{ padding: 10, fontSize: 12, background: "rgba(220, 53, 69, 0.06)" }}>
                {preview.parse_warnings.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
            ) : null}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", background: C.bgSoft, fontSize: 12, opacity: 0.85 }}>
                    <th style={{ padding: 10 }}>Status</th>
                    <th style={{ padding: 10 }}>SKU</th>
                    <th style={{ padding: 10 }}>Lot / serial</th>
                    <th style={{ padding: 10 }}>Qty</th>
                    <th style={{ padding: 10 }}>On-hand</th>
                    <th style={{ padding: 10 }}>Match / error</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.map((row, i) => {
                    const hist = row.history;
                  const hasHist =
                    !row.ok &&
                    hist &&
                    (hist.trace_rows.length > 0 || hist.movements.length > 0 || (hist.trace_at_other_locations?.length ?? 0) > 0);
                    return (
                      <Fragment key={`${row.sku}-${row.identifier}-${i}`}>
                        <tr style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: 10, fontWeight: 950 }}>{row.ok ? "Ready" : "Blocked"}</td>
                          <td style={{ padding: 10, fontWeight: 950 }}>{row.sku}</td>
                          <td style={{ padding: 10, fontWeight: 950 }}>{row.identifier}</td>
                          <td style={{ padding: 10 }}>{row.qty}</td>
                          <td style={{ padding: 10 }}>{row.preview?.prior_qty_on_hand ?? "—"}</td>
                          <td style={{ padding: 10, verticalAlign: "top" }}>
                            {row.ok ? (
                              row.preview?.matchPath
                            ) : (
                              <span style={{ color: "#b02a37", display: "block", lineHeight: 1.35 }}>{row.error ?? "—"}</span>
                            )}
                          </td>
                        </tr>
                        {hasHist ? (
                          <tr style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
                            <td colSpan={6} style={{ padding: "10px 12px 12px", fontSize: 12, background: "rgba(0,0,0,0.03)", lineHeight: 1.45 }}>
                              <div style={{ fontWeight: 950, marginBottom: 6 }}>History in portal</div>
                              {hist!.trace_at_other_locations?.length ? (
                                <div style={{ marginBottom: 8, opacity: 0.9 }}>
                                  Other bins with this identifier: <b>{hist!.trace_at_other_locations!.join(", ")}</b>
                                  {" — "}
                                  clear the location filter above and preview again if stock is there.
                                </div>
                              ) : null}
                              {hist!.trace_rows.length > 0 ? (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ fontWeight: 900, marginBottom: 4 }}>Lot / serial trace rows (includes qty 0)</div>
                                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {hist!.trace_rows.map((t) => (
                                      <li key={t.id}>
                                        Qty <b>{t.qty}</b>
                                        {t.location ? <> · loc {t.location}</> : null}
                                        {t.serial_number ? <> · SN {t.serial_number}</> : null}
                                        {t.lot_number && t.lot_number !== t.serial_number ? <> · Lot {t.lot_number}</> : null}
                                        {t.created_at ? <> · {fmtWhen(t.created_at)}</> : null}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {hist!.movements.length > 0 ? (
                                <div>
                                  <div style={{ fontWeight: 900, marginBottom: 4 }}>Recent inventory movements (this serial / lot / scan)</div>
                                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {hist!.movements.map((m) => (
                                      <li key={m.id}>
                                        {m.delta > 0 ? "+" : ""}
                                        {m.delta} units · {fmtWhen(m.created_at)}
                                        {m.reason ? <> · {m.reason}</> : null}
                                        {m.source ? (
                                          <>
                                            {" "}
                                            <span style={{ opacity: 0.75 }}>({m.source})</span>
                                          </>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Removal reason (confirm)</div>
              <select
                value={removeReasonPreset}
                onChange={(e) => setRemoveReasonPreset(e.target.value)}
                disabled={busy}
                style={inputStyle()}
              >
                {REMOVE_REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            {removeReasonPreset === "Other" ? (
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Describe reason</div>
                <input
                  value={removeReasonOther}
                  onChange={(e) => setRemoveReasonOther(e.target.value)}
                  disabled={busy}
                  style={inputStyle()}
                />
              </label>
            ) : null}
            {location.trim() ? (
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Location filter: <b>{location.trim()}</b> — use <b>Back</b> to change.
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={runCommit}
              disabled={busy || preview.summary.blocked > 0}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: preview.summary.blocked > 0 ? "rgba(0,0,0,0.2)" : "#b02a37",
                background: preview.summary.blocked > 0 ? "rgba(0,0,0,0.06)" : "#b02a37",
                color: preview.summary.blocked > 0 ? "rgba(0,0,0,0.45)" : "white",
                fontWeight: 950,
                cursor: busy || preview.summary.blocked > 0 ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Applying…" : "Confirm and remove from inventory"}
            </button>
            <button type="button" onClick={() => setStep("upload")} disabled={busy} style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 950 }}>
              Back
            </button>
            <button type="button" onClick={resetFlow} disabled={busy} style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 950 }}>
              Start over
            </button>
          </div>
        </div>
      )}

      {step === "done" && commitResult && (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 950 }}>Removed {commitResult.applied} unit line(s).</div>
          <button
            type="button"
            onClick={resetFlow}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "#111",
              background: "#111",
              color: "white",
              fontWeight: 950,
              alignSelf: "start",
            }}
          >
            Remove another slip
          </button>
        </div>
      )}
    </div>
  );
}
