import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z.object({
  partner_account_ref: z.string().trim().min(1).max(128),
  account_id: z.string().uuid(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { partnerId } = await params;
  if (!UUID_RE.test(partnerId)) {
    return NextResponse.json({ ok: false, error: "Partner not found." }, { status: 404 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Account mapping is invalid." }, { status: 422 });
  }

  const sb = createSupabaseAdminClient();
  const [{ data: partner }, { data: account }] = await Promise.all([
    sb.from("integration_partners").select("id").eq("id", partnerId).maybeSingle(),
    sb.from("accounts").select("id, name").eq("id", parsed.data.account_id).maybeSingle(),
  ]);
  if (!partner) return NextResponse.json({ ok: false, error: "Partner not found." }, { status: 404 });
  if (!account) return NextResponse.json({ ok: false, error: "Account not found." }, { status: 422 });

  const { data, error } = await sb
    .from("integration_partner_accounts")
    .insert({
      partner_id: partnerId,
      partner_account_ref: parsed.data.partner_account_ref,
      account_id: parsed.data.account_id,
      created_by_user_id: auth.ctx.userId,
    })
    .select("id, partner_account_ref, account_id, created_at")
    .single();

  if (error) {
    const message = /duplicate|unique/i.test(error.message)
      ? "That external account reference is already mapped for this partner."
      : "The account mapping could not be saved.";
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, mapping: { ...data, account_name: account.name } });
}
