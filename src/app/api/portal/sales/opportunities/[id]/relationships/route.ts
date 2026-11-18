import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import {
  adoptionInitiativeSnapshotFromRow,
  logAdoptionInitiativeCaseLinked,
  logAdoptionInitiativeEngagementLinked,
} from "@/lib/activity/adoptionInitiativeActivity";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  linkCaseToOpportunity,
  linkEngagementToOpportunity,
  loadLinkedCasesForOpportunity,
  loadLinkedEngagementsForOpportunity,
} from "@/lib/surgical-sales/opportunityRelationships";

export const dynamic = "force-dynamic";

const PatchSchema = z
  .object({
    link_engagement_id: z.string().uuid().nullable().optional(),
    unlink_engagement_id: z.string().uuid().optional(),
    link_case_id: z.string().uuid().nullable().optional(),
    unlink_case_id: z.string().uuid().optional(),
  })
  .strict();

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userIsInternalSalesRep(auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const row = await loadOpportunityForViewer(id, auth.user.id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const [linked_engagements, linked_cases] = await Promise.all([
    loadLinkedEngagementsForOpportunity(id),
    loadLinkedCasesForOpportunity(id),
  ]);

  return NextResponse.json({ ok: true, linked_engagements, linked_cases });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userIsInternalSalesRep(auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const row = await loadOpportunityForViewer(id, auth.user.id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const p = parsed.data;
  const snapshot = adoptionInitiativeSnapshotFromRow(row);
  const uid = auth.user.id;

  if (p.unlink_engagement_id) {
    const result = await linkEngagementToOpportunity({ engagementId: p.unlink_engagement_id, opportunityId: null });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  if (p.link_engagement_id !== undefined && p.link_engagement_id) {
    const result = await linkEngagementToOpportunity({
      engagementId: p.link_engagement_id,
      opportunityId: id,
    });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    const { data: engRow } = await supabaseAdmin
      .from("surgical_sales_engagements")
      .select("title, engagement_type")
      .eq("id", p.link_engagement_id)
      .maybeSingle();
    const engagementLabel = engRow
      ? String((engRow as { title?: string | null }).title || "").trim() ||
        formatEngagementType(String((engRow as { engagement_type?: string }).engagement_type || ""))
      : null;
    logAdoptionInitiativeEngagementLinked({
      userId: uid,
      snapshot,
      engagementId: p.link_engagement_id,
      engagementLabel,
    });
  }

  if (p.unlink_case_id) {
    const result = await linkCaseToOpportunity({ caseId: p.unlink_case_id, opportunityId: null });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  if (p.link_case_id !== undefined && p.link_case_id) {
    const { data: caseBefore } = await supabaseAdmin
      .from("surgical_sales_cases")
      .select("case_number, related_opportunity_id")
      .eq("id", p.link_case_id)
      .maybeSingle();
    const result = await linkCaseToOpportunity({
      caseId: p.link_case_id,
      opportunityId: id,
    });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    const caseLabel = caseBefore
      ? formatSurgicalCaseNumber(String((caseBefore as { case_number?: string }).case_number ?? ""))
      : null;
    logAdoptionInitiativeCaseLinked({
      userId: uid,
      snapshot,
      caseId: p.link_case_id,
      caseLabel,
      previousOpportunityId: (caseBefore as { related_opportunity_id?: string | null } | null)?.related_opportunity_id
        ? String((caseBefore as { related_opportunity_id: string }).related_opportunity_id)
        : null,
    });
  }

  const [linked_engagements, linked_cases] = await Promise.all([
    loadLinkedEngagementsForOpportunity(id),
    loadLinkedCasesForOpportunity(id),
  ]);

  return NextResponse.json({ ok: true, linked_engagements, linked_cases });
}
