import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { planProviderDebriefFromObservationCase } from "@/lib/surgical-sales/engagements/planProviderDebriefFromObservationCase";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { caseId } = await ctx.params;
  if (!UUID_RE.test(caseId)) {
    return NextResponse.json({ ok: false, error: "Invalid case id" }, { status: 400 });
  }

  const result = await planProviderDebriefFromObservationCase({ caseId, userId: uid }).catch(
    (error: unknown) => ({
      ok: false as const,
      message: error instanceof Error ? error.message : "Failed to plan provider debrief",
      status: 500,
    }),
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    engagementId: result.engagementId,
    prepareHref: result.prepareHref,
    created: result.created,
    reused: result.reused,
  });
}
