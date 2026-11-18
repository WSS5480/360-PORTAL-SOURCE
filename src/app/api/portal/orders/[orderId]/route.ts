// src/app/api/portal/orders/[orderId]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canViewOrders, canCreateOrders } from "@/lib/portal/portalRoles";
import { isPortalOrderRowViewable } from "@/lib/portal/portalRowScope";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const AddressJsonSchema = z
  .object({
    company: z.string().optional().nullable(),
    attn: z.string().optional().nullable(),
    line1: z.string().optional().nullable(),
    line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .passthrough();

const PatchSchema = z.object({
  invoice_address: AddressJsonSchema.nullable().optional(),
  delivery_address: AddressJsonSchema.nullable().optional(),

  // Optional “save to address book” behavior:
  save_billing_to_book: z.boolean().optional(),
  make_default_billing: z.boolean().optional(),
  billing_label: z.string().optional(),

  save_shipping_to_book: z.boolean().optional(),
  make_default_shipping: z.boolean().optional(),
  shipping_label: z.string().optional(),
});

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

async function maybeSaveNewAddress(sb: any, args: {
  accountId: string;
  actorUserId: string | null;
  kind: "BILLING" | "SHIPPING";
  label: string;
  address: any;
  save: boolean;
  makeDefault: boolean;
}) {
  if (!args.save) return;
  if (!args.address) return;

  const label = safeStr(args.label) || (args.kind === "BILLING" ? "Billing" : "Shipping");

  if (args.makeDefault) {
    const { error: clearErr } = await sb
      .from("account_addresses")
      .update({ is_default: false })
      .eq("account_id", args.accountId)
      .eq("kind", args.kind)
      .is("disabled_at", null)
      .eq("is_default", true);

    if (clearErr) throw new Error(clearErr.message);
  }

  const { error: insErr } = await sb.from("account_addresses").insert({
    account_id: args.accountId,
    kind: args.kind,
    label,
    is_default: !!args.makeDefault,
    address: args.address,
    created_by_user_id: args.actorUserId,
  });

  if (insErr) throw new Error(insErr.message);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  if (!canViewOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select(
      "id, account_id, order_number, status, subtotal, shipping_total, total, created_at, placed_at, locked_at, discount_percent_snapshot, payment_terms_label_snapshot, payment_terms_days_snapshot, invoice_address, delivery_address, created_by_user_id, submitted_by_contact_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (String(order.account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalOrderRowViewable(sb, accountId, portalUserId, ctx.currentRole, order as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { data: items, error: itemErr } = await sb
    .from("order_items")
    .select("id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  if (itemErr) return NextResponse.json({ ok: false, error: itemErr.message }, { status: 500 });

  // Best-effort view audit
  try {
    const actorUserId = (ctx.user as any)?.id ?? null;
    await sb.from("audit_events").insert({
      account_id: accountId,
      actor_user_id: actorUserId,
      action: "ORDER_VIEWED",
      resource_type: "order",
      resource_id: orderId,
      metadata: { order_number: order.order_number },
    });
  } catch {}

  return NextResponse.json({ ok: true, order, items: items ?? [] });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  // Updating addresses should be restricted to people who can create/submit
  if (!canCreateOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();
  const actorUserId = (ctx.user as any)?.id ?? null;

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, status, invoice_address, delivery_address, order_number, created_by_user_id, submitted_by_contact_id")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (String(order.account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalOrderRowViewable(sb, accountId, portalUserId, ctx.currentRole, order as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const statusUpper = String(order.status ?? "").toUpperCase();
  if (statusUpper !== "DRAFT") {
    return NextResponse.json(
      { ok: false, error: `Only DRAFT orders can be edited (current: ${order.status}).` },
      { status: 400 }
    );
  }

  const nextInvoice = parsed.data.invoice_address !== undefined ? parsed.data.invoice_address : order.invoice_address;
  const nextDelivery = parsed.data.delivery_address !== undefined ? parsed.data.delivery_address : order.delivery_address;

  // Validate address shapes (passthrough ok)
  if (parsed.data.invoice_address !== undefined) {
    const ok = AddressJsonSchema.safeParse(nextInvoice);
    if (!ok.success) return NextResponse.json({ ok: false, error: "Invalid invoice_address shape." }, { status: 400 });
  }
  if (parsed.data.delivery_address !== undefined) {
    const ok = AddressJsonSchema.safeParse(nextDelivery);
    if (!ok.success) return NextResponse.json({ ok: false, error: "Invalid delivery_address shape." }, { status: 400 });
  }

  const { error: updErr } = await sb
    .from("orders")
    .update({
      invoice_address: nextInvoice ?? null,
      delivery_address: nextDelivery ?? null,
    })
    .eq("id", orderId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  // Optional: save to address book
  try {
    await maybeSaveNewAddress(sb, {
      accountId: String(accountId),
      actorUserId,
      kind: "BILLING",
      label: parsed.data.billing_label ?? "Billing",
      address: parsed.data.invoice_address ?? null,
      save: !!parsed.data.save_billing_to_book,
      makeDefault: !!parsed.data.make_default_billing,
    });

    await maybeSaveNewAddress(sb, {
      accountId: String(accountId),
      actorUserId,
      kind: "SHIPPING",
      label: parsed.data.shipping_label ?? "Shipping",
      address: parsed.data.delivery_address ?? null,
      save: !!parsed.data.save_shipping_to_book,
      makeDefault: !!parsed.data.make_default_shipping,
    });
  } catch (e: any) {
    // Don’t block address update if saving fails; return warning
    return NextResponse.json({
      ok: true,
      warning: e?.message ?? "Address updated, but saving to address book failed.",
    });
  }

  // Best-effort audit
  try {
    await sb.from("audit_events").insert({
      account_id: accountId,
      actor_user_id: actorUserId,
      action: "ORDER_UPDATED",
      resource_type: "order",
      resource_id: orderId,
      metadata: { order_number: order.order_number, fields: ["invoice_address", "delivery_address"] },
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
