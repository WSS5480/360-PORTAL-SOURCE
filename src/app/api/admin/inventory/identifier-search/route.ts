import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LotRow = {
  id: string;
  variant_id: string;
  lot_number: string | null;
  serial_number: string | null;
  expiration_date: string | null;
  qty: number;
  location: string | null;
  raw_scan: string | null;
  created_at: string;
};

type VariantRow = {
  id: string;
  sku: string;
  product_id: string | null;
  size_label: string | null;
  is_active: boolean;
};

type ProductRow = {
  id: string;
  name: string | null;
};

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function safeLimit(v: unknown, fallback: number): number {
  const n = Number(v ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(500, Math.max(25, Math.floor(n)));
}

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

  // Pattern B: "WH/Stock (N)" / "ADBI/Stock (N)" fragments
  {
    const m = s.match(/\b([A-Za-z0-9]+\/Stock)\b\s*(?:\(\d+\))?/i);
    if (m) {
      const loc = norm(m[1]);
      if (loc) return loc;
    }
  }

  // Pattern C: tiny known tokens
  {
    const known = ["WH/Stock", "ADBI/Stock"];
    for (const k of known) {
      if (s.toLowerCase().includes(k.toLowerCase())) return k;
    }
  }

  return null;
}

export async function GET(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const url = new URL(req.url);
  const q = norm(url.searchParams.get("q"));
  const limit = safeLimit(url.searchParams.get("limit"), 200);

  if (!q) return NextResponse.json({ ok: false, error: "Missing q." }, { status: 400 });

  // We search both:
  // - lot_number (your import puts the identifier here)
  // - serial_number (future/GS1)
  // - raw_scan (fallback)
  // NOTE: PostgREST `or` must be a single string.
  const like = `%${q}%`;

  const { data: lotData, error: lotErr } = await sb
    .from("product_variant_lots")
    .select("id, variant_id, lot_number, serial_number, expiration_date, qty, location, raw_scan, created_at")
    .or(`lot_number.ilike.${like},serial_number.ilike.${like},raw_scan.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (lotErr) return NextResponse.json({ ok: false, error: lotErr.message }, { status: 500 });

  const lots: LotRow[] = (lotData ?? []).map((row: any) => ({
    id: String(row?.id ?? ""),
    variant_id: String(row?.variant_id ?? ""),
    lot_number: row?.lot_number ?? null,
    serial_number: row?.serial_number ?? null,
    expiration_date: row?.expiration_date ?? null,
    qty: Number(row?.qty ?? 0) || 0,
    location: row?.location ?? null,
    raw_scan: row?.raw_scan ?? null,
    created_at: String(row?.created_at ?? ""),
  }));

  const variantIds = Array.from(new Set(lots.map((r) => r.variant_id).filter(Boolean)));
  if (variantIds.length === 0) return NextResponse.json({ ok: true, rows: [] });

  const { data: vData, error: vErr } = await sb
    .from("product_variants")
    .select("id, sku, product_id, size_label, is_active")
    .in("id", variantIds);

  if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });

  const variants: VariantRow[] = (vData ?? []).map((row: any) => ({
    id: String(row?.id ?? ""),
    sku: String(row?.sku ?? ""),
    product_id: row?.product_id ? String(row.product_id) : null,
    size_label: row?.size_label ?? null,
    is_active: !!row?.is_active,
  }));

  const variantsById = new Map<string, VariantRow>();
  for (const v of variants) variantsById.set(v.id, v);

  const productIds = Array.from(new Set(variants.map((v) => v.product_id).filter(Boolean))) as string[];
  const productsById = new Map<string, string | null>();

  if (productIds.length) {
    const { data: pData, error: pErr } = await sb.from("products").select("id, name").in("id", productIds);
    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
    const products: ProductRow[] = (pData ?? []).map((row: any) => ({
      id: String(row?.id ?? ""),
      name: row?.name !== null && row?.name !== undefined ? String(row.name) : null,
    }));
    for (const p of products) productsById.set(p.id, p.name);
  }

  const out = lots
    .map((r) => {
      const v = variantsById.get(r.variant_id);
      if (!v) return null;

      const derived_location = !r.location ? deriveLocFromRaw(r.raw_scan) : null;
      const loc = norm(r.location ?? derived_location) || null;

      const identifier =
        norm(r.serial_number) || norm(r.lot_number) || (norm(r.raw_scan) ? norm(r.raw_scan) : "");

      return {
        lot_row_id: r.id,
        variant_id: r.variant_id,
        sku: v.sku,
        product_id: v.product_id,
        product_name: v.product_id ? productsById.get(v.product_id) ?? null : null,
        size_label: v.size_label,
        is_active: v.is_active,
        identifier: identifier || null,
        qty: r.qty,
        expiration_date: r.expiration_date,
        location: loc,
        created_at: r.created_at,
      };
    })
    .filter(Boolean)
    .slice(0, limit);

  return NextResponse.json({ ok: true, rows: out });
}
