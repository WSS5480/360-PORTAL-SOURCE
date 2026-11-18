"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { REMOVE_REASON_OPTIONS } from "@/lib/inventory/removeReasonOptions";
import { displayLotNumberOnly } from "@/lib/inventory/displayLotIdentifier";

function formatRecentAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

/** Compact timestamp for dense tables */
function formatRecentWhenShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const now = new Date();
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
    return d.toLocaleString(undefined, opts);
  } catch {
    return iso;
  }
}

function formatActorWho(p: { actor_name?: string | null; actor_email?: string | null }): { label: string; title: string } {
  const n = (p.actor_name ?? "").trim();
  const e = (p.actor_email ?? "").trim();
  const title = [n, e].filter(Boolean).join(" · ");
  if (n && e) return { label: `${n} · ${e}`, title };
  if (n) return { label: n, title: n };
  if (e) return { label: e, title: e };
  return { label: "—", title: "" };
}

type ReceiveResult =
  | {
      ok: true;
      lot_row_id: string | null;
      variant_id: string;
      sku: string;
      delta: number;
      prior_qty_on_hand: number;
      next_qty_on_hand: number;
      updated_at: string;

      lot_number?: string | null;
      serial_number?: string | null;
      expiration_date?: string | null;
      raw_scan?: string | null;
    }
  | { ok: false; error: string };

type VariantPickRow = {
  id: string;
  sku: string;
  size_label: string | null;
  product_name: string | null;
  qty_on_hand: number;
  is_active: boolean;
};

type VariantListResponse =
  | { ok: true; variants: VariantPickRow[] }
  | { ok: false; error: string };

type RemoveResult =
  | {
      ok: true;
      variant_id: string;
      sku: string;
      delta: number;
      prior_qty_on_hand: number;
      next_qty_on_hand: number;
      updated_at: string;
      lot_number?: string | null;
      serial_number?: string | null;
      expiration_date?: string | null;
      raw_scan?: string | null;
    }
  | { ok: false; error: string };

export type InventoryScanMode = "receive" | "remove";

/** Matches `db/migrations/20260403_inventory_locations_seed_360_warehouse.sql` — default bin for receives. */
const DEFAULT_STORAGE_LOCATION_NAME = "360 Medical Warehouse";

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
    if (ai === "01") out.gtin = val;
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

