import Link from "next/link";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
  await requireOrdersStaffOrAdmin();

  return (
    <main style={{ padding: 18, maxWidth: 900, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ fontSize: 13, opacity: 0.8 }}>
        <Link href="/admin/products" style={{ textDecoration: "none", fontWeight: 950 }}>
          ← Products
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>New Product</h1>
      <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
        Create the product first. Variants will calculate pricing from this product’s base unit price.
      </p>

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 16,
          background: "white",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>
          Product Details
        </div>

        <form action="/api/admin/products/create" method="post" style={{ padding: 12, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Name</div>
            <input
              name="name"
              placeholder="e.g. Collagen Dressing"
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              required
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Code (optional)</div>
              <input
                name="code"
                placeholder="Optional internal code"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Q code (optional)</div>
              <input
                name="qcode"
                placeholder="e.g. Q1234"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
              Base unit price (per 1 sqcm “unit”)
            </div>
            <input
              name="base_unit_price"
              defaultValue="0"
              placeholder="e.g. 0.25"
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              required
            />
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Variant price = product base unit price × total sqcm.
            </div>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <input type="checkbox" name="is_active" defaultChecked />
            <span style={{ fontWeight: 900 }}>Active</span>
          </label>

          <button
            type="submit"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.14)",
              background: "#111",
              color: "white",
              fontWeight: 950,
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            Create Product
          </button>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            After creation you’ll be taken to the product page to add variants.
          </div>
        </form>
      </div>
    </main>
  );
}
