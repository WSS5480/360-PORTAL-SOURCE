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

type MappedLotRow = LotRow & { derived_location: string | null };

function safeLimit(v: string | null): number {
  const n = Number(v ?? "");
  if (!Number.isFinite(n)) return 200;
  return Math.min(1000, Math.max(25, Math.floor(n)));
}

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function deriveLocFromRaw(raw: unknown): string | null {
  const s = norm(raw);
  if (!s) return null;

  // Expected: IMPORT|LOC=WH/Stock|PRODUCT=...
  const m = s.match(/(?:^|\|)\s*LOC\s*=\s*([^|]+)(?:\||$)/i);
  if (!m) return null;

  const loc = norm(m[1]);
  return loc || null;
}

function getLocKey(r: MappedLotRow): string {
  return norm(r.location ?? r.derived_location ?? "");
}

export async function GET(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb = createSupabaseAdminClient() as any;

  const url = new URL(req.url);

  // ✅ Compatibility: allow either `sku` OR `q` (some older callers used `q`)
  const sku = norm(url.searchParams.get("sku")) || norm(url.searchParams.get("q"));
  const location = norm(url.searchParams.get("location")) || null;
  const limit = safeLimit(url.searchParams.get("limit"));

  if (!sku) {
    // keep message explicit; NEVER "Missing q."
    return NextResponse.json({ ok: false, error: "Missing sku." }, { status: 400 });
  }

  // Variant lookup (avoid brittle relationship names)
  const { data: variantRow, error: vErr } = await sb
    .from("product_variants")
    .select("id, sku, size_label, is_active, product_id")
    .eq("sku", sku)
    .maybeSingle();

  if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
  if (!variantRow) return NextResponse.json({ ok: false, error: `No variant found for SKU: ${sku}` }, { status: 404 });

  const variantId = String(variantRow.id);

  // Product name (separate query so we don't rely on PostgREST relationships)
  let productName: string | null = null;
  if (variantRow.product_id) {
    const { data: pRow } = await sb
      .from("products")
      .select("name")
      .eq("id", String(variantRow.product_id))
      .maybeSingle();
    productName = pRow?.name ? String(pRow.name) : null;
  }

  // On-hand total
  const { data: invRow, error: invErr } = await sb
    .from("product_variant_inventory")
    .select("qty_on_hand")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const qtyOnHand = Number(invRow?.qty_on_hand ?? 0) || 0;

  // Lots
  let qLots = sb
    .from("product_variant_lots")
    .select("id, variant_id, lot_number, serial_number, expiration_date, qty, location, raw_scan, created_at")
    .eq("variant_id", variantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // If you later store location in column, this will work. For now, UI can filter derived locations too.
  if (location) {
    // Keep DB filter for stored location only; derived filtering happens after mapping.
    qLots = qLots.eq("location", location);
  }

  const { data: rowsRaw, error: rErr } = await qLots;
  if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 });

  const mapped: MappedLotRow[] = (rowsRaw ?? []).map((rr: any) => {
    const loc: string | null = rr?.location ?? null;
    const rawScan: string | null = rr?.raw_scan ?? null;
    const derived = !loc ? deriveLocFromRaw(rawScan) : null;

    return {
      id: String(rr?.id ?? ""),
      variant_id: String(rr?.variant_id ?? ""),
      lot_number: rr?.lot_number ?? null,
      serial_number: rr?.serial_number ?? null,
      expiration_date: rr?.expiration_date ?? null,
      qty: Number(rr?.qty ?? 0) || 0,
      location: loc,
      raw_scan: rawScan,
      created_at: String(rr?.created_at ?? ""),
      derived_location: derived,
    };
  });

  const locations = Array.from(
    new Set(mapped.map((row) => getLocKey(row)).filter((s) => !!s))
  ).sort((a, b) => a.localeCompare(b));

  // If user selected a location but it’s derived (not stored in location col), allow client-side filter here
  const finalRows =
    location && mapped.length > 0 ? mapped.filter((row) => getLocKey(row) === location) : mapped;

  return NextResponse.json({
    ok: true,
    variant: {
      id: variantId,
      sku: String(variantRow.sku ?? sku),
      size_label: variantRow.size_label ?? null,
      product_name: productName,
      is_active: !!variantRow.is_active,
    },
    qty_on_hand: qtyOnHand,
    locations,
    rows: finalRows,
  });
}
