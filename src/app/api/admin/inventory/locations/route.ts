import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normName(v: unknown): string {
  return String(v ?? "").trim();
}

/** Canonical default when stock exists but no bin list was configured yet (matches migration seed). */
export const DEFAULT_INVENTORY_WAREHOUSE_NAME = "360 Medical Warehouse";

/**
 * One-time: if inventory_locations is empty but lots exist, seed the default warehouse and
 * assign unassigned / DEFAULT lots (same intent as db/migrations/20260403_*).
 */
async function ensureDefaultWarehouseIfNeeded(sb: any) {
  const { data: locs, error: e1 } = await sb.from("inventory_locations").select("id").limit(1);
  if (e1) return;
  if (locs && locs.length > 0) return;

  const { count, error: e2 } = await sb.from("product_variant_lots").select("id", { count: "exact", head: true });
  if (e2 || !(count > 0)) return;

  const name = DEFAULT_INVENTORY_WAREHOUSE_NAME;
  const { error: insErr } = await sb.from("inventory_locations").insert({ name, sort_order: 0 });
  if (insErr && insErr.code !== "23505") {
    return;
  }

  await sb.from("product_variant_lots").update({ location: name }).is("location", null);
  await sb.from("product_variant_lots").update({ location: name }).eq("location", "");
  await sb.from("product_variant_lots").update({ location: name }).eq("location", "DEFAULT");
  await sb.from("product_variant_lots").update({ location: name }).eq("location", "default");
}

export async function GET() {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  await ensureDefaultWarehouseIfNeeded(sb);

  const { data: rows, error } = await sb
    .from("inventory_locations")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    locations: rows ?? [],
  });
}

export async function POST(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const body = await req.json().catch(() => ({}));
  const name = normName((body as any)?.name);

  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("inventory_locations")
    .insert({
      name,
      sort_order: 0,
    })
    .select("id, name, created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, location: data });
}
