// src/lib/fulfillment/syncFulfillmentTrace.ts
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function s(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

export async function syncInventoryTraceForFulfillment(fulfillmentId: string) {
  const sb: any = createSupabaseAdminClient();

  // 1) load picks -> lots (where serials live)
  const { data: picks, error: pickErr } = await sb
    .from("fulfillment_picks")
    .select("id, fulfillment_id, variant_id, lot_row_id, qty")
    .eq("fulfillment_id", fulfillmentId)
    .limit(5000);

  if (pickErr) throw new Error(pickErr.message);

  const lotIds = Array.from(
    new Set((picks ?? []).map((p: any) => String(p.lot_row_id || "")).filter(Boolean))
  );

  if (!lotIds.length) return { inserted: 0 };

  const { data: lots, error: lotErr } = await sb
    .from("product_variant_lots")
    .select("id, lot_number, serial_number, expiration_date")
    .in("id", lotIds as any);

  if (lotErr) throw new Error(lotErr.message);

  const lotMap = new Map<string, any>();
  for (const l of lots ?? []) lotMap.set(String((l as any).id), l);

  // 2) load fulfillment_items so we can map variant_id -> fulfillment_item_id
  const { data: items, error: itemErr } = await sb
    .from("fulfillment_items")
    .select("id, fulfillment_id, variant_id")
    .eq("fulfillment_id", fulfillmentId)
    .limit(5000);

  if (itemErr) throw new Error(itemErr.message);

  const itemByVariant = new Map<string, string>();
  for (const it of items ?? []) {
    const vid = String((it as any).variant_id || "");
    const iid = String((it as any).id || "");
    if (vid && iid && !itemByVariant.has(vid)) itemByVariant.set(vid, iid);
  }

  // 3) load existing trace serials to avoid duplicate inserts
  const { data: existing, error: exErr } = await sb
    .from("fulfillment_item_trace")
    .select("serial_number")
    .eq("fulfillment_id", fulfillmentId)
    .limit(5000);

  if (exErr) throw new Error(exErr.message);

  const existingSerials = new Set(
    (existing ?? [])
      .map((r: any) => s(r.serial_number))
      .filter(Boolean)
  );

  // 4) build insert rows (serial-based)
  const rows: any[] = [];
  for (const p of picks ?? []) {
    const lot = lotMap.get(String((p as any).lot_row_id || ""));
    if (!lot) continue;

    const serial = s((lot as any).serial_number);
    if (!serial) continue;
    if (existingSerials.has(serial)) continue;

    const variantId = String((p as any).variant_id || "");
    const fulfillmentItemId = itemByVariant.get(variantId) || "";

    // If we can't map it, skip (better than inserting invalid FK)
    if (!fulfillmentItemId) continue;

    rows.push({
      fulfillment_id: fulfillmentId,
      fulfillment_item_id: fulfillmentItemId,
      variant_id: variantId,
      source: "INVENTORY",
      lot_number: s((lot as any).lot_number) || null,
      serial_number: serial,
      expiration_date: (lot as any).expiration_date ?? null,
      qty: Number((p as any).qty) || 1,
      created_by_user_id: null,
    });

    existingSerials.add(serial);
  }

  if (!rows.length) return { inserted: 0 };

  const { error: insErr } = await sb.from("fulfillment_item_trace").insert(rows);
  if (insErr) throw new Error(insErr.message);

  return { inserted: rows.length };
}
