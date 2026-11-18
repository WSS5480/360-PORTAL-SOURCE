// src/app/api/admin/fulfillments/[fulfillmentId]/shipping/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function safeBoolish(v: any): boolean {
  if (v === true) return true;
  if (v === 1 || v === "1") return true;
  if (typeof v === "string" && v.toLowerCase() === "true") return true;
  return false;
}

function parseMoneyOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;

  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseNumOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));

  const carrier = safeStr(body?.carrier).trim() || null;
  const service = safeStr(body?.service).trim() || null;
  const service_change_reason = safeStr(body?.service_change_reason).trim() || null;
  const service_changed_from = safeStr(body?.service_changed_from).trim() || null;
  const service_changed_to = safeStr(body?.service_changed_to).trim() || null;
  const tracking_number_raw = safeStr(body?.tracking_number).trim() || null;
  const label_url = safeStr(body?.label_url).trim() || null;
  const no_tracking = safeBoolish(body?.no_tracking);
  const weight_lbs = parseNumOrNull(body?.weight_lbs);
  const length_in = parseNumOrNull(body?.length_in);
  const width_in = parseNumOrNull(body?.width_in);
  const height_in = parseNumOrNull(body?.height_in);
  const saturday_delivery = Object.prototype.hasOwnProperty.call(body, "saturday_delivery")
    ? safeBoolish(body?.saturday_delivery)
    : undefined;

  // ✅ NEW
  const shipping_usd = parseMoneyOrNull(body?.shipping_usd);
  if (
    body?.shipping_usd !== null &&
    body?.shipping_usd !== undefined &&
    String(body?.shipping_usd).trim() !== "" &&
    shipping_usd === null
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid shipping_usd (must be a non-negative number with max 2 decimals)" },
      { status: 400 }
    );
  }

  // ✅ IMPORTANT: Save-only route should NOT require tracking.
  // (Tracking is required only when using /ship to close.)

  // Load fulfillment
  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id, status, metadata")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  if (safeUpper((f as any).status) !== "OPEN") {
    return NextResponse.json({ ok: false, error: "Fulfillment must be OPEN to edit shipping." }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const prevMeta = typeof (f as any).metadata === "object" && (f as any).metadata ? (f as any).metadata : {};
  const prevShip = prevMeta?.shipping && typeof prevMeta.shipping === "object" ? prevMeta.shipping : {};

  const shippingObj = {
    ...prevShip,
    carrier,
    service,
    tracking_number: no_tracking ? null : tracking_number_raw, // allow null if not provided
    label_url,
    no_tracking: no_tracking ? true : false,
    weight_lbs,
    length_in,
    width_in,
    height_in,
    shipping_usd, // ✅ NEW
    saturday_delivery: saturday_delivery !== undefined ? saturday_delivery : !!prevShip.saturday_delivery,
    updated_at: nowIso,
    ...(service_change_reason
      ? {
          service_change_reason,
          service_changed_from: service_changed_from || null,
          service_changed_to: service_changed_to || service,
          service_changed_at: nowIso,
        }
      : {
          service_change_reason: null,
          service_changed_from: null,
          service_changed_to: null,
          service_changed_at: null,
        }),
  };

  const nextMeta = { ...prevMeta, shipping: shippingObj };

  const { error: upErr } = await sb
    .from("fulfillments")
    .update({
      metadata: nextMeta,
      // ✅ DO NOT close here
    })
    .eq("id", fulfillmentId)
    .eq("status", "OPEN");

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    fulfillment_id: fulfillmentId,
    order_id: f.order_id ?? null,
    closed_at: null, // keep key present (backwards-friendly)
    shipping: shippingObj,
  });
}
