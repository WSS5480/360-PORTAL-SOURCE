import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { deleteAccountById } from "@/lib/admin/deleteAccountById";
import { normalizeBulkRules } from "@/lib/bulkRules";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BulkRuleSchema = z.object({
  min_sqcm: z.number().min(0),
  price_per_sqcm: z.number().positive(),
  /** null/omitted = all products; uuid = product-specific */
  product_id: z.string().uuid().nullable().optional(),
});

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  billing_email: z.string().email().nullable().optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  payment_terms_days: z.number().min(0).max(365).optional(),
  payment_terms_label: z.string().min(1).max(120).optional(),
  bulk_enabled: z.boolean().optional(),
  bulk_rules: z.array(BulkRuleSchema).optional(),
  virtual_warehouse_enabled: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  await requireAdmin();

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid accountId" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof parsed.data.name === "string") patch.name = parsed.data.name.trim();
  if ("billing_email" in parsed.data) patch.billing_email = parsed.data.billing_email ?? null;
  if (typeof parsed.data.discount_percent === "number") patch.discount_percent = parsed.data.discount_percent;

  let account: any = null;
  if (Object.keys(patch).length > 0) {
    const { data: updated, error } = await supabaseAdmin
      .from("accounts")
      .update(patch)
      .eq("id", accountId)
      .select("id,name,billing_email,discount_percent,created_at")
      .single();

    if (error || !updated) {
      return NextResponse.json({ ok: false, error: error?.message || "Failed to update account" }, { status: 500 });
    }
    account = updated;
  } else {
    const { data: existing, error } = await supabaseAdmin
      .from("accounts")
      .select("id,name,billing_email,discount_percent,created_at")
      .eq("id", accountId)
      .single();

    if (error || !existing) {
      return NextResponse.json({ ok: false, error: error?.message || "Failed to load account" }, { status: 500 });
    }
    account = existing;
  }

  const pricingPatch: Record<string, unknown> = {};
  if (typeof parsed.data.discount_percent === "number") pricingPatch.discount_percent = parsed.data.discount_percent;
  if (typeof parsed.data.payment_terms_days === "number") pricingPatch.payment_terms_days = parsed.data.payment_terms_days;
  if (typeof parsed.data.payment_terms_label === "string") pricingPatch.payment_terms_label = parsed.data.payment_terms_label;
  if (typeof parsed.data.bulk_enabled === "boolean") pricingPatch.bulk_enabled = parsed.data.bulk_enabled;
  if (Array.isArray(parsed.data.bulk_rules)) {
    pricingPatch.bulk_rules = normalizeBulkRules(parsed.data.bulk_rules);
  }
  if (typeof parsed.data.virtual_warehouse_enabled === "boolean") {
    pricingPatch.virtual_warehouse_enabled = parsed.data.virtual_warehouse_enabled;
  }

  if (Object.keys(patch).length === 0 && Object.keys(pricingPatch).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  if (Object.keys(pricingPatch).length > 0) {
    const { data: currentPricing } = await supabaseAdmin
      .from("account_pricing")
      .select(
        "discount_percent, payment_terms_days, payment_terms_label, bulk_enabled, bulk_rules, virtual_warehouse_enabled"
      )
      .eq("account_id", accountId)
      .maybeSingle();

    await supabaseAdmin.from("account_pricing").upsert({
      account_id: accountId,
      discount_percent:
        pricingPatch.discount_percent ?? currentPricing?.discount_percent ?? account.discount_percent ?? 0,
      payment_terms_days: pricingPatch.payment_terms_days ?? currentPricing?.payment_terms_days ?? null,
      payment_terms_label: pricingPatch.payment_terms_label ?? currentPricing?.payment_terms_label ?? null,
      bulk_enabled: pricingPatch.bulk_enabled ?? currentPricing?.bulk_enabled ?? false,
      bulk_rules: pricingPatch.bulk_rules ?? currentPricing?.bulk_rules ?? [],
      virtual_warehouse_enabled:
        pricingPatch.virtual_warehouse_enabled ?? currentPricing?.virtual_warehouse_enabled ?? false,
    });
  }

  return NextResponse.json({ ok: true, account });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  await requireAdmin();

  const { accountId } = await ctx.params;
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid accountId" }, { status: 400 });
  }

  const result = await deleteAccountById(supabaseAdmin, accountId);
  if (!result.ok) {
    const status = result.error === "Account not found" ? 404 : 500;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, deleted: result.name });
}
