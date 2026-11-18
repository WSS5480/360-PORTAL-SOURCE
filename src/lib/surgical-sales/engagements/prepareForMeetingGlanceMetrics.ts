import type { SupabaseClient } from "@supabase/supabase-js";
import { OPEN_SALES_STAGES, salesStageLabel } from "@/lib/sales/stages";

export type PrepareAtAGlanceMetrics = {
  engagement_count: number;
  or_observation_count: number;
  cases_supported_count: number;
  active_opportunity_label: string;
  active_opportunity_href: string | null;
};

export type PrepareAtAGlanceStat = {
  key: string;
  label: string;
  value: string;
  href?: string | null;
};

function truncate(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatActiveOpportunityLabel(input: {
  linked?: { id: string; product_line?: string | null; stage?: string | null } | null;
  openCount: number;
  topProductLine: string | null;
  topStage: string | null;
  topId: string | null;
}): { label: string; href: string | null } {
  if (input.linked?.id) {
    const line = String(input.linked.product_line ?? "").trim();
    const stage = input.linked.stage ? salesStageLabel(String(input.linked.stage)) : "";
    const label = line || stage || "Related opportunity";
    const withStage = line && stage ? `${truncate(line, 22)} · ${truncate(stage, 14)}` : truncate(label, 28);
    return {
      label: withStage,
      href: `/portal/sales/opportunities/${encodeURIComponent(input.linked.id)}`,
    };
  }
  if (input.openCount <= 0) return { label: "—", href: null };
  if (input.openCount === 1 && input.topId) {
    const line = input.topProductLine?.trim() || "Active";
    const stage = input.topStage ? salesStageLabel(input.topStage) : "";
    return {
      label: stage ? `${truncate(line, 18)} · ${truncate(stage, 12)}` : truncate(line, 28),
      href: `/portal/sales/opportunities/${encodeURIComponent(input.topId)}`,
    };
  }
  return { label: `${input.openCount} active`, href: null };
}

export function buildPrepareAtAGlanceStats(metrics: PrepareAtAGlanceMetrics): PrepareAtAGlanceStat[] {
  return [
    { key: "engagements", label: "Engagements", value: String(metrics.engagement_count) },
    { key: "or_observations", label: "OR observations", value: String(metrics.or_observation_count) },
    { key: "cases", label: "Cases supported", value: String(metrics.cases_supported_count) },
    {
      key: "initiative",
      label: "Opportunity",
      value: metrics.active_opportunity_label,
      href: metrics.active_opportunity_href,
    },
  ];
}

export async function loadPrepareForMeetingGlanceMetrics(
  supabase: SupabaseClient,
  opts: {
    providerId: string;
    salesRepId: string;
    linkedOpportunity?: {
      id: string;
      product_line?: string | null;
      stage?: string | null;
    } | null;
  },
): Promise<PrepareAtAGlanceMetrics> {
  const openStages = [...OPEN_SALES_STAGES];

  const [engRes, obsRes, caseRes, openCountRes, topOppRes] = await Promise.all([
    supabase
      .from("surgical_sales_engagements")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", opts.providerId)
      .is("archived_at", null),
    supabase
      .from("surgical_sales_cases")
      .select("id", { count: "exact", head: true })
      .eq("surgeon_contact_id", opts.providerId)
      .eq("case_type", "observation")
      .is("archived_at", null)
      .neq("status", "draft")
      .neq("status", "cancelled"),
    supabase
      .from("surgical_sales_cases")
      .select("id", { count: "exact", head: true })
      .eq("surgeon_contact_id", opts.providerId)
      .is("archived_at", null)
      .neq("status", "draft")
      .neq("status", "cancelled"),
    supabase
      .from("sales_opportunities")
      .select("id", { count: "exact", head: true })
      .eq("surgeon_contact_id", opts.providerId)
      .in("stage", openStages),
    supabase
      .from("sales_opportunities")
      .select("id, product_line, stage")
      .eq("surgeon_contact_id", opts.providerId)
      .in("stage", openStages)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const topOpp = topOppRes.data as {
    id: string;
    product_line?: string | null;
    stage?: string | null;
  } | null;
  const active = formatActiveOpportunityLabel({
    linked: opts.linkedOpportunity ?? null,
    openCount: openCountRes.count ?? 0,
    topProductLine: topOpp?.product_line ? String(topOpp.product_line) : null,
    topStage: topOpp?.stage ? String(topOpp.stage) : null,
    topId: topOpp?.id ? String(topOpp.id) : null,
  });

  return {
    engagement_count: engRes.count ?? 0,
    or_observation_count: obsRes.count ?? 0,
    cases_supported_count: caseRes.count ?? 0,
    active_opportunity_label: active.label,
    active_opportunity_href: active.href,
  };
}
