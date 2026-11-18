// src/app/api/admin/fulfillments/[fulfillmentId]/unpick/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { orderIsDemo } from "@/lib/accounts/demoAccount";

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

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

async function updateLotQtyOptimistic(sb: any, lotRowId: string, variantId: string, delta: number) {
  const { data: lot, error: lotErr } = await sb
    .from("product_variant_lots")
    .select("id, variant_id, qty")
    .eq("id", lotRowId)
    .maybeSingle();

  if (lotErr) throw new Error(lotErr.message);
  if (!lot?.id) throw new Error("Lot row not found");
  if (String(lot.variant_id) !== variantId) throw new Error("Lot does not belong to this variant");

  const cur = safeNum(lot.qty);
  const next = cur + delta;

  const { data: upd, error: updErr } = await sb
    .from("product_variant_lots")
    .update({ qty: next })
    .eq("id", lotRowId)
    .eq("qty", cur)
    .select("id")
    .maybeSingle();

  if (updErr) throw new Error(updErr.message);
  if (!upd?.id) throw new Error("Lot qty update conflict (row changed). Try again.");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { fulfillmentId: rawId } = await Promise.resolve(params as any);
  const fulfillmentId = norm(rawId);

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const actorUserId = String(ctx?.user?.id ?? "");
  if (!UUID_RE.test(actorUserId)) {
    return NextResponse.json({ ok: false, error: "Missing actor user" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const fulfillmentItemId = norm(body?.fulfillment_item_id);
  const lotRowId = body?.lot_row_id ? norm(body.lot_row_id) : null;
  const qtyRaw = safeNum(body?.qty);
  const qty = Math.max(1, Math.floor(qtyRaw || 1));

  if (!UUID_RE.test(fulfillmentItemId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillment_item_id" }, { status: 400 });
  }

  if (lotRowId && !UUID_RE.test(lotRowId)) {
    return NextResponse.json({ ok: false, error: "Invalid lot_row_id" }, { status: 400 });
  }

  // Load fulfillment (need order_id + invoice_id for movement/audit)
  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id, invoice_id, status")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });
  if (safeUpper(f.status) !== "OPEN") {
    return NextResponse.json({ ok: false, error: "Fulfillment is not OPEN" }, { status: 400 });
  }

  const isDemoOrder = await orderIsDemo(String(f.order_id));

  // Load fulfillment item
  const { data: fi, error: fiErr } = await sb
    .from("fulfillment_items")
    .select("id, variant_id, picked_qty, description, uom")
    .eq("id", fulfillmentItemId)
    .eq("fulfillment_id", fulfillmentId)
    .maybeSingle();

  if (fiErr) return NextResponse.json({ ok: false, error: fiErr.message }, { status: 500 });
  if (!fi) return NextResponse.json({ ok: false, error: "Fulfillment line not found" }, { status: 404 });

  const variantId = String(fi.variant_id);
  const priorPicked = safeNum(fi.picked_qty);

  if (qty > priorPicked) {
    return NextResponse.json({ ok: false, error: `Cannot unpick ${qty}. Only ${priorPicked} picked.` }, { status: 400 });
  }

  const nextPicked = priorPicked - qty;
  const nowIso = new Date().toISOString();
  let priorOnHand = 0;
  let nextOnHand = 0;

  if (!isDemoOrder) {
  // Read on-hand
  const { data: invRow, error: invErr } = await sb
    .from("variant_inventory")
    .select("variant_id, on_hand")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  priorOnHand = safeNum(invRow?.on_hand);
  nextOnHand = priorOnHand + qty;

  // 1) Restore lot qty if provided (with optimistic guard)
  if (lotRowId) {
    try {
      await updateLotQtyOptimistic(sb, lotRowId, variantId, qty);
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message ? String(e.message) : "Lot restore failed" }, { status: 409 });
    }
  }
  }

  // 2) Update fulfillment line picked qty (optimistic guard)
  {
    const { data: updFi, error: updFiErr } = await sb
      .from("fulfillment_items")
      .update({ picked_qty: nextPicked })
      .eq("id", fulfillmentItemId)
      .eq("fulfillment_id", fulfillmentId)
      .eq("picked_qty", priorPicked)
      .select("id")
      .maybeSingle();

    if (updFiErr) return NextResponse.json({ ok: false, error: updFiErr.message }, { status: 500 });
    if (!updFi?.id) {
      return NextResponse.json({ ok: false, error: "Picked qty changed (conflict). Refresh and try again." }, { status: 409 });
    }
  }

  if (!isDemoOrder) {
  // 3) Update inventory
  const { error: invUpErr } = await sb
    .from("variant_inventory")
    .upsert({ variant_id: variantId, on_hand: nextOnHand, updated_at: nowIso }, { onConflict: "variant_id" });

  if (invUpErr) return NextResponse.json({ ok: false, error: invUpErr.message }, { status: 500 });

  // Portal truth best-effort
  try {
    await sb
      .from("product_variant_inventory")
      .upsert({ variant_id: variantId, qty_on_hand: nextOnHand, updated_at: nowIso }, { onConflict: "variant_id" });
  } catch {}

  // 4) Inventory movement (must succeed)
  const { error: mvErr } = await sb.from("inventory_movements").insert({
    variant_id: variantId,
    delta: qty,
    resulting_on_hand: nextOnHand,
    reason: "Fulfillment unpick",
    actor_user_id: actorUserId,
    meta: {
      source: "admin_fulfillment_unpick",
      fulfillment_id: fulfillmentId,
      fulfillment_item_id: fulfillmentItemId,
      order_id: f.order_id,
      invoice_id: f.invoice_id,
      lot_row_id: lotRowId ?? undefined,
      prior_picked_qty: priorPicked,
      next_picked_qty: nextPicked,
      prior_qty_on_hand: priorOnHand,
    },
    ip: getClientIp(req),
    user_agent: req.headers.get("user-agent"),
  });

  if (mvErr) {
    return NextResponse.json({ ok: false, error: `Inventory movement insert failed: ${mvErr.message}` }, { status: 500 });
  }
  }

  // 5) ALSO write a fulfillment_picks record so history remains complete.
  // This is not an "undo of a specific pick", but it IS a reversal action.
  const { error: pickInsErr } = await sb.from("fulfillment_picks").insert({
    fulfillment_id: fulfillmentId,
    fulfillment_item_id: fulfillmentItemId,
    order_id: f.order_id,
    invoice_id: f.invoice_id,
    variant_id: variantId,
    qty: qty,
    lot_row_id: lotRowId,
    raw_scan: null,
    note: `UNPICK: ${qty} ${String(fi.uom ?? "").trim() || ""}`.trim(),
    is_undo: true,
    meta: { kind: "unpick", at: nowIso },
    actor_user_id: actorUserId,
  });

  if (pickInsErr) {
    return NextResponse.json({ ok: false, error: `Unpick history insert failed: ${pickInsErr.message}` }, { status: 500 });
  }

  // Optional: audit log best-effort
  try {
    await sb.from("order_audit_log").insert({
      order_id: String(f.order_id),
      actor_user_id: actorUserId,
      action: "FULFILLMENT_UNPICK",
      meta: { fulfillment_id: fulfillmentId, fulfillment_item_id: fulfillmentItemId, qty, variant_id: variantId, lot_row_id: lotRowId, at: nowIso },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {}

  return NextResponse.json({
    ok: true,
    fulfillment_id: fulfillmentId,
    fulfillment_item_id: fulfillmentItemId,
    qty_unpicked: qty,
    prior_picked_qty: priorPicked,
    next_picked_qty: nextPicked,
    prior_on_hand: priorOnHand,
    next_on_hand: nextOnHand,
  });
}
