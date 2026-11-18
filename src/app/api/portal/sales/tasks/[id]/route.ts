import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { voidRecordActivityEventDual } from "@/lib/activity/dualWrite";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().min(1).max(400).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(4000).optional().nullable(),
  completed: z.boolean().optional(),
});

async function loadTaskWithAccess(taskId: string, userId: string) {
  const { data: task, error } = await supabaseAdmin.from("sales_tasks").select("*").eq("id", taskId).maybeSingle();
  if (error || !task) return { task: null as null, error: error?.message || "Not found" };
  const opp = await loadOpportunityForViewer(String((task as { opportunity_id: string }).opportunity_id), userId);
  if (!opp) return { task: null as null, error: "Forbidden" };
  return { task, error: null as null };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

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

  const { task, error: loadErr } = await loadTaskWithAccess(id, uid);
  if (loadErr || !task) {
    return NextResponse.json({ ok: false, error: loadErr || "Not found" }, { status: loadErr === "Forbidden" ? 403 : 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const p = parsed.data;
  const wasCompleted = Boolean((task as { completed_at?: string | null }).completed_at);
  if (p.title !== undefined) patch.title = p.title.trim();
  if (p.due_date !== undefined) patch.due_date = p.due_date;
  if (p.notes !== undefined) patch.notes = p.notes?.trim() || null;
  if (p.completed === true) {
    patch.completed_at = new Date().toISOString();
  } else if (p.completed === false) {
    patch.completed_at = null;
  }

  const { data, error } = await supabaseAdmin.from("sales_tasks").update(patch).eq("id", id).select("*").single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const opportunityId = String((task as { opportunity_id: string }).opportunity_id);
  const title = String((data as { title?: string }).title || (task as { title?: string }).title || "Task");

  if (p.completed === true && !wasCompleted) {
    voidRecordActivityEventDual({
      type: "TASK_COMPLETED",
      summary: `Task completed: ${title}`,
      entityType: "task",
      entityId: id,
      createdBy: { userId: uid },
      metadata: { opportunity_id: opportunityId, completed_at: (data as { completed_at?: string }).completed_at },
      relatedEntities: [{ entityType: "opportunity", entityId: opportunityId, role: "parent_opportunity" }],
    });
  }

  return NextResponse.json({ ok: true, task: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

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

  const { task, error: loadErr } = await loadTaskWithAccess(id, uid);
  if (loadErr || !task) {
    return NextResponse.json({ ok: false, error: loadErr || "Not found" }, { status: loadErr === "Forbidden" ? 403 : 404 });
  }

  const { error } = await supabaseAdmin.from("sales_tasks").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
