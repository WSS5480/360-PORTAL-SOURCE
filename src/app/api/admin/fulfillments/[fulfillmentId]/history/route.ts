// src/app/api/admin/fulfillments/[fulfillmentId]/history/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function norm(v: any) {
  try {
    return decodeURIComponent(String(v ?? "")).trim();
  } catch {
    return String(v ?? "").trim();
  }
}

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { fulfillmentId: rawId } = await Promise.resolve(params as any);
  const fulfillmentId = norm(rawId);

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const fulfillmentItemId = norm(url.searchParams.get("fulfillmentItemId"));
  const limitRaw = norm(url.searchParams.get("limit"));
  const limit = Math.max(1, Math.min(500, Number(limitRaw || "120") || 120));

  if (fulfillmentItemId && !UUID_RE.test(fulfillmentItemId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentItemId" }, { status: 400 });
  }

  // We log picks/unpicks into inventory_movements.meta.source
  // source: admin_fulfillment_pick | admin_fulfillment_unpick
  // and meta.fulfillment_id + meta.fulfillment_item_id
  let q = sb
    .from("inventory_movements")
    .select("id, variant_id, delta, resulting_on_hand, reason, actor_user_id, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter by fulfillmentId in JSON meta
  q = q.eq("meta->>fulfillment_id", fulfillmentId);

  if (fulfillmentItemId) {
    q = q.eq("meta->>fulfillment_item_id", fulfillmentItemId);
  }

  const { data, error } = await q;

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r: any) => {
    const src = safeUpper(r?.meta?.source);
    return {
      id: String(r.id),
      created_at: r.created_at,
      actor_user_id: r.actor_user_id ? String(r.actor_user_id) : null,
      variant_id: String(r.variant_id),
      delta: Number(r.delta ?? 0),
      resulting_on_hand: Number(r.resulting_on_hand ?? 0),
      reason: r.reason ?? null,
      source: src || null,
      // helpful bits we store in meta during pick/unpick
      fulfillment_item_id: r?.meta?.fulfillment_item_id ?? null,
      lot_row_id: r?.meta?.lot_row_id ?? r?.meta?.used_lot_row_id ?? null,
      lot_number: r?.meta?.lot_number ?? null,
      serial_number: r?.meta?.serial_number ?? null,
      expiration_date: r?.meta?.expiration_date ?? null,
      raw_scan: r?.meta?.raw_scan ?? null,
      note: r?.meta?.note ?? null,
      over_pick: !!r?.meta?.over_pick,
      prior_picked_qty: r?.meta?.prior_picked_qty ?? null,
      next_picked_qty: r?.meta?.next_picked_qty ?? null,
      required_qty: r?.meta?.required_qty ?? null,
    };
  });

  return NextResponse.json({ ok: true, history: rows });
}
