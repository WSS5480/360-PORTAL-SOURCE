import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { isCoachingGuidanceInputsCompareEnabled } from "@/lib/surgical-sales/universalExtractor/coachingGuidanceInputsCompareFlag";
import { loadCoachingGuidanceInputsComparisonForCase } from "@/lib/surgical-sales/universalExtractor/loadCoachingGuidanceInputsComparisonForCase";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const QuerySchema = z.object({
  caseId: z.string().regex(UUID_RE, "Invalid case id"),
});

export async function GET(req: Request) {
  if (!isCoachingGuidanceInputsCompareEnabled()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userIsInternalSalesRep(auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ caseId: url.searchParams.get("caseId") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { caseId } = parsed.data;
  const row = await loadSurgicalCaseForPortalActor(caseId, auth.user.id, { includeArchived: true });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const comparison = await loadCoachingGuidanceInputsComparisonForCase(caseId);
  if (!comparison) {
    return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    evaluation_only: true,
    comparison,
  });
}
