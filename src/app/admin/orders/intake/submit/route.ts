import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { getBulkMatchingRule, normalizeBulkRules } from "@/lib/bulkRules";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatCentralTime, sendOrderEmails } from "@/lib/orders/orderEmails";
import { BULK_VW_PAYMENT_TERMS_DAYS, BULK_VW_PAYMENT_TERMS_LABEL } from "@/lib/billing/bulkPaymentTerms";
import { addressHasMinimum } from "@/lib/accounts/accountAddressMinimum";
import { parseOrderIntakeSelectedPerson } from "@/lib/orders/orderIntakeSelectedPerson";
import { makeOrderNumber } from "@/lib/orders/orderNumber";
import { priceOneCatalogLine } from "@/lib/orders/priceCatalogLine";
import { etaForPriority, ShippingPrioritySchema, type ShippingPriority } from "@/lib/orders/shippingPriority";
import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";

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
  shipping_priority: ShippingPrioritySchema.optional(),
  bulk_mode: z.boolean().optional(),
  items: z
    .array(
      z.object({
        product_variant_id: z.string().uuid(),
        quantity: z.number().positive(),
        virtual_warehouse_qty: z.number().int().min(0).optional(),
      })
    )
    .min(1),
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

function normEmail(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
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

function parseSelectedPerson(raw: string) {
  return parseOrderIntakeSelectedPerson(raw);
}

async function findOrCreateAccountContact(opts: {
  supabase: any;
  accountId: string;
  actorUserId: string | null;
  email: string;
  fullName?: string;
  userId?: string | null;
}) {
  const { supabase, accountId, actorUserId, email, fullName, userId } = opts;
  const e = normEmail(email);
  if (!e) return null;

  const existing = await supabase
    .from("account_contacts")
    .select("id,email,user_id")
    .eq("account_id", accountId)
    .eq("email", e)
    .maybeSingle();

  if (!existing.error && existing.data?.id) {
    if (userId && !existing.data.user_id) {
      await supabase.from("account_contacts").update({ user_id: userId }).eq("id", existing.data.id);
    }
    return existing.data;
  }

  const created = await supabase
    .from("account_contacts")
    .insert({
      account_id: accountId,
      email: e,
      full_name: (fullName || "").trim() || null,
      created_by_user_id: actorUserId,
      user_id: userId || null,
    })
    .select("id,email")
    .single();

  if (created.error) throw created.error;
  return created.data;
}

async function getPortalMemberEmail(sb: any, userId: string): Promise<string | null> {
  const authAdmin = (sb as any)?.auth?.admin;
  const getUserById = authAdmin?.getUserById;
  if (typeof getUserById !== "function") return null;
  try {
    const res = await authAdmin.getUserById(userId);
    const email = normEmail(res?.data?.user?.email);
    return email || null;
  } catch {
    return null;
  }
}

async function getPortalMemberName(sb: any, userId: string): Promise<string | null> {
  const { data: prof } = await sb.from("user_profiles").select("full_name").eq("user_id", userId).maybeSingle();
  const name = safeStr(prof?.full_name);
  return name || null;
}

export async function POST(req: Request) {
  const ctx = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();
  const actorUserId = ctx?.user?.id ? String(ctx.user.id) : null;
  const actorProfileUserId = actorUserId
    ? (await sb.from("user_profiles").select("user_id").eq("user_id", actorUserId).maybeSingle()).data?.user_id
        ? actorUserId
        : null
    : null;

  const form = await req.formData();

  const accountId = safeStr(form.get("account_id"));
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid account_id" }, { status: 400 });
  }

  const selectedPersonRaw = safeStr(form.get("selected_person"));
  const newUserEmail = normEmail(form.get("new_user_email"));
  const newUserFullName = safeStr(form.get("new_user_full_name"));

  let submitted_by_contact_id: string | null = null;
  let submittedByLabel = "";
  let customerEmail = "";

  if (newUserEmail) {
    const contact = await findOrCreateAccountContact({
      supabase: sb,
      accountId,
      actorUserId,
      email: newUserEmail,
      fullName: newUserFullName,
    });
    submitted_by_contact_id = contact?.id ? String(contact.id) : null;
    submittedByLabel = newUserFullName || newUserEmail;
    customerEmail = newUserEmail;
  } else {
    const sel = parseSelectedPerson(selectedPersonRaw);
    if (sel?.kind === "ACCOUNT_USER") {
      submitted_by_contact_id = sel.id;
      const { data: contact } = await sb
        .from("account_contacts")
        .select("email, full_name")
        .eq("id", sel.id)
        .maybeSingle();
      submittedByLabel = safeStr(contact?.full_name) || safeStr(contact?.email);
      customerEmail = safeStr(contact?.email);
    } else if (sel?.kind === "PORTAL_MEMBER") {
      const email = await getPortalMemberEmail(sb, sel.id);
      const fullName = await getPortalMemberName(sb, sel.id);
      if (email) {
        const contact = await findOrCreateAccountContact({
          supabase: sb,
          accountId,
          actorUserId,
          email,
          fullName: fullName || undefined,
          userId: sel.id,
        });
        submitted_by_contact_id = contact?.id ? String(contact.id) : null;
        submittedByLabel = fullName || email;
        customerEmail = email;
      }
    } else if (sel?.kind === "ACCOUNT_INVITE") {
      const { data: invite } = await sb
        .from("account_invites")
        .select("id, account_id, email, full_name")
        .eq("id", sel.id)
        .maybeSingle();
      const email = normEmail(invite?.email);
      const fullName = safeStr(invite?.full_name);
      if (invite && String(invite.account_id) === accountId && email) {
        const contact = await findOrCreateAccountContact({
          supabase: sb,
          accountId,
          actorUserId,
          email,
          fullName: fullName || undefined,
        });
        submitted_by_contact_id = contact?.id ? String(contact.id) : null;
        submittedByLabel = fullName || email;
        customerEmail = email;
      }
    }
  }

  if (!submitted_by_contact_id) {
    return NextResponse.json({ ok: false, error: "Select a user or create a new contact." }, { status: 400 });
  }

  const rawPriority = safeStr(form.get("shipping_priority")).toUpperCase();
  const shipping_priority = rawPriority ? ShippingPrioritySchema.safeParse(rawPriority).data : undefined;
  const bulk_mode = safeBool(form.get("bulk_mode"));
  const bulkContractFormRaw = safeStr(form.get("bulk_contract_sqcm"));
  const bulkContractFormParsed = bulkContractFormRaw ? Number(bulkContractFormRaw) : null;

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

  let hasVirtualWarehouseAllocation = false;
  for (const it of items) {
    if (safeNonNegInt((it as any).virtual_warehouse_qty) > 0) {
      hasVirtualWarehouseAllocation = true;
      break;
    }
  }

  const billingMode = safeStr(form.get("billing_mode")) || "SAVED";
  const shippingMode = safeStr(form.get("shipping_mode")) || "SAVED";

  let invoice_address: any = null;
  let delivery_address: any = null;

  if (billingMode === "SAVED") {
    const billingId = safeStr(form.get("billing_address_id"));
    invoice_address = billingId ? await loadSavedAddressSnapshot(sb, accountId, billingId) : null;
  } else {
    invoice_address = normalizeAddressFromForm(form, "billing");
    const save = addressHasMinimum(invoice_address) || safeBool(form.get("billing_save"));
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

  if (shippingMode === "SAVED") {
    const shippingId = safeStr(form.get("shipping_address_id"));
    delivery_address = shippingId ? await loadSavedAddressSnapshot(sb, accountId, shippingId) : null;
  } else {
    delivery_address = normalizeAddressFromForm(form, "shipping");
    const save = addressHasMinimum(delivery_address) || safeBool(form.get("shipping_save"));
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
    items,
  };

  const parsed = CreateJsonSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  if (!addressHasMinimum(payload.invoice_address)) {
    return NextResponse.json(
      { ok: false, error: "Billing address is required (street, city, and postal code)." },
      { status: 400 },
    );
  }
  if (!addressHasMinimum(payload.delivery_address)) {
    return NextResponse.json(
      { ok: false, error: "Shipping address is required (street, city, and postal code)." },
      { status: 400 },
    );
  }

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
  const virtualWarehouseEnabled = !!(pricingRes.data as any)?.virtual_warehouse_enabled;

  for (const it of payload.items) {
    const qty = Number(it.quantity) || 0;
    const vwRaw = safeNonNegInt((it as any).virtual_warehouse_qty);
    if (vwRaw > 0) {
      if (!bulkEnabled || !payload.bulk_mode || !virtualWarehouseEnabled) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Virtual warehouse allocation requires bulk mode, bulk purchasing on the account, and virtual warehouse enabled.",
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

  const shipPriority: ShippingPriority = payload.shipping_priority ?? "GROUND";
  const shipping_eta_days = etaForPriority(shipPriority);

  const variantIds = payload.items.map((i) => i.product_variant_id);
  const { data: variants, error: varErr } = await sb
    .from("product_variants")
    .select("id, product_id, sku, size_label, base_unit_price, width_cm, length_cm, total_sqcm")
    .in("id", variantIds);
  if (varErr) return NextResponse.json({ ok: false, error: varErr.message }, { status: 500 });

  const byId = new Map<string, any>((variants ?? []).map((v: any) => [String(v.id), v]));
  for (const it of payload.items) {
    if (!byId.has(it.product_variant_id)) {
      return NextResponse.json({ ok: false, error: `Unknown product_variant_id: ${it.product_variant_id}` }, { status: 400 });
    }
  }

  const orderNumber = makeOrderNumber();
  let totalSqcm = 0;
  for (const it of payload.items) {
    const v = byId.get(it.product_variant_id);
    const qty = Number(it.quantity) || 0;
    totalSqcm += sqcmFromVariant(v) * qty;
  }

  let bulkContractSqcm: number | null =
    bulkContractFormParsed != null && Number.isFinite(bulkContractFormParsed) && bulkContractFormParsed > 0
      ? bulkContractFormParsed
      : null;

  if (hasVirtualWarehouseAllocation) {
    const effective = bulkContractSqcm ?? totalSqcm;
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
    totalSqcm > bulkContractSqcm + 0.01
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
      : totalSqcm;

  const bulkRuleApplied =
    bulkEnabled && payload.bulk_mode ? getBulkMatchingRule(sqcmForBulkTier, bulkRules, null) : null;

  if (bulkEnabled && payload.bulk_mode) {
    for (const it of payload.items) {
      const v = byId.get(it.product_variant_id);
      if (!getBulkMatchingRule(sqcmForBulkTier, bulkRules, v?.product_id ?? null)) {
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
  }

  const accountDiscountPercent = discountPercent;

  const lineRows = payload.items.map((it, idx) => {
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
    });

    return {
      sort_order: idx,
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

  const subtotal = lineRows.reduce((sum, r) => sum + (Number(r.line_total) || 0), 0);
  const shippingTotal = 0;
  const total = subtotal;

  const submitMode = safeStr(form.get("submit_mode"));
  const status = submitMode === "place" ? "CONFIRMED" : "DRAFT";
  const now = new Date();
  const nowIso = now.toISOString();

  /** Short bulk/VW terms only when allocating into virtual warehouse — not for bulk catalog pricing alone. */
  const useBulkVwTerms = hasVirtualWarehouseAllocation;
  const resolvedTermsLabel = useBulkVwTerms ? BULK_VW_PAYMENT_TERMS_LABEL : accountTermsLabel;
  const resolvedTermsDays = useBulkVwTerms ? BULK_VW_PAYMENT_TERMS_DAYS : accountTermsDays;

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .insert({
      account_id: accountId,
      order_number: orderNumber,
      status,
      created_by_user_id: actorProfileUserId,
      submitted_by_contact_id,
      shipping_priority: shipPriority,
      shipping_eta_days,
      bulk_mode: !!payload.bulk_mode,
      bulk_contract_sqcm: bulkContractSqcm,
      total_sqcm: totalSqcm,
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
      placed_at: submitMode === "place" ? nowIso : null,
    })
    .select("id, order_number")
    .single();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });

  const itemsToInsert = lineRows.map((r) => ({ ...r, order_id: order.id }));
  const { error: itemErr } = await sb.from("order_items").insert(itemsToInsert);
  if (itemErr) return NextResponse.json({ ok: false, error: itemErr.message }, { status: 500 });

  await sb.from("order_status_events").insert({
    order_id: order.id,
    from_status: null,
    to_status: status,
    changed_by_user_id: actorProfileUserId,
    comment: "Created via admin intake",
  });

  await sb.from("audit_events").insert({
    account_id: accountId,
    actor_user_id: actorProfileUserId,
    action: "ORDER_CREATED",
    resource_type: "order",
    resource_id: order.id,
    metadata: {
      order_number: order.order_number,
      item_count: payload.items.length,
      has_billing_address: !!payload.invoice_address,
      has_shipping_address: !!payload.delivery_address,
      shipping_priority: shipPriority,
      shipping_eta_days,
      discount_percent: accountDiscountPercent,
      bulk_price_per_sqcm: bulkEnabled && payload.bulk_mode && bulkRuleApplied ? bulkRuleApplied.price_per_sqcm : null,
      bulk_mode: !!payload.bulk_mode,
      total_sqcm: totalSqcm,
      submitted_by_contact_id,
      created_from: "ADMIN_INTAKE",
    },
  });

  if (status === "CONFIRMED") {
    try {
      const origin = new URL(req.url).origin;
      const adminOrderUrl = new URL(`/admin/orders/${encodeURIComponent(order.id)}`, origin).toString();
      const portalOrderUrl = new URL(`/portal/orders/${encodeURIComponent(order.id)}`, origin).toString();
      await sendOrderEmails({
        sb,
        orderId: order.id,
        accountId,
        submittedAt: formatCentralTime(now),
        submittedBy: submittedByLabel || customerEmail || "—",
        customerEmail,
        adminUrl: adminOrderUrl,
        portalUrl: portalOrderUrl,
      });
    } catch (e: any) {
      console.error("[ORDER_NOTIFY] failed", e?.message ?? e);
    }
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/orders/${encodeURIComponent(order.id)}`), 303);
}
