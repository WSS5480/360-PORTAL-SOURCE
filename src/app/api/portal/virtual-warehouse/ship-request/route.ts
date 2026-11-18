import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canCreateOrders } from "@/lib/portal/portalRoles";
import { getVirtualSqcmBalance } from "@/lib/virtualWarehouse/virtualSqcmBalance";
import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";
import { BULK_VW_PAYMENT_TERMS_DAYS, BULK_VW_PAYMENT_TERMS_LABEL } from "@/lib/billing/bulkPaymentTerms";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";

export const dynamic = "force-dynamic";

const ShippingPrioritySchema = z.enum([
  "GROUND",
  "THREE_DAY",
  "TWO_DAY",
  "TWO_DAY_AM",
  "OVERNIGHT_AM",
  "FIRST_OVERNIGHT",
  "PRIORITY_OVERNIGHT",
]);

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

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function addressHasMinimum(a: unknown): boolean {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  return safeStr(o.line1).length > 0 && safeStr(o.city).length > 0 && safeStr(o.postal).length > 0;
}

const BodySchema = z
  .object({
    items: z
      .array(
        z.object({
          product_variant_id: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1),
    billing_address_id: z.string().uuid().optional(),
    shipping_address_id: z.string().uuid().optional(),
    shipping_priority: ShippingPrioritySchema.optional(),
    invoice_address: AddressJsonSchema.nullable().optional(),
    delivery_address: AddressJsonSchema.nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const hasBilling = !!val.billing_address_id || addressHasMinimum(val.invoice_address);
    const hasShipping = !!val.shipping_address_id || addressHasMinimum(val.delivery_address);
    if (!hasBilling || !hasShipping) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide a billing address (saved ID or full new address) and a shipping address (saved ID or full new address).",
      });
    }
  });

function makeOrderNumber() {
  const d = new Date();
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `ORD-${y}${m}${day}-${rand}`;
}

function etaForPriority(p: z.infer<typeof ShippingPrioritySchema>): number {
  if (p === "OVERNIGHT_AM" || p === "FIRST_OVERNIGHT" || p === "PRIORITY_OVERNIGHT") return 1;
  if (p === "TWO_DAY" || p === "TWO_DAY_AM") return 2;
  if (p === "THREE_DAY") return 3;
  return 3;
}

