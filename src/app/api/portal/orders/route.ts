import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canViewOrders, canCreateOrders } from "@/lib/portal/portalRoles";
import { applyPortalOrdersScope } from "@/lib/portal/portalRowScope";
import { getBulkMatchingRule, normalizeBulkRules } from "@/lib/bulkRules";
import { loadBulkPricingReferenceVariant } from "@/lib/virtualWarehouse/loadBulkPricingReferenceVariant";
import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";
import { BULK_VW_PAYMENT_TERMS_DAYS, BULK_VW_PAYMENT_TERMS_LABEL } from "@/lib/billing/bulkPaymentTerms";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";
import { addressHasMinimum } from "@/lib/accounts/accountAddressMinimum";
import { makeOrderNumber } from "@/lib/orders/orderNumber";
import { priceOneCatalogLine } from "@/lib/orders/priceCatalogLine";
import { etaForPriority, ShippingPrioritySchema, type ShippingPriority } from "@/lib/orders/shippingPriority";

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

const CreateJsonSchema = z.object({
  invoice_address: AddressJsonSchema.nullable().optional(),
  delivery_address: AddressJsonSchema.nullable().optional(),

  // ✅ persisted on order
  shipping_priority: ShippingPrioritySchema.optional(),
  bulk_mode: z.boolean().optional(),
  bulk_contract_sqcm: z.number().positive().optional().nullable(),

  items: z
    .array(
      z.object({
        product_variant_id: z.string().uuid(),
        quantity: z.number().positive(),
        virtual_warehouse_qty: z.number().int().min(0).optional(),
      })
    )
    .min(0),
});

