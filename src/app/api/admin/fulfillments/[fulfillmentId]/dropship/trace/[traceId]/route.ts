import { NextResponse } from "next/server";
import { z } from "zod";
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

// Works whether params is object OR Promise
async function getCtxIds(ctx: any): Promise<{ fulfillmentId: string; traceId: string }> {
  const p = ctx?.params;
  const resolved = typeof p?.then === "function" ? await p : p;
  return {
    fulfillmentId: normId(resolved?.fulfillmentId),
    traceId: normId(resolved?.traceId),
  };
}

const PATCH_SCHEMA = z
  .object({
    qty: z.number().optional(),
    lot_number: z.string().optional().or(z.literal("")),
    serial_number: z.string().optional().or(z.literal("")),
    expiration_date: z.string().optional().or(z.literal("")), // YYYY-MM-DD
  })
  .strict();

export async function PATCH(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const { fulfillmentId, traceId } = await getCtxIds(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  if (!traceId) return NextResponse.json({ ok: false, error: "Invalid traceId" }, { status: 400 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  // Ensure trace belongs to this fulfillment (prevents cross-edit)
  const { data: existing, error: eErr } = await supabaseAdmin
    .from("fulfillment_item_trace")
    .select("id, fulfillment_id")
    .eq("id", traceId)
    .maybeSingle();

  if (eErr) return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Trace not found" }, { status: 404 });
  if (String((existing as any).fulfillment_id) !== fulfillmentId) {
    return NextResponse.json({ ok: false, error: "Trace does not belong to this fulfillment." }, { status: 400 });
  }

  const d = parsed.data;

  const updates: any = {};
  if (typeof d.qty === "number") updates.qty = Math.max(1, Math.floor(safeNum(d.qty)));
  if ("lot_number" in d) updates.lot_number = safeStr(d.lot_number) || null;
  if ("serial_number" in d) updates.serial_number = safeStr(d.serial_number) || null;
  if ("expiration_date" in d) updates.expiration_date = safeStr(d.expiration_date) || null;

  if (!Object.keys(updates).length) {
    return NextResponse.json({ ok: false, error: "No changes provided." }, { status: 400 });
  }

  const { data: row, error: uErr } = await supabaseAdmin
    .from("fulfillment_item_trace")
    .update(updates)
    .eq("id", traceId)
    .select("id, fulfillment_item_id, variant_id, qty, lot_number, serial_number, expiration_date, created_at")
    .single();

  if (uErr || !row) return NextResponse.json({ ok: false, error: uErr?.message || "Update failed" }, { status: 500 });

  return NextResponse.json({ ok: true, trace: row });
}

export async function DELETE(_req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const { fulfillmentId, traceId } = await getCtxIds(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  if (!traceId) return NextResponse.json({ ok: false, error: "Invalid traceId" }, { status: 400 });

  // Ensure trace belongs to this fulfillment
  const { data: existing, error: eErr } = await supabaseAdmin
    .from("fulfillment_item_trace")
    .select("id, fulfillment_id")
    .eq("id", traceId)
    .maybeSingle();

  if (eErr) return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Trace not found" }, { status: 404 });
  if (String((existing as any).fulfillment_id) !== fulfillmentId) {
    return NextResponse.json({ ok: false, error: "Trace does not belong to this fulfillment." }, { status: 400 });
  }

  const { error: dErr } = await supabaseAdmin.from("fulfillment_item_trace").delete().eq("id", traceId);
  if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
