import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { CreatePreCallPlanTemplateSchema } from "@/lib/surgical-sales/preCallPlanTemplateSchemas";
import { fetchTemplatesForUser } from "@/lib/surgical-sales/preCallPlanTemplateDb";
import { templateHasPlanFields } from "@/lib/surgical-sales/preCallPlanTemplateApply";
import {
  serializePreCallPlanTemplate,
  templateContentToDb,
  templateFromDb,
  type PreCallPlanTemplateDbRow,
} from "@/lib/surgical-sales/preCallPlanTemplateModel";

export const dynamic = "force-dynamic";

const ListQuerySchema = z.object({
  product_line: z.string().optional(),
  productLine: z.string().optional(),
  template_engagement_type: z.string().optional(),
  engagementType: z.string().optional(),
  favorites_only: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse({
    product_line: url.searchParams.get("product_line") ?? undefined,
    productLine: url.searchParams.get("productLine") ?? undefined,
    template_engagement_type: url.searchParams.get("template_engagement_type") ?? undefined,
    engagementType: url.searchParams.get("engagementType") ?? undefined,
    favorites_only: url.searchParams.get("favorites_only") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const templates = await fetchTemplatesForUser(uid, parsed.data);
    return NextResponse.json({ ok: true, templates: templates.map(serializePreCallPlanTemplate) });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load templates" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = CreatePreCallPlanTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const content = {
    procedureFocus: parsed.data.procedureFocus,
    description: parsed.data.description,
    smartObjective: parsed.data.smartObjective,
    openingStatement: parsed.data.openingStatement,
    probes: parsed.data.probes,
    toolsResources: parsed.data.toolsResources,
    valueHypothesis: parsed.data.valueHypothesis,
    plannedClose: parsed.data.plannedClose,
    suggestedNextStep: parsed.data.suggestedNextStep,
    tags: parsed.data.tags,
  };
  if (!templateHasPlanFields(content)) {
    return NextResponse.json({ ok: false, error: "Template must include at least one plan field." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sales_pre_call_plan_templates")
    .insert({
      name: parsed.data.name.trim(),
      product_line: parsed.data.productLine,
      template_engagement_type: parsed.data.engagementType,
      ...templateContentToDb(content),
      is_system: false,
      owner_user_id: uid,
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
