import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { templateHasPlanFields } from "@/lib/surgical-sales/preCallPlanTemplateApply";
import {
  deleteUserPlaybook,
  fetchAdminPlaybookById,
  updateAdminPlaybook,
} from "@/lib/surgical-sales/preCallPlanTemplateAdminDb";
import { UpdatePreCallPlanTemplateSchema } from "@/lib/surgical-sales/preCallPlanTemplateSchemas";
import {
  serializePreCallPlanTemplate,
  templateContentToDb,
  type PreCallPlanTemplate,
} from "@/lib/surgical-sales/preCallPlanTemplateModel";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mergeTemplate(existing: PreCallPlanTemplate, parsed: ReturnType<typeof UpdatePreCallPlanTemplateSchema.parse>) {
  return {
    ...existing,
    name: parsed.name !== undefined ? parsed.name.trim() : existing.name,
    productLine: parsed.productLine ?? existing.productLine,
    engagementType: parsed.engagementType ?? existing.engagementType,
    status: parsed.status ?? existing.status,
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
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { templateId } = await ctx.params;
  if (!UUID_RE.test(templateId)) {
    return NextResponse.json({ ok: false, error: "Invalid template id" }, { status: 400 });
  }

  try {
    const playbook = await fetchAdminPlaybookById(templateId);
    if (!playbook) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, playbook });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load playbook" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ templateId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { templateId } = await ctx.params;
  if (!UUID_RE.test(templateId)) {
    return NextResponse.json({ ok: false, error: "Invalid template id" }, { status: 400 });
  }

  const existing = await fetchAdminPlaybookById(templateId);
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const raw = await req.json().catch(() => null);
  const parsed = UpdatePreCallPlanTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const merged = mergeTemplate(existing, parsed.data);
  if (!templateHasPlanFields(merged)) {
    return NextResponse.json({ ok: false, error: "Playbook must include at least one plan field." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.productLine !== undefined) patch.product_line = parsed.data.productLine;
  if (parsed.data.engagementType !== undefined) patch.template_engagement_type = parsed.data.engagementType;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
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

  try {
    const template = await updateAdminPlaybook(templateId, patch);
    return NextResponse.json({ ok: true, template: serializePreCallPlanTemplate(template) });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to update playbook" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ templateId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { templateId } = await ctx.params;
  if (!UUID_RE.test(templateId)) {
    return NextResponse.json({ ok: false, error: "Invalid template id" }, { status: 400 });
  }

  try {
    await deleteUserPlaybook(templateId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete playbook";
    const status = message === "Not found" ? 404 : message.includes("cannot be deleted") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
