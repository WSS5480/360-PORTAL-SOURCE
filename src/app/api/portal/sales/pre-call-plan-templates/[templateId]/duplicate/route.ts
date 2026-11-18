import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { fetchTemplateById } from "@/lib/surgical-sales/preCallPlanTemplateDb";
import {
  serializePreCallPlanTemplate,
  templateContentToDb,
  templateFromDb,
  type PreCallPlanTemplateDbRow,
} from "@/lib/surgical-sales/preCallPlanTemplateModel";

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

  const source = await fetchTemplateById(templateId, uid);
  if (!source) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .insert({
      name: `${source.name} (copy)`,
      product_line: source.productLine,
      template_engagement_type: source.engagementType,
      ...templateContentToDb({
        procedureFocus: source.procedureFocus,
        description: source.description,
        smartObjective: source.smartObjective,
        openingStatement: source.openingStatement,
        probes: source.probes,
        toolsResources: source.toolsResources,
        valueHypothesis: source.valueHypothesis,
        plannedClose: source.plannedClose,
        suggestedNextStep: source.suggestedNextStep,
        tags: source.tags,
      }),
      is_system: false,
      owner_user_id: uid,
      duplicated_from_id: source.id,
      created_by_user_id: uid,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    template: serializePreCallPlanTemplate(templateFromDb(data as PreCallPlanTemplateDbRow, { isFavorite: false })),
  });
}
