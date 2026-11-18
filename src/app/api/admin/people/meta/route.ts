import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Schema = z.object({
  emails: z.array(z.string().min(3)).max(500),
});

function norm(s: string) {
  return String(s || "").trim().toLowerCase();
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const emails = Array.from(new Set(parsed.data.emails.map(norm).filter(Boolean)));
  if (!emails.length) return NextResponse.json({ ok: true, ivrCountByEmail: {}, inviteByEmail: {} });

  const supabase: any = createSupabaseAdminClient();

  // Count IVRs tied to each email via notify_to on verifications.
  // (This reflects who the IVR results were intended for.)
  const { data: verifs, error: vErr } = await supabase
    .from("ivr_insurance_verifications")
    .select("notify_to")
    .in("notify_to", emails);

  if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });

  const ivrCountByEmail: Record<string, number> = {};
  for (const e of emails) ivrCountByEmail[e] = 0;

  for (const row of verifs ?? []) {
    const e = norm(row?.notify_to);
    if (!e) continue;
    ivrCountByEmail[e] = (ivrCountByEmail[e] || 0) + 1;
  }

  // Invite status (latest invite per email)
  const { data: invites, error: iErr } = await supabase
    .from("account_invites")
    .select("id,email,accepted_at,revoked_at,created_at")
    .in("email", emails)
    .order("created_at", { ascending: false });

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

  const inviteByEmail: Record<string, any> = {};
  for (const inv of invites ?? []) {
    const e = norm(inv?.email);
    if (!e) continue;
    if (!inviteByEmail[e]) inviteByEmail[e] = inv; // first is newest due to ordering
  }

  return NextResponse.json({ ok: true, ivrCountByEmail, inviteByEmail });
}