async function loadSavedAddressSnapshot(sb: any, accountId: string, addressId: string) {
  const { data, error } = await sb
    .from("account_addresses")
    .select("id, account_id, kind, address, disabled_at")
    .eq("id", addressId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (String(data.account_id) !== String(accountId)) return null;
  if (data.disabled_at) return null;

  const parsed = AddressJsonSchema.safeParse(data.address);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function POST(req: Request) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  if (!canCreateOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();
  const actorUserId = (ctx.user as any)?.id ?? null;

  const { data: pricing, error: prErr } = await sb
    .from("account_pricing")
    .select("virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  if (prErr) return NextResponse.json({ ok: false, error: prErr.message }, { status: 500 });
  if (!(pricing as any)?.virtual_warehouse_enabled) {
    return NextResponse.json({ ok: false, error: "Virtual warehouse is not enabled for this account." }, { status: 403 });
  }

  const vwUserOk = await portalUserHasVirtualWarehouseAccess(sb, String(accountId), String(actorUserId ?? ""));
  if (!vwUserOk) {
    return NextResponse.json({ ok: false, error: "Virtual warehouse access is not enabled for your user." }, { status: 403 });
  }

  let invoice_address = parsed.data.invoice_address ?? null;
  let delivery_address = parsed.data.delivery_address ?? null;

  if (!invoice_address && parsed.data.billing_address_id) {
    invoice_address = await loadSavedAddressSnapshot(sb, String(accountId), parsed.data.billing_address_id);
  }
  if (!delivery_address && parsed.data.shipping_address_id) {
    delivery_address = await loadSavedAddressSnapshot(sb, String(accountId), parsed.data.shipping_address_id);
  }

  if (!invoice_address || !delivery_address) {
    return NextResponse.json({ ok: false, error: "Valid billing and shipping addresses are required." }, { status: 400 });
  }

  const variantIds = parsed.data.items.map((i) => i.product_variant_id);
  const { data: variants, error: varErr } = await sb
    .from("product_variants")
    .select("id, sku, size_label, total_sqcm, width_cm, length_cm")
    .in("id", variantIds);

  if (varErr) return NextResponse.json({ ok: false, error: varErr.message }, { status: 500 });

  const byId = new Map<string, any>((variants ?? []).map((v: any) => [String(v.id), v]));
  for (const it of parsed.data.items) {
    if (!byId.has(it.product_variant_id)) {
      return NextResponse.json({ ok: false, error: `Unknown variant ${it.product_variant_id}` }, { status: 400 });
    }
  }

  let needSqcm = 0;
  for (const it of parsed.data.items) {
    const v = byId.get(it.product_variant_id);
    needSqcm += sqcmFromVariant(v) * it.quantity;
  }

  const pool = await getVirtualSqcmBalance(sb, String(accountId));
  if (needSqcm > pool + 0.01) {
    return NextResponse.json(
      { ok: false, error: "Insufficient virtual warehouse sq cm balance for this shipment request." },
      { status: 400 }
    );
  }

  const shipping_priority = parsed.data.shipping_priority ?? "GROUND";
  const shipping_eta_days = etaForPriority(shipping_priority);
  const termsLabel = (pricing as any)?.payment_terms_label ?? null;
  const termsDays = (pricing as any)?.payment_terms_days ?? null;

  const orderNumber = makeOrderNumber();

  const lineRows = parsed.data.items.map((it, idx) => {
    const v = byId.get(it.product_variant_id)!;
    const descParts = [v.sku].filter(Boolean);
    if (v.size_label) descParts.push(String(v.size_label));
    const description = (descParts.length ? descParts.join(" ") : "Product") + " (virtual warehouse shipment)";
    return {
      sort_order: idx,
      product_variant_id: v.id,
      description,
      quantity: it.quantity,
      uom: "Units",
      unit_price: 0,
      discount_percent: 0,
      line_total: 0,
      line_type: "PRODUCT",
      virtual_warehouse_qty: 0,
    };
  });

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .insert({
      account_id: accountId,
      order_number: orderNumber,
      status: "DRAFT",
      created_by_user_id: actorUserId,
      shipping_priority,
      shipping_eta_days,
      bulk_mode: false,
      total_sqcm: needSqcm,
      discount_percent_snapshot: 0,
      payment_terms_label_snapshot: BULK_VW_PAYMENT_TERMS_LABEL,
      payment_terms_days_snapshot: BULK_VW_PAYMENT_TERMS_DAYS,
      invoice_address,
      delivery_address,
      subtotal: 0,
      shipping_total: 0,
      total: 0,
      virtual_warehouse_shipment: true,
    })
    .select("id, order_number")
    .single();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });

  const { error: itemErr } = await sb.from("order_items").insert(lineRows.map((r) => ({ ...r, order_id: order.id })));
  if (itemErr) return NextResponse.json({ ok: false, error: itemErr.message }, { status: 500 });

  await sb.from("order_status_events").insert({
    order_id: order.id,
    from_status: null,
    to_status: "DRAFT",
    changed_by_user_id: actorUserId,
    comment: "Virtual warehouse ship request (no product charge)",
  });

  await sb.from("audit_events").insert({
    account_id: accountId,
    actor_user_id: actorUserId,
    action: "ORDER_CREATED",
    resource_type: "order",
    resource_id: order.id,
    metadata: {
      order_number: order.order_number,
      virtual_warehouse_shipment: true,
      item_count: parsed.data.items.length,
    },
  });

  return NextResponse.json({ ok: true, order: { id: order.id, order_number: order.order_number } });
}
