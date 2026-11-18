import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

function safeQty(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export async function POST(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentIdFromCtx(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const toFulfillmentId = normalizeUuid(body?.to_fulfillment_id);
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!toFulfillmentId) {
    return NextResponse.json({ ok: false, error: "to_fulfillment_id is required" }, { status: 400 });
  }

  if (!items.length) {
    return NextResponse.json({ ok: false, error: "No items provided" }, { status: 400 });
  }

  const itemIds = Array.from(new Set(items.map((x: any) => normalizeUuid(x?.id)).filter(Boolean)));
  if (!itemIds.length) {
    return NextResponse.json({ ok: false, error: "Invalid item ids" }, { status: 400 });
  }

  const { data: srcF, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, order_id, status")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr || !srcF) {
    return NextResponse.json({ ok: false, error: fErr?.message || "Fulfillment not found" }, { status: 404 });
  }

  const status = String((srcF as any).status || "").toUpperCase();
  if (status !== "OPEN") {
    return NextResponse.json({ ok: false, error: "Fulfillment must be OPEN to split quantities" }, { status: 400 });
  }

  const { data: dstF, error: dErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, order_id, status, fulfillment_source")
    .eq("id", toFulfillmentId)
    .maybeSingle();

  if (dErr || !dstF) {
    return NextResponse.json({ ok: false, error: dErr?.message || "Destination fulfillment not found" }, { status: 404 });
  }

  if (String((dstF as any).order_id) !== String((srcF as any).order_id)) {
    return NextResponse.json({ ok: false, error: "Destination fulfillment belongs to another order" }, { status: 400 });
  }

  const dstSource = String((dstF as any).fulfillment_source || "").toUpperCase();
  if (dstSource !== "DROPSHIP") {
    return NextResponse.json({ ok: false, error: "Destination must be a DROPSHIP fulfillment" }, { status: 400 });
  }

  const { data: rows, error: iErr } = await supabaseAdmin
    .from("fulfillment_items")
    .select("id, fulfillment_id, variant_id, description, required_qty, picked_qty, uom, sort_order")
    .eq("fulfillment_id", fulfillmentId)
    .in("id", itemIds as any);

  if (iErr || !rows) {
    return NextResponse.json({ ok: false, error: iErr?.message || "Failed to load items" }, { status: 500 });
  }

  const byId = new Map<string, any>();
  for (const r of rows as any[]) byId.set(String(r.id), r);

  for (const it of items) {
    const id = normalizeUuid(it?.id);
    const qty = safeQty(it?.qty);
    if (!id || qty <= 0) continue;
    const row = byId.get(id);
    if (!row) continue;
    const reqQty = safeQty(row.required_qty);
    const pickedQty = safeQty(row.picked_qty);
    const remaining = Math.max(0, reqQty - pickedQty);
    if (qty > remaining) {
      return NextResponse.json({ ok: false, error: "Dropship qty exceeds remaining qty" }, { status: 400 });
    }
  }

  for (const it of items) {
    const id = normalizeUuid(it?.id);
    const qty = safeQty(it?.qty);
    if (!id || qty <= 0) continue;
    const row = byId.get(id);
    if (!row) continue;

    const { data: existing } = await supabaseAdmin
      .from("fulfillment_items")
      .select("id, required_qty")
      .eq("fulfillment_id", toFulfillmentId)
      .eq("variant_id", row.variant_id)
      .maybeSingle();

    if (existing?.id) {
      const nextQty = safeQty(existing.required_qty) + qty;
      await supabaseAdmin.from("fulfillment_items").update({ required_qty: nextQty }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("fulfillment_items").insert({
        fulfillment_id: toFulfillmentId,
        variant_id: row.variant_id,
        description: row.description,
        required_qty: qty,
        picked_qty: 0,
        uom: row.uom,
        sort_order: row.sort_order,
      });
    }
  }

  return NextResponse.json({ ok: true, to_fulfillment_id: toFulfillmentId });
}
