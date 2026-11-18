import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildAdminTeamDashboard,
  type AdminTeamDashboardCaseRow,
  type AdminTeamDashboardContactRow,
  type AdminTeamDashboardEngagementRow,
} from "@/lib/surgical-sales/admin/buildAdminTeamDashboard";
import {
  ADMIN_PATHWAY_CASE_SELECT,
  ADMIN_PATHWAY_ENGAGEMENT_SELECT,
} from "@/lib/surgical-sales/admin/adminProviderPathway";
import type { AdminTeamDashboardPayload } from "@/lib/surgical-sales/admin/adminTeamDashboardTypes";
import {
  adminTeamDashboardPeriodBounds,
  adminTeamDashboardPriorPeriodBounds,
  resolveAdminTeamDashboardPeriodKey,
  type AdminTeamDashboardPeriodKey,
} from "@/lib/surgical-sales/admin/adminTeamDashboardPeriod";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import type { PerfActivityRow } from "@/lib/surgical-sales/repPerformanceMetrics";
import { loadUniversalFactsForProviderIds } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { isUniversalFactsReadModelEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelFlag";

const CHUNK = 400;
const CONTACT_LIMIT = 500;

export async function fetchAdminTeamDashboardData(args?: {
  now?: Date;
  period?: AdminTeamDashboardPeriodKey | string | null;
}): Promise<AdminTeamDashboardPayload> {
  const now = args?.now ?? new Date();
  const periodKey = resolveAdminTeamDashboardPeriodKey(args?.period ?? null);
  const bounds = adminTeamDashboardPeriodBounds(now, periodKey);
  const prior = adminTeamDashboardPriorPeriodBounds(now, periodKey, bounds);
  const notes30dCutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const readModelEnabled = isUniversalFactsReadModelEnabled();

  const { data: repRows, error: repErr } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, full_name, email, is_internal_sales_rep")
    .eq("is_internal_sales_rep", true)
    .order("email", { ascending: true });

  if (repErr) throw new Error(repErr.message);

  const internalReps = (repRows || []).map((r: { user_id: string; full_name?: string | null; email?: string | null }) => {
    const fn = String(r.full_name ?? "").trim();
    const em = String(r.email ?? "").trim();
    return {
      user_id: String(r.user_id),
      display_name: fn || em || String(r.user_id),
      email: r.email ?? null,
    };
  });

  const repNameById = new Map(internalReps.map((r) => [r.user_id, r.display_name]));
  const repIds = internalReps.map((r) => r.user_id);

  if (repIds.length === 0) {
    return buildAdminTeamDashboard({
      now,
      period: { ...bounds, prior_label: prior.label },
      prior,
      internalReps,
      cases: [],
      engagements: [],
      contacts: [],
      orgNameById: new Map(),
      repNameById,
      docTypesByCase: new Map(),
      closedCaseActivities: [],
      productLinesByCase: new Map(),
      notesByCase: new Map(),
      providerIdsWithIntelInPeriod: new Set(),
      notes30dCutoff,
      universalFactsByProvider: new Map(),
      readModelEnabled,
    });
  }

  const { data: casesRaw, error: caseErr } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select(ADMIN_PATHWAY_CASE_SELECT)
    .in("sales_rep_id", repIds)
    .order("updated_at", { ascending: false })
    .limit(25_000);

  if (caseErr) throw new Error(caseErr.message);

  const cases = (casesRaw || []) as AdminTeamDashboardCaseRow[];
  const caseIds = cases.map((c) => c.id);
  const closedCaseIds = cases.filter((c) => String(c.status ?? "").toLowerCase() === "closed").map((c) => c.id);

  const docTypesByCase = new Map<string, Set<string>>();
  const productLinesByCase = new Map<string, Array<{ case_id: string; actual_quantity?: unknown }>>();
  const notesByCase = new Map<string, Array<{ case_id: string; created_at: string }>>();
  const closedCaseActivities: PerfActivityRow[] = [];

  for (let i = 0; i < caseIds.length; i += CHUNK) {
    const slice = caseIds.slice(i, i + CHUNK);
    if (slice.length === 0) break;

    const [{ data: docs }, { data: lines }, { data: notes }] = await Promise.all([
      supabaseAdmin.from("surgical_sales_case_documents").select("case_id, document_type").in("case_id", slice),
      supabaseAdmin
        .from("surgical_sales_case_products")
        .select("case_id, actual_quantity")
        .in("case_id", slice),
      supabaseAdmin
        .from("surgical_sales_case_activities")
        .select("case_id, created_at")
        .in("case_id", slice)
        .eq("activity_type", "note"),
    ]);

    for (const d of docs || []) {
      const cid = String((d as { case_id: string }).case_id);
      const t = String((d as { document_type: string }).document_type).toLowerCase();
      if (!docTypesByCase.has(cid)) docTypesByCase.set(cid, new Set());
      docTypesByCase.get(cid)!.add(t);
    }

    for (const row of lines || []) {
      const cid = String((row as { case_id: string }).case_id);
      const bucket = productLinesByCase.get(cid) ?? [];
      bucket.push({ case_id: cid, actual_quantity: (row as { actual_quantity?: unknown }).actual_quantity });
      productLinesByCase.set(cid, bucket);
    }

    for (const row of notes || []) {
      const cid = String((row as { case_id: string }).case_id);
      const bucket = notesByCase.get(cid) ?? [];
      bucket.push({
        case_id: cid,
        created_at: String((row as { created_at: string }).created_at),
      });
      notesByCase.set(cid, bucket);
    }
  }

  for (let i = 0; i < closedCaseIds.length; i += CHUNK) {
    const slice = closedCaseIds.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: acts, error: actErr } = await supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("case_id, created_at, metadata_json")
      .in("case_id", slice)
      .eq("activity_type", "status_change")
      .order("created_at", { ascending: true });
    if (actErr) throw new Error(actErr.message);
    for (const row of acts || []) {
      closedCaseActivities.push({
        case_id: String((row as { case_id: string }).case_id),
        created_at: String((row as { created_at: string }).created_at),
        metadata_json: ((row as { metadata_json?: unknown }).metadata_json ?? null) as Record<string, unknown> | null,
      });
    }
  }

  const { data: engagementsRaw, error: engErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select(ADMIN_PATHWAY_ENGAGEMENT_SELECT)
    .in("sales_rep_id", repIds)
    .is("archived_at", null)
    .limit(25_000);

  if (engErr) throw new Error(engErr.message);

  const engagements = (engagementsRaw || []) as AdminTeamDashboardEngagementRow[];

  const { data: contactRows, error: contactErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .in("role_type", ["surgeon", "physician_assistant"])
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(CONTACT_LIMIT);

  if (contactErr) throw new Error(contactErr.message);

  const contacts = (contactRows || []) as AdminTeamDashboardContactRow[];
  const accountIds = new Set<string>();
  for (const c of contacts) {
    if (c.account_id) accountIds.add(String(c.account_id));
  }

  const orgNameById = new Map<string, string>();
  const accountIdList = [...accountIds];
  for (let i = 0; i < accountIdList.length; i += CHUNK) {
    const slice = accountIdList.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: accts } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", slice);
    for (const a of accts || []) {
      orgNameById.set(String((a as { id: string }).id), String((a as { name?: string | null }).name ?? "—").trim() || "—");
    }
  }

  const providerIdsWithIntelInPeriod = new Set<string>();
  const surgeonByCaseId = new Map(cases.map((c) => [c.id, c.surgeon_contact_id ? String(c.surgeon_contact_id) : null]));

  for (const [caseId, noteRows] of notesByCase) {
    const surgeonId = surgeonByCaseId.get(caseId);
    if (!surgeonId) continue;
    for (const note of noteRows) {
      const day = note.created_at.slice(0, 10);
      if (day >= bounds.start && day <= bounds.end) {
        providerIdsWithIntelInPeriod.add(surgeonId);
        break;
      }
    }
  }

  for (const contact of contacts) {
    const updated = String(contact.updated_at ?? "").slice(0, 10);
    if (updated && updated >= bounds.start && updated <= bounds.end) {
      providerIdsWithIntelInPeriod.add(String(contact.id));
    }
  }

  const contactIds = contacts.map((c) => String(c.id));
  const universalFactsByProvider = readModelEnabled
    ? await loadUniversalFactsForProviderIds(contactIds, { limitPerProvider: 12, sinceDays: 90 })
    : new Map();

  if (readModelEnabled) {
    for (const [providerId, facts] of universalFactsByProvider) {
      for (const fact of facts) {
        const day = String(fact.created_at ?? "").slice(0, 10);
        if (day >= bounds.start && day <= bounds.end) {
          providerIdsWithIntelInPeriod.add(providerId);
          break;
        }
      }
    }
  }

  return buildAdminTeamDashboard({
    now,
    period: { ...bounds, prior_label: prior.label },
    prior,
    internalReps,
    cases,
    engagements,
    contacts,
    orgNameById,
    repNameById,
    docTypesByCase,
    closedCaseActivities,
    productLinesByCase,
    notesByCase,
    providerIdsWithIntelInPeriod,
    notes30dCutoff,
    universalFactsByProvider,
    readModelEnabled,
  });
}
