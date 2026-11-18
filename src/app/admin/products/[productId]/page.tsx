import Link from "next/link";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import BrochureUploadClient from "./ui/BrochureUploadClient";
import VariantsManagerClient from "./ui/VariantsManagerClient";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  return s.split("?")[0].split("#")[0].trim();
}

function pillActive(active: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    whiteSpace: "nowrap",
  };
  return active
    ? { ...base, background: "rgba(25, 135, 84, 0.14)" }
    : { ...base, background: "rgba(220, 53, 69, 0.12)" };
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOrdersStaffOrAdmin();

  const resolved = await params;
  const productId = normalizeParam(resolved?.productId ?? "");

  const sp = searchParams ? await searchParams : {};
  const saved = typeof sp?.saved === "string" ? sp.saved : "";

  if (!UUID_RE.test(productId)) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Invalid productId.</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/products" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Products
          </Link>
        </div>
      </main>
    );
  }

  const { data: product, error: prodErr } = await supabaseAdmin
    .from("products")
    .select("id, name, code, qcode, base_unit_price, is_active, bulk_enabled, brochure_file_id, created_at, updated_at")
    .eq("id", productId)
    .maybeSingle();

  if (prodErr) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>{prodErr.message}</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/products" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Products
          </Link>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ opacity: 0.8 }}>Not found.</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/products" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Products
          </Link>
        </div>
      </main>
    );
  }

  const brochureId = product.brochure_file_id ? String(product.brochure_file_id) : "";

  let brochureMeta: any = null;
  if (brochureId && UUID_RE.test(brochureId)) {
    const { data } = await supabaseAdmin
      .from("files")
      .select("id, original_filename, created_at")
      .eq("id", brochureId)
      .maybeSingle();
    brochureMeta = data ?? null;
  }

  const { data: variants, error: varErr } = await supabaseAdmin
    .from("product_variants")
    .select("id, sku, size_label, width_cm, length_cm, total_sqcm, is_active, bulk_enabled, base_unit_price, updated_at")
    .eq("product_id", productId)
    .order("sku", { ascending: true });

  const variantIds = (variants ?? []).map((v: any) => v.id).filter(Boolean);
  let inventoryRows: any[] = [];
  if (variantIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("product_variant_inventory")
      .select("variant_id, qty_on_hand, updated_at")
      .in("variant_id", variantIds);
    inventoryRows = data ?? [];
  }

  return (
    <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            <Link href="/admin/products" style={{ textDecoration: "none", fontWeight: 950 }}>
              ← Products
            </Link>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 950, margin: "8px 0 0", letterSpacing: -0.2 }}>{product.name}</h1>

          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={pillActive(!!product.is_active)}>{product.is_active ? "ACTIVE" : "INACTIVE"}</span>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Code: <b>{product.code ?? "—"}</b>
            </span>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Q code: <b>{product.qcode ?? "—"}</b>
            </span>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Base unit price: <b>{money(product.base_unit_price)}</b>
            </span>
          </div>

          {saved ? (
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(25,135,84,0.30)",
                background: "rgba(25, 135, 84, 0.10)",
                fontSize: 12,
                fontWeight: 950,
              }}
            >
              Saved.
            </div>
          ) : null}
        </div>
      </div>

      {/* Product editor */}
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 16,
          background: "white",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Product Settings</div>

        <form
          action={`/api/admin/products/${encodeURIComponent(productId)}`}
          method="post"
          style={{ padding: 12, display: "grid", gap: 10 }}
        >
          <input type="hidden" name="product_settings" value="1" />
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Name</div>
            <input
              name="name"
              defaultValue={product.name}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              required
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Code</div>
              <input
                name="code"
                defaultValue={product.code ?? ""}
                placeholder="Optional"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Q code</div>
              <input
                name="qcode"
                defaultValue={product.qcode ?? ""}
                placeholder="Optional"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Base unit price (per 1 sqcm “unit”)</div>
            <input
              name="base_unit_price"
              defaultValue={String(product.base_unit_price ?? 0)}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              required
            />
            <div style={{ fontSize: 12, opacity: 0.7 }}>Variant price = product base unit price × total sqcm.</div>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 4 }}>
            <input type="checkbox" name="bulk_enabled" value="on" defaultChecked={!!(product as any).bulk_enabled} />
            <span style={{ fontWeight: 900, lineHeight: 1.4 }}>
              Enable bulk purchase
              <span style={{ display: "block", fontSize: 12, opacity: 0.7, fontWeight: 700 }}>
                When turned on, all variants are included by default; remove individual lines below. Bulk catalog uses this
                product base price × each variant’s total sq cm.
              </span>
            </span>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <input type="checkbox" name="is_active" defaultChecked={!!product.is_active} />
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
            Save Product
          </button>

          <div style={{ fontSize: 12, opacity: 0.65 }}>
            Tip: after saving a new base price, use <b>Recalculate Prices</b> in Variants to push changes to variants.
          </div>
        </form>
      </div>

      {/* Brochure */}
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 16,
          background: "white",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Product Brochure (NON-PHI)</div>

        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          {brochureId ? (
            <div style={{ fontSize: 13, opacity: 0.85, display: "grid", gap: 6 }}>
              <div>
                Current brochure:{" "}
                <Link
                  href={`/api/admin/files/${encodeURIComponent(brochureId)}/download`}
                  style={{ fontWeight: 950, textDecoration: "none" }}
                >
                  Download
                </Link>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {brochureMeta?.original_filename ? (
                  <>
                    File: <b>{brochureMeta.original_filename}</b> · Uploaded: <b>{dateTime(brochureMeta.created_at)}</b>
                  </>
                ) : (
                  <>Uploaded: <b>{dateTime(product.updated_at)}</b></>
                )}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.8 }}>No brochure uploaded yet.</div>
          )}

          <BrochureUploadClient productId={productId} hasBrochure={!!brochureId} />
        </div>
      </div>

      {/* Variants + Inventory + Recalc (client interactive) */}
      {varErr ? (
        <div style={{ padding: 12, color: "crimson", fontWeight: 950 }}>{varErr.message}</div>
      ) : (
        <VariantsManagerClient
          productId={productId}
          productBulkEnabled={!!(product as any).bulk_enabled}
          variants={(variants ?? []) as any}
          inventoryRows={(inventoryRows ?? []) as any}
        />
      )}

      {/* Create Variant (kept server-rendered; no event handlers) */}
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 16,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Create Variant</div>

        <div style={{ padding: 12 }}>
          <form
            action={`/api/admin/products/${encodeURIComponent(productId)}/variants/create`}
            method="post"
            style={{ display: "grid", gap: 10, maxWidth: 720 }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>SKU (required, unique)</div>
              <input
                name="sku"
                placeholder="e.g. COLL-10x10"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
                required
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Size label</div>
              <input
                name="size_label"
                placeholder="e.g. 10cm x 10cm"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Width (cm)</div>
                <input
                  name="width_cm"
                  placeholder="Optional"
                  style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Length (cm)</div>
                <input
                  name="length_cm"
                  placeholder="Optional"
                  style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Total sqcm</div>
                <input
                  name="total_sqcm"
                  placeholder="Optional"
                  style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
                />
              </label>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Price will auto-calculate from product base unit price × total sqcm. Use “Recalculate Prices” after changing base price.
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" name="is_active" defaultChecked />
              <span style={{ fontWeight: 900 }}>Active</span>
            </label>

            <button
              type="submit"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "rgba(0,0,0,0.04)",
                fontWeight: 950,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              Create Variant
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
