"use client";

import { setPlaceOrderOverlayFlag } from "@/lib/portal/portalOverlaySession";
import { formatBulkPricePerSqcmLabel, getBulkMatchingRule, globalBulkRules, normalizeBulkRules } from "@/lib/bulkRules";
import { draftAddressMinComplete } from "@/components/portal/portalAddressUi";
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ProductRow = {
  id: string;
  name: string;
  code: string | null;
  qcode: string | null;
  base_unit_price: number | null;
  /** When true, product may appear in bulk mode (portal filters catalog). */
  bulk_enabled?: boolean;
};

type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  size_label: string | null;
  base_unit_price: number | null;
  /** When product is bulk-enabled, variant may appear in bulk mode. */
  bulk_enabled?: boolean;

  total_sqcm?: number | string | null;
  width_cm?: number | string | null;
  length_cm?: number | string | null;
};

type InventoryRow = {
  variant_id: string;
  qty_on_hand: number;
  updated_at: string | null;
};

type BrochureMeta = { file_id: string; original_filename: string | null } | null;

type SavedAddressRow = {
  id: string;
  kind: "BILLING" | "SHIPPING" | string;
  label: string;
  is_default: boolean | null;
  address: any;
  created_at?: string | null;
};

type ShippingPriority = "GROUND" | "THREE_DAY" | "TWO_DAY" | "OVERNIGHT_AM" | "FIRST_OVERNIGHT" | "PRIORITY_OVERNIGHT" | "TWO_DAY_AM";
type SortMode = "NAME_ASC" | "SKU_ASC" | "PRICE_ASC" | "PRICE_DESC";

