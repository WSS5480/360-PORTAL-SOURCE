import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { loadProviderEngagementsForProfile } from "@/lib/surgical-sales/engagements/loadProviderEngagements";
import {
  normalizeSalesPathwayStageId,
  SALES_PATHWAY_STAGE_IDS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import { deriveProviderMissionBoardColumn } from "@/lib/surgical-sales/providerMissionBoard";
import {
  resolveMissionBoardStageDrop,
  type MissionBoardDropResolution,
} from "@/lib/surgical-sales/missionBoardStageDrop";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z
  .object({
    target_stage: z.enum(SALES_PATHWAY_STAGE_IDS),
  })
  .strict();

async function loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", uniq);
  const map = new Map<string, string>();
  for (const row of data || []) {
    const id = String((row as { user_id: string }).user_id);
    const name = String((row as { full_name?: string | null }).full_name || "").trim();
    const email = String((row as { email?: string | null }).email || "").trim();
    map.set(id, name || email || id);
  }
  return map;
}

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: contact, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!contact) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!isProviderRole(String((contact as { role_type?: string }).role_type || ""))) {
    return NextResponse.json({ ok: false, error: "Not a provider record." }, { status: 400 });
  }
  if (!(await repCanAccessContact(gate.uid, contact as never))) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { data: caseRows } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("id, case_type, status, surgeon_contact_id, engagement_id")
    .eq("surgeon_contact_id", providerId)
    .is("archived_at", null)
    .limit(200);

  const profileNames = await loadProfileNames([gate.uid]);
  const engagementLoad = await loadProviderEngagementsForProfile(supabaseAdmin, {
    providerId,
    salesRepId: gate.uid,
    contact: contact as Record<string, unknown>,
    actorName: profileNames.get(gate.uid) || "Rep",
    primaryOrganizationName: null,
    primaryOrganizationId: null,
  });

  const contactRecord = {
    ...(contact as Record<string, unknown>),
    ...(engagementLoad.contact ?? {}),
  };

  const fromStage =
    normalizeSalesPathwayStageId(
      String(contactRecord.provider_relationship_pathway_stage_id ?? ""),
    ) ??
    deriveProviderMissionBoardColumn({
      ...(contactRecord as object),
      id: providerId,
      organization_count: 0,
      specialty: null,
      primary_organization_name: null,
      primary_organization_id: null,
      additional_organizations_count: 0,
      territory: null,
      planning_status: "not_started",
      linked_opportunities_count: 0,
      recent_case_count: 0,
      last_activity_at: null,
    } as never) ??
    "discovery";

  const toStage = parsed.data.target_stage as SalesPathwayStageId;

  const resolution: MissionBoardDropResolution = resolveMissionBoardStageDrop(fromStage, toStage, {
    contact: contactRecord,
    engagements: engagementLoad.engagements.map((e) => ({
      id: e.id,
      engagement_type: e.engagement_type,
      status: e.status,
      debrief_completed: e.debrief_completed,
    })),
    cases: (caseRows || []) as Array<Record<string, unknown>>,
  });

  return NextResponse.json({
    ok: true,
    from_stage: fromStage,
    target_stage: toStage,
    resolution,
  });
}
