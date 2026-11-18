"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PortalOrderHero from "@/components/portal/PortalOrderHero";
import PortalProcessingOverlay from "@/components/portal/PortalProcessingOverlay";
import PortalBillingShippingCard, {
  emptyAddressDraft,
  type SavedAddressRow,
} from "@/components/portal/PortalBillingShippingCard";
import { draftAddressMinComplete, draftAddressOneLine, type AddressDraft } from "@/components/portal/portalAddressUi";
import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";

type BalanceRow = {
  product_variant_id: string;
  product_id: string | null;
  quantity: number;
  sku: string;
  size_label: string | null;
  product_name: string | null;
  product_code: string | null;
  product_qcode: string | null;
  sqcm_per_unit: number | null;
  line_sqcm: number | null;
};

type SortMode = "NAME_ASC" | "SKU_ASC" | "ON_HAND_DESC";

type ShippingPriority =
  | "GROUND"
  | "THREE_DAY"
  | "TWO_DAY"
  | "TWO_DAY_AM"
  | "OVERNIGHT_AM"
  | "FIRST_OVERNIGHT"
  | "PRIORITY_OVERNIGHT";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeQty(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function fmtSqcm(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** API may return sq cm as number or string (Postgres numeric). */
function parseVirtualWarehousePool(json: { sqcm_pool?: unknown; total_sqcm_on_hand?: unknown } | null): number | null {
  const raw = json?.sqcm_pool ?? json?.total_sqcm_on_hand;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  return Math.max(0, n);
}

function pillStyle(tone: "muted" | "ok" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    whiteSpace: "nowrap",
    lineHeight: 1,
    background: "white",
    color: "rgba(15, 23, 42, 0.95)",
  };
  if (tone === "ok") return { ...base, background: "rgba(25, 135, 84, 0.12)" };
  if (tone === "warn") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return { ...base, background: "rgba(0,0,0,0.04)", opacity: 0.95 };
}

function etaFromPriority(p: ShippingPriority): number {
  if (p === "OVERNIGHT_AM" || p === "FIRST_OVERNIGHT" || p === "PRIORITY_OVERNIGHT") return 1;
  if (p === "TWO_DAY" || p === "TWO_DAY_AM") return 2;
  if (p === "THREE_DAY") return 3;
  return 3;
}

function addressDraftToJson(d: AddressDraft) {
  return {
    company: d.company || null,
    attn: d.attn || null,
    line1: d.line1 || null,
    line2: d.line2 || null,
    city: d.city || null,
    state: d.state || null,
    postal: d.postal || null,
    country: d.country || null,
    phone: d.phone || null,
    email: d.email || null,
    notes: d.notes || null,
  };
}

export default function VirtualWarehouseFulfillClient(props: {
  accountName: string;
  termsLabel: string;
  billingAddresses: SavedAddressRow[];
  shippingAddresses: SavedAddressRow[];
  defaultBillingId: string;
  defaultShippingId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [totalSqcmOnHand, setTotalSqcmOnHand] = useState<number | null>(null);

  const [q, setQ] = useState("");
  /** Default: show SKUs with virtual balance first so qty controls are easy to find. */
  const [sortMode, setSortMode] = useState<SortMode>("ON_HAND_DESC");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [qtyByVariant, setQtyByVariant] = useState<Record<string, number>>({});

  const [billingMode, setBillingMode] = useState<"SAVED" | "NEW">("SAVED");
  const [shippingMode, setShippingMode] = useState<"SAVED" | "NEW">("SAVED");
  const [billingAddressId, setBillingAddressId] = useState(props.defaultBillingId || "");
  const [shippingAddressId, setShippingAddressId] = useState(props.defaultShippingId || "");
  const [billingDraft, setBillingDraft] = useState<AddressDraft>(emptyAddressDraft("Billing"));
  const [shippingDraft, setShippingDraft] = useState<AddressDraft>(emptyAddressDraft("Shipping"));

  const [billingList, setBillingList] = useState<SavedAddressRow[]>(() => props.billingAddresses ?? []);
  const [shippingList, setShippingList] = useState<SavedAddressRow[]>(() => props.shippingAddresses ?? []);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [billingSaveErr, setBillingSaveErr] = useState<string | null>(null);
  const [shippingSaveErr, setShippingSaveErr] = useState<string | null>(null);

  const [shippingPriority, setShippingPriority] = useState<ShippingPriority>("FIRST_OVERNIGHT");
  const [submitting, setSubmitting] = useState(false);
  const [showPlaceConfirm, setShowPlaceConfirm] = useState(false);
  const submitLockRef = useRef(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const placeConfirmRef = useRef<HTMLDivElement | null>(null);
  const initialExpandDoneRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/portal/virtual-warehouse", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !json?.ok) {
          setErr(json?.error || `Failed to load (${res.status})`);
          setBalances([]);
          return;
        }
        setBalances(Array.isArray(json.balances) ? json.balances : []);
        setTotalSqcmOnHand(parseVirtualWarehousePool(json));
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (showPlaceConfirm) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      placeConfirmRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [showPlaceConfirm]);

  const variantMeta = useMemo(() => {
    const m = new Map<
      string,
      {
        sku: string;
        size_label: string | null;
        product_name: string | null;
        product_code: string | null;
        product_qcode: string | null;
        product_id: string | null;
        sqcm: number;
      }
    >();
    for (const b of balances) {
      const id = String(b.product_variant_id);
      const per =
        b.sqcm_per_unit != null && Number.isFinite(Number(b.sqcm_per_unit))
          ? Number(b.sqcm_per_unit)
          : sqcmFromVariant({
              total_sqcm: b.sqcm_per_unit,
              width_cm: null,
              length_cm: null,
              size_label: b.size_label,
            });
      m.set(id, {
        sku: b.sku,
        size_label: b.size_label,
        product_name: b.product_name,
        product_code: b.product_code,
        product_qcode: b.product_qcode,
        product_id: b.product_id,
        sqcm: per,
      });
    }
    return m;
  }, [balances]);

  /** Fungible sq cm pool: max units per SKU depends on what you already allocated to other lines. */
  const maxByVariant = useMemo(() => {
    const poolSqcm = totalSqcmOnHand ?? 0;
    const m = new Map<string, number>();
    for (const b of balances) {
      const id = String(b.product_variant_id);
      const per =
        b.sqcm_per_unit != null && Number.isFinite(Number(b.sqcm_per_unit))
          ? Number(b.sqcm_per_unit)
          : sqcmFromVariant({
              total_sqcm: b.sqcm_per_unit,
              width_cm: null,
              length_cm: null,
              size_label: b.size_label,
            });
      if (per <= 0) {
        m.set(id, 0);
        continue;
      }
      let othersSqcm = 0;
      for (const [oid, q] of Object.entries(qtyByVariant)) {
        if (oid === id) continue;
        const oq = safeQty(q);
        if (oq <= 0) continue;
        const om =
          variantMeta.get(oid)?.sqcm ??
          (() => {
            const ob = balances.find((x) => String(x.product_variant_id) === oid);
            if (!ob) return 0;
            if (ob.sqcm_per_unit != null && Number.isFinite(Number(ob.sqcm_per_unit))) return Number(ob.sqcm_per_unit);
            return sqcmFromVariant({
              total_sqcm: ob.sqcm_per_unit,
              width_cm: null,
              length_cm: null,
              size_label: ob.size_label,
            });
          })();
        othersSqcm += oq * om;
      }
      const remaining = Math.max(0, poolSqcm - othersSqcm);
      m.set(id, Math.max(0, Math.floor(remaining / per)));
    }
    return m;
  }, [balances, totalSqcmOnHand, qtyByVariant, variantMeta]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        code: string;
        qcode: string;
        variants: BalanceRow[];
      }
    >();

    for (const b of balances) {
      const pid = b.product_id || `orphan-${b.product_variant_id}`;
      const name = b.product_name || "Product";
      const code = b.product_code || "—";
      const qcode = b.product_qcode || "—";
      if (!map.has(pid)) {
        map.set(pid, { productId: pid, name, code, qcode, variants: [] });
      }
      map.get(pid)!.variants.push(b);
    }

    const rows = Array.from(map.values());
    const nq = q.trim().toLowerCase();
    const filtered = !nq
      ? rows
      : rows.filter((r) => {
          const blob = [r.name, r.code, r.qcode, ...r.variants.map((v) => [v.sku, v.size_label || ""].join(" "))]
            .join(" ")
            .toLowerCase();
          return blob.includes(nq);
        });

    filtered.sort((a, b) => {
      if (sortMode === "NAME_ASC") return a.name.localeCompare(b.name);
      if (sortMode === "SKU_ASC") {
        const as = a.variants[0]?.sku ?? "";
        const bs = b.variants[0]?.sku ?? "";
        return as.localeCompare(bs);
      }
      const maxA = Math.max(0, ...a.variants.map((v) => v.quantity));
      const maxB = Math.max(0, ...b.variants.map((v) => v.quantity));
      return maxB - maxA;
    });

    for (const r of filtered) {
      r.variants.sort((x, y) => String(x.sku).localeCompare(String(y.sku)));
    }

    return filtered;
  }, [balances, q, sortMode]);

  /** First load: expand every product so variant qty controls are visible (collapsed-by-default hid them). */
  useEffect(() => {
    if (loading || grouped.length === 0 || initialExpandDoneRef.current) return;
    initialExpandDoneRef.current = true;
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.productId] = true;
    setExpanded(next);
  }, [loading, grouped]);

  function toggleProduct(pid: string) {
    setExpanded((prev) => ({ ...prev, [pid]: !(prev[pid] ?? false) }));
  }

  function expandAll(open: boolean) {
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.productId] = open;
    setExpanded(next);
  }

  const normQ = q.trim().toLowerCase();
  function isOpenFor(pid: string): boolean {
    if (normQ) return true;
    return expanded[pid] ?? false;
  }

  function setQty(variantId: string, qty: number) {
    const cap = maxByVariant.get(String(variantId)) ?? 0;
    const vId = String(variantId);
    setQtyByVariant((prev) => {
      const next = { ...prev };
      const qn = Math.min(cap, Math.max(0, safeQty(qty)));
      if (!qn) delete next[vId];
      else next[vId] = qn;
      return next;
    });
  }

  function bumpQty(variantId: string, delta: number) {
    const cap = maxByVariant.get(String(variantId)) ?? 0;
    const cur = qtyByVariant[variantId] ?? 0;
    const next = Math.min(cap, Math.max(0, cur + delta));
    setQty(variantId, next);
  }

  function clearAllSelected() {
    setQtyByVariant({});
  }

  const billingSaved = billingList;
  const shippingSaved = shippingList;

  function copyBillingToShipping() {
    setShippingMode("NEW");
    setShippingSaveErr(null);
    setShippingDraft((prev) => ({
      ...prev,
      label: billingDraft.label?.trim() || "Shipping",
      company: billingDraft.company,
      attn: billingDraft.attn,
      line1: billingDraft.line1,
      line2: billingDraft.line2,
      city: billingDraft.city,
      state: billingDraft.state,
      postal: billingDraft.postal,
      country: billingDraft.country,
      phone: billingDraft.phone,
      email: billingDraft.email,
      notes: billingDraft.notes,
      saveToBook: false,
      makeDefault: prev.makeDefault,
    }));
  }

  async function saveBillingToBook() {
    if (!draftAddressMinComplete(billingDraft)) return;
    setBillingSaveErr(null);
    setSavingBilling(true);
    try {
      const res = await fetch("/api/portal/account-addresses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "BILLING",
          label: billingDraft.label?.trim() || "Billing",
          is_default: !!billingDraft.makeDefault,
          address: addressDraftToJson(billingDraft),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setBillingSaveErr(String(json?.error || "Could not save billing address"));
        return;
      }
      const row: SavedAddressRow = {
        id: String(json.address.id),
        kind: "BILLING",
        label: json.address.label,
        is_default: json.address.is_default,
        address: json.address.address,
      };
      setBillingList((prev) => [row, ...prev.filter((a) => String(a.id) !== row.id)]);
      setBillingAddressId(row.id);
      setBillingMode("SAVED");
      setBillingDraft(emptyAddressDraft("Billing"));
    } finally {
      setSavingBilling(false);
    }
  }

  async function saveShippingToBook() {
    if (!draftAddressMinComplete(shippingDraft)) return;
    setShippingSaveErr(null);
    setSavingShipping(true);
    try {
      const res = await fetch("/api/portal/account-addresses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "SHIPPING",
          label: shippingDraft.label?.trim() || "Shipping",
          is_default: !!shippingDraft.makeDefault,
          address: addressDraftToJson(shippingDraft),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setShippingSaveErr(String(json?.error || "Could not save shipping address"));
        return;
      }
      const row: SavedAddressRow = {
        id: String(json.address.id),
        kind: "SHIPPING",
        label: json.address.label,
        is_default: json.address.is_default,
        address: json.address.address,
      };
      setShippingList((prev) => [row, ...prev.filter((a) => String(a.id) !== row.id)]);
      setShippingAddressId(row.id);
      setShippingMode("SAVED");
      setShippingDraft(emptyAddressDraft("Shipping"));
    } finally {
      setSavingShipping(false);
    }
  }

  const addressesReady = useMemo(() => {
    const billingOk =
      billingMode === "SAVED"
        ? (() => {
            const id = safeStr(billingAddressId);
            if (!id) return false;
            return billingSaved.some((a) => String(a.id) === id);
          })()
        : draftAddressMinComplete(billingDraft);
    const shippingOk =
      shippingMode === "SAVED"
        ? (() => {
            const id = safeStr(shippingAddressId);
            if (!id) return false;
            return shippingSaved.some((a) => String(a.id) === id);
          })()
        : draftAddressMinComplete(shippingDraft);
    return billingOk && shippingOk;
  }, [
    billingMode,
    shippingMode,
    billingAddressId,
    shippingAddressId,
    billingSaved,
    shippingSaved,
    billingDraft,
    shippingDraft,
  ]);

  const summary = useMemo(() => {
    let itemCount = 0;
    let totalSqcm = 0;
    for (const [variantId, qty] of Object.entries(qtyByVariant)) {
      const qn = safeQty(qty);
      if (qn <= 0) continue;
      const meta = variantMeta.get(String(variantId));
      const per = meta?.sqcm ?? 0;
      itemCount += qn;
      totalSqcm += per * qn;
    }
    return { itemCount, totalSqcm, etaDays: etaFromPriority(shippingPriority) };
  }, [qtyByVariant, variantMeta, shippingPriority]);

  const poolAvailable = totalSqcmOnHand;
  const selectedSqcm = summary.totalSqcm;
  const remainingAfterOrder =
    poolAvailable != null && Number.isFinite(poolAvailable)
      ? poolAvailable - selectedSqcm
      : null;

  const selectedShippingPreview =
    shippingMode === "SAVED" && shippingAddressId
      ? shippingSaved.find((a) => String(a.id) === String(shippingAddressId))
      : null;
  const shippingSummaryLine =
    shippingMode === "SAVED"
      ? selectedShippingPreview
        ? (() => {
            const a = selectedShippingPreview.address as Record<string, unknown>;
            const parts: string[] = [];
            if (safeStr(a?.company)) parts.push(safeStr(a?.company));
            if (safeStr(a?.line1)) parts.push(safeStr(a?.line1));
            const csz = [safeStr(a?.city), safeStr(a?.state), safeStr(a?.postal)].filter(Boolean).join(" ");
            if (csz) parts.push(csz);
            return parts.join(" · ") || "—";
          })()
        : "—"
      : draftAddressOneLine(shippingDraft);

  const canSubmit = addressesReady && summary.itemCount > 0;
  const formBusy = submitting || !canSubmit;

  async function buildShipRequestBody(): Promise<Record<string, unknown>> {
    let billingId: string | undefined;
    let shippingId: string | undefined;
    let invoice_address: ReturnType<typeof addressDraftToJson> | undefined;
    let delivery_address: ReturnType<typeof addressDraftToJson> | undefined;

    if (billingMode === "SAVED") {
      billingId = billingAddressId;
    } else {
      invoice_address = addressDraftToJson(billingDraft);
    }

    if (shippingMode === "SAVED") {
      shippingId = shippingAddressId;
    } else {
      delivery_address = addressDraftToJson(shippingDraft);
    }

    const items = Object.entries(qtyByVariant)
      .map(([product_variant_id, quantity]) => ({ product_variant_id, quantity: safeQty(quantity) }))
      .filter((x) => x.quantity > 0);

    const body: Record<string, unknown> = {
      items,
      shipping_priority: shippingPriority,
    };
    if (billingId) body.billing_address_id = billingId;
    if (shippingId) body.shipping_address_id = shippingId;
    if (invoice_address) body.invoice_address = invoice_address;
    if (delivery_address) body.delivery_address = delivery_address;

    return body;
  }

  async function submitOrder(opts: { placeOrder: boolean }) {
    if (submitLockRef.current) return;
    if (!addressesReady || summary.itemCount === 0) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setErr(null);
    try {
      const body = await buildShipRequestBody();
      const res = await fetch("/api/portal/virtual-warehouse/ship-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setErr(json?.error || `Request failed (${res.status})`);
        submitLockRef.current = false;
        setSubmitting(false);
        return;
      }
      const id = json?.order?.id;
      if (!id) {
        setErr("Order created but missing id.");
        submitLockRef.current = false;
        setSubmitting(false);
        return;
      }
      const qs = opts.placeOrder ? "?autosubmit=1" : "";
      window.location.href = `/portal/orders/${encodeURIComponent(id)}${qs}`;
    } catch (e: any) {
      setErr(e?.message || "Request failed");
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  const addrCount = billingSaved.length + shippingSaved.length;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <PortalProcessingOverlay
        show={submitting}
        title="Processing your order…"
        subtitle="Stay on this screen until the payment page opens (or your order page if no payment is due). Don’t close the tab."
        zIndex={260}
      />
      <PortalOrderHero
        title="Fulfill from virtual warehouse"
        accountName={props.accountName}
        backHref="/portal/virtual-warehouse"
        backLabel="← Virtual warehouse"
        metaLines={[
          <Fragment key="terms">
            Terms <b style={{ color: "white" }}>{props.termsLabel}</b>
          </Fragment>,
          <Fragment key="vw-lines">
            Product lines are <b style={{ color: "white" }}>$0</b> — you are requesting a shipment from pooled inventory;
            shipping is invoiced per fulfillment.
          </Fragment>,
        ]}
        stats={[
          { label: "Products", value: grouped.length },
          { label: "Variants", value: balances.length },
          { label: "Addresses", value: addrCount },
          {
            label: "VW sq cm in pool",
            value: totalSqcmOnHand != null ? fmtSqcm(totalSqcmOnHand) : "—",
          },
        ]}
      />

      <div
        ref={containerRef}
        style={{
          border: "1px solid rgba(255,255,255,0.55)",
          borderRadius: 22,
          overflow: "hidden",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 20px 50px rgba(15,23,42,0.18)",
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid rgba(255,255,255,0.6)",
            background:
              "radial-gradient(600px 180px at 0% 0%, rgba(30,136,229,0.22), transparent 55%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.55))",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "linear-gradient(135deg, #1e88e5, #22d3ee)",
                boxShadow: "0 0 0 4px rgba(30,136,229,0.15)",
              }}
            />
            Ship from virtual inventory
          </div>
          <div style={{ fontSize: 12, color: "rgba(71,85,105,0.9)", fontWeight: 800, marginTop: 6, lineHeight: 1.45 }}>
            <span style={{ color: "#0f172a", fontWeight: 900 }}>
              Quantities you enter below are shipping quantities
            </span>
            — we ship those units from your virtual balance to your address when you place this order (product lines are $0;
            shipping is invoiced separately).
          </div>
          <div style={{ fontSize: 12, color: "rgba(71,85,105,0.85)", fontWeight: 800, marginTop: 6 }}>
            Step 1: addresses · Step 2: quantities — your <b>sq cm pool</b> applies to <b>any</b> bulk-enabled SKU. Allocations
            across lines share one balance (see Max qty column).
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <span style={pillStyle("muted")}>Addresses</span>
            <span style={pillStyle("muted")}>Products</span>
            <span style={pillStyle(summary.itemCount ? "ok" : "muted")}>{summary.itemCount} items</span>
          </div>
        </div>

        <div style={{ padding: 12, display: "grid", gap: 14 }}>
          {loading ? <div style={{ fontWeight: 800 }}>Loading virtual inventory…</div> : null}
          {err ? (
            <div style={{ color: "crimson", fontWeight: 900, whiteSpace: "pre-wrap" }}>{err}</div>
          ) : null}

          <PortalBillingShippingCard
            billingAddresses={billingList}
            shippingAddresses={shippingList}
            billingMode={billingMode}
            setBillingMode={setBillingMode}
            shippingMode={shippingMode}
            setShippingMode={setShippingMode}
            billingAddressId={billingAddressId}
            setBillingAddressId={setBillingAddressId}
            shippingAddressId={shippingAddressId}
            setShippingAddressId={setShippingAddressId}
            billingDraft={billingDraft}
            setBillingDraft={setBillingDraft}
            shippingDraft={shippingDraft}
            setShippingDraft={setShippingDraft}
            shippingPriority={shippingPriority}
            setShippingPriority={(p) => setShippingPriority(p as ShippingPriority)}
            onSaveBillingToBook={saveBillingToBook}
            onSaveShippingToBook={saveShippingToBook}
            savingBilling={savingBilling}
            savingShipping={savingShipping}
            billingSaveError={billingSaveErr}
            shippingSaveError={shippingSaveErr}
            onCopyBillingToShipping={copyBillingToShipping}
          />

          {!loading && !err && balances.length === 0 ? (
            <div style={{ opacity: 0.85, fontWeight: 800, fontSize: 14, lineHeight: 1.45 }}>
              No virtual warehouse units on hand yet. After you pay a virtual warehouse bulk invoice, your balance appears
              here.
            </div>
          ) : null}

          {balances.length > 0 ? (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search products / SKUs…"
                    style={{
                      width: 360,
                      maxWidth: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      fontWeight: 900,
                      boxShadow: "0 6px 14px rgba(15,23,42,0.06)",
                    }}
                  />
                  <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13 }}>
                    Sort
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as SortMode)}
                      style={{
                        padding: "9px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.14)",
                        fontWeight: 900,
                        background: "white",
                        boxShadow: "0 6px 14px rgba(15,23,42,0.06)",
                      }}
                    >
                      <option value="NAME_ASC">Product name (A–Z)</option>
                      <option value="SKU_ASC">SKU (A–Z)</option>
                      <option value="ON_HAND_DESC">On-hand (high → low)</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => expandAll(true)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(30,136,229,0.35)",
                      background: "rgba(30,136,229,0.12)",
                      color: "#0f172a",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={() => expandAll(false)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "white",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Collapse all
                  </button>
                </div>
              </div>

              {grouped.length === 0 ? (
                <div style={{ padding: 14, opacity: 0.75 }}>No products match your search.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {grouped.map((g) => {
                    const isOpen = isOpenFor(g.productId);
                    return (
                      <div
                        key={g.productId}
                        style={{
                          border: "1px solid rgba(255,255,255,0.7)",
                          borderRadius: 18,
                          overflow: "hidden",
                          background: "rgba(255,255,255,0.75)",
                          backdropFilter: "blur(10px)",
                          boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleProduct(g.productId)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: 12,
                            border: "none",
                            background: "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.55))",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ fontWeight: 950, fontSize: 16, letterSpacing: -0.2 }}>{g.name}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>
                              Code: <b>{g.code}</b> · Q code: <b>{g.qcode}</b>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={pillStyle("muted")}>{g.variants.length} variants</span>
                            <span style={pillStyle("muted")}>{isOpen ? "COLLAPSE" : "EXPAND"}</span>
                          </div>
                        </button>

                        {isOpen ? (
                          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", padding: 10 }}>
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ textAlign: "left", fontSize: 11, opacity: 0.7 }}>
                                    <th style={{ padding: "8px 8px" }}>SKU</th>
                                    <th style={{ padding: "8px 8px" }}>Size</th>
                                    <th style={{ padding: "8px 8px" }}>sq cm</th>
                                    <th style={{ padding: "8px 8px" }}>Max qty</th>
                                    <th style={{ padding: "8px 8px" }}>Price</th>
                                    <th style={{ padding: "8px 8px", width: 240 }}>Qty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.variants.map((b) => {
                                    const vId = String(b.product_variant_id);
                                    const cur = qtyByVariant[vId] ?? 0;
                                    const cap = maxByVariant.get(vId) ?? 0;
                                    const per = variantMeta.get(vId)?.sqcm ?? 0;
                                    return (
                                      <tr key={vId} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                                        <td style={{ padding: "10px 8px", fontWeight: 900, whiteSpace: "nowrap" }}>
                                          {b.sku}
                                        </td>
                                        <td style={{ padding: "10px 8px", opacity: 0.85 }}>{b.size_label ?? "—"}</td>
                                        <td style={{ padding: "10px 8px", fontWeight: 900 }}>{fmtSqcm(per)}</td>
                                        <td style={{ padding: "10px 8px", fontWeight: 900 }}>{cap}</td>
                                        <td style={{ padding: "10px 8px", fontWeight: 900 }}>$0.00</td>
                                        <td style={{ padding: "10px 8px" }}>
                                          {(totalSqcmOnHand ?? 0) <= 0 ? (
                                            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(71,85,105,0.95)", lineHeight: 1.4 }}>
                                              No sq cm in your pool yet. Pay a bulk / virtual warehouse invoice to add credit.
                                            </div>
                                          ) : (
                                            <div
                                              style={{
                                                display: "grid",
                                                gridTemplateColumns: "56px 1fr 56px",
                                                gap: 10,
                                                alignItems: "center",
                                              }}
                                            >
                                              <button
                                                type="button"
                                                onClick={() => bumpQty(vId, -1)}
                                                disabled={cur <= 0}
                                                style={{
                                                  height: 44,
                                                  borderRadius: 14,
                                                  border: "1px solid rgba(0,0,0,0.14)",
                                                  background: "white",
                                                  fontWeight: 950,
                                                  cursor: cur <= 0 ? "not-allowed" : "pointer",
                                                }}
                                              >
                                                −
                                              </button>
                                              <input
                                                type="text"
                                                inputMode="numeric"
                                                value={cur ? String(cur) : ""}
                                                onChange={(e) => setQty(vId, safeQty(e.target.value))}
                                                placeholder="0"
                                                style={{
                                                  height: 44,
                                                  width: "100%",
                                                  padding: "10px 12px",
                                                  borderRadius: 14,
                                                  border: "1px solid rgba(0,0,0,0.18)",
                                                  fontWeight: 950,
                                                  fontSize: 14,
                                                  textAlign: "center",
                                                  background: "white",
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => bumpQty(vId, +1)}
                                                disabled={cur >= cap}
                                                title={cap > 0 ? `Up to ${cap} units from shared pool` : "Pool used on other lines or insufficient sq cm for another unit"}
                                                style={{
                                                  height: 44,
                                                  borderRadius: 14,
                                                  border: "1px solid rgba(0,0,0,0.14)",
                                                  background: "white",
                                                  fontWeight: 950,
                                                  cursor: cur >= cap ? "not-allowed" : "pointer",
                                                }}
                                              >
                                                +
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {mounted
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: 292,
                right: 0,
                bottom: 0,
                zIndex: 60,
                padding: 12,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  maxWidth: 1100,
                  margin: "0 auto",
                  border: "1px solid rgba(255,255,255,0.7)",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
                  padding: "10px 12px",
                  display: "flex",
                  gap: 12,
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  pointerEvents: "auto",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  {summary.itemCount > 0 ? (
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", lineHeight: 1.35, maxWidth: 520 }}>
                      These items will ship out from virtual inventory when you place the order — not held for later.
                    </div>
                  ) : null}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={pillStyle(summary.itemCount ? "ok" : "muted")}>{summary.itemCount} items</span>
                    <span style={pillStyle("muted")} title="Total sq cm in your virtual warehouse pool right now">
                      Pool: {poolAvailable != null ? `${fmtSqcm(poolAvailable)} sq cm` : "—"}
                    </span>
                    <span style={pillStyle(selectedSqcm > 0 ? "ok" : "muted")} title="Sq cm for quantities selected below">
                      This order: {fmtSqcm(selectedSqcm)} sq cm
                    </span>
                    <span
                      style={pillStyle(
                        remainingAfterOrder != null && remainingAfterOrder < -0.01
                          ? "warn"
                          : remainingAfterOrder != null && remainingAfterOrder >= 0
                            ? "ok"
                            : "muted"
                      )}
                      title="Pool remaining after this shipment (updates as you change quantities)"
                    >
                      Left: {remainingAfterOrder != null ? `${fmtSqcm(remainingAfterOrder)} sq cm` : "—"}
                    </span>
                    <span style={pillStyle("muted")}>Product total: $0.00</span>
                    {!addressesReady ? (
                      <span style={{ fontWeight: 900, fontSize: 12, color: "#b91c1c" }}>
                        Select billing & shipping (saved or complete new: street, city, postal)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={clearAllSelected}
                    disabled={summary.itemCount === 0}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "white",
                      fontWeight: 950,
                      cursor: summary.itemCount === 0 ? "not-allowed" : "pointer",
                      opacity: summary.itemCount === 0 ? 0.55 : 1,
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={formBusy}
                    title={!addressesReady ? "Select billing and shipping addresses" : undefined}
                    onClick={() => void submitOrder({ placeOrder: false })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "white",
                      fontWeight: 950,
                      cursor: !formBusy ? "pointer" : "not-allowed",
                      opacity: !formBusy ? 1 : 0.55,
                    }}
                  >
                    {submitting ? "Working…" : "Create draft"}
                  </button>
                  <button
                    type="button"
                    disabled={formBusy}
                    title={!addressesReady ? "Select billing and shipping addresses" : undefined}
                    onClick={() => {
                      if (!canSubmit) return;
                      setShowPlaceConfirm(true);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "none",
                      background: "#111",
                      color: "white",
                      fontWeight: 950,
                      cursor: !formBusy ? "pointer" : "not-allowed",
                      opacity: !formBusy ? 1 : 0.55,
                    }}
                  >
                    Place order
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {showPlaceConfirm && mounted
        ? createPortal(
            <div
              ref={placeConfirmRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="vw-place-title"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                zIndex: 70,
                display: "grid",
                placeItems: "center",
                padding: 16,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  width: "min(560px, 100%)",
                  borderRadius: 18,
                  background: "white",
                  border: "1px solid rgba(0,0,0,0.12)",
                  boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
                  padding: 18,
                  display: "grid",
                  gap: 12,
                  margin: "auto",
                }}
              >
                <div id="vw-place-title" style={{ fontWeight: 950, fontSize: 18 }}>
                  Submit ship request now?
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                  The quantities you chose are for a <b>physical shipment</b> — those units will ship out from your
                  virtual balance to your shipping address. This creates a <b>$0</b> product order and deducts those
                  quantities when the order is processed. Shipping is invoiced separately. Confirm your addresses and
                  quantities.
                </div>
                <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                  <div>
                    <b>Items:</b> {summary.itemCount}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "rgba(11,92,171,0.06)",
                    }}
                  >
                    <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.85 }}>Sq cm (virtual pool)</div>
                    <div>
                      <b>Available now:</b> {poolAvailable != null ? `${fmtSqcm(poolAvailable)} sq cm` : "—"}
                    </div>
                    <div>
                      <b>This order:</b> {fmtSqcm(selectedSqcm)} sq cm
                    </div>
                    <div>
                      <b>Estimated remaining:</b>{" "}
                      {remainingAfterOrder != null ? `${fmtSqcm(remainingAfterOrder)} sq cm` : "—"}
                    </div>
                  </div>
                  <div>
                    <b>Product total:</b> $0.00 (prepaid sq cm stock)
                  </div>
                  <div>
                    <b>Shipping priority:</b> {shippingPriority}
                  </div>
                  <div>
                    <b>Shipping address:</b> {shippingSummaryLine}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                    <b>Shipping:</b> Charged on an invoice after we ship (you will not receive an invoice until fulfillment is
                    complete). Your confirmation email matches the normal order flow.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setShowPlaceConfirm(false)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "white",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canSubmit || submitting) return;
                      setSubmitting(true);
                      setShowPlaceConfirm(false);
                      void submitOrder({ placeOrder: true });
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "none",
                      background: "#111",
                      color: "white",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Confirm & place
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