function safeStr(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeQty(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function safeNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

function money(n: any) {
  const v = Number(String(n ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtSqcm(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

function isPdfName(name: string | null): boolean {
  if (!name) return false;
  return name.trim().toLowerCase().endsWith(".pdf");
}

function prettyAddressOneLine(v: any): string {
  if (!v || typeof v !== "object") return "—";
  const parts: string[] = [];
  if (safeStr(v.company)) parts.push(safeStr(v.company));
  if (safeStr(v.line1)) parts.push(safeStr(v.line1));
  const csz = [safeStr(v.city), safeStr(v.state), safeStr(v.postal)].filter(Boolean).join(" ");
  if (csz) parts.push(csz);
  if (safeStr(v.country)) parts.push(safeStr(v.country));
  return parts.filter(Boolean).join(" · ") || "—";
}

function draftAddressOneLine(d: AddressDraft | null): string {
  if (!d) return "—";
  const parts: string[] = [];
  if (safeStr(d.company)) parts.push(safeStr(d.company));
  if (safeStr(d.line1)) parts.push(safeStr(d.line1));
  const csz = [safeStr(d.city), safeStr(d.state), safeStr(d.postal)].filter(Boolean).join(" ");
  if (csz) parts.push(csz);
  if (safeStr(d.country)) parts.push(safeStr(d.country));
  return parts.filter(Boolean).join(" · ") || "—";
}

type AddressDraft = {
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

function emptyAddressDraft(label: string): AddressDraft {
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

function inputStyle(): React.CSSProperties {
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

function labelStyle(): React.CSSProperties {
  return { fontWeight: 950, fontSize: 12, opacity: 0.8, letterSpacing: 0.3 };
}

function sqcmFromVariant(v: VariantRow): number {
  const direct = safeNum(v.total_sqcm);
  if (direct > 0) return direct;

  const w = safeNum(v.width_cm);
  const l = safeNum(v.length_cm);
  if (w > 0 && l > 0) return w * l;

  const s = safeStr(v.size_label).toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)(?:cm)?$/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return a * b;
  }

  return 0;
}

function etaFromPriority(p: ShippingPriority): number {
  if (p === "THREE_DAY") return 3;
  if (p === "TWO_DAY" || p === "TWO_DAY_AM") return 2;
  if (p === "OVERNIGHT_AM" || p === "FIRST_OVERNIGHT" || p === "PRIORITY_OVERNIGHT") return 1;
  return 3;
}

export default function ProductPickerClient(props: {
  discountPercent: number;
  termsLabel: string;
  bulkEnabled: boolean;
  virtualWarehouseEnabled: boolean;
  bulkRules: Array<{ min_sqcm: number; price_per_sqcm: number }>;
  products: ProductRow[];
  variants: VariantRow[];
  inventoryRows: InventoryRow[];
  brochuresByProduct: Record<string, BrochureMeta>;
  billingAddresses: SavedAddressRow[];
  shippingAddresses: SavedAddressRow[];
  defaultBillingId: string;
  defaultShippingId: string;
  /** When set (admin intake), save-to-book uses this account-scoped API instead of portal session account. */
  addressBookApiUrl?: string;
}) {
  const [q, setQ] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("NAME_ASC");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [qtyByVariant, setQtyByVariant] = useState<Record<string, number>>({});

  const [billingMode, setBillingMode] = useState<"SAVED" | "NEW">("SAVED");
  const [shippingMode, setShippingMode] = useState<"SAVED" | "NEW">("SAVED");

  const [billingAddressId, setBillingAddressId] = useState<string>(props.defaultBillingId || "");
  const [shippingAddressId, setShippingAddressId] = useState<string>(props.defaultShippingId || "");

  const [billingDraft, setBillingDraft] = useState<AddressDraft>(emptyAddressDraft("Billing"));
  const [shippingDraft, setShippingDraft] = useState<AddressDraft>(emptyAddressDraft("Shipping"));

  const [billingList, setBillingList] = useState<SavedAddressRow[]>(() => props.billingAddresses ?? []);
  const [shippingList, setShippingList] = useState<SavedAddressRow[]>(() => props.shippingAddresses ?? []);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [billingSaveErr, setBillingSaveErr] = useState<string | null>(null);
  const [shippingSaveErr, setShippingSaveErr] = useState<string | null>(null);

  // ✅ default to 1st overnight
  const [shippingPriority, setShippingPriority] = useState<ShippingPriority>("FIRST_OVERNIGHT");
  const [showPlaceConfirm, setShowPlaceConfirm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  /** When bulk + virtual warehouse: enter bulk sq cm total for pricing; VW balance is managed separately. */
  const [bulkVwAllocation, setBulkVwAllocation] = useState(false);
  const [bulkContractSqcmInput, setBulkContractSqcmInput] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const submitModeRef = useRef<HTMLInputElement | null>(null);
  const placeConfirmRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showPlaceConfirm) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      placeConfirmRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [showPlaceConfirm]);

  useEffect(() => {
    if (!bulkMode) setBulkVwAllocation(false);
  }, [bulkMode]);

  useEffect(() => {
    if (!bulkVwAllocation) {
      setBulkContractSqcmInput("");
    }
  }, [bulkVwAllocation]);

  const variantsByProduct = useMemo(() => {
    const m = new Map<string, VariantRow[]>();
    for (const v of props.variants ?? []) {
      const pid = String(v.product_id);
      if (!m.has(pid)) m.set(pid, []);
      m.get(pid)!.push(v);
    }
    for (const [pid, arr] of m.entries()) {
      arr.sort((a, b) => String(a.sku).localeCompare(String(b.sku)));
      m.set(pid, arr);
    }
    return m;
  }, [props.variants]);

  const variantById = useMemo(() => {
    const m = new Map<string, VariantRow>();
    for (const v of props.variants ?? []) m.set(String(v.id), v);
    return m;
  }, [props.variants]);

  const normQ = q.trim().toLowerCase();

  /** Bulk purchase catalog: only products/variants marked bulk-eligible in admin. */
  const bulkCatalog = !!props.bulkEnabled && bulkMode;

  const filteredProducts = useMemo(() => {
    const out: Array<{
      product: ProductRow;
      variants: Array<{ v: VariantRow }>;
    }> = [];

    for (const p of props.products ?? []) {
      if (bulkCatalog && !p.bulk_enabled) continue;

      const pid = String(p.id);
      const list = variantsByProduct.get(pid) ?? [];

      let vRows = list.map((v) => ({ v }));
      if (bulkCatalog) {
        vRows = vRows.filter((r) => !!r.v.bulk_enabled);
      }
      if (vRows.length === 0) continue;

      if (normQ) {
        const productText = [String(p.name ?? ""), String(p.code ?? ""), String(p.qcode ?? "")]
          .join(" ")
          .toLowerCase();

        const productMatched = productText.includes(normQ);
        const variantMatched = vRows.some((r) => {
          const v = r.v;
          return (
            String(v.sku ?? "").toLowerCase().includes(normQ) ||
            String(v.size_label ?? "").toLowerCase().includes(normQ)
          );
        });

        if (!productMatched && !variantMatched) continue;

        const reduced = productMatched
          ? vRows
          : vRows.filter((r) => {
              const v = r.v;
              return (
                String(v.sku ?? "").toLowerCase().includes(normQ) ||
                String(v.size_label ?? "").toLowerCase().includes(normQ)
              );
            });

        if (reduced.length === 0) continue;
        out.push({ product: p, variants: reduced });
        continue;
      }

      out.push({ product: p, variants: vRows });
    }

    const decorate = out.map((row) => {
      const firstSku = row.variants[0]?.v?.sku ? String(row.variants[0].v.sku) : "";
      const prices = row.variants.map((x) => Number(x.v.base_unit_price ?? 0) || 0);
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;
      return { ...row, firstSku, minPrice, maxPrice };
    });

    decorate.sort((a, b) => {
      if (sortMode === "NAME_ASC") return String(a.product.name).localeCompare(String(b.product.name));
      if (sortMode === "SKU_ASC") return String(a.firstSku).localeCompare(String(b.firstSku));
      if (sortMode === "PRICE_ASC") return (a.minPrice ?? 0) - (b.minPrice ?? 0);
      if (sortMode === "PRICE_DESC") return (b.maxPrice ?? 0) - (a.maxPrice ?? 0);
      return 0;
    });

    for (const row of decorate) {
      if (sortMode === "SKU_ASC" || sortMode === "NAME_ASC") {
        row.variants.sort((x, y) => String(x.v.sku).localeCompare(String(y.v.sku)));
      } else if (sortMode === "PRICE_ASC") {
        row.variants.sort(
          (x, y) => (Number(x.v.base_unit_price ?? 0) || 0) - (Number(y.v.base_unit_price ?? 0) || 0)
        );
      } else if (sortMode === "PRICE_DESC") {
        row.variants.sort(
          (x, y) => (Number(y.v.base_unit_price ?? 0) || 0) - (Number(x.v.base_unit_price ?? 0) || 0)
        );
      }
    }

    return decorate;
  }, [props.products, variantsByProduct, normQ, sortMode, bulkCatalog]);

  function toggleProduct(productId: string) {
    setExpanded((prev) => ({ ...prev, [productId]: !(prev[productId] ?? false) }));
  }

  function expandAll(open: boolean) {
    const next: Record<string, boolean> = {};
    for (const p of props.products ?? []) next[String(p.id)] = open;
    setExpanded(next);
  }

  function isOpenFor(pid: string): boolean {
    if (normQ) return true;
    return expanded[pid] ?? false;
  }

  function setQty(variantId: string, qty: number) {
    const vId = String(variantId);
    setQtyByVariant((prev) => {
      const next = { ...prev };
      if (!qty || qty <= 0) delete next[vId];
      else next[vId] = qty;
      return next;
    });
  }

  function bumpQty(variantId: string, delta: number) {
    const vId = String(variantId);
    const cur = qtyByVariant[vId] ?? 0;
    const next = Math.max(0, safeQty(cur + delta));
    setQty(vId, next);
  }

  function clearAllSelected() {
    setQtyByVariant({});
  }

  // ✅ Always-mounted hidden inputs that the API reads
  const selectedHiddenInputs = useMemo(() => {
    const entries = Object.entries(qtyByVariant)
      .map(([id, qty]) => [String(id), safeQty(qty)] as const)
      .filter(([, qty]) => qty > 0);
    if (!bulkCatalog) return entries;
    return entries.filter(([id]) => {
      const v = variantById.get(id);
      if (!v) return false;
      const prod = props.products?.find((x) => String(x.id) === String(v.product_id));
      return !!prod?.bulk_enabled && !!v.bulk_enabled;
    });
  }, [qtyByVariant, bulkCatalog, variantById, props.products]);

  const normalizedBulkRules = useMemo(() => normalizeBulkRules(props.bulkRules), [props.bulkRules]);
  const globalNormalizedBulkRules = useMemo(() => globalBulkRules(normalizedBulkRules), [normalizedBulkRules]);

  const summary = useMemo(() => {
    let itemCount = 0;
    let rawSubtotal = 0;
    let totalSqcm = 0;

    for (const [variantId, qty] of Object.entries(qtyByVariant)) {
      const qn = safeQty(qty);
      if (qn <= 0) continue;

      const v = variantById.get(String(variantId));
      if (!v) continue;

      if (bulkCatalog) {
        const prod = props.products?.find((x) => String(x.id) === String(v.product_id));
        if (!prod?.bulk_enabled || !v.bulk_enabled) continue;
      }

      const unitPrice = Number(v.base_unit_price ?? 0) || 0;
      rawSubtotal += unitPrice * qn;
      itemCount += qn;

      const perSq = sqcmFromVariant(v);
      totalSqcm += perSq * qn;
    }

    const discountPct = Number(props.discountPercent ?? 0) || 0;
    const discountedSubtotal = rawSubtotal * (1 - discountPct / 100);

    return {
      itemCount,
      rawSubtotal,
      discountedSubtotal,
      discountPct,
      totalSqcm,
      etaDays: etaFromPriority(shippingPriority),
    };
  }, [qtyByVariant, variantById, props.discountPercent, shippingPriority, bulkCatalog, props.products]);

  const showVwSplit = props.virtualWarehouseEnabled && props.bulkEnabled && bulkMode && bulkVwAllocation;

  const bulkContractSqcmNum = useMemo(() => {
    if (!showVwSplit) return 0;
    const n = Number(String(bulkContractSqcmInput || "").replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n;
  }, [showVwSplit, bulkContractSqcmInput]);

  /** VW bulk contract total drives tier thresholds; otherwise use line sq cm sum. */
  const sqcmForBulkTier = useMemo(() => {
    if (showVwSplit && bulkContractSqcmNum > 0) return bulkContractSqcmNum;
    return summary.totalSqcm;
  }, [showVwSplit, bulkContractSqcmNum, summary.totalSqcm]);

  const bulkRuleApplied = useMemo(() => {
    if (!props.bulkEnabled || !bulkMode) return null;
    return getBulkMatchingRule(sqcmForBulkTier, normalizedBulkRules, null);
  }, [props.bulkEnabled, bulkMode, sqcmForBulkTier, normalizedBulkRules]);

  const nextBulkRule = useMemo(() => {
    if (!props.bulkEnabled) return null;
    return globalNormalizedBulkRules.find((r) => sqcmForBulkTier < r.min_sqcm) || null;
  }, [props.bulkEnabled, globalNormalizedBulkRules, sqcmForBulkTier]);

  const accountDiscountPercent = summary.discountPct;

  const discountedSubtotal = useMemo(() => {
    if (props.bulkEnabled && bulkMode) {
      let sub = 0;
      let anyPriced = false;
      for (const [variantId, qty] of Object.entries(qtyByVariant)) {
        const qn = safeQty(qty);
        if (qn <= 0) continue;
        const v = variantById.get(String(variantId));
        if (!v) continue;
        if (bulkCatalog) {
          const prod = props.products?.find((x) => String(x.id) === String(v.product_id));
          if (!prod?.bulk_enabled || !v.bulk_enabled) continue;
        }
        const lineRule = getBulkMatchingRule(sqcmForBulkTier, normalizedBulkRules, v.product_id ?? null);
        if (!lineRule) continue;
        anyPriced = true;
        const perSq = sqcmFromVariant(v);
        sub += (perSq > 0 ? lineRule.price_per_sqcm * perSq : 0) * qn;
      }
      if (anyPriced || bulkRuleApplied) return sub;
    }
    return summary.rawSubtotal * (1 - accountDiscountPercent / 100);
  }, [
    props.bulkEnabled,
    bulkMode,
    bulkRuleApplied,
    qtyByVariant,
    variantById,
    bulkCatalog,
    props.products,
    summary.rawSubtotal,
    accountDiscountPercent,
    sqcmForBulkTier,
    normalizedBulkRules,
  ]);

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

  const addressBookApiUrl = props.addressBookApiUrl || "/api/portal/account-addresses";

  async function saveBillingToBook() {
    if (!draftAddressMinComplete(billingDraft)) return;
    setBillingSaveErr(null);
    setSavingBilling(true);
    try {
      const res = await fetch(addressBookApiUrl, {
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
      const res = await fetch(addressBookApiUrl, {
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

  const selectedBillingPreview =
    billingMode === "SAVED" && billingAddressId
      ? billingSaved.find((a) => String(a.id) === String(billingAddressId))
      : null;

  const selectedShippingPreview =
    shippingMode === "SAVED" && shippingAddressId
      ? shippingSaved.find((a) => String(a.id) === String(shippingAddressId))
      : null;
  const shippingSummaryLine =
    shippingMode === "SAVED" ? prettyAddressOneLine(selectedShippingPreview?.address) : draftAddressOneLine(shippingDraft);

  /** Sq cm still available under the declared bulk total (contract minus selected lines). */
  const contractHeadroomSqcm = useMemo(() => {
    if (!showVwSplit || bulkContractSqcmNum <= 0) return null;
    return bulkContractSqcmNum - summary.totalSqcm;
  }, [showVwSplit, bulkContractSqcmNum, summary.totalSqcm]);

  /**
   * Ship-now preview: form does not yet send vw_qty__*; server defaults virtual_warehouse_qty to 0, so all units ship initially.
   * When per-line VW controls are added, read the same map here.
   */
  const initialShipmentPreview = useMemo(() => {
    const rows: Array<{ label: string; shipQty: number; sqcm: number }> = [];
    for (const [variantId, qty] of selectedHiddenInputs) {
      const v = variantById.get(variantId);
      if (!v) continue;
      const qn = safeQty(qty);
      if (qn <= 0) continue;
      const vw = 0;
      const shipQty = Math.max(0, qn - vw);
      if (shipQty <= 0) continue;
      const per = sqcmFromVariant(v);
      const sku = safeStr(v.sku) || String(variantId).slice(0, 8);
      const size = safeStr(v.size_label);
      const label = [sku, size].filter(Boolean).join(" · ") || sku;
      rows.push({ label, shipQty, sqcm: per * shipQty });
    }
    const totalSq = rows.reduce((s, r) => s + r.sqcm, 0);
    return { rows, totalSq };
  }, [selectedHiddenInputs, variantById]);

  /** First bulk catalog variant with sq cm — matches server pricing for virtual-warehouse-only orders. */
  const bulkPricingRefVariant = useMemo(() => {
    for (const v of props.variants ?? []) {
      const prod = props.products?.find((x) => String(x.id) === String(v.product_id));
      if (!prod?.bulk_enabled || !v.bulk_enabled) continue;
      if (sqcmFromVariant(v) > 0) return v;
    }
    return null;
  }, [props.variants, props.products]);

  /** Est. order total $ from bulk purchase total (sq cm) — matches server reference-variant pricing when VW+bulk is on. */
  const vwBulkContractAfterDiscount = useMemo(() => {
    if (!showVwSplit || bulkContractSqcmNum <= 0) return null;
    if (!bulkRuleApplied) return null;
    if (!bulkPricingRefVariant) return null;
    return bulkRuleApplied.price_per_sqcm * bulkContractSqcmNum;
  }, [showVwSplit, bulkContractSqcmNum, bulkPricingRefVariant, bulkRuleApplied]);

  const displayTotalSqcm = useMemo(() => {
    if (showVwSplit && bulkContractSqcmNum > 0) return bulkContractSqcmNum;
    return summary.totalSqcm;
  }, [showVwSplit, bulkContractSqcmNum, summary.totalSqcm]);

  const displaySubtotalAfterDiscount = useMemo(() => {
    if (vwBulkContractAfterDiscount != null) return vwBulkContractAfterDiscount;
    return discountedSubtotal;
  }, [vwBulkContractAfterDiscount, discountedSubtotal]);

  const vwBulkContractListEstimate = useMemo(() => {
    if (!showVwSplit || bulkContractSqcmNum <= 0) return null;
    const v = bulkPricingRefVariant;
    if (!v) return null;
    const per = sqcmFromVariant(v);
    const base = Number(v.base_unit_price ?? 0) || 0;
    if (per <= 0) return null;
    return (base * bulkContractSqcmNum) / per;
  }, [showVwSplit, bulkContractSqcmNum, bulkPricingRefVariant]);

  const vwContractValid = useMemo(() => {
    if (!showVwSplit) return true;
    if (bulkContractSqcmNum <= 0) return false;
    if (summary.itemCount === 0) return !!bulkPricingRefVariant;
    return summary.totalSqcm <= bulkContractSqcmNum + 0.01;
  }, [showVwSplit, bulkContractSqcmNum, summary.totalSqcm, summary.itemCount, bulkPricingRefVariant]);

  const canSubmit =
    addressesReady &&
    (summary.itemCount > 0 || (showVwSplit && bulkContractSqcmNum > 0)) &&
    vwContractValid;

  return (
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 6, minWidth: 0, flex: "1 1 260px" }}>
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
              Create Draft Order
            </div>
            <div style={{ fontSize: 12, color: "rgba(71,85,105,0.9)", fontWeight: 800 }}>
              Step 1: confirm addresses · Step 2: optional products — or enter a virtual-warehouse bulk total (sq cm) only
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
              <span style={pillStyle("muted")}>Addresses</span>
              <span style={pillStyle("muted")}>Products</span>
              <span style={pillStyle(summary.itemCount ? "ok" : "muted")}>{summary.itemCount} items</span>
            </div>
          </div>

          {props.bulkEnabled ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
                flex: "1 1 280px",
                maxWidth: "100%",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                <span style={pillStyle(bulkMode ? "ok" : "muted")}>Bulk pricing</span>
                <button
                  type="button"
                  onClick={() => setBulkMode((prev) => !prev)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: bulkMode ? "rgba(30,136,229,0.14)" : "white",
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {bulkMode ? "On" : "Off"}
                </button>
                {props.virtualWarehouseEnabled && bulkMode ? (
                  <label
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={bulkVwAllocation}
                      onChange={(e) => setBulkVwAllocation(e.target.checked)}
                    />
                    Virtual warehouse
                  </label>
                ) : null}
              </div>

              {showVwSplit ? (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    width: "100%",
                    maxWidth: 380,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "rgba(255,255,255,0.65)",
                  }}
                >
                  <label style={{ display: "grid", gap: 6, fontWeight: 950, fontSize: 12, opacity: 0.9 }}>
                    Bulk purchase total (sq cm)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={bulkContractSqcmInput}
                      onChange={(e) => setBulkContractSqcmInput(e.target.value)}
                      placeholder="2000"
                      style={inputStyle()}
                    />
                  </label>
                  {bulkContractSqcmNum > 0 ? (
                    <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.88, lineHeight: 1.45 }}>
                      Line total (sq cm): {fmtSqcm(summary.totalSqcm)} · Remaining under bulk total:{" "}
                      <span
                        style={{
                          color:
                            contractHeadroomSqcm !== null && contractHeadroomSqcm < -0.01 ? "#b91c1c" : "#0f172a",
                        }}
                      >
                        {contractHeadroomSqcm !== null ? fmtSqcm(contractHeadroomSqcm) : "—"}
                      </span>{" "}
                      sq cm
                    </div>
                  ) : null}
                  {summary.itemCount > 0 && bulkContractSqcmNum <= 0 ? (
                    <div style={{ fontWeight: 900, fontSize: 12, color: "#b91c1c" }}>
                      Enter the total bulk sq cm for this purchase (for pricing).
                    </div>
                  ) : null}
                  {bulkContractSqcmNum > 0 && summary.totalSqcm > bulkContractSqcmNum + 0.01 ? (
                    <div style={{ fontWeight: 900, fontSize: 12, color: "#b91c1c" }}>
                      Selected lines exceed this total. Reduce quantities or raise the bulk total.
                    </div>
                  ) : null}
                  <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.75, lineHeight: 1.4 }}>
                    Virtual warehouse balance is separate—request shipments anytime from Virtual warehouse. This bulk total
                    sets pricing; if you add products, their total sq cm must stay within this amount.
                  </div>
                  {summary.itemCount === 0 && bulkContractSqcmNum > 0 && !bulkPricingRefVariant ? (
                    <div style={{ fontWeight: 900, fontSize: 12, color: "#b91c1c" }}>
                      No bulk-priced catalog item with sq cm found — add a bulk product in admin, or select line items.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {bulkMode ? (
                <div style={{ fontSize: 11, opacity: 0.8, textAlign: "right", lineHeight: 1.45, maxWidth: 420 }}>
                  {globalNormalizedBulkRules.length ? (
                    <>
                      All-products tiers:{" "}
                      {globalNormalizedBulkRules
                        .map(
                          (r) =>
                            `${fmtSqcm(r.min_sqcm)}+ → $${formatBulkPricePerSqcmLabel(r.price_per_sqcm)}/sq cm`
                        )
                        .join(" · ")}{" "}
                      ·{" "}
                    </>
                  ) : normalizedBulkRules.some((r) => r.product_id) ? (
                    <span>Product-specific tiers configured · </span>
                  ) : (
                    <span>No bulk tiers · </span>
                  )}
                  {bulkRuleApplied ? (
                    <>
                      Default applied: <b>${formatBulkPricePerSqcmLabel(bulkRuleApplied.price_per_sqcm)}</b>/sq cm
                      {` · From ${fmtSqcm(bulkRuleApplied.min_sqcm)}+ total sq cm`}
                    </>
                  ) : (
                    <>No matching all-products tier yet · </>
                  )}
                  {nextBulkRule
                    ? ` · +${fmtSqcm(Math.max(0, nextBulkRule.min_sqcm - sqcmForBulkTier))} sq cm for $${formatBulkPricePerSqcmLabel(nextBulkRule.price_per_sqcm)}/sq cm`
                    : ""}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 14 }}>
        {/* ✅ ALWAYS SUBMITTED: selected qty fields */}
        <div style={{ display: "none" }}>
          <input ref={submitModeRef} type="hidden" name="submit_mode" defaultValue="draft" />
          <input type="hidden" name="bulk_mode" value={bulkMode ? "1" : "0"} />
          {showVwSplit && bulkContractSqcmNum > 0 ? (
            <input type="hidden" name="bulk_contract_sqcm" value={String(bulkContractSqcmNum)} />
          ) : null}
          {selectedHiddenInputs.map(([variantId, qty]) => (
            <Fragment key={variantId}>
              <input type="hidden" name={`qty__${variantId}`} value={String(qty)} />
            </Fragment>
          ))}
        </div>

        {/* Addresses */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.6)",
            borderRadius: 18,
            padding: 14,
            background:
              "radial-gradient(600px 180px at 0% 0%, rgba(30,136,229,0.14), transparent 60%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.45))",
            display: "grid",
            gap: 12,
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
          }}
        >
          <div style={{ fontWeight: 950 }}>Billing & Shipping</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Billing */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.85)",
                borderRadius: 18,
                padding: 12,
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(14px)",
                boxShadow: "0 10px 24px rgba(15,23,42,0.14)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: "linear-gradient(180deg, #1e88e5, #22d3ee)",
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>Billing</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setBillingMode("SAVED")}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: billingMode === "SAVED" ? "rgba(30,136,229,0.18)" : "white",
                      color: billingMode === "SAVED" ? "#0f172a" : "inherit",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingMode("NEW")}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: billingMode === "NEW" ? "rgba(30,136,229,0.18)" : "white",
                      color: billingMode === "NEW" ? "#0f172a" : "inherit",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    New
                  </button>
                </div>
              </div>

              {billingMode === "SAVED" ? (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <label style={labelStyle()}>Select saved billing address</label>
                  <select
                    name="billing_address_id"
                    value={billingAddressId}
                    onChange={(e) => setBillingAddressId(e.target.value)}
                    style={inputStyle()}
                  >
                    <option value="">— Select —</option>
                    {billingSaved.map((a) => (
                      <option key={String(a.id)} value={String(a.id)}>
                        {a.label}
                        {a.is_default ? " (default)" : ""} — {prettyAddressOneLine(a.address)}
                      </option>
                    ))}
                  </select>

                  <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                    {selectedBillingPreview ? (
                      <>
                        <div style={{ fontWeight: 900 }}>{selectedBillingPreview.label}</div>
                        <div style={{ opacity: 0.75 }}>{prettyAddressOneLine(selectedBillingPreview.address)}</div>
                      </>
                    ) : (
                      "No billing address selected."
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={labelStyle()}>Label</label>
                    <input
                      name="billing_label"
                      value={billingDraft.label}
                      onChange={(e) => setBillingDraft((p) => ({ ...p, label: e.target.value }))}
                      placeholder="e.g. Main billing"
                      style={inputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Company</label>
                      <input
                        name="billing_company"
                        value={billingDraft.company}
                        onChange={(e) => setBillingDraft((p) => ({ ...p, company: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Attn</label>
                      <input
                        name="billing_attn"
                        value={billingDraft.attn}
                        onChange={(e) => setBillingDraft((p) => ({ ...p, attn: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle()}>Address line 1</label>
                    <input
                      name="billing_line1"
                      value={billingDraft.line1}
                      onChange={(e) => setBillingDraft((p) => ({ ...p, line1: e.target.value }))}
                      style={inputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle()}>Address line 2</label>
                    <input
                      name="billing_line2"
                      value={billingDraft.line2}
                      onChange={(e) => setBillingDraft((p) => ({ ...p, line2: e.target.value }))}
                      style={inputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.6fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>City</label>
                      <input
                        name="billing_city"
                        value={billingDraft.city}
                        onChange={(e) => setBillingDraft((p) => ({ ...p, city: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>State</label>
                      <input
                        name="billing_state"
                        value={billingDraft.state}
                        onChange={(e) => setBillingDraft((p) => ({ ...p, state: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Postal</label>
                      <input
                        name="billing_postal"
                        value={billingDraft.postal}
                        onChange={(e) => setBillingDraft((p) => ({ ...p, postal: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Country</label>
                      <input
                        name="billing_country"
                        value={billingDraft.country}
                        onChange={(e) => setBillingDraft((p) => ({ ...p, country: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Phone</label>
                      <input
                        name="billing_phone"
                        value={billingDraft.phone}
                        onChange={(e) => setBillingDraft((p) => ({ ...p, phone: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle()}>Email</label>
                    <input
                      name="billing_email"
                      value={billingDraft.email}
                      onChange={(e) => setBillingDraft((p) => ({ ...p, email: e.target.value }))}
                      style={inputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle()}>Notes</label>
                    <input
                      name="billing_notes"
                      value={billingDraft.notes}
                      onChange={(e) => setBillingDraft((p) => ({ ...p, notes: e.target.value }))}
                      style={inputStyle()}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={copyBillingToShipping}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "white",
                      fontWeight: 950,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    Use this address for shipping
                  </button>

                  <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={billingDraft.makeDefault}
                      onChange={(e) => setBillingDraft((p) => ({ ...p, makeDefault: e.target.checked }))}
                    />
                    Make default billing address
                  </label>

                  <div style={{ display: "grid", gap: 6 }}>
                    <button
                      type="button"
                      disabled={savingBilling || !draftAddressMinComplete(billingDraft)}
                      onClick={() => void saveBillingToBook()}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(30,136,229,0.45)",
                        background: "rgba(30,136,229,0.14)",
                        fontWeight: 950,
                        cursor: savingBilling || !draftAddressMinComplete(billingDraft) ? "not-allowed" : "pointer",
                        opacity: savingBilling || !draftAddressMinComplete(billingDraft) ? 0.65 : 1,
                      }}
                    >
                      {savingBilling ? "Saving…" : "Save to address book"}
                    </button>
                    {billingSaveErr ? (
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>{billingSaveErr}</div>
                    ) : null}
                  </div>

                  <input type="hidden" name="billing_mode" value="NEW" />
                  <input type="hidden" name="billing_save" value="0" />
                  <input type="hidden" name="billing_make_default" value={billingDraft.makeDefault ? "1" : "0"} />
                </div>
              )}

              {billingMode === "SAVED" ? <input type="hidden" name="billing_mode" value="SAVED" /> : null}
            </div>

            {/* Shipping */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.85)",
                borderRadius: 18,
                padding: 12,
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(14px)",
                boxShadow: "0 10px 24px rgba(15,23,42,0.14)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: "linear-gradient(180deg, #1e88e5, #22d3ee)",
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>Shipping</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShippingMode("SAVED")}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: shippingMode === "SAVED" ? "rgba(30,136,229,0.18)" : "white",
                      color: shippingMode === "SAVED" ? "#0f172a" : "inherit",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingMode("NEW")}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: shippingMode === "NEW" ? "rgba(30,136,229,0.18)" : "white",
                      color: shippingMode === "NEW" ? "#0f172a" : "inherit",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    New
                  </button>
                </div>
              </div>

              {shippingMode === "SAVED" ? (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <label style={labelStyle()}>Select saved shipping address</label>
                  <select
                    name="shipping_address_id"
                    value={shippingAddressId}
                    onChange={(e) => setShippingAddressId(e.target.value)}
                    style={inputStyle()}
                  >
                    <option value="">— Select —</option>
                    {shippingSaved.map((a) => (
                      <option key={String(a.id)} value={String(a.id)}>
                        {a.label}
                        {a.is_default ? " (default)" : ""} — {prettyAddressOneLine(a.address)}
                      </option>
                    ))}
                  </select>

                  <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                    {selectedShippingPreview ? (
                      <>
                        <div style={{ fontWeight: 900 }}>{selectedShippingPreview.label}</div>
                        <div style={{ opacity: 0.75 }}>{prettyAddressOneLine(selectedShippingPreview.address)}</div>
                      </>
                    ) : (
                      "No shipping address selected."
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={labelStyle()}>Label</label>
                    <input
                      name="shipping_label"
                      value={shippingDraft.label}
                      onChange={(e) => setShippingDraft((p) => ({ ...p, label: e.target.value }))}
                      placeholder="e.g. Clinic receiving"
                      style={inputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Company</label>
                      <input
                        name="shipping_company"
                        value={shippingDraft.company}
                        onChange={(e) => setShippingDraft((p) => ({ ...p, company: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Attn</label>
                      <input
                        name="shipping_attn"
                        value={shippingDraft.attn}
                        onChange={(e) => setShippingDraft((p) => ({ ...p, attn: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle()}>Address line 1</label>
                    <input
                      name="shipping_line1"
                      value={shippingDraft.line1}
                      onChange={(e) => setShippingDraft((p) => ({ ...p, line1: e.target.value }))}
                      style={inputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle()}>Address line 2</label>
                    <input
                      name="shipping_line2"
                      value={shippingDraft.line2}
                      onChange={(e) => setShippingDraft((p) => ({ ...p, line2: e.target.value }))}
                      style={inputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.6fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>City</label>
                      <input
                        name="shipping_city"
                        value={shippingDraft.city}
                        onChange={(e) => setShippingDraft((p) => ({ ...p, city: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>State</label>
                      <input
                        name="shipping_state"
                        value={shippingDraft.state}
                        onChange={(e) => setShippingDraft((p) => ({ ...p, state: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Postal</label>
                      <input
                        name="shipping_postal"
                        value={shippingDraft.postal}
                        onChange={(e) => setShippingDraft((p) => ({ ...p, postal: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Country</label>
                      <input
                        name="shipping_country"
                        value={shippingDraft.country}
                        onChange={(e) => setShippingDraft((p) => ({ ...p, country: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={labelStyle()}>Phone</label>
                      <input
                        name="shipping_phone"
                        value={shippingDraft.phone}
                        onChange={(e) => setShippingDraft((p) => ({ ...p, phone: e.target.value }))}
                        style={inputStyle()}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle()}>Email</label>
                    <input
                      name="shipping_email"
                      value={shippingDraft.email}
                      onChange={(e) => setShippingDraft((p) => ({ ...p, email: e.target.value }))}
                      style={inputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={labelStyle()}>Notes</label>
                    <input
                      name="shipping_notes"
                      value={shippingDraft.notes}
                      onChange={(e) => setShippingDraft((p) => ({ ...p, notes: e.target.value }))}
                      style={inputStyle()}
                    />
                  </div>

                  <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={shippingDraft.makeDefault}
                      onChange={(e) => setShippingDraft((p) => ({ ...p, makeDefault: e.target.checked }))}
                    />
                    Make default shipping address
                  </label>

                  <div style={{ display: "grid", gap: 6 }}>
                    <button
                      type="button"
                      disabled={savingShipping || !draftAddressMinComplete(shippingDraft)}
                      onClick={() => void saveShippingToBook()}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(30,136,229,0.45)",
                        background: "rgba(30,136,229,0.14)",
                        fontWeight: 950,
                        cursor: savingShipping || !draftAddressMinComplete(shippingDraft) ? "not-allowed" : "pointer",
                        opacity: savingShipping || !draftAddressMinComplete(shippingDraft) ? 0.65 : 1,
                      }}
                    >
                      {savingShipping ? "Saving…" : "Save to address book"}
                    </button>
                    {shippingSaveErr ? (
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>{shippingSaveErr}</div>
                    ) : null}
                  </div>

                  <input type="hidden" name="shipping_mode" value="NEW" />
                  <input type="hidden" name="shipping_save" value="0" />
                  <input type="hidden" name="shipping_make_default" value={shippingDraft.makeDefault ? "1" : "0"} />
                </div>
              )}

              {shippingMode === "SAVED" ? <input type="hidden" name="shipping_mode" value="SAVED" /> : null}
            </div>
          </div>

          {/* ✅ Shipping priority */}
          <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <label style={{ fontWeight: 900 }}>Shipping Priority</label>
            <select
              name="shipping_priority"
              value={shippingPriority}
              onChange={(e) => setShippingPriority(e.target.value as ShippingPriority)}
              style={{
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.18)",
                fontWeight: 900,
                background: "white",
              }}
            >
              <option value="GROUND">Ground (3–5 business days)</option>
              <option value="THREE_DAY">3-Day</option>
              <option value="FIRST_OVERNIGHT">1st Overnight</option>
              <option value="PRIORITY_OVERNIGHT">Priority Overnight</option>
              <option value="TWO_DAY_AM">2-Day AM</option>
              <option value="TWO_DAY">2-Day</option>
            </select>

            {/* keep ETA for backend convenience */}
            <input type="hidden" name="shipping_eta_days" value={String(summary.etaDays)} />
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products / SKUs / sizes..."
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
                <option value="PRICE_ASC">Price (low → high)</option>
                <option value="PRICE_DESC">Price (high → low)</option>
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


        {/* Product list */}
        {filteredProducts.length === 0 ? (
          <div style={{ padding: 14, opacity: 0.75 }}>
            {bulkCatalog
              ? "No bulk-enabled catalog items yet. An admin can enable bulk purchase on products under Admin → Products (all variants are included by default; individual variants can be removed)."
              : "No products/variants match your filters."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredProducts.map(({ product, variants }) => {
              const pid = String(product.id);
              const isOpen = isOpenFor(pid);

              const brochure = props.brochuresByProduct?.[pid] ?? null;
              const brochureIsPdf = brochure?.original_filename ? isPdfName(brochure.original_filename) : false;

              return (
                <div
                  key={pid}
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
                    onClick={() => toggleProduct(pid)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                      border: "none",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.55))",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontWeight: 950, fontSize: 16, letterSpacing: -0.2 }}>{product.name}</div>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Code: <b>{product.code ?? "—"}</b> · Q code: <b>{product.qcode ?? "—"}</b>
                      </div>

                      {brochure && brochureIsPdf ? (
                        <div style={{ fontSize: 12, marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <a
                            href={`/api/portal/products/${encodeURIComponent(pid)}/brochure`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontWeight: 950,
                              textDecoration: "none",
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(30,136,229,0.35)",
                              background: "rgba(30,136,229,0.12)",
                              color: "#0f172a",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View brochure
                          </a>
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={pillStyle("muted")}>{variants.length} variants</span>
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
                              <th style={{ padding: "8px 8px" }}>Price</th>
                              <th style={{ padding: "8px 8px", width: 240 }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map(({ v }) => {
                              const vId = String(v.id);
                              const currentQty = qtyByVariant[vId] ?? 0;
                              const perSq = sqcmFromVariant(v);

                              return (
                                <tr key={vId} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                                  <td style={{ padding: "10px 8px", fontWeight: 900, whiteSpace: "nowrap" }}>{v.sku}</td>
                                  <td style={{ padding: "10px 8px", opacity: 0.85 }}>{v.size_label ?? "—"}</td>
                                  <td style={{ padding: "10px 8px", fontWeight: 900 }}>{fmtSqcm(perSq)}</td>
                                  <td style={{ padding: "10px 8px", fontWeight: 900 }}>{money(v.base_unit_price)}</td>
                                  <td style={{ padding: "10px 8px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 56px", gap: 10, alignItems: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => bumpQty(vId, -1)}
                                        disabled={currentQty <= 0}
                                        style={{
                                          height: 44,
                                          borderRadius: 14,
                                          border: "1px solid rgba(0,0,0,0.14)",
                                          background: "white",
                                          fontWeight: 950,
                                          cursor: currentQty <= 0 ? "not-allowed" : "pointer",
                                        }}
                                      >
                                        −
                                      </button>

                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={currentQty ? String(currentQty) : ""}
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
                                        style={{
                                          height: 44,
                                          borderRadius: 14,
                                          border: "1px solid rgba(0,0,0,0.14)",
                                          background: "white",
                                          fontWeight: 950,
                                          cursor: "pointer",
                                        }}
                                      >
                                        +
                                      </button>
                                    </div>
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
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={pillStyle(summary.itemCount ? "ok" : "muted")}>{summary.itemCount} items</span>
                  {showVwSplit && bulkContractSqcmNum > 0 ? (
                    <span style={pillStyle("ok")}>
                      {summary.itemCount === 0 ? "VW bulk (sq cm only)" : "VW bulk total"}
                    </span>
                  ) : null}
                  <span style={pillStyle("muted")}>Total sq cm: {fmtSqcm(displayTotalSqcm)}</span>
                  {showVwSplit && bulkContractSqcmNum > 0 && summary.totalSqcm > 0 ? (
                    <span style={pillStyle("muted")}>Selected lines (sq cm): {fmtSqcm(summary.totalSqcm)}</span>
                  ) : null}
                  {vwBulkContractListEstimate != null ? (
                    <span style={pillStyle("muted")}>Est. list: {money(vwBulkContractListEstimate)}</span>
                  ) : (
                    <span style={pillStyle("muted")}>Est. subtotal: {money(summary.rawSubtotal)}</span>
                  )}
                  {vwBulkContractAfterDiscount != null ? (
                    <span style={pillStyle("muted")}>Bulk total: {money(displaySubtotalAfterDiscount)}</span>
                  ) : props.bulkEnabled && bulkMode && bulkRuleApplied ? (
                    <span style={pillStyle("muted")}>Bulk total: {money(discountedSubtotal)}</span>
                  ) : accountDiscountPercent > 0 ? (
                    <span style={pillStyle("muted")}>After {accountDiscountPercent}%: {money(discountedSubtotal)}</span>
                  ) : null}
                  {!addressesReady ? (
                    <span style={{ fontWeight: 900, fontSize: 12, color: "#b91c1c" }}>
                      Select billing & shipping (saved or complete new: street, city, postal)
                    </span>
                  ) : null}
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
                    disabled={!canSubmit}
                    title={!addressesReady ? "Select billing and shipping addresses" : undefined}
                    onClick={() => {
                      if (!canSubmit) return;
                      setFormSubmitting(true);
                      if (submitModeRef.current) submitModeRef.current.value = "draft";
                      containerRef.current?.closest("form")?.requestSubmit();
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "white",
                      fontWeight: 950,
                      cursor: canSubmit ? "pointer" : "not-allowed",
                      opacity: canSubmit ? 1 : 0.55,
                    }}
                  >
                    Create Draft
                  </button>

                  <button
                    type="button"
                    disabled={!canSubmit}
                    title={!addressesReady ? "Select billing and shipping addresses" : undefined}
                    onClick={() => setShowPlaceConfirm(true)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "none",
                      background: "#111",
                      color: "white",
                      fontWeight: 950,
                      cursor: canSubmit ? "pointer" : "not-allowed",
                      opacity: canSubmit ? 1 : 0.55,
                    }}
                  >
                    Place Order
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
              aria-labelledby="place-order-title"
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
            <div id="place-order-title" style={{ fontWeight: 950, fontSize: 18 }}>Place order now?</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              This will create the order and immediately submit it to 360 Medical. Please confirm your addresses and
              selections.
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div><b>Items:</b> {summary.itemCount}</div>
              <div>
                <b>Total sq cm (for pricing):</b> {fmtSqcm(displayTotalSqcm)}
              </div>
              {props.bulkEnabled && bulkMode && bulkRuleApplied ? (
                <>
                  <div>
                    <b>Bulk tier price:</b> ${formatBulkPricePerSqcmLabel(bulkRuleApplied.price_per_sqcm)}/sq cm
                  </div>
                  {vwBulkContractListEstimate != null ? (
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                      Catalog list at standard unit pricing would be <b>{money(vwBulkContractListEstimate)}</b> — that is
                      a reference only. Your invoice uses the bulk tier rate above.
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                      Merchandise subtotal at list: <b>{money(summary.rawSubtotal)}</b> — pricing for this order follows
                      the tier rate (not a simple list subtotal).
                    </div>
                  )}
                  <div>
                    <b>Amount to pay (order total):</b> {money(displaySubtotalAfterDiscount)}
                  </div>
                </>
              ) : props.bulkEnabled && bulkMode ? (
                <div>
                  <b>Amount to pay (order total):</b> {money(displaySubtotalAfterDiscount)}
                </div>
              ) : (
                <>
                  <div>
                    <b>Subtotal:</b> {money(summary.rawSubtotal)}
                  </div>
                  <div>
                    <b>After discount ({accountDiscountPercent}%):</b> {money(discountedSubtotal)}
                  </div>
                </>
              )}
              {showVwSplit && bulkContractSqcmNum > 0 && summary.totalSqcm > 0 ? (
                <div>
                  <b>Selected lines (sq cm):</b> {fmtSqcm(summary.totalSqcm)}
                </div>
              ) : null}

              {showVwSplit && bulkContractSqcmNum > 0 ? (
                <div
                  style={{
                    marginTop: 4,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "rgba(15,23,42,0.03)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.9 }}>Virtual warehouse bulk purchase</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                    You are purchasing <b>{fmtSqcm(bulkContractSqcmNum)} sq cm</b> upfront (included in the invoice total
                    below). Product lines below use your contract; anything left stays as virtual warehouse balance.
                  </div>
                  <div
                    style={{
                      fontWeight: 950,
                      fontSize: 13,
                      letterSpacing: 0.2,
                      marginTop: 4,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "linear-gradient(135deg, rgba(30,64,175,0.12), rgba(14,165,233,0.14))",
                      border: "1px solid rgba(30,64,175,0.28)",
                      color: "#0f172a",
                    }}
                  >
                    Lines shipping initially
                  </div>
                  {initialShipmentPreview.rows.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                      {initialShipmentPreview.rows.map((r, i) => (
                        <li key={i}>
                          {r.label} — <b>{r.shipQty}</b> unit{r.shipQty === 1 ? "" : "s"} · {fmtSqcm(r.sqcm)} sq cm
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.88 }}>
                      No separate product lines ship on this order. Your bulk purchase is credited to your virtual
                      warehouse only.
                    </div>
                  )}
                  {initialShipmentPreview.rows.length > 0 ? (
                    <div style={{ fontSize: 12 }}>
                      <b>Total (initial shipment):</b> {fmtSqcm(initialShipmentPreview.totalSq)} sq cm
                    </div>
                  ) : null}
                  <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.9 }}>Virtual warehouse balance after payment</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                    <div>
                      <b>Allocated to line items:</b> {fmtSqcm(summary.totalSqcm)} sq cm
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <b>Remaining in your virtual warehouse balance:</b>{" "}
                      {contractHeadroomSqcm !== null ? (
                        <span style={{ fontWeight: 950 }}>{fmtSqcm(contractHeadroomSqcm)} sq cm</span>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>
                      {contractHeadroomSqcm !== null && contractHeadroomSqcm > 0.01 ? (
                        <>
                          Your bulk sq cm total is larger than the sq cm on these product lines. The amount above is the
                          difference—it stays in your virtual warehouse until you use it on a later shipment.
                        </>
                      ) : contractHeadroomSqcm !== null && contractHeadroomSqcm <= 0.01 ? (
                        <>These lines use your full bulk sq cm for this order, so there is no extra sq cm left over.</>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : summary.itemCount > 0 ? (
                <div
                  style={{
                    marginTop: 4,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "rgba(15,23,42,0.03)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.9 }}>Order lines</div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                    {initialShipmentPreview.rows.map((r, i) => (
                      <li key={i}>
                        {r.label} — <b>{r.shipQty}</b> unit{r.shipQty === 1 ? "" : "s"} · {fmtSqcm(r.sqcm)} sq cm
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <b>Shipping priority:</b> {shippingPriority}
              </div>
              <div>
                <b>Shipping address:</b> {shippingSummaryLine}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                <b>Shipping:</b>{" "}
                {props.bulkEnabled && bulkMode && props.virtualWarehouseEnabled
                  ? "Invoiced separately per fulfillment (not included in this order total)."
                  : "Quoted on this order where applicable (included in the order total when shown)."}
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
                  if (!canSubmit) return;
                  if (submitModeRef.current) submitModeRef.current.value = "place";
                  setFormSubmitting(true);
                  setPlaceOrderOverlayFlag();
                  setShowPlaceConfirm(false);
                  containerRef.current?.closest("form")?.requestSubmit();
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
                Confirm & Place
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
