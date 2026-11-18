import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["inactive", "active", "disabled"]).optional(),
  callback_base_url: z.string().trim().max(300).nullable().optional(),
  auto_create_accounts: z.boolean().optional(),
  allow_direct_sku_match: z.boolean().optional(),
  approved_discount_percent: z.number().min(0).max(100).nullable().optional(),
  approved_payment_terms_days: z.number().int().min(0).max(365).nullable().optional(),
  approved_payment_terms_label: z.string().trim().max(80).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { partnerId } = await params;
  if (!UUID_RE.test(partnerId)) {
    return NextResponse.json({ ok: false, error: "Partner not found." }, { status: 404 });
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Partner update is invalid." }, { status: 422 });

  const sb = createSupabaseAdminClient();
  const { data: partner, error: findError } = await sb
    .from("integration_partners")
    .select(
      "id, environment, status, auto_create_accounts, allow_direct_sku_match, approved_discount_percent, approved_payment_terms_days, approved_payment_terms_label"
    )
    .eq("id", partnerId)
    .maybeSingle();
  if (findError || !partner) return NextResponse.json({ ok: false, error: "Partner not found." }, { status: 404 });

  if (parsed.data.status === "active" && partner.environment === "production") {
    return NextResponse.json(
      { ok: false, error: "Production partners cannot be activated in this release." },
      { status: 409 }
    );
  }

  const nextAuto = parsed.data.auto_create_accounts ?? partner.auto_create_accounts === true;
  const nextDiscount =
    "approved_discount_percent" in parsed.data ? parsed.data.approved_discount_percent : partner.approved_discount_percent;
  const nextTerms =
    "approved_payment_terms_days" in parsed.data ? parsed.data.approved_payment_terms_days : partner.approved_payment_terms_days;
  if (nextAuto && (nextDiscount == null || nextTerms == null)) {
    return NextResponse.json(
      { ok: false, error: "Set an approved discount and payment terms before enabling automatic account creation." },
      { status: 422 }
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("auto_create_accounts" in parsed.data) patch.auto_create_accounts = parsed.data.auto_create_accounts;
  if ("allow_direct_sku_match" in parsed.data) patch.allow_direct_sku_match = parsed.data.allow_direct_sku_match;
  if ("approved_discount_percent" in parsed.data) patch.approved_discount_percent = parsed.data.approved_discount_percent;
  if ("approved_payment_terms_days" in parsed.data) patch.approved_payment_terms_days = parsed.data.approved_payment_terms_days;
  if ("approved_payment_terms_label" in parsed.data) patch.approved_payment_terms_label = parsed.data.approved_payment_terms_label;
  if (parsed.data.name) patch.name = parsed.data.name;
  if (parsed.data.status) patch.status = parsed.data.status;
  if ("callback_base_url" in parsed.data) {
    const raw = parsed.data.callback_base_url;
    if (raw == null || raw.trim() === "") {
      patch.callback_base_url = null;
    } else {
      let url: URL;
      try {
        url = new URL(raw.trim());
      } catch {
        return NextResponse.json({ ok: false, error: "Callback base URL must be a valid HTTPS URL." }, { status: 422 });
      }
      if (url.protocol !== "https:") {
        return NextResponse.json({ ok: false, error: "Callback base URL must use HTTPS." }, { status: 422 });
      }
      patch.callback_base_url = url.toString().replace(/\/$/, "");
    }
  }

  const { data, error } = await sb
    .from("integration_partners")
    .update(patch)
    .eq("id", partnerId)
    .select("id, code, name, environment, status, callback_base_url, updated_at")
    .single();

  if (error || !data) return NextResponse.json({ ok: false, error: "The partner could not be updated." }, { status: 500 });
  return NextResponse.json({ ok: true, partner: data });
}
