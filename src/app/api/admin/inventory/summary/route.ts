import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type VariantRow = {
  id: string;
  product_id: string | null;
  sku: string;
  size_label: string | null;
  is_active: boolean;
};

type ProductRow = { id: string; name: string | null };

type InventoryRow = { variant_id: string; qty_on_hand: number };

type LotLocRow = { variant_id: string; location: string | null; raw_scan: string | null };

type SummaryRow = {
  variant_id: string;
  product_id: string | null;
  sku: string;
  product_name: string | null;
  size_label: string | null;
  is_active: boolean;
  qty_on_hand: number;
  locations: string[];
  locations_count: number;
};

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function safeBool(v: string | null, defaultVal: boolean): boolean {
  if (v === null || v === undefined) return defaultVal;
  const s = String(v).trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes" || s === "y") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n") return false;
  return defaultVal;
}

function safeLimit(v: unknown, fallback: number): number {
  const n = Number(v ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1000, Math.max(50, Math.floor(n)));
}

/**
 * Best-effort location derivation (cheap).
 * Detail lookup is the source of truth.
 */
function deriveLocFromRaw(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // Pattern A: pipe token "LOC=..."
  {
    const m = s.match(/(?:^|\|)\s*LOC\s*=\s*([^|]+)(?:\||$)/i);
    if (m) {
      const loc = norm(m[1]);
      if (loc) return loc;
    }
  }

  // Pattern B: "X/Stock (N)" fragments
  {
    const m = s.match(/\b([A-Za-z0-9]+\/Stock)\b\s*(?:\(\d+\))?/i);
    if (m) {
      const loc = norm(m[1]);
      if (loc) return loc;
    }
  }

  // Pattern C: small known list
  {
    const known = ["WH/Stock", "ADBI/Stock"];
    for (const k of known) {
      if (s.toLowerCase().includes(k.toLowerCase())) return k;
    }
  }

  return null;
}

function addLoc(set: Set<string>, loc: unknown) {
  const v = norm(loc);
  if (v) set.add(v);
}

