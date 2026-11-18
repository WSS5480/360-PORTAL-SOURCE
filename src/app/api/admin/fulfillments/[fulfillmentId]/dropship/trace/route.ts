import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normId(v: any) {
  const s = String(v || "").trim();
  return UUID_RE.test(s) ? s : "";
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ✅ works whether params is an object OR a Promise
async function getFulfillmentId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const resolved = typeof p?.then === "function" ? await p : p;
  return normId(resolved?.fulfillmentId);
}

/**
 * Accepts BOTH shapes (so nothing breaks):
 *
 * A) Your UI shape:
 *   { items: [{ fulfillment_item_id, lot_number, expiration_date, qty, serials }] }
 *
 * B) Legacy single-row shape:
 *   { fulfillment_item_id, qty, lot_number, serial_number, expiration_date }
 *
 * NOTE: Your DB table does NOT have a `note` column, so we intentionally ignore it.
 */
export async function POST(req: Request, ctx: any) {
  const auth = await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentId(ctx);
  if (!fulfillmentId) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  // ---- Normalize input into an array of entries ----
  let entries: Array<{
    fulfillment_item_id: string;
    lot_number?: string | null;
    expiration_date?: string | null;
    qty?: number | null;
    serials?: string | null; // UI sends this
    serial_number?: string | null; // legacy
  }> = [];

  if (Array.isArray((body as any).items)) {
    entries = (body as any).items;
  } else {
    entries = [body as any];
  }

  if (!entries.length) {
    return NextResponse.json({ ok: false, error: "No items provided" }, { status: 400 });
  }

  const inserted: any[] = [];

  for (const e of entries) {
    const fulfillmentItemId = normId((e as any).fulfillment_item_id);
    if (!fulfillmentItemId) {
      return NextResponse.json({ ok: false, error: "Invalid fulfillment_item_id" }, { status: 400 });
    }

    // Validate line belongs to this fulfillment + get variant_id
    const { data: fi, error: fiErr } = await supabaseAdmin
      .from("fulfillment_items")
      .select("id, fulfillment_id, variant_id")
      .eq("id", fulfillmentItemId)
      .maybeSingle();

    if (fiErr) return NextResponse.json({ ok: false, error: fiErr.message }, { status: 500 });

    if (!fi || String((fi as any).fulfillment_id) !== fulfillmentId) {
      return NextResponse.json({ ok: false, error: "Line does not belong to this fulfillment." }, { status: 400 });
    }

    const variantId = normId((fi as any).variant_id);
    if (!variantId) {
      return NextResponse.json({ ok: false, error: "Line missing variant_id" }, { status: 400 });
    }

    const qty = Math.max(1, Math.floor(safeNum((e as any).qty ?? 1)));
    const lot_number = safeStr((e as any).lot_number) || null;
    const expiration_date = safeStr((e as any).expiration_date) || null;

    // UI sends multi-line "serials"
    const serialsRaw = safeStr((e as any).serials);
    const serial_number_single = safeStr((e as any).serial_number);

    const serials = serialsRaw
      ? serialsRaw
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    if (serials.length > 0) {
      // one row per serial, qty = 1 per serial
      for (const sn of serials) {
        const ins = await supabaseAdmin
          .from("fulfillment_item_trace")
          .insert({
            fulfillment_id: fulfillmentId,
            fulfillment_item_id: fulfillmentItemId,
            variant_id: variantId,
            qty: 1,
            lot_number,
            serial_number: sn,
            expiration_date,
            source: "DROPSHIP",
            created_by_user_id: auth?.user?.id ?? null,
          })
          .select("id, fulfillment_item_id, variant_id, qty, lot_number, serial_number, expiration_date, created_at")
          .single();

        if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });
        inserted.push(ins.data);
      }
    } else {
      // lot-based (or legacy serial_number)
      const ins = await supabaseAdmin
        .from("fulfillment_item_trace")
        .insert({
          fulfillment_id: fulfillmentId,
          fulfillment_item_id: fulfillmentItemId,
          variant_id: variantId,
          qty,
          lot_number,
          serial_number: serial_number_single || null,
          expiration_date,
          source: "DROPSHIP",
          created_by_user_id: auth?.user?.id ?? null,
        })
        .select("id, fulfillment_item_id, variant_id, qty, lot_number, serial_number, expiration_date, created_at")
        .single();

      if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });
      inserted.push(ins.data);
    }
  }

  return NextResponse.json({ ok: true, inserted: inserted.length, traces: inserted });
}
