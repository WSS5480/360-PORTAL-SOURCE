import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  isOpenSalesStage,
  isWonStage,
  isLostStage,
  normalizeSalesStage,
  SALES_FUNNEL_STAGE_ORDER,
  type SalesStage,
} from "@/lib/sales/stages";
import { filterOpportunitiesByActiveOrganization } from "@/lib/sales/activeOrganizationFilter";
import { buildDashboardAdoptionWidgets } from "@/lib/sales/buildDashboardAdoptionWidgets";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { pickPrimaryOrgLink, type ProviderOrgLink } from "@/lib/surgical-sales/providerDirectory";

export const dynamic = "force-dynamic";

const PROVIDER_CHUNK = 120;

type OppRow = {
  id: string;
  account_id?: string | null;
  account_name?: string | null;
  physician_name?: string | null;
  surgeon_contact_id?: string | null;
  product_line?: string | null;
  value_cents: number;
  stage: SalesStage;
  close_date: string | null;
  next_action?: string | null;
  created_at: string;
  updated_at: string;
};

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function prevMonthStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
}

function prevMonthEnd(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0, 23, 59, 59, 999));
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

  const { data, error } = await supabaseAdmin
    .from("sales_opportunities")
    .select(
      "id, account_id, account_name, physician_name, surgeon_contact_id, product_line, value_cents, stage, close_date, next_action, created_at, updated_at",
    );
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (await filterOpportunitiesByActiveOrganization((data || []) as OppRow[])) as OppRow[];
  const now = new Date();
  const som = startOfMonth(now);
  const pms = prevMonthStart(now);
  const pme = prevMonthEnd(now);

  const pipelineCents = rows.filter((r) => isOpenSalesStage(r.stage)).reduce((a, r) => a + (r.value_cents || 0), 0);

  const closedThisMonth = rows.filter((r) => {
    if (!isWonStage(r.stage) || !r.close_date) return false;
    const cd = new Date(r.close_date + "T12:00:00Z");
    return cd >= som;
  });
  const closedThisMonthCents = closedThisMonth.reduce((a, r) => a + (r.value_cents || 0), 0);

  const closedPrevMonth = rows.filter((r) => {
    if (!isWonStage(r.stage) || !r.close_date) return false;
    const cd = new Date(r.close_date + "T12:00:00Z");
    return cd >= pms && cd <= pme;
  });
  const closedPrevMonthCents = closedPrevMonth.reduce((a, r) => a + (r.value_cents || 0), 0);

  const newOppsThisMonth = rows.filter((r) => new Date(r.created_at) >= som).length;

  const won = rows.filter((r) => isWonStage(r.stage)).length;
  const lost = rows.filter((r) => isLostStage(r.stage)).length;
  const decided = won + lost;
  const winRatePct = decided === 0 ? 0 : Math.round((won / decided) * 100);

  const funnel = Object.fromEntries(SALES_FUNNEL_STAGE_ORDER.map((k) => [k, 0])) as Record<SalesStage, number>;
  const funnel_counts = Object.fromEntries(SALES_FUNNEL_STAGE_ORDER.map((k) => [k, 0])) as Record<SalesStage, number>;
  for (const r of rows) {
    const stage = normalizeSalesStage(r.stage) ?? "discovery";
    funnel[stage] = (funnel[stage] ?? 0) + (r.value_cents || 0);
    funnel_counts[stage] = (funnel_counts[stage] ?? 0) + 1;
  }

  const pctChange = (cur: number, prev: number) => {
    if (prev <= 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const todayUtc = new Date().toISOString().slice(0, 10);
  const staleOpenCount = rows.filter(
    (r) => isOpenSalesStage(r.stage) && r.close_date && String(r.close_date) < todayUtc
  ).length;

  const openDealCount = rows.filter((r) => isOpenSalesStage(r.stage)).length;

  const allOppIds = rows.map((r) => r.id);
  const openRows = rows.filter((r) => isOpenSalesStage(r.stage));
  const openIds = openRows.map((r) => r.id);

  let overdueTaskCount = 0;
  let openMissingNextTaskCount = 0;
  let openNoActivity14dCount = 0;
  const activityCutoffIso = new Date(now.getTime() - 14 * 86400000).toISOString();
  let incompleteTasks: Array<{ opportunity_id: string; due_date: string }> = [];
  let recentActs: Array<{ opportunity_id: string }> = [];
  let actsLoadOk = true;

  if (allOppIds.length > 0) {
    const actsQuery =
      openIds.length > 0
        ? supabaseAdmin.from("sales_activities").select("opportunity_id").in("opportunity_id", openIds).gte("activity_at", activityCutoffIso)
        : Promise.resolve({ data: [] as { opportunity_id: string }[], error: null as null });
    const [{ data: tasks, error: taskErr }, actsRes] = await Promise.all([
      supabaseAdmin
        .from("sales_tasks")
        .select("opportunity_id, due_date")
        .in("opportunity_id", allOppIds)
        .is("completed_at", null),
      actsQuery,
    ]);
    incompleteTasks = (tasks || []) as Array<{ opportunity_id: string; due_date: string }>;
    recentActs = (actsRes.data || []) as Array<{ opportunity_id: string }>;
    actsLoadOk = !actsRes.error;

    if (!taskErr && incompleteTasks.length) {
      overdueTaskCount = incompleteTasks.filter((t) => String(t.due_date) < todayUtc).length;
      const oppWithOpenTask = new Set(incompleteTasks.map((t) => t.opportunity_id));
      openMissingNextTaskCount = openIds.filter((id) => !oppWithOpenTask.has(id)).length;
    } else if (!taskErr && openIds.length) {
      openMissingNextTaskCount = openIds.length;
    }

    if (actsLoadOk && openIds.length) {
      const withRecent = new Set(recentActs.map((a) => a.opportunity_id));
      openNoActivity14dCount = openIds.filter((id) => !withRecent.has(id)).length;
    }
  }

  const recentActivityOppIds = new Set(actsLoadOk && openIds.length ? recentActs.map((a) => a.opportunity_id) : []);

  const providerOrgIdsByContact = new Map<string, Set<string>>();
  const providerOrgNameByContact = new Map<string, string | null>();
  const orgLinksByContact = new Map<string, ProviderOrgLink[]>();

  const { data: contactRows } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select(
      "id, first_name, last_name, email, updated_at, created_at, provider_relationship_stage, provider_crm_status, organization_id, account_id",
    )
    .in("role_type", ["surgeon", "physician_assistant"])
    .is("archived_at", null)
    .or(
      "provider_relationship_stage.eq.early_discovery,provider_relationship_stage.eq.prospect,provider_crm_status.eq.prospect",
    )
    .order("updated_at", { ascending: false })
    .limit(400);

  const accessibleProspects: Record<string, unknown>[] = [];
  for (const row of (contactRows || []) as Record<string, unknown>[]) {
    if (await repCanAccessContact(uid, row as never)) accessibleProspects.push(row);
    if (accessibleProspects.length >= 120) break;
  }

  const prospectIds = accessibleProspects.map((r) => String((r as { id: string }).id)).filter(Boolean);
  if (prospectIds.length > 0) {
    for (let i = 0; i < prospectIds.length; i += PROVIDER_CHUNK) {
      const slice = prospectIds.slice(i, i + PROVIDER_CHUNK);
      const { data: links } = await supabaseAdmin
        .from("surgical_sales_contact_organizations")
        .select("contact_id, account_id, is_primary_org, is_active, accounts:sales_organizations!account_id(id,name)")
        .in("contact_id", slice)
        .limit(2000);
      for (const row of (links || []) as ProviderOrgLink[]) {
        const cid = String(row.contact_id || "");
        if (!cid) continue;
        const arr = orgLinksByContact.get(cid) || [];
        arr.push(row);
        orgLinksByContact.set(cid, arr);
        const set = providerOrgIdsByContact.get(cid) || new Set<string>();
        const aid = String(row.account_id || (row.accounts as { id?: string } | null)?.id || "");
        if (aid) set.add(aid);
        providerOrgIdsByContact.set(cid, set);
      }
    }
    for (const row of accessibleProspects) {
      const id = String((row as { id: string }).id);
      const orgIds = providerOrgIdsByContact.get(id) || new Set<string>();
      const legacyOrg = String(
        (row as { organization_id?: string }).organization_id || (row as { account_id?: string }).account_id || "",
      );
      if (legacyOrg) orgIds.add(legacyOrg);
      providerOrgIdsByContact.set(id, orgIds);
      const primary = pickPrimaryOrgLink(orgLinksByContact.get(id) || []);
      const acct = primary?.accounts as { name?: string | null } | null;
      providerOrgNameByContact.set(id, String(acct?.name || "").trim() || null);
    }
  }

  const widgets = buildDashboardAdoptionWidgets({
    opportunities: rows as OppRow[],
    openIds,
    todayUtc,
    activityCutoffIso,
    incompleteTasks,
    recentActivityOppIds,
    providers: accessibleProspects,
    providerOrgIdsByContact,
    providerOrgNameByContact,
    listLimit: 8,
  });

  return NextResponse.json({
    ok: true,
    widgets,
    metrics: {
      pipeline_cents: pipelineCents,
      closed_month_cents: closedThisMonthCents,
      closed_prev_month_cents: closedPrevMonthCents,
      closed_mom_pct: pctChange(closedThisMonthCents, closedPrevMonthCents),
      new_opportunities_month: newOppsThisMonth,
      win_rate_pct: winRatePct,
      open_deal_count: openDealCount,
      stale_open_count: staleOpenCount,
      overdue_task_count: overdueTaskCount,
      open_missing_next_task_count: openMissingNextTaskCount,
      open_no_activity_14d_count: openNoActivity14dCount,
    },
    funnel,
    funnel_counts,
  });
}
