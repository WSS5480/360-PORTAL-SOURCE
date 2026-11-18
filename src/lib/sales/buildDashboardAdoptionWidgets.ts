import { contactMatchesPhysicianName } from "@/lib/surgical-sales/providerDirectory";
import {
  isOpenSalesStage,
  normalizeSalesStage,
  salesStageLabel,
  type SalesStage,
} from "@/lib/sales/stages";

const EVALUATION_STAGES: SalesStage[] = ["evaluation_planned", "evaluation_active"];
const PREFERENCE_CARD_STAGES: SalesStage[] = ["preference_card_progress"];

export type DashboardOppWidgetItem = {
  id: string;
  account_name: string;
  physician_name: string | null;
  product_line: string | null;
  stage: SalesStage;
  next_action: string | null;
  updated_at: string;
};

export type DashboardFollowUpItem = DashboardOppWidgetItem & {
  reasons: string[];
};

export type DashboardProviderProspectItem = {
  id: string;
  display_name: string;
  organization_name: string | null;
  relationship_stage: string;
  updated_at: string;
};

export type DashboardAdoptionWidgetList<T> = {
  count: number;
  items: T[];
};

export type DashboardAdoptionWidgets = {
  active_evaluations: DashboardAdoptionWidgetList<DashboardOppWidgetItem>;
  needing_follow_up: DashboardAdoptionWidgetList<DashboardFollowUpItem>;
  preference_card_progress: DashboardAdoptionWidgetList<DashboardOppWidgetItem>;
  provider_prospects_without_opportunity: DashboardAdoptionWidgetList<DashboardProviderProspectItem>;
};

type OppRow = {
  id: string;
  account_id?: string | null;
  account_name?: string | null;
  physician_name?: string | null;
  surgeon_contact_id?: string | null;
  product_line?: string | null;
  stage: string;
  close_date?: string | null;
  next_action?: string | null;
  updated_at: string;
};

type ProviderRow = Record<string, unknown>;

const FOLLOW_UP_REASON_LABELS = {
  overdue_task: "Overdue task",
  stale: "Past close date",
  no_next_task: "No open task",
  no_activity: "No touch 14d",
  no_next_action: "Missing next action",
} as const;

type FollowUpReasonKey = keyof typeof FOLLOW_UP_REASON_LABELS;

const FOLLOW_UP_PRIORITY: FollowUpReasonKey[] = [
  "overdue_task",
  "no_next_task",
  "no_next_action",
  "stale",
  "no_activity",
];

function toOppItem(row: OppRow): DashboardOppWidgetItem {
  const stage = normalizeSalesStage(row.stage) ?? "discovery";
  return {
    id: String(row.id),
    account_name: String(row.account_name || "—").trim() || "—",
    physician_name: row.physician_name ? String(row.physician_name).trim() : null,
    product_line: row.product_line ? String(row.product_line).trim() : null,
    stage,
    next_action: row.next_action ? String(row.next_action).trim() : null,
    updated_at: String(row.updated_at || ""),
  };
}

