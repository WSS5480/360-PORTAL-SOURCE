import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { canCreateOrders } from "@/lib/portal/portalRoles";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
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

/**
 * Backwards compatible:
 * - Old clients may send shipping_amount -> accepted but ignored.
 * - Items must still have >=1 product line.
 */
const UpdateSchema = z.object({
  shipping_amount: z.union([z.number(), z.string()]).optional(), // accepted but ignored
  items: z
    .array(
      z.object({
        product_variant_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });
  }
  if (!canCreateOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const resolved = await Promise.resolve(params as any);
  const orderId = safeStr(resolved?.orderId);
  if (!orderId || !UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();
  const actorUserId = (ctx.user as any)?.id ?? null;

  // Load order + verify ownership + DRAFT
  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, status, created_by_user_id, submitted_by_contact_id")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  if (String(order.account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalOrderRowViewable(sb, accountId, portalUserId, ctx.currentRole, order as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const statusUpper = String(order.status || "").toUpperCase();
  if (statusUpper !== "DRAFT") {
    return NextResponse.json({ ok: false, error: "Only DRAFT orders can be edited." }, { status: 409 });
  }

  // ✅ Portal source-of-truth discount: accounts.discount_percent
  const { data: acct, error: acctErr } = await sb
    .from("accounts")
    .select("id, discount_percent")
    .eq("id", accountId)
    .maybeSingle();

  if (acctErr) return NextResponse.json({ ok: false, error: acctErr.message }, { status: 500 });

  const accountDiscountPercent = clampDiscount(acct?.discount_percent ?? 0);

  // Load variants for pricing + description
  const variantIds = parsed.data.items.map((i) => i.product_variant_id);
  const { data: variants, error: varErr } = await sb
    .from("product_variants")
    .select("id, sku, size_label, base_unit_price")
    .in("id", variantIds);

  if (varErr) return NextResponse.json({ ok: false, error: varErr.message }, { status: 500 });

  const byId = new Map<string, any>((variants ?? []).map((v: any) => [String(v.id), v]));
  for (const it of parsed.data.items) {
    if (!byId.has(it.product_variant_id)) {
      return NextResponse.json(
        { ok: false, error: `Unknown product_variant_id: ${it.product_variant_id}` },
        { status: 400 }
      );
    }
  }

  // Build PRODUCT-only rows (NO SHIPPING in portal; shipping is TBD/admin-entered later)
  const productRows: any[] = [];

  parsed.data.items.forEach((it, idx) => {
    const v = byId.get(it.product_variant_id);
    const base = Number(v.base_unit_price ?? 0) || 0;
    const qty = Number(it.quantity) || 0;

    const discountedUnit = base * (1 - accountDiscountPercent / 100);
    const lineTotal = discountedUnit * qty;

    const descParts = [v.sku].filter(Boolean);
    if (v.size_label) descParts.push(String(v.size_label));
    const description = descParts.length ? descParts.join(" ") : "Product";

    productRows.push({
      sort_order: idx,
      product_variant_id: v.id,
      description,
      quantity: qty,
      uom: "Units",
      unit_price: base,
      discount_percent: accountDiscountPercent,
      line_total: lineTotal,
      line_type: "PRODUCT",
    });
  });

  // Totals: PRODUCT only
  const subtotal = productRows.reduce((sum, r) => sum + (Number(r.line_total) || 0), 0);

  // Shipping is portal-TBD, so always 0 here.
  const shippingTotal = 0;
  const total = subtotal;

  // Rewrite items safely (delete then insert)
  const { error: delErr } = await sb.from("order_items").delete().eq("order_id", orderId);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

  const toInsert = productRows.map((r) => ({ ...r, order_id: orderId }));
  const { error: insErr } = await sb.from("order_items").insert(toInsert);
  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  // ✅ Sync order-level totals and snapshot discount (prevents portal mismatch banner)
  const updatePatch: any = {
    subtotal,
    shipping_total: shippingTotal,
    total,
    discount_percent_snapshot: accountDiscountPercent,
    updated_at: new Date().toISOString(),
  };

  const { error: updErr } = await sb.from("orders").update(updatePatch).eq("id", orderId);
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  // Audit (optional; do not fail)
  try {
    await sb.from("audit_events").insert({
      account_id: accountId,
      actor_user_id: actorUserId,
      action: "ORDER_UPDATED_ITEMS",
      resource_type: "order",
      resource_id: orderId,
      metadata: {
        item_count: parsed.data.items.length,
        discount_percent: accountDiscountPercent,
        subtotal,
        shipping_total: shippingTotal,
        total,
        shipping_portal: "TBD",
      },
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
