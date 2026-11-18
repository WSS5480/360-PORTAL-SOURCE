import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canCreateOrders } from "@/lib/portal/portalRoles";
import { isPortalOrderRowViewable } from "@/lib/portal/portalRowScope";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeNumber(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

function clampDiscount(v: unknown): number {
  const n = safeNumber(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n * 100) / 100;
}

function makeErrRedirect(req: Request, orderId: string, msg: string) {
  return NextResponse.redirect(
    urlFromRequest(req, `/portal/orders/${encodeURIComponent(orderId)}/edit?error=${encodeURIComponent(msg)}`)
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  if (!canCreateOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const resolved = await Promise.resolve(params as any);
  const orderId = safeStr(resolved?.orderId);
  if (!UUID_RE.test(orderId)) return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });

  const sb: any = createSupabaseAdminClient();

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, status, created_by_user_id, submitted_by_contact_id")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order || String(order.account_id) !== String(accountId))
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalOrderRowViewable(sb, accountId, portalUserId, ctx.currentRole, order as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const statusUpper = String(order.status ?? "").toUpperCase();
  if (statusUpper !== "DRAFT")
    return NextResponse.json({ ok: false, error: "Only Draft orders can be edited." }, { status: 400 });

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/x-www-form-urlencoded") && !ct.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "Expected form submit" }, { status: 415 });
  }

  const form = await req.formData();

  // Shipping changes
  const shipping_amount = Math.max(0, safeNumber(form.get("shipping_amount")));
  const shipping_priority = (safeStr(form.get("shipping_priority")) || "GROUND").toUpperCase();

  // Parse product qtys
  const items: Array<{ product_variant_id: string; quantity: number }> = [];
  for (const [key, val] of form.entries()) {
    if (!key.startsWith("qty__")) continue;
    const vid = key.slice("qty__".length);
    if (!UUID_RE.test(vid)) continue;
    const qty = Math.floor(Math.max(0, safeNumber(val)));
    if (qty > 0) items.push({ product_variant_id: vid, quantity: qty });
  }

  if (items.length === 0) {
    return makeErrRedirect(req, orderId, "Select at least one item quantity.");
  }

  // ✅ SOURCE OF TRUTH: account discount
  const { data: acct, error: acctErr } = await sb
    .from("accounts")
    .select("discount_percent")
    .eq("id", accountId)
    .maybeSingle();

  if (acctErr) return makeErrRedirect(req, orderId, acctErr.message);

  const discountPercent = clampDiscount(acct?.discount_percent ?? 0);

  // Sync snapshot while DRAFT (so UI + downstream logic stays consistent)
  const { error: snapUpdErr } = await sb
    .from("orders")
    .update({ discount_percent_snapshot: discountPercent, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (snapUpdErr) return makeErrRedirect(req, orderId, snapUpdErr.message);

  // Load variants for price calculation
  const variantIds = items.map((i) => i.product_variant_id);
  const { data: variants, error: varErr } = await sb
    .from("product_variants")
    .select("id, sku, size_label, base_unit_price")
    .in("id", variantIds);

  if (varErr) return makeErrRedirect(req, orderId, varErr.message);

  const byId = new Map<string, any>((variants ?? []).map((v: any) => [String(v.id), v]));
  for (const it of items) {
    if (!byId.has(it.product_variant_id))
      return makeErrRedirect(req, orderId, `Unknown variant: ${it.product_variant_id}`);
  }

  // 1) Delete existing PRODUCT + SHIPPING lines
  const { error: delErr } = await sb
    .from("order_items")
    .delete()
    .eq("order_id", orderId)
    .in("line_type", ["PRODUCT", "SHIPPING"]);

  if (delErr) return makeErrRedirect(req, orderId, delErr.message);

  // 2) Insert new PRODUCT lines
  const productLines = items.map((it, idx) => {
    const v = byId.get(it.product_variant_id);
    const base = Number(v.base_unit_price ?? 0) || 0;
    const discountedUnit = base * (1 - discountPercent / 100);
    const lineTotal = discountedUnit * it.quantity;

    const descParts = [v.sku].filter(Boolean);
    if (v.size_label) descParts.push(String(v.size_label));
    const description = descParts.join(" ") || "Product";

    return {
      order_id: orderId,
      sort_order: idx,
      product_variant_id: v.id,
      description,
      quantity: it.quantity,
      uom: "Units",
      unit_price: base,
      discount_percent: discountPercent,
      line_total: lineTotal,
      line_type: "PRODUCT",
    };
  });

  const { error: insProdErr } = await sb.from("order_items").insert(productLines);
  if (insProdErr) return makeErrRedirect(req, orderId, insProdErr.message);

  // 3) Insert SHIPPING line if amount > 0
  if (shipping_amount > 0) {
    const { error: insShipErr } = await sb.from("order_items").insert({
      order_id: orderId,
      sort_order: productLines.length,
      product_variant_id: null,
      description: "Shipping",
      quantity: 1,
      uom: "Units",
      unit_price: shipping_amount,
      discount_percent: 0,
      line_total: shipping_amount,
      line_type: "SHIPPING",
    });
    if (insShipErr) return makeErrRedirect(req, orderId, insShipErr.message);
  }

  // 4) Recompute totals and update order + shipping_priority
  const subtotal = productLines.reduce((s, r) => s + (Number(r.line_total) || 0), 0);
  const shippingTotal = shipping_amount > 0 ? shipping_amount : 0;
  const total = subtotal + shippingTotal;

  const { error: updErr } = await sb
    .from("orders")
    .update({
      subtotal,
      shipping_total: shippingTotal,
      total,
      shipping_priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updErr) return makeErrRedirect(req, orderId, updErr.message);

  return NextResponse.redirect(urlFromRequest(req, `/portal/orders/${encodeURIComponent(orderId)}`));
}
