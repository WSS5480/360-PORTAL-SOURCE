import Link from "next/link";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

function money(n: any) {
  const v = Number(String(n ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
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

export default async function AdminVariantDetailPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  await requireOrdersStaffOrAdmin();

  const resolved = await params;
  const variantId = normalizeParam(resolved?.variantId ?? "");

  if (!UUID_RE.test(variantId)) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Invalid variantId.</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/products" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Products
          </Link>
        </div>
      </main>
    );
  }

  const { data: variant, error: varErr } = await supabaseAdmin
    .from("product_variants")
    .select(
      "id, product_id, sku, size_label, width_cm, length_cm, total_sqcm, is_active, base_unit_price, created_at, updated_at"
    )
    .eq("id", variantId)
    .maybeSingle();

  if (varErr) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>{varErr.message}</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/products" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Products
          </Link>
        </div>
      </main>
    );
  }

  if (!variant) {
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

  const width = Number(variant.width_cm ?? NaN);
  const length = Number(variant.length_cm ?? NaN);
  const computedSqcm =
    Number.isFinite(width) && Number.isFinite(length) ? (width * length).toFixed(2) : null;

  // ✅ Inventory source of truth used by portal:
  // product_variant_inventory (variant_id, qty_on_hand, updated_at)
  const { data: invRow, error: invErr } = await supabaseAdmin
    .from("product_variant_inventory")
    .select("variant_id, qty_on_hand, updated_at")
    .eq("variant_id", variantId)
    .maybeSingle();

  // If inventory table is missing/misnamed, don't break the whole page:
  const onHand = invErr ? 0 : Number(invRow?.qty_on_hand ?? 0) || 0;

  // Movements table is optional; best-effort load
  let moves: any[] = [];
  try {
    const { data } = await supabaseAdmin
      .from("inventory_movements")
      .select("id, delta, resulting_on_hand, reason, actor_user_id, created_at")
      .eq("variant_id", variantId)
      .order("created_at", { ascending: false })
      .limit(25);
    moves = data ?? [];
  } catch {
    moves = [];
  }

  return (
    <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ fontSize: 13, opacity: 0.8 }}>
        <Link
          href={`/admin/products/${encodeURIComponent(String(variant.product_id))}`}
          style={{ textDecoration: "none", fontWeight: 950 }}
        >
          ← Product
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>{variant.sku}</h1>
          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={pillActive(!!variant.is_active)}>{variant.is_active ? "ACTIVE" : "INACTIVE"}</span>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Current price: <b>{money(variant.base_unit_price)}</b>
            </span>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              On-hand (portal): <b>{onHand}</b>
            </span>
          </div>

          {invErr ? (
            <div style={{ marginTop: 8, color: "crimson", fontWeight: 900, fontSize: 12 }}>
              Inventory read failed: {invErr.message}
            </div>
          ) : null}
        </div>
      </div>

      {/* Variant editor */}
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
          Variant Settings
        </div>

        <form
          action={`/api/admin/variants/${encodeURIComponent(variantId)}`}
          method="post"
          style={{ padding: 12, display: "grid", gap: 10, maxWidth: 900 }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>SKU</div>
            <input
              name="sku"
              defaultValue={variant.sku}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              required
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Size label</div>
            <input
              name="size_label"
              defaultValue={variant.size_label ?? ""}
              placeholder="Optional"
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Width (cm)</div>
              <input
                name="width_cm"
                defaultValue={variant.width_cm ?? ""}
                placeholder="Optional"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Length (cm)</div>
              <input
                name="length_cm"
                defaultValue={variant.length_cm ?? ""}
                placeholder="Optional"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Total sqcm</div>
            <input
              name="total_sqcm"
              defaultValue={variant.total_sqcm ?? ""}
              placeholder={computedSqcm ? `Suggested: ${computedSqcm}` : "Optional"}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
            />
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {computedSqcm
                ? `Computed hint: ${width} × ${length} = ${computedSqcm} sqcm`
                : "Enter sqcm manually, or fill width/length to get a computed hint."}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Price is calculated from <b>product base unit price × total sqcm</b>. Use “Recalculate Prices” on the
              product page after base price changes.
            </div>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <input type="checkbox" name="is_active" defaultChecked={!!variant.is_active} />
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
            Save Variant
          </button>
        </form>
      </div>

      {/* Inventory adjust (NOTE: your current route writes to variant_inventory; we’ll update it next) */}
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
          Inventory
        </div>

        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Current on-hand: <b>{onHand}</b>
          </div>

          <form
            action={`/api/admin/variants/${encodeURIComponent(variantId)}/inventory-adjust`}
            method="post"
            style={{ display: "grid", gap: 10, maxWidth: 720 }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Adjustment (delta)</div>
              <input
                name="delta"
                placeholder="e.g. 10 or -2"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
                required
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Reason</div>
              <input
                name="reason"
                placeholder="e.g. Cycle count correction"
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
                required
              />
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
              Apply Adjustment
            </button>
          </form>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Recent movements</div>
          {(moves ?? []).length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>No movements yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {(moves ?? []).map((m: any) => (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 12,
                    padding: 10,
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 950 }}>
                      {Number(m.delta) >= 0 ? "+" : ""}
                      {m.delta} → {m.resulting_on_hand}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{m.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
