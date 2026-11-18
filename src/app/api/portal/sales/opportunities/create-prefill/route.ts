import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadAdoptionInitiativeCreatePrefill } from "@/lib/sales/loadAdoptionInitiativeCreatePrefill";

export const dynamic = "force-dynamic";

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
  const result = await loadAdoptionInitiativeCreatePrefill(
    {
      surgeonContactId: url.searchParams.get("surgeon_contact_id") || undefined,
      engagementId: url.searchParams.get("engagement_id") || undefined,
      caseId: url.searchParams.get("case_id") || undefined,
    },
    uid,
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, prefill: result.prefill });
}
