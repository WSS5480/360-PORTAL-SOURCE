"use client";

import { useMemo, useRef, useState } from "react";

type PickRow = {
  id: string;
  description: string;
  variant_id: string;
  required_qty: number;
  picked_qty: number;
  uom: string | null;
  on_hand: number;
};

const C = {
  border: "rgba(0,0,0,0.10)",
  borderSubtle: "rgba(0,0,0,0.08)",
  borderInput: "rgba(0,0,0,0.18)",
  bgSoft: "rgba(0,0,0,0.02)",
  bgSofter: "rgba(0,0,0,0.03)",
  shadow: "0 10px 26px rgba(0,0,0,0.06)",
};

function pillStyle(tone: "muted" | "ok" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.12)",
    whiteSpace: "nowrap",
  };
  if (tone === "ok") return { ...base, background: "rgba(25, 135, 84, 0.12)" };
  if (tone === "warn") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return { ...base, background: "rgba(0,0,0,0.04)", opacity: 0.92 };
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "12px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.borderInput,
    fontWeight: 900,
    fontSize: 14,
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    background: "white",
  };
}

function buttonStyle(kind: "primary" | "default" | "muted"): React.CSSProperties {
  if (kind === "primary") {
    return {
      padding: "10px 12px",
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#111",
      background: "#111",
      color: "white",
      fontWeight: 950,
    };
  }
  if (kind === "muted") {
    return {
      padding: "10px 12px",
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "rgba(0,0,0,0.14)",
      background: C.bgSofter,
      fontWeight: 950,
    };
  }
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.14)",
    background: "white",
    fontWeight: 950,
  };
}

function safeInt(v: unknown, fallback: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function toIsoDateOnly(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  if (/^\d{6}$/.test(raw)) {
    const yy = raw.slice(0, 2);
    const mm = raw.slice(2, 4);
    const dd = raw.slice(4, 6);
    return `20${yy}-${mm}-${dd}`;
  }
  return null;
}

// (01)GTIN(10)LOT(17)YYMMDD(21)SERIAL
function parseGs1FromParens(raw: string): {
  gtin?: string;
  lot_number?: string;
  expiration_date?: string;
  serial_number?: string;
} {
  const s = String(raw || "").trim();
  if (!s) return {};
  if (!(s.includes("(") && s.includes(")"))) return {};

  const out: Record<string, string> = {};
  const re = /\((\d{2})\)([^()]*)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(s))) {
    const ai = m[1];
    const val = (m[2] ?? "").trim();
    if (ai === "01") out.gtin = val.replace(/\D/g, "");
    if (ai === "10") out.lot_number = val;
    if (ai === "21") out.serial_number = val;
    if (ai === "17") {
      const vv = val.replace(/\D/g, "");
      const iso = toIsoDateOnly(vv);
      if (iso) out.expiration_date = iso;
    }
  }
  return out;
}

function remainingQty(row: PickRow) {
  return Math.max(0, Number(row.required_qty || 0) - Number(row.picked_qty || 0));
}

