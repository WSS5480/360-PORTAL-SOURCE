// src/app/api/admin/fulfillments/[fulfillmentId]/dropship/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normId(v: any) {
  const s = String(v || "").trim();
  return UUID_RE.test(s) ? s : "";
}

async function getFulfillmentId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const resolved = typeof p?.then === "function" ? await p : p;
  return normId(resolved?.fulfillmentId);
}

function safeObj(v: any) {
  return v && typeof v === "object" ? v : null;
}

function upcase(v: any) {
  return String(v || "").trim().toUpperCase();
}

function trimStrOrNull(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function normalizeDateStr(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  // Keep YYYY-MM-DD as-is (common for date inputs)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Allow ISO / parseable strings
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return s;

  return null;
}

function safeNumberOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;

  // allow "12", "12.3", "12.34"
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function normalizeBool01(v: any): 0 | 1 | null {
  if (v === null || v === undefined) return null;
  if (v === 1 || v === "1" || v === true || v === "true" || v === "on") return 1;
  if (v === 0 || v === "0" || v === false || v === "false" || v === "off") return 0;
  return null;
}

function mergeMetadata(prev: any, next: any) {
  const base = prev && typeof prev === "object" ? prev : {};
  return { ...base, ...next };
}

// Keep Order Details shipping in sync (orders.shipping_total)
async function syncOrderShippingTotalFromFulfillments(orderId: string) {
  if (!UUID_RE.test(orderId)) return;

  const { data: fs } = await supabaseAdmin
    .from("fulfillments")
    .select("id, metadata")
    .eq("order_id", orderId)
    .limit(5000);

  let sum = 0;

  for (const f of Array.isArray(fs) ? fs : []) {
    const meta = (f as any)?.metadata;
    const m = meta && typeof meta === "object" ? meta : {};
    const ship = m?.shipping && typeof m.shipping === "object" ? m.shipping : {};
    const v = ship?.shipping_usd;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) sum += n;
  }

  try {
    await supabaseAdmin.from("orders").update({ shipping_total: sum }).eq("id", orderId);
  } catch {}
}

/**
 * PATCH body supports:
 *  - fulfillment_source: "INVENTORY" | "DROPSHIP"
 *  - dropship_vendor_id: uuid | null | ""
 *
 * Also supports dropship columns:
 *  - dropship_status
 *  - dropship_packing_slip_number
 *  - dropship_tracking_number
 *  - dropship_carrier
 *  - dropship_ship_date
 *  - dropship_notes
 *
 * Shipping metadata (canonical):
 *  - shipping_usd
 *  - label_url / dropship_label_url
 *  - no_tracking / dropship_no_tracking
 *  - tracking_number / dropship_tracking_number
 *  - carrier / dropship_carrier
 *
 * Mixed-fulfillment rule:
 * If an OPEN fulfillment already exists for the same order + desired source,
 * we do NOT mutate this fulfillment (avoids unique index violation).
 * Instead we return { ok:true, redirect_fulfillment_id } so the client can navigate.
 */