export async function GET(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const url = new URL(req.url);

  // ✅ q is optional — empty string is fine
  const q = norm(url.searchParams.get("q") ?? "");

  const onlyActive = safeBool(url.searchParams.get("onlyActive"), true);
  const inStockOnly = safeBool(url.searchParams.get("inStockOnly"), true);
  const limit = safeLimit(url.searchParams.get("limit"), 500);

  // 1) Pull variants FIRST (so we can show all products/variants even if qty is 0)
  let vq = sb
    .from("product_variants")
    .select("id, product_id, sku, size_label, is_active")
    .order("sku", { ascending: true })
    .limit(limit);

  if (onlyActive) vq = vq.eq("is_active", true);

  // We can only ilike SKU here; product-name filtering happens after product fetch
  if (q) vq = vq.ilike("sku", `%${q}%`);

  const { data: variantsData, error: vErr } = await vq;
  if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });

  let variants: VariantRow[] = (variantsData ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      product_id: r.product_id ? String(r.product_id) : null,
      sku: String(r.sku ?? ""),
      size_label: r.size_label ? String(r.size_label) : null,
      is_active: !!r.is_active,
    };
  });

  const variantIds = variants.map((v) => v.id).filter(Boolean);
  if (variantIds.length === 0) return NextResponse.json({ ok: true, rows: [] });

  // 2) Product names (bulk)
  const productIds = Array.from(new Set(variants.map((v) => v.product_id).filter(Boolean))) as string[];
  const productsById = new Map<string, string | null>();

  if (productIds.length) {
    const { data: productsData, error: pErr } = await sb.from("products").select("id, name").in("id", productIds);
    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });

    const products: ProductRow[] = (productsData ?? []).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return { id: String(r.id ?? ""), name: r.name !== null && r.name !== undefined ? String(r.name) : null };
    });

    for (const p of products) productsById.set(p.id, p.name);
  }

  // 3) Inventory (bulk)
  const onHandByVariant = new Map<string, number>();
  {
    const { data: invData, error: invErr } = await sb
      .from("product_variant_inventory")
      .select("variant_id, qty_on_hand")
      .in("variant_id", variantIds);

    if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

    const invRows: InventoryRow[] = (invData ?? []).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return { variant_id: String(r.variant_id ?? ""), qty_on_hand: Number(r.qty_on_hand ?? 0) || 0 };
    });

    for (const r of invRows) {
      if (!r.variant_id) continue;
      onHandByVariant.set(r.variant_id, r.qty_on_hand);
    }
  }

  // 4) Locations from lots (bulk + bounded repair)
  const locsByVariant = new Map<string, Set<string>>();

  // Bulk pull. If your lots table is huge, PostgREST can still respond with a subset depending on plan/timeouts.
  // We keep it reasonably high but not unbounded.
  const BULK_LOT_LIMIT = 50000;

  {
    const { data: lotData, error: lErr } = await sb
      .from("product_variant_lots")
      .select("variant_id, location, raw_scan")
      .in("variant_id", variantIds)
      .limit(BULK_LOT_LIMIT);

    if (!lErr) {
      const rows: LotLocRow[] = (lotData ?? []).map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          variant_id: String(r.variant_id ?? ""),
          location: r.location !== null && r.location !== undefined ? String(r.location) : null,
          raw_scan: r.raw_scan !== null && r.raw_scan !== undefined ? String(r.raw_scan) : null,
        };
      });

      for (const rr of rows) {
        if (!rr.variant_id) continue;
        const set = locsByVariant.get(rr.variant_id) ?? new Set<string>();
        addLoc(set, rr.location);
        addLoc(set, deriveLocFromRaw(rr.raw_scan));
        if (set.size) locsByVariant.set(rr.variant_id, set);
      }
    }
  }

  // Repair pass: if bulk didn’t find locations for a variant, query that variant directly.
  // Keep bounded to avoid slow fan-out.
  const needsRepair = variantIds.filter((vid) => {
    const set = locsByVariant.get(vid);
    return !set || set.size === 0;
  });

  const repairIds = needsRepair.slice(0, 80);
  for (const vid of repairIds) {
    const { data: lotData, error } = await sb
      .from("product_variant_lots")
      .select("variant_id, location, raw_scan")
      .eq("variant_id", vid)
      .limit(500);

    if (error) continue;

    const set = new Set<string>();
    for (const row of lotData ?? []) {
      const r = row as Record<string, unknown>;
      addLoc(set, r.location);
      addLoc(set, deriveLocFromRaw(r.raw_scan));
    }
    if (set.size) locsByVariant.set(vid, set);
  }

  // 5) Output rows
  let out: SummaryRow[] = variants.map((v) => {
    const qty = onHandByVariant.get(v.id) ?? 0;
    const locSet = locsByVariant.get(v.id) ?? new Set<string>();
    const locations = Array.from(locSet.values()).sort((a, b) => a.localeCompare(b));

    return {
      variant_id: v.id,
      product_id: v.product_id,
      sku: v.sku,
      product_name: v.product_id ? productsById.get(v.product_id) ?? null : null,
      size_label: v.size_label,
      is_active: v.is_active,
      qty_on_hand: qty,
      locations,
      locations_count: locations.length,
    };
  });

  // 6) Product-name searching (only possible after product fetch)
  if (q) {
    const qq = q.toLowerCase();
    out = out.filter(
      (r) => r.sku.toLowerCase().includes(qq) || String(r.product_name ?? "").toLowerCase().includes(qq)
    );
  }

  // 7) inStockOnly filter at the END (so “show all products” is possible by toggling it off)
  if (inStockOnly) out = out.filter((r) => (Number(r.qty_on_hand ?? 0) || 0) > 0);

  out = out.slice(0, limit);

  return NextResponse.json({ ok: true, rows: out });
}
