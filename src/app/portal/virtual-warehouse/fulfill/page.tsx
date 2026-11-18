import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";
import VirtualWarehouseFulfillClient from "../VirtualWarehouseFulfillClient";

export const dynamic = "force-dynamic";

export default async function VirtualWarehouseFulfillPage() {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return (
      <div style={{ padding: 16 }}>
        <p>No account selected.</p>
        <Link href="/portal">← Portal</Link>
      </div>
    );
  }

  const { data: pricing } = await supabaseAdmin
    .from("account_pricing")
    .select("virtual_warehouse_enabled, payment_terms_label, payment_terms_days")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!(pricing as any)?.virtual_warehouse_enabled) {
    return (
      <div style={{ padding: 16, maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 950 }}>Fulfill from virtual warehouse</h1>
        <p style={{ marginTop: 10, opacity: 0.8, fontWeight: 700 }}>
          Virtual warehouse is not enabled for your account.
        </p>
        <Link href="/portal/orders" style={{ fontWeight: 900 }}>
          ← Back
        </Link>
      </div>
    );
  }

  const userVw = await portalUserHasVirtualWarehouseAccess(
    supabaseAdmin,
    accountId,
    String((ctx.user as any)?.id ?? "")
  );
  if (!userVw) {
    return (
      <div style={{ padding: 16, maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 950 }}>Fulfill from virtual warehouse</h1>
        <p style={{ marginTop: 10, opacity: 0.8, fontWeight: 700 }}>
          Virtual warehouse access is not enabled for your user. Ask an account administrator to enable it on the Account
          users page.
        </p>
        <Link href="/portal/orders" style={{ fontWeight: 900 }}>
          ← Back
        </Link>
      </div>
    );
  }

  const { data: accountRow } = await supabaseAdmin
    .from("accounts")
    .select("name")
    .eq("id", accountId)
    .maybeSingle();

  const accountName = ctx.currentAccountName ?? accountRow?.name ?? "—";
  const termsLabelRaw = String(pricing?.payment_terms_label ?? "").trim();
  const termsDaysRaw = Number(pricing?.payment_terms_days);
  const termsDays = Number.isFinite(termsDaysRaw) ? termsDaysRaw : 30;
  const termsLabel = termsLabelRaw || `Net ${Math.max(0, Math.floor(termsDays))} (after delivery)`;

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
      <div style={{ padding: 16 }}>
        <p style={{ color: "crimson", fontWeight: 900 }}>{addrErr.message}</p>
        <Link href="/portal/virtual-warehouse">← Virtual warehouse</Link>
      </div>
    );
  }

  const billingAddresses = (addressRows ?? []).filter((r: any) => String(r.kind).toUpperCase() === "BILLING");
  const shippingAddresses = (addressRows ?? []).filter((r: any) => String(r.kind).toUpperCase() === "SHIPPING");

  const defaultBillingId = billingAddresses.find((r: any) => !!r.is_default)?.id ?? "";
  const defaultShippingId = shippingAddresses.find((r: any) => !!r.is_default)?.id ?? "";

  return (
    <VirtualWarehouseFulfillClient
      accountName={accountName}
      termsLabel={termsLabel}
      billingAddresses={(billingAddresses ?? []) as any}
      shippingAddresses={(shippingAddresses ?? []) as any}
      defaultBillingId={defaultBillingId ? String(defaultBillingId) : ""}
      defaultShippingId={defaultShippingId ? String(defaultShippingId) : ""}
    />
  );
}
