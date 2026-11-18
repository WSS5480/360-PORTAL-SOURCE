import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { enrichSurgicalCasesForList, type SurgicalCaseListRow } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { buildRevenuePipelineView } from "@/lib/surgical-sales/caseRevenuePipeline";
import {
  canViewRevenuePipelineTeam,
  parseRevenuePipelineScope,
  revenuePipelineRepIdsForScope,
} from "@/lib/surgical-sales/revenuePipelineScope";

export const dynamic = "force-dynamic";

function utcYmd(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .select("is_territory_manager")
    .eq("user_id", uid)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  const canViewTeam = canViewRevenuePipelineTeam({
    isTerritoryManager: profile?.is_territory_manager === true,
  });
  const requestedScope = new URL(req.url).searchParams.get("scope");
  const scope = parseRevenuePipelineScope(requestedScope, canViewTeam);

  let assignedRepIds: string[] = [];
  if (scope === "team") {
    const { data: roster, error: rosterErr } = await supabaseAdmin
      .from("sales_rep_manager_assignments")
      .select("rep_user_id")
      .eq("manager_user_id", uid);
    if (rosterErr) {
      return NextResponse.json({ ok: false, error: rosterErr.message }, { status: 500 });
    }
    assignedRepIds = (roster || []).map((row) => String((row as { rep_user_id?: string }).rep_user_id || ""));
  }

  const repIds = revenuePipelineRepIdsForScope({
    viewerId: uid,
    scope,
    assignedRepIds,
  });

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select(
      "id, case_number, account_id, surgeon_contact_id, sales_rep_id, case_date, case_time, procedure_type, case_type, product_id, status, expected_revenue, actual_revenue, archived_at",
    )
    .in("sales_rep_id", repIds)
    .is("archived_at", null)
    .neq("status", "cancelled")
    .order("case_date", { ascending: false })
    .limit(1500);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const cases = await enrichSurgicalCasesForList((data || []) as SurgicalCaseListRow[]);
  const view = buildRevenuePipelineView(cases, utcYmd());

  return NextResponse.json({
    ok: true,
    scope,
    can_view_team: canViewTeam,
    summary: view.summary,
    upcoming_cases: view.upcoming_cases,
    booked_cases: view.booked_cases,
  });
}
