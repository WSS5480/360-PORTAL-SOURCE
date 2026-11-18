import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadProfileNames } from "@/lib/activity/activityEventQuery";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { buildTeamActivityFeed, type TeamActivityRepOption } from "@/lib/surgical-sales/buildTeamActivityFeed";

export const dynamic = "force-dynamic";

const CASE_ACTIVITY_LIMIT = 400;
const ORG_NOTE_LIMIT = 150;
const ID_CHUNK = 200;

async function loadRowsByIds<T>(
  ids: string[],
  loadChunk: (slice: string[]) => Promise<T[]>,
): Promise<T[]> {
  const uniq = [...new Set(ids.filter(Boolean))];
  const out: T[] = [];
  for (let i = 0; i < uniq.length; i += ID_CHUNK) {
    out.push(...(await loadChunk(uniq.slice(i, i + ID_CHUNK))));
  }
  return out;
}

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

  const [{ data: caseActs, error: caseActErr }, { data: orgNotes, error: orgNoteErr }, { data: repRows, error: repErr }] =
    await Promise.all([
      supabaseAdmin
        .from("surgical_sales_case_activities")
        .select("id, case_id, activity_type, body, metadata_json, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(CASE_ACTIVITY_LIMIT),
      supabaseAdmin
        .from("sales_operational_notes")
        .select("id, body, created_at, created_by_user_id, entity_id")
        .eq("entity_type", "organization")
        .order("created_at", { ascending: false })
        .limit(ORG_NOTE_LIMIT),
      supabaseAdmin
        .from("user_profiles")
        .select("user_id, full_name, email")
        .eq("is_internal_sales_rep", true)
        .order("full_name", { ascending: true }),
    ]);

  if (caseActErr) return NextResponse.json({ ok: false, error: caseActErr.message }, { status: 500 });
  if (orgNoteErr) {
    console.error("[portal team-activity] organization notes", orgNoteErr);
  }
  if (repErr) return NextResponse.json({ ok: false, error: repErr.message }, { status: 500 });

  const caseActivityRows = (caseActs || []) as Array<{
    id: string;
    case_id: string;
    activity_type: string;
    body: string | null;
    metadata_json: unknown;
    created_at: string;
    user_id: string;
  }>;
  const orgNoteRows = (orgNotes || []) as Array<{
    id: string;
    body: string | null;
    created_at: string;
    created_by_user_id: string;
    entity_id: string;
  }>;

  const caseIds = caseActivityRows.map((row) => String(row.case_id || "")).filter(Boolean);
  let caseRows: Array<{ id: string; case_number?: string | null; account_id?: string | null }> = [];
  let orgRows: Array<{ id: string; name?: string | null }> = [];
  try {
    caseRows = await loadRowsByIds(caseIds, async (slice) => {
      const { data, error } = await supabaseAdmin
        .from("surgical_sales_cases")
        .select("id, case_number, account_id")
        .in("id", slice);
      if (error) throw new Error(error.message);
      return (data || []) as Array<{ id: string; case_number?: string | null; account_id?: string | null }>;
    });

    const orgIds = [
      ...caseRows.map((row) => String(row.account_id || "")),
      ...orgNoteRows.map((row) => String(row.entity_id || "")),
    ].filter(Boolean);
    orgRows = await loadRowsByIds(orgIds, async (slice) => {
      const { data, error } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", slice);
      if (error) throw new Error(error.message);
      return (data || []) as Array<{ id: string; name?: string | null }>;
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load team activity";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const organizationNameById = new Map(orgRows.map((row) => [String(row.id), String(row.name || "").trim() || "Organization"]));
  const caseById = new Map(
    caseRows.map((row) => {
      const orgId = String(row.account_id || "") || null;
      return [
        String(row.id),
        {
          case_number: row.case_number ? String(row.case_number) : null,
          organization_id: orgId,
          organization_name: orgId ? organizationNameById.get(orgId) ?? null : null,
        },
      ];
    }),
  );

  const userIds = [
    ...caseActivityRows.map((row) => String(row.user_id || "")),
    ...orgNoteRows.map((row) => String(row.created_by_user_id || "")),
    ...(repRows || []).map((row) => String((row as { user_id: string }).user_id)),
  ];
  const profileBy = await loadProfileNames(userIds);

  const items = buildTeamActivityFeed({
    caseActivities: caseActivityRows,
    caseById,
    organizationNotes: orgNoteRows,
    organizationNameById,
    profileBy,
  });

  const repsById = new Map<string, TeamActivityRepOption>();
  for (const row of repRows || []) {
    const id = String((row as { user_id: string }).user_id);
    if (!id) continue;
    repsById.set(id, {
      user_id: id,
      display_name: profileBy.get(id) || id.slice(0, 8),
    });
  }
  for (const item of items) {
    if (!item.actor_user_id || repsById.has(item.actor_user_id)) continue;
    repsById.set(item.actor_user_id, {
      user_id: item.actor_user_id,
      display_name: item.actor_display_name,
    });
  }

  const reps = [...repsById.values()].sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json({
    ok: true,
    viewer_user_id: uid,
    reps,
    items,
  });
}
