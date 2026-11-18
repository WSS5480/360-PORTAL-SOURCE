import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isAccountAdmin } from "@/lib/portal/portalRoles";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  bulk_enabled: z.boolean().optional(),
  virtual_warehouse_enabled: z.boolean().optional(),
});

export async function GET() {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();
  const { data, error } = await sb
    .from("account_pricing")
    .select("bulk_enabled, virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    bulk_enabled: !!(data as any)?.bulk_enabled,
    virtual_warehouse_enabled: !!(data as any)?.virtual_warehouse_enabled,
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });
  }

  if (!isAccountAdmin(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const patch: Record<string, boolean> = {};
  if (parsed.data.bulk_enabled !== undefined) patch.bulk_enabled = parsed.data.bulk_enabled;
  if (parsed.data.virtual_warehouse_enabled !== undefined) patch.virtual_warehouse_enabled = parsed.data.virtual_warehouse_enabled;
  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();
  const { data: existing, error: exErr } = await sb.from("account_pricing").select("id").eq("account_id", accountId).maybeSingle();
  if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });

  if (!existing) {
    const { data: acct } = await sb.from("accounts").select("discount_percent").eq("id", accountId).maybeSingle();
    const discount = Math.min(100, Math.max(0, Number((acct as any)?.discount_percent) || 0));
    const { error: insErr } = await sb.from("account_pricing").insert({
      account_id: accountId,
      discount_percent: discount,
      payment_terms_label: null,
      payment_terms_days: 30,
      bulk_rules: [],
      bulk_enabled: false,
      virtual_warehouse_enabled: false,
      ...patch,
    });
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  } else {
    const { error: updErr } = await sb.from("account_pricing").update(patch).eq("account_id", accountId);
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
