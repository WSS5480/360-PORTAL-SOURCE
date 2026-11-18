import { Fragment } from "react";
import Link from "next/link";
import PortalOrderHero from "@/components/portal/PortalOrderHero";
import PortalOrderPageBanner from "@/components/portal/PortalOrderPageBanner";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";
import ProductPickerClient from "./ProductPickerClient";

export const dynamic = "force-dynamic";

function qp(searchParams: any, key: string): string {
  const v = searchParams?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0] ?? "");
  return "";
}

export default async function NewOrderPage(props: { searchParams?: any }) {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  // Next.js may provide searchParams as a Promise in newer versions
  const sp =
    props.searchParams && typeof (props.searchParams as any)?.then === "function"
      ? await (props.searchParams as any)
      : props.searchParams;

  const error = qp(sp, "error");

  if (!accountId) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Create Order</h1>
        <p style={{ opacity: 0.75 }}>No account selected.</p>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Back to Orders
        </Link>
      </div>
    );
  }

  // ✅ Use account_pricing for discount + terms (align with UI expectations)
  const { data: pricing, error: pricingErr } = await supabaseAdmin
    .from("account_pricing")
    .select("discount_percent, payment_terms_label, payment_terms_days, bulk_enabled, bulk_rules, virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  if (pricingErr) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Create Order</h1>
        <div style={{ color: "crimson", fontWeight: 900 }}>{pricingErr.message}</div>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const portalUserVw = await portalUserHasVirtualWarehouseAccess(
    supabaseAdmin,
    accountId,
    String((ctx.user as any)?.id ?? "")
  );

  const { data: accountRow } = await supabaseAdmin
    .from("accounts")
    .select("name, discount_percent")
    .eq("id", accountId)
    .maybeSingle();

  const accountName = ctx.currentAccountName ?? accountRow?.name ?? "—";
  const discount = Number(pricing?.discount_percent ?? accountRow?.discount_percent ?? 0) || 0;
  const termsLabel = String(pricing?.payment_terms_label ?? "").trim();
  const termsDaysRaw = Number(pricing?.payment_terms_days);
  const termsDays = Number.isFinite(termsDaysRaw) ? termsDaysRaw : 30;
  const terms = termsLabel || `Net ${Math.max(0, Math.floor(termsDays))} (after delivery)`;

  const { data: addressRows, error: addrErr } = await supabaseAdmin
    .from("account_addresses")
    .select("id, kind, label, is_default, address, disabled_at, created_at")
    .eq("account_id", accountId)
    .is("disabled_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (addrErr) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Create Order</h1>
        <div style={{ color: "crimson", fontWeight: 900 }}>{addrErr.message}</div>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const billingAddresses = (addressRows ?? []).filter((r: any) => String(r.kind).toUpperCase() === "BILLING");
  const shippingAddresses = (addressRows ?? []).filter((r: any) => String(r.kind).toUpperCase() === "SHIPPING");

  const defaultBillingId = billingAddresses.find((r: any) => !!r.is_default)?.id ?? "";
  const defaultShippingId = shippingAddresses.find((r: any) => !!r.is_default)?.id ?? "";

  const { data: products, error: pErr } = await supabaseAdmin
    .from("products")
    .select("id, name, code, qcode, is_active, bulk_enabled, base_unit_price, brochure_file_id")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(300);

  if (pErr) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>Create Order</h1>
        <div style={{ color: "crimson", fontWeight: 900 }}>{pErr.message}</div>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const productIds = (products ?? []).map((p: any) => String(p.id)).filter(Boolean);

  let variants: any[] = [];
  if (productIds.length > 0) {
    // ✅ IMPORTANT: include total_sqcm / width_cm / length_cm so sqcm totals can work
    const { data: vData, error: vErr } = await supabaseAdmin
      .from("product_variants")
      .select("id, product_id, sku, size_label, base_unit_price, is_active, bulk_enabled, width_cm, length_cm, total_sqcm")
      .eq("is_active", true)
      .in("product_id", productIds)
      .order("sku", { ascending: true })
      .limit(2500);

    if (vErr) {
      return (
        <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 950 }}>Create Order</h1>
          <div style={{ color: "crimson", fontWeight: 900 }}>{vErr.message}</div>
          <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>
            ← Back to Orders
          </Link>
        </div>
      );
    }

    variants = vData ?? [];
  }

  const variantIds = variants.map((v: any) => String(v.id)).filter(Boolean);

  let inventoryRows: Array<{ variant_id: string; qty_on_hand: number; updated_at: string | null }> = [];
  if (variantIds.length > 0) {
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("product_variant_inventory")
      .select("variant_id, qty_on_hand, updated_at")
      .in("variant_id", variantIds);

    if (invErr) {
      return (
        <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 950 }}>Create Order</h1>
          <div style={{ color: "crimson", fontWeight: 900 }}>{invErr.message}</div>
          <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>
            ← Back to Orders
          </Link>
        </div>
      );
    }

    inventoryRows = (inv ?? []).map((r: any) => ({
      variant_id: String(r.variant_id),
      qty_on_hand: Number(r.qty_on_hand ?? 0) || 0,
      updated_at: r.updated_at ? String(r.updated_at) : null,
    }));
  }

  const brochureIds = (products ?? [])
    .map((p: any) => (p.brochure_file_id ? String(p.brochure_file_id) : ""))
    .filter((id: string) => !!id);

  let brochuresByProduct: Record<string, { file_id: string; original_filename: string | null } | null> = {};

  if (brochureIds.length > 0) {
    const { data: fileRows, error: fErr } = await supabaseAdmin
      .from("files")
      .select("id, original_filename")
      .in("id", brochureIds);

    if (fErr) {
      return (
        <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 950 }}>Create Order</h1>
          <div style={{ color: "crimson", fontWeight: 900 }}>{fErr.message}</div>
          <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>
            ← Back to Orders
          </Link>
        </div>
      );
    }

    const byFileId = new Map<string, { id: string; original_filename: string | null }>();
    for (const f of fileRows ?? []) {
      byFileId.set(String((f as any).id), {
        id: String((f as any).id),
        original_filename: (f as any).original_filename ? String((f as any).original_filename) : null,
      });
    }

    for (const p of products ?? []) {
      const pid = String((p as any).id);
      const fid = (p as any).brochure_file_id ? String((p as any).brochure_file_id) : "";
      brochuresByProduct[pid] =
        fid && byFileId.get(fid) ? { file_id: fid, original_filename: byFileId.get(fid)!.original_filename } : null;
    }
  } else {
    for (const p of products ?? []) brochuresByProduct[String((p as any).id)] = null;
  }

  return (
    <form method="post" action="/api/portal/orders" style={{ display: "grid", gap: 16, maxWidth: 1100, padding: 16 }}>
      <PortalOrderHero
        title="Create Order"
        accountName={accountName}
        backHref="/portal/orders"
        backLabel="← Back to Orders"
        metaLines={[
          <Fragment key="discount-terms">
            Discount <b style={{ color: "white" }}>{discount}%</b> · Terms <b style={{ color: "white" }}>{terms}</b>
          </Fragment>,
        ]}
        stats={[
          { label: "Products", value: products?.length ?? 0 },
          { label: "Variants", value: variants?.length ?? 0 },
          { label: "Addresses", value: billingAddresses.length + shippingAddresses.length },
          { label: "Discount", value: `${discount}%` },
        ]}
      />

      {error ? <PortalOrderPageBanner kind="error">{decodeURIComponent(error)}</PortalOrderPageBanner> : null}

      <ProductPickerClient
        discountPercent={discount}
        termsLabel={terms}
        bulkEnabled={!!pricing?.bulk_enabled}
        virtualWarehouseEnabled={portalUserVw}
        bulkRules={Array.isArray(pricing?.bulk_rules) ? (pricing?.bulk_rules as any) : []}
        products={(products ?? []) as any}
        variants={(variants ?? []) as any}
        inventoryRows={inventoryRows}
        brochuresByProduct={brochuresByProduct}
        billingAddresses={(billingAddresses ?? []) as any}
        shippingAddresses={(shippingAddresses ?? []) as any}
        defaultBillingId={defaultBillingId ? String(defaultBillingId) : ""}
        defaultShippingId={defaultShippingId ? String(defaultShippingId) : ""}
      />
    </form>
  );
}