function providerDisplayName(row: ProviderRow): string {
  const first = String(row.first_name || "").trim();
  const last = String(row.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return String(row.email || "Provider").trim() || "Provider";
}

function isProspectProvider(row: ProviderRow): boolean {
  const rel = String(row.provider_relationship_stage || row.relationship_stage || "").trim().toLowerCase();
  const crm = String(row.provider_crm_status || row.crm_status || "").trim().toLowerCase();
  return rel === "prospect" || crm === "prospect";
}

function countLinkedOpportunities(
  provider: ProviderRow,
  accountIds: Set<string>,
  opps: OppRow[],
): number {
  let linked = 0;
  for (const o of opps) {
    const aid = String(o.account_id || "");
    const nameMatch = contactMatchesPhysicianName(provider as never, String(o.physician_name || ""));
    const orgMatch = aid && accountIds.has(aid);
    const surgeonMatch =
      o.surgeon_contact_id && String(o.surgeon_contact_id) === String((provider as { id?: string }).id || "");
    if (nameMatch || orgMatch || surgeonMatch) linked += 1;
  }
  return linked;
}

export function buildDashboardAdoptionWidgets(params: {
  opportunities: OppRow[];
  openIds: string[];
  todayUtc: string;
  activityCutoffIso: string;
  incompleteTasks: Array<{ opportunity_id: string; due_date: string }>;
  recentActivityOppIds: Set<string>;
  providers: ProviderRow[];
  providerOrgIdsByContact: Map<string, Set<string>>;
  providerOrgNameByContact: Map<string, string | null>;
  listLimit?: number;
}): DashboardAdoptionWidgets {
  const limit = params.listLimit ?? 8;
  const openRows = params.opportunities.filter((r) => isOpenSalesStage(normalizeSalesStage(r.stage) ?? "discovery"));

  const activeEvaluations = openRows
    .filter((r) => {
      const s = normalizeSalesStage(r.stage);
      return s && EVALUATION_STAGES.includes(s);
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map(toOppItem);

  const preferenceCard = openRows
    .filter((r) => {
      const s = normalizeSalesStage(r.stage);
      return s && PREFERENCE_CARD_STAGES.includes(s);
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map(toOppItem);

  const oppWithOpenTask = new Set(
    params.incompleteTasks.map((t) => String(t.opportunity_id)),
  );
  const oppWithOverdueTask = new Set(
    params.incompleteTasks
      .filter((t) => String(t.due_date) < params.todayUtc)
      .map((t) => String(t.opportunity_id)),
  );
  const oppWithRecentActivity = params.recentActivityOppIds;

  const followUpById = new Map<string, { item: DashboardOppWidgetItem; reasons: Set<FollowUpReasonKey> }>();

  for (const row of openRows) {
    const id = String(row.id);
    const reasons = new Set<FollowUpReasonKey>();
    if (oppWithOverdueTask.has(id)) reasons.add("overdue_task");
    if (!oppWithOpenTask.has(id)) reasons.add("no_next_task");
    if (!String(row.next_action || "").trim()) reasons.add("no_next_action");
    if (reasons.size === 0) continue;
    followUpById.set(id, { item: toOppItem(row), reasons });
  }

  const needingFollowUp: DashboardFollowUpItem[] = [...followUpById.values()]
    .map(({ item, reasons }) => {
      const sortedReasons = FOLLOW_UP_PRIORITY.filter((k) => reasons.has(k)).map((k) => FOLLOW_UP_REASON_LABELS[k]);
      return { ...item, reasons: sortedReasons };
    })
    .sort((a, b) => {
      const pri = (r: DashboardFollowUpItem) =>
        Math.min(...r.reasons.map((label) => FOLLOW_UP_PRIORITY.findIndex((k) => FOLLOW_UP_REASON_LABELS[k] === label)));
      return pri(a) - pri(b) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const prospects: DashboardProviderProspectItem[] = [];
  for (const row of params.providers) {
    if (!isProspectProvider(row)) continue;
    const id = String((row as { id?: string }).id || "");
    if (!id) continue;
    const accountIds = params.providerOrgIdsByContact.get(id) ?? new Set<string>();
    const linked = countLinkedOpportunities(row, accountIds, params.opportunities);
    if (linked > 0) continue;
    prospects.push({
      id,
      display_name: providerDisplayName(row),
      organization_name: params.providerOrgNameByContact.get(id) ?? null,
      relationship_stage: String(row.provider_relationship_stage || row.relationship_stage || "prospect"),
      updated_at: String(row.updated_at || row.created_at || ""),
    });
  }
  prospects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return {
    active_evaluations: {
      count: activeEvaluations.length,
      items: activeEvaluations.slice(0, limit),
    },
    needing_follow_up: {
      count: needingFollowUp.length,
      items: needingFollowUp.slice(0, limit),
    },
    preference_card_progress: {
      count: preferenceCard.length,
      items: preferenceCard.slice(0, limit),
    },
    provider_prospects_without_opportunity: {
      count: prospects.length,
      items: prospects.slice(0, limit),
    },
  };
}

export function adoptionWidgetStageChip(stage: SalesStage): string {
  return salesStageLabel(stage);
}
