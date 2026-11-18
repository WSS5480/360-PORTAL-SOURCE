import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const MOVEMENT_SOURCES = new Set([
  "admin_fulfillment_pick",
  "admin_fulfillment_undo",
  "admin_fulfillment_unpick",
]);

type MovementPickRow = {
  id: string;
  fulfillment_id: string;
  fulfillment_item_id: string;
  variant_id: string;
  qty: number;
  lot_row_id: string | null;
  /** GS1 / scan metadata when no lot_row_id */
  meta_lot_number: string | null;
  meta_serial_number: string | null;
  meta_expiration_date: string | null;
  raw_scan: string | null;
  note: string | null;
  is_undo: boolean;
  meta: Record<string, unknown>;
  actor_user_id: string;
  created_at: string;
  undoable: boolean;
};

function movementMatchesFulfillmentPick(m: MovementPickRow, fp: any): boolean {
  const tm = m.created_at ? new Date(m.created_at).getTime() : NaN;
  const tp = fp?.created_at ? new Date(fp.created_at).getTime() : NaN;
  if (!Number.isFinite(tm) || !Number.isFinite(tp) || Math.abs(tm - tp) > 4000) return false;
  return (
    String(fp.fulfillment_item_id ?? "") === m.fulfillment_item_id &&
    String(fp.variant_id ?? "") === m.variant_id &&
    safeNum(fp.qty) === m.qty &&
    !!fp.is_undo === m.is_undo
  );
}

function movementRowToPick(
  fulfillmentId: string,
  m: any,
  variantToFulfillmentItemId: Map<string, string>
): MovementPickRow | null {
  const src = String(m?.meta?.source ?? "");
  if (!MOVEMENT_SOURCES.has(src)) return null;

  const isUndo = src === "admin_fulfillment_undo" || src === "admin_fulfillment_unpick";
  const meta = m?.meta ?? {};
  const qtyFromMeta = safeNum((meta as any).qty_picked);
  const qty = qtyFromMeta > 0 ? qtyFromMeta : Math.abs(safeNum(m.delta));
  if (!(qty > 0)) return null;

  const lotRaw = (meta as any).lot_row_id;
  const lotId = lotRaw != null && String(lotRaw).trim() ? String(lotRaw) : null;

  const vid = String(m.variant_id ?? "").trim();
  if (!vid) return null;

  let fiid = String((meta as any).fulfillment_item_id ?? "").trim();
  if (!fiid) {
    fiid = variantToFulfillmentItemId.get(vid) ?? "";
  }
  if (!fiid) return null;

  const mln = (meta as any).lot_number;
  const msn = (meta as any).serial_number;
  const mex = (meta as any).expiration_date;

  return {
    id: `inv-movement-${String(m.id)}`,
    fulfillment_id: fulfillmentId,
    fulfillment_item_id: fiid,
    variant_id: vid,
    qty,
    lot_row_id: lotId,
    meta_lot_number: mln != null && String(mln).trim() ? String(mln) : null,
    meta_serial_number: msn != null && String(msn).trim() ? String(msn) : null,
    meta_expiration_date: mex != null && String(mex).trim() ? String(mex) : null,
    raw_scan: (meta as any).raw_scan != null ? String((meta as any).raw_scan) : null,
    note: (meta as any).note != null ? String((meta as any).note) : null,
    is_undo: isUndo,
    meta: { derived_from_inventory_movement: true, movement_source: src, original_meta: meta },
    actor_user_id: m.actor_user_id != null ? String(m.actor_user_id) : "",
    created_at: String(m.created_at ?? ""),
    undoable: false,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || "50") || 50));

  const { data: fiRows } = await sb
    .from("fulfillment_items")
    .select("id, variant_id")
    .eq("fulfillment_id", fulfillmentId)
    .limit(2000);

  const variantToFulfillmentItemId = new Map<string, string>();
  for (const r of Array.isArray(fiRows) ? fiRows : []) {
    const v = String((r as any).variant_id ?? "").trim();
    const id = String((r as any).id ?? "").trim();
    if (v && id && !variantToFulfillmentItemId.has(v)) variantToFulfillmentItemId.set(v, id);
  }

  // Preferred: fulfillment_picks table
  const { data: picks, error } = await sb
    .from("fulfillment_picks")
    .select(
      "id, fulfillment_id, fulfillment_item_id, variant_id, qty, lot_row_id, raw_scan, note, is_undo, meta, actor_user_id, created_at"
    )
    .eq("fulfillment_id", fulfillmentId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const fpRows: any[] = Array.isArray(picks) ? picks : [];

  // Also load inventory_movements: legacy rows may exist without fulfillment_picks, or only some picks were persisted.
  const { data: movements, error: mvErr } = await sb
    .from("inventory_movements")
    .select("id, variant_id, delta, meta, actor_user_id, created_at")
    .eq("meta->>fulfillment_id", fulfillmentId)
    .order("created_at", { ascending: false })
    .limit(500);

  const derived: MovementPickRow[] = [];
  if (!mvErr && Array.isArray(movements)) {
    for (const m of movements) {
      const pr = movementRowToPick(fulfillmentId, m, variantToFulfillmentItemId);
      if (!pr) continue;
      const dup = fpRows.some((fp) => movementMatchesFulfillmentPick(pr, fp));
      if (!dup) derived.push(pr);
    }
  }

  let rows: any[] = [...fpRows, ...derived];
  rows.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  rows = rows.slice(0, limit);

  // Hydrate lot info (no FK relationship required)
  const lotIds = Array.from(
    new Set(rows.map((p: any) => (p?.lot_row_id ? String(p.lot_row_id) : "")).filter(Boolean))
  );

  const lotMap = new Map<
    string,
    { lot_number: string | null; serial_number: string | null; expiration_date: string | null; location: string | null }
  >();

  if (lotIds.length) {
    const { data: lots, error: lotErr } = await sb
      .from("product_variant_lots")
      .select("id, lot_number, serial_number, expiration_date, location")
      .in("id", lotIds as any);

    if (!lotErr) {
      for (const l of lots ?? []) {
        lotMap.set(String((l as any).id), {
          lot_number: (l as any).lot_number ?? null,
          serial_number: (l as any).serial_number ?? null,
          expiration_date: (l as any).expiration_date ?? null,
          location: (l as any).location ?? null,
        });
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      picks: rows.map((p: any) => {
        const lotId = p.lot_row_id ? String(p.lot_row_id) : null;
        const li = lotId ? lotMap.get(lotId) : null;
        const undoable = typeof p.undoable === "boolean" ? p.undoable : true;

        return {
          id: String(p.id),
          fulfillment_id: String(p.fulfillment_id),
          fulfillment_item_id: String(p.fulfillment_item_id),
          variant_id: String(p.variant_id),
          qty: safeNum(p.qty),
          lot_row_id: lotId,
          lot_number: li?.lot_number ?? p.meta_lot_number ?? null,
          serial_number: li?.serial_number ?? p.meta_serial_number ?? null,
          expiration_date: li?.expiration_date ?? p.meta_expiration_date ?? null,
          location: li?.location ?? null,
          raw_scan: p.raw_scan ?? null,
          note: p.note ?? null,
          is_undo: !!p.is_undo,
          meta: p.meta ?? {},
          actor_user_id: String(p.actor_user_id),
          created_at: p.created_at,
          undoable,
        };
      }),
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
