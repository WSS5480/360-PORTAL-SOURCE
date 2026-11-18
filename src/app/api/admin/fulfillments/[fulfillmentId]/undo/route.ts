import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { orderIsDemo } from "@/lib/accounts/demoAccount";

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

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function safeUpper(v: unknown) {
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
  // Read current qty
  const { data: lr, error: lrErr } = await sb
    .from("product_variant_lots")
    .select("id, variant_id, qty")
    .eq("id", lotRowId)
    .maybeSingle();

  if (lrErr) throw new Error(lrErr.message);
  if (!lr?.id) throw new Error("Lot row not found");
  if (String(lr.variant_id) !== variantId) throw new Error("Lot does not belong to this variant");

  const cur = Number(lr.qty ?? 0) || 0;
  const next = cur + delta;

  const { data: upd, error: updErr } = await sb
    .from("product_variant_lots")
    .update({ qty: next })
    .eq("id", lotRowId)
    .eq("qty", cur) // optimistic guard
    .select("id")
    .maybeSingle();

  if (updErr) throw new Error(updErr.message);
  if (!upd?.id) throw new Error("Lot qty update conflict (row changed). Try again.");
}

async function updateVariantOnHandOptimistic(sb: any, variantId: string, prior: number, next: number, nowIso: string) {
  // Try update with optimistic guard
  const { data: upd, error: updErr } = await sb
    .from("variant_inventory")
    .update({ on_hand: next, updated_at: nowIso })
    .eq("variant_id", variantId)
    .eq("on_hand", prior)
    .select("variant_id")
    .maybeSingle();

  if (updErr) throw new Error(updErr.message);

  // If no row updated (conflict or missing row), fall back to upsert.
  // (Upsert isn't perfectly transactional, but avoids "missing row" failure.)
  if (!upd?.variant_id) {
    const { error: upErr } = await sb
      .from("variant_inventory")
      .upsert({ variant_id: variantId, on_hand: next, updated_at: nowIso }, { onConflict: "variant_id" });

    if (upErr) throw new Error(upErr.message);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const pickId = normalizeParam((body as any)?.pick_id ?? "");

  if (!UUID_RE.test(pickId)) {
    return NextResponse.json({ ok: false, error: "Invalid pick_id" }, { status: 400 });
  }

  const actorUserId = String(ctx?.user?.id ?? "");
  if (!UUID_RE.test(actorUserId)) {
    return NextResponse.json({ ok: false, error: "Missing actor user" }, { status: 401 });
  }

  // Load fulfillment
  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id, invoice_id, status")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });
  if (safeUpper(f.status) !== "OPEN") {
    return NextResponse.json(
      { ok: false, error: "Fulfillment must be OPEN to undo picks. Reopen it first." },
      { status: 400 }
    );
  }

  const isDemoOrder = await orderIsDemo(String(f.order_id));

  // Load pick
  const { data: pick, error: pErr } = await sb
    .from("fulfillment_picks")
    .select("id, fulfillment_item_id, variant_id, qty, lot_row_id, raw_scan, note, is_undo, meta, created_at")
    .eq("id", pickId)
    .eq("fulfillment_id", fulfillmentId)
    .maybeSingle();

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
  if (!pick) return NextResponse.json({ ok: false, error: "Pick not found" }, { status: 404 });
  if (pick.is_undo) return NextResponse.json({ ok: false, error: "This pick is already an undo record." }, { status: 400 });

  const qty = safeNum(pick.qty);
  if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ ok: false, error: "Bad pick qty." }, { status: 400 });

  const fulfillmentItemId = String(pick.fulfillment_item_id);
  const variantId = String(pick.variant_id);
  const lotRowId = pick.lot_row_id ? String(pick.lot_row_id) : null;

  // Prevent double-undo: if an undo pick already exists referencing this pick, reject.
  // (No schema change: we use meta.undo_of_pick_id)
  const { data: existingUndo, error: exErr } = await sb
    .from("fulfillment_picks")
    .select("id")
    .eq("fulfillment_id", fulfillmentId)
    .eq("is_undo", true)
    .contains("meta", { undo_of_pick_id: pickId })
    .limit(1);

  if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
  if ((existingUndo ?? []).length > 0) {
    return NextResponse.json({ ok: false, error: "This pick has already been undone." }, { status: 400 });
  }

  // Load fulfillment item
  const { data: fi, error: fiErr } = await sb
    .from("fulfillment_items")
    .select("id, picked_qty, required_qty, description, uom")
    .eq("id", fulfillmentItemId)
    .eq("fulfillment_id", fulfillmentId)
    .maybeSingle();

  if (fiErr) return NextResponse.json({ ok: false, error: fiErr.message }, { status: 500 });
  if (!fi) return NextResponse.json({ ok: false, error: "Fulfillment line not found" }, { status: 404 });

  const priorPicked = Number(fi.picked_qty ?? 0) || 0;
  if (qty > priorPicked) {
    return NextResponse.json(
      { ok: false, error: `Cannot undo ${qty}. Only ${priorPicked} currently picked on this line.` },
      { status: 400 }
    );
  }
  const nextPicked = Math.max(0, priorPicked - qty);

  const nowIso = new Date().toISOString();
  let priorOnHand = 0;
  let nextOnHand = 0;

  if (!isDemoOrder) {
  // Read on-hand (for messaging + optimistic update)
  const { data: invRow, error: invErr } = await sb
    .from("variant_inventory")
    .select("variant_id, on_hand")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  priorOnHand = Number(invRow?.on_hand ?? 0) || 0;
  nextOnHand = priorOnHand + qty;

  // 1) Restore lot qty (if used) with optimistic guard
  if (lotRowId) {
    try {
      await updateLotQtyOptimistic(sb, lotRowId, variantId, qty);
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message ? String(e.message) : "Lot restore failed" }, { status: 409 });
    }
  }
  }

  // 2) Update fulfillment item picked qty (optimistic guard)
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
  // 3) Update inventory on-hand (optimistic guard + fallback upsert)
  try {
    await updateVariantOnHandOptimistic(sb, variantId, priorOnHand, nextOnHand, nowIso);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ? String(e.message) : "Inventory update failed" }, { status: 500 });
  }

  // 4) Sync portal truth best-effort (non-authoritative)
  try {
    await sb
      .from("product_variant_inventory")
      .upsert({ variant_id: variantId, qty_on_hand: nextOnHand, updated_at: nowIso }, { onConflict: "variant_id" });
  } catch {}

  // 5) Log inventory movement (NOT best-effort — must succeed)
  const { error: mvErr } = await sb.from("inventory_movements").insert({
    variant_id: variantId,
    delta: qty, // add back
    resulting_on_hand: nextOnHand,
    reason: "Fulfillment undo",
    actor_user_id: actorUserId,
    meta: {
      source: "admin_fulfillment_undo",
      fulfillment_id: fulfillmentId,
      fulfillment_item_id: fulfillmentItemId,
      order_id: f.order_id,
      invoice_id: f.invoice_id,
      undo_of_pick_id: pickId,
      lot_row_id: lotRowId ?? undefined,
      prior_qty_on_hand: priorOnHand,
      prior_picked_qty: priorPicked,
      next_picked_qty: nextPicked,
    },
    ip: getClientIp(req),
    user_agent: req.headers.get("user-agent"),
  });

  if (mvErr) {
    // We can't truly roll back without a DB transaction function, so fail loudly.
    return NextResponse.json({ ok: false, error: `Inventory movement insert failed: ${mvErr.message}` }, { status: 500 });
  }
  }

  // 6) Insert undo record into fulfillment_picks (must succeed for history integrity)
  const { error: insErr } = await sb.from("fulfillment_picks").insert({
    fulfillment_id: fulfillmentId,
    fulfillment_item_id: fulfillmentItemId,
    order_id: f.order_id,
    invoice_id: f.invoice_id,
    variant_id: variantId,
    qty: qty,
    lot_row_id: lotRowId,
    raw_scan: pick.raw_scan,
    note: `UNDO: ${pick.note ?? ""}`.trim(),
    is_undo: true,
    meta: { undo_of_pick_id: pickId, original_meta: pick.meta ?? {} },
    actor_user_id: actorUserId,
  });

  if (insErr) {
    return NextResponse.json({ ok: false, error: `Undo history insert failed: ${insErr.message}` }, { status: 500 });
  }

  // Optional: audit log best-effort
  try {
    await sb.from("order_audit_log").insert({
      order_id: String(f.order_id),
      actor_user_id: actorUserId,
      action: "FULFILLMENT_PICK_UNDONE",
      meta: { fulfillment_id: fulfillmentId, pick_id: pickId, qty, variant_id: variantId, lot_row_id: lotRowId, at: nowIso },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {}

  return NextResponse.json({
    ok: true,
    fulfillment_id: fulfillmentId,
    fulfillment_item_id: fulfillmentItemId,
    variant_id: variantId,
    qty_undone: qty,
    prior_on_hand: priorOnHand,
    next_on_hand: nextOnHand,
    prior_picked_qty: priorPicked,
    next_picked_qty: nextPicked,
  });
}
