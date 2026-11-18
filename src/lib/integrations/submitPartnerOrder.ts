import { PARTNER_INVENTORY_LIMITATION } from "@/lib/integrations/inventoryPolicy";
import {
  partnerOrderRequestHash,
  type NormalizedPartnerOrder,
} from "@/lib/integrations/partnerOrderContract";
import { planAccountResolution, resolvePartnerLine, type CatalogVariant } from "@/lib/integrations/resolvePartnerCatalog";
import { aggregateInventoryNeed, findInventoryShortages } from "@/lib/orders/inventoryCheck";
import { makeOrderNumber } from "@/lib/orders/orderNumber";
import { priceOneCatalogLine } from "@/lib/orders/priceCatalogLine";
import { etaForPriority } from "@/lib/orders/shippingPriority";
import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";

type QueryResult<T> = { data: T; error: { message: string } | null; count?: number | null };

export type PartnerDb = {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<QueryResult<any>>;
};

export type PartnerOrderLineView = {
  sku: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  line_total: number;
};

export type PartnerOrderView = {
  id: string;
  order_number: string;
  partner_order_number: string;
  status: string;
  currency: "USD";
  subtotal: number;
  shipping_total: number;
  total: number;
  lines: PartnerOrderLineView[];
};

export type PartnerOrderSuccess = {
  ok: true;
  status: 200;
  idempotentReplay: boolean;
  order: PartnerOrderView;
};

export type PartnerOrderFailure = {
  ok: false;
  status: 404 | 409 | 422 | 429 | 500;
  error: string;
  errorCode: string;
  details?: unknown;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function optionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function recordPartnerIssue(
  sb: PartnerDb,
  issue: {
    partner_id: string;
    external_order_number: string;
    partner_account_ref: string;
    error_code: string;
    detail: Record<string, unknown>;
  }
) {
  try {
    const query = sb.from("integration_partner_order_issues");
    if (!query || typeof query.insert !== "function") return;
    await query.insert(issue);
  } catch {
    return;
  }
}

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

async function loadOrderView(
  sb: PartnerDb,
  orderId: string,
  partnerOrderNumber: string
): Promise<PartnerOrderView | null> {
  const { data: order, error } = await sb
    .from("orders")
    .select("id, order_number, status, subtotal, shipping_total, total")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) return null;

  const { data: items, error: itemError } = await sb
    .from("order_items")
    .select("product_variant_id, quantity, unit_price, discount_percent, line_total, sort_order")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });
  if (itemError) return null;

  const variantIds = Array.from(
    new Set((items ?? []).map((item: { product_variant_id?: string }) => clean(item.product_variant_id)).filter(Boolean))
  );
  const skuById = new Map<string, string>();
  if (variantIds.length) {
    const { data: variants } = await sb
      .from("product_variants")
      .select("id, sku")
      .in("id", variantIds);
    for (const variant of variants ?? []) {
      skuById.set(String(variant.id), clean(variant.sku));
    }
  }

  return {
    id: String(order.id),
    order_number: String(order.order_number),
    partner_order_number: partnerOrderNumber,
    status: String(order.status),
    currency: "USD",
    subtotal: num(order.subtotal),
    shipping_total: num(order.shipping_total),
    total: num(order.total),
    lines: (items ?? []).map((item: any) => ({
      sku: skuById.get(clean(item.product_variant_id)) || "",
      product_variant_id: clean(item.product_variant_id),
      quantity: num(item.quantity),
      unit_price: num(item.unit_price),
      discount_percent: num(item.discount_percent),
      line_total: num(item.line_total),
    })),
  };
}

function success(order: PartnerOrderView, idempotentReplay: boolean): PartnerOrderSuccess {
  return { ok: true, status: 200, idempotentReplay, order };
}

