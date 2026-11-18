// src/app/api/admin/orders/[orderId]/lock-and-fulfill/route.ts
// Lock order + create fulfillment in one request, return redirect for fast client-side nav
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { accountIsDemo } from "@/lib/accounts/demoAccount";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { shipNowQtyForLine } from "@/lib/virtualWarehouse/shipNowQty";

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

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  // Load order and items in parallel (both needed for lock and/or fulfillment)
  const [orderRes, itemsResLock] = await Promise.all([
    sb.from("orders").select("id, account_id, order_number, status, locked_at").eq("id", orderId).maybeSingle(),
    sb
      .from("order_items")
      .select("id, product_variant_id, quantity, virtual_warehouse_qty, line_type, description, uom, sort_order")
      .eq("order_id", orderId)
      .order("sort_order", { ascending: true }),
  ]);

  const order = orderRes.data;
  if (orderRes.error) return NextResponse.json({ ok: false, error: orderRes.error.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const isDemoAccount = await accountIsDemo(order.account_id);

  const statusUpper = safeStr(order.status).toUpperCase();

  const skipLock =
    statusUpper === "LOCKED" ||
    statusUpper === "PAID" ||
    statusUpper === "PARTIALLY_PAID" ||
    statusUpper === "NEEDS_INVOICE" ||
    statusUpper === "INVOICED" ||
    statusUpper === "PENDING_WIRE" ||
    statusUpper === "FULFILLING";

  if (skipLock) {
    const { data: existing } = await sb
      .from("fulfillments")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "OPEN")
      .eq("fulfillment_source", "INVENTORY")
      .maybeSingle();
    if (existing?.id) {
      return NextResponse.json({
        ok: true,
        redirect: `/admin/fulfillments/${encodeURIComponent(String(existing.id))}`,
      });
    }
  } else if (statusUpper !== "CONFIRMED") {
    return NextResponse.json(
      { ok: false, error: `Only CONFIRMED orders can be locked (current: ${order.status}).` },
      { status: 400 }
    );
  }

  // --- LOCK PHASE (only if CONFIRMED) ---
  if (statusUpper === "CONFIRMED") {
    if (itemsResLock.error) return NextResponse.json({ ok: false, error: itemsResLock.error.message }, { status: 500 });
    const productLines = (itemsResLock.data ?? []).filter((it: any) => {
      const lt = safeStr(it.line_type).toUpperCase();
      const vid = safeStr(it.product_variant_id);
      return lt === "PRODUCT" && !!vid && UUID_RE.test(vid);
    });

    if (productLines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No product line items found to lock." },
        { status: 400 }
      );
    }

    const needByVariant = new Map<string, number>();
    for (const it of productLines as any[]) {
      const vid = safeStr(it.product_variant_id);
      const qty = shipNowQtyForLine(it);
      if (!vid || !UUID_RE.test(vid) || qty <= 0) continue;
      needByVariant.set(vid, (needByVariant.get(vid) ?? 0) + qty);
    }

    const variantIds = Array.from(needByVariant.keys());
    const hasShipNowInventory = variantIds.length > 0;
    const commitInventory = hasShipNowInventory && !isDemoAccount;
    const actorUserId = safeStr(ctx?.user?.id) || null;
    const now = new Date().toISOString();

    if (commitInventory) {
    const { data: invRows, error: invErr } = await sb
      .from("product_variant_inventory")
      .select("variant_id, qty_on_hand")
      .in("variant_id", variantIds);

    if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

    const onHandByVariant = new Map<string, number>();
    for (const r of invRows ?? []) {
      onHandByVariant.set(safeStr((r as any).variant_id), safeNum((r as any).qty_on_hand));
    }

    const insuff: Array<{ variant_id: string; required: number; on_hand: number }> = [];
    for (const [vid, required] of needByVariant.entries()) {
      const onHand = onHandByVariant.get(vid) ?? 0;
      if (onHand < required) insuff.push({ variant_id: vid, required, on_hand: onHand });
    }

    if (insuff.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Insufficient stock to lock this order.", details: insuff },
        { status: 400 }
      );
    }

    for (const [vid, required] of needByVariant.entries()) {
      const { error: decErr, data: decData } = await sb
        .from("product_variant_inventory")
        .update({ qty_on_hand: (onHandByVariant.get(vid) ?? 0) - required })
        .eq("variant_id", vid)
        .gte("qty_on_hand", required)
        .select("variant_id");

      const affected = Array.isArray(decData) ? decData.length : decData ? 1 : 0;
      if (decErr || affected === 0) {
        const msg =
          decErr?.message || "Concurrent stock change detected. Please refresh and try again.";
        return NextResponse.json({ ok: false, error: msg }, { status: 409 });
      }
    }
    }

    if (hasShipNowInventory) {
    const { error: updErr } = await sb
      .from("orders")
      .update({ status: "LOCKED", locked_at: order.locked_at ?? now })
      .eq("id", orderId);

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

    try {
      await sb.from("order_status_events").insert({
        order_id: orderId,
        from_status: "CONFIRMED",
        to_status: "LOCKED",
        changed_by_user_id: actorUserId,
        comment: isDemoAccount
          ? "Locked by internal staff (demo account — inventory not committed)"
          : "Locked by internal staff (inventory committed)",
      });
    } catch {}

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
          inventory_committed: commitInventory,
          demo_account: isDemoAccount,
          variants: Array.from(needByVariant.entries()).map(([variant_id, quantity]) => ({
            variant_id,
            quantity,
          })),
        },
      });
    } catch {}
    }
  }

  // --- FULFILLMENT PHASE (reuse items from lock, parallelize fulfillment + invoice) ---
  const [existingRes, invoiceRes] = await Promise.all([
    sb
      .from("fulfillments")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "OPEN")
      .eq("fulfillment_source", "INVENTORY")
      .maybeSingle(),
    sb.from("invoices").select("id").eq("order_id", orderId).eq("invoice_kind", INVOICE_KIND_PRIMARY).maybeSingle(),
  ]);

  const existing = existingRes.data;
  if (existing?.id) {
    return NextResponse.json({
      ok: true,
      redirect: `/admin/fulfillments/${encodeURIComponent(String(existing.id))}`,
    });
  }

  if (itemsResLock.error) return NextResponse.json({ ok: false, error: itemsResLock.error.message }, { status: 500 });
  const all = Array.isArray(itemsResLock.data) ? itemsResLock.data : [];
  const productLines = all.filter((r: any) => safeUpper(r.line_type) === "PRODUCT");

  if (productLines.length === 0) {
    return NextResponse.json({ ok: false, error: "No PRODUCT lines to fulfill." }, { status: 400 });
  }

  const remainingLines = productLines
    .map((it: any) => ({
      order_item_id: String(it.id),
      variant_id: String(it.product_variant_id),
      description: String(it.description ?? ""),
      required_qty: shipNowQtyForLine(it),
      uom: String(it.uom ?? "Units"),
      sort_order: Number(it.sort_order ?? 0) || 0,
    }))
    .filter((x: { required_qty: number }) => x.required_qty > 0);

  if (remainingLines.length === 0) {
    const actorUserIdSkip = ctx?.user?.id ?? null;
    try {
      await sb.from("order_audit_log").insert({
        order_id: orderId,
        actor_user_id: String(actorUserIdSkip ?? ""),
        action: "INVENTORY_FULFILLMENT_SKIPPED_NO_SHIP_NOW",
        meta: { reason: "all_quantity_virtual_warehouse" },
        ip: getClientIp(req),
        user_agent: req.headers.get("user-agent"),
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "No inventory fulfillment needed — all product quantity is allocated to virtual warehouse.",
      redirect: `/admin/orders/${encodeURIComponent(orderId)}?skipped_fulfillment=1`,
    });
  }

  const actorUserId = ctx?.user?.id ?? null;
  const invoiceId = invoiceRes.data?.id ? String(invoiceRes.data.id) : null;

  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .insert({
      order_id: orderId,
      invoice_id: invoiceId,
      status: "OPEN",
      fulfillment_source: "INVENTORY",
      created_by_user_id: actorUserId,
      metadata: { shipment: { stage: "PICKING" } },
    })
    .select("id")
    .single();

  if (fErr) {
    const msg = String(fErr.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      const { data: ex2 } = await sb
        .from("fulfillments")
        .select("id")
        .eq("order_id", orderId)
        .eq("status", "OPEN")
        .eq("fulfillment_source", "INVENTORY")
        .maybeSingle();
      if (ex2?.id) {
        return NextResponse.json({
          ok: true,
          redirect: `/admin/fulfillments/${encodeURIComponent(String(ex2.id))}`,
        });
      }
    }
    return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  }

  const fulfillmentId = String(f.id);

  const payload = remainingLines.map((it: any) => ({
    fulfillment_id: fulfillmentId,
    order_item_id: it.order_item_id,
    variant_id: it.variant_id,
    description: it.description,
    required_qty: it.required_qty,
    picked_qty: 0,
    uom: it.uom,
    sort_order: it.sort_order,
  }));

  const { error: fiErr } = await sb.from("fulfillment_items").insert(payload);

  if (fiErr) {
    try {
      await sb.from("fulfillment_items").delete().eq("fulfillment_id", fulfillmentId);
      await sb.from("fulfillments").delete().eq("id", fulfillmentId);
    } catch {}
    return NextResponse.json({ ok: false, error: fiErr.message }, { status: 500 });
  }

  try {
    await sb.from("orders").update({ status: "FULFILLING" }).eq("id", orderId);
  } catch {}

  try {
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: String(actorUserId ?? ""),
      action: "FULFILLMENT_STARTED",
      meta: { fulfillment_id: fulfillmentId, invoice_id: invoiceId, source: "INVENTORY" },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {}

  return NextResponse.json({
    ok: true,
    redirect: `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}`,
  });
}
