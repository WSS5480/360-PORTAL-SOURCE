import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminProductsTableClient from "./ui/AdminProductsTableClient";

export const dynamic = "force-dynamic";

type VariantRow = {
  id: string;
  sku: string;
  size_label: string | null;
  width_cm: number | null;
  length_cm: number | null;
  total_sqcm: number | null;
  is_active: boolean;
  bulk_enabled: boolean;
  base_unit_price: number;
  updated_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  code: string | null;
  qcode: string | null;
  is_active: boolean;
  bulk_enabled: boolean;
  base_unit_price: number;
  updated_at: string;
  product_variants?: VariantRow[];
};

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default async function AdminProductsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrdersStaffOrAdmin();

  const sp = await props.searchParams;
  const q = safeStr(sp?.q);
  const only = safeStr(sp?.only); // "", "active", "inactive"
  const expanded = safeStr(sp?.expanded); // optional: productId to auto-expand
  const updated = safeStr(sp?.updated) === "1";

  let query = supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      code,
      qcode,
      is_active,
      bulk_enabled,
      base_unit_price,
      updated_at,
      product_variants (
        id,
        sku,
        size_label,
        width_cm,
        length_cm,
        total_sqcm,
        is_active,
        bulk_enabled,
        base_unit_price,
        updated_at
      )
    `
    )
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (q) {
    const esc = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(`name.ilike.%${esc}%,code.ilike.%${esc}%,qcode.ilike.%${esc}%`);
  }
  if (only === "active") query = query.eq("is_active", true);
  if (only === "inactive") query = query.eq("is_active", false);

  const { data, error } = await query;

  if (error) {
    return (
      <main style={{ padding: 0, maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: "1px solid rgba(220,38,38,0.25)",
            background: "rgba(254,242,242,0.95)",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#0f172a" }}>Products</h1>
          <pre style={{ marginTop: 12, color: "#b91c1c", fontSize: 12, whiteSpace: "pre-wrap" }}>{error.message}</pre>
          <div style={{ marginTop: 12 }}>
            <Link href="/admin" style={{ fontWeight: 900, color: "var(--brand-600)" }}>
              ← Admin dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as ProductRow[];

  const totalProducts = rows.length;
  const activeProducts = rows.filter((p) => !!p.is_active).length;
  const totalVariants = rows.reduce((acc, p) => acc + (p.product_variants?.length ?? 0), 0);
  const activeVariants = rows.reduce(
    (acc, p) => acc + (p.product_variants?.filter((v) => v.is_active).length ?? 0),
    0
  );
  const needsAttention = rows.filter(
    (p) => Number(p.base_unit_price ?? 0) <= 0 || (p.product_variants?.length ?? 0) === 0
  ).length;

  return (
    <main style={{ padding: 0, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 16 }}>
      {updated ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(25, 135, 84, 0.12)",
            border: "1px solid rgba(25, 135, 84, 0.3)",
            color: "rgba(15, 23, 42, 0.9)",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          Product updated.
        </div>
      ) : null}

      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(30,136,229,0.22)",
          background:
            "radial-gradient(900px 240px at 15% 10%, rgba(30,136,229,0.35), transparent 60%)," +
            "linear-gradient(180deg, #08172f, #060e1b)",
          color: "white",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "baseline",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 0.4,
                  opacity: 0.7,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Admin
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 950, margin: "6px 0 0" }}>Products</h1>
              <p style={{ marginTop: 6, opacity: 0.82, fontSize: 13, maxWidth: 720, lineHeight: 1.45 }}>
                Catalog for ordering — product Q codes, brochures, and base unit pricing. Variants carry SKU, dimensions,
                and auto-calculated price.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, opacity: 0.92 }}>
                <Link href="/admin" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Dashboard
                </Link>
                <Link href="/admin/inventory" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Inventory
                </Link>
                <Link href="/admin/orders" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Orders
                </Link>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href="/admin/products/new"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.12)",
                  color: "white",
                  fontWeight: 900,
                  textDecoration: "none",
                  fontSize: 13,
                }}
              >
                + New product
              </Link>
              <div style={{ display: "grid", gap: 4, textAlign: "right", fontSize: 12, opacity: 0.88 }}>
                <div>
                  Loaded: <b>{totalProducts}</b> products
                </div>
                <div>
                  Variants: <b>{totalVariants}</b> · Active: <b>{activeVariants}</b>
                </div>
                <div>
                  Needs attention: <b>{needsAttention}</b>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))",
              gap: 10,
            }}
          >
            {[
              { label: "Products", value: totalProducts },
              { label: "Active products", value: activeProducts },
              { label: "Variants", value: totalVariants },
              { label: "Active variants", value: activeVariants },
              { label: "Needs attention", value: needsAttention },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.35,
                    opacity: 0.72,
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 950, marginTop: 8, letterSpacing: -0.3 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AdminProductsTableClient
        rows={rows}
        initialQ={q}
        initialOnly={only}
        initialExpandProductId={expanded || null}
      />
    </main>
  );
}
