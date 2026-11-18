import type { SupabaseClient } from "@supabase/supabase-js";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { ACTIVITY_TYPE_LABEL, type ActivityType } from "@/lib/sales/activityTypes";
import { formatEngagementActivityType } from "@/lib/surgical-sales/engagements/engagementActivityLabels";
import { formatEngagementStatus, formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";
import { formatProviderActivityType } from "@/lib/surgical-sales/providerActivityLabels";
import { toScannableIntelligenceLine } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

export type PrepareRecentActivityKind =
  | "engagement"
  | "note"
  | "case"
  | "opportunity"
  | "product_discussion";

export type PrepareRecentActivityRow = {
  id: string;
  kind: PrepareRecentActivityKind;
  icon: string;
  title: string;
  at: string;
  at_label: string;
  summary: string;
  href: string | null;
};

export type PrepareRecentActivityFeed = {
  items: PrepareRecentActivityRow[];
  timeline_href: string;
};

const KIND_ICON: Record<PrepareRecentActivityKind, string> = {
  engagement: "◆",
  note: "✎",
  case: "⊕",
  opportunity: "↑",
  product_discussion: "◎",
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function formatActivityDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

type RawItem = {
  id: string;
  kind: PrepareRecentActivityKind;
  title: string;
  at: string;
  summary: string;
  href: string | null;
};

function classifyEngagementActivityType(raw: string): PrepareRecentActivityKind {
  const key = raw.toLowerCase();
  if (key.includes("pre_call") || key.includes("product") || key.includes("plan")) {
    return "product_discussion";
  }
  return "engagement";
}

function classifyProviderActivityType(raw: string, meta: Record<string, unknown>): PrepareRecentActivityKind {
  const key = raw.toLowerCase();
  if (key === "clinical_discovery_updated" || meta.activity_category === "discovery") {
    return "note";
  }
  if (key.includes("pre_call") || key.includes("product")) {
    return "product_discussion";
  }
  return "note";
}

function toRows(raw: RawItem[]): PrepareRecentActivityRow[] {
  return raw.map((r) => ({
    id: r.id,
    kind: r.kind,
    icon: KIND_ICON[r.kind],
    title: r.title,
    at: r.at,
    at_label: formatActivityDate(r.at),
    summary: toScannableIntelligenceLine(r.summary, 96),
    href: r.href,
  }));
}

function pickTopItems(raw: RawItem[], limit = 5): RawItem[] {
  const sorted = [...raw]
    .filter((r) => r.at && r.title)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const picked: RawItem[] = [];
  const seen = new Set<string>();

  const preferKinds: PrepareRecentActivityKind[] = [
    "engagement",
    "case",
    "opportunity",
    "product_discussion",
    "note",
  ];

  for (const kind of preferKinds) {
    if (picked.length >= limit) break;
    const next = sorted.find((r) => r.kind === kind && !seen.has(r.id));
    if (next) {
      picked.push(next);
      seen.add(next.id);
    }
  }

  for (const r of sorted) {
    if (picked.length >= limit) break;
    if (seen.has(r.id)) continue;
    picked.push(r);
    seen.add(r.id);
  }

  return picked.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

export async function loadPrepareForMeetingRecentActivity(
  supabase: SupabaseClient,
  opts: {
    providerId: string;
    salesRepId: string;
  },
): Promise<PrepareRecentActivityFeed> {
  const timeline_href = `/portal/sales/providers/${encodeURIComponent(opts.providerId)}?tab=activity`;
  const raw: RawItem[] = [];

  const { data: engagementRows } = await supabase
    .from("surgical_sales_engagements")
    .select("id, engagement_type, status, title, updated_at, created_at")
    .eq("provider_id", opts.providerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(12);

  const engagementIds = (engagementRows || []).map((e) => String(e.id));

  for (const e of engagementRows || []) {
    const id = String(e.id);
    const typeLabel = formatEngagementType(String(e.engagement_type || ""));
    const statusLabel = formatEngagementStatus(String(e.status || ""));
    const at = String(e.updated_at || e.created_at || "");
    if (!at) continue;
    const isProduct =
      String(e.engagement_type || "") === "product_demo" ||
      String(e.engagement_type || "") === "office_visit_360";
    raw.push({
      id: `eng-row-${id}`,
      kind: isProduct ? "product_discussion" : "engagement",
      title: trimOrNull(e.title) || typeLabel,
      at,
      summary: `${typeLabel} · ${statusLabel}`,
      href: `/portal/sales/engagements/${encodeURIComponent(id)}`,
    });
  }

  if (engagementIds.length > 0) {
    const { data: engActs } = await supabase
      .from("surgical_sales_engagement_activities")
      .select("id, engagement_id, activity_type, body, created_at")
      .in("engagement_id", engagementIds)
      .order("created_at", { ascending: false })
      .limit(24);

    for (const a of engActs || []) {
      const at = String(a.created_at || "");
      const rawType = String(a.activity_type || "");
      if (!at) continue;
      raw.push({
        id: `eng-act-${a.id}`,
        kind: classifyEngagementActivityType(rawType),
        title: formatEngagementActivityType(rawType),
        at,
        summary: trimOrNull(a.body) || formatEngagementActivityType(rawType),
        href: `/portal/sales/engagements/${encodeURIComponent(String(a.engagement_id))}`,
      });
    }
  }

  const { data: caseRows } = await supabase
    .from("surgical_sales_cases")
    .select("id, case_number, case_type, status, updated_at, created_at")
    .eq("surgeon_contact_id", opts.providerId)
    .is("archived_at", null)
    .neq("status", "draft")
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(15);

  const caseIds = (caseRows || []).map((c) => String(c.id));
  const caseById = new Map(
    (caseRows || []).map((c) => [String(c.id), c as Record<string, unknown>]),
  );

  if (caseIds.length > 0) {
    const { data: caseActs } = await supabase
      .from("surgical_sales_case_activities")
      .select("id, case_id, activity_type, body, created_at")
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(20);

    for (const a of caseActs || []) {
      const at = String(a.created_at || "");
      if (!at) continue;
      const caseRow = caseById.get(String(a.case_id));
      const caseNum = caseRow ? String(caseRow.case_number || "Case") : "Case";
      raw.push({
        id: `case-act-${a.id}`,
        kind: "case",
        title: formatSurgicalCaseActivityType(String(a.activity_type || "")),
        at,
        summary: trimOrNull(a.body) || caseNum,
        href: `/portal/sales/cases/${encodeURIComponent(String(a.case_id))}`,
      });
    }
  }

  try {
    const { data: providerActs } = await supabase
      .from("surgical_sales_provider_activities")
      .select("id, activity_type, body, metadata_json, created_at")
      .eq("provider_id", opts.providerId)
      .order("created_at", { ascending: false })
      .limit(16);

    for (const a of providerActs || []) {
      const at = String(a.created_at || "");
      if (!at) continue;
      const meta = (a.metadata_json || {}) as Record<string, unknown>;
      const rawType = String(a.activity_type || "");
      raw.push({
        id: `prov-act-${a.id}`,
        kind: classifyProviderActivityType(rawType, meta),
        title: formatProviderActivityType(rawType),
        at,
        summary: trimOrNull(meta.question_label) || trimOrNull(a.body) || formatProviderActivityType(rawType),
        href: `/portal/sales/providers/${encodeURIComponent(opts.providerId)}?tab=intelligence`,
      });
    }
  } catch {
    /* provider activities optional */
  }

  const { data: opps } = await supabase
    .from("sales_opportunities")
    .select("id, account_name")
    .eq("surgeon_contact_id", opts.providerId)
    .order("updated_at", { ascending: false })
    .limit(8);

  const oppIds = (opps || []).map((o) => String(o.id));
  if (oppIds.length > 0) {
    const { data: salesActs } = await supabase
      .from("sales_activities")
      .select("id, opportunity_id, activity_type, summary, activity_at, created_at")
      .in("opportunity_id", oppIds)
      .order("activity_at", { ascending: false })
      .limit(12);

    for (const a of salesActs || []) {
      const at = String(a.activity_at || a.created_at || "");
      if (!at) continue;
      const opp = (opps || []).find((o) => String(o.id) === String(a.opportunity_id));
      const typeKey = String(a.activity_type || "note") as ActivityType;
      raw.push({
        id: `opp-act-${a.id}`,
        kind: "opportunity",
        title: ACTIVITY_TYPE_LABEL[typeKey] || OPPORTUNITY_UI.providerTimelineUpdate,
        at,
        summary: trimOrNull(a.summary) || String(opp?.account_name || "Evaluation"),
        href: `/portal/sales/opportunities/${encodeURIComponent(String(a.opportunity_id))}`,
      });
    }
  }

  const items = toRows(pickTopItems(raw, 5));

  return { items, timeline_href };
}
