import type { SupabaseClient } from "@supabase/supabase-js";
import { salesStageLabel } from "@/lib/sales/stages";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  formatEngagementStatus,
  formatEngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import { loadPrepareForMeetingRecentActivity } from "@/lib/surgical-sales/engagements/prepareForMeetingRecentActivity";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { listClinicalDiscoveryAnswersForProvider } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import {
  isPreCallPlanProductLine,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

/** AI-ready payload for meeting prep (serializable JSON). */
export type MeetingPrepContext = {
  assembled_at: string;
  engagement_id: string;
  sales_rep_id: string;
  product_line: MeetingPrepProductLineContext;
  provider: MeetingPrepProviderContext;
  organization: MeetingPrepOrganizationContext | null;
  engagement: MeetingPrepEngagementContext;
  opportunity: MeetingPrepOpportunityContext | null;
  recent_engagements: MeetingPrepRecentEngagement[];
  recent_cases: MeetingPrepRecentCase[];
  recent_notes: MeetingPrepRecentNote[];
  recent_activity: MeetingPrepRecentActivityItem[];
  intelligence: MeetingPrepIntelligenceContext;
};

export type MeetingPrepProductLineContext = {
  primary: PreCallPlanProductLine | null;
  /** Raw value from opportunity or other source */
  raw: string | null;
  source: "linked_opportunity" | "unknown";
};

export type MeetingPrepProviderContext = {
  id: string;
  display_name: string;
  specialty: string | null;
  title: string | null;
  relationship_strength: string | null;
  influence_level: string | null;
  preferred_hospital: string | null;
  communication_style: string | null;
  crm_status: string | null;
  access_notes: string | null;
};

export type MeetingPrepOrganizationContext = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

export type MeetingPrepEngagementPlanningContext = {
  purpose: string | null;
  observation_goal: string | null;
  opening_statement: string | null;
  probes: string | null;
  tools_resources: string | null;
  value_hypothesis: string | null;
  planned_close: string | null;
  next_action: string | null;
  follow_up_tasks: string | null;
  sim_lab_focus: string | null;
  products_to_demonstrate: string | null;
  hands_on_goals: string | null;
  adoption_signals_to_watch: string | null;
};

export type MeetingPrepEngagementContext = {
  id: string;
  title: string | null;
  engagement_type: string;
  engagement_type_label: string;
  status: string;
  status_label: string;
  scheduled_at: string | null;
  engagement_date: string | null;
  notes: string | null;
  is_current: true;
  is_prepared: boolean;
  prepared_at: string | null;
  planning: MeetingPrepEngagementPlanningContext;
};

export type MeetingPrepOpportunityContext = {
  id: string;
  account_name: string;
  physician_name: string | null;
  stage: string | null;
  stage_label: string | null;
  product_line: string | null;
  is_linked_to_engagement: true;
};

export type MeetingPrepRecentEngagement = {
  id: string;
  title: string | null;
  engagement_type: string;
  engagement_type_label: string;
  status: string;
  status_label: string;
  scheduled_at: string | null;
  engagement_date: string | null;
  is_current: boolean;
};

export type MeetingPrepRecentCase = {
  id: string;
  case_number: string | null;
  case_type: string | null;
  status: string | null;
  case_date: string | null;
  procedure_type: string | null;
  opportunity_id: string | null;
  updated_at: string | null;
};

export type MeetingPrepRecentNote = {
  id: string;
  body: string;
  note_type: string | null;
  entity_type: string;
  created_at: string;
  opportunity_id: string | null;
  case_id: string | null;
};

export type MeetingPrepRecentActivityItem = {
  id: string;
  kind: string;
  title: string;
  at: string;
  summary: string;
};

export type MeetingPrepIntelligenceContext = {
  procedures: string | null;
  technique_preferences: string | null;
  product_interests: string | null;
  current_vendors: string | null;
  competitive_products: string | null;
  evaluation_openness: string | null;
  or_team_dynamics: string | null;
  relationship_summary: string | null;
  preference_card_signals: string | null;
};

const LIMIT = {
  engagements: 10,
  cases: 10,
  notes: 12,
  activity: 12,
} as const;

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function truncate(text: string | null | undefined, max: number): string | null {
  const t = trimOrNull(text);
  if (!t) return null;
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function resolvePrimaryProductLine(raw: string | null | undefined): MeetingPrepProductLineContext {
  const full = trimOrNull(raw);
  if (!full) {
    return { primary: null, raw: null, source: "unknown" };
  }
  const first = full.split(/[,;|]/)[0]?.trim() ?? "";
  const primary = isPreCallPlanProductLine(first) ? first : null;
  return {
    primary,
    raw: full,
    source: "linked_opportunity",
  };
}

function mapEngagementRow(
  row: Record<string, unknown>,
  opts?: { is_current?: boolean },
): MeetingPrepRecentEngagement {
  const type = String(row.engagement_type ?? "");
  return {
    id: String(row.id),
    title: trimOrNull(row.title),
    engagement_type: type,
    engagement_type_label: formatEngagementType(type),
    status: String(row.status ?? ""),
    status_label: formatEngagementStatus(String(row.status ?? "")),
    scheduled_at: trimOrNull(row.scheduled_at),
    engagement_date: trimOrNull(row.engagement_date),
    is_current: opts?.is_current === true,
  };
}

function buildEngagementPlanning(row: Record<string, unknown>): MeetingPrepEngagementPlanningContext {
  return {
    purpose: truncate(trimOrNull(row.engagement_purpose), 800),
    observation_goal: truncate(trimOrNull(row.observation_goal), 800),
    opening_statement: truncate(trimOrNull(row.pre_observation_impact_opening_statement), 800),
    probes: truncate(trimOrNull(row.pre_observation_probes), 1200),
    tools_resources: truncate(trimOrNull(row.pre_observation_tools_resources), 800),
    value_hypothesis: truncate(trimOrNull(row.pre_observation_value_hypothesis), 800),
    planned_close: truncate(trimOrNull(row.pre_observation_planned_close), 800),
    next_action: truncate(trimOrNull(row.next_action), 500),
    follow_up_tasks: truncate(trimOrNull(row.follow_up_tasks), 800),
    sim_lab_focus: truncate(trimOrNull(row.sim_lab_focus), 500),
    products_to_demonstrate: truncate(trimOrNull(row.products_to_demonstrate), 500),
    hands_on_goals: truncate(trimOrNull(row.hands_on_goals), 500),
    adoption_signals_to_watch: truncate(trimOrNull(row.adoption_signals_to_watch), 500),
  };
}

function mapIntelligenceSnapshot(
  snap: ReturnType<typeof buildProviderIntelligenceSnapshot>,
): MeetingPrepIntelligenceContext {
  return {
    procedures: truncate(snap.procedures, 400),
    technique_preferences: truncate(snap.technique_preferences, 400),
    product_interests: truncate(snap.product_interests, 400),
    current_vendors: truncate(snap.current_vendors, 400),
    competitive_products: truncate(snap.competitive_products, 400),
    evaluation_openness: truncate(snap.evaluation_openness, 400),
    or_team_dynamics: truncate(snap.or_team_dynamics, 400),
    relationship_summary: truncate(snap.relationship_summary, 500),
    preference_card_signals: truncate(snap.preference_card_signals, 400),
  };
}

async function loadRecentNotes(
  supabase: SupabaseClient,
  opts: {
    providerId: string;
    opportunityId: string | null;
    caseIds: string[];
  },
): Promise<MeetingPrepRecentNote[]> {
  const notes: MeetingPrepRecentNote[] = [];
  const seen = new Set<string>();

  const push = (row: Record<string, unknown>) => {
    const id = String(row.id);
    if (seen.has(id)) return;
    seen.add(id);
    const body = truncate(trimOrNull(row.body), 600);
    if (!body) return;
    notes.push({
      id,
      body,
      note_type: trimOrNull(row.note_type),
      entity_type: String(row.entity_type ?? ""),
      created_at: String(row.created_at ?? ""),
      opportunity_id: row.opportunity_id ? String(row.opportunity_id) : null,
      case_id: row.case_id ? String(row.case_id) : null,
    });
  };

  const { data: byProvider } = await supabase
    .from("sales_operational_notes")
    .select("id, body, note_type, entity_type, created_at, opportunity_id, case_id")
    .eq("provider_id", opts.providerId)
    .order("created_at", { ascending: false })
    .limit(LIMIT.notes);

  for (const row of byProvider || []) {
    push(row as Record<string, unknown>);
  }

  if (opts.opportunityId) {
    const { data: byOpp } = await supabase
      .from("sales_operational_notes")
      .select("id, body, note_type, entity_type, created_at, opportunity_id, case_id")
      .eq("opportunity_id", opts.opportunityId)
      .order("created_at", { ascending: false })
      .limit(LIMIT.notes);
    for (const row of byOpp || []) {
      push(row as Record<string, unknown>);
    }
  }

  return notes
    .filter((n) => n.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, LIMIT.notes);
}

/**
 * Gathers CRM context for a single engagement into a structured object suitable for
 * an AI briefing endpoint. Does not call OpenAI or any external model.
 */
export async function assembleMeetingPrepContext(input: {
  engagementId: string;
  userId: string;
  supabase?: SupabaseClient;
}): Promise<
  | { ok: true; context: MeetingPrepContext }
  | { ok: false; error: string; status: 404 | 500 }
> {
  const supabase = input.supabase ?? supabaseAdmin;

  const engagement = await loadEngagementForPortalActor(input.engagementId, input.userId, {
    includeArchived: true,
  });
  if (!engagement) {
    return { ok: false, error: "Engagement not found", status: 404 };
  }

  const engagementId = String(engagement.id);
  const providerId = String(engagement.provider_id);
  const orgId = engagement.organization_id ? String(engagement.organization_id) : null;
  const opportunityId = engagement.opportunity_id ? String(engagement.opportunity_id) : null;

  const [
    providerRes,
    providerLinkRes,
    orgRes,
    oppRes,
    recentEngagementsRes,
    recentCasesRes,
    clinicalAnswers,
  ] = await Promise.all([
    supabase.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle(),
    supabase
      .from("surgical_sales_contact_organizations")
      .select("specialty, influence_level, preferred_hospital")
      .eq("contact_id", providerId)
      .eq("is_active", true)
      .order("is_primary_org", { ascending: false })
      .limit(1)
      .maybeSingle(),
    orgId
      ? supabase
          .from(SALES_ORGANIZATIONS_TABLE)
          .select("id, name, surgical_crm_billing_city, surgical_crm_billing_state")
          .eq("id", orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    opportunityId
      ? supabase
          .from("sales_opportunities")
          .select("id, account_name, physician_name, stage, product_line, updated_at")
          .eq("id", opportunityId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("surgical_sales_engagements")
      .select("id, title, engagement_type, status, scheduled_at, engagement_date, updated_at")
      .eq("provider_id", providerId)
      .is("archived_at", null)
      .order("engagement_date", { ascending: false, nullsFirst: false })
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .limit(LIMIT.engagements),
    supabase
      .from("surgical_sales_cases")
      .select(
        "id, case_number, case_type, status, case_date, procedure_type, related_opportunity_id, updated_at",
      )
      .eq("surgeon_contact_id", providerId)
      .is("archived_at", null)
      .neq("status", "draft")
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(LIMIT.cases),
    listClinicalDiscoveryAnswersForProvider(supabase, providerId).catch(() => []),
  ]);

  const providerRow = providerRes.data as Record<string, unknown> | null;
  const link = providerLinkRes.data;

  const recentCases: MeetingPrepRecentCase[] = (recentCasesRes.data || []).map((c) => ({
    id: String(c.id),
    case_number: trimOrNull(c.case_number),
    case_type: trimOrNull(c.case_type),
    status: trimOrNull(c.status),
    case_date: trimOrNull(c.case_date),
    procedure_type: trimOrNull(c.procedure_type),
    opportunity_id: c.related_opportunity_id ? String(c.related_opportunity_id) : null,
    updated_at: trimOrNull(c.updated_at),
  }));

  const caseIds = recentCases.map((c) => c.id);

  const [recentNotes, recentActivityFeed] = await Promise.all([
    loadRecentNotes(supabase, {
      providerId,
      opportunityId,
      caseIds,
    }),
    loadPrepareForMeetingRecentActivity(supabase, {
      providerId,
      salesRepId: input.userId,
    }),
  ]);

  const recent_activity: MeetingPrepRecentActivityItem[] = recentActivityFeed.items
    .slice(0, LIMIT.activity)
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      at: item.at,
      summary: item.summary,
    }));

  const providerDisplay = providerRow
    ? contactDisplayName(providerRow as Parameters<typeof contactDisplayName>[0])
    : "Provider";

  const intelligenceSnap = buildProviderIntelligenceSnapshot(providerRow ?? {}, providerId);

  const opportunityRow = oppRes.data as Record<string, unknown> | null;
  const product_line = opportunityRow
    ? resolvePrimaryProductLine(trimOrNull(opportunityRow.product_line))
    : { primary: null, raw: null, source: "unknown" as const };

  const opportunity: MeetingPrepOpportunityContext | null = opportunityRow
    ? {
        id: String(opportunityRow.id),
        account_name: String(opportunityRow.account_name ?? "").trim() || "Evaluation",
        physician_name: trimOrNull(opportunityRow.physician_name),
        stage: trimOrNull(opportunityRow.stage),
        stage_label: opportunityRow.stage
          ? salesStageLabel(String(opportunityRow.stage))
          : null,
        product_line: trimOrNull(opportunityRow.product_line),
        is_linked_to_engagement: true,
      }
    : null;

  const organization: MeetingPrepOrganizationContext | null = orgRes.data
    ? {
        id: String((orgRes.data as { id: string }).id),
        name: String((orgRes.data as { name?: string }).name ?? "").trim() || "Organization",
        city: trimOrNull(
          (orgRes.data as { surgical_crm_billing_city?: string | null }).surgical_crm_billing_city,
        ),
        state: trimOrNull(
          (orgRes.data as { surgical_crm_billing_state?: string | null }).surgical_crm_billing_state,
        ),
      }
    : null;

  const provider: MeetingPrepProviderContext = {
    id: providerId,
    display_name: providerDisplay,
    specialty: link?.specialty ? String(link.specialty) : null,
    title: trimOrNull(providerRow?.title),
    relationship_strength: trimOrNull(providerRow?.relationship_strength),
    influence_level:
      trimOrNull(link?.influence_level) || trimOrNull(providerRow?.influence_level),
    preferred_hospital: trimOrNull(link?.preferred_hospital),
    communication_style: truncate(
      trimOrNull(providerRow?.provider_communication_style) ||
        trimOrNull(providerRow?.personality_notes),
      400,
    ),
    crm_status: trimOrNull(providerRow?.provider_crm_status),
    access_notes: truncate(trimOrNull(providerRow?.access_notes), 400),
  };

  const engagementContext: MeetingPrepEngagementContext = {
    ...mapEngagementRow(engagement, { is_current: true }),
    notes: truncate(trimOrNull(engagement.notes), 1200),
    is_current: true,
    is_prepared: Boolean(engagement.prepared_at),
    prepared_at: trimOrNull(engagement.prepared_at),
    planning: buildEngagementPlanning(engagement),
  };

  const recent_engagements: MeetingPrepRecentEngagement[] = (recentEngagementsRes.data || [])
    .map((row) => mapEngagementRow(row as Record<string, unknown>, { is_current: false }))
    .filter((e) => e.id !== engagementId);

  const currentInList = recent_engagements.some((e) => e.id === engagementId);
  const allRecentEngagements = currentInList
    ? recent_engagements
    : [engagementContext, ...recent_engagements].slice(0, LIMIT.engagements);

  const context: MeetingPrepContext = {
    assembled_at: new Date().toISOString(),
    engagement_id: engagementId,
    sales_rep_id: input.userId,
    product_line,
    provider,
    organization,
    engagement: engagementContext,
    opportunity,
    recent_engagements: allRecentEngagements,
    recent_cases: recentCases,
    recent_notes: recentNotes,
    recent_activity,
    intelligence: mapIntelligenceSnapshot(intelligenceSnap),
  };

  return { ok: true, context };
}
