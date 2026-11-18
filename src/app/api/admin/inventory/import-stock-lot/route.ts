import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type StockLotRow = {
  lot_serial: string;
  product: string | null;
  qty: number;
  created_on: string | null;
};

function safeInt(v: unknown, fallback: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function extractSku(product: string | null): string | null {
  const s = String(product ?? "").trim();
  if (!s) return null;
  const m = s.match(/^\s*\[([^\]]+)\]/);
  if (!m) return null;
  return String(m[1]).trim() || null;
}

function parseLocationHeader(lotSerialCell: string): string | null {
  const s = String(lotSerialCell ?? "").trim();
  if (!s) return null;

  // Matches: "ADBI/Stock (8)" -> "ADBI/Stock"
  const m = s.match(/^(.+?)\s*\(\s*\d+\s*\)\s*$/);
  if (!m) return null;

  const loc = String(m[1]).trim();
  return loc || null;
}

export async function POST(req: Request) {
  const ctx = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const body = await req.json().catch(() => ({}));
  const rowsIn = (body as any)?.rows as any[] | undefined;
  const reason = String((body as any)?.reason ?? "Initial on-hand import").trim() || "Initial on-hand import";

  if (!Array.isArray(rowsIn) || rowsIn.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing rows[]. Paste/import rows as JSON from the client." },
      { status: 400 }
    );
  }

  const rows: StockLotRow[] = rowsIn.map((r) => ({
    lot_serial: String(r?.["Lot/Serial Number"] ?? r?.lot_serial ?? "").trim(),
    product:
      r?.Product != null ? String(r.Product) : r?.product != null ? String(r.product) : null,
    qty: safeInt(r?.["On Hand Quantity"] ?? r?.qty, 0),
    created_on: r?.["Created on"]
      ? new Date(r["Created on"]).toISOString()
      : r?.created_on
      ? String(r.created_on)
      : null,
  }));

  // Infer location sections
  let currentLocation: string | null = "DEFAULT";
  const items: Array<{
    location: string | null;
    sku: string;
    lot_serial: string;
    qty: number;
    created_on: string | null;
    product: string | null;
  }> = [];

  for (const r of rows) {
    const hasProduct = !!String(r.product ?? "").trim();

    // Location header rows have Product blank
    if (!hasProduct) {
      const maybeLoc = parseLocationHeader(r.lot_serial);
      if (maybeLoc) currentLocation = maybeLoc;
      continue;
    }

    const sku = extractSku(r.product);
    if (!sku) continue;
    if (!r.lot_serial) continue;

    items.push({
      location: currentLocation,
      sku,
      lot_serial: r.lot_serial,
      qty: r.qty > 0 ? r.qty : 1,
      created_on: r.created_on,
      product: r.product,
    });
  }

  if (items.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No importable rows found. Expected Product like [SKU] ... and Lot/Serial Number present.",
      },
      { status: 400 }
    );
  }

  // Resolve variants in bulk
  const uniqueSkus = Array.from(new Set(items.map((x) => x.sku))).slice(0, 5000);
  const skuToVariantId = new Map<string, string>();

  const chunkSize = 500;
  for (let i = 0; i < uniqueSkus.length; i += chunkSize) {
    const chunk = uniqueSkus.slice(i, i + chunkSize);
    const { data, error } = await sb.from("product_variants").select("id, sku").in("sku", chunk);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    for (const row of data ?? []) {
      if (row?.sku && row?.id) skuToVariantId.set(String(row.sku), String(row.id));
    }
  }

  const missingSkus = uniqueSkus.filter((s) => !skuToVariantId.has(s));
  if (missingSkus.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Some SKUs from the import do not exist in product_variants. Fix these SKUs first, then retry.",
        missing_skus: missingSkus.slice(0, 200),
        missing_count: missingSkus.length,
      },
      { status: 400 }
    );
  }

  // Build inserts for trace rows + totals for SET inventory
  const lotRowsToInsert: any[] = [];
  const totalsByVariant = new Map<string, number>();

  for (const it of items) {
    const variantId = skuToVariantId.get(it.sku)!;

    totalsByVariant.set(variantId, (totalsByVariant.get(variantId) ?? 0) + (it.qty || 0));

    // Heuristic: qty 1 = serial (unique per unit), qty > 1 = lot (batch).
    // lot_number is NOT NULL in product_variant_lots, so always set it.
    const isSerialish = (it.qty || 0) === 1;

    lotRowsToInsert.push({
      variant_id: variantId,
      location: it.location ?? "DEFAULT",
      lot_number: it.lot_serial,
      serial_number: isSerialish ? it.lot_serial : null,
      expiration_date: null,
      qty: it.qty || 1,
      raw_scan: `IMPORT|LOC=${it.location ?? "DEFAULT"}|PRODUCT=${String(it.product ?? "").slice(0, 120)}`,
      created_at: it.created_on ?? undefined,
    });
  }

  // Insert trace rows in chunks
  const insertChunkSize = 500;
  for (let i = 0; i < lotRowsToInsert.length; i += insertChunkSize) {
    const chunk = lotRowsToInsert.slice(i, i + insertChunkSize);
    const { error } = await sb.from("product_variant_lots").insert(chunk);
    if (error) return NextResponse.json({ ok: false, error: `Insert failed: ${error.message}` }, { status: 400 });
  }

  // SET qty_on_hand to match imported totals
  const nowIso = new Date().toISOString();
  const actorUserId = String((ctx as any)?.user?.id ?? "") || null;

  const variantIds = Array.from(totalsByVariant.keys());

  // Read existing on-hand in bulk
  const existingMap = new Map<string, number>();
  for (let i = 0; i < variantIds.length; i += chunkSize) {
    const chunk = variantIds.slice(i, i + chunkSize);
    const { data, error } = await sb
      .from("product_variant_inventory")
      .select("variant_id, qty_on_hand")
      .in("variant_id", chunk);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    for (const r of data ?? []) existingMap.set(String(r.variant_id), Number(r.qty_on_hand ?? 0) || 0);
  }

  const invUpserts: any[] = [];
  const movements: any[] = [];

  for (const [variantId, total] of totalsByVariant.entries()) {
    const prior = existingMap.get(variantId) ?? 0;
    const next = total;

    invUpserts.push({ variant_id: variantId, qty_on_hand: next, updated_at: nowIso });

    const delta = next - prior;
    if (actorUserId && delta !== 0) {
      movements.push({
        variant_id: variantId,
        delta,
        resulting_on_hand: next,
        reason,
        actor_user_id: actorUserId,
        meta: {
          source: "admin_inventory_import_stock_lot",
          mode: "set_to_import_total",
          prior_qty_on_hand: prior,
          import_total: next,
        },
        created_at: nowIso,
      });
    }
  }

  for (let i = 0; i < invUpserts.length; i += insertChunkSize) {
    const chunk = invUpserts.slice(i, i + insertChunkSize);
    const { error } = await sb.from("product_variant_inventory").upsert(chunk, { onConflict: "variant_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Best-effort legacy sync
  try {
    const legacyUpserts = invUpserts.map((r) => ({
      variant_id: r.variant_id,
      on_hand: r.qty_on_hand,
      updated_at: r.updated_at,
    }));
    for (let i = 0; i < legacyUpserts.length; i += insertChunkSize) {
      const chunk = legacyUpserts.slice(i, i + insertChunkSize);
      await sb.from("variant_inventory").upsert(chunk, { onConflict: "variant_id" });
    }
  } catch {
    // ignore
  }

  // Best-effort movements
  if (movements.length > 0) {
    try {
      for (let i = 0; i < movements.length; i += insertChunkSize) {
        const chunk = movements.slice(i, i + insertChunkSize);
        await sb.from("inventory_movements").insert(chunk);
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    ok: true,
    imported_rows: items.length,
    affected_variants: totalsByVariant.size,
    missing_skus: [],
  });
}
