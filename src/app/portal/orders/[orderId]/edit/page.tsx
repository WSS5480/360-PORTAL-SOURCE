import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canViewOrders, canCreateOrders } from "@/lib/portal/portalRoles";
import { isPortalOrderRowViewable } from "@/lib/portal/portalRowScope";
import ProductPickerEditClient from "./ProductPickerEditClient";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try { s = decodeURIComponent(s); } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function qp(searchParams: any, key: string): string {
  const v = searchParams?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0] ?? "");
  return "";
}

export default async function EditDraftOrderPage(props: {
  params: Promise<{ orderId: string }>;
  searchParams?: any;
}) {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  const sp =
    props.searchParams && typeof props.searchParams?.then === "function"
      ? await props.searchParams
      : props.searchParams;

  const error = qp(sp, "error");

  if (!accountId) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 950, color: "crimson" }}>No account selected.</div>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>← Back</Link>
      </div>
    );
  }

  if (!canViewOrders(ctx.currentRole) || !canCreateOrders(ctx.currentRole)) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 950, color: "crimson" }}>Forbidden.</div>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>← Back</Link>
      </div>
    );
  }

  const resolved = await props.params;
  const orderId = normalizeParam(resolved?.orderId ?? "");
  if (!UUID_RE.test(orderId)) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 950, color: "crimson" }}>Invalid orderId.</div>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>← Back</Link>
      </div>
    );
  }

  const { data: order, error: ordErr } = await supabaseAdmin
    .from("orders")
    .select("id, account_id, order_number, status, shipping_priority, shipping_total, created_by_user_id, submitted_by_contact_id")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr || !order || String(order.account_id) !== String(accountId)) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 950, color: "crimson" }}>Order not found.</div>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>← Back</Link>
      </div>
    );
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalOrderRowViewable(supabaseAdmin as any, accountId, portalUserId, ctx.currentRole, order as any);
  if (!viewable) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 950, color: "crimson" }}>Order not found.</div>
        <Link href="/portal/orders" style={{ fontWeight: 900, textDecoration: "none" }}>← Back</Link>
      </div>
    );
  }

  const statusUpper = String(order.status ?? "").toUpperCase();
  if (statusUpper !== "DRAFT") {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 950, color: "crimson" }}>Only Draft orders can be edited.</div>
        <Link href={`/portal/orders/${encodeURIComponent(orderId)}`} style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Back to Order
        </Link>
      </div>
    );
  }

  // Load existing PRODUCT items to prefill quantities
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("id, product_variant_id, quantity, line_type")
    .eq("order_id", orderId);

  const initialQtyByVariant: Record<string, number> = {};
  for (const it of items ?? []) {
    const lt = String((it as any).line_type ?? "").toUpperCase();
    const vid = (it as any).product_variant_id ? String((it as any).product_variant_id) : "";
    const qty = Number((it as any).quantity ?? 0) || 0;
    if (lt === "PRODUCT" && vid && qty > 0) initialQtyByVariant[vid] = qty;
  }

  // Load catalog like /portal/orders/new
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, name, code, qcode, is_active, base_unit_price, brochure_file_id")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(300);

  const productIds = (products ?? []).map((p: any) => String(p.id)).filter(Boolean);

  const { data: variants } = productIds.length
    ? await supabaseAdmin
        .from("product_variants")
        .select("id, product_id, sku, size_label, base_unit_price, is_active")
        .eq("is_active", true)
        .in("product_id", productIds)
        .order("sku", { ascending: true })
        .limit(2500)
    : ({ data: [] as any[] } as any);

  const variantIds = (variants ?? []).map((v: any) => String(v.id)).filter(Boolean);

  const { data: inv } = variantIds.length
    ? await supabaseAdmin
        .from("product_variant_inventory")
        .select("variant_id, qty_on_hand, updated_at")
        .in("variant_id", variantIds)
    : ({ data: [] as any[] } as any);

  // brochures map (optional – keep it simple; you can reuse your existing logic if needed)
  const brochuresByProduct: Record<string, any> = {};
  for (const p of products ?? []) brochuresByProduct[String((p as any).id)] = null;

  return (
    <form
      method="post"
      action={`/api/portal/orders/${encodeURIComponent(orderId)}/edit`}
      style={{ display: "grid", gap: 14, maxWidth: 1100, padding: 16 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>Edit Draft Order</h1>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Order: <b>{String(order.order_number ?? "")}</b>
          </div>
        </div>

        <Link href={`/portal/orders/${encodeURIComponent(orderId)}`} style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Back to Order
        </Link>
      </div>

      {error ? (
        <div style={{ border: "1px solid rgba(220,53,69,0.35)", background: "rgba(220,53,69,0.08)", color: "crimson", borderRadius: 14, padding: 12, fontWeight: 900, whiteSpace: "pre-wrap" }}>
          {decodeURIComponent(error)}
        </div>
      ) : null}

      <ProductPickerEditClient
        products={(products ?? []) as any}
        variants={(variants ?? []) as any}
        inventoryRows={(inv ?? []) as any}
        brochuresByProduct={brochuresByProduct}
        initialQtyByVariant={initialQtyByVariant}
        initialShippingAmount={Number(order.shipping_total ?? 0) || 0}
        initialShippingPriority={(order as any).shipping_priority ?? "GROUND"}
      />
    </form>
  );
}
