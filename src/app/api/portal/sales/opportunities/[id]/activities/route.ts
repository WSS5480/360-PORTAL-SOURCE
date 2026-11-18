import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { ACTIVITY_TYPES } from "@/lib/sales/activityTypes";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import {
  adoptionInitiativeSnapshotFromRow,
  logAdoptionInitiativeActivity,
} from "@/lib/activity/adoptionInitiativeActivity";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  activity_type: z.enum(ACTIVITY_TYPES),
  summary: z.string().min(1).max(4000),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: opportunityId } = await ctx.params;
  if (!opportunityId) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

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

  const opp = await loadOpportunityForViewer(opportunityId, uid);
  if (!opp) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("sales_activities")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("activity_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, activities: data ?? [] });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: opportunityId } = await ctx.params;
  if (!opportunityId) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

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

  const opp = await loadOpportunityForViewer(opportunityId, uid);
  if (!opp) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const row = {
    opportunity_id: opportunityId,
    owner_user_id: uid,
    activity_type: parsed.data.activity_type,
    summary: parsed.data.summary.trim(),
    activity_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin.from("sales_activities").insert(row).select("*").single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (opp) {
    logAdoptionInitiativeActivity({
      type: "NOTE_ADDED",
      summary: parsed.data.summary.trim(),
      userId: uid,
      snapshot: adoptionInitiativeSnapshotFromRow(opp),
      metadata: { legacy_activity_type: parsed.data.activity_type, sales_activity_id: data?.id },
      tags: [parsed.data.activity_type],
      legacy: data?.id ? { source: "sales_activities", activityId: String(data.id) } : undefined,
    });
  }

  return NextResponse.json({ ok: true, activity: data });
}
