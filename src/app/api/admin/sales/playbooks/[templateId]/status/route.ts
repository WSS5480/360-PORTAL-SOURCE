import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { setAdminPlaybookStatus } from "@/lib/surgical-sales/preCallPlanTemplateAdminDb";
import { PRE_CALL_PLAN_TEMPLATE_STATUSES } from "@/lib/surgical-sales/preCallPlanTemplateStatus";
import { serializePreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z.object({
  status: z.enum(PRE_CALL_PLAN_TEMPLATE_STATUSES),
});

export async function POST(req: Request, ctx: { params: Promise<{ templateId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { templateId } = await ctx.params;
  if (!UUID_RE.test(templateId)) {
    return NextResponse.json({ ok: false, error: "Invalid template id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const template = await setAdminPlaybookStatus(templateId, parsed.data.status);
    return NextResponse.json({ ok: true, template: serializePreCallPlanTemplate(template) });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to update status" },
      { status: 500 },
    );
  }
}
