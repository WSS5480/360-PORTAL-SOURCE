// src/app/api/admin/fulfillments/[fulfillmentId]/packing-slip/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PackingSlipPdf, { PackingSlipItem, PackingSlipAddress } from "@/lib/pdf/PackingSlipPdf";
import { renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function safeUpper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

/** Not physically picked — exclude from warehouse packing slip. */
function isVirtualWarehouseBulkDepositLineDescription(desc: string): boolean {
  return safeStr(desc).startsWith("Virtual warehouse bulk purchase");
}

/** Consistent lot/serial display for packing slip (matches pick aggregation intent). */
function buildLotLabelFromInventoryRow(l: { lot_number?: string | null; serial_number?: string | null }): string {
  const lot = safeStr(l.lot_number);
  const serial = safeStr(l.serial_number);
  if (!lot && !serial) return "";
  const dup = !!lot && !!serial && lot.toUpperCase() === serial.toUpperCase();
  if (dup) return serial ? `S/N ${serial}` : lot;
  if (lot && serial) return `${lot} · S/N ${serial}`;
  if (serial) return `S/N ${serial}`;
  return lot;
}

async function enrichMissingLotsFromVariantLots(sb: any, items: PackingSlipItem[]): Promise<PackingSlipItem[]> {
  const need = items.filter((it) => !safeStr(it.lot) && safeStr(it.variantId));
  if (!need.length) return items;

  const vids = Array.from(new Set(need.map((it) => safeStr(it.variantId)).filter(Boolean)));
  const { data: rows } = await sb
    .from("product_variant_lots")
    .select("variant_id, lot_number, serial_number, created_at")
    .in("variant_id", vids as any)
    .order("created_at", { ascending: false });

  const firstByVariant = new Map<string, string>();
  for (const r of rows ?? []) {
    const vid = safeStr((r as any).variant_id);
    if (!vid || firstByVariant.has(vid)) continue;
    const label = buildLotLabelFromInventoryRow(r as any);
    if (label) firstByVariant.set(vid, label);
  }

  return items.map((it) => {
    if (safeStr(it.lot)) return it;
    const vid = safeStr(it.variantId);
    if (!vid) return it;
    const fb = firstByVariant.get(vid);
    if (!fb) return it;
    return { ...it, lot: fb };
  });
}

function toIsoDateOnly(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  if (/^\d{6}$/.test(raw)) return `20${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  return null;
}

// (01)GTIN(10)LOT(17)YYMMDD(21)SERIAL
function parseGs1AIs(raw: string): {
  gtin?: string;
  lot_number?: string;
  expiration_date?: string; // YYYY-MM-DD
  serial_number?: string;
} {
  const s = String(raw || "").trim();
  if (!s) return {};

  if (s.includes("(") && s.includes(")")) {
    const out: any = {};
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
  return {};
}

function shortId(id: string) {
  const s = safeStr(id);
  return s ? s.slice(0, 8) + "…" : "—";
}

function fmtDateTimeNY(iso: any) {
  const s = safeStr(iso);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  // deterministic formatting for consistent output
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

async function loadLogoDataUri(): Promise<string | null> {
  // ✅ Correct logo (public/brand/360-logo-black.png)
  const filePath = path.join(process.cwd(), "public", "brand", "360-logo-black.png");
  try {
    const buf = await fs.readFile(filePath);
    const b64 = buf.toString("base64");
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

function addrFromJson(a: any): PackingSlipAddress | null {
  if (!a || typeof a !== "object") return null;
  return {
    name: safeStr(a.name || a.facility_name || a.company || a.organization) || null,
    attn: safeStr(a.attn || a.attention || a.contact_name) || null,
    line1: safeStr(a.line1 || a.address1 || a.street1) || null,
    line2: safeStr(a.line2 || a.address2 || a.street2) || null,
    city: safeStr(a.city) || null,
    state: safeStr(a.state || a.region) || null,
    // ✅ Fix: handle common zip variants
    zip:
      safeStr(
        a.zip ||
          a.zip_code ||
          a.zipCode ||
          a.zipcode ||
          a.postal_code ||
          a.postal ||
          a.postalCode
      ) || null,
    country: safeStr(a.country) || null,
    phone: safeStr(a.phone) || null,
  };
}

type PickRow = {
  id: string;
  fulfillment_item_id: string;
  variant_id: string;
  qty: number;
  lot_row_id: string | null;
  is_undo: boolean;
  raw_scan: string | null;
};

type LotRow = {
  id: string;
  lot_number: string | null;
  serial_number: string | null;
  expiration_date: string | null;
  location: string | null;
};

function redirectWithFulfillmentMessage(req: Request, fulfillmentId: string, kind: "ok" | "error", message: string) {
  const param = kind === "ok" ? "msg" : "error";
  return NextResponse.redirect(
    urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}?${param}=${encodeURIComponent(message)}`),
    { status: 303 }
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  let fulfillmentId = "";
  try {
    await requireOrdersStaffOrAdmin();

    const resolved = await Promise.resolve(params as any);
    fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  // 1) Load fulfillment
  const { data: f, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, order_id, invoice_id, status, created_at, metadata, fulfillment_source")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  // 2) Load order (addresses + order number)
  const { data: order, error: oErr } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, invoice_address, delivery_address, account_id")
    .eq("id", f.order_id)
    .maybeSingle();

  if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });

  // Account name for BILL TO
  const { data: acct } = order?.account_id
    ? await supabaseAdmin.from("accounts").select("id, name").eq("id", order.account_id).maybeSingle()
    : ({ data: null } as any);

  // 3) Load fulfillment items (descriptions / uom / sort)
  const { data: items, error: iErr } = await supabaseAdmin
    .from("fulfillment_items")
    .select("id, description, variant_id, required_qty, picked_qty, uom, sort_order")
    .eq("fulfillment_id", fulfillmentId)
    .order("sort_order", { ascending: true });

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

  let itemRows = Array.isArray(items) ? items : [];
  const itemById = new Map<string, any>();
  for (const it of itemRows) itemById.set(String((it as any).id), it);

  // 3b) Load order items as fallback descriptions
  const { data: orderItemsRaw } = await supabaseAdmin
    .from("order_items")
    .select("id, product_variant_id, description, quantity, uom, sort_order, line_type")
    .eq("order_id", f.order_id)
    .order("sort_order", { ascending: true });

  const orderItems = (orderItemsRaw ?? [])
    .filter((it: any) => safeUpper(it?.line_type) !== "SHIPPING")
    .filter((it: any) => !isVirtualWarehouseBulkDepositLineDescription(safeStr(it?.description)));
  const descByVariant = new Map<string, { description: string; uom: string }>();
  for (const it of orderItems) {
    const vid = safeStr(it?.product_variant_id);
    if (!vid || descByVariant.has(vid)) continue;
    descByVariant.set(vid, {
      description: safeStr(it?.description) || "—",
      uom: safeStr(it?.uom) || "Units",
    });
  }

  if (itemRows.length === 0 && orderItems.length) {
    itemRows = orderItems.map((it: any) => ({
      id: String(it.id),
      description: safeStr(it.description) || "—",
      variant_id: safeStr(it.product_variant_id) || "",
      required_qty: safeNum(it.quantity ?? 0),
      picked_qty: 0,
      uom: safeStr(it.uom) || "Units",
      sort_order: it.sort_order ?? null,
    }));
  }

  // 4) Load picks
  const { data: picksRaw, error: pErr } = await supabaseAdmin
    .from("fulfillment_picks")
    .select("id, fulfillment_item_id, variant_id, qty, lot_row_id, is_undo, raw_scan")
    .eq("fulfillment_id", fulfillmentId)
    .order("created_at", { ascending: true });

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });

  const picks: PickRow[] = (Array.isArray(picksRaw) ? picksRaw : []).map((p: any) => ({
    id: String(p.id),
    fulfillment_item_id: String(p.fulfillment_item_id),
    variant_id: String(p.variant_id),
    qty: safeNum(p.qty),
    lot_row_id: p.lot_row_id ? String(p.lot_row_id) : null,
    is_undo: !!p.is_undo,
    raw_scan: p.raw_scan ? String(p.raw_scan) : null,
  }));

  // 5) Hydrate lots for any lot_row_id
  const lotIds = Array.from(new Set(picks.map((p) => p.lot_row_id).filter(Boolean))) as string[];
  const lotMap = new Map<string, LotRow>();
  const rawScanCandidates: Array<{ variant_id: string; raw_scan: string }> = [];

  if (lotIds.length) {
    const { data: lots, error: lotErr } = await supabaseAdmin
      .from("product_variant_lots")
      .select("id, lot_number, serial_number, expiration_date, location")
      .in("id", lotIds as any);

    if (!lotErr) {
      for (const l of lots ?? []) {
        lotMap.set(String((l as any).id), {
          id: String((l as any).id),
          lot_number: (l as any).lot_number ?? null,
          serial_number: (l as any).serial_number ?? null,
          expiration_date: (l as any).expiration_date ?? null,
          location: (l as any).location ?? null,
        });
      }
    }
  }

  // 5b) Preload lot rows that match raw scan values (non-GS1, no lot_row_id)
  for (const p of picks) {
    if (p.lot_row_id || !p.raw_scan) continue;
    const gs1 = parseGs1AIs(p.raw_scan);
    const hasGs1Lot = safeStr(gs1.lot_number) || safeStr(gs1.serial_number);
    if (hasGs1Lot) continue;
    const raw = safeStr(p.raw_scan);
    if (raw) rawScanCandidates.push({ variant_id: p.variant_id, raw_scan: raw });
  }

  const rawScanLookup = new Map<string, LotRow>();
  if (rawScanCandidates.length) {
    const rawValues = Array.from(new Set(rawScanCandidates.map((r) => r.raw_scan)));
    const variantIdsForRaw = Array.from(new Set(rawScanCandidates.map((r) => r.variant_id).filter(Boolean)));
    const { data: rawLots } = await supabaseAdmin
      .from("product_variant_lots")
      .select("id, variant_id, lot_number, serial_number, expiration_date, location")
      .in("variant_id", variantIdsForRaw as any)
      .in("serial_number", rawValues as any);
    const { data: rawLotsByLot } = await supabaseAdmin
      .from("product_variant_lots")
      .select("id, variant_id, lot_number, serial_number, expiration_date, location")
      .in("variant_id", variantIdsForRaw as any)
      .in("lot_number", rawValues as any);

    for (const l of rawLots ?? []) {
      const key = `${String((l as any).variant_id)}::${String((l as any).serial_number || "").trim()}`;
      rawScanLookup.set(key, {
        id: String((l as any).id),
        lot_number: (l as any).lot_number ?? null,
        serial_number: (l as any).serial_number ?? null,
        expiration_date: (l as any).expiration_date ?? null,
        location: (l as any).location ?? null,
      });
    }
    for (const l of rawLotsByLot ?? []) {
      const key = `${String((l as any).variant_id)}::${String((l as any).lot_number || "").trim()}`;
      if (rawScanLookup.has(key)) continue;
      rawScanLookup.set(key, {
        id: String((l as any).id),
        lot_number: (l as any).lot_number ?? null,
        serial_number: (l as any).serial_number ?? null,
        expiration_date: (l as any).expiration_date ?? null,
        location: (l as any).location ?? null,
      });
    }
  }

  // 6) Try to resolve SKU from product_variants (safe optional)
  const variantIds = Array.from(
    new Set([
      ...itemRows.map((it: any) => String(it.variant_id ?? "")).filter(Boolean),
      ...picks.map((p) => String(p.variant_id ?? "")).filter(Boolean),
    ])
  );

  const skuMap = new Map<string, string>();
  if (variantIds.length) {
    try {
      const { data: vRows, error: vErr } = await supabaseAdmin
        .from("product_variants")
        .select("id, sku")
        .in("id", variantIds as any);

      // NOTE: Some Supabase typings accept `any`; if your TS complains, replace `as any/plugin` with `as any`.
      if (!vErr) {
        for (const r of vRows ?? []) {
          const id = String((r as any).id);
          const sku = safeStr((r as any).sku);
          if (id && sku) skuMap.set(id, sku);
        }
      }
    } catch {
      // safe fallback
    }
  }

  // 7) Build printable rows (group by item + lot). Undo picks subtract.
  const agg = new Map<
    string,
    {
      fulfillment_item_id: string;
      variant_id: string;
      lot_row_id: string | null;
      qty: number;
      lot_label: string | null;
      exp: string | null;
      row_key: string;
    }
  >();

  for (const p of picks) {
    const lotRow = p.lot_row_id ? lotMap.get(p.lot_row_id) ?? null : null;
    const gs1 = p.raw_scan ? parseGs1AIs(p.raw_scan) : {};
    const scanLot = safeStr(gs1.lot_number);
    const scanSerial = safeStr(gs1.serial_number);
    const scanExp = safeStr(gs1.expiration_date);
    const rawScan = safeStr(p.raw_scan);
    const rawMatch =
      !lotRow && rawScan ? rawScanLookup.get(`${p.variant_id}::${rawScan}`) ?? null : null;

    const lotNumberRaw = safeStr(lotRow?.lot_number || rawMatch?.lot_number);
    const serialRaw = safeStr(lotRow?.serial_number || rawMatch?.serial_number);
    const lotNumberRawUpper = lotNumberRaw.toUpperCase();
    const serialRawUpper = serialRaw.toUpperCase();
    const lotNumberIsDupSerial = !!lotNumberRawUpper && !!serialRawUpper && lotNumberRawUpper === serialRawUpper;
    const lotNumber =
      lotNumberRaw && lotNumberRawUpper !== "UNKNOWN" && !lotNumberIsDupSerial ? lotNumberRaw : serialRaw || "";
    const lotLabelBase = lotNumber
      ? serialRaw && lotNumberRaw && lotNumberRawUpper !== "UNKNOWN" && !lotNumberIsDupSerial
        ? `${lotNumber} · S/N ${serialRaw}`
        : serialRaw && (!lotNumberRaw || lotNumberIsDupSerial)
        ? `S/N ${serialRaw}`
        : lotNumber
      : scanLot
      ? scanSerial
        ? `${scanLot} · S/N ${scanSerial}`
        : scanLot
      : scanSerial
      ? `S/N ${scanSerial}`
      : "";
    const rawScanLabel =
      !lotLabelBase && rawScan ? (rawScan.length > 36 ? `${rawScan.slice(0, 36)}…` : rawScan) : "";
    const loc = safeStr(lotRow?.location || rawMatch?.location);
    const lotLabel = lotLabelBase || rawScanLabel ? (loc ? `${lotLabelBase || rawScanLabel} · ${loc}` : lotLabelBase || rawScanLabel) : null;
    const exp = safeStr(lotRow?.expiration_date || rawMatch?.expiration_date) || (scanExp ? scanExp : null);

    const keySuffix = p.lot_row_id
      ? `LOTROW:${p.lot_row_id}`
      : scanSerial
      ? `SERIAL:${scanSerial}`
      : scanLot
      ? `LOT:${scanLot}`
      : rawScan
      ? `RAW:${rawScan}`
      : "NOLOT";
    const key = `${p.fulfillment_item_id}::${keySuffix}`;
    const sign = p.is_undo ? -1 : 1;
    const cur = agg.get(key) ?? {
      fulfillment_item_id: p.fulfillment_item_id,
      variant_id: p.variant_id,
      lot_row_id: p.lot_row_id,
      qty: 0,
      lot_label: lotLabel,
      exp,
      row_key: keySuffix,
    };
    cur.qty += sign * safeNum(p.qty);
    if (!cur.lot_label && lotLabel) cur.lot_label = lotLabel;
    if (!cur.exp && exp) cur.exp = exp;
    agg.set(key, cur);
  }

  // Only keep positive qty lines
  const pickedLines = Array.from(agg.values()).filter((x) => safeNum(x.qty) > 0);

  for (const pl of pickedLines) {
    if (pl.lot_label) continue;
    const lid = pl.lot_row_id ? String(pl.lot_row_id) : "";
    if (!lid) continue;
    const lr = lotMap.get(lid);
    if (lr) {
      const built = buildLotLabelFromInventoryRow(lr);
      if (built) (pl as { lot_label: string | null }).lot_label = built;
    }
  }

  const pickedItemIds = new Set(pickedLines.map((x) => String(x.fulfillment_item_id)));

  const pickedItems = pickedLines
    .sort((a, b) => {
      const ia = itemById.get(a.fulfillment_item_id);
      const ib = itemById.get(b.fulfillment_item_id);
      const sa = safeNum(ia?.sort_order);
      const sb = safeNum(ib?.sort_order);
      if (sa !== sb) return sa - sb;
      return String(a.lot_label ?? "").localeCompare(String(b.lot_label ?? ""));
    })
    .map((pl) => {
      const it = itemById.get(pl.fulfillment_item_id);

      const variantId = safeStr(pl.variant_id) || safeStr(it?.variant_id) || "";
      const fallback = variantId ? descByVariant.get(variantId) : null;
      const sku = variantId ? (skuMap.get(variantId) ?? variantId) : null;

      return {
        id: `${pl.fulfillment_item_id}:${pl.row_key}`,
        variantId: variantId || null,
        qty: safeNum(pl.qty),
        uom: safeStr(it?.uom) || fallback?.uom || "Units",
        description: safeStr(it?.description) || fallback?.description || "—",
        sku,
        lot: pl.lot_label,
        exp: pl.exp,
      };
    });

  // 7b) Dropship trace lines (if any)
  const { data: traceRows } = await supabaseAdmin
    .from("fulfillment_item_trace")
    .select("id, fulfillment_item_id, variant_id, qty, lot_number, serial_number, expiration_date")
    .eq("fulfillment_id", fulfillmentId);

  const traceAgg = new Map<
    string,
    { fulfillment_item_id: string; variant_id: string; qty: number; lot_label: string | null; exp: string | null; row_key: string }
  >();
  for (const tr of traceRows ?? []) {
    const fid = safeStr((tr as any).fulfillment_item_id);
    const vid = safeStr((tr as any).variant_id);
    if (!fid || !vid) continue;
    const lot = safeStr((tr as any).lot_number);
    const serial = safeStr((tr as any).serial_number);
    const exp = safeStr((tr as any).expiration_date) || null;
    const lotLabel = lot && serial ? `${lot} · S/N ${serial}` : serial ? `S/N ${serial}` : lot || null;
    const rowKey = `${lot || "NOLOT"}:${serial || "NOSERIAL"}`;
    const key = `${fid}::${rowKey}`;
    const cur = traceAgg.get(key) ?? {
      fulfillment_item_id: fid,
      variant_id: vid,
      qty: 0,
      lot_label: lotLabel,
      exp,
      row_key: rowKey,
    };
    cur.qty += safeNum((tr as any).qty);
    if (!cur.lot_label && lotLabel) cur.lot_label = lotLabel;
    if (!cur.exp && exp) cur.exp = exp;
    traceAgg.set(key, cur);
  }

  const traceItems: PackingSlipItem[] = Array.from(traceAgg.values()).map((tr) => {
    const it = itemById.get(tr.fulfillment_item_id);
    const variantId = safeStr(tr.variant_id) || safeStr(it?.variant_id) || "";
    const fallback = variantId ? descByVariant.get(variantId) : null;
    const sku = variantId ? (skuMap.get(variantId) ?? variantId) : null;
    return {
      id: `${tr.fulfillment_item_id}:TRACE:${tr.row_key}`,
      variantId: variantId || null,
      qty: safeNum(tr.qty),
      uom: safeStr(it?.uom) || fallback?.uom || "Units",
      description: safeStr(it?.description) || fallback?.description || "—",
      sku,
      lot: tr.lot_label,
      exp: tr.exp,
    };
  });

  const fallbackItems = itemRows
    .filter((it: any) => !pickedItemIds.has(String(it.id)))
    .map((it: any) => {
      const pickedQty = safeNum(it.picked_qty ?? 0);
      const requiredQty = safeNum(it.required_qty ?? 0);
      const qty = pickedQty > 0 ? pickedQty : requiredQty;
      return {
        id: `${String(it.id)}:NOLOT`,
        variantId: it.variant_id ? String(it.variant_id) : null,
        qty,
        uom: safeStr(it.uom) || "Units",
        description: safeStr(it.description) || "—",
        sku: it.variant_id ? (skuMap.get(String(it.variant_id)) ?? safeStr(it.variant_id)) : null,
        lot: null,
        exp: null,
      };
    })
    .filter((it: PackingSlipItem) => safeNum(it.qty) > 0);

  const isDropship = safeUpper((f as any).fulfillment_source) === "DROPSHIP";
  const primaryItems = isDropship && traceItems.length ? traceItems : pickedItems;
  let pdfItems: PackingSlipItem[] = [...primaryItems, ...fallbackItems].filter(
    (it) => !isVirtualWarehouseBulkDepositLineDescription(safeStr(it.description))
  );
  pdfItems = await enrichMissingLotsFromVariantLots(supabaseAdmin, pdfItems);

  // 8) Addresses
  const shipTo = addrFromJson(order?.delivery_address);
  const billToRaw = addrFromJson(order?.invoice_address);

  const billTo: PackingSlipAddress | null = billToRaw
    ? { ...billToRaw, name: billToRaw.name || safeStr(acct?.name) || null }
    : safeStr(acct?.name)
    ? { name: safeStr(acct?.name) }
    : null;

  // ✅ Logo from /public/brand/
  const logoDataUri = await loadLogoDataUri();

  // ✅ Always show 360 return address in header
  const companyLine1 = "3900 N. 10th St. Suite 1050";
  const companyLine2 = "McAllen, TX 78501";
  const companyLine3 = "";

  // 9) Render PDF
  const buf = await renderToBuffer(
    PackingSlipPdf({
      logoDataUri,
      companyName: "360 Medical",
      companyLine1,
      companyLine2,
      companyLine3,

      fulfillmentIdShort: shortId(String(f.id)),
      orderNumber: order?.order_number ? safeStr(order.order_number) : null,
      invoiceShort: f.invoice_id ? shortId(String(f.invoice_id)) : null,
      createdAtLabel: fmtDateTimeNY(f.created_at),

      shipTo,
      billTo,

      items: pdfItems,
      note:
        pickedLines.length === 0
          ? "No pick history found — showing fulfillment item quantities."
          : fallbackItems.length > 0
          ? "Some items not yet picked — showing requested quantities for remaining lines."
          : null,
    })
  );

  // 10) Save to Storage (stable path)
  const bucket = "order-private";
  const storagePath = `fulfillments/${fulfillmentId}/packing-slip.pdf`;

  const upload = await supabaseAdmin.storage.from(bucket).upload(storagePath, buf, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (upload.error) {
    return NextResponse.json({ ok: false, error: upload.error.message }, { status: 500 });
  }

  // 11) Save metadata pointer
  const prevMeta = typeof (f as any).metadata === "object" && (f as any).metadata ? (f as any).metadata : {};
  const nextMeta = {
    ...prevMeta,
    packing_slip: {
      bucket,
      path: storagePath,
      generated_at: new Date().toISOString(),
    },
  };

  const { error: upErr } = await supabaseAdmin.from("fulfillments").update({ metadata: nextMeta }).eq("id", fulfillmentId);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return redirectWithFulfillmentMessage(req, fulfillmentId, "ok", "Packing slip generated.");
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : "Failed to generate packing slip.";
    console.error("[packing-slip] POST failed:", message, err);

    if (fulfillmentId && UUID_RE.test(fulfillmentId)) {
      return redirectWithFulfillmentMessage(req, fulfillmentId, "error", message);
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
