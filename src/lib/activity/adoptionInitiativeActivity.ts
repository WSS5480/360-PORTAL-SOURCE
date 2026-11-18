import type { ActivityRelatedEntity } from "@/lib/activity/activityEvent";
import type { ActivityEventType } from "@/lib/activity/activityEventTypes";
import { dualWriteOpportunityEvent } from "@/lib/activity/dualWrite";
import { normalizeSalesStage, salesStageLabel, type SalesStage } from "@/lib/sales/stages";

export type AdoptionInitiativeSnapshot = {
  opportunityId: string;
  accountId?: string | null;
  accountName?: string | null;
  surgeonContactId?: string | null;
  physicianName?: string | null;
  stage?: string | null;
};

export function adoptionInitiativeSnapshotFromRow(row: Record<string, unknown>): AdoptionInitiativeSnapshot {
  return {
    opportunityId: String(row.id || ""),
    accountId: row.account_id ? String(row.account_id) : null,
    accountName: row.account_name ? String(row.account_name) : null,
    surgeonContactId: row.surgeon_contact_id ? String(row.surgeon_contact_id) : null,
    physicianName: row.physician_name ? String(row.physician_name) : null,
    stage: row.stage ? String(row.stage) : null,
  };
}

export function buildAdoptionInitiativeRelatedEntities(
  snapshot: AdoptionInitiativeSnapshot,
  extras?: {
    caseId?: string | null;
    engagementId?: string | null;
    caseLabel?: string | null;
    engagementLabel?: string | null;
  },
): ActivityRelatedEntity[] {
  const related: ActivityRelatedEntity[] = [];
  const providerId = String(snapshot.surgeonContactId || "").trim();
  if (providerId) {
    related.push({ entityType: "provider", entityId: providerId, role: "surgeon" });
  }
  const accountId = String(snapshot.accountId || "").trim();
  if (accountId) {
    related.push({
      entityType: "organization",
      entityId: accountId,
      label: snapshot.accountName ? String(snapshot.accountName) : null,
    });
  }
  const caseId = String(extras?.caseId || "").trim();
  if (caseId) {
    related.push({
      entityType: "case",
      entityId: caseId,
      role: "linked_case",
      label: extras?.caseLabel ? String(extras.caseLabel) : null,
    });
  }
  const engagementId = String(extras?.engagementId || "").trim();
  if (engagementId) {
    related.push({
      entityType: "engagement",
      entityId: engagementId,
      role: "linked_engagement",
      label: extras?.engagementLabel ? String(extras.engagementLabel) : null,
    });
  }
  return related;
}

export function resolveAdoptionStageActivityType(
  nextStage: string,
  prevStage?: string | null,
): ActivityEventType {
  const next = normalizeSalesStage(nextStage);
  const prev = prevStage ? normalizeSalesStage(prevStage) : null;
  if (prev && next === prev) return "OPPORTUNITY_STAGE_CHANGED";
  if (next === "won") return "OPPORTUNITY_WON";
  if (next === "lost") return "OPPORTUNITY_LOST";
  if (next === "evaluation_planned") return "EVALUATION_PLANNED";
  if (next === "evaluation_active") return "EVALUATION_ACTIVE";
  if (next === "preference_card_progress") return "PREFERENCE_CARD_PROGRESS_UPDATED";
  return "OPPORTUNITY_STAGE_CHANGED";
}

export function logAdoptionInitiativeActivity(params: {
  type: ActivityEventType;
  summary: string;
  userId: string;
  snapshot: AdoptionInitiativeSnapshot;
  title?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  caseId?: string | null;
  engagementId?: string | null;
  caseLabel?: string | null;
  engagementLabel?: string | null;
  legacy?: { source: "sales_activities"; activityId: string };
}): void {
  const opportunityId = String(params.snapshot.opportunityId || "").trim();
  if (!opportunityId) return;

  const stageTag = params.snapshot.stage ? normalizeSalesStage(params.snapshot.stage) : null;
  const tags = [...new Set([...(params.tags ?? []), "adoption_initiative", ...(stageTag ? [stageTag] : [])])];

  dualWriteOpportunityEvent({
    opportunityId,
    userId: params.userId,
    type: params.type,
    summary: params.summary,
    title: params.title,
    metadata: {
      opportunity_id: opportunityId,
      account_id: params.snapshot.accountId ?? null,
      account_name: params.snapshot.accountName ?? null,
      surgeon_contact_id: params.snapshot.surgeonContactId ?? null,
      physician_name: params.snapshot.physicianName ?? null,
      stage: params.snapshot.stage ?? null,
      ...(params.metadata ?? {}),
    },
    tags,
    relatedEntities: buildAdoptionInitiativeRelatedEntities(params.snapshot, {
      caseId: params.caseId,
      engagementId: params.engagementId,
      caseLabel: params.caseLabel,
      engagementLabel: params.engagementLabel,
    }),
    legacy: params.legacy,
  });
}

