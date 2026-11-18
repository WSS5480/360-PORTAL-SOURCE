// src/app/admin/fulfillments/[fulfillmentId]/DropshipCard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatStatusLabel } from "@/lib/formatStatusLabel";

const DROPSHIP_BORDER = "rgba(217,70,239,0.28)";
const DROPSHIP_BG = "rgba(217,70,239,0.06)";
const DROPSHIP_HEADER_BG = "rgba(217,70,239,0.14)";
const DROPSHIP_TEXT = "#5b1b5d";
const DROPSHIP_PRIMARY = "#8b1c96";

function baseBorder(): React.CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: DROPSHIP_BORDER };
}

function card(): React.CSSProperties {
  return {
    ...baseBorder(),
    borderRadius: 16,
    background: DROPSHIP_BG,
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
    overflow: "hidden",
  };
}

function header(): React.CSSProperties {
  return {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    fontWeight: 950,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    background: DROPSHIP_HEADER_BG,
    color: DROPSHIP_TEXT,
  };
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    fontWeight: 950,
    fontSize: 12,
    background: active ? "rgba(217,70,239,0.20)" : "white",
    cursor: "pointer",
  };
}

function input(disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.03)" : "white",
    fontWeight: 850,
    outline: "none",
    boxSizing: "border-box",
    opacity: disabled ? 0.8 : 1,
  };
}

function btn(primary: boolean, disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.10)" : primary ? DROPSHIP_PRIMARY : "white",
    color: disabled ? "rgba(0,0,0,0.55)" : primary ? "white" : "#111",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 950,
  };
}

function miniBtn(disabled?: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.10)" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 950,
    fontSize: 12,
  };
}

function section(): React.CSSProperties {
  return {
    border: "1px solid rgba(217,70,239,0.20)",
    borderRadius: 12,
    padding: 10,
    background: "rgba(217,70,239,0.05)",
    display: "grid",
    gap: 8,
  };
}

function sectionTitle(): React.CSSProperties {
  return { fontWeight: 950, fontSize: 13 };
}

