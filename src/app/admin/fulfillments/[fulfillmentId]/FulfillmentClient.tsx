// src/app/admin/fulfillments/[fulfillmentId]/FulfillmentClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatStatusLabel } from "@/lib/formatStatusLabel";

type ItemRow = {
  id: string;
  order_item_id: string;
  description: string;
  variant_id: string;
  required_qty: number;
  picked_qty: number;
  uom: string;
  sort_order?: number | null;
};

type LotRow = {
  id: string;
  variant_id: string;
  lot_number: string;
  serial_number: string | null;
  expiration_date: string | null;
  qty: number;
  location: string | null;
  created_at: string;
};

type LotsResponse = { ok: true; lots: LotRow[] } | { ok: false; error: string };

type PickResponse =
  | {
      ok: true;
      fulfillment_id: string;
      fulfillment_item_id: string;
      variant_id: string;
      qty_picked: number;
      prior_on_hand: number;
      next_on_hand: number;
      prior_picked_qty: number;
      next_picked_qty: number;
      used_lot_row_id?: string | null;
      pick_logged?: boolean;
      pick_log_error?: string | null;
    }
  | { ok: false; error: string };

type PickHistoryRow = {
  id: string;
  fulfillment_item_id: string;
  variant_id: string;
  qty: number;
  lot_row_id: string | null;

  lot_number: string | null;
  serial_number: string | null;
  expiration_date: string | null;
  location: string | null;

  raw_scan: string | null;
  note: string | null;
  is_undo: boolean;
  created_at: string;
  /** false when reconstructed from inventory_movements (undo API has no pick row) */
  undoable?: boolean;
};

type PicksListResponse = { ok: true; picks: PickHistoryRow[] } | { ok: false; error: string };

type UndoResponse =
  | {
      ok: true;
      fulfillment_id: string;
      fulfillment_item_id: string;
      variant_id: string;
      qty_undone: number;
      prior_on_hand: number;
      next_on_hand: number;
      prior_picked_qty: number;
      next_picked_qty: number;
    }
  | { ok: false; error: string };

type FulfillmentSource = "INVENTORY" | "DROPSHIP" | string;

/** DROPSHIP trace context */
type TraceContextItem = {
  id: string;
  variant_id: string;
  description: string;
  required_qty: number;
  uom: string;
};

type TraceContextRow = {
  id: string;
  fulfillment_item_id: string;
  variant_id: string;
  lot_number: string | null;
  serial_number: string | null;
  expiration_date: string | null;
  qty: number;
  created_at: string;
};

type TraceContextResponse =
  | { ok: true; items: TraceContextItem[]; traces: TraceContextRow[] }
  | { ok: false; error: string };

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function badge(bg: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    background: bg,
    whiteSpace: "nowrap",
  };
}

function inputStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.15)",
    fontSize: 14,
    fontWeight: 900,
    width: "100%",
    boxSizing: "border-box",
    background: disabled ? "rgba(0,0,0,0.03)" : "white",
    opacity: disabled ? 0.75 : 1,
  };
}

function buttonStyle(primary?: boolean, disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.10)" : primary ? "#111" : "white",
    color: disabled ? "rgba(0,0,0,0.55)" : primary ? "white" : "black",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function fmtWhen(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString();
}

function monoSmall(): React.CSSProperties {
  return {
    fontSize: 11,
    opacity: 0.65,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  };
}

function sectionCard(): React.CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 16,
    background: "white",
    overflow: "hidden",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
  };
}

function sectionHeader(): React.CSSProperties {
  return {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    fontWeight: 950,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  };
}

function pillTag(text: string, tone: "ok" | "warn" | "muted"): React.CSSProperties {
  const bg =
    tone === "ok"
      ? "rgba(25,135,84,0.10)"
      : tone === "warn"
      ? "rgba(255,153,0,0.14)"
      : "rgba(0,0,0,0.05)";
  const color =
    tone === "ok"
      ? "rgba(25,135,84,1)"
      : tone === "warn"
      ? "rgba(180,90,0,1)"
      : "rgba(0,0,0,0.75)";
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.10)",
    background: bg,
    color,
    whiteSpace: "nowrap",
  };
}

function historyLotLabel(r: PickHistoryRow) {
  if (r.serial_number) return `SN ${r.serial_number}`;
  if (r.lot_number) return `LOT ${r.lot_number}`;
  if (r.raw_scan) return `Scan`;
  return "—";
}

function historyLotSubLabel(r: PickHistoryRow) {
  if (r.raw_scan && !r.lot_number && !r.serial_number) return r.raw_scan;

  const parts: string[] = [];
  if (r.lot_number && r.serial_number) parts.push(`LOT ${r.lot_number}`);
  if (r.expiration_date) parts.push(`EXP ${r.expiration_date}`);
  if (r.location) parts.push(`${r.location}`);
  return parts.join(" · ");
}

function normalizeSource(v: any): "INVENTORY" | "DROPSHIP" | "UNKNOWN" {
  const s = safeStr(v).toUpperCase();
  if (s === "INVENTORY") return "INVENTORY";
  if (s === "DROPSHIP") return "DROPSHIP";
  return "UNKNOWN";
}

function traceLabel(t: TraceContextRow) {
  if (t.serial_number) return `SN ${t.serial_number}`;
  if (t.lot_number) return `LOT ${t.lot_number}`;
  return "—";
}

function traceSubLabel(t: TraceContextRow) {
  const parts: string[] = [];
  if (t.lot_number && t.serial_number) parts.push(`LOT ${t.lot_number}`);
  if (t.expiration_date) parts.push(`EXP ${t.expiration_date}`);
  return parts.join(" · ");
}

function scrollToTraceability() {
  const ids = ["dropship-traceability", "dropship-trace", "traceability"];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
  }
  return false;
}

