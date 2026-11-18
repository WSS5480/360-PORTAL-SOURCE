import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { filterOpportunitiesByActiveOrganization } from "@/lib/sales/activeOrganizationFilter";

export const dynamic = "force-dynamic";

/** Dashboard: open tasks + recent activities across allowed opportunities (surgical metrics: `/api/portal/sales/surgical-dashboard`). */
export async function GET() {
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

  const { data: opps } = await supabaseAdmin.from("sales_opportunities").select("id, account_id");
  const visibleOpps = await filterOpportunitiesByActiveOrganization((opps || []) as { id: string; account_id?: string | null }[]);
  const oppIds = visibleOpps.map((o: { id: string }) => o.id);

  const [tasksRes, actsRes] = await Promise.all([
    oppIds.length
      ? supabaseAdmin
          .from("sales_tasks")
          .select("id, opportunity_id, title, due_date, completed_at, notes")
          .in("opportunity_id", oppIds)
          .is("completed_at", null)
          .order("due_date", { ascending: true })
          .limit(12)
      : Promise.resolve({ data: [] as unknown[], error: null as null }),
    oppIds.length
      ? supabaseAdmin
          .from("sales_activities")
          .select("id, opportunity_id, activity_type, summary, activity_at")
          .in("opportunity_id", oppIds)
          .order("activity_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] as unknown[], error: null as null }),
  ]);

  if (tasksRes.error) return NextResponse.json({ ok: false, error: tasksRes.error.message }, { status: 500 });
  if (actsRes.error) return NextResponse.json({ ok: false, error: actsRes.error.message }, { status: 500 });

  type TaskRow = { id: string; opportunity_id: string; title: string; due_date: string; completed_at: string | null; notes: string | null };
  type ActRow = { id: string; opportunity_id: string; activity_type: string; summary: string; activity_at: string };
  const tasks = (tasksRes.data || []) as TaskRow[];
  const acts = (actsRes.data || []) as ActRow[];

  const oids = [...new Set([...tasks.map((t) => t.opportunity_id), ...acts.map((a) => a.opportunity_id)])];
  const { data: names } = await supabaseAdmin.from("sales_opportunities").select("id, account_name").in("id", oids);
  const nameBy = new Map((names || []).map((r: { id: string; account_name: string }) => [r.id, r.account_name]));

  return NextResponse.json({
    ok: true,
    tasks: tasks.map((t) => ({
      ...t,
      opportunity_account: nameBy.get(String(t.opportunity_id)) || "—",
    })),
    activities: acts.map((a) => ({
      ...a,
      opportunity_account: nameBy.get(String(a.opportunity_id)) || "—",
    })),
  });
}