export async function PATCH(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentId(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });

  const body = safeObj(await req.json().catch(() => null));
  if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  // Load current row (need order_id + status for mixed logic + edit guard + metadata merge)
  const { data: f, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, order_id, status, fulfillment_source, dropship_vendor_id, metadata")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  const fRow: any = f;
  const orderId = normId(fRow.order_id);
  const statusUpper = upcase(fRow.status);

  if (!orderId) return NextResponse.json({ ok: false, error: "Fulfillment missing order_id" }, { status: 400 });

  // Server-side edit guard
  if (statusUpper !== "OPEN") {
    return NextResponse.json(
      { ok: false, error: "Fulfillment is not open. Reopen it to edit dropship settings." },
      { status: 400 }
    );
  }

  const patch: any = {};

  // Intended source after this PATCH (may be implied by vendor / dropship info)
  let desiredSource: "INVENTORY" | "DROPSHIP" | null = null;

  // fulfillment_source (explicit)
  if (Object.prototype.hasOwnProperty.call(body, "fulfillment_source")) {
    const nextSource = upcase(body.fulfillment_source);
    if (nextSource !== "INVENTORY" && nextSource !== "DROPSHIP") {
      return NextResponse.json({ ok: false, error: "Invalid fulfillment_source" }, { status: 400 });
    }
    desiredSource = nextSource;
    patch.fulfillment_source = nextSource;

    // If switching to INVENTORY, clear vendor only (do NOT wipe other dropship fields)
    if (nextSource === "INVENTORY") {
      patch.dropship_vendor_id = null;
    }
  }

  // dropship_vendor_id (may imply DROPSHIP)
  if (Object.prototype.hasOwnProperty.call(body, "dropship_vendor_id")) {
    const raw = body.dropship_vendor_id;
    const nextVendorId = raw === null || raw === "" ? "" : normId(raw);

    if (raw !== null && raw !== "" && !nextVendorId) {
      return NextResponse.json({ ok: false, error: "Invalid dropship_vendor_id" }, { status: 400 });
    }

    patch.dropship_vendor_id = nextVendorId ? nextVendorId : null;

    if (patch.dropship_vendor_id) {
      desiredSource = "DROPSHIP";
      patch.fulfillment_source = "DROPSHIP";
    }
  }

  // ✅ Dropship shipping/info fields (columns)
  const dsPatch: any = {};

  if (Object.prototype.hasOwnProperty.call(body, "dropship_status")) {
    const s = upcase(body.dropship_status);
    dsPatch.dropship_status = s ? s : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "dropship_packing_slip_number")) {
    dsPatch.dropship_packing_slip_number = trimStrOrNull(body.dropship_packing_slip_number);
  }

  // Accept either dropship_tracking_number OR tracking_number
  if (Object.prototype.hasOwnProperty.call(body, "dropship_tracking_number")) {
    dsPatch.dropship_tracking_number = trimStrOrNull(body.dropship_tracking_number);
  } else if (Object.prototype.hasOwnProperty.call(body, "tracking_number")) {
    dsPatch.dropship_tracking_number = trimStrOrNull(body.tracking_number);
  }

  // Accept either dropship_carrier OR carrier
  if (Object.prototype.hasOwnProperty.call(body, "dropship_carrier")) {
    dsPatch.dropship_carrier = trimStrOrNull(body.dropship_carrier);
  } else if (Object.prototype.hasOwnProperty.call(body, "carrier")) {
    dsPatch.dropship_carrier = trimStrOrNull(body.carrier);
  }

  if (Object.prototype.hasOwnProperty.call(body, "dropship_ship_date")) {
    dsPatch.dropship_ship_date = normalizeDateStr(body.dropship_ship_date);
  }

  if (Object.prototype.hasOwnProperty.call(body, "dropship_notes")) {
    dsPatch.dropship_notes = trimStrOrNull(body.dropship_notes);
  }

  for (const k of Object.keys(dsPatch)) patch[k] = dsPatch[k];

  // ✅ Canonical shipping storage in fulfillments.metadata.shipping (same shape as inventory)
  // Accept both dropship_* and generic keys to match client reality.
  let wantsMetaShipping = false;

  const metaShipPatch: any = {};
  const nowIso = new Date().toISOString();

  const hasCarrier =
    Object.prototype.hasOwnProperty.call(body, "dropship_carrier") ||
    Object.prototype.hasOwnProperty.call(body, "carrier");

  const hasTracking =
    Object.prototype.hasOwnProperty.call(body, "dropship_tracking_number") ||
    Object.prototype.hasOwnProperty.call(body, "tracking_number");

  const hasLabel =
    Object.prototype.hasOwnProperty.call(body, "dropship_label_url") ||
    Object.prototype.hasOwnProperty.call(body, "label_url");

  const hasNoTracking =
    Object.prototype.hasOwnProperty.call(body, "dropship_no_tracking") ||
    Object.prototype.hasOwnProperty.call(body, "no_tracking");

  const hasShippingUsd = Object.prototype.hasOwnProperty.call(body, "shipping_usd");

  if (hasCarrier) {
    wantsMetaShipping = true;
    metaShipPatch.carrier = trimStrOrNull(
      Object.prototype.hasOwnProperty.call(body, "dropship_carrier") ? body.dropship_carrier : body.carrier
    );
  }

  if (hasTracking) {
    wantsMetaShipping = true;
    metaShipPatch.tracking_number = trimStrOrNull(
      Object.prototype.hasOwnProperty.call(body, "dropship_tracking_number")
        ? body.dropship_tracking_number
        : body.tracking_number
    );
  }

  if (hasLabel) {
    wantsMetaShipping = true;
    metaShipPatch.label_url = trimStrOrNull(
      Object.prototype.hasOwnProperty.call(body, "dropship_label_url") ? body.dropship_label_url : body.label_url
    );
  }

  if (hasNoTracking) {
    wantsMetaShipping = true;
    const raw = Object.prototype.hasOwnProperty.call(body, "dropship_no_tracking") ? body.dropship_no_tracking : body.no_tracking;
    const b = normalizeBool01(raw);

    // if they pass a garbage value, treat as error (prevents silent bad state)
    if (b === null && raw !== null && raw !== undefined) {
      return NextResponse.json({ ok: false, error: "Invalid no_tracking / dropship_no_tracking" }, { status: 400 });
    }
    metaShipPatch.no_tracking = b === null ? null : !!b;

    // if no_tracking is true, also null the tracking_number (keeps state sane)
    if (metaShipPatch.no_tracking === true) {
      metaShipPatch.tracking_number = null;
    }
  }

  if (hasShippingUsd) {
    wantsMetaShipping = true;

    // allow null/"" to clear
    const n = safeNumberOrNull(body.shipping_usd);
    if (
      body.shipping_usd !== null &&
      body.shipping_usd !== undefined &&
      String(body.shipping_usd).trim() !== "" &&
      n === null
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid shipping_usd (must be a non-negative number with max 2 decimals)" },
        { status: 400 }
      );
    }

    metaShipPatch.shipping_usd = n; // store numeric
  }

  if (wantsMetaShipping) {
    const prevMeta = safeObj(fRow.metadata) ?? {};
    const prevShipping = safeObj((prevMeta as any).shipping) ?? {};

    const nextShipping = {
      ...prevShipping,
      ...metaShipPatch,
      updated_at: nowIso,
    };

    const nextMeta = mergeMetadata(prevMeta, { shipping: nextShipping });
    patch.metadata = nextMeta;
  }

  // If they sent dropship fields (and didn't explicitly switch to INVENTORY), treat as DROPSHIP intent
  const sentAnyDropshipInfo = Object.keys(dsPatch).length > 0 || wantsMetaShipping;
  if (sentAnyDropshipInfo && !desiredSource && patch.fulfillment_source !== "INVENTORY") {
    desiredSource = "DROPSHIP";
    patch.fulfillment_source = "DROPSHIP";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: false, fulfillment: fRow });
  }

  // ✅ Mixed fulfillment guard
  if (statusUpper === "OPEN" && desiredSource) {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("fulfillments")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "OPEN")
      .eq("fulfillment_source", desiredSource)
      .maybeSingle();

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });

    if (existing?.id && String(existing.id) !== String(fulfillmentId)) {
      return NextResponse.json({
        ok: true,
        updated: false,
        redirect_fulfillment_id: String(existing.id),
        note: `An OPEN ${desiredSource} fulfillment already exists for this order. Navigate to it instead of switching.`,
      });
    }
  }

  // Apply update
  const { data: updated, error: uErr } = await supabaseAdmin
    .from("fulfillments")
    .update(patch)
    .eq("id", fulfillmentId)
    .select(
      "id,order_id,status,fulfillment_source,dropship_vendor_id,dropship_status,dropship_packing_slip_number,dropship_tracking_number,dropship_carrier,dropship_ship_date,dropship_notes,metadata"
    )
    .single();

  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });

  // ✅ If shipping_usd was part of this request, sync orders.shipping_total so Order Details shows it
  if (hasShippingUsd) {
    await syncOrderShippingTotalFromFulfillments(orderId);
  }

  return NextResponse.json({ ok: true, updated: true, fulfillment: updated });
}
