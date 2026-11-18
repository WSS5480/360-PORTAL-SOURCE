import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normName(v: unknown): string {
  return String(v ?? "").trim();
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lotId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { lotId } = await Promise.resolve(params as any);
  const id = normName(lotId);
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid lotId" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const locRaw = (body as any)?.location;
  const location = locRaw === null || locRaw === undefined ? null : normName(locRaw) || null;

  const { data, error } = await sb
    .from("product_variant_lots")
    .update({ location })
    .eq("id", id)
    .select("id, variant_id, location, lot_number, serial_number, qty, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "Lot row not found" }, { status: 404 });

  return NextResponse.json({ ok: true, lot: data });
}
