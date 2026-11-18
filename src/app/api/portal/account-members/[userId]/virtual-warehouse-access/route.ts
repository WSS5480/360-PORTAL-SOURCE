import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isAccountAdmin } from "@/lib/portal/portalRoles";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z.object({
  virtual_warehouse_access: z.boolean(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const portal = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(portal);
  if (unauthorized) return unauthorized;
  const accountId = portal.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });
  }
  if (!isAccountAdmin(portal.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { userId: rawUserId } = await ctx.params;
  const targetUserId = String(rawUserId || "").trim();
  if (!UUID_RE.test(targetUserId)) {
    return NextResponse.json({ ok: false, error: "Invalid userId" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  const { data: row, error: findErr } = await sb
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (findErr) return NextResponse.json({ ok: false, error: findErr.message }, { status: 500 });
  if (!row) {
    return NextResponse.json({ ok: false, error: "User is not a member of this account." }, { status: 404 });
  }

  const { error: updErr } = await sb
    .from("account_users")
    .update({ virtual_warehouse_access: parsed.data.virtual_warehouse_access })
    .eq("account_id", accountId)
    .eq("user_id", targetUserId);

  if (updErr) {
    if (updErr.message?.includes("virtual_warehouse_access") || updErr.code === "42703") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Database column virtual_warehouse_access is missing. Apply migration 20260401_account_users_virtual_warehouse_access.sql.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, virtual_warehouse_access: parsed.data.virtual_warehouse_access });
}
