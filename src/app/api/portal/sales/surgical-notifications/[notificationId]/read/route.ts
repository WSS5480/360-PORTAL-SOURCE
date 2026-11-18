import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(_req: Request, ctx: { params: Promise<{ notificationId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { notificationId } = await ctx.params;
  if (!UUID_RE.test(notificationId)) {
    return NextResponse.json({ ok: false, error: "Invalid notification id" }, { status: 400 });
  }

  const { data: row, error: qErr } = await supabaseAdmin
    .from("surgical_sales_rep_notifications")
    .select("id, user_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (qErr || !row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (String((row as { user_id: string }).user_id) !== uid) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error: uErr } = await supabaseAdmin
    .from("surgical_sales_rep_notifications")
    .update({ read_at: now })
    .eq("id", notificationId);

  if (uErr) {
    return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
