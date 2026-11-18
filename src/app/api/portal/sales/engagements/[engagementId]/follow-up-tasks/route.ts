import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { setEngagementFollowUpTaskCompletion } from "@/lib/surgical-sales/engagements/syncEngagementDebriefFollowUpTasks";

export const dynamic = "force-dynamic";

const PatchSchema = z
  .object({
    task_title: z.string().min(4).max(400),
    completed: z.boolean(),
  })
  .strict();

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { engagementId } = await ctx.params;
  const engagement = await loadEngagementForPortalActor(engagementId, gate.uid);
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Engagement not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await setEngagementFollowUpTaskCompletion({
    engagementId,
    actorUserId: gate.uid,
    taskTitle: parsed.data.task_title,
    completed: parsed.data.completed,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
