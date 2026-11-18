import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CreateSchema = z.object({
  provider_name: z.string().min(2),
  provider_npi: z.string().optional().or(z.literal("")),
  provider_tax_id: z.string().optional().or(z.literal("")),
  provider_ptan: z.string().optional().or(z.literal("")),
  address1: z.string().optional().or(z.literal("")),
  address2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  office_contact_name: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  phone_ext: z.string().optional().or(z.literal("")),
  fax: z.string().optional().or(z.literal("")),
  is_default: z.boolean().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  await requireAdmin();

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) return NextResponse.json({ ok: false, error: "Invalid accountId" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("account_provider_profiles")
    .select("*")
    .eq("account_id", accountId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profiles: data || [] });
}

export async function POST(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  await requireAdmin();

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) return NextResponse.json({ ok: false, error: "Invalid accountId" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  if (parsed.data.is_default) {
    await supabaseAdmin
      .from("account_provider_profiles")
      .update({ is_default: false })
      .eq("account_id", accountId)
      .eq("is_default", true);
  }

  const { data, error } = await supabaseAdmin
    .from("account_provider_profiles")
    .insert({
      account_id: accountId,
      provider_name: parsed.data.provider_name,
      provider_npi: parsed.data.provider_npi || null,
      provider_tax_id: parsed.data.provider_tax_id || null,
      provider_ptan: parsed.data.provider_ptan || null,
      address1: parsed.data.address1 || null,
      address2: parsed.data.address2 || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      zip: parsed.data.zip || null,
      office_contact_name: parsed.data.office_contact_name || null,
      phone: parsed.data.phone || null,
      phone_ext: parsed.data.phone_ext || null,
      fax: parsed.data.fax || null,
      is_default: parsed.data.is_default ?? false,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}
