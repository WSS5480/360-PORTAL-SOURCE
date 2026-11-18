import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  archived: z.boolean(),
});

export async function POST(req: Request, ctx: { params: Promise<{ inviteId: string }> }) {
  await requireAdminOrStaff();
  const { inviteId } = await ctx.params;

  if (!inviteId || !/^[0-9a-f-]{36}$/i.test(inviteId)) {
    return NextResponse.json({ ok: false, error: "Invalid invite id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Expected JSON { archived: boolean }" }, { status: 400 });
  }

  const { data: inv, error: findErr } = await supabaseAdmin
    .from("account_invites")
    .select("id")
    .eq("id", inviteId)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ ok: false, error: findErr.message }, { status: 500 });
  }
  if (!inv) {
    return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
  }

  const archivedAt = parsed.data.archived ? new Date().toISOString() : null;

  const { error: upErr } = await supabaseAdmin
    .from("account_invites")
    .update({ archived_at: archivedAt })
    .eq("id", inviteId);

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, archived_at: archivedAt });
}
