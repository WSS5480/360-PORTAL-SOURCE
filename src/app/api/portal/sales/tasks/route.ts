import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { voidRecordActivityEventDual } from "@/lib/activity/dualWrite";
import { filterOpportunitiesByActiveOrganization } from "@/lib/sales/activeOrganizationFilter";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  opportunity_id: z.string().uuid(),
  title: z.string().min(1).max(400),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(4000).optional().nullable(),
});

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

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "open";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 40));
  const singleOpp = url.searchParams.get("opportunity_id");

  if (singleOpp) {
    const ok = await loadOpportunityForViewer(singleOpp, uid);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    let q = supabaseAdmin
      .from("sales_tasks")
      .select("id, opportunity_id, owner_user_id, title, due_date, completed_at, notes, created_at")
      .eq("opportunity_id", singleOpp)
      .order("due_date", { ascending: true })
      .limit(limit);
    if (status === "open") q = q.is("completed_at", null);
    else if (status === "done") q = q.not("completed_at", "is", null);
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const { data: on } = await supabaseAdmin.from("sales_opportunities").select("account_name").eq("id", singleOpp).maybeSingle();
    const name = (on as { account_name?: string } | null)?.account_name || "—";
    const enriched = (data || []).map((t: Record<string, unknown>) => ({ ...t, opportunity_account: name }));
    return NextResponse.json({ ok: true, tasks: enriched });
  }

  const { data: opps } = await supabaseAdmin.from("sales_opportunities").select("id, account_id");
  const visibleOpps = await filterOpportunitiesByActiveOrganization((opps || []) as { id: string; account_id?: string | null }[]);
  const oppIds = visibleOpps.map((o: { id: string }) => o.id);

  if (oppIds.length === 0) {
    return NextResponse.json({ ok: true, tasks: [] });
  }

  let q = supabaseAdmin
    .from("sales_tasks")
    .select("id, opportunity_id, owner_user_id, title, due_date, completed_at, notes, created_at")
    .in("opportunity_id", oppIds)
    .order("due_date", { ascending: true })
    .limit(limit);

  if (status === "open") {
    q = q.is("completed_at", null);
  } else if (status === "done") {
    q = q.not("completed_at", "is", null);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const tasks = data || [];
  const oids = [...new Set(tasks.map((t: { opportunity_id: string }) => t.opportunity_id))];
  const { data: nameRows } = await supabaseAdmin.from("sales_opportunities").select("id, account_name").in("id", oids);
  const nameBy = new Map((nameRows || []).map((r: { id: string; account_name: string }) => [r.id, r.account_name]));

  const enriched = tasks.map((t: Record<string, unknown>) => ({
    ...t,
    opportunity_account: nameBy.get(String(t.opportunity_id)) || "—",
  }));

  return NextResponse.json({ ok: true, tasks: enriched });
}

export async function POST(req: Request) {
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

  const raw = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const opp = await loadOpportunityForViewer(parsed.data.opportunity_id, uid);
  if (!opp) {
    return NextResponse.json({ ok: false, error: "Opportunity not found" }, { status: 404 });
  }

  const row = {
    opportunity_id: parsed.data.opportunity_id,
    owner_user_id: uid,
    title: parsed.data.title.trim(),
    due_date: parsed.data.due_date,
    notes: parsed.data.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin.from("sales_tasks").insert(row).select("*").single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const taskId = String((data as { id?: string }).id || "");
  if (taskId) {
    voidRecordActivityEventDual({
      type: "TASK_CREATED",
      summary: `Task created: ${parsed.data.title.trim()}`,
      entityType: "task",
      entityId: taskId,
      createdBy: { userId: uid },
      metadata: {
        opportunity_id: parsed.data.opportunity_id,
        due_date: parsed.data.due_date,
        title: parsed.data.title.trim(),
      },
      relatedEntities: [
        { entityType: "opportunity", entityId: parsed.data.opportunity_id, role: "parent_opportunity" },
      ],
    });
  }

  return NextResponse.json({ ok: true, task: data });
}
