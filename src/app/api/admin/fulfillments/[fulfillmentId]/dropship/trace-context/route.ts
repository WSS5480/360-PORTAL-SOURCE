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

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

// Handles params being either an object OR a Promise
async function getFulfillmentId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const resolved = typeof p?.then === "function" ? await p : p;
  return normId(resolved?.fulfillmentId);
}

export async function GET(_req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentId(ctx);
  if (!fulfillmentId) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const url = new URL(_req.url);
  const orderIdParam = normId(url.searchParams.get("orderId"));

  // Items for this fulfillment (what your UI renders)
  const { data: items, error: iErr } = await supabaseAdmin
    .from("fulfillment_items")
    .select("id, variant_id, description, required_qty, uom, sort_order")
    .eq("fulfillment_id", fulfillmentId)
    .order("sort_order", { ascending: true });

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

  let effectiveFulfillmentId = fulfillmentId;
  let effectiveItems = items ?? [];

  if (effectiveItems.length === 0 && orderIdParam) {
    const { data: dropshipFulfillments } = await supabaseAdmin
      .from("fulfillments")
      .select("id, created_at")
      .eq("order_id", orderIdParam)
      .eq("fulfillment_source", "DROPSHIP")
      .order("created_at", { ascending: false })
      .limit(50);

    const ids = (dropshipFulfillments ?? []).map((f: any) => String(f.id)).filter(Boolean);
    if (ids.length) {
      const { data: altItems } = await supabaseAdmin
        .from("fulfillment_items")
        .select("id, fulfillment_id, variant_id, description, required_qty, uom, sort_order")
        .in("fulfillment_id", ids as any)
        .order("sort_order", { ascending: true });

      const itemsByFulfillment = new Map<string, any[]>();
      for (const it of altItems ?? []) {
        const fid = String((it as any).fulfillment_id || "");
        if (!fid) continue;
        const list = itemsByFulfillment.get(fid) || [];
        list.push(it);
        itemsByFulfillment.set(fid, list);
      }

      for (const f of dropshipFulfillments ?? []) {
        const fid = String((f as any).id || "");
        const list = itemsByFulfillment.get(fid);
        if (list && list.length) {
          effectiveFulfillmentId = fid;
          effectiveItems = list;
          break;
        }
      }
    }
  }

  // Existing traces (what your UI shows in history + totals)
  const { data: traces, error: tErr } = await supabaseAdmin
    .from("fulfillment_item_trace")
    .select("id, fulfillment_item_id, variant_id, lot_number, serial_number, expiration_date, qty, created_at")
    .eq("fulfillment_id", effectiveFulfillmentId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    fulfillment_id: effectiveFulfillmentId,
    items: (effectiveItems ?? []).map((r: any) => ({
      id: String(r.id),
      variant_id: String(r.variant_id),
      description: safeStr(r.description || "Item"),
      required_qty: safeNum(r.required_qty),
      uom: safeStr(r.uom || "Units"),
    })),
    traces: (traces ?? []).map((t: any) => ({
      id: String(t.id),
      fulfillment_item_id: String(t.fulfillment_item_id),
      variant_id: String(t.variant_id),
      lot_number: t.lot_number ? String(t.lot_number) : null,
      serial_number: t.serial_number ? String(t.serial_number) : null,
      expiration_date: t.expiration_date ? String(t.expiration_date) : null,
      qty: safeNum(t.qty),
      created_at: String(t.created_at || ""),
    })),
  });
}
