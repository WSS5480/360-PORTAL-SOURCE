// src/app/api/admin/orders/[orderId]/lock/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { accountIsDemo } from "@/lib/accounts/demoAccount";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  // Load order (include account_id + order_number for audit)
  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, order_number, status, locked_at")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const isDemoAccount = await accountIsDemo(order.account_id);

  const statusUpper = safeStr(order.status).toUpperCase();

  // Idempotent: already locked -> just go back
  if (statusUpper === "LOCKED") {
    const back = urlFromRequest(req, `/admin/orders/${encodeURIComponent(orderId)}`);
    return NextResponse.redirect(back);
  }

  if (statusUpper !== "CONFIRMED") {
    return NextResponse.json(
      { ok: false, error: `Only CONFIRMED orders can be locked (current: ${order.status}).` },
      { status: 400 }
    );
  }

  // Load product lines (exclude shipping/non-product)
  const { data: items, error: itemErr } = await sb
    .from("order_items")
    .select("id, product_variant_id, quantity, line_type, description")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  if (itemErr) return NextResponse.json({ ok: false, error: itemErr.message }, { status: 500 });

  const productLines = (items ?? []).filter((it: any) => {
    const lt = safeStr(it.line_type).toUpperCase();
    const vid = safeStr(it.product_variant_id);
    return lt === "PRODUCT" && !!vid && UUID_RE.test(vid);
  });

  if (productLines.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No product line items found to lock. (Nothing to commit to inventory.)" },
      { status: 400 }
    );
  }

  // Aggregate required qty per variant
  const needByVariant = new Map<string, number>();
  for (const it of productLines as any[]) {
    const vid = safeStr(it.product_variant_id);
    const qty = safeNum(it.quantity);
    if (!vid || !UUID_RE.test(vid) || qty <= 0) continue;
    needByVariant.set(vid, (needByVariant.get(vid) ?? 0) + qty);
  }

  const variantIds = Array.from(needByVariant.keys());
  if (variantIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid product variants found on order items." },
      { status: 400 }
    );
  }

  // Load inventory snapshot (skipped for demo accounts)
  const actorUserId = safeStr((ctx as any)?.user?.id) || null;
  const now = new Date().toISOString();

  if (!isDemoAccount) {
  const { data: invRows, error: invErr } = await sb
    .from("product_variant_inventory")
    .select("variant_id, qty_on_hand")
    .in("variant_id", variantIds);

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const onHandByVariant = new Map<string, number>();
  for (const r of invRows ?? []) {
    onHandByVariant.set(safeStr((r as any).variant_id), safeNum((r as any).qty_on_hand));
  }

  // Validate sufficiency
  const insuff: Array<{ variant_id: string; required: number; on_hand: number }> = [];
  for (const [vid, required] of needByVariant.entries()) {
    const onHand = onHandByVariant.get(vid) ?? 0;
    if (onHand < required) insuff.push({ variant_id: vid, required, on_hand: onHand });
  }

  if (insuff.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient stock to lock this order.",
        details: insuff,
      },
      { status: 400 }
    );
  }

  // Decrement inventory (best-effort atomic per row: only update when qty_on_hand >= needed)
  // NOTE: Without a DB transaction/RPC, this is still susceptible to race across variants,
  // but the conditional update prevents negative inventory on each variant row.
  for (const [vid, required] of needByVariant.entries()) {
    const { error: decErr, data: decData } = await sb
      .from("product_variant_inventory")
      .update({ qty_on_hand: (onHandByVariant.get(vid) ?? 0) - required })
      .eq("variant_id", vid)
      .gte("qty_on_hand", required)
      .select("variant_id");

    // If update didn't affect a row, someone else took stock between our read and write.
    const affected = Array.isArray(decData) ? decData.length : decData ? 1 : 0;

    if (decErr || affected === 0) {
      // We cannot reliably roll back earlier decrements without a transaction/RPC.
      // Fail fast with a clear message so ops knows to re-check stock and adjust.
      const msg = decErr?.message || "Concurrent stock change detected. Please refresh and try again.";
      return NextResponse.json({ ok: false, error: msg }, { status: 409 });
    }
  }
  }

  // Update order status
  const { error: updErr } = await sb
    .from("orders")
    .update({
      status: "LOCKED",
      locked_at: order.locked_at ?? now,
    })
    .eq("id", orderId);

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  // Status history (best-effort)
  try {
    await sb.from("order_status_events").insert({
      order_id: orderId,
      from_status: "CONFIRMED",
      to_status: "LOCKED",
      changed_by_user_id: actorUserId,
      comment: isDemoAccount ? "Locked by internal staff (demo account — inventory not committed)" : "Locked by internal staff (inventory committed)",
    });
  } catch {
    // ignore
  }

  // Audit (best-effort; aligns with your other routes)
  try {
    await sb.from("audit_events").insert({
      account_id: order.account_id,
      actor_user_id: actorUserId,
      action: "ORDER_LOCKED",
      resource_type: "order",
      resource_id: orderId,
      metadata: {
        order_number: order.order_number,
        from_status: "CONFIRMED",
        to_status: "LOCKED",
        ip: getClientIp(req),
        user_agent: req.headers.get("user-agent"),
        inventory_committed: !isDemoAccount,
        demo_account: isDemoAccount,
        variants: Array.from(needByVariant.entries()).map(([variant_id, quantity]) => ({
          variant_id,
          quantity,
        })),
      },
    });
  } catch {
    // ignore
  }

  // Redirect back to admin order detail (nice UX for form post)
  const back = urlFromRequest(req, `/admin/orders/${encodeURIComponent(orderId)}`);
  return NextResponse.redirect(back);
}
