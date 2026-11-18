import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function norm(v: any) {
  try {
    return decodeURIComponent(String(v ?? "")).trim();
  } catch {
    return String(v ?? "").trim();
  }
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const url = new URL(req.url);
  const variantId = norm(url.searchParams.get("variantId"));
  const limitRaw = norm(url.searchParams.get("limit"));
  const q = norm(url.searchParams.get("q")) || "";
  const limit = Math.max(1, Math.min(500, Number(limitRaw || "150") || 150));

  if (!UUID_RE.test(variantId)) {
    return NextResponse.json({ ok: false, error: "Invalid variantId" }, { status: 400 });
  }

  let query = sb
    .from("product_variant_lots")
    .select("id, variant_id, lot_number, serial_number, expiration_date, qty, raw_scan, location, created_at")
    .eq("variant_id", variantId)
    .gt("qty", 0);

  if (q) {
    // case-insensitive contains across lot_number / serial_number / location
    // Supabase: use or() with ilike
    const esc = q.replace(/,/g, " "); // avoid breaking or() csv
    query = query.or(`lot_number.ilike.%${esc}%,serial_number.ilike.%${esc}%,location.ilike.%${esc}%`);
  }

  const { data, error } = await query
    .order("expiration_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    lots: (data ?? []).map((r: any) => ({
      id: String(r.id),
      variant_id: String(r.variant_id),
      lot_number: r.lot_number,
      serial_number: r.serial_number,
      expiration_date: r.expiration_date,
      qty: safeNum(r.qty),
      raw_scan: r.raw_scan,
      location: r.location,
      created_at: r.created_at,
    })),
  });
}
