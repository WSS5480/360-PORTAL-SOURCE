import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementWizardPrepViewForActor } from "@/lib/surgical-sales/engagements/loadEngagementWizardPrepView";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const providerId = url.searchParams.get("provider_id")?.trim() ?? "";
  const engagementType = url.searchParams.get("engagement_type")?.trim() ?? "";
  const organizationId = url.searchParams.get("organization_id")?.trim() || null;
  const opportunityId = url.searchParams.get("opportunity_id")?.trim() || null;
  const engagementDate = url.searchParams.get("engagement_date")?.trim() || null;
  const productLine = url.searchParams.get("product_line")?.trim() || null;
  const caseId = url.searchParams.get("case_id")?.trim() || null;
  const prepMode = url.searchParams.get("prep_mode")?.trim() || null;

  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }
  if (!engagementType) {
    return NextResponse.json({ ok: false, error: "Engagement type required" }, { status: 400 });
  }

  const result = await loadEngagementWizardPrepViewForActor(uid, {
    provider_id: providerId,
    engagement_type: engagementType,
    organization_id: organizationId,
    opportunity_id: opportunityId,
    engagement_date: engagementDate,
    product_line: productLine,
    case_id: caseId,
    prep_mode: prepMode,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, prep: result.prep });
}
