import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { buildEngagementTacticalDebriefCommitPatch } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z
  .object({
    narrative: z.string().min(1).max(8000),
    summary: z.string().max(1200).optional(),
  })
  .strict();

export async function POST(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { engagementId } = await ctx.params;
  if (!UUID_RE.test(engagementId)) {
    return NextResponse.json({ ok: false, error: "Invalid engagement id" }, { status: 400 });
  }

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const narrative = body.narrative.trim();
  const patch = buildEngagementTacticalDebriefCommitPatch({ narrative, completeEngagement: true });
  if (body.summary?.trim()) {
    patch.notes = `${String(patch.notes)}\n\nSummary: ${body.summary.trim()}`;
  }

  const { error: upErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(patch)
    .eq("id", engagementId);

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
