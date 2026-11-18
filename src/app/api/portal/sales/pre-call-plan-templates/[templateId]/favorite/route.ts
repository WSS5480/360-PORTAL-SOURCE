import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { fetchTemplateById } from "@/lib/surgical-sales/preCallPlanTemplateDb";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, ctx: { params: Promise<{ templateId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await ctx.params;
  if (!UUID_RE.test(templateId)) {
    return NextResponse.json({ ok: false, error: "Invalid template id" }, { status: 400 });
  }

  const template = await fetchTemplateById(templateId, uid);
  if (!template) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("sales_pre_call_plan_template_favorites").upsert(
    { user_id: uid, template_id: templateId },
    { onConflict: "user_id,template_id", ignoreDuplicates: true },
  );
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, is_favorite: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ templateId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await ctx.params;
  if (!UUID_RE.test(templateId)) {
    return NextResponse.json({ ok: false, error: "Invalid template id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("sales_pre_call_plan_template_favorites")
    .delete()
    .eq("user_id", uid)
    .eq("template_id", templateId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, is_favorite: false });
}
