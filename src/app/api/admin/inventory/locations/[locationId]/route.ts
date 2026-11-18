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
  { params }: { params: Promise<{ locationId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { locationId } = await Promise.resolve(params as any);
  const id = normName(locationId);
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid locationId" }, { status: 400 });
  }

  const { data: cur, error: cErr } = await sb.from("inventory_locations").select("id, name").eq("id", id).maybeSingle();
  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  if (!cur) return NextResponse.json({ ok: false, error: "Location not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const nameIn = (body as any)?.name;
  const hasName = typeof nameIn === "string";
  const nextName = hasName ? normName(nameIn) : null;

  const oldName = String((cur as any).name ?? "");

  if (hasName) {
    if (!nextName) {
      return NextResponse.json({ ok: false, error: "name cannot be empty" }, { status: 400 });
    }
    if (nextName !== oldName) {
      const { error: upLots } = await sb.from("product_variant_lots").update({ location: nextName }).eq("location", oldName);
      if (upLots) return NextResponse.json({ ok: false, error: upLots.message }, { status: 500 });
    }
  }

  if (!hasName || !nextName) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("inventory_locations")
    .update({ name: nextName })
    .eq("id", id)
    .select("id, name, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, location: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { locationId } = await Promise.resolve(params as any);
  const id = normName(locationId);
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid locationId" }, { status: 400 });
  }

  const { data: cur, error: cErr } = await sb.from("inventory_locations").select("id, name").eq("id", id).maybeSingle();
  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  if (!cur) return NextResponse.json({ ok: false, error: "Location not found" }, { status: 404 });

  const nm = String((cur as any).name ?? "");

  const { count, error: cntErr } = await sb
    .from("product_variant_lots")
    .select("id", { count: "exact", head: true })
    .eq("location", nm);

  if (cntErr) return NextResponse.json({ ok: false, error: cntErr.message }, { status: 500 });
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { ok: false, error: `Cannot delete: ${count} lot row(s) still reference “${nm}”. Move or rename lots first.` },
      { status: 409 }
    );
  }

  const { error: delErr } = await sb.from("inventory_locations").delete().eq("id", id);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
