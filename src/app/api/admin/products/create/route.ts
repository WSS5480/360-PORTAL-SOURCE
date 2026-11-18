import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseMoneyLike(v: unknown): number {
  const raw = String(v ?? "").trim();
  // Allow: "3000", "3,000", "$3,000.50"
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return n;
}

export async function POST(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const codeRaw = String(form.get("code") ?? "").trim();
  const qcodeRaw = String(form.get("qcode") ?? "").trim();
  const isActive = form.get("is_active") === "on";

  const baseUnitPrice = parseMoneyLike(form.get("base_unit_price"));
  if (!Number.isFinite(baseUnitPrice) || baseUnitPrice < 0) {
    return NextResponse.json(
      { ok: false, error: "Base unit price must be a non-negative number (commas are allowed)." },
      { status: 400 }
    );
  }

  if (!name) return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });

  const { data, error } = await sb
    .from("products")
    .insert({
      name,
      code: codeRaw ? codeRaw : null,
      qcode: qcodeRaw ? qcodeRaw : null,
      base_unit_price: baseUnitPrice,
      is_active: isActive,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.redirect(urlFromRequest(req, `/admin/products/${encodeURIComponent(String(data.id))}`));
}
