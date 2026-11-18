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

async function getOrderId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const resolved = typeof p?.then === "function" ? await p : p;
  return normId(resolved?.orderId);
}

export async function GET(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const orderId = await getOrderId(ctx);
  if (!orderId) return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });

  const url = new URL(req.url);
  const fulfillmentIdParam = normId(url.searchParams.get("fulfillmentId"));

  const { data: fulfillments, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, status, fulfillment_source, created_at")
    .eq("order_id", orderId)
    .eq("fulfillment_source", "DROPSHIP")
    .order("created_at", { ascending: false })
    .limit(50);

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });

  const ids = (fulfillments ?? []).map((f: any) => String(f.id)).filter(Boolean);
  let itemsByFulfillment: Record<string, number> = {};

  if (ids.length) {
    const { data: items, error: iErr } = await supabaseAdmin
      .from("fulfillment_items")
      .select("id, fulfillment_id")
      .in("fulfillment_id", ids as any);

    if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

    for (const it of items ?? []) {
      const fid = String((it as any).fulfillment_id || "");
      if (!fid) continue;
      itemsByFulfillment[fid] = (itemsByFulfillment[fid] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    ok: true,
    order_id: orderId,
    fulfillment_id: fulfillmentIdParam || null,
    dropship_fulfillments: (fulfillments ?? []).map((f: any) => ({
      id: String(f.id),
      status: String(f.status || ""),
      created_at: f.created_at ? String(f.created_at) : "",
      item_count: itemsByFulfillment[String(f.id)] ?? 0,
    })),
  });
}