export default function FulfillmentClient(props: {
  fulfillmentId: string;
  isOpen: boolean;
  orderId: string;
  items: ItemRow[];
  onHandByVariant: Record<string, number>;

  // ✅ wire from fulfillments.fulfillment_source (safe optional)
  fulfillmentSource?: FulfillmentSource;

  // optional niceties
  dropshipStatus?: string | null;
  dropshipVendorName?: string | null;
}) {
  const router = useRouter();
  const prevAllReady = useRef<boolean | null>(null);
  const [openLineId, setOpenLineId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn" | "muted"; text: string } | null>(null);

  const [pickedOverride, setPickedOverride] = useState<Record<string, number>>({});
  const [onHandOverride, setOnHandOverride] = useState<Record<string, number>>({});
  const [historyNonce, setHistoryNonce] = useState(0);
  const [dropshipByVariant, setDropshipByVariant] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  // Mixed fulfillment support (split selected lines into a new fulfillment)
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [dropshipQtyById, setDropshipQtyById] = useState<Record<string, string>>({});
  const [dropshipPanelId, setDropshipPanelId] = useState<string>("");
  const [dropshipBusy, setDropshipBusy] = useState(false);
  const [splitBusy, setSplitBusy] = useState(false);

  const source = normalizeSource(props.fulfillmentSource);
  const dropshipMode = source === "DROPSHIP";
  const splitTarget: "INVENTORY" | "DROPSHIP" = dropshipMode ? "INVENTORY" : "DROPSHIP";
  const viewMode: "OVERVIEW" = "OVERVIEW";

  // Inventory picking allowed only if OPEN and not dropship
  const canPickInventory = props.isOpen && !dropshipMode;

  const onHandByVariant = useMemo(
    () => ({ ...props.onHandByVariant, ...onHandOverride }),
    [props.onHandByVariant, onHandOverride]
  );

  const rows = useMemo(() => {
    return props.items.map((it) => ({
      ...it,
      picked_qty: pickedOverride[it.id] ?? it.picked_qty,
    }));
  }, [props.items, pickedOverride]);

  useEffect(() => {
    async function loadDropshipTotals() {
      try {
        const res = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/dropship-items`, {
          headers: { accept: "application/json" },
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok && json?.items) {
          setDropshipByVariant(json.items);
        }
      } catch {}
    }
    loadDropshipTotals();
  }, [props.orderId]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const selectedItemIds = useMemo(() => {
    return Object.entries(selectedIds)
      .filter(([, v]) => !!v)
      .map(([id]) => id);
  }, [selectedIds]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("fulfillment-split-selection", { detail: { count: selectedItemIds.length } }));
  }, [selectedItemIds.length]);

  useEffect(() => {
    if (selectedItemIds.length === 0) return;
    ensureDropshipPanel().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemIds.length]);

  async function ensureDropshipPanel(): Promise<string> {
    if (dropshipPanelId) return dropshipPanelId;
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/fulfillment/dropship`, {
      method: "POST",
      headers: { accept: "application/json" },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data?.fulfillment_id) {
      throw new Error(data?.error || `Failed to create dropship fulfillment (${res.status})`);
    }
    const id = String(data.fulfillment_id);
    setDropshipPanelId(id);
    try {
      localStorage.setItem("dropship_fulfillment_id", id);
    } catch {}
    window.dispatchEvent(new CustomEvent("dropship-panel-open", { detail: { fulfillmentId: id } }));
    return id;
  }

  async function assignDropshipQty(itemId: string, qtyRaw: string) {
    const qty = Math.max(0, Math.floor(safeNum(qtyRaw)));
    const row = rowById.get(itemId);
    if (!row) {
      setMsg({ tone: "muted", text: "Line not found." });
      return;
    }

    if (qty === 0) {
      setDropshipBusy(true);
      setMsg(null);
      try {
        const toId = await ensureDropshipPanel();
        const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(toId)}/dropship/items`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            items: [
              {
                variant_id: row.variant_id,
                order_item_id: row.order_item_id,
                description: row.description,
                uom: row.uom,
                sort_order: row.sort_order ?? null,
                qty: 0,
                absolute: true,
              },
            ],
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || `Clear failed (${res.status})`);
        window.dispatchEvent(new CustomEvent("dropship-panel-open", { detail: { fulfillmentId: toId } }));
        try {
          localStorage.setItem("dropship_fulfillment_id", toId);
        } catch {}
        setMsg({ tone: "ok", text: "Dropship assignment cleared — you can pick from inventory for this line." });
        setDropshipQtyById((prev) => ({ ...prev, [itemId]: "" }));
        try {
          const res2 = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/dropship-items`, {
            headers: { accept: "application/json" },
          });
          const json2 = await res2.json().catch(() => null);
          if (res2.ok && json2?.ok && json2?.items) {
            setDropshipByVariant(json2.items);
          }
        } catch {}
      } catch (e: any) {
        setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Failed to clear dropship qty." });
      } finally {
        setDropshipBusy(false);
      }
      return;
    }

    {
      const remaining = Math.max(0, safeNum(row.required_qty) - safeNum(row.picked_qty));
      if (qty > remaining) {
        setMsg({ tone: "warn", text: "Dropship qty exceeds remaining quantity." });
        return;
      }
    }
    setDropshipBusy(true);
    setMsg(null);
    try {
      const toId = await ensureDropshipPanel();
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(toId)}/dropship/items`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          items: [
            {
              variant_id: row?.variant_id,
              order_item_id: row?.order_item_id,
              description: row?.description,
              uom: row?.uom,
              sort_order: row?.sort_order ?? null,
              qty,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Split failed (${res.status})`);
      window.dispatchEvent(new CustomEvent("dropship-panel-open", { detail: { fulfillmentId: toId } }));
      try {
        localStorage.setItem("dropship_fulfillment_id", toId);
      } catch {}
      setMsg({ tone: "ok", text: "Dropship quantity assigned." });
      try {
        const res2 = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/dropship-items`, {
          headers: { accept: "application/json" },
        });
        const json2 = await res2.json().catch(() => null);
        if (res2.ok && json2?.ok && json2?.items) {
          setDropshipByVariant(json2.items);
        }
      } catch {}
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Failed to assign dropship qty." });
    } finally {
      setDropshipBusy(false);
    }
  }

  const selectedRows = useMemo(() => {
    const m = new Map(rows.map((r) => [r.id, r]));
    return selectedItemIds.map((id) => m.get(id)).filter(Boolean) as ItemRow[];
  }, [rows, selectedItemIds]);

  const selectedHasPicked = useMemo(() => {
    return selectedRows.some((r) => safeNum(r.picked_qty) > 0);
  }, [selectedRows]);

  const allSelected = useMemo(() => {
    if (!rows.length) return false;
    return rows.every((r) => !!selectedIds[r.id]);
  }, [rows, selectedIds]);

  function toggleAll(checked: boolean) {
    setSelectedIds(() => {
      const next: Record<string, boolean> = {};
      for (const r of rows) next[r.id] = checked;
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => ({ ...prev, [id]: checked }));
  }

  async function splitSelected(toSource: "INVENTORY" | "DROPSHIP") {
    if (!props.isOpen) {
      setMsg({ tone: "muted", text: "Fulfillment must be OPEN to split line items." });
      return;
    }
    if (!selectedItemIds.length) {
      setMsg({ tone: "muted", text: "Select at least one line to split." });
      return;
    }
    if (selectedHasPicked) {
      setMsg({
        tone: "warn",
        text: "Cannot split lines that already have picks. Undo picks (picked_qty → 0) for the selected lines first.",
      });
      return;
    }

    setMsg(null);
    setSplitBusy(true);
    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/split`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ to_source: toSource, item_ids: selectedItemIds }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !json?.to_fulfillment_id) {
        setMsg({ tone: "warn", text: json?.error || `Split failed (${res.status})` });
        return;
      }

      // Clear selection + jump to new fulfillment
      setSelectedIds({});
      window.location.href = `/admin/fulfillments/${encodeURIComponent(String(json.to_fulfillment_id))}`;
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setSplitBusy(false);
    }
  }

  // -------------------------
  // DROPSHIP trace context
  // -------------------------
  const [traceBusy, setTraceBusy] = useState(false);
  const [traceErr, setTraceErr] = useState<string | null>(null);
  const [traceItems, setTraceItems] = useState<TraceContextItem[]>([]);
  const [traceRows, setTraceRows] = useState<TraceContextRow[]>([]);
  const [traceFulfillmentId, setTraceFulfillmentId] = useState<string>(props.fulfillmentId);

  async function loadTraceContext() {
    setTraceBusy(true);
    setTraceErr(null);
    try {
      const requestId = traceFulfillmentId || props.fulfillmentId;
      const url = new URL(
        `/api/admin/fulfillments/${encodeURIComponent(requestId)}/dropship/trace-context`,
        window.location.origin
      );
      url.searchParams.set("orderId", String(props.orderId || ""));
      const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      const data: TraceContextResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !data.ok) {
        setTraceErr((data as any)?.error || `Request failed (${res.status})`);
        setTraceItems([]);
        setTraceRows([]);
        return;
      }

      if ((data as any).fulfillment_id) {
        setTraceFulfillmentId(String((data as any).fulfillment_id));
      }

      // ✅ FIXED: parens are correct; no stray ')'
      setTraceItems(
        (data.items ?? []).map((x: any) => ({
          id: String(x.id),
          variant_id: String(x.variant_id),
          description: String(x.description ?? ""),
          required_qty: safeNum(x.required_qty),
          uom: String(x.uom ?? "Units"),
        }))
      );

      const sorted = (data.traces ?? []).slice().sort((a: any, b: any) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      setTraceRows(
        sorted.map((t: any) => ({
          id: String(t.id),
          fulfillment_item_id: String(t.fulfillment_item_id),
          variant_id: String(t.variant_id),
          lot_number: t.lot_number ? String(t.lot_number) : null,
          serial_number: t.serial_number ? String(t.serial_number) : null,
          expiration_date: t.expiration_date ? String(t.expiration_date) : null,
          qty: safeNum(t.qty),
          created_at: String(t.created_at ?? ""),
        }))
      );
    } catch (e: any) {
      setTraceErr(e?.message ? String(e.message) : "Network error");
      setTraceItems([]);
      setTraceRows([]);
    } finally {
      setTraceBusy(false);
    }
  }

  async function deleteTraceRow(traceId: string) {
    if (!traceId) return;
    if (!confirm("Remove this trace row?")) return;

    setTraceBusy(true);
    setTraceErr(null);
    try {
      const res = await fetch(
        `/api/admin/fulfillments/${encodeURIComponent(traceFulfillmentId)}/dropship/trace/${encodeURIComponent(traceId)}`,
        { method: "DELETE", headers: { accept: "application/json" } }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setTraceErr(data?.error || `Remove failed (${res.status})`);
        return;
      }
      setMsg({ tone: "ok", text: "Trace removed." });
      await loadTraceContext();
    } catch (e: any) {
      setTraceErr(e?.message ? String(e.message) : "Network error");
    } finally {
      setTraceBusy(false);
    }
  }

  useEffect(() => {
    setTraceFulfillmentId(props.fulfillmentId);
    loadTraceContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fulfillmentId]);

  useEffect(() => {
    function handleRefresh(e: Event) {
      const detail = (e as CustomEvent).detail as { fulfillmentId?: string } | undefined;
      if (detail?.fulfillmentId && detail.fulfillmentId !== props.fulfillmentId) return;
      loadTraceContext();
    }
    window.addEventListener("dropship-trace-refresh", handleRefresh as EventListener);
    return () => window.removeEventListener("dropship-trace-refresh", handleRefresh as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fulfillmentId]);

  useEffect(() => {
    function handleUpdated(e: Event) {
      const detail = (e as CustomEvent).detail as TraceContextResponse | undefined;
      if (!detail || !("ok" in detail) || !detail.ok) return;
      setTraceErr(null);
      setTraceItems(
        (detail.items ?? []).map((x: any) => ({
          id: String(x.id),
          variant_id: String(x.variant_id),
          description: String(x.description ?? ""),
          required_qty: safeNum(x.required_qty),
          uom: String(x.uom ?? "Units"),
        }))
      );
      const sorted = (detail.traces ?? []).slice().sort((a: any, b: any) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setTraceRows(
        sorted.map((t: any) => ({
          id: String(t.id),
          fulfillment_item_id: String(t.fulfillment_item_id),
          variant_id: String(t.variant_id),
          lot_number: t.lot_number ? String(t.lot_number) : null,
          serial_number: t.serial_number ? String(t.serial_number) : null,
          expiration_date: t.expiration_date ? String(t.expiration_date) : null,
          qty: safeNum(t.qty),
          created_at: String(t.created_at ?? ""),
        }))
      );
      try {
        router.refresh();
      } catch {
        if (typeof window !== "undefined") window.location.reload();
      }
    }
    window.addEventListener("dropship-trace-updated", handleUpdated as EventListener);
    return () => window.removeEventListener("dropship-trace-updated", handleUpdated as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fulfillmentId]);

  // -------------------------
  // Close panels safely
  // -------------------------
  useEffect(() => {
    // inventory panel should not stay open when picking is disabled
    if (!canPickInventory && !dropshipMode) setOpenLineId(null);
  }, [canPickInventory, dropshipMode]);

  useEffect(() => {
    const base = dropshipMode ? traceItems : rows;
    if (openLineId && !base.some((r: any) => String(r.id) === openLineId)) setOpenLineId(null);
  }, [openLineId, rows, traceItems, dropshipMode]);

  // If items list changes, drop selection that no longer exists
  useEffect(() => {
    setSelectedIds((prev) => {
      const live = new Set(rows.map((r) => r.id));
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const [k, v] of Object.entries(prev)) {
        if (live.has(k)) next[k] = v;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [rows]);

  // -------------------------
  // Completion logic
  // -------------------------
  const loggedByItemId = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of traceRows) {
      const k = String(t.fulfillment_item_id || "");
      if (!k) continue;
      m[k] = safeNum(m[k]) + safeNum(t.qty);
    }
    return m;
  }, [traceRows]);

  const traceSummaryRows = useMemo(() => {
    const base: Array<{ id: string; variant_id: string; description: string; required_qty: number; uom: string }> =
      traceItems.length
        ? traceItems
        : rows.map((r) => ({
            id: r.id,
            variant_id: r.variant_id,
            description: r.description,
            required_qty: safeNum(r.required_qty),
            uom: r.uom,
          }));

    return base.map((it) => {
      const required = safeNum(it.required_qty);
      const logged = safeNum(loggedByItemId[it.id] ?? 0);
      const remaining = Math.max(0, required - logged);
      const ok = logged >= required && required > 0;
      return { ...it, logged_qty: logged, remaining_qty: remaining, ok };
    });
  }, [traceItems, rows, loggedByItemId]);

  const anyShort = dropshipMode
    ? traceSummaryRows.some((r) => safeNum(r.remaining_qty) > 0)
    : rows.some((r) => {
        const req = safeNum(r.required_qty);
        const picked = safeNum(r.picked_qty);
        const dropshipAssigned = safeNum(dropshipByVariant[r.variant_id]);
        return picked + dropshipAssigned < req;
      });

  const allReady = !anyShort;

  useEffect(() => {
    if (prevAllReady.current === null) {
      prevAllReady.current = allReady;
      return;
    }
    if (prevAllReady.current !== allReady) {
      prevAllReady.current = allReady;
      try {
        router.refresh();
      } catch {
        if (typeof window !== "undefined") window.location.reload();
      }
    }
  }, [allReady, router]);

  const checklistModes =
    viewMode === "OVERVIEW"
      ? (["INVENTORY", "DROPSHIP"] as const)
      : ([viewMode === "DROPSHIP" ? "DROPSHIP" : "INVENTORY"] as const);

  function renderChecklist(isDropship: boolean, enabled: boolean) {
    const listRows = isDropship ? traceSummaryRows : rows;
    const colSpan = isDropship ? 6 : 9;

    return (
      <div style={sectionCard()}>
        <div style={sectionHeader()}>
          <span>{isDropship ? "Trace Checklist" : "Pick List"}</span>

          {isDropship ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                {hydrated && traceErr ? `Trace load error: ${traceErr}` : "Log serial/lot per line (dropship)."}
              </span>
            </div>
          ) : null}
        </div>

        {!enabled ? (
          <div style={{ padding: 12, fontSize: 13, opacity: 0.75 }}>
            {isDropship
              ? "This fulfillment is Inventory. Dropship trace checklist is not applicable."
              : "This fulfillment is Dropship. Inventory picking is not applicable."}
          </div>
        ) : (
        <div
          style={{
            maxHeight: "min(62vh, 620px)",
            overflowY: "auto",
            background: "white",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 12,
          }}
        >
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 2, boxShadow: "0 2px 0 rgba(0,0,0,0.04)" }}>
              {isDropship ? (
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.75 }}>
                  <th style={{ padding: 12, width: 40 }} />
                  <th style={{ padding: 12 }}>Item</th>
                  <th style={{ padding: 12 }}>Required</th>
                  <th style={{ padding: 12 }}>Logged</th>
                  <th style={{ padding: 12 }}>Remaining</th>
                  <th style={{ padding: 12, width: 1 }} />
                </tr>
              ) : (
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.75 }}>
                  <th style={{ padding: 12, width: 40 }} />
                  <th style={{ padding: 12 }}>Item</th>
                  <th style={{ padding: 12 }}>Required</th>
                  <th style={{ padding: 12 }}>Picked</th>
                  <th style={{ padding: 12 }}>Dropship</th>
                  <th style={{ padding: 12 }}>Remaining</th>
                  <th style={{ padding: 12 }}>On hand</th>
                  <th style={{ padding: 12, width: 140 }}>Dropship qty</th>
                  <th style={{ padding: 12, width: 140 }} />
                </tr>
              )}
            </thead>

            <tbody>
              {isDropship
                ? traceSummaryRows.map((it) => {
                    const req = safeNum(it.required_qty);
                    const logged = safeNum(it.logged_qty);
                    const remaining = Math.max(0, req - logged);
                    const ok = logged >= req;
                    const isOpenPanel = openLineId === it.id;

                    return (
                      <React.Fragment key={it.id}>
                        <tr style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                          <td style={{ padding: 12 }}>
                            <input
                              type="checkbox"
                              checked={!!selectedIds[it.id]}
                              onChange={(e) => setSelectedIds((prev) => ({ ...prev, [it.id]: e.target.checked }))}
                            />
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span>{it.description}</span>
                              {ok ? <span style={pillTag("Complete", "ok")}>Complete</span> : <span style={pillTag("Needs trace", "warn")}>Needs trace</span>}
                            </div>
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {req} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950, color: ok ? "rgba(25,135,84,1)" : "inherit" }}>
                            {logged} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {remaining} {it.uom}
                          </td>

                          <td style={{ padding: 12, textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setMsg(null);
                                setOpenLineId((cur) => (cur === it.id ? null : it.id));
                              }}
                              style={buttonStyle(true, false)}
                            >
                              {isOpenPanel ? "Close" : ok ? "View" : "Trace"}
                            </button>
                          </td>
                        </tr>

                        {isOpenPanel ? (
                          <tr style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                            <td colSpan={6} style={{ padding: 12, background: "rgba(0,0,0,0.02)" }}>
                              <DropshipTraceLinePanel
                                fulfillmentItemId={it.id}
                                uom={it.uom}
                                requiredQty={req}
                                loggedQty={logged}
                                remainingQty={remaining}
                                traces={traceRows}
                                onDeleteTrace={deleteTraceRow}
                                onGoToTrace={() => {
                                  const ok = scrollToTraceability();
                                  if (!ok) {
                                    setMsg({
                                      tone: "muted",
                                      text: 'Could not find the traceability section on the page. Add id="dropship-traceability" to the Dropship trace section container.',
                                    });
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                : rows.map((it) => {
                    const req = safeNum(it.required_qty);
                    const picked = safeNum(it.picked_qty);
                    const dropshipAssigned = safeNum(dropshipByVariant[it.variant_id]);
                    const remaining = Math.max(0, req - picked - dropshipAssigned);
                    const onHand = safeNum(onHandByVariant[it.variant_id] ?? 0);
                    const ok = remaining <= 0 && req > 0;
                    const isOpenPanel = openLineId === it.id;
                    const disableRowPick = !canPickInventory;

                    return (
                      <React.Fragment key={it.id}>
                        <tr style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                          <td style={{ padding: 12 }}>
                            <input
                              type="checkbox"
                              checked={!!selectedIds[it.id]}
                              onChange={(e) => setSelectedIds((prev) => ({ ...prev, [it.id]: e.target.checked }))}
                            />
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span>{it.description}</span>
                              {ok ? <span style={pillTag("Complete", "ok")}>Complete</span> : <span style={pillTag("Needs picks", "warn")}>Needs picks</span>}
                            </div>
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {req} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950, color: ok ? "rgba(25,135,84,1)" : "inherit" }}>
                            {picked} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {dropshipAssigned} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {remaining} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>{onHand}</td>

                          <td style={{ padding: 12 }}>
                            <input
                              value={dropshipQtyById[it.id] ?? ""}
                              onChange={(e) => setDropshipQtyById((prev) => ({ ...prev, [it.id]: e.target.value }))}
                              placeholder="0"
                              inputMode="numeric"
                              title="Enter qty to add to dropship, or 0 and click Dropship to clear assignment and pick from inventory"
                              style={{ ...inputStyle(false), padding: "8px 10px", fontWeight: 900 }}
                              disabled={!props.isOpen || dropshipBusy}
                            />
                            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, maxWidth: 200 }}>
                              {dropshipAssigned > 0 ? <>Assigned: {dropshipAssigned}. </> : null}
                              Use <b>0</b> + Dropship to clear.
                            </div>
                          </td>

                          <td style={{ padding: 12, textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setMsg(null);

                                if (disableRowPick) {
                                  setOpenLineId(null);
                                  setMsg({ tone: "muted", text: "Fulfillment is closed. Reopen it to pick/scan." });
                                  return;
                                }

                                setOpenLineId((cur) => (cur === it.id ? null : it.id));
                              }}
                              disabled={disableRowPick}
                              style={{
                                ...buttonStyle(true, disableRowPick),
                                background: disableRowPick ? "rgba(0,0,0,0.10)" : "#0f4c81",
                                border: "1px solid rgba(15,76,129,0.45)",
                                color: disableRowPick ? "rgba(0,0,0,0.55)" : "white",
                              }}
                            >
                              {isOpenPanel ? "Close" : "Pick / Scan out"}
                            </button>
                            <button
                              type="button"
                              onClick={() => assignDropshipQty(it.id, dropshipQtyById[it.id] ?? "")}
                              disabled={!props.isOpen || dropshipBusy}
                              style={{
                                ...buttonStyle(false, !props.isOpen || dropshipBusy),
                                marginLeft: 8,
                                background: !props.isOpen || dropshipBusy ? "rgba(0,0,0,0.10)" : "#8b1c96",
                                border: "1px solid rgba(217,70,239,0.50)",
                                color: !props.isOpen || dropshipBusy ? "rgba(0,0,0,0.55)" : "white",
                                boxShadow: !props.isOpen || dropshipBusy ? "none" : "0 8px 16px rgba(217,70,239,0.20)",
                              }}
                            >
                              {dropshipBusy ? "Working…" : "Dropship"}
                            </button>
                          </td>
                        </tr>

                        {isOpenPanel ? (
                          <tr style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                            <td colSpan={9} style={{ padding: 12, background: "rgba(0,0,0,0.02)" }}>
                              <PickPanel
                                fulfillmentId={props.fulfillmentId}
                                fulfillmentItem={it}
                                remaining={remaining}
                                isOpen={canPickInventory}
                                onPicked={(nextPickedQty, nextOnHand) => {
                                  setPickedOverride((prev) => ({ ...prev, [it.id]: nextPickedQty }));
                                  setOnHandOverride((prev) => ({ ...prev, [it.variant_id]: nextOnHand }));
                                  setHistoryNonce((n) => n + 1);
                                }}
                                onMessage={setMsg}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}

              {listRows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} style={{ padding: 18, opacity: 0.75 }}>
                    No items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        )}

        <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.08)", opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
          {isDropship ? (
            <>
              Dropship mode: this table tracks traceability progress (not inventory picks).{" "}
              <b>Mix & match:</b> select rows and split them into a new INVENTORY fulfillment.
            </>
          ) : (
            <>
              Over-pick is blocked unless you enable it in the line panel. <b>Mix & match:</b> select rows and split them into a new DROPSHIP fulfillment.
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {dropshipMode ? (
        <div
          style={{
            borderRadius: 14,
            padding: 12,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(13,110,253,0.08)",
            fontWeight: 900,
            fontSize: 13,
            boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
            lineHeight: 1.35,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Dropship mode is enabled</div>
              <div style={{ marginTop: 6, opacity: 0.9 }}>
                Inventory picking is disabled. Use the Dropship workflow (vendor + PO + packing slip) and log traceability (serial/lot).
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                Vendor: <b>{props.dropshipVendorName ? props.dropshipVendorName : "—"}</b>
                {"  "}·{"  "}
                Status: <b>{safeStr(props.dropshipStatus) ? formatStatusLabel(props.dropshipStatus) : "—"}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={badge("rgba(13,110,253,0.12)")}>DROPSHIP</span>
              <button
                type="button"
                onClick={() => {
                  const ok = scrollToTraceability();
                  if (!ok) {
                    setMsg({
                      tone: "muted",
                      text: 'Could not find the traceability section on the page. Add id="dropship-traceability" to the Dropship trace section container.',
                    });
                  }
                }}
                style={{ ...buttonStyle(false, false), padding: "8px 10px", borderRadius: 10 }}
              >
                Go to Traceability
              </button>
              <button
                type="button"
                onClick={loadTraceContext}
                disabled={traceBusy}
                style={{ ...buttonStyle(false, traceBusy), padding: "8px 10px", borderRadius: 10 }}
              >
                {traceBusy ? "…" : "Refresh trace"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            borderRadius: 14,
            padding: 12,
            border: "1px solid rgba(0,0,0,0.10)",
            background:
              msg.tone === "ok"
                ? "rgba(25,135,84,0.10)"
                : msg.tone === "warn"
                ? "rgba(220,53,69,0.10)"
                : "rgba(0,0,0,0.03)",
            fontWeight: 900,
            fontSize: 13,
            boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
          }}
        >
          {msg.text}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={badge(props.isOpen ? "rgba(13,110,253,0.10)" : "rgba(25,135,84,0.10)")}>
          {props.isOpen ? "OPEN" : "CLOSED"}
        </span>

        <span style={badge(allReady ? "rgba(25,135,84,0.10)" : "rgba(255,153,0,0.14)")}>
          {dropshipMode ? (allReady ? "All traced" : "Trace remaining") : allReady ? "All picked" : "Items remaining"}
        </span>

        <span style={badge(dropshipMode ? "rgba(13,110,253,0.12)" : "rgba(0,0,0,0.05)")}>
          Source: {dropshipMode ? "DROPSHIP" : source === "INVENTORY" ? "INVENTORY" : "—"}
        </span>

        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {dropshipMode
            ? "Tip: click a line → view what’s logged and jump to trace entry."
            : "Tip: open a line → scan label (fast) or pick from lots/serials (precise)."}
        </span>
      </div>

      {viewMode === "OVERVIEW" ? (
        <div style={{ display: "grid", gap: 14 }}>
          {renderChecklist(false, true)}
          <PickHistory
            key={`${props.fulfillmentId}:${props.isOpen ? "open" : "closed"}`}
            refreshKey={historyNonce}
            fulfillmentId={props.fulfillmentId}
            isOpen={canPickInventory}
            items={rows}
            onMessage={setMsg}
            onUndoApplied={(fulfillmentItemId, nextPickedQty, variantId, nextOnHand) => {
              setPickedOverride((prev) => ({ ...prev, [fulfillmentItemId]: nextPickedQty }));
              setOnHandOverride((prev) => ({ ...prev, [variantId]: nextOnHand }));
              setHistoryNonce((n) => n + 1);
            }}
            disabledReason={props.isOpen ? null : "Fulfillment is closed. Reopen it to undo."}
          />
          <TraceHistory
            fulfillmentId={traceFulfillmentId}
            traces={traceRows}
            busy={traceBusy}
            err={traceErr}
            onRefresh={loadTraceContext}
            onDelete={deleteTraceRow}
          />
        </div>
      ) : (
        <>
      {/* Pick list / Trace checklist */}
      <div style={sectionCard()}>
        <div style={sectionHeader()}>
          <span>{dropshipMode ? "Trace Checklist" : "Pick List"}</span>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {dropshipMode
                ? traceErr
                  ? `Trace load error: ${traceErr}`
                  : "Log serial/lot per line (dropship)."
                : props.isOpen
                ? "Picking is enabled."
                : "Reopen fulfillment to edit."}
            </span>

            {/* ✅ Mixed fulfillment: split selected items into a NEW fulfillment */}
            <button
              type="button"
              disabled={splitBusy || !props.isOpen || selectedItemIds.length === 0}
              onClick={() => {
                setMsg(null);
                splitSelected(splitTarget);
              }}
              style={{ ...buttonStyle(true, splitBusy || !props.isOpen || selectedItemIds.length === 0), padding: "8px 10px", borderRadius: 10 }}
              title={
                !props.isOpen
                  ? "Fulfillment must be OPEN"
                  : selectedHasPicked
                  ? "Cannot split lines with picked_qty > 0"
                  : selectedItemIds.length === 0
                  ? "Select at least one line"
                  : ""
              }
            >
              {splitBusy
                ? "Working…"
                : `Split selected → ${dropshipMode ? "INVENTORY" : "DROPSHIP"} fulfillment`}
            </button>
          </div>
        </div>

        <div style={{ maxHeight: "min(62vh, 620px)", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 2 }}>
              {dropshipMode ? (
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                  <th style={{ padding: 12, width: 44 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      title="Select all"
                    />
                  </th>
                  <th style={{ padding: 12, width: "50%" }}>Item</th>
                  <th style={{ padding: 12, width: 120 }}>Required</th>
                  <th style={{ padding: 12, width: 120 }}>Logged</th>
                  <th style={{ padding: 12, width: 150 }}>Remaining</th>
                  <th style={{ padding: 12, width: 160 }} />
                </tr>
              ) : (
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                  <th style={{ padding: 12, width: 44 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      title="Select all"
                    />
                  </th>
                  <th style={{ padding: 12, width: "48%" }}>Item</th>
                  <th style={{ padding: 12, width: 120 }}>Required</th>
                  <th style={{ padding: 12, width: 120 }}>Picked</th>
                  <th style={{ padding: 12, width: 140 }}>Remaining</th>
                  <th style={{ padding: 12, width: 110 }}>On hand</th>
                  <th style={{ padding: 12, width: 160 }} />
                </tr>
              )}
            </thead>

            <tbody>
              {dropshipMode
                ? traceSummaryRows.map((it, idx) => {
                    const req = safeNum(it.required_qty);
                    const logged = safeNum((it as any).logged_qty);
                    const remaining = safeNum((it as any).remaining_qty);
                    const ok = remaining <= 0 && req > 0;
                    const isOpenPanel = openLineId === it.id;
                    const stripe = idx % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent";

                    return (
                      <React.Fragment key={it.id}>
                        <tr
                          style={{
                            borderTop: "1px solid rgba(0,0,0,0.06)",
                            background: ok ? "rgba(25,135,84,0.04)" : stripe,
                          }}
                        >
                          <td style={{ padding: 12 }}>
                            <input
                              type="checkbox"
                              checked={!!selectedIds[it.id]}
                              onChange={(e) => toggleOne(it.id, e.target.checked)}
                            />
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span>{it.description}</span>
                              {ok ? (
                                <span style={pillTag("Complete", "ok")}>Complete</span>
                              ) : (
                                <span style={pillTag("Needs trace", "warn")}>Needs trace</span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {req} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950, color: ok ? "rgba(25,135,84,1)" : "inherit" }}>
                            {logged} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {remaining} {it.uom}
                          </td>

                          <td style={{ padding: 12, textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setMsg(null);
                                setOpenLineId((cur) => (cur === it.id ? null : it.id));
                              }}
                              style={buttonStyle(true, false)}
                            >
                              {isOpenPanel ? "Close" : ok ? "View" : "Trace"}
                            </button>
                          </td>
                        </tr>

                        {isOpenPanel ? (
                          <tr style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                            <td colSpan={6} style={{ padding: 12, background: "rgba(0,0,0,0.02)" }}>
                              <DropshipTraceLinePanel
                                fulfillmentItemId={it.id}
                                uom={it.uom}
                                requiredQty={req}
                                loggedQty={logged}
                                remainingQty={remaining}
                                traces={traceRows}
                                onDeleteTrace={deleteTraceRow}
                                onGoToTrace={() => {
                                  const ok = scrollToTraceability();
                                  if (!ok) {
                                    setMsg({
                                      tone: "muted",
                                      text: 'Could not find the traceability section on the page. Add id="dropship-traceability" to the Dropship trace section container.',
                                    });
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                : rows.map((it, idx) => {
                    const req = safeNum(it.required_qty);
                    const picked = safeNum(it.picked_qty);
                    const dropshipAssigned = safeNum(dropshipByVariant[it.variant_id] ?? 0);
                    const remaining = Math.max(0, req - picked - dropshipAssigned);
                    const onHand = safeNum(onHandByVariant[it.variant_id] ?? 0);
                    const ok = remaining <= 0 && req > 0;
                    const isOpenPanel = openLineId === it.id;
                    const stripe = idx % 2 === 0 ? "rgba(15,76,129,0.04)" : "transparent";

                    const disableRowPick = !canPickInventory;

                    return (
                      <React.Fragment key={it.id}>
                        <tr
                          style={{
                            borderTop: "1px solid rgba(0,0,0,0.06)",
                            background: ok ? "rgba(25,135,84,0.05)" : stripe,
                          }}
                        >
                          <td style={{ padding: 12 }}>
                            <input
                              type="checkbox"
                              checked={!!selectedIds[it.id]}
                              onChange={(e) => toggleOne(it.id, e.target.checked)}
                            />
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span>{it.description}</span>
                              {ok ? (
                                <span style={pillTag("Complete", "ok")}>Complete</span>
                              ) : (
                                <span style={pillTag("Needs picks", "warn")}>Needs picks</span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {req} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950, color: ok ? "rgba(25,135,84,1)" : "inherit" }}>
                            {picked} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>
                            {remaining} {it.uom}
                          </td>

                          <td style={{ padding: 12, fontWeight: 950 }}>{onHand}</td>

                          <td style={{ padding: 12, textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setMsg(null);

                                if (disableRowPick) {
                                  setOpenLineId(null);
                                  setMsg({ tone: "muted", text: "Fulfillment is closed. Reopen it to pick/scan." });
                                  return;
                                }

                                setOpenLineId((cur) => (cur === it.id ? null : it.id));
                              }}
                              disabled={disableRowPick}
                              style={{
                                ...buttonStyle(true, disableRowPick),
                                background: disableRowPick ? "rgba(0,0,0,0.10)" : "#0f4c81",
                                border: "1px solid rgba(15,76,129,0.45)",
                                color: disableRowPick ? "rgba(0,0,0,0.55)" : "white",
                                boxShadow: disableRowPick ? "none" : "0 8px 16px rgba(15,76,129,0.18)",
                              }}
                            >
                              {isOpenPanel ? "Close" : "Pick / Scan out"}
                            </button>
                          </td>
                        </tr>

                        {isOpenPanel ? (
                          <tr style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                            <td colSpan={7} style={{ padding: 12, background: "rgba(0,0,0,0.02)" }}>
                              <PickPanel
                                fulfillmentId={props.fulfillmentId}
                                fulfillmentItem={it}
                                remaining={remaining}
                                isOpen={canPickInventory}
                                onPicked={(nextPickedQty, nextOnHand) => {
                                  setPickedOverride((prev) => ({ ...prev, [it.id]: nextPickedQty }));
                                  setOnHandOverride((prev) => ({ ...prev, [it.variant_id]: nextOnHand }));
                                  setHistoryNonce((n) => n + 1);
                                }}
                                onMessage={setMsg}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}

              {(dropshipMode ? traceSummaryRows.length === 0 : rows.length === 0) ? (
                <tr>
                  <td colSpan={dropshipMode ? 6 : 7} style={{ padding: 18, opacity: 0.75 }}>
                    No items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.08)", opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
          {dropshipMode ? (
            <>
              Dropship mode: this table tracks traceability progress (not inventory picks).{" "}
              <b>Mix & match:</b> select rows and split them into a new INVENTORY fulfillment.
            </>
          ) : (
            <>
              Over-pick is blocked unless you enable it in the line panel.{" "}
              <b>Mix & match:</b> select rows and split them into a new DROPSHIP fulfillment.
            </>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <PickHistory
        refreshKey={historyNonce}
        fulfillmentId={props.fulfillmentId}
        isOpen={canPickInventory}
        items={rows}
        onMessage={setMsg}
        onUndoApplied={(fulfillmentItemId, nextPickedQty, variantId, nextOnHand) => {
          setPickedOverride((prev) => ({ ...prev, [fulfillmentItemId]: nextPickedQty }));
          setOnHandOverride((prev) => ({ ...prev, [variantId]: nextOnHand }));
          setHistoryNonce((n) => n + 1);
        }}
        disabledReason={props.isOpen ? null : "Fulfillment is closed. Reopen it to undo."}
      />

      <div style={{ height: 12 }} />

      <TraceHistory
        fulfillmentId={props.fulfillmentId}
        traces={traceRows}
        busy={traceBusy}
        err={traceErr}
        onRefresh={loadTraceContext}
        onDelete={deleteTraceRow}
      />
        </>
      )}
    </div>
  );
}

function DropshipTraceLinePanel(props: {
  fulfillmentItemId: string;
  uom: string;
  requiredQty: number;
  loggedQty: number;
  remainingQty: number;
  traces: TraceContextRow[];
  onGoToTrace: () => void;
  onDeleteTrace: (traceId: string) => void;
}) {
  const recent = useMemo(() => {
    return props.traces.filter((t) => String(t.fulfillment_item_id) === String(props.fulfillmentItemId)).slice(0, 25);
  }, [props.traces, props.fulfillmentItemId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>
          Trace progress:{" "}
          <span style={{ opacity: 0.85 }}>
            {props.loggedQty}/{props.requiredQty} {props.uom} logged
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={props.onGoToTrace}
            style={{ ...buttonStyle(true, false), padding: "8px 10px", borderRadius: 10 }}
          >
            Enter trace (serial/lot)
          </button>
        </div>
      </div>

      {props.remainingQty > 0 ? (
        <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(180,90,0,1)" }}>
          Remaining to trace: {props.remainingQty} {props.uom}
        </div>
      ) : (
        <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(25,135,84,1)" }}>
          All required trace logged for this line.
        </div>
      )}

      <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

      <div style={{ fontWeight: 950, opacity: 0.9 }}>Recent trace rows</div>

      {recent.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.75 }}>No trace rows yet for this line.</div>
      ) : (
        <div
          style={{
            maxHeight: 240,
            overflowY: "auto",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            background: "white",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: "white" }}>
              <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                <th style={{ padding: 10, width: 190 }}>When</th>
                <th style={{ padding: 10, width: 80 }}>Qty</th>
                <th style={{ padding: 10 }}>Lot / Serial</th>
                <th style={{ padding: 10, width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 10, fontWeight: 900, opacity: 0.85 }}>{fmtWhen(t.created_at)}</td>
                  <td style={{ padding: 10, fontWeight: 950 }}>{safeNum(t.qty)}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ fontWeight: 950, opacity: 0.9 }}>{traceLabel(t)}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.25 }}>{traceSubLabel(t) || "—"}</div>
                  </td>
                  <td style={{ padding: 10 }}>
                    <button
                      type="button"
                      onClick={() => props.onDeleteTrace(t.id)}
                      style={{ ...buttonStyle(false, false), padding: "6px 8px", borderRadius: 8, fontSize: 12 }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Tip: if the vendor provides a packing slip with serials/lot, log them here so the customer portal can display traceability.
      </div>
    </div>
  );
}

function TraceHistory(props: {
  fulfillmentId: string;
  traces: TraceContextRow[];
  busy: boolean;
  err: string | null;
  onRefresh: () => void;
  onDelete: (traceId: string) => void;
}) {
  return (
    <div style={sectionCard()}>
      <div style={sectionHeader()}>
        <span>Trace History (latest)</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            Fulfillment: <span style={{ ...monoSmall(), opacity: 0.9 }}>{props.fulfillmentId.slice(0, 8)}…</span>
          </span>
          <button
            type="button"
            onClick={props.onRefresh}
            disabled={props.busy}
            style={{ ...buttonStyle(false, props.busy), padding: "8px 10px", borderRadius: 10 }}
          >
            {props.busy ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {props.err ? <div style={{ padding: 12, color: "crimson", fontWeight: 900 }}>{props.err}</div> : null}

      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {props.traces.length === 0 && !props.busy ? (
          <div style={{ padding: 12, opacity: 0.75, fontSize: 13 }}>No trace rows yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: "white" }}>
              <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                <th style={{ padding: 10, width: 190 }}>When</th>
                <th style={{ padding: 10, width: 80 }}>Qty</th>
                <th style={{ padding: 10, width: 140 }}>Line</th>
                <th style={{ padding: 10 }}>Lot / Serial</th>
                <th style={{ padding: 10, width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {props.traces.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 10, fontWeight: 900, opacity: 0.85 }}>{fmtWhen(t.created_at)}</td>
                  <td style={{ padding: 10, fontWeight: 950 }}>{safeNum(t.qty)}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ ...monoSmall(), opacity: 0.9 }}>{String(t.fulfillment_item_id).slice(0, 8)}…</span>
                  </td>
                  <td style={{ padding: 10 }}>
                    <div style={{ fontWeight: 950, opacity: 0.9 }}>{traceLabel(t)}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.25 }}>{traceSubLabel(t) || "—"}</div>
                  </td>
                  <td style={{ padding: 10 }}>
                    <button
                      type="button"
                      onClick={() => props.onDelete(t.id)}
                      disabled={props.busy}
                      style={{ ...buttonStyle(false, props.busy), padding: "6px 8px", borderRadius: 8, fontSize: 12 }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.08)", fontSize: 12, opacity: 0.75 }}>
        Dropship trace rows are used for compliance + can be shown in the customer portal.
      </div>
    </div>
  );
}

function PickHistory(props: {
  refreshKey: number;
  fulfillmentId: string;
  isOpen: boolean;
  items: ItemRow[];
  onMessage: (m: { tone: "ok" | "warn" | "muted"; text: string } | null) => void;
  onUndoApplied: (fulfillmentItemId: string, nextPickedQty: number, variantId: string, nextOnHand: number) => void;
  disabledReason?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<PickHistoryRow[]>([]);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const url = new URL(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/picks`, window.location.origin);
      url.searchParams.set("limit", "100");

      const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data: PicksListResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));
      if (!res.ok || !data.ok) {
        setErr((data as any)?.error || `Request failed (${res.status})`);
        setRows([]);
        return;
      }

      const next = (data.picks ?? []).slice().sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      setRows(next);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Network error");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // fulfillment open/closed is in parent key so remount refreshes; refreshKey bumps after picks/undo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fulfillmentId, props.refreshKey]);

  async function undo(pickId: string, row?: PickHistoryRow) {
    if (row?.undoable === false) {
      props.onMessage({
        tone: "muted",
        text: "This line is from legacy inventory logs (no fulfillment_picks row). Undo is not available.",
      });
      return;
    }
    if (!props.isOpen) {
      props.onMessage({ tone: "warn", text: props.disabledReason || "Undo is disabled." });
      return;
    }

    setBusy(true);
    props.onMessage(null);
    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/undo`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ pick_id: pickId }),
      });

      const data: UndoResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));
      if (!res.ok || !data.ok) {
        props.onMessage({ tone: "warn", text: (data as any)?.error || `Undo failed (${res.status})` });
        return;
      }

      props.onUndoApplied(
        (data as any).fulfillment_item_id,
        (data as any).next_picked_qty,
        (data as any).variant_id,
        (data as any).next_on_hand
      );

      props.onMessage({
        tone: "ok",
        text: `Undid ${data.qty_undone}. On-hand ${data.prior_on_hand} → ${data.next_on_hand}.`,
      });

      await load();
    } catch (e: any) {
      props.onMessage({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={sectionCard()}>
      <div style={sectionHeader()}>
        <span>Pick History (latest)</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {props.disabledReason ? <span style={{ fontSize: 12, opacity: 0.7 }}>{props.disabledReason}</span> : null}
          <button
            type="button"
            onClick={load}
            disabled={busy}
            style={{ ...buttonStyle(false, busy), padding: "8px 10px", borderRadius: 10 }}
          >
            {busy ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {err ? <div style={{ padding: 12, color: "crimson", fontWeight: 900 }}>{err}</div> : null}

      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {rows.length === 0 && !busy ? (
          <div style={{ padding: 12, opacity: 0.75, fontSize: 13 }}>No picks yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: "white" }}>
              <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                <th style={{ padding: 10, width: 190 }}>When</th>
                <th style={{ padding: 10, width: 110 }}>Action</th>
                <th style={{ padding: 10, width: 80 }}>Qty</th>
                <th style={{ padding: 10 }}>Lot / Serial</th>
                <th style={{ padding: 10 }}>Note</th>
                <th style={{ padding: 10, width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 10, fontWeight: 900, opacity: 0.85 }}>{fmtWhen(r.created_at)}</td>

                  <td style={{ padding: 10 }}>
                    {r.is_undo ? (
                      <span style={pillTag("UNDO", "muted")}>UNDO</span>
                    ) : (
                      <span style={pillTag("PICK", "ok")}>PICK</span>
                    )}
                  </td>

                  <td style={{ padding: 10, fontWeight: 950 }}>{safeNum(r.qty)}</td>

                  <td style={{ padding: 10 }}>
                    <div style={{ fontWeight: 950, opacity: 0.9 }}>{historyLotLabel(r)}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.25 }}>
                      {historyLotSubLabel(r) ? (
                        r.raw_scan && !r.lot_number && !r.serial_number ? (
                          <span style={monoSmall()}>{historyLotSubLabel(r)}</span>
                        ) : (
                          historyLotSubLabel(r)
                        )
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>

                  <td style={{ padding: 10, fontSize: 12, opacity: 0.75 }}>{r.note ?? "—"}</td>

                  <td style={{ padding: 10, textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => undo(r.id, r)}
                      disabled={busy || !props.isOpen || r.is_undo || r.undoable === false}
                      style={{
                        ...buttonStyle(true, busy || !props.isOpen || r.is_undo || r.undoable === false),
                        padding: "8px 10px",
                        borderRadius: 10,
                      }}
                      title={
                        r.undoable === false
                          ? "Legacy log — cannot undo from here"
                          : r.is_undo
                          ? "Cannot undo an undo record"
                          : props.isOpen
                          ? ""
                          : props.disabledReason || "Undo disabled"
                      }
                    >
                      Undo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.08)", fontSize: 12, opacity: 0.75 }}>
        Undo is available while fulfillment is OPEN and source is INVENTORY.
        {rows.some((r) => r.undoable === false)
          ? " Legacy rows are reconstructed from inventory movement logs; Undo is disabled for those."
          : null}
      </div>
    </div>
  );
}

function PickPanel(props: {
  fulfillmentId: string;
  fulfillmentItem: ItemRow;
  remaining: number;
  isOpen: boolean; // already “inventory allowed”
  onPicked: (nextPickedQty: number, nextOnHand: number) => void;
  onMessage: (m: { tone: "ok" | "warn" | "muted"; text: string } | null) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [rawScan, setRawScan] = useState("");
  const scanRef = useRef<HTMLInputElement | null>(null);

  const [lotsBusy, setLotsBusy] = useState(false);
  const [lotsErr, setLotsErr] = useState<string | null>(null);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [lotQ, setLotQ] = useState("");

  const [qty, setQty] = useState<number>(1);
  const [note, setNote] = useState<string>("");
  const [allowOverpick, setAllowOverpick] = useState(false);

  useEffect(() => {
    loadLots("");
    setTimeout(() => scanRef.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fulfillmentItem.id]);

  useEffect(() => {
    if (!busy && props.isOpen) {
      setTimeout(() => scanRef.current?.focus(), 0);
    }
  }, [busy, props.isOpen]);

  async function loadLots(q: string) {
    setLotsBusy(true);
    setLotsErr(null);
    try {
      const url = new URL("/api/admin/inventory/lots", window.location.origin);
      url.searchParams.set("variantId", props.fulfillmentItem.variant_id);
      url.searchParams.set("limit", "200");
      if (q.trim()) url.searchParams.set("q", q.trim());

      const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      const data: LotsResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !data.ok) {
        setLotsErr((data as any)?.error || `Request failed (${res.status})`);
        setLots([]);
        setSelectedLotId(null);
        return;
      }

      const nextLots = data.lots ?? [];
      setLots(nextLots);

      // ✅ preserve selection if it still exists; otherwise select first
      setSelectedLotId((cur) => {
        if (cur && nextLots.some((x) => x.id === cur)) return cur;
        return nextLots[0]?.id ?? null;
      });
    } catch (e: any) {
      setLotsErr(e?.message ? String(e.message) : "Network error");
      setLots([]);
      setSelectedLotId(null);
    } finally {
      setLotsBusy(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => loadLots(lotQ), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotQ]);

  async function submitPick(args: { qty: number; raw_scan?: string | null; lot_row_id?: string | null; note?: string | null }) {
    if (!props.isOpen) {
      props.onMessage({ tone: "muted", text: "Picking is disabled for this fulfillment." });
      return;
    }

    const q = Math.max(1, Math.floor(Number(args.qty || 1)));
    setBusy(true);
    props.onMessage(null);

    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/pick`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          fulfillment_item_id: props.fulfillmentItem.id,
          qty: q,
          note: args.note ?? null,
          raw_scan: args.raw_scan ?? null,
          lot_row_id: args.lot_row_id ?? null,
          allow_overpick: allowOverpick ? 1 : 0,
        }),
      });

      const data: PickResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !data.ok) {
        props.onMessage({ tone: "warn", text: (data as any)?.error || `Pick failed (${res.status})` });
        return;
      }

      props.onPicked(
        (data as any).next_picked_qty ?? safeNum(props.fulfillmentItem.picked_qty) + q,
        (data as any).next_on_hand ?? 0
      );

      if ((data as any).pick_logged === false && (data as any).pick_log_error) {
        props.onMessage({
          tone: "warn",
          text: `Picked ${q}, but history logging failed: ${(data as any).pick_log_error}`,
        });
      } else {
        props.onMessage({
          tone: "ok",
          text: `Picked ${q}. On-hand ${data.prior_on_hand} → ${data.next_on_hand}. Picked qty ${data.prior_picked_qty} → ${data.next_picked_qty}.`,
        });
      }

      setRawScan("");
      setNote("");
      setQty(1);

      loadLots(lotQ);
      setTimeout(() => scanRef.current?.focus(), 0);
      try {
        router.refresh();
      } catch {
        if (typeof window !== "undefined") window.location.reload();
      }
    } catch (e: any) {
      props.onMessage({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>, qtyVal: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = rawScan.trim();
      if (!v) return;
      submitPick({ qty: qtyVal, raw_scan: v, note: note.trim() || null });
    }
  }

  const qtyVal = Math.max(1, Math.floor(Number(qty || 1)));
  const selectedLot = lots.find((l) => l.id === selectedLotId) ?? null;
  const selectedMax = selectedLot ? safeNum(selectedLot.qty) : null;

  const overRemaining = qtyVal > props.remaining;
  const disabled = !props.isOpen || busy;

  return (
    <div style={{ display: "grid", gap: 14, opacity: props.isOpen ? 1 : 0.8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 12, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.8 }}>Scan label / barcode (recommended)</div>
          <input
            ref={scanRef}
            value={rawScan}
            onChange={(e) => setRawScan(e.target.value)}
            onKeyDown={(e) => onScanKeyDown(e, qtyVal)}
            onBlur={() => {}}
            placeholder="Scan GS1 label or SKU barcode… press Enter"
            style={inputStyle(disabled)}
            disabled={disabled}
          />
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            This picks against this line and attempts to decrement a matching serial/lot row automatically.
          </div>
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.8 }}>Qty</div>
            <input
              value={String(qtyVal)}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value || "1"))))}
              type="number"
              min={1}
              step="1"
              style={inputStyle(disabled)}
              disabled={disabled}
            />
          </label>

          <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13, opacity: 0.85 }}>
            <input type="checkbox" checked={allowOverpick} onChange={(e) => setAllowOverpick(e.target.checked)} disabled={disabled} />
            Allow over-pick (rare)
          </label>

          <button
            type="button"
            onClick={() => {
              const v = rawScan.trim();
              if (!v) {
                props.onMessage({ tone: "warn", text: "Scan something first (or use lot pick below)." });
                scanRef.current?.focus();
                return;
              }
              submitPick({ qty: qtyVal, raw_scan: v, note: note.trim() || null });
            }}
            style={buttonStyle(true, disabled || (!allowOverpick && overRemaining))}
            disabled={disabled || (!allowOverpick && overRemaining)}
            title={!allowOverpick && overRemaining ? `Qty exceeds remaining (${props.remaining}).` : ""}
          >
            {busy ? "Picking…" : "Pick from scan"}
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14, background: "white", overflow: "hidden" }}>
          <div
            style={{
              padding: 10,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              fontWeight: 950,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span>Pick from lots / serials</span>
            <button
              type="button"
              onClick={() => loadLots(lotQ)}
              style={{ ...buttonStyle(false, lotsBusy || busy), padding: "8px 10px", borderRadius: 10 }}
              disabled={lotsBusy || busy}
            >
              {lotsBusy ? "Loading…" : "Refresh"}
            </button>
          </div>

          <div style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <input
              value={lotQ}
              onChange={(e) => setLotQ(e.target.value)}
              placeholder="Search lot / serial / location…"
              style={inputStyle(lotsBusy || busy)}
              disabled={lotsBusy || busy}
            />
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Showing available rows (qty &gt; 0). FEFO ordering.</div>
          </div>

          {lotsErr ? <div style={{ padding: 10, color: "crimson", fontWeight: 900 }}>{lotsErr}</div> : null}

          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "white" }}>
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                  <th style={{ padding: 10 }} />
                  <th style={{ padding: 10 }}>LOT</th>
                  <th style={{ padding: 10 }}>Serial</th>
                  <th style={{ padding: 10 }}>EXP</th>
                  <th style={{ padding: 10 }}>Loc</th>
                  <th style={{ padding: 10 }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => {
                  const selected = l.id === selectedLotId;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLotId(l.id)}
                      style={{
                        borderTop: "1px solid rgba(0,0,0,0.06)",
                        cursor: "pointer",
                        background: selected ? "rgba(13,110,253,0.06)" : "transparent",
                      }}
                    >
                      <td style={{ padding: 10 }}>
                        <input type="radio" checked={selected} onChange={() => setSelectedLotId(l.id)} />
                      </td>
                      <td style={{ padding: 10, fontWeight: 950 }}>{l.lot_number}</td>
                      <td style={{ padding: 10, fontWeight: 900, opacity: 0.85 }}>{l.serial_number ?? "—"}</td>
                      <td style={{ padding: 10, fontWeight: 900, opacity: 0.85 }}>{l.expiration_date ?? "—"}</td>
                      <td style={{ padding: 10, fontWeight: 900, opacity: 0.75 }}>{l.location ?? "—"}</td>
                      <td style={{ padding: 10, fontWeight: 950 }}>{safeNum(l.qty)}</td>
                    </tr>
                  );
                })}

                {!lotsBusy && lots.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 12, opacity: 0.75 }}>
                      No available lots/serials (qty &gt; 0) for this variant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.08)", fontSize: 12, opacity: 0.75 }}>
            Clicking a row selects it. Picking from selected row decrements that row qty.
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 14,
            background: "white",
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 950 }}>Manual pick (selected lot)</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Line remaining: <b>{props.remaining}</b> {props.fulfillmentItem.uom}
          </div>

          {selectedLot ? (
            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
              Selected: <b>{selectedLot.lot_number}</b>
              {selectedLot.serial_number ? (
                <>
                  {" "}
                  · SN <b>{selectedLot.serial_number}</b>
                </>
              ) : null}
              {selectedLot.expiration_date ? (
                <>
                  {" "}
                  · EXP <b>{selectedLot.expiration_date}</b>
                </>
              ) : null}
              <br />
              Available in selected row: <b>{safeNum(selectedLot.qty)}</b>
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.75 }}>Select a lot/serial row on the left.</div>
          )}

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.8 }}>Note (optional)</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle(disabled)} disabled={disabled} />
          </label>

          {!allowOverpick && qtyVal > props.remaining ? (
            <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
              Qty exceeds line remaining ({props.remaining}). Enable “Allow over-pick” to force.
            </div>
          ) : null}

          {selectedMax != null && qtyVal > selectedMax ? (
            <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
              Qty exceeds selected row availability ({selectedMax}).
            </div>
          ) : null}

          <button
            type="button"
            disabled={
              disabled ||
              !selectedLotId ||
              (selectedMax != null && qtyVal > selectedMax) ||
              (!allowOverpick && qtyVal > props.remaining)
            }
            onClick={() => {
              if (!selectedLotId) return;
              submitPick({ qty: qtyVal, lot_row_id: selectedLotId, note: note.trim() || null });
            }}
            style={buttonStyle(
              true,
              disabled ||
                !selectedLotId ||
                (selectedMax != null && qtyVal > selectedMax) ||
                (!allowOverpick && qtyVal > props.remaining)
            )}
          >
            {busy ? "Picking…" : "Pick from selected lot"}
          </button>
        </div>
      </div>
    </div>
  );
}