function safeNumber(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = safeStr(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function safeNonNegInt(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function normalizeAddressFromForm(form: FormData, prefix: string) {
  const get = (k: string) => safeStr(form.get(`${prefix}_${k}`));

  const obj: any = {
    company: get("company") || null,
    attn: get("attn") || null,
    line1: get("line1") || null,
    line2: get("line2") || null,
    city: get("city") || null,
    state: get("state") || null,
    postal: get("postal") || null,
    country: get("country") || null,
    phone: get("phone") || null,
    email: get("email") || null,
    notes: get("notes") || null,
  };

  const anyNonEmpty = Object.values(obj).some((v) => typeof v === "string" && v.trim().length > 0);
  if (!anyNonEmpty) return null;

  const parsed = AddressJsonSchema.safeParse(obj);
  if (!parsed.success) return null;
  return parsed.data;
}

async function loadSavedAddressSnapshot(sb: any, accountId: string, addressId: string) {
  const id = safeStr(addressId);
  if (!id || !UUID_RE.test(id)) return null;

  const { data, error } = await sb
    .from("account_addresses")
    .select("id, account_id, kind, label, is_default, address, disabled_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (String(data.account_id) !== String(accountId)) return null;
  if (data.disabled_at) return null;

  const parsed = AddressJsonSchema.safeParse(data.address);
  if (!parsed.success) return null;
  return parsed.data;
}

async function maybeSaveNewAddress(
  sb: any,
  args: {
    accountId: string;
    actorUserId: string | null;
    kind: "BILLING" | "SHIPPING";
    label: string;
    address: any;
    save: boolean;
    makeDefault: boolean;
  }
) {
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

async function parseCreatePayload(
  req: Request,
  sb: any,
  accountId: string,
  actorUserId: string | null
): Promise<
  | { ok: true; value: z.infer<typeof CreateJsonSchema>; submitMode?: string }
  | { ok: false; error: string; status: number }
> {
  const ct = req.headers.get("content-type") || "";

  // JSON body (API clients)
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const parsed = CreateJsonSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: parsed.error.message, status: 400 };
    return { ok: true, value: parsed.data };
  }

  // Form submit
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const submitMode = safeStr(form.get("submit_mode"));
    const bulk_mode = safeBool(form.get("bulk_mode"));
    const bulkContractRaw = safeStr(form.get("bulk_contract_sqcm"));
    const bulk_contract_sqcm_parsed = bulkContractRaw ? Number(bulkContractRaw) : null;
    const bulk_contract_sqcm =
      bulk_contract_sqcm_parsed != null && Number.isFinite(bulk_contract_sqcm_parsed) && bulk_contract_sqcm_parsed > 0
        ? bulk_contract_sqcm_parsed
        : null;

    // ✅ Shipping priority from form (NO shipping amount anywhere)
    const raw = safeStr(form.get("shipping_priority")).toUpperCase();
    const shipping_priority = raw ? ShippingPrioritySchema.safeParse(raw).data : undefined;

    const vwByVariant = new Map<string, number>();
    for (const [key, val] of form.entries()) {
      if (!key.startsWith("vw_qty__")) continue;
      const product_variant_id = key.slice("vw_qty__".length);
      vwByVariant.set(product_variant_id, safeNonNegInt(val));
    }

    const items: Array<{ product_variant_id: string; quantity: number; virtual_warehouse_qty?: number }> = [];
    for (const [key, val] of form.entries()) {
      if (!key.startsWith("qty__")) continue;
      const product_variant_id = key.slice("qty__".length);
      const qty = safeNumber(val);
      if (qty > 0) {
        const vw = vwByVariant.get(product_variant_id) ?? 0;
        items.push({ product_variant_id, quantity: qty, virtual_warehouse_qty: vw });
      }
    }

    // Address selection
    const billingMode = safeStr(form.get("billing_mode")) || "SAVED";
    const shippingMode = safeStr(form.get("shipping_mode")) || "SAVED";

    let invoice_address: any = null;
    let delivery_address: any = null;

    // Billing
    if (billingMode === "SAVED") {
      const billingId = safeStr(form.get("billing_address_id"));
      invoice_address = billingId ? await loadSavedAddressSnapshot(sb, accountId, billingId) : null;
    } else {
      invoice_address = normalizeAddressFromForm(form, "billing");
      const save = safeBool(form.get("billing_save"));
      const makeDefault = safeBool(form.get("billing_make_default"));
      const label = safeStr(form.get("billing_label"));
      await maybeSaveNewAddress(sb, {
        accountId,
        actorUserId,
        kind: "BILLING",
        label,
        address: invoice_address,
        save,
        makeDefault,
      });
    }

    // Shipping
    if (shippingMode === "SAVED") {
      const shippingId = safeStr(form.get("shipping_address_id"));
      delivery_address = shippingId ? await loadSavedAddressSnapshot(sb, accountId, shippingId) : null;
    } else {
      delivery_address = normalizeAddressFromForm(form, "shipping");
      const save = safeBool(form.get("shipping_save"));
      const makeDefault = safeBool(form.get("shipping_make_default"));
      const label = safeStr(form.get("shipping_label"));
      await maybeSaveNewAddress(sb, {
        accountId,
        actorUserId,
        kind: "SHIPPING",
        label,
        address: delivery_address,
        save,
        makeDefault,
      });
    }

    const payload = {
      invoice_address: invoice_address ?? null,
      delivery_address: delivery_address ?? null,
      shipping_priority,
      bulk_mode,
      bulk_contract_sqcm,
      items,
    };

    const parsed = CreateJsonSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: parsed.error.message, status: 400 };
    return { ok: true, value: parsed.data, submitMode };
  }

  return { ok: false, error: "Unsupported content-type", status: 415 };
}

export async function GET() {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  if (!canViewOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const sb: any = createSupabaseAdminClient();
  const userId = String((ctx.user as any)?.id ?? "");
  let ordQ = sb
    .from("orders")
    .select("id, order_number, status, total, created_at, placed_at, locked_at, shipping_priority, shipping_eta_days")
    .eq("account_id", accountId);
  const scopedList = await applyPortalOrdersScope(sb, ordQ, accountId, userId, ctx.currentRole);
  const { data, error } = await scopedList.query.order("created_at", { ascending: false }).limit(200);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, orders: data ?? [] });
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

  const sb: any = createSupabaseAdminClient();
  const actorUserId = (ctx.user as any)?.id ?? null;

  const parsedPayload = await parseCreatePayload(req, sb, String(accountId), actorUserId);
  if (!parsedPayload.ok) {
    return NextResponse.json({ ok: false, error: parsedPayload.error }, { status: parsedPayload.status });
  }
  const payload = parsedPayload.value;
  const submitMode = parsedPayload.ok ? parsedPayload.submitMode : undefined;

  // ✅ Account pricing defaults (discount + terms)
  const pricingRes = await sb
    .from("account_pricing")
    .select("discount_percent, payment_terms_label, payment_terms_days, bulk_enabled, bulk_rules, virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  if (pricingRes.error) return NextResponse.json({ ok: false, error: pricingRes.error.message }, { status: 500 });

  const discountPercent = Number(pricingRes.data?.discount_percent ?? 0) || 0;
  const bulkEnabled = !!pricingRes.data?.bulk_enabled;
  const bulkRules = normalizeBulkRules((pricingRes.data?.bulk_rules as any) || []);
  const termsLabel = (pricingRes.data?.payment_terms_label ?? null) as string | null;
  const termsDaysRaw = (pricingRes.data?.payment_terms_days ?? null) as number | null;
  const accountTermsDays =
    termsDaysRaw != null && Number.isFinite(Number(termsDaysRaw)) && Number(termsDaysRaw) > 0
      ? Math.floor(Number(termsDaysRaw))
      : 30;
  const accountTermsLabel =
    (termsLabel && String(termsLabel).trim()) || `Net ${accountTermsDays} (after delivery)`;
  const virtualWarehouseEnabled = await portalUserHasVirtualWarehouseAccess(sb, String(accountId), String(actorUserId ?? ""));

  const contractEarly = (payload as any).bulk_contract_sqcm;
  let bulkContractSqcm: number | null =
    contractEarly != null && Number.isFinite(Number(contractEarly)) && Number(contractEarly) > 0
      ? Number(contractEarly)
      : null;

  let hasVirtualWarehouseAllocation = false;
  for (const it of payload.items) {
    const qty = Number(it.quantity) || 0;
    const vwRaw = safeNonNegInt((it as any).virtual_warehouse_qty);
    if (vwRaw > 0) {
      hasVirtualWarehouseAllocation = true;
      if (!bulkEnabled || !payload.bulk_mode || !virtualWarehouseEnabled) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Virtual warehouse allocation requires bulk mode, bulk purchasing on the account, and virtual warehouse to be enabled.",
          },
          { status: 400 }
        );
      }
    }
    if (vwRaw > qty) {
      return NextResponse.json(
        { ok: false, error: "Virtual warehouse quantity cannot exceed the line quantity." },
        { status: 400 }
      );
    }
  }

  if (!addressHasMinimum(payload.invoice_address)) {
    return NextResponse.json(
      { ok: false, error: "Billing address is required (street, city, and postal code)." },
      { status: 400 }
    );
  }
  if (!addressHasMinimum(payload.delivery_address)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Shipping address is required (street, city, and postal code).",
      },
      { status: 400 }
    );
  }

  // ✅ Persist shipping priority (default to Ground)
  const shipping_priority: ShippingPriority = payload.shipping_priority ?? "GROUND";
  const shipping_eta_days = etaForPriority(shipping_priority);

  const isVwBulkOnlyOrder =
    payload.items.length === 0 &&
    virtualWarehouseEnabled &&
    bulkEnabled &&
    payload.bulk_mode &&
    bulkContractSqcm != null &&
    bulkContractSqcm > 0;

  if (payload.items.length === 0 && !isVwBulkOnlyOrder) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Add at least one product line, or enter a bulk purchase total (sq cm) with Virtual warehouse enabled for a virtual-warehouse-only order.",
      },
      { status: 400 }
    );
  }

  // Load variants for requested items (includes base_unit_price)
  const variantIds = payload.items.map((i) => i.product_variant_id);
  let variants: any[] = [];
  if (variantIds.length > 0) {
    const { data: vData, error: varErr } = await sb
      .from("product_variants")
      .select("id, product_id, sku, size_label, base_unit_price, width_cm, length_cm, total_sqcm")
      .in("id", variantIds);

    if (varErr) return NextResponse.json({ ok: false, error: varErr.message }, { status: 500 });
    variants = vData ?? [];
  }

  const byId = new Map<string, any>((variants ?? []).map((v: any) => [String(v.id), v]));
  for (const it of payload.items) {
    if (!byId.has(it.product_variant_id)) {
      return NextResponse.json(
        { ok: false, error: `Unknown product_variant_id: ${it.product_variant_id}` },
        { status: 400 }
      );
    }
  }

  const orderNumber = makeOrderNumber();

  let lineSqcmTotal = 0;
  for (const it of payload.items) {
    const v = byId.get(it.product_variant_id);
    const qty = Number(it.quantity) || 0;
    lineSqcmTotal += sqcmFromVariant(v) * qty;
  }

  if (hasVirtualWarehouseAllocation) {
    const effective = bulkContractSqcm ?? lineSqcmTotal;
    if (!Number.isFinite(effective) || effective < 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid bulk purchase total sq cm for virtual warehouse allocation." },
        { status: 400 }
      );
    }
    bulkContractSqcm = effective;
  }

  if (
    virtualWarehouseEnabled &&
    bulkEnabled &&
    payload.bulk_mode &&
    bulkContractSqcm != null &&
    bulkContractSqcm > 0 &&
    lineSqcmTotal > bulkContractSqcm + 0.01
  ) {
    return NextResponse.json(
      { ok: false, error: "Selected quantities exceed the bulk purchase total sq cm." },
      { status: 400 }
    );
  }

  const sqcmForBulkTier =
    virtualWarehouseEnabled &&
    bulkEnabled &&
    payload.bulk_mode &&
    bulkContractSqcm != null &&
    bulkContractSqcm > 0
      ? bulkContractSqcm
      : lineSqcmTotal;

  /** Full bulk sq cm purchase line (priced upfront) whenever VW + bulk + positive contract — with or without ship-now lines. */
  const needsVwBulkPurchaseLinePreview =
    virtualWarehouseEnabled &&
    bulkEnabled &&
    payload.bulk_mode &&
    bulkContractSqcm != null &&
    bulkContractSqcm > 0;

  const bulkRuleGlobal =
    bulkEnabled && payload.bulk_mode ? getBulkMatchingRule(sqcmForBulkTier, bulkRules, null) : null;

  if (bulkEnabled && payload.bulk_mode) {
    if (needsVwBulkPurchaseLinePreview && !bulkRuleGlobal) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No all-products bulk price tier matched this order total sq cm. Add an All products rule in admin, or increase total sq cm.",
        },
        { status: 400 }
      );
    }
    for (const it of payload.items) {
      const v = byId.get(it.product_variant_id);
      const lineRule = getBulkMatchingRule(sqcmForBulkTier, bulkRules, v?.product_id ?? null);
      if (!lineRule) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No bulk price tier matched a product on this order. Add or adjust bulk rules in admin (All products or product-specific).",
          },
          { status: 400 }
        );
      }
    }
    if (payload.items.length === 0 && !needsVwBulkPurchaseLinePreview && !bulkRuleGlobal) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No bulk price tier matched this order total sq cm. Add or adjust bulk rules in admin, or increase total sq cm.",
        },
        { status: 400 }
      );
    }
  }

  const bulkRuleApplied = bulkRuleGlobal;

  const accountDiscountPercent = discountPercent;

  /** Full bulk sq cm purchase line (priced upfront) whenever VW + bulk + positive contract — with or without ship-now lines. */
  const needsVwBulkPurchaseLine =
    virtualWarehouseEnabled &&
    bulkEnabled &&
    payload.bulk_mode &&
    bulkContractSqcm != null &&
    bulkContractSqcm > 0;

  let pricingRefVariant: any = null;
  if (needsVwBulkPurchaseLine) {
    try {
      pricingRefVariant = await loadBulkPricingReferenceVariant(sb);
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || "Failed to load catalog" }, { status: 500 });
    }
    if (!pricingRefVariant) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Virtual warehouse bulk purchases require at least one active bulk product with sq cm sizing in the catalog.",
        },
        { status: 400 }
      );
    }
  }

  /** Short “due before shipment” terms apply only to virtual-warehouse bulk deposit orders — not portal bulk catalog pricing alone. */
  const useBulkVwTerms = needsVwBulkPurchaseLine;
  const resolvedTermsLabel = useBulkVwTerms ? BULK_VW_PAYMENT_TERMS_LABEL : accountTermsLabel;
  const resolvedTermsDays = useBulkVwTerms ? BULK_VW_PAYMENT_TERMS_DAYS : accountTermsDays;

  const lineRows = (() => {
    /** Product lines on a VW bulk purchase are informational; payment is on the bulk deposit line only. */
    const mapProductItems = (sortOffset: number, productLinesFree: boolean) =>
      payload.items.map((it, idx) => {
        const v = byId.get(it.product_variant_id);
        const qty = Number(it.quantity) || 0;
        const vwQty = Math.min(safeNonNegInt((it as any).virtual_warehouse_qty), qty);
        const priced = priceOneCatalogLine({
          variant: v,
          quantity: qty,
          virtualWarehouseQty: vwQty,
          bulkEnabled,
          bulkMode: !!payload.bulk_mode,
          bulkRules,
          sqcmForBulkTier,
          accountDiscountPercent,
          productLinesFree,
        });

        return {
          sort_order: sortOffset + idx,
          product_variant_id: v.id,
          description: priced.description,
          quantity: priced.quantity,
          uom: priced.uom,
          unit_price: priced.unit_price,
          discount_percent: priced.discount_percent,
          line_total: priced.line_total,
          line_type: priced.line_type,
          virtual_warehouse_qty: priced.virtual_warehouse_qty,
        };
      });

    if (needsVwBulkPurchaseLine && pricingRefVariant && bulkContractSqcm != null) {
      const v = pricingRefVariant;
      const contractSq = bulkContractSqcm;
      const P = bulkRuleApplied!.price_per_sqcm;
      const depositLineTotal = P * contractSq;
      const desc = `Virtual warehouse bulk purchase (${contractSq.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq cm)`;
      const depositLine = {
        sort_order: 0,
        product_variant_id: v.id,
        description: desc,
        quantity: 1,
        uom: "Each",
        unit_price: depositLineTotal,
        discount_percent: 0,
        line_total: depositLineTotal,
        line_type: "PRODUCT",
        virtual_warehouse_qty: 0,
      };

      if (isVwBulkOnlyOrder) {
        return [depositLine];
      }

      return [depositLine, ...mapProductItems(1, true)];
    }

    return mapProductItems(0, false);
  })();

  const orderTotalSqcm =
    needsVwBulkPurchaseLine && bulkContractSqcm != null ? bulkContractSqcm : lineSqcmTotal;

  const subtotal = lineRows.reduce((sum, r) => sum + (Number(r.line_total) || 0), 0);

  // ✅ No shipping amount at create-time
  const shippingTotal = 0;
  const total = subtotal;

  // Create order
  const { data: order, error: ordErr } = await sb
    .from("orders")
    .insert({
      account_id: accountId,
      order_number: orderNumber,
      status: "DRAFT",
      created_by_user_id: actorUserId,

      shipping_priority,
      shipping_eta_days,

      bulk_mode: !!payload.bulk_mode,
      bulk_contract_sqcm: bulkContractSqcm,
      total_sqcm: orderTotalSqcm,
      discount_percent_snapshot: bulkEnabled && payload.bulk_mode ? 0 : accountDiscountPercent,
      bulk_price_per_sqcm_snapshot:
        bulkEnabled && payload.bulk_mode && bulkRuleApplied ? bulkRuleApplied.price_per_sqcm : null,
      payment_terms_label_snapshot: resolvedTermsLabel,
      payment_terms_days_snapshot: resolvedTermsDays,
      invoice_address: payload.invoice_address ?? null,
      delivery_address: payload.delivery_address ?? null,
      subtotal,
      shipping_total: shippingTotal,
      total,
    })
    .select("id, order_number")
    .single();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });

  // Create items
  const itemsToInsert = lineRows.map((r) => ({ ...r, order_id: order.id }));
  const { error: itemErr } = await sb.from("order_items").insert(itemsToInsert);
  if (itemErr) return NextResponse.json({ ok: false, error: itemErr.message }, { status: 500 });

  // Status history
  const { error: evErr } = await sb.from("order_status_events").insert({
    order_id: order.id,
    from_status: null,
    to_status: "DRAFT",
    changed_by_user_id: actorUserId,
    comment: "Created",
  });
  if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

  // Audit
  const { error: audErr } = await sb.from("audit_events").insert({
    account_id: accountId,
    actor_user_id: actorUserId,
    action: "ORDER_CREATED",
    resource_type: "order",
    resource_id: order.id,
    metadata: {
      order_number: order.order_number,
      item_count: lineRows.length,
      has_billing_address: !!payload.invoice_address,
      has_shipping_address: !!payload.delivery_address,
      shipping_priority,
      shipping_eta_days,
      discount_percent: accountDiscountPercent,
      bulk_price_per_sqcm: bulkEnabled && payload.bulk_mode && bulkRuleApplied ? bulkRuleApplied.price_per_sqcm : null,
      bulk_mode: !!payload.bulk_mode,
      total_sqcm: orderTotalSqcm,
      virtual_warehouse_bulk_only: isVwBulkOnlyOrder,
    },
  });
  if (audErr) return NextResponse.json({ ok: false, error: audErr.message }, { status: 500 });

  // If request came from a browser form, redirect back to Orders list
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    if (submitMode === "place") {
      const next = urlFromRequest(req, `/portal/orders/${encodeURIComponent(order.id)}?autosubmit=1`);
      return NextResponse.redirect(next);
    }

    return NextResponse.redirect(urlFromRequest(req, "/portal/orders"));
  }

  return NextResponse.json({ ok: true, order: { id: order.id, order_number: order.order_number } });
}