export async function getPartnerOrder(
  sb: PartnerDb,
  partnerId: string,
  partnerOrderNumber: string
): Promise<PartnerOrderSuccess | PartnerOrderFailure> {
  const { data, error } = await sb
    .from("integration_partner_orders")
    .select("order_id, external_order_number, partner_id")
    .eq("partner_id", partnerId)
    .eq("external_order_number", partnerOrderNumber)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: "Could not load the order.", errorCode: "server_error" };
  if (!data?.order_id || String(data.partner_id) !== partnerId) {
    return { ok: false, status: 404, error: "Order not found.", errorCode: "not_found" };
  }

  const order = await loadOrderView(sb, String(data.order_id), partnerOrderNumber);
  if (!order) return { ok: false, status: 404, error: "Order not found.", errorCode: "not_found" };
  return success(order, false);
}

export async function submitPartnerOrder(
  sb: PartnerDb,
  args: {
    partnerId: string;
    idempotencyKey: string;
    order: NormalizedPartnerOrder;
    now?: Date;
  }
): Promise<PartnerOrderSuccess | PartnerOrderFailure> {
  const requestHash = partnerOrderRequestHash(args.order);
  const partnerOrderNumber = args.order.partner_order_number;

  const { data: existing, error: existingError } = await sb
    .from("integration_partner_orders")
    .select("request_hash, order_id, idempotency_key, external_order_number, partner_id")
    .eq("partner_id", args.partnerId)
    .eq("external_order_number", partnerOrderNumber)
    .maybeSingle();
  if (existingError) {
    return { ok: false, status: 500, error: "Could not check the existing order.", errorCode: "server_error" };
  }

  if (existing) {
    if (String(existing.partner_id) !== args.partnerId) {
      return { ok: false, status: 404, error: "Order not found.", errorCode: "not_found" };
    }
    const samePayload = existing.request_hash === requestHash && existing.idempotency_key === args.idempotencyKey;
    if (!samePayload) {
      return {
        ok: false,
        status: 409,
        error: "This partner order number was already submitted with a different payload.",
        errorCode: "conflict",
      };
    }
    if (existing.order_id) {
      const order = await loadOrderView(sb, String(existing.order_id), partnerOrderNumber);
      if (!order) return { ok: false, status: 500, error: "The existing order could not be loaded.", errorCode: "server_error" };
      return success(order, true);
    }
  }

  const { data: keyOwner, error: keyError } = await sb
    .from("integration_partner_orders")
    .select("external_order_number, request_hash, partner_id")
    .eq("partner_id", args.partnerId)
    .eq("idempotency_key", args.idempotencyKey)
    .maybeSingle();
  if (keyError) return { ok: false, status: 500, error: "Could not check the idempotency key.", errorCode: "server_error" };
  if (keyOwner && String(keyOwner.external_order_number) !== partnerOrderNumber) {
    return {
      ok: false,
      status: 409,
      error: "This idempotency key was already used for a different partner order number.",
      errorCode: "conflict",
    };
  }

  const { data: partnerRow, error: partnerError } = await sb
    .from("integration_partners")
    .select("id, auto_create_accounts, allow_direct_sku_match, approved_discount_percent, approved_payment_terms_days")
    .eq("id", args.partnerId)
    .maybeSingle();
  if (partnerError) return { ok: false, status: 500, error: "Could not load the partner.", errorCode: "server_error" };

  const { data: mapping, error: mappingError } = await sb
    .from("integration_partner_accounts")
    .select("account_id, partner_id, partner_account_ref")
    .eq("partner_id", args.partnerId)
    .eq("partner_account_ref", args.order.partner_account_ref)
    .maybeSingle();
  if (mappingError) return { ok: false, status: 500, error: "Could not resolve the account mapping.", errorCode: "server_error" };

  const mappedAccountId =
    mapping?.account_id && String(mapping.partner_id) === args.partnerId ? String(mapping.account_id) : null;
  const accountPlan = planAccountResolution({
    mappedAccountId,
    autoCreateAccounts: partnerRow?.auto_create_accounts === true,
    customerName: clean(args.order.customer?.name) || null,
    approvedDiscountPercent: optionalNumber(partnerRow?.approved_discount_percent),
    approvedTermsDays: optionalNumber(partnerRow?.approved_payment_terms_days),
  });
  if (accountPlan.action === "reject") {
    await recordPartnerIssue(sb, {
      partner_id: args.partnerId,
      external_order_number: partnerOrderNumber,
      partner_account_ref: args.order.partner_account_ref,
      error_code: accountPlan.errorCode,
      detail: { customer_name: clean(args.order.customer?.name) || null },
    });
    return {
      ok: false,
      status: accountPlan.status,
      error: accountPlan.error,
      errorCode: accountPlan.errorCode,
    };
  }

  let accountId = accountPlan.action === "use" ? accountPlan.accountId : "";
  if (accountPlan.action === "create") {
    const { data: ensured, error: ensureError } = await sb.rpc("integration_ensure_partner_account", {
      p_partner_id: args.partnerId,
      p_partner_account_ref: args.order.partner_account_ref,
      p_customer_name: clean(args.order.customer?.name),
    });
    if (ensureError) return { ok: false, status: 500, error: "Could not create the customer account.", errorCode: "server_error" };
    const ensureResult = String(ensured?.result ?? "");
    if (ensureResult !== "created" && ensureResult !== "existing") {
      const failure = {
        ok: false as const,
        status: 422 as const,
        errorCode: ensureResult || "unknown_account",
        error:
          ensureResult === "customer_name_required"
            ? "A customer.name is required before a new account can be created for this partner_account_ref."
            : ensureResult === "pricing_not_approved"
              ? "This partner has no approved default discount and payment terms, so a new account was not created."
              : "partner_account_ref is not mapped. Map the customer or enable approved automatic account creation for this partner.",
      };
      await recordPartnerIssue(sb, {
        partner_id: args.partnerId,
        external_order_number: partnerOrderNumber,
        partner_account_ref: args.order.partner_account_ref,
        error_code: failure.errorCode,
        detail: {},
      });
      return failure;
    }
    accountId = clean(ensured?.account_id);
    if (!accountId) return { ok: false, status: 500, error: "Could not create the customer account.", errorCode: "server_error" };
  }

  const [{ data: account, error: accountError }, { data: pricing, error: pricingError }] = await Promise.all([
    sb.from("accounts").select("id, is_demo").eq("id", accountId).maybeSingle(),
    sb
      .from("account_pricing")
      .select("discount_percent, payment_terms_label, payment_terms_days")
      .eq("account_id", accountId)
      .maybeSingle(),
  ]);
  if (accountError || pricingError) {
    return { ok: false, status: 500, error: "Could not load account pricing.", errorCode: "server_error" };
  }
  if (!account) {
    return { ok: false, status: 422, error: "The mapped account is not available.", errorCode: "unknown_account" };
  }
  if (pricing?.discount_percent == null || pricing?.payment_terms_days == null) {
    await recordPartnerIssue(sb, {
      partner_id: args.partnerId,
      external_order_number: partnerOrderNumber,
      partner_account_ref: args.order.partner_account_ref,
      error_code: "pricing_not_configured",
      detail: { account_id: accountId },
    });
    return {
      ok: false,
      status: 422,
      error: "The customer account has no approved discount and payment terms, so the order was not confirmed.",
      errorCode: "pricing_not_configured",
    };
  }

  const skus = Array.from(new Set(args.order.lines.map((line) => line.sku)));
  const { data: mapRows, error: mapError } = await sb
    .from("integration_partner_product_maps")
    .select("external_sku, product_variant_id, status")
    .eq("partner_id", args.partnerId)
    .in("external_sku", skus);
  if (mapError) return { ok: false, status: 500, error: "Could not load product mappings.", errorCode: "server_error" };

  const { data: variantRows, error: variantError } = await sb
    .from("product_variants")
    .select("id, product_id, sku, size_label, base_unit_price, width_cm, length_cm, total_sqcm, is_active, manufacturer")
    .in("sku", skus);
  if (variantError) return { ok: false, status: 500, error: "Could not load products.", errorCode: "server_error" };

  const knownIds = new Set((variantRows ?? []).map((row: { id?: string }) => String(row.id)));
  const mappedIds = Array.from(
    new Set(
      (mapRows ?? [])
        .map((row: { product_variant_id?: string }) => String(row.product_variant_id || ""))
        .filter((id: string) => id && !knownIds.has(id))
    )
  );
  let mappedVariantRows: any[] = [];
  if (mappedIds.length) {
    const { data: extraVariants, error: extraError } = await sb
      .from("product_variants")
      .select("id, product_id, sku, size_label, base_unit_price, width_cm, length_cm, total_sqcm, is_active, manufacturer")
      .in("id", mappedIds);
    if (extraError) return { ok: false, status: 500, error: "Could not load products.", errorCode: "server_error" };
    mappedVariantRows = extraVariants ?? [];
  }
  const allVariantRows = [...(variantRows ?? []), ...mappedVariantRows];

  const productIds = Array.from(new Set(allVariantRows.map((row: any) => String(row.product_id || "")).filter(Boolean)));
  const productActive = new Map<string, boolean>();
  if (productIds.length) {
    const { data: products, error: productError } = await sb
      .from("products")
      .select("id, is_active")
      .in("id", productIds);
    if (productError) return { ok: false, status: 500, error: "Could not load products.", errorCode: "server_error" };
    for (const product of products ?? []) productActive.set(String(product.id), product.is_active !== false);
  }

  const catalogVariants: CatalogVariant[] = allVariantRows.map((row: any) => ({
    id: String(row.id),
    product_id: String(row.product_id),
    sku: clean(row.sku),
    size_label: row.size_label == null ? null : String(row.size_label),
    base_unit_price: num(row.base_unit_price),
    width_cm: optionalNumber(row.width_cm),
    length_cm: optionalNumber(row.length_cm),
    total_sqcm: optionalNumber(row.total_sqcm),
    is_active: row.is_active !== false,
    product_active: productActive.get(String(row.product_id)) === true,
    manufacturer: row.manufacturer == null ? null : String(row.manufacturer),
  }));

  const resolvedLines = args.order.lines.map((line) =>
    resolvePartnerLine({
      line,
      maps: (mapRows ?? []).map((row: any) => ({
        external_sku: clean(row.external_sku),
        product_variant_id: String(row.product_variant_id),
        status: String(row.status || ""),
      })),
      variants: catalogVariants,
      allowDirectSkuMatch: partnerRow?.allow_direct_sku_match !== false,
    })
  );
  const skuFailure = resolvedLines.find((line) => !line.ok);
  if (skuFailure && !skuFailure.ok) {
    await recordPartnerIssue(sb, {
      partner_id: args.partnerId,
      external_order_number: partnerOrderNumber,
      partner_account_ref: args.order.partner_account_ref,
      error_code: skuFailure.errorCode,
      detail: {
        lines: resolvedLines.filter((line) => !line.ok).map((line) => ({ sku: line.sku, error_code: line.errorCode })),
      },
    });
    return {
      ok: false,
      status: skuFailure.status,
      error: skuFailure.error,
      errorCode: skuFailure.errorCode,
      details: resolvedLines.filter((line) => !line.ok).map((line) => ({ sku: line.sku, error_code: line.errorCode })),
    };
  }

  const discountPercent = num(pricing.discount_percent);
  const termsDays = Math.floor(num(pricing.payment_terms_days));
  const termsLabel = clean(pricing.payment_terms_label) || `Net ${termsDays} (after delivery)`;
  const variantsById = new Map(catalogVariants.map((variant) => [variant.id, variant]));

  const priced = args.order.lines.map((line, index) => {
    const resolved = resolvedLines[index];
    if (!resolved?.ok) throw new Error("SKU resolution was not complete.");
    const variant = variantsById.get(resolved.variant.id) ?? resolved.variant;
    const amounts = priceOneCatalogLine({
      variant,
      quantity: line.quantity,
      virtualWarehouseQty: 0,
      bulkEnabled: false,
      bulkMode: false,
      bulkRules: [],
      sqcmForBulkTier: 0,
      accountDiscountPercent: discountPercent,
    });
    return {
      sort_order: index,
      product_variant_id: String(variant.id),
      sku: line.sku,
      ...amounts,
    };
  });

  const totalSqcm = priced.reduce((sum, line) => {
    const variant = variantsById.get(line.product_variant_id);
    return sum + (variant ? sqcmFromVariant(variant) : 0) * line.quantity;
  }, 0);
  const subtotal = priced.reduce((sum, line) => sum + line.line_total, 0);
  const isDemo = !!(account as { is_demo?: boolean }).is_demo;

  if (!isDemo) {
    const need = aggregateInventoryNeed(
      priced.map((line) => ({
        product_variant_id: line.product_variant_id,
        quantity: line.quantity,
        virtual_warehouse_qty: 0,
      })),
      "full"
    );
    const variantIds = Array.from(need.keys());
    const { data: inventory, error: inventoryError } = await sb
      .from("product_variant_inventory")
      .select("variant_id, qty_on_hand")
      .in("variant_id", variantIds);
    if (inventoryError) return { ok: false, status: 500, error: "Could not check inventory.", errorCode: "server_error" };
    const onHand = new Map<string, number>();
    for (const row of inventory ?? []) onHand.set(String(row.variant_id), num(row.qty_on_hand));
    const shortages = findInventoryShortages(need, onHand);
    if (shortages.length) {
      const skuByVariant = new Map(priced.map((line) => [line.product_variant_id, line.sku]));
      return {
        ok: false,
        status: 422,
        error: "Insufficient inventory for one or more lines.",
        errorCode: "insufficient_inventory",
        details: {
          limitation: PARTNER_INVENTORY_LIMITATION,
          lines: shortages.map((shortage) => ({
            sku: skuByVariant.get(shortage.variant_id) ?? "",
            required: shortage.required,
            on_hand: shortage.on_hand,
          })),
        },
      };
    }
  }

  const now = args.now ?? new Date();
  const { data: submitted, error: submitError } = await sb.rpc("integration_submit_priced_order", {
    p_partner_id: args.partnerId,
    p_external_order_number: partnerOrderNumber,
    p_idempotency_key: args.idempotencyKey,
    p_request_hash: requestHash,
    p_order: {
      account_id: accountId,
      order_number: makeOrderNumber(now),
      status: "CONFIRMED",
      shipping_priority: args.order.shipping_priority,
      shipping_eta_days: etaForPriority(args.order.shipping_priority),
      bulk_mode: false,
      total_sqcm: totalSqcm,
      discount_percent_snapshot: discountPercent,
      payment_terms_label_snapshot: termsLabel,
      payment_terms_days_snapshot: termsDays,
      invoice_address: args.order.billing_address,
      delivery_address: args.order.shipping_address,
      subtotal,
      shipping_total: 0,
      total: subtotal,
      placed_at: now.toISOString(),
      contact: args.order.contact ?? null,
    },
    p_items: priced.map((line) => ({
      sort_order: line.sort_order,
      product_variant_id: line.product_variant_id,
      description: line.description,
      quantity: line.quantity,
      uom: line.uom,
      unit_price: line.unit_price,
      discount_percent: line.discount_percent,
      line_total: line.line_total,
      line_type: line.line_type,
      virtual_warehouse_qty: 0,
    })),
  });

  if (submitError) {
    return { ok: false, status: 500, error: "The order could not be saved.", errorCode: "server_error" };
  }

  const result = String(submitted?.result ?? "");
  const orderId = clean(submitted?.order_id);
  if (result === "conflict") {
    return {
      ok: false,
      status: 409,
      error: "This partner order number was already submitted with a different payload.",
      errorCode: "conflict",
    };
  }
  if ((result === "created" || result === "replay") && orderId) {
    const order = await loadOrderView(sb, orderId, partnerOrderNumber);
    if (!order) return { ok: false, status: 500, error: "The order was saved but could not be loaded.", errorCode: "server_error" };
    return success(order, result === "replay");
  }

  return { ok: false, status: 500, error: "The order could not be saved.", errorCode: "server_error" };
}

export async function countRecentPartnerRequests(sb: PartnerDb, partnerId: string, sinceIso: string): Promise<number | null> {
  const { count, error } = await sb
    .from("integration_inbound_requests")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId)
    .gte("created_at", sinceIso);
  if (error) return null;
  return count ?? 0;
}
