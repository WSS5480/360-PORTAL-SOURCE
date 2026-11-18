// src/app/api/admin/fulfillments/[fulfillmentId]/dropship/po/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { renderPurchaseOrderPdf } from "@/lib/dropship/renderPurchaseOrderPdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return UUID_RE.test(s) ? s : "";
}

async function getFulfillmentIdFromCtx(ctx: any): Promise<string> {
  const maybeParams = ctx?.params;
  const resolved = maybeParams && typeof maybeParams?.then === "function" ? await maybeParams : maybeParams;
  return normalizeUuid(resolved?.fulfillmentId);
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

function safeObj(v: any) {
  return v && typeof v === "object" ? v : null;
}

function s(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function todayYMD() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function nextPoNumberLike() {
  const t = Date.now().toString().slice(-5);
  return `P${t.padStart(5, "0")}`;
}

// ✅ THIS is the real source of ship method (per your schema)
function buildShipMethodFromOrder(order: any): string {
  const pri = s(order?.shipping_priority); // column
  const days =
    safeInt(order?.shipping_estimated_days) ??
    safeInt(order?.shipping_eta_days) ??
    null;

  // If you store something like "FEDEX GROUND" in shipping_priority:
  if (pri && days) return `${pri} (Est. ${days} business days)`;
  if (pri) return pri;

  // fallback default
  return days ? `FEDEX GROUND (Est. ${days} business days)` : "FEDEX GROUND (Est. 3–5 business days)";
}

export async function POST(_req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentIdFromCtx(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });

  const { data: f, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, order_id, status, metadata, fulfillment_source, dropship_vendor_id, po_number")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr || !f) {
    return NextResponse.json({ ok: false, error: fErr?.message || "Fulfillment not found" }, { status: 404 });
  }

  const fRow: any = f;

  if (String(fRow.fulfillment_source || "INVENTORY").toUpperCase() !== "DROPSHIP") {
    return NextResponse.json({ ok: false, error: "Fulfillment is not set to DROPSHIP." }, { status: 400 });
  }

  const vendorId = normalizeUuid(fRow.dropship_vendor_id);
  if (!vendorId) return NextResponse.json({ ok: false, error: "Select a dropship vendor first." }, { status: 400 });

  const orderId = normalizeUuid(fRow.order_id);
  if (!orderId) return NextResponse.json({ ok: false, error: "Fulfillment missing order_id." }, { status: 400 });

  // ✅ include shipping columns from your schema
  const { data: order, error: oErr } = await supabaseAdmin
    .from("orders")
    .select("id, account_id, order_number, delivery_address, invoice_address, shipping_priority, shipping_eta_days, shipping_estimated_days")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr || !order) return NextResponse.json({ ok: false, error: oErr?.message || "Order not found" }, { status: 404 });

  const { data: vendor, error: vErr } = await supabaseAdmin
    .from("dropship_vendors")
    .select("id, name, email, phone, address")
    .eq("id", vendorId)
    .maybeSingle();

  if (vErr || !vendor) return NextResponse.json({ ok: false, error: vErr?.message || "Vendor not found" }, { status: 404 });

  const { data: items, error: iErr } = await supabaseAdmin
    .from("fulfillment_items")
    .select("id, description, variant_id, required_qty, uom")
    .eq("fulfillment_id", fulfillmentId)
    .order("sort_order", { ascending: true });

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

  const deliveryAddr = safeObj((order as any).delivery_address) || null;

  const shipNameLine =
    String(
      (deliveryAddr as any)?.name ||
        (deliveryAddr as any)?.company ||
        (deliveryAddr as any)?.facility_name ||
        (deliveryAddr as any)?.attn ||
        ""
    ).trim() || null;

  const poNumber = String(fRow.po_number || "").trim() || nextPoNumberLike();

  // ✅ NOW it will reflect your orders table
  const shipMethod = buildShipMethodFromOrder(order);

  const pdf = await renderPurchaseOrderPdf({
    poNumber,
    orderDateISO: todayYMD(),
    expectedArrivalISO: null,
    shipMethod,
    paymentTerms: "",

    buyerName: "360 Medical",

    vendor: {
      name: String((vendor as any).name || ""),
      phone: (vendor as any).phone ? String((vendor as any).phone) : null,
      email: (vendor as any).email ? String((vendor as any).email) : null,
      address: safeObj((vendor as any).address) || null,
    },

    shippingTo: {
      nameLine: shipNameLine,
      address: deliveryAddr,
    },

    items: (items ?? []).map((it: any) => ({
      sku: null,
      description: String(it.description || ""),
      qty: safeNum(it.required_qty),
      uom: String(it.uom || "Units"),
      unit_price: 0,
      discount_pct: 0,
      taxes: 0,
    })),

    brand: {
      logoPublicPath: "/brand/360medical-logo.png",
      companyName: "360 Medical",
      addressLines: ["3900 N. 10th St. Suite 1050", "McAllen, TX 78501", "United States"],
      email: "info@360medical.net",
      website: "http://www.360medical.net",
    },
  });

  const bucket = "order-private";
  const objectPath = `dropship/${orderId}/${fulfillmentId}/PO-${poNumber}.pdf`;

  const up = await supabaseAdmin.storage.from(bucket).upload(objectPath, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  const { error: uErr } = await supabaseAdmin
    .from("fulfillments")
    .update({
      po_number: poNumber,
      po_pdf_bucket: bucket,
      po_pdf_path: objectPath,
      po_sent_at: null,
      po_sent_to: (vendor as any).email ? String((vendor as any).email) : null,
      dropship_status: "PO_GENERATED",
    })
    .eq("id", fulfillmentId);

  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, po: { number: poNumber, bucket, path: objectPath } });
}
