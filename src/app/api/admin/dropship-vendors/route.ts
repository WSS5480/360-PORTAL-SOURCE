import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ADDRESS_SCHEMA = z
  .object({
    company: z.string().optional(),
    attn: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough()
  .optional();

const CREATE_SCHEMA = z
  .object({
    account_id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    address: ADDRESS_SCHEMA,
    notes: z.string().optional().or(z.literal("")),
  })
  .strict();

export async function GET(req: Request) {
  await requireOrdersStaffOrAdmin();

  const { searchParams } = new URL(req.url);
  const accountId = String(searchParams.get("accountId") || "").trim();

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "Missing accountId" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("dropship_vendors")
    .select("id, account_id, name, email, phone, address, notes, disabled_at, created_at")
    .eq("account_id", accountId)
    .is("disabled_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, vendors: data ?? [] });
}

export async function POST(req: Request) {
  await requireOrdersStaffOrAdmin();

  const body = await req.json().catch(() => null);
  const parsed = CREATE_SCHEMA.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const v = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("dropship_vendors")
    .insert({
      account_id: v.account_id,
      name: v.name.trim(),
      email: (v.email || "").trim() || null,
      phone: (v.phone || "").trim() || null,
      address: v.address ?? {},
      notes: (v.notes || "").trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Insert failed" }, { status: 500 });
  return NextResponse.json({ ok: true, vendor: data });
}
