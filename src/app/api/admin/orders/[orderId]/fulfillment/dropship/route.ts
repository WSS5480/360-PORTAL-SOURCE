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

export async function POST(_: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const orderId = await getOrderIdFromCtx(ctx);
  if (!orderId) return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });

  // Reuse any OPEN dropship fulfillment if present
  const { data: existing } = await supabaseAdmin
    .from("fulfillments")
    .select("id, status")
    .eq("order_id", orderId)
    .eq("fulfillment_source", "DROPSHIP")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, fulfillment_id: String(existing.id) });
  }

  const { data: created, error } = await supabaseAdmin
    .from("fulfillments")
    .insert({
      order_id: orderId,
      status: "OPEN",
      fulfillment_source: "DROPSHIP",
      dropship_vendor_id: null,
      dropship_status: "NEEDS_VENDOR",
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    return NextResponse.json({ ok: false, error: error?.message || "Failed to create dropship fulfillment" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fulfillment_id: String(created.id) });
}