export default function InventoryScanClient(props: { prefillSku?: string | null; locationsNonce?: number; mode?: InventoryScanMode }) {
  const prefillSku = String(props.prefillSku ?? "").trim();
  const locationsNonce = props.locationsNonce ?? 0;
  const mode = props.mode ?? "receive";
  const isRemove = mode === "remove";

  const [sku, setSku] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerRows, setPickerRows] = useState<VariantPickRow[]>([]);
  const [pickerErr, setPickerErr] = useState<string | null>(null);

  const [rawScan, setRawScan] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState("Receiving scan-in");
  const [removeReasonPreset, setRemoveReasonPreset] = useState<string>(REMOVE_REASON_OPTIONS[0]);
  const [removeReasonOther, setRemoveReasonOther] = useState("");
  const [resetQtyToOne, setResetQtyToOne] = useState(true);
  const [busy, setBusy] = useState(false);

  const [locationNames, setLocationNames] = useState<string[]>([]);
  const [receiveLocation, setReceiveLocation] = useState("");
  /** User explicitly chose "Unassigned" so we do not re-apply the default warehouse on refresh. */
  const [userChoseUnassignedLocation, setUserChoseUnassignedLocation] = useState(false);

  const [manualOverrideOpen, setManualOverrideOpen] = useState(false);

  const [msg, setMsg] = useState<{ tone: "muted" | "ok" | "warn"; text: string } | null>(null);

  const [recent, setRecent] = useState<
    Array<{
      id?: string;
      at: string;
      sku: string;
      delta: number;
      prior: number;
      next: number;
      lot?: string | null;
      rawScan?: string | null;
      serial?: string | null;
      exp?: string | null;
      reason?: string | null;
      location?: string | null;
      actor_user_id?: string | null;
      actor_name?: string | null;
      actor_email?: string | null;
    }>
  >([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const skuRef = useRef<HTMLInputElement | null>(null);
  const rawRef = useRef<HTMLInputElement | null>(null);
  const pickerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadLocs() {
      try {
        const res = await fetch("/api/admin/inventory/locations", { method: "GET", cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok || cancelled) return;
        const locRows = (json.locations ?? []) as Array<{ name?: string | null }>;
        const names = locRows
          .map((x) => String(x?.name ?? "").trim())
          .filter((s): s is string => s.length > 0);
        setLocationNames([...new Set(names)].sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!cancelled) setLocationNames([]);
      }
    }
    void loadLocs();
    return () => {
      cancelled = true;
    };
  }, [locationsNonce]);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const mode = isRemove ? "remove" : "receive";
      const res = await fetch(`/api/admin/inventory/recent-movements?mode=${encodeURIComponent(mode)}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setRecent([]);
        return;
      }
      const rows = (json.rows ?? []) as Array<{
        id?: string;
        at: string;
        sku: string;
        delta: number;
        prior: number;
        next: number;
        lot: string | null;
        rawScan: string | null;
        serial: string | null;
        exp: string | null;
        reason: string | null;
        location: string | null;
        actor_user_id: string | null;
        actor_name: string | null;
        actor_email: string | null;
      }>;
      setRecent(rows);
    } catch {
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }, [isRemove]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (locationNames.length === 0 || userChoseUnassignedLocation) return;
    if (!locationNames.includes(DEFAULT_STORAGE_LOCATION_NAME)) return;
    setReceiveLocation((prev) => (prev === "" ? DEFAULT_STORAGE_LOCATION_NAME : prev));
  }, [locationNames, userChoseUnassignedLocation]);

  // ✅ apply prefill when it changes
  useEffect(() => {
    if (!prefillSku) return;
    setSku(prefillSku);
    setMsg({
      tone: "muted",
      text: isRemove
        ? `Ready to remove: ${prefillSku}. Scan/paste the label.`
        : `Ready to receive: ${prefillSku}. Scan/paste the label.`,
    });
    // clear label fields so they don't carry over from previous receive
    setRawScan("");
    setLotNumber("");
    setSerialNumber("");
    setExpirationDate("");
    setTimeout(() => rawRef.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillSku, isRemove]);

  const qtyValue = useMemo(() => safeInt(qty, 1), [qty]);

  async function loadPicker(q: string) {
    setPickerBusy(true);
    setPickerErr(null);
    try {
      const url = new URL("/api/admin/inventory/variants", window.location.origin);
      if (q.trim()) url.searchParams.set("q", q.trim());
      url.searchParams.set("onlyActive", "1");
      url.searchParams.set("limit", "500");

      const res = await fetch(url.toString(), { method: "GET" });
      const data: VariantListResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !data.ok) {
        const err = (data as any)?.error || `Request failed (${res.status})`;
        setPickerErr(err);
        setPickerRows([]);
        return;
      }

      setPickerRows((data.variants ?? []).slice(0, 500));
    } catch (e: any) {
      setPickerErr(e?.message ? String(e.message) : "Network error");
      setPickerRows([]);
    } finally {
      setPickerBusy(false);
    }
  }

  useEffect(() => {
    if (!pickerOpen) return;
    loadPicker(pickerQ);
    setTimeout(() => pickerInputRef.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const t = window.setTimeout(() => loadPicker(pickerQ), 180);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerQ, pickerOpen]);

  function selectSku(nextSku: string) {
    setSku(nextSku);
    setPickerOpen(false);
    setPickerQ("");
    setPickerErr(null);
    setMsg({
      tone: "muted",
      text: isRemove ? `Selected SKU: ${nextSku}. Now scan/paste the label to remove.` : `Selected SKU: ${nextSku}. Now scan/paste the label.`,
    });
    setTimeout(() => rawRef.current?.focus(), 0);
  }

  function applyGs1Parse() {
    const parsed = parseGs1FromParens(rawScan);
    const foundAny = !!(parsed.lot_number || parsed.serial_number || parsed.expiration_date || parsed.gtin);

    if (!foundAny) {
      setMsg({
        tone: "warn",
        text: "No GS1 fields detected. If your scanner outputs a different GS1 format, paste the exact output and we’ll support it.",
      });
      rawRef.current?.focus();
      return;
    }

    if (parsed.lot_number && !lotNumber.trim()) setLotNumber(parsed.lot_number);
    if (parsed.serial_number && !serialNumber.trim()) setSerialNumber(parsed.serial_number);
    if (parsed.expiration_date && !expirationDate.trim()) setExpirationDate(parsed.expiration_date);

    const parts: string[] = [];
    if (parsed.lot_number) parts.push(`LOT ${parsed.lot_number}`);
    if (parsed.serial_number) parts.push(`SN ${parsed.serial_number}`);
    if (parsed.expiration_date) parts.push(`EXP ${parsed.expiration_date}`);

    setMsg({ tone: "muted", text: `Parsed: ${parts.join(" · ") || "GS1 detected"}` });
  }

  async function receive() {
    const skuVal = sku.trim();
    if (!skuVal) {
      setMsg({ tone: "warn", text: "Scan/enter SKU first (or use Select SKU)." });
      skuRef.current?.focus();
      return;
    }

    const lotVal = lotNumber.trim() || null;
    const serialVal = serialNumber.trim() || null;
    const expVal = toIsoDateOnly(expirationDate.trim()) || null;
    const rawVal = rawScan.trim() || null;

    if (!lotVal && !serialVal && !rawVal) {
      setMsg({
        tone: "warn",
        text: "Receiving requires traceability. Scan/paste a label OR enter LOT/SN manually.",
      });
      rawRef.current?.focus();
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/inventory/receive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: skuVal,
          qty: qtyValue,
          reason: String(reason || "").trim() || null,
          raw_scan: rawVal,
          lot_number: lotVal,
          serial_number: serialVal,
          expiration_date: expVal,
          location: receiveLocation.trim() || null,
        }),
      });

      const data: ReceiveResult = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !data.ok) {
        const err = (data as any)?.error || `Request failed (${res.status})`;
        setMsg({ tone: "warn", text: err });
        skuRef.current?.focus();
        return;
      }

      setMsg({
        tone: "ok",
        text: `Received +${data.delta} for ${data.sku}. On-hand: ${data.prior_qty_on_hand} → ${data.next_qty_on_hand}`,
      });

      await loadRecent();

      setRawScan("");
      setLotNumber("");
      setSerialNumber("");
      setExpirationDate("");
      if (resetQtyToOne) setQty(1);

      rawRef.current?.focus();
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
      skuRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function removeScanOut() {
    const skuVal = sku.trim();
    if (!skuVal) {
      setMsg({ tone: "warn", text: "Scan/enter SKU first (or use Select SKU)." });
      skuRef.current?.focus();
      return;
    }

    const lotVal = lotNumber.trim() || null;
    const serialVal = serialNumber.trim() || null;
    const expVal = toIsoDateOnly(expirationDate.trim()) || null;
    const rawVal = rawScan.trim() || null;

    if (!lotVal && !serialVal && !rawVal) {
      setMsg({
        tone: "warn",
        text: "Removal requires traceability. Scan/paste a label OR enter LOT/SN manually.",
      });
      rawRef.current?.focus();
      return;
    }

    const reasonPreset = removeReasonPreset === "Other" ? "Other" : removeReasonPreset;
    const reasonOther = removeReasonPreset === "Other" ? removeReasonOther.trim() : "";

    if (reasonPreset === "Other" && !reasonOther) {
      setMsg({ tone: "warn", text: "Describe the reason when selecting Other." });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/inventory/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: skuVal,
          qty: qtyValue,
          reason_preset: reasonPreset,
          reason_other: reasonOther,
          raw_scan: rawVal,
          lot_number: lotVal,
          serial_number: serialVal,
          expiration_date: expVal,
          location: receiveLocation.trim() || null,
        }),
      });

      const data: RemoveResult = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !data.ok) {
        const err = (data as any)?.error || `Request failed (${res.status})`;
        setMsg({ tone: "warn", text: err });
        skuRef.current?.focus();
        return;
      }

      setMsg({
        tone: "ok",
        text: `Removed ${Math.abs(data.delta)} for ${data.sku}. On-hand: ${data.prior_qty_on_hand} → ${data.next_qty_on_hand}`,
      });

      await loadRecent();

      setRawScan("");
      setLotNumber("");
      setSerialNumber("");
      setExpirationDate("");
      if (resetQtyToOne) setQty(1);

      rawRef.current?.focus();
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
      skuRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function onSkuKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      rawRef.current?.focus();
    }
  }

  function onRawKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (rawScan.includes("(") && rawScan.includes(")")) applyGs1Parse();
      if (isRemove) void removeScanOut();
      else void receive();
    }
  }

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
          borderWidth: 0,
          borderStyle: "solid",
          borderColor: C.borderSubtle,
          borderBottomWidth: 1,
          fontWeight: 950,
        }}
      >
        {isRemove ? "Remove (Scan-out)" : "Receive (Scan-in)"}
      </div>

      <div style={{ padding: 12, display: "grid", gap: 12 }}>
        {msg ? (
          <div style={pillStyle(msg.tone)}>{msg.text}</div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {isRemove
              ? "Scan SKU, pick a removal reason, then scan the label (or enter LOT/SN). Optional: restrict to a storage location."
              : "Scan SKU, then scan the label."}
          </div>
        )}

        <div style={{ display: "grid", gap: 10, maxWidth: 980 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.15fr) minmax(76px, 0.2fr) minmax(0, 1fr)",
              gap: 10,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>SKU (required)</div>
              <input
                ref={skuRef}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                onKeyDown={onSkuKeyDown}
                placeholder="Scan SKU here…"
                autoFocus
                style={{ ...inputStyle(), fontSize: 16, fontWeight: 950, letterSpacing: 0.2 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Qty</div>
              <input
                value={String(qtyValue)}
                onChange={(e) => setQty(safeInt(e.target.value, 1))}
                type="number"
                min={1}
                step="1"
                style={{ ...inputStyle(), fontSize: 16, fontWeight: 950 }}
              />
            </label>

            <label id="receive-storage-location" style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>Storage location</div>
              <select
                value={receiveLocation}
                onChange={(e) => {
                  const v = e.target.value;
                  setUserChoseUnassignedLocation(v === "");
                  setReceiveLocation(v);
                }}
                disabled={busy}
                style={{ ...inputStyle(), cursor: busy ? "not-allowed" : "pointer", fontWeight: 850 }}
              >
                <option value="">Unassigned</option>
                {locationNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {locationNames.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.45,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(234,179,8,0.45)",
                background: "rgba(254,243,199,0.35)",
                color: "#78350f",
                fontWeight: 750,
              }}
            >
              <b>No storage bins yet.</b> Add names under <b>Inventory locations</b> at the top of this page, then choose one
              here so receives land in the right bin.
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.65 }}>
              Bins are managed in <b>Inventory locations</b> above. Same spelling groups lots together.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                setPickerOpen((v) => !v);
                setMsg(null);
              }}
              disabled={busy}
              style={{ ...buttonStyle("default"), cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.65 : 1 }}
            >
              {pickerOpen ? "Close SKU Picker" : "Select SKU"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSku("");
                setMsg({ tone: "muted", text: "Cleared SKU." });
                skuRef.current?.focus();
              }}
              disabled={busy}
              style={{ ...buttonStyle("muted"), cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.65 : 1 }}
            >
              Clear SKU
            </button>
          </div>

          {pickerOpen && (
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 950 }}>SKU Picker</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{pickerBusy ? "Loading…" : `${pickerRows.length} variant(s)`}</div>
              </div>

              <input ref={pickerInputRef} value={pickerQ} onChange={(e) => setPickerQ(e.target.value)} placeholder="Search by SKU…" style={inputStyle()} />

              {pickerErr && <div style={{ color: "crimson", fontWeight: 900 }}>{pickerErr}</div>}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                      <th style={{ padding: 10 }}>SKU</th>
                      <th style={{ padding: 10 }}>Product</th>
                      <th style={{ padding: 10 }}>Size</th>
                      <th style={{ padding: 10, width: 120 }}>On-hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerRows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => selectSku(row.sku)}
                        style={{
                          borderWidth: 0,
                          borderStyle: "solid",
                          borderColor: C.borderSubtle,
                          borderTopWidth: 1,
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ padding: 10, fontWeight: 950 }}>{row.sku}</td>
                        <td style={{ padding: 10, opacity: 0.9 }}>{row.product_name ?? "—"}</td>
                        <td style={{ padding: 10, opacity: 0.85 }}>{row.size_label ?? "—"}</td>
                        <td style={{ padding: 10, fontWeight: 950 }}>{row.qty_on_hand ?? 0}</td>
                      </tr>
                    ))}

                    {!pickerBusy && pickerRows.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 12, opacity: 0.75 }}>
                          No matches.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 12, opacity: 0.65 }}>Picker is for lookup. Daily receiving should still be scan-first.</div>
            </div>
          )}

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Label scan (raw)</div>
            <input
              ref={rawRef}
              value={rawScan}
              onChange={(e) => setRawScan(e.target.value)}
              onKeyDown={onRawKeyDown}
              placeholder="Scan/paste label… e.g. (01)...(10)...(17)...(21)..."
              style={inputStyle()}
            />
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Press Enter to {isRemove ? "remove" : "receive"}
              {rawScan.includes("(") && rawScan.includes(")")
                ? " — GS1-style data in the field will be parsed on submit."
                : "."}
            </div>
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => (isRemove ? void removeScanOut() : void receive())}
              disabled={busy}
              style={{
                ...buttonStyle("primary"),
                ...(isRemove
                  ? { borderColor: "#842029", background: "#842029" }
                  : {}),
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.65 : 1,
              }}
            >
              {busy ? (isRemove ? "Removing…" : "Receiving…") : isRemove ? "Remove from inventory" : "Receive"}
            </button>

            <button
              type="button"
              onClick={() => {
                setRawScan("");
                setLotNumber("");
                setSerialNumber("");
                setExpirationDate("");
                setMsg({ tone: "muted", text: "Cleared label fields." });
                rawRef.current?.focus();
              }}
              disabled={busy}
              style={{ ...buttonStyle("muted"), cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.65 : 1 }}
            >
              Clear Label
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
            <button
              type="button"
              onClick={() => setManualOverrideOpen((v) => !v)}
              disabled={busy}
              aria-expanded={manualOverrideOpen}
              style={{
                ...buttonStyle("default"),
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                fontWeight: 950,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.65 : 1,
              }}
            >
              <span>Manual entry (LOT / Serial / EXP)</span>
              <span style={{ opacity: 0.75, fontSize: 12 }} aria-hidden>
                {manualOverrideOpen ? "▼" : "▶"}
              </span>
            </button>

            {manualOverrideOpen ? (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.7fr)", gap: 10 }}>
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>LOT</div>
                  <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="e.g. 625985" style={inputStyle()} />
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Serial</div>
                  <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="e.g. 625985003" style={inputStyle()} />
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>EXP</div>
                  <input value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} placeholder="YYYY-MM-DD or YYMMDD" style={inputStyle()} />
                </label>
              </div>
            ) : null}

            <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13 }}>
              <input type="checkbox" checked={resetQtyToOne} onChange={(e) => setResetQtyToOne(e.target.checked)} />
              Reset qty to 1 after each {isRemove ? "removal" : "receive"}
            </label>

            {!isRemove ? (
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Reason / Note</div>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Receiving scan-in" style={inputStyle()} />
              </label>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Reason for removal (required)</div>
                  <select
                    value={removeReasonPreset}
                    onChange={(e) => setRemoveReasonPreset(e.target.value)}
                    disabled={busy}
                    style={{ ...inputStyle(), cursor: busy ? "not-allowed" : "pointer" }}
                  >
                    {REMOVE_REASON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                {removeReasonPreset === "Other" && (
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Describe</div>
                    <input
                      value={removeReasonOther}
                      onChange={(e) => setRemoveReasonOther(e.target.value)}
                      placeholder="e.g. Sent to vendor for credit"
                      style={inputStyle()}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ borderWidth: 0, borderStyle: "solid", borderColor: C.borderSubtle, borderTopWidth: 1, paddingTop: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>{isRemove ? "Recent removals" : "Recent receives"}</div>
          {recentLoading ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>Loading…</div>
          ) : recent.length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>{isRemove ? "No removals yet." : "No scans yet."}</div>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 720,
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 11, opacity: 0.72, fontWeight: 900 }}>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, whiteSpace: "nowrap" }}>When</th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, minWidth: 140, maxWidth: 200 }}>
                      Signed in as
                    </th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, whiteSpace: "nowrap" }}>SKU</th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, whiteSpace: "nowrap" }}>Δ</th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, whiteSpace: "nowrap" }}>On-hand</th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, maxWidth: 120 }}>Bin</th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, maxWidth: 120 }}>Lot</th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, maxWidth: 110 }}>Serial</th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, whiteSpace: "nowrap" }}>Exp</th>
                    <th style={{ padding: "5px 8px", borderBottom: `1px solid ${C.borderSubtle}`, minWidth: 100 }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, idx) => {
                    const who = formatActorWho(r);
                    return (
                      <tr
                        key={r.id ? `${r.id}` : `${r.at}-${r.sku}-${idx}`}
                        style={{ borderBottom: `1px solid ${C.borderSubtle}`, verticalAlign: "top" }}
                      >
                        <td style={{ padding: "5px 8px", fontWeight: 800, whiteSpace: "nowrap" }} title={formatRecentAt(r.at)}>
                          {formatRecentWhenShort(r.at)}
                        </td>
                        <td
                          style={{
                            padding: "5px 8px",
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={who.title || who.label}
                        >
                          {who.label}
                        </td>
                        <td style={{ padding: "5px 8px", fontWeight: 950 }}>{r.sku}</td>
                        <td style={{ padding: "5px 8px", fontWeight: 900, whiteSpace: "nowrap" }}>
                          {r.delta < 0 ? r.delta : `+${r.delta}`}
                        </td>
                        <td style={{ padding: "5px 8px", whiteSpace: "nowrap", opacity: 0.92 }}>
                          {r.prior} → {r.next}
                        </td>
                        <td
                          style={{
                            padding: "5px 8px",
                            maxWidth: 120,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={r.location ?? ""}
                        >
                          {r.location ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "5px 8px",
                            maxWidth: 120,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={displayLotNumberOnly(r.lot, r.rawScan)}
                        >
                          {displayLotNumberOnly(r.lot, r.rawScan)}
                        </td>
                        <td
                          style={{
                            padding: "5px 8px",
                            maxWidth: 110,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={r.serial ?? ""}
                        >
                          {r.serial ?? "—"}
                        </td>
                        <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>{r.exp ?? "—"}</td>
                        <td
                          style={{
                            padding: "5px 8px",
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            opacity: 0.9,
                          }}
                          title={r.reason ?? ""}
                        >
                          {r.reason ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
