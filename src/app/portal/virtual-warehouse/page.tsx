import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";
import VirtualWarehouseClient from "./VirtualWarehouseClient";

export const dynamic = "force-dynamic";

export default async function VirtualWarehousePage() {
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
    .select("virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!(pricing as any)?.virtual_warehouse_enabled) {
    return (
      <div style={{ padding: 16, maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 950 }}>Virtual warehouse</h1>
        <p style={{ marginTop: 10, opacity: 0.8, fontWeight: 700 }}>
          Virtual warehouse is not enabled for your account. Contact your 360 Medical representative if you need this
          feature.
        </p>
        <Link href="/portal/orders" style={{ fontWeight: 900 }}>
          ← Back to orders
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
        <h1 style={{ fontSize: 22, fontWeight: 950 }}>Virtual warehouse</h1>
        <p style={{ marginTop: 10, opacity: 0.8, fontWeight: 700 }}>
          Virtual warehouse access is not enabled for your user. Ask an account administrator to enable it on the Account
          users page, or contact your 360 Medical representative.
        </p>
        <Link href="/portal/orders" style={{ fontWeight: 900 }}>
          ← Back to orders
        </Link>
      </div>
    );
  }

  const { data: accountRow } = await supabaseAdmin.from("accounts").select("name").eq("id", accountId).maybeSingle();
  const accountName = ctx.currentAccountName ?? accountRow?.name ?? "—";

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <VirtualWarehouseClient accountName={accountName} />
    </div>
  );
}
