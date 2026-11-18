import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { isInternalPortalAdmin } from "@/lib/sales/isInternalPortalAdmin";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { UpdatePreCallPlanTemplateSchema } from "@/lib/surgical-sales/preCallPlanTemplateSchemas";
import { fetchTemplateById } from "@/lib/surgical-sales/preCallPlanTemplateDb";
import { templateHasPlanFields } from "@/lib/surgical-sales/preCallPlanTemplateApply";
import {
  canDeleteTemplate,
  canEditTemplate,
  serializePreCallPlanTemplate,
  templateContentToDb,
  templateFromDb,
  type PreCallPlanTemplate,
  type PreCallPlanTemplateDbRow,
} from "@/lib/surgical-sales/preCallPlanTemplateModel";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadTemplateDbRow(templateId: string): Promise<PreCallPlanTemplateDbRow | null> {
  const { data, error } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as PreCallPlanTemplateDbRow | null;
}

function mergeTemplateForValidation(
  existing: PreCallPlanTemplate,
  parsed: ReturnType<typeof UpdatePreCallPlanTemplateSchema.parse>,
): PreCallPlanTemplate {
  return {
    ...existing,
    name: parsed.name !== undefined ? parsed.name.trim() : existing.name,
    productLine: parsed.productLine ?? existing.productLine,
    engagementType: parsed.engagementType ?? existing.engagementType,
    procedureFocus: parsed.procedureFocus !== undefined ? parsed.procedureFocus : existing.procedureFocus,
    smartObjective: parsed.smartObjective !== undefined ? parsed.smartObjective : existing.smartObjective,
    openingStatement: parsed.openingStatement !== undefined ? parsed.openingStatement : existing.openingStatement,
    probes: parsed.probes !== undefined ? parsed.probes : existing.probes,
    toolsResources: parsed.toolsResources !== undefined ? parsed.toolsResources : existing.toolsResources,
    valueHypothesis: parsed.valueHypothesis !== undefined ? parsed.valueHypothesis : existing.valueHypothesis,
    plannedClose: parsed.plannedClose !== undefined ? parsed.plannedClose : existing.plannedClose,
    suggestedNextStep:
      parsed.suggestedNextStep !== undefined ? parsed.suggestedNextStep : existing.suggestedNextStep,
    tags: parsed.tags !== undefined ? parsed.tags ?? [] : existing.tags,
    description: parsed.description !== undefined ? parsed.description : existing.description,
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ templateId: string }> }) {
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

  try {
    const template = await fetchTemplateById(templateId, uid);
    if (!template) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, template: serializePreCallPlanTemplate(template) });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load template" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ templateId: string }> }) {
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

  const dbRow = await loadTemplateDbRow(templateId);
  if (!dbRow) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const isPortalAdmin = await isInternalPortalAdmin(uid);
  if (!canEditTemplate(dbRow, uid, { isPortalAdmin })) {
    return NextResponse.json(
      { ok: false, error: dbRow.is_system ? "System templates cannot be edited." : "Forbidden" },
      { status: 403 },
    );
  }

  const existing = await fetchTemplateById(templateId, uid);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = UpdatePreCallPlanTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const merged = mergeTemplateForValidation(existing, parsed.data);
  if (!templateHasPlanFields(merged)) {
    return NextResponse.json({ ok: false, error: "Template must include at least one plan field." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.productLine !== undefined) patch.product_line = parsed.data.productLine;
  if (parsed.data.engagementType !== undefined) patch.template_engagement_type = parsed.data.engagementType;
  if (
    parsed.data.procedureFocus !== undefined ||
    parsed.data.smartObjective !== undefined ||
    parsed.data.openingStatement !== undefined ||
    parsed.data.probes !== undefined ||
    parsed.data.toolsResources !== undefined ||
    parsed.data.valueHypothesis !== undefined ||
    parsed.data.plannedClose !== undefined ||
    parsed.data.suggestedNextStep !== undefined ||
    parsed.data.tags !== undefined ||
    parsed.data.description !== undefined
  ) {
    Object.assign(
      patch,
      templateContentToDb({
        procedureFocus: merged.procedureFocus,
        description: merged.description,
        smartObjective: merged.smartObjective,
        openingStatement: merged.openingStatement,
        probes: merged.probes,
        toolsResources: merged.toolsResources,
        valueHypothesis: merged.valueHypothesis,
        plannedClose: merged.plannedClose,
        suggestedNextStep: merged.suggestedNextStep,
        tags: merged.tags,
      }),
    );
  }

  let q = supabaseAdmin.from("sales_pre_call_plan_templates").update(patch).eq("id", templateId).eq("is_system", false);
  if (!isPortalAdmin) {
    q = q.eq("owner_user_id", uid);
  }

  const { data, error } = await q.select("*").single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    template: serializePreCallPlanTemplate(
      templateFromDb(data as PreCallPlanTemplateDbRow, { isFavorite: existing.isFavorite }),
    ),
  });
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

  const dbRow = await loadTemplateDbRow(templateId);
  if (!dbRow) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const isPortalAdmin = await isInternalPortalAdmin(uid);
  if (!canDeleteTemplate(dbRow, uid, { isPortalAdmin })) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let q = supabaseAdmin.from("sales_pre_call_plan_templates").delete().eq("id", templateId).eq("is_system", false);
  if (!isPortalAdmin) {
    q = q.eq("owner_user_id", uid);
  }

  const { error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
