import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PATCH_SCHEMA = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    address: z.any().optional(),
    notes: z.string().optional().or(z.literal("")),
    disable: z.boolean().optional(),
  })
  .strict();

function normId(raw: any) {
  const s = String(raw || "").trim();
  return UUID_RE.test(s) ? s : "";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const { vendorId: vendorIdRaw } = await Promise.resolve(params);
  const vendorId = normId(vendorIdRaw);
  if (!vendorId) return NextResponse.json({ ok: false, error: "Invalid vendorId" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const patch: any = {};
  if (typeof parsed.data.name === "string") patch.name = parsed.data.name.trim();
  if (typeof parsed.data.email === "string") patch.email = parsed.data.email.trim() || null;
  if (typeof parsed.data.phone === "string") patch.phone = parsed.data.phone.trim() || null;
  if (parsed.data.address !== undefined) patch.address = parsed.data.address ?? {};
  if (typeof parsed.data.notes === "string") patch.notes = parsed.data.notes.trim() || null;
  if (parsed.data.disable === true) patch.disabled_at = new Date().toISOString();
  if (parsed.data.disable === false) patch.disabled_at = null;

  const { data, error } = await supabaseAdmin.from("dropship_vendors").update(patch).eq("id", vendorId).select("*").single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Update failed" }, { status: 500 });

  return NextResponse.json({ ok: true, vendor: data });
}