function mono(): React.CSSProperties {
  return { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
}

type VendorOpt = { id: string; name: string; email: string };

type TraceItemRow = {
  id: string;
  variant_id: string;
  description: string;
  required_qty: number;
  uom: string;
};

type TraceRow = {
  id: string;
  fulfillment_item_id: string;
  variant_id: string;
  lot_number: string | null;
  serial_number: string | null;
  expiration_date: string | null;
  qty: number;
  created_at: string;
};

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function parseSerialLines(raw: string): string[] {
  const xs = String(raw || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const k = x.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function trimOrNull(v: any) {
  const s = safeStr(v).trim();
  return s ? s : null;
}

function buildTrackingLink(carrierRaw: string, trackingRaw: string) {
  const c = safeUpper(carrierRaw);
  const t = safeStr(trackingRaw).trim();
  if (!t) return null;

  if (c.includes("FEDEX")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`;
  if (c.includes("UPS")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`;
  if (c.includes("USPS")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`;
  return null;
}

function normalizeMoneyInput(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: true, value: "" }; // blank = none/remove
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return { ok: false, error: "Shipping price must be a number (max 2 decimals)." };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Shipping price must be a valid non-negative number." };
  return { ok: true, value: s };
}

type PackingSlipInfo = {
  number: string;

  // persisted in fulfillment metadata.shipping (and order totals separately)
  shipping_usd: string; // optional
  carrier: string;
  tracking: string;
  label_url: string; // optional
  no_tracking: boolean;

  ship_date: string;
  notes: string;
};

export default function DropshipCard(props: {
  fulfillmentId: string;
  orderId: string;
  accountId: string;
  isOpen: boolean;

  fulfillmentSource: "INVENTORY" | "DROPSHIP";
  dropshipVendorId: string;

  vendors: VendorOpt[];

  po: { number: string; sent_at: string; sent_to: string; bucket: string; path: string; status: string };

  // NOTE: you currently pass: { number, carrier, tracking, ship_date, notes }
  packingSlip: { number: string; carrier: string; tracking: string; ship_date: string; notes: string } & Partial<{
    label_url: string;
    no_tracking: boolean;
    shipping_usd: string | number;
  }>;

  packingSlipFile?: { bucket: string; path: string; uploaded_at?: string } | null;
}) {
  const router = useRouter();

  const [source, setSource] = useState<"INVENTORY" | "DROPSHIP">(props.fulfillmentSource);
  const [vendorId, setVendorId] = useState<string>(props.dropshipVendorId || "");
  const [poState, setPoState] = useState(props.po);
  const [poBusy, setPoBusy] = useState(false);

  /** Vendors created in-session before `router.refresh()` repopulates from the server */
  const [vendorsExtra, setVendorsExtra] = useState<VendorOpt[]>([]);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [addVendorBusy, setAddVendorBusy] = useState(false);

  const [psBusy, setPsBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const canEdit = props.isOpen;
  const canEditDropship = canEdit && source === "DROPSHIP";

  const [psFile, setPsFile] = useState<File | null>(null);
  const [psFileBusy, setPsFileBusy] = useState(false);

  // Traceability
  const [traceBusy, setTraceBusy] = useState(false);
  const [traceCtx, setTraceCtx] = useState<{ items: TraceItemRow[]; traces: TraceRow[] } | null>(null);
  const [traceFulfillmentId, setTraceFulfillmentId] = useState<string>(props.fulfillmentId);
  const [traceDiag, setTraceDiag] = useState<{
    order_id: string;
    fulfillment_id: string | null;
    dropship_fulfillments: { id: string; status: string; created_at: string; item_count: number }[];
  } | null>(null);

  const [editingTraceId, setEditingTraceId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ lot: string; serial: string; exp: string; qty: string }>({
    lot: "",
    serial: "",
    exp: "",
    qty: "1",
  });

  const [ps, setPs] = useState<PackingSlipInfo>(() => {
    const initialShippingUsd =
      props.packingSlip?.shipping_usd === null || props.packingSlip?.shipping_usd === undefined
        ? ""
        : String(props.packingSlip.shipping_usd ?? "");

    return {
      number: String(props.packingSlip?.number ?? ""),
      shipping_usd: initialShippingUsd,
      carrier: String(props.packingSlip?.carrier ?? ""),
      tracking: String(props.packingSlip?.tracking ?? ""),
      label_url: String((props.packingSlip as any)?.label_url ?? ""),
      no_tracking: !!(props.packingSlip as any)?.no_tracking,
      ship_date: String(props.packingSlip?.ship_date ?? ""),
      notes: String(props.packingSlip?.notes ?? ""),
    };
  });

  // keep local state aligned after refresh/navigation
  useEffect(() => setSource(props.fulfillmentSource), [props.fulfillmentSource, props.fulfillmentId]);
  useEffect(() => setVendorId(props.dropshipVendorId || ""), [props.dropshipVendorId, props.fulfillmentId]);
  useEffect(() => setPoState(props.po), [props.po, props.fulfillmentId]);
  useEffect(() => setTraceFulfillmentId(props.fulfillmentId), [props.fulfillmentId]);
  useEffect(() => setVendorsExtra([]), [props.fulfillmentId]);
  useEffect(() => {
    const initialShippingUsd =
      props.packingSlip?.shipping_usd === null || props.packingSlip?.shipping_usd === undefined
        ? ""
        : String(props.packingSlip.shipping_usd ?? "");

    setPs({
      number: String(props.packingSlip?.number ?? ""),
      shipping_usd: initialShippingUsd,
      carrier: String(props.packingSlip?.carrier ?? ""),
      tracking: String(props.packingSlip?.tracking ?? ""),
      label_url: String((props.packingSlip as any)?.label_url ?? ""),
      no_tracking: !!(props.packingSlip as any)?.no_tracking,
      ship_date: String(props.packingSlip?.ship_date ?? ""),
      notes: String(props.packingSlip?.notes ?? ""),
    });
  }, [props.fulfillmentId, props.packingSlip]);

  const mergedVendors = useMemo(() => {
    const byId = new Map<string, VendorOpt>();
    for (const v of props.vendors) byId.set(v.id, v);
    for (const v of vendorsExtra) byId.set(v.id, v);
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [props.vendors, vendorsExtra]);

  const selectedVendor = useMemo(() => mergedVendors.find((v) => v.id === vendorId) || null, [mergedVendors, vendorId]);

  const traceTotals = useMemo(() => {
    const byItem = new Map<string, number>();
    for (const t of traceCtx?.traces ?? []) {
      const prev = byItem.get(t.fulfillment_item_id) ?? 0;
      byItem.set(t.fulfillment_item_id, prev + safeNum(t.qty));
    }
    return byItem;
  }, [traceCtx]);

  async function patchFulfillment(body: any) {
    const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/dropship`, {
      method: "PATCH",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed (${res.status})`);
    return json;
  }

  function handleMaybeRedirect(json: any): boolean {
    const rid = json?.redirect_fulfillment_id ? String(json.redirect_fulfillment_id) : "";
    if (rid) {
      router.push(`/admin/fulfillments/${encodeURIComponent(rid)}`);
      return true;
    }
    return false;
  }

  async function saveSource(nextSource: "INVENTORY" | "DROPSHIP") {
    if (!canEdit) return;

    setMsg(null);
    setPoBusy(true);

    const prevSource = source;
    const prevVendor = vendorId;

    try {
      setSource(nextSource);
      if (nextSource === "INVENTORY") setVendorId("");

      const json = await patchFulfillment({ fulfillment_source: nextSource });
      if (handleMaybeRedirect(json)) return;

      setMsg({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch (e: any) {
      setSource(prevSource);
      setVendorId(prevVendor);
      setMsg({ kind: "error", text: e?.message || "Failed to update fulfillment source." });
    } finally {
      setPoBusy(false);
    }
  }

  async function saveVendor(nextVendorId: string) {
    if (!canEdit) return;

    setMsg(null);
    setPoBusy(true);

    const prev = vendorId;
    setVendorId(nextVendorId);

    try {
      const json = await patchFulfillment({ dropship_vendor_id: nextVendorId || null });
      setSource("DROPSHIP");
      if (handleMaybeRedirect(json)) return;

      setMsg({ kind: "ok", text: "Vendor saved." });
      router.refresh();
    } catch (e: any) {
      setVendorId(prev);
      setMsg({ kind: "error", text: e?.message || "Failed to save vendor." });
    } finally {
      setPoBusy(false);
    }
  }

  async function createVendorAndSelect() {
    if (!canEditDropship) return;
    const name = newVendorName.trim();
    if (!name) {
      setMsg({ kind: "error", text: "Vendor name is required." });
      return;
    }

    setAddVendorBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/dropship-vendors", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          account_id: props.accountId,
          name,
          email: newVendorEmail.trim(),
          phone: newVendorPhone.trim(),
          address: {},
          notes: "",
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ? String(json.error) : `Failed (${res.status})`);

      const v = json.vendor as { id: string; name?: string; email?: string | null };
      const opt: VendorOpt = {
        id: String(v.id),
        name: String(v.name || name),
        email: String(v.email ?? ""),
      };
      setVendorsExtra((prev) => {
        const m = new Map(prev.map((x) => [x.id, x]));
        m.set(opt.id, opt);
        return Array.from(m.values());
      });
      setNewVendorName("");
      setNewVendorEmail("");
      setNewVendorPhone("");
      setShowAddVendor(false);
      await saveVendor(opt.id);
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message ? String(e.message) : "Failed to create vendor." });
    } finally {
      setAddVendorBusy(false);
    }
  }

  async function generatePo() {
    if (!canEdit) return;

    setMsg(null);
    setPoBusy(true);
    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/dropship/po`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed (${res.status})`);
      if (handleMaybeRedirect(json)) return;

      if (json?.po) {
        setPoState({
          number: String(json.po.number || ""),
          sent_at: String(props.po.sent_at || ""),
          sent_to: String(props.po.sent_to || ""),
          bucket: String(json.po.bucket || ""),
          path: String(json.po.path || ""),
          status: String(props.po.status || ""),
        });
      }

      setMsg({ kind: "ok", text: "PO generated." });
      router.refresh();
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "Failed to generate PO." });
    } finally {
      setPoBusy(false);
    }
  }

  async function openPo() {
    setMsg(null);
    setPoBusy(true);

    // Prefer /open (redirect) so it matches the order snapshot behavior,
    // but fall back to /url if /open doesn't exist in this deployment.
    try {
      const openUrl = `/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/dropship/po/open`;
      const w = window.open(openUrl, "_blank", "noopener,noreferrer");
      if (!w) throw new Error("Popup blocked.");
      setMsg(null);
      return;
    } catch {
      // ignore and try /url fallback below
    } finally {
      setPoBusy(false);
    }

    // fallback /url
    setPoBusy(true);
    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/dropship/po/url`, {
        headers: { accept: "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !json?.url) throw new Error(json?.error || `Failed (${res.status})`);
      window.open(String(json.url), "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "Failed to open PO." });
    } finally {
      setPoBusy(false);
    }
  }

  async function upsertOrderShipping(orderId: string | undefined, shippingUsdNormalized: string) {
    if (!orderId) return;
    const fd = new FormData();
    fd.set("shipping_usd", shippingUsdNormalized); // blank = remove/none
    await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/shipping`, {
      method: "POST",
      body: fd,
      headers: { accept: "application/json" },
    }).catch(() => null);
  }

  // ✅ Save-only for dropship (does NOT close fulfillment)
  // FIX: persist shipping_usd/label_url/no_tracking into fulfillments.metadata.shipping via /dropship route.
  async function saveDropshipShippingOnly() {
    if (!canEdit) return;

    setMsg(null);
    setPsBusy(true);

    try {
      const norm = normalizeMoneyInput(ps.shipping_usd);
      if (!norm.ok) throw new Error(norm.error);

      const payload: any = {
        // existing column fields
        dropship_packing_slip_number: trimOrNull(ps.number),
        dropship_carrier: trimOrNull(ps.carrier),
        dropship_tracking_number: trimOrNull(ps.tracking), // ok if blank
        dropship_ship_date: trimOrNull(ps.ship_date),
        dropship_notes: trimOrNull(ps.notes),

        // ✅ NEW: persist to metadata.shipping (handled by your /dropship route)
        shipping_usd: norm.value, // blank clears
        dropship_label_url: trimOrNull(ps.label_url),
        dropship_no_tracking: ps.no_tracking ? 1 : 0,
      };

      const json = await patchFulfillment(payload);
      if (handleMaybeRedirect(json)) return;

      // keep order totals consistent (order-level shipping)
      await upsertOrderShipping(props.orderId, norm.value);

      setMsg({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "Failed to save dropship shipping." });
    } finally {
      setPsBusy(false);
    }
  }

  async function uploadPackingSlipFile() {
    if (!psFile) {
      setMsg({ kind: "error", text: "Choose a packing slip file first." });
      return;
    }
    if (!canEdit) return;

    setMsg(null);
    setPsFileBusy(true);

    try {
      const fd = new FormData();
      fd.append("file", psFile);

      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/dropship/packing-slip`, {
        method: "PATCH",
        body: fd,
        headers: { accept: "application/json" },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed (${res.status})`);
      if (handleMaybeRedirect(json)) return;

      setMsg({ kind: "ok", text: "Packing slip uploaded." });
      setPsFile(null);
      router.refresh();
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "Failed to upload packing slip." });
    } finally {
      setPsFileBusy(false);
    }
  }

  async function openLatestPackingSlip() {
    setMsg(null);
    setPsFileBusy(true);
    try {
      const res = await fetch(
        `/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/dropship/packing-slip/url`,
        { headers: { accept: "application/json" } }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !json?.url) throw new Error(json?.error || `Failed (${res.status})`);
      window.open(String(json.url), "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "No packing slip file available yet." });
    } finally {
      setPsFileBusy(false);
    }
  }

  async function loadTraceContext() {
    setMsg(null);
    setTraceBusy(true);
    try {
      const requestId = traceFulfillmentId || props.fulfillmentId;
      const res = await fetch(
        `/api/admin/fulfillments/${encodeURIComponent(requestId)}/dropship/trace-context?orderId=${encodeURIComponent(
          props.orderId
        )}`,
        { headers: { accept: "application/json" } }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed (${res.status})`);

      const items: TraceItemRow[] = (json.items ?? []).map((r: any) => ({
        id: String(r.id),
        variant_id: String(r.variant_id),
        description: String(r.description || "Item"),
        required_qty: safeNum(r.required_qty),
        uom: String(r.uom || "Units"),
      }));

      const traces: TraceRow[] = (json.traces ?? []).map((t: any) => ({
        id: String(t.id),
        fulfillment_item_id: String(t.fulfillment_item_id),
        variant_id: String(t.variant_id),
        lot_number: t.lot_number ? String(t.lot_number) : null,
        serial_number: t.serial_number ? String(t.serial_number) : null,
        expiration_date: t.expiration_date ? String(t.expiration_date) : null,
        qty: safeNum(t.qty),
        created_at: String(t.created_at || ""),
      }));

      const effectiveId = String(json.fulfillment_id || requestId || props.fulfillmentId);
      if (effectiveId) setTraceFulfillmentId(effectiveId);
      setTraceCtx({ items, traces });
      if (items.length === 0) {
        setMsg({ kind: "error", text: "No fulfillment items found for dropship. Assign dropship qty to create items." });
        try {
          const diagRes = await fetch(
            `/api/admin/orders/${encodeURIComponent(props.orderId)}/dropship-diagnostics?fulfillmentId=${encodeURIComponent(
              effectiveId || props.fulfillmentId
            )}`,
            { headers: { accept: "application/json" } }
          );
          const diagJson = await diagRes.json().catch(() => null);
          if (diagRes.ok && diagJson?.ok) {
            setTraceDiag({
              order_id: String(diagJson.order_id || props.orderId),
              fulfillment_id: diagJson.fulfillment_id ? String(diagJson.fulfillment_id) : null,
              dropship_fulfillments: Array.isArray(diagJson.dropship_fulfillments)
                ? diagJson.dropship_fulfillments.map((f: any) => ({
                    id: String(f.id),
                    status: String(f.status || ""),
                    created_at: String(f.created_at || ""),
                    item_count: Number(f.item_count || 0),
                  }))
                : [],
            });
          }
        } catch {}
      } else {
        setMsg({ kind: "ok", text: "Traceability loaded." });
        setTraceDiag(null);
      }
      if (effectiveId && String(effectiveId) !== String(props.fulfillmentId)) {
        window.dispatchEvent(new CustomEvent("dropship-panel-open", { detail: { fulfillmentId: effectiveId } }));
      }
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "Failed to load traceability." });
    } finally {
      setTraceBusy(false);
    }
  }

  async function postSingleTrace(args: {
    fulfillment_item_id: string;
    variant_id: string;
    qty: number;
    lot_number?: string | null;
    serial_number?: string | null;
    expiration_date?: string | null;
  }) {
    const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(traceFulfillmentId)}/dropship/trace`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        fulfillment_item_id: args.fulfillment_item_id,
        variant_id: args.variant_id,
        qty: args.qty,
        lot_number: args.lot_number ?? null,
        serial_number: args.serial_number ?? null,
        expiration_date: args.expiration_date ?? null,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed (${res.status})`);
    return json;
  }

  async function submitTraceForItem(item: TraceItemRow, payload: { lot: string; exp: string; qty: string; serials: string }) {
    setMsg(null);
    setTraceBusy(true);

    try {
      const lot = payload.lot.trim();
      const exp = payload.exp.trim();
      const qtyNum = Math.max(1, Math.floor(safeNum(payload.qty || "1")));
      const serials = parseSerialLines(payload.serials);

      if (!item?.id || !item?.variant_id) throw new Error("Missing fulfillment item / variant id.");

      if (serials.length > 0) {
        for (const sn of serials) {
          await postSingleTrace({
            fulfillment_item_id: item.id,
            variant_id: item.variant_id,
            qty: 1,
            lot_number: lot || null,
            serial_number: sn,
            expiration_date: exp || null,
          });
        }
        setMsg({ kind: "ok", text: `Saved ${serials.length} serial(s) for this item.` });
      } else {
        await postSingleTrace({
          fulfillment_item_id: item.id,
          variant_id: item.variant_id,
          qty: qtyNum,
          lot_number: lot || null,
          serial_number: null,
          expiration_date: exp || null,
        });

        setMsg({ kind: "ok", text: `Saved lot trace (qty ${qtyNum}).` });
      }

      await loadTraceContext();
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "Failed to save trace." });
    } finally {
      setTraceBusy(false);
    }
  }

  async function startEditTrace(t: TraceRow) {
    setEditingTraceId(t.id);
    setEditDraft({
      lot: t.lot_number ?? "",
      serial: t.serial_number ?? "",
      exp: t.expiration_date ?? "",
      qty: String(Math.max(1, Math.floor(safeNum(t.qty)))),
    });
  }

  async function saveEditTrace(traceId: string) {
    setMsg(null);
    setTraceBusy(true);
    try {
      const qty = Math.max(1, Math.floor(safeNum(editDraft.qty || "1")));

      const res = await fetch(
        `/api/admin/fulfillments/${encodeURIComponent(traceFulfillmentId)}/dropship/trace/${encodeURIComponent(traceId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            qty,
            lot_number: editDraft.lot.trim() || null,
            serial_number: editDraft.serial.trim() || null,
            expiration_date: editDraft.exp.trim() || null,
          }),
        }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed (${res.status})`);

      setEditingTraceId(null);
      setMsg({ kind: "ok", text: "Trace updated." });
      await loadTraceContext();
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "Failed to update trace." });
    } finally {
      setTraceBusy(false);
    }
  }

  async function deleteTrace(traceId: string) {
    if (!confirm("Delete this trace row?")) return;

    setMsg(null);
    setTraceBusy(true);
    try {
      const res = await fetch(
        `/api/admin/fulfillments/${encodeURIComponent(traceFulfillmentId)}/dropship/trace/${encodeURIComponent(traceId)}`,
        { method: "DELETE", headers: { accept: "application/json" } }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed (${res.status})`);

      setEditingTraceId(null);
      setMsg({ kind: "ok", text: "Trace deleted." });
      await loadTraceContext();
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message || "Failed to delete trace." });
    } finally {
      setTraceBusy(false);
    }
  }

  const filePointerText = useMemo(() => {
    if (!props.packingSlipFile?.path) return "";
    const p = String(props.packingSlipFile.path);
    return p.length > 90 ? p.slice(0, 90) + "…" : p;
  }, [props.packingSlipFile?.path]);

  const trackingLink = useMemo(() => buildTrackingLink(ps.carrier, ps.tracking), [ps.carrier, ps.tracking]);
  const trackingRequiredMissing = !ps.no_tracking && !safeStr(ps.tracking).trim();

  useEffect(() => {
    if (source !== "DROPSHIP") return;
    loadTraceContext().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fulfillmentId]);

  return (
    <div style={card()}>
      <div style={header()}>
        <div>Dropship</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={pill(source === "DROPSHIP")}>{source === "DROPSHIP" ? "DROPSHIP" : "INVENTORY"}</span>
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          Fulfillment: <span style={mono()}>{props.fulfillmentId}</span> · Order:{" "}
          <span style={mono()}>{props.orderId}</span>
        </div>
        {msg ? (
          <div
            style={{
              ...baseBorder(),
              borderRadius: 12,
              padding: 10,
              fontWeight: 900,
              fontSize: 13,
              background: msg.kind === "ok" ? "rgba(25,135,84,0.12)" : "rgba(220,53,69,0.12)",
            }}
          >
            {msg.text}
          </div>
        ) : null}

        {source !== "DROPSHIP" ? (
          <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
            Inventory fulfillment: dropship fields are read-only until this fulfillment is DROPSHIP.
          </div>
        ) : null}

        <>
            {/* Vendor + PO */}
            <div style={section()}>
              <div style={sectionTitle()}>Vendor + PO</div>

              <select
                value={vendorId}
                onChange={(e) => saveVendor(e.target.value)}
                disabled={!canEditDropship || poBusy || addVendorBusy}
                style={input(!canEditDropship || poBusy || addVendorBusy)}
              >
                <option value="">— Select vendor —</option>
                {mergedVendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.email ? ` (${v.email})` : ""}
                  </option>
                ))}
              </select>

              {canEditDropship ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {!showAddVendor ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddVendor(true);
                        setMsg(null);
                      }}
                      disabled={poBusy || addVendorBusy}
                      style={miniBtn(!!poBusy || addVendorBusy)}
                    >
                      + Add new vendor
                    </button>
                  ) : (
                    <div
                      style={{
                        ...section(),
                        padding: 10,
                        background: "rgba(255,255,255,0.65)",
                      }}
                    >
                      <div style={{ fontWeight: 950, fontSize: 12 }}>New vendor</div>
                      <input
                        placeholder="Vendor name *"
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        disabled={addVendorBusy}
                        style={input(!!addVendorBusy)}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input
                          placeholder="Email (optional)"
                          value={newVendorEmail}
                          onChange={(e) => setNewVendorEmail(e.target.value)}
                          disabled={addVendorBusy}
                          style={input(!!addVendorBusy)}
                        />
                        <input
                          placeholder="Phone (optional)"
                          value={newVendorPhone}
                          onChange={(e) => setNewVendorPhone(e.target.value)}
                          disabled={addVendorBusy}
                          style={input(!!addVendorBusy)}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => void createVendorAndSelect()}
                          disabled={addVendorBusy || !newVendorName.trim() || poBusy}
                          style={btn(true, addVendorBusy || !newVendorName.trim() || poBusy)}
                        >
                          {addVendorBusy ? "Saving…" : "Create & select"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddVendor(false);
                            setNewVendorName("");
                            setNewVendorEmail("");
                            setNewVendorPhone("");
                          }}
                          disabled={addVendorBusy}
                          style={miniBtn(addVendorBusy)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {selectedVendor ? (
                <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.4 }}>
                  Selected: <b>{selectedVendor.name}</b>
                  {selectedVendor.email ? <> • {selectedVendor.email}</> : null}
                  <div style={{ ...mono(), fontSize: 11, opacity: 0.65, marginTop: 4 }}>{selectedVendor.id}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>Pick a vendor above.</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  disabled={!canEditDropship || !vendorId || poBusy}
                  style={btn(true, !canEditDropship || !vendorId || poBusy)}
                  onClick={generatePo}
                >
                  {poBusy ? "Working…" : "Generate PO"}
                </button>

                <button type="button" disabled={!poState.path || poBusy} style={btn(false, !poState.path || poBusy)} onClick={openPo}>
                  Open PO
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                PO: <b>{poState.number || "—"}</b>
                {!poState.path ? (
                  <>
                    <br />
                    Generate to create the PO file.
                  </>
                ) : null}
              </div>
            </div>

            {/* Packing slip file */}
            <div style={section()}>
              <div style={sectionTitle()}>Packing slip file</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                <input
                  type="file"
                  onChange={(e) => setPsFile(e.target.files?.[0] ?? null)}
                  style={input(psFileBusy || !canEditDropship)}
                  disabled={psFileBusy || !canEditDropship}
                  accept="application/pdf,image/*"
                />
                <button
                  type="button"
                  onClick={uploadPackingSlipFile}
                  disabled={!canEditDropship || !psFile || psFileBusy}
                  style={miniBtn(!canEditDropship || !psFile || psFileBusy)}
                >
                  {psFileBusy ? "Uploading…" : "Upload"}
                </button>
              </div>

              <button type="button" onClick={openLatestPackingSlip} disabled={psFileBusy} style={btn(false, psFileBusy)}>
                Open latest file
              </button>

              {filePointerText ? (
                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                  Saved: <span style={mono()}>{filePointerText}</span>
                </div>
              ) : null}
            </div>

            {/* Dropship shipping */}
            <div style={section()}>
              <div style={sectionTitle()}>Dropship shipping</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Shipping price (USD)</div>
                  <input
                    value={ps.shipping_usd}
                    onChange={(e) => setPs({ ...ps, shipping_usd: e.target.value })}
                    placeholder="e.g. 24.95"
                    inputMode="decimal"
                    style={input(!canEditDropship || psBusy)}
                    disabled={!canEditDropship || psBusy}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Packing slip #</div>
                  <input
                    value={ps.number}
                    onChange={(e) => setPs({ ...ps, number: e.target.value })}
                    style={input(!canEditDropship || psBusy)}
                    disabled={!canEditDropship || psBusy}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Carrier</div>
                  <input
                    value={ps.carrier}
                    onChange={(e) => setPs({ ...ps, carrier: e.target.value })}
                    style={input(!canEditDropship || psBusy)}
                    disabled={!canEditDropship || psBusy}
                    placeholder="FedEx / UPS / USPS"
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                    Tracking # {ps.no_tracking ? "(optional)" : "(required to ship)"}
                  </div>
                  <input
                    value={ps.tracking}
                    onChange={(e) => setPs({ ...ps, tracking: e.target.value })}
                    style={input(!canEditDropship || psBusy)}
                    disabled={!canEditDropship || psBusy}
                    placeholder="1Z… / 96…"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Label URL (optional)</div>
                <input
                  value={ps.label_url}
                  onChange={(e) => setPs({ ...ps, label_url: e.target.value })}
                  style={input(!canEditDropship || psBusy)}
                  disabled={!canEditDropship || psBusy}
                  placeholder="https://…"
                />
              </div>

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  fontWeight: 900,
                  fontSize: 13,
                  opacity: !canEditDropship || psBusy ? 0.6 : 0.9,
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={ps.no_tracking}
                  onChange={(e) => setPs({ ...ps, no_tracking: e.target.checked })}
                  disabled={!canEditDropship || psBusy}
                />
                No tracking (local delivery / will-call / courier)
              </label>

              {trackingRequiredMissing && canEditDropship ? (
                <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
                  Tracking is required to mark shipped (or enable “No tracking”).
                </div>
              ) : null}

              {safeStr(ps.tracking).trim() ? (
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Tracking:{" "}
                  {trackingLink ? (
                    <a href={trackingLink} target="_blank" rel="noreferrer" style={{ fontWeight: 950, textDecoration: "none" }}>
                      {safeStr(ps.tracking).trim()}
                    </a>
                  ) : (
                    <span style={{ fontWeight: 950 }}>{safeStr(ps.tracking).trim()}</span>
                  )}
                </div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Ship date</div>
                  <input
                    type="date"
                    value={ps.ship_date}
                    onChange={(e) => setPs({ ...ps, ship_date: e.target.value })}
                    style={input(!canEditDropship || psBusy)}
                    disabled={!canEditDropship || psBusy}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Notes</div>
                  <input
                    value={ps.notes}
                    onChange={(e) => setPs({ ...ps, notes: e.target.value })}
                    style={input(!canEditDropship || psBusy)}
                    disabled={!canEditDropship || psBusy}
                  />
                </div>
              </div>

              <button type="button" disabled={psBusy || !canEditDropship} style={btn(true, psBusy || !canEditDropship)} onClick={saveDropshipShippingOnly}>
                {psBusy ? "Saving…" : "Save shipping"}
              </button>
            </div>

            <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

            <div id="dropship-traceability">
              <TraceabilityBlock
                fulfillmentId={traceFulfillmentId}
                orderId={props.orderId}
                canEdit={canEditDropship}
                busy={traceBusy}
                ctx={traceCtx}
                totals={traceTotals}
                onLoad={loadTraceContext}
                onSubmit={submitTraceForItem}
                editingTraceId={editingTraceId}
                onStartEdit={startEditTrace}
                onCancelEdit={() => setEditingTraceId(null)}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                onSaveEdit={saveEditTrace}
                onDelete={deleteTrace}
                diagnostics={traceDiag}
              />
            </div>

        </>
      </div>
    </div>
  );
}

function TraceabilityBlock(props: {
  fulfillmentId: string;
  orderId: string;
  canEdit: boolean;
  busy: boolean;
  ctx: { items: TraceItemRow[]; traces: TraceRow[] } | null;
  totals: Map<string, number>;
  onLoad: () => void;
  diagnostics:
    | {
        order_id: string;
        fulfillment_id: string | null;
        dropship_fulfillments: { id: string; status: string; created_at: string; item_count: number }[];
      }
    | null;
  onSubmit: (item: TraceItemRow, payload: { lot: string; exp: string; qty: string; serials: string }) => void | Promise<void>;

  editingTraceId: string | null;
  onStartEdit: (t: TraceRow) => void;
  onCancelEdit: () => void;
  editDraft: { lot: string; serial: string; exp: string; qty: string };
  setEditDraft: (d: { lot: string; serial: string; exp: string; qty: string }) => void;
  onSaveEdit: (traceId: string) => void;
  onDelete: (traceId: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, { lot: string; exp: string; qty: string; serials: string }>>({});
  const [openAll, setOpenAll] = useState(false);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [bulkItemId, setBulkItemId] = useState<string>("");
  const [bulkLot, setBulkLot] = useState<string>("");
  const [bulkExp, setBulkExp] = useState<string>("");
  const [bulkQty, setBulkQty] = useState<string>("1");
  const [bulkSerials, setBulkSerials] = useState<string>("");
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickMsg, setQuickMsg] = useState<string>("");

  function getDraft(itemId: string) {
    return drafts[itemId] || { lot: "", exp: "", qty: "", serials: "" };
  }

  function setDraft(itemId: string, next: { lot: string; exp: string; qty: string; serials: string }) {
    setDrafts((d) => ({ ...d, [itemId]: next }));
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>Traceability</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, opacity: 0.65 }}>
            Items: {props.ctx ? props.ctx.items.length : "—"}
          </span>
          {props.ctx ? (
            <>
              <button type="button" onClick={() => setOpenAll(true)} disabled={props.busy} style={miniBtn(props.busy)}>
                Expand all
              </button>
              <button type="button" onClick={() => setOpenAll(false)} disabled={props.busy} style={miniBtn(props.busy)}>
                Collapse all
              </button>
            </>
          ) : null}
          <button type="button" onClick={props.onLoad} disabled={props.busy} style={miniBtn(props.busy)}>
            {props.busy ? "Loading…" : props.ctx ? "Refresh" : "Load"}
          </button>
        </div>
      </div>

      {!props.ctx ? (
        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
          Click <b>Load</b> to pull items, then expand a line to add lot/serials.
        </div>
      ) : props.ctx.items.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.75 }}>No fulfillment items found.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ ...section(), background: "rgba(217,70,239,0.10)" }}>
            <div style={sectionTitle()}>Add trace</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Select an item, then paste serials (one per line) or enter a lot quantity.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select value={bulkItemId} onChange={(e) => setBulkItemId(e.target.value)} style={input()}>
                <option value="">— Select item —</option>
                {props.ctx.items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.description}
                  </option>
                ))}
              </select>
              <input
                value={bulkQty}
                onChange={(e) => setBulkQty(e.target.value)}
                placeholder="Qty (lot-based)"
                style={input()}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input value={bulkLot} onChange={(e) => setBulkLot(e.target.value)} placeholder="Lot #" style={input()} />
              <input type="date" value={bulkExp} onChange={(e) => setBulkExp(e.target.value)} style={input()} />
            </div>
            <textarea
              value={bulkSerials}
              onChange={(e) => setBulkSerials(e.target.value)}
              style={{
                ...input(),
                minHeight: 90,
                resize: "vertical",
                fontWeight: 800,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
              placeholder={"Serials (one per line)\nABC123\nABC124\nABC125"}
            />
            <button
              type="button"
              disabled={!props.canEdit || quickBusy || !bulkItemId}
              style={btn(true, !props.canEdit || quickBusy || !bulkItemId)}
              onClick={async () => {
                const item = props.ctx?.items.find((x) => x.id === bulkItemId);
                if (!item) {
                  setQuickMsg("Select an item first.");
                  return;
                }
                setQuickBusy(true);
                setQuickMsg("");
                try {
                  await props.onSubmit(item, { lot: bulkLot, exp: bulkExp, qty: bulkQty, serials: bulkSerials });
                  setBulkSerials("");
                  await props.onLoad();
                  try {
                  const res = await fetch(
                    `/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/dropship/trace-context?orderId=${encodeURIComponent(
                      props.orderId
                    )}`,
                    { headers: { accept: "application/json" } }
                  );
                    const json = await res.json().catch(() => null);
                    if (res.ok && json?.ok) {
                      window.dispatchEvent(new CustomEvent("dropship-trace-updated", { detail: json }));
                    if (json.fulfillment_id && String(json.fulfillment_id) !== String(props.fulfillmentId)) {
                      window.dispatchEvent(
                        new CustomEvent("dropship-panel-open", { detail: { fulfillmentId: json.fulfillment_id } })
                      );
                    }
                    }
                  } catch {}
                  setQuickMsg("Saved.");
                } catch (e: any) {
                  setQuickMsg(e?.message ? String(e.message) : "Failed to save.");
                } finally {
                  setQuickBusy(false);
                }
              }}
            >
              {quickBusy ? "Saving…" : "Save"}
            </button>
            {quickMsg ? <div style={{ fontSize: 12, opacity: 0.75 }}>{quickMsg}</div> : null}
          </div>

          {props.ctx.items.map((it) => {
            const logged = props.totals.get(it.id) ?? 0;
            const required = safeNum(it.required_qty);
            const d = getDraft(it.id);
            const complete = required > 0 && logged >= required;

            return (
              <details
                key={it.id}
                open={openAll || !!openMap[it.id]}
                onToggle={(e) => {
                  const isOpen = (e.target as HTMLDetailsElement).open;
                  setOpenMap((prev) => ({ ...prev, [it.id]: isOpen }));
                }}
                style={{
                  ...baseBorder(),
                  borderRadius: 14,
                  padding: 10,
                  background: complete ? "rgba(25,135,84,0.06)" : "white",
                }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 950, listStyle: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div>{it.description}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                      Logged <b>{logged}</b> / Required <b>{required}</b> {it.uom}
                    </div>
                  </div>
                </summary>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Lot #</div>
                      <input value={d.lot} onChange={(e) => setDraft(it.id, { ...d, lot: e.target.value })} style={input()} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Expiration</div>
                      <input type="date" value={d.exp} onChange={(e) => setDraft(it.id, { ...d, exp: e.target.value })} style={input()} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Qty (lot-based)</div>
                      <input value={d.qty} onChange={(e) => setDraft(it.id, { ...d, qty: e.target.value })} style={input()} placeholder="e.g. 5" />
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Serials (one per line)</div>
                      <textarea
                        value={d.serials}
                        onChange={(e) => setDraft(it.id, { ...d, serials: e.target.value })}
                        style={{
                          ...input(),
                          minHeight: 88,
                          resize: "vertical",
                          fontWeight: 800,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}
                        placeholder={"ABC123\nABC124\nABC125"}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <button type="button" disabled={!props.canEdit || props.busy} style={btn(true, !props.canEdit || props.busy)} onClick={() => props.onSubmit(it, d)}>
                      {props.busy ? "Saving…" : "Save trace"}
                    </button>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {props.ctx && props.ctx.items.length === 0 && props.diagnostics ? (
        <div style={{ ...section(), background: "rgba(255,193,7,0.08)" }}>
          <div style={sectionTitle()}>Diagnostics</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Dropship fulfillments for this order and their item counts.
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
            {props.diagnostics.dropship_fulfillments.map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontWeight: 900 }}>{f.id}</span>
                <span style={{ opacity: 0.8 }}>{formatStatusLabel(f.status)}</span>
                <span style={{ opacity: 0.8 }}>{f.item_count} item(s)</span>
              </div>
            ))}
            {props.diagnostics.dropship_fulfillments.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No dropship fulfillments found for this order.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
