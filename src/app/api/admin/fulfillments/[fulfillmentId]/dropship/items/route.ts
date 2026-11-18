import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return UUID_RE.test(s) ? s : "";
}

async function getFulfillmentIdFromCtx(ctx: any): Promise<string> {
  const maybeParams = ctx?.params;
  const resolved = maybeParams && typeof maybeParams?.then === "function" ? await maybeParams : maybeParams;
  return normalizeUuid(resolved?.fulfillmentId);
}

function safeQty(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentIdFromCtx(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });

  const { data: f, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, status, fulfillment_source, order_id")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr || !f) {
    return NextResponse.json({ ok: false, error: fErr?.message || "Fulfillment not found" }, { status: 404 });
  }

  const source = String((f as any).fulfillment_source || "").toUpperCase();
  if (source !== "DROPSHIP") {
    return NextResponse.json({ ok: false, error: "Fulfillment is not DROPSHIP" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return NextResponse.json({ ok: false, error: "No items provided" }, { status: 400 });

  for (const it of items) {
    const variantId = normalizeUuid(it?.variant_id);
    if (!variantId) {
      return NextResponse.json({ ok: false, error: "Invalid variant_id" }, { status: 400 });
    }

    /** Set dropship qty to exactly 0: remove line (and trace rows) so inventory picking is available again */
    if (it?.absolute === true) {
      const targetQty = Math.max(0, Math.floor(safeNum(it?.qty)));
      if (targetQty !== 0) {
        return NextResponse.json(
          { ok: false, error: "absolute mode only supports qty 0 (clear dropship line)." },
          { status: 400 }
        );
      }

      const { data: existing } = await supabaseAdmin
        .from("fulfillment_items")
        .select("id")
        .eq("fulfillment_id", fulfillmentId)
        .eq("variant_id", variantId)
        .maybeSingle();

      if (existing?.id) {
        const { error: tErr } = await supabaseAdmin
          .from("fulfillment_item_trace")
          .delete()
          .eq("fulfillment_item_id", String(existing.id));
        if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });

        const { error: dErr } = await supabaseAdmin.from("fulfillment_items").delete().eq("id", String(existing.id));
        if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });
      }
      continue;
    }

    const qty = safeQty(it?.qty);
    if (qty <= 0) continue;

    let orderItemId = normalizeUuid(it?.order_item_id);
    if (!orderItemId && (f as any).order_id) {
      const { data: oi } = await supabaseAdmin
        .from("order_items")
        .select("id")
        .eq("order_id", (f as any).order_id)
        .eq("variant_id", variantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      orderItemId = oi?.id ? String(oi.id) : "";
    }
    if (!orderItemId) {
      return NextResponse.json({ ok: false, error: "Missing order_item_id for dropship item." }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("fulfillment_items")
      .select("id, required_qty")
      .eq("fulfillment_id", fulfillmentId)
      .eq("variant_id", variantId)
      .maybeSingle();

    if (existing?.id) {
      const nextQty = safeQty(existing.required_qty) + qty;
      const { error: uErr } = await supabaseAdmin
        .from("fulfillment_items")
        .update({ required_qty: nextQty, order_item_id: orderItemId })
        .eq("id", existing.id);
      if (uErr) {
        return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
      }
    } else {
      const { error: insErr } = await supabaseAdmin.from("fulfillment_items").insert({
        fulfillment_id: fulfillmentId,
        order_item_id: orderItemId,
        variant_id: variantId,
        description: String(it?.description || "Item"),
        required_qty: qty,
        picked_qty: 0,
        uom: String(it?.uom || "Units"),
        sort_order: typeof it?.sort_order === "number" ? it.sort_order : null,
      });
      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
