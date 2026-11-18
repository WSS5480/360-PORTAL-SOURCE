import Link from "next/link";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import InventoryPageClient from "./InventoryPageClient";

export const dynamic = "force-dynamic";

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
        borderRight: "1px solid rgba(255,255,255,0.12)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 950, color: "white", textAlign: "right" }}>{value}</div>
    </div>
  );
}

function fmtInt(n: number) {
  return new Intl.NumberFormat().format(Math.round(n));
}

async function loadInventoryMetrics() {
  const sb = createSupabaseAdminClient();

  const [activeVariantsRes, skusInStockRes, lotRowsRes, namedBinsRes] = await Promise.all([
    sb.from("product_variants").select("id", { count: "exact", head: true }).eq("is_active", true),
    sb.from("product_variant_inventory").select("variant_id", { count: "exact", head: true }).gt("qty_on_hand", 0),
    sb.from("product_variant_lots").select("variant_id", { count: "exact", head: true }),
    sb.from("inventory_locations").select("id", { count: "exact", head: true }),
  ]);

  let totalUnits = 0;
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from("product_variant_inventory").select("qty_on_hand").range(from, from + PAGE - 1);
    if (error) {
      totalUnits = 0;
      break;
    }
    const rows = data ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      const row = r as { qty_on_hand?: unknown };
      totalUnits += Number(row.qty_on_hand ?? 0) || 0;
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return {
    activeVariants: activeVariantsRes.error ? 0 : (activeVariantsRes.count ?? 0),
    totalUnits,
    skusInStock: skusInStockRes.error ? 0 : (skusInStockRes.count ?? 0),
    lotRows: lotRowsRes.error ? 0 : (lotRowsRes.count ?? 0),
    namedBins: namedBinsRes.error ? null : (namedBinsRes.count ?? 0),
  };
}

export default async function AdminInventoryPage() {
  await requireOrdersStaffOrAdmin();
  const m = await loadInventoryMetrics();

  return (
    <main style={{ padding: 18, maxWidth: 1280, margin: "0 auto", display: "grid", gap: 14 }}>
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(129,140,248,0.26)",
          background:
            "radial-gradient(900px 240px at 15% 10%, rgba(99,102,241,0.24), transparent 60%)," +
            "linear-gradient(180deg, #0a1428, #050d16)",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 14,
            alignItems: "end",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.7, fontWeight: 900, textTransform: "uppercase", color: "white" }}>
              Admin
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, color: "white" }}>
              <Link href="/admin" style={{ textDecoration: "none", fontWeight: 950, color: "white" }}>
                ← Admin
              </Link>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 950, margin: "8px 0 0", letterSpacing: -0.2, color: "white" }}>Inventory</h1>

            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85, lineHeight: 1.35, color: "white" }}>
              Use <b>Lookup</b> to browse inventory, select variants, and export an Excel file. Use <b>Receive</b> to scan-in
              inventory and <b>Remove</b> to scan-out with a reason — or upload a delivery slip PDF for batch removal. Use{" "}
              <b>Import</b> only for baseline initialization.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
            <Link href="/admin/products" style={{ textDecoration: "none", fontWeight: 950, color: "white" }}>
              Products
            </Link>
            <Link href="/admin/orders" style={{ textDecoration: "none", fontWeight: 950, color: "white" }}>
              Orders
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <HeroStat label="Units on hand" value={fmtInt(m.totalUnits)} />
          <HeroStat label="SKUs in stock" value={fmtInt(m.skusInStock)} />
          <HeroStat label="Active variants" value={fmtInt(m.activeVariants)} />
          <HeroStat label="Lot / trace rows" value={fmtInt(m.lotRows)} />
          <HeroStat label="Named bins" value={m.namedBins === null ? "—" : fmtInt(m.namedBins)} />
        </div>
      </div>

      <InventoryPageClient />
    </main>
  );
}
