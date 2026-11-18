import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { promoteUserPlaybookToCompany } from "@/lib/surgical-sales/preCallPlanTemplateAdminDb";
import { serializePreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, ctx: { params: Promise<{ templateId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { templateId } = await ctx.params;
  if (!UUID_RE.test(templateId)) {
    return NextResponse.json({ ok: false, error: "Invalid template id" }, { status: 400 });
  }

  try {
    const result = await promoteUserPlaybookToCompany(templateId, auth.ctx.userId);
    return NextResponse.json({
      ok: true,
      company: serializePreCallPlanTemplate(result.company),
      archivedSource: serializePreCallPlanTemplate(result.archivedSource),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to promote playbook";
    const status =
      message === "Not found" ? 404 : message.includes("Only user playbooks") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