export function logAdoptionInitiativeStageChange(params: {
  userId: string;
  snapshot: AdoptionInitiativeSnapshot;
  fromStage: string;
  toStage: string;
  metadata?: Record<string, unknown>;
}): void {
  const from = normalizeSalesStage(params.fromStage);
  const to = normalizeSalesStage(params.toStage);
  if (!from || !to || from === to) return;

  const type = resolveAdoptionStageActivityType(to, from);
  const fromLabel = salesStageLabel(from);
  const toLabel = salesStageLabel(to);

  let summary = `Stage changed from ${fromLabel} to ${toLabel}.`;
  if (type === "OPPORTUNITY_WON") summary = "Evaluation marked won.";
  if (type === "OPPORTUNITY_LOST") summary = "Evaluation marked lost.";
  if (type === "EVALUATION_PLANNED") summary = "Moved to evaluation planned.";
  if (type === "EVALUATION_ACTIVE") summary = "Evaluation is now active.";
  if (type === "PREFERENCE_CARD_PROGRESS_UPDATED") summary = "Preference card progress updated.";

  logAdoptionInitiativeActivity({
    type,
    summary,
    userId: params.userId,
    snapshot: { ...params.snapshot, stage: to },
    metadata: { from_stage: from, to_stage: to, ...(params.metadata ?? {}) },
    tags: [from, to],
  });
}

export function logAdoptionInitiativeProviderLinked(params: {
  userId: string;
  snapshot: AdoptionInitiativeSnapshot;
  providerId: string;
  previousProviderId?: string | null;
}): void {
  logAdoptionInitiativeActivity({
    type: "PROVIDER_LINKED",
    summary: params.snapshot.physicianName
      ? `Provider ${params.snapshot.physicianName} linked to this evaluation.`
      : "Surgeon/provider linked to evaluation.",
    userId: params.userId,
    snapshot: params.snapshot,
    metadata: {
      surgeon_contact_id: params.providerId,
      previous_surgeon_contact_id: params.previousProviderId ?? null,
    },
  });
}

export function logAdoptionInitiativeOrganizationLinked(params: {
  userId: string;
  snapshot: AdoptionInitiativeSnapshot;
  previousAccountId?: string | null;
}): void {
  logAdoptionInitiativeActivity({
    type: "ORGANIZATION_LINKED",
    summary: params.snapshot.accountName
      ? `Organization ${params.snapshot.accountName} linked to this evaluation.`
      : "Organization linked to evaluation.",
    userId: params.userId,
    snapshot: params.snapshot,
    metadata: {
      account_id: params.snapshot.accountId ?? null,
      previous_account_id: params.previousAccountId ?? null,
    },
  });
}

export function logAdoptionInitiativeCaseLinked(params: {
  userId: string;
  snapshot: AdoptionInitiativeSnapshot;
  caseId: string;
  caseLabel?: string | null;
  previousOpportunityId?: string | null;
}): void {
  logAdoptionInitiativeActivity({
    type: "CASE_LINKED",
    summary: params.caseLabel
      ? `Case ${params.caseLabel} linked to this evaluation.`
      : "Surgical case linked to evaluation.",
    userId: params.userId,
    snapshot: params.snapshot,
    caseId: params.caseId,
    caseLabel: params.caseLabel,
    metadata: {
      case_id: params.caseId,
      case_number: params.caseLabel ?? null,
      previous_opportunity_id: params.previousOpportunityId ?? null,
    },
  });
}

export function logAdoptionInitiativeEngagementLinked(params: {
  userId: string;
  snapshot: AdoptionInitiativeSnapshot;
  engagementId: string;
  engagementLabel?: string | null;
}): void {
  logAdoptionInitiativeActivity({
    type: "ENGAGEMENT_LINKED",
    summary: params.engagementLabel
      ? `Engagement "${params.engagementLabel}" linked to this evaluation.`
      : "Engagement linked to evaluation.",
    userId: params.userId,
    snapshot: params.snapshot,
    engagementId: params.engagementId,
    engagementLabel: params.engagementLabel,
    metadata: { engagement_id: params.engagementId },
  });
}

export function isAdoptionMilestoneStage(stage: string): stage is SalesStage {
  const s = normalizeSalesStage(stage);
  return (
    s === "evaluation_planned" ||
    s === "evaluation_active" ||
    s === "preference_card_progress" ||
    s === "won" ||
    s === "lost"
  );
}