export default function AdminFulfillmentPickClient(props: {
  fulfillmentId: string;
  isOpen: boolean;
  items: PickRow[];
}) {
  const { fulfillmentId, isOpen } = props;

  const items = useMemo(() => {
    // ensure numbers
    return (props.items ?? []).map((r) => ({
      ...r,
      required_qty: Number(r.required_qty || 0),
      picked_qty: Number(r.picked_qty || 0),
      on_hand: Number(r.on_hand || 0),
    }));
  }, [props.items]);

  const firstLineId = String(items[0]?.id ?? "");

  const [mode, setMode] = useState<"scan" | "manual">("scan");

  const [rawScan, setRawScan] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [note, setNote] = useState("");

  const [manualLineId, setManualLineId] = useState(firstLineId);

  const [lotNumber, setLotNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "muted" | "ok" | "warn"; text: string } | null>(null);

  const rawRef = useRef<HTMLInputElement | null>(null);

  const qtyValue = useMemo(() => safeInt(qty, 1), [qty]);

  function applyGs1Parse() {
    const parsed = parseGs1FromParens(rawScan);
    const foundAny = !!(parsed.lot_number || parsed.serial_number || parsed.expiration_date || parsed.gtin);

    if (!foundAny) {
      setMsg({
        tone: "warn",
        text: "No GS1 fields detected in parentheses format. Paste the scanner output and we’ll extend parsing if needed.",
      });
      rawRef.current?.focus();
      return;
    }

    if (parsed.lot_number && !lotNumber.trim()) setLotNumber(parsed.lot_number);
    if (parsed.serial_number && !serialNumber.trim()) setSerialNumber(parsed.serial_number);
    if (parsed.expiration_date && !expirationDate.trim()) setExpirationDate(parsed.expiration_date);

    const parts: string[] = [];
    if (parsed.gtin) parts.push(`GTIN ${parsed.gtin}`);
    if (parsed.lot_number) parts.push(`LOT ${parsed.lot_number}`);
    if (parsed.serial_number) parts.push(`SN ${parsed.serial_number}`);
    if (parsed.expiration_date) parts.push(`EXP ${parsed.expiration_date}`);

    setMsg({ tone: "muted", text: `Parsed: ${parts.join(" · ") || "GS1 detected"}` });
  }

  async function postPick(body: FormData) {
    const url = `/api/admin/fulfillments/${encodeURIComponent(fulfillmentId)}/pick`;
    const res = await fetch(url, { method: "POST", body });
    if (res.redirected) {
      window.location.href = res.url;
      return;
    }
    const data = await res.json().catch(() => null);
    const err = (data as any)?.error || `Pick failed (${res.status})`;
    setMsg({ tone: "warn", text: err });
  }

  async function pickScan() {
    if (!isOpen) {
      setMsg({ tone: "warn", text: "Fulfillment is closed." });
      return;
    }
    const raw = rawScan.trim();
    if (!raw) {
      setMsg({ tone: "warn", text: "Scan/paste a label first." });
      rawRef.current?.focus();
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const fd = new FormData();
      fd.set("raw_scan", raw);
      fd.set("qty", String(qtyValue));
      if (note.trim()) fd.set("note", note.trim());

      // optional traceability fields (stored in inventory_movements.meta via your pick route)
      if (lotNumber.trim()) fd.set("lot_number", lotNumber.trim());
      if (serialNumber.trim()) fd.set("serial_number", serialNumber.trim());
      if (expirationDate.trim()) fd.set("expiration_date", expirationDate.trim());

      await postPick(fd);

      // best-effort: clear scan box after success redirect doesn’t happen
      setRawScan("");
      rawRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function pickManual() {
    if (!isOpen) {
      setMsg({ tone: "warn", text: "Fulfillment is closed." });
      return;
    }
    if (!manualLineId) {
      setMsg({ tone: "warn", text: "Select a pick line." });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("fulfillment_item_id", manualLineId);
      fd.set("qty", String(qtyValue));
      if (note.trim()) fd.set("note", note.trim());

      await postPick(fd);
    } finally {
      setBusy(false);
    }
  }

  function onRawKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (rawScan.includes("(") && rawScan.includes(")")) applyGs1Parse();
      pickScan();
    }
  }

  const selectedManual = items.find((x) => String(x.id) === String(manualLineId)) ?? null;

  return (
    <div
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: C.border,
        borderRadius: 18,
        background: "white",
        boxShadow: C.shadow,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: `1px solid ${C.borderSubtle}`,
          fontWeight: 950,
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>Pick (scan-out)</div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setMode("scan")}
            style={{
              ...buttonStyle(mode === "scan" ? "primary" : "default"),
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.65 : 1,
            }}
            disabled={busy}
          >
            Scan
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            style={{
              ...buttonStyle(mode === "manual" ? "primary" : "default"),
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.65 : 1,
            }}
            disabled={busy}
          >
            Manual
          </button>
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 12 }}>
        {msg ? (
          <div style={pillStyle(msg.tone)}>{msg.text}</div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {mode === "scan"
              ? "Scan a barcode/GS1 label. Press Enter to pick."
              : "Select a line and enter qty to pick."}
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.35fr)", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Qty</div>
              <input
                value={String(qtyValue)}
                onChange={(e) => setQty(safeInt(e.target.value, 1))}
                type="number"
                min={1}
                step="1"
                disabled={!isOpen || busy}
                style={{ ...inputStyle(), fontSize: 16, fontWeight: 950, opacity: !isOpen ? 0.7 : 1 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Note (optional)</div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!isOpen || busy}
                placeholder="optional"
                style={{ ...inputStyle(), opacity: !isOpen ? 0.7 : 1 }}
              />
            </label>
          </div>

          {mode === "scan" ? (
            <>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Label scan (raw)</div>
                <input
                  ref={rawRef}
                  value={rawScan}
                  onChange={(e) => setRawScan(e.target.value)}
                  onKeyDown={onRawKeyDown}
                  disabled={!isOpen || busy}
                  placeholder="Scan/paste label… e.g. (01)...(10)...(17)...(21)..."
                  style={{ ...inputStyle(), opacity: !isOpen ? 0.7 : 1 }}
                />
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Press Enter to pick. If GS1 parentheses data is present, we parse it.
                </div>
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={applyGs1Parse}
                  disabled={!isOpen || busy}
                  style={{
                    ...buttonStyle("default"),
                    cursor: !isOpen || busy ? "not-allowed" : "pointer",
                    opacity: !isOpen || busy ? 0.65 : 1,
                  }}
                >
                  Parse GS1
                </button>

                <button
                  type="button"
                  onClick={pickScan}
                  disabled={!isOpen || busy}
                  style={{
                    ...buttonStyle("primary"),
                    cursor: !isOpen || busy ? "not-allowed" : "pointer",
                    opacity: !isOpen || busy ? 0.65 : 1,
                  }}
                >
                  {busy ? "Picking…" : "Pick"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRawScan("");
                    setLotNumber("");
                    setSerialNumber("");
                    setExpirationDate("");
                    setMsg({ tone: "muted", text: "Cleared scan fields." });
                    rawRef.current?.focus();
                  }}
                  disabled={busy}
                  style={{ ...buttonStyle("muted"), cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.65 : 1 }}
                >
                  Clear
                </button>
              </div>

              <div
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: C.borderSubtle,
                  borderRadius: 14,
                  padding: 12,
                  background: C.bgSoft,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 950 }}>Traceability (optional)</div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.7fr)", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>LOT</div>
                    <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="e.g. 625985" disabled={!isOpen || busy} style={inputStyle()} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Serial</div>
                    <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="e.g. 625985003" disabled={!isOpen || busy} style={inputStyle()} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>EXP</div>
                    <input value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} placeholder="YYYY-MM-DD or YYMMDD" disabled={!isOpen || busy} style={inputStyle()} />
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Pick line</div>
                <select
                  value={manualLineId}
                  onChange={(e) => setManualLineId(e.target.value)}
                  disabled={!isOpen || busy}
                  style={{ ...inputStyle(), fontSize: 14, fontWeight: 950, opacity: !isOpen ? 0.7 : 1 }}
                >
                  {items.map((it) => {
                    const rem = remainingQty(it);
                    return (
                      <option key={it.id} value={it.id}>
                        {String(it.description).slice(0, 60)} · remaining {rem}
                      </option>
                    );
                  })}
                </select>
              </label>

              {selectedManual ? (
                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.45 }}>
                  On hand: <b>{selectedManual.on_hand}</b> · Required: <b>{selectedManual.required_qty}</b> · Picked: <b>{selectedManual.picked_qty}</b>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={pickManual}
                  disabled={!isOpen || busy}
                  style={{
                    ...buttonStyle("primary"),
                    cursor: !isOpen || busy ? "not-allowed" : "pointer",
                    opacity: !isOpen || busy ? 0.65 : 1,
                  }}
                >
                  {busy ? "Picking…" : "Pick"}
                </button>
              </div>
            </>
          )}

          {!isOpen ? <div style={pillStyle("warn")}>Fulfillment is closed. Picking is disabled.</div> : null}
        </div>
      </div>
    </div>
  );
}
