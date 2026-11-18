import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { normalizeBulkRules } from "@/lib/bulkRules";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * /api/admin/accounts
 *
 * IMPORTANT:
 * - This route has NO dynamic params.
 * - Account-specific updates belong in: /api/admin/accounts/[accountId]
 *
 * We intentionally do NOT export PATCH here, because Next.js will type-check
 * App Router route handlers against the route's actual params.
 */

export async function GET() {
  await requireAdmin();
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const discount_percent =
    typeof body?.discount_percent === "number" && Number.isFinite(body.discount_percent) ? body.discount_percent : 40;
  const payment_terms_days =
    typeof body?.payment_terms_days === "number" && Number.isFinite(body.payment_terms_days)
      ? body.payment_terms_days
      : 30;
  const payment_terms_label =
    typeof body?.payment_terms_label === "string" && body.payment_terms_label.trim()
      ? body.payment_terms_label.trim()
      : `Net ${payment_terms_days} (after delivery)`;

  if (!name) return NextResponse.json({ ok: false, error: "Account name is required." }, { status: 400 });

  const bulk_enabled = body?.bulk_enabled === true;
  const virtual_warehouse_enabled = body?.virtual_warehouse_enabled === true;
  const bulk_rulesRaw = Array.isArray(body?.bulk_rules) ? body.bulk_rules : [];
  const bulk_rules = normalizeBulkRules(
    bulk_rulesRaw.filter(
      (r: any) => r && typeof r.min_sqcm === "number" && typeof r.price_per_sqcm === "number"
    ) as Array<{ min_sqcm: number; price_per_sqcm: number }>
  );

  const { data: created, error } = await supabaseAdmin
    .from("accounts")
    .insert({ name, discount_percent })
    .select("id,name,billing_email,discount_percent,created_at")
    .single();

  if (error || !created) {
    return NextResponse.json({ ok: false, error: error?.message || "Failed to create account" }, { status: 500 });
  }

  await supabaseAdmin.from("account_pricing").insert({
    account_id: created.id,
    discount_percent,
    payment_terms_label,
    payment_terms_days,
    bulk_enabled,
    bulk_rules,
    virtual_warehouse_enabled,
  });

  return NextResponse.json({ ok: true, account: created });
}
