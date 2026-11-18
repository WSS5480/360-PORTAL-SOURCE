import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BaseSchema = z.object({
  provider_name: z.string().min(1, "provider_name is required"),
  provider_npi: z.string().min(1, "provider_npi is required"),
  provider_tax_id: z.string().min(1, "provider_tax_id is required"),
  provider_ptan: z.string().min(1, "provider_ptan is required"),
  address1: z.string().min(1, "address1 is required"),
  address2: z.string().nullable().optional(),
  city: z.string().min(1, "city is required"),
  state: z.string().min(1, "state is required"),
  zip: z.string().min(1, "zip is required"),
  office_contact_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  phone_ext: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  is_default: z.boolean().optional().default(false),
});

const PatchSchema = BaseSchema.extend({
  id: z.string().uuid("id must be a uuid"),
});

export async function GET() {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  if (!ctx.currentAccountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("account_provider_profiles")
    .select("*")
    .eq("account_id", ctx.currentAccountId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, profiles: data || [] });
}

export async function POST(req: Request) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  if (!ctx.currentAccountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  // If setting default, clear other defaults for this account first
  if (parsed.data.is_default) {
    await supabaseAdmin
      .from("account_provider_profiles")
      .update({ is_default: false })
      .eq("account_id", ctx.currentAccountId);
  }

  const { data, error } = await supabaseAdmin
    .from("account_provider_profiles")
    .insert({
      account_id: ctx.currentAccountId,
      provider_name: parsed.data.provider_name.trim(),
      provider_npi: parsed.data.provider_npi.trim(),
      provider_tax_id: parsed.data.provider_tax_id.trim(),
      provider_ptan: parsed.data.provider_ptan.trim(),
      address1: parsed.data.address1.trim(),
      address2: parsed.data.address2 ?? null,
      city: parsed.data.city.trim(),
      state: parsed.data.state.trim(),
      zip: parsed.data.zip.trim(),
      office_contact_name: parsed.data.office_contact_name ?? null,
      phone: parsed.data.phone ?? null,
      phone_ext: parsed.data.phone_ext ?? null,
      fax: parsed.data.fax ?? null,
      is_default: Boolean(parsed.data.is_default),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, profile: data });
}

export async function PATCH(req: Request) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  if (!ctx.currentAccountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  // Ensure the profile belongs to this account
  const { data: existing, error: getErr } = await supabaseAdmin
    .from("account_provider_profiles")
    .select("id,account_id")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (getErr) return NextResponse.json({ ok: false, error: getErr.message }, { status: 500 });
  if (!existing || existing.account_id !== ctx.currentAccountId) {
    return NextResponse.json({ ok: false, error: "Profile not found for this account" }, { status: 404 });
  }

  // If setting default, clear other defaults for this account first
  if (parsed.data.is_default) {
    await supabaseAdmin
      .from("account_provider_profiles")
      .update({ is_default: false })
      .eq("account_id", ctx.currentAccountId);
  }

  const { data, error } = await supabaseAdmin
    .from("account_provider_profiles")
    .update({
      provider_name: parsed.data.provider_name.trim(),
      provider_npi: parsed.data.provider_npi.trim(),
      provider_tax_id: parsed.data.provider_tax_id.trim(),
      provider_ptan: parsed.data.provider_ptan.trim(),
      address1: parsed.data.address1.trim(),
      address2: parsed.data.address2 ?? null,
      city: parsed.data.city.trim(),
      state: parsed.data.state.trim(),
      zip: parsed.data.zip.trim(),
      office_contact_name: parsed.data.office_contact_name ?? null,
      phone: parsed.data.phone ?? null,
      phone_ext: parsed.data.phone_ext ?? null,
      fax: parsed.data.fax ?? null,
      is_default: Boolean(parsed.data.is_default),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("account_id", ctx.currentAccountId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, profile: data });
}
