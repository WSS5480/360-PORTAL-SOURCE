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

async function getOrderIdFromCtx(ctx: any): Promise<string> {
  const maybeParams = ctx?.params;
  const resolved = maybeParams && typeof maybeParams?.then === "function" ? await maybeParams : maybeParams;
  return normalizeUuid(resolved?.orderId);
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(_: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const orderId = await getOrderIdFromCtx(ctx);
  if (!orderId) return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });

  const { data: fulfillments, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id")
    .eq("order_id", orderId)
    .eq("fulfillment_source", "DROPSHIP");

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });

  const ids = (fulfillments ?? []).map((f: any) => String(f.id)).filter(Boolean);
  if (!ids.length) return NextResponse.json({ ok: true, items: [] });

  const { data: items, error: iErr } = await supabaseAdmin
    .from("fulfillment_items")
    .select("id, fulfillment_id, variant_id, required_qty")
    .in("fulfillment_id", ids as any);

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

  const byVariant: Record<string, number> = {};
  for (const it of items ?? []) {
    const vid = String((it as any).variant_id || "");
    if (!vid) continue;
    byVariant[vid] = safeNum(byVariant[vid]) + safeNum((it as any).required_qty);
  }

  return NextResponse.json({ ok: true, items: byVariant });
}
