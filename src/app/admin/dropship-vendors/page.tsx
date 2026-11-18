// src/app/admin/dropship-vendors/page.tsx
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import DropshipVendorsClient from "./DropshipVendorsClient";

export const dynamic = "force-dynamic";

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

export default async function AdminDropshipVendorsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrdersStaffOrAdmin();

  const sp = searchParams ? await searchParams : {};
  const accountId = safeStr(sp?.accountId);

  // accounts dropdown
  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("id,name")
    .order("name", { ascending: true })
    .limit(1000);

  // preload vendors if accountId provided (client can refresh too)
  const { data: vendors } = accountId
    ? await supabaseAdmin
        .from("dropship_vendors")
        .select("id, account_id, name, email, phone, address, notes, disabled_at, created_at")
        .eq("account_id", accountId)
        .is("disabled_at", null)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] as any[] };

  return (
    <main style={{ padding: 18, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            <Link href="/admin" style={{ textDecoration: "none", fontWeight: 950 }}>
              ← Admin
            </Link>
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 950 }}>Dropship Vendors</h1>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
            Create/manage dropship vendors per account. Fulfillments can be switched between <b>INVENTORY</b> and <b>DROPSHIP</b>.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/admin/fulfillments"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              textDecoration: "none",
              fontWeight: 950,
              background: "white",
              color: "#111",
            }}
          >
            Fulfillments →
          </Link>
        </div>
      </div>

      <DropshipVendorsClient
        accounts={(accounts ?? []).map((a: any) => ({ id: String(a.id), name: String(a.name || "") }))}
        initialAccountId={accountId}
        initialVendors={(vendors ?? []).map((v: any) => ({
          id: String(v.id),
          name: String(v.name || ""),
          email: String(v.email || ""),
          phone: String(v.phone || ""),
          address: v.address ?? {},
          notes: String(v.notes || ""),
          created_at: String(v.created_at || ""),
        }))}
      />
    </main>
  );
}
