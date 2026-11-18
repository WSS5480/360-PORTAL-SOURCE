import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import {
  createCompanyPlaybook,
  fetchAdminPlaybooks,
  type AdminPlaybookListFilters,
} from "@/lib/surgical-sales/preCallPlanTemplateAdminDb";
import { AdminCreatePlaybookSchema } from "@/lib/surgical-sales/preCallPlanTemplateSchemas";
import {
  PRE_CALL_PLAN_TEMPLATE_STATUSES,
  type PreCallPlanTemplateStatus,
} from "@/lib/surgical-sales/preCallPlanTemplateStatus";
import { serializePreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";

export const dynamic = "force-dynamic";

const ListQuerySchema = z.object({
  scope: z.enum(["all", "company", "user"]).optional(),
  status: z.enum(PRE_CALL_PLAN_TEMPLATE_STATUSES).optional(),
  product_line: z.string().optional(),
  productLine: z.string().optional(),
  engagement_type: z.string().optional(),
  engagementType: z.string().optional(),
  q: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse({
    scope: url.searchParams.get("scope") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    product_line: url.searchParams.get("product_line") ?? undefined,
    productLine: url.searchParams.get("productLine") ?? undefined,
    engagement_type: url.searchParams.get("engagement_type") ?? undefined,
    engagementType: url.searchParams.get("engagementType") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const filters: AdminPlaybookListFilters = {
    scope: parsed.data.scope,
    status: (parsed.data.status ?? "") as PreCallPlanTemplateStatus | "",
    productLine: parsed.data.productLine ?? parsed.data.product_line,
    engagementType: parsed.data.engagementType ?? parsed.data.engagement_type,
    search: parsed.data.q,
  };

  try {
    const playbooks = await fetchAdminPlaybooks(filters);
    return NextResponse.json({ ok: true, playbooks });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load playbooks" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const raw = await req.json().catch(() => null);
  const parsed = AdminCreatePlaybookSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const template = await createCompanyPlaybook({
      adminUserId: auth.ctx.userId,
      name: parsed.data.name,
      productLine: parsed.data.productLine,
      engagementType: parsed.data.engagementType,
      status: parsed.data.status,
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
    });
    return NextResponse.json({ ok: true, template: serializePreCallPlanTemplate(template) });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to create playbook" },
      { status: 500 },
    );
  }
}
