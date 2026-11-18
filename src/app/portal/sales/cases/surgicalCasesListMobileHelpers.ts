import {
  deriveCaseBoardWorkflowStage,
  countCaseBoardWorkflowOpenItems,
  groupCasesByBoardWorkflowStage,
  type CaseBoardWorkflowStageId,
} from "@/lib/surgical-sales/buildCaseBoardWorkflowStage";
import { deriveCaseBoardNextAction } from "@/lib/surgical-sales/buildCaseBoardNextAction";
import { deriveCaseBoardPriorityInsightResult } from "@/lib/surgical-sales/buildCaseBoardPriorityInsight";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import { productSupportCaseOutcomeLabel } from "@/lib/surgical-sales/productSupportCaseOutcome";
import {
  buildCaseIdentityFromListItem,
  formatCaseIdentityDate,
} from "@/lib/surgical-sales/buildCaseIdentity";
import {
  buildCaseOperationalContextView,
  caseListOperationalPrepHint,
} from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { buildProductSupportCaseStatusBadges } from "@/lib/surgical-sales/buildProductSupportCaseIdentity";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS } from "@/lib/surgical-sales/pathwayStageIntelligenceLabels";
import {
  formatSurgicalCaseNumber,
  formatSurgicalCaseStatus,
  formatSurgicalCaseType,
  isSurgicalObservationCase,
} from "@/lib/surgical-sales/labels";
import { countDelimitedObjectiveLines } from "@/lib/surgical-sales/observationObjectives";
import { observationWatchItemsFromCaseRow } from "@/lib/surgical-sales/observationWatchItems";
import {
  assessCaseSalesExecutionNeedsAction,
  caseNeedsDebriefPlanning,
  caseRecordNeedsAction,
} from "@/lib/surgical-sales/salesExecutionNeedsAction";

export type CaseBoardCardMeta = {
  providerName: string;
  procedureLabel: string;
  facilityName: string;
  dateLine: string;
};

export type CaseBoardCardIntelligenceItem = {
  label: string;
  value: string;
};

export type CaseBoardCardMetricPill = {
  id: string;
  text: string;
};

export type CaseBoardCardKind = "observation" | "product_support";

export type SurgicalCaseBoardCardView = CaseBoardCardMeta & {
  caseBoardKind: CaseBoardCardKind;
  /** Case-type-specific status shown on the card badge. */
  statusLabel: string;
  /** @deprecated Use statusLabel */
  workflowStatusLabel: string;
  priorityInsight: string;
  priorityInsightSourceLabel: string;
  priorityInsightSourceField: string | null;
  insightSectionLabel: string;
  metricsSectionLabel: string;
  metricsEmptyLabel: string;
  metricPills: CaseBoardCardMetricPill[];
  /** @deprecated Use metricPills */
  intelligenceItems: CaseBoardCardIntelligenceItem[];
  nextRecommendedAction: string;
};

/** @deprecated Use SurgicalCaseBoardCardView */
export type ObservationBoardCardView = SurgicalCaseBoardCardView;

/** @deprecated Use SurgicalCaseBoardCardView */
export type ProductSupportBoardCardView = SurgicalCaseBoardCardView;

/** @deprecated Use CaseBoardWorkflowStageId from buildCaseBoardWorkflowStage */
export type MissionBoardStageId =
  | "needs_planning"
  | "ready_to_observe"
  | "awaiting_debrief"
  | "follow_up_needed"
  | "completed";

/** @deprecated Use CASE_BOARD_WORKFLOW_STAGES from buildCaseBoardWorkflowStage */
export const MISSION_BOARD_STAGES: ReadonlyArray<{
  id: MissionBoardStageId;
  label: string;
  title: string;
}> = [
  { id: "needs_planning", label: "Planning", title: "Cases being set up before the field" },
  { id: "ready_to_observe", label: "Upcoming", title: "Scheduled cases ready for the field" },
  { id: "awaiting_debrief", label: "Debrief Due", title: "Cases waiting on debrief or documentation" },
  { id: "follow_up_needed", label: "Follow Up", title: "Cases flagged for follow-up" },
  { id: "completed", label: "Closed", title: "Completed, invoiced, or archived cases" },
] as const;

export {
  CASE_BOARD_WORKFLOW_STAGES,
  deriveCaseBoardWorkflowStage,
  groupCasesByBoardWorkflowStage,
  visibleCaseBoardWorkflowStages,
  countCaseBoardWorkflowOpenItems,
  caseNeedsDebriefOrOutcomeReview,
  type CaseBoardWorkflowStageId,
} from "@/lib/surgical-sales/buildCaseBoardWorkflowStage";

function mapWorkflowStageToMissionStage(stage: CaseBoardWorkflowStageId): MissionBoardStageId {
  switch (stage) {
    case "requested":
    case "approved":
      return "needs_planning";
    case "scheduled":
      return "ready_to_observe";
    case "completed":
    case "debrief_ready":
      return "awaiting_debrief";
    case "follow_up":
      return "follow_up_needed";
    case "closed":
      return "completed";
    default:
      return "needs_planning";
  }
}

export type MissionCaseIntelligenceItem = {
  id: "scheduling" | "credentialing" | "debrief" | "notes";
  label: string;
  severity: "warn" | "info";
};

/** @deprecated Use MissionCaseIntelligenceItem */
export type MissionCaseBlocker = MissionCaseIntelligenceItem;

/** Section label for pathway intelligence on legacy operations views. */
export function caseMissionBoardIntelligenceSectionLabel(
  stageId: MissionBoardStageId | CaseBoardWorkflowStageId,
): string {
  const missionStage =
    stageId === "requested" ||
    stageId === "approved" ||
    stageId === "scheduled" ||
    stageId === "completed" ||
    stageId === "debrief_ready" ||
    stageId === "follow_up" ||
    stageId === "closed"
      ? mapWorkflowStageToMissionStage(stageId)
      : stageId;

  switch (missionStage) {
    case "needs_planning":
      return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.discovery;
    case "ready_to_observe":
      return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.observation;
    case "awaiting_debrief":
    case "follow_up_needed":
      return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.evaluation;
    case "completed":
      return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.customer;
    default:
      return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.discovery;
  }
}

export function isCaseReadyToObserve(c: EnrichedSurgicalCaseListItem): boolean {
  const st = caseStatus(c);
  if (st !== "scheduled" && st !== "confirmed") return false;
  if (!c.case_date) return false;
  if (!String(c.surgeon_display ?? "").trim() && !c.surgeon_contact_id) return false;
  return true;
}

export function deriveMissionBoardStage(c: EnrichedSurgicalCaseListItem): MissionBoardStageId {
  return mapWorkflowStageToMissionStage(deriveCaseBoardWorkflowStage(c));
}

export function buildCaseMissionIntelligenceItems(c: EnrichedSurgicalCaseListItem): MissionCaseIntelligenceItem[] {
  const st = caseStatus(c);
  if (Boolean(c.archived_at) || st === "cancelled") return [];

  const assessment = assessCaseSalesExecutionNeedsAction(c);
  const items: MissionCaseIntelligenceItem[] = assessment.items.map((item) => ({
    id:
      item.id === "observation_debrief_pending"
        ? "debrief"
        : item.id === "observation_notes_missing"
          ? "notes"
          : "notes",
    label: item.label,
    severity: "warn" as const,
  }));

  return items;
}

/** @deprecated Use buildCaseMissionIntelligenceItems */
export function buildCaseMissionBlockers(c: EnrichedSurgicalCaseListItem): MissionCaseIntelligenceItem[] {
  return buildCaseMissionIntelligenceItems(c);
}

export function groupCasesByMissionStage(
  cases: EnrichedSurgicalCaseListItem[],
  sortFn: (a: EnrichedSurgicalCaseListItem, b: EnrichedSurgicalCaseListItem) => number = sortCasesForMobileFeed
): Map<MissionBoardStageId, EnrichedSurgicalCaseListItem[]> {
  const grouped = new Map<MissionBoardStageId, EnrichedSurgicalCaseListItem[]>(
    MISSION_BOARD_STAGES.map((stage) => [stage.id, []])
  );
  for (const c of cases) {
    const stage = deriveMissionBoardStage(c);
    grouped.get(stage)!.push(c);
  }
  for (const stage of MISSION_BOARD_STAGES) {
    grouped.set(stage.id, [...(grouped.get(stage.id) ?? [])].sort(sortFn));
  }
  return grouped;
}

export function caseListRowNeedsAttention(c: EnrichedSurgicalCaseListItem): boolean {
  return caseRecordNeedsAction(c);
}

export function countCasesNeedingAttention(cases: EnrichedSurgicalCaseListItem[]): number {
  return cases.filter(caseListRowNeedsAttention).length;
}

export function formatCaseListDate(c: EnrichedSurgicalCaseListItem): string {
  if (!c.case_date) return "Date TBD";
  const date = new Date(c.case_date + "T12:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = c.case_time ? String(c.case_time).slice(0, 5) : "";
  return time ? `${date} · ${time}` : date;
}

/** Compact date for board cards — readable at a glance. */
export function formatCaseBoardDateLine(c: EnrichedSurgicalCaseListItem): string {
  return formatCaseIdentityDate(c.case_date, c.case_time).dateLine;
}

/** Compact schedule line with optional time. */
export function formatCaseBoardScheduleLine(c: EnrichedSurgicalCaseListItem): string | null {
  const formatted = formatCaseIdentityDate(c.case_date, c.case_time);
  return formatted.dateLineWithTime;
}

/** @deprecated Use CaseIdentity from buildCaseIdentity */
export type CaseBoardCardView = CaseIdentity;

/** @deprecated Board cards no longer use procedure-based titles. */
export function buildCaseBoardCardTitle(c: EnrichedSurgicalCaseListItem): string {
  const identity = buildCaseIdentityFromListItem(c);
  return `${identity.caseTypeLabel} · ${identity.providerName}`;
}

export function formatCaseBoardTypeBadge(c: EnrichedSurgicalCaseListItem): string {
  return buildCaseIdentityFromListItem(c).caseTypeLabel.replace(/ Case$/, "");
}

/** Board status — surgical workflow state only. */
export function formatCaseBoardStatusBadge(c: EnrichedSurgicalCaseListItem): string {
  return buildCaseIdentityFromListItem(c).statusLabel;
}

/** Board card copy — unified case identity. */
export function buildCaseBoardCardView(c: EnrichedSurgicalCaseListItem): CaseIdentity {
  return buildCaseIdentityFromListItem(c);
}

export function buildCaseBoardCardMeta(c: EnrichedSurgicalCaseListItem): CaseBoardCardMeta {
  const identity = buildCaseIdentityFromListItem(c);
  return {
    providerName: identity.providerName,
    procedureLabel: identity.procedureType || "Procedure pending",
    facilityName: identity.facilityName,
    dateLine: identity.dateLine,
  };
}

function countObservationLearningObjectives(c: EnrichedSurgicalCaseListItem): number {
  const goalCount = countDelimitedObjectiveLines(c.observation_goal);
  const plannedTargets = observationWatchItemsFromCaseRow(c as Record<string, unknown>).filter(
    (item) => item.status === "planned",
  ).length;
  return goalCount + plannedTargets;
}

function countObservationOpenQuestions(c: EnrichedSurgicalCaseListItem): number {
  return countDelimitedObjectiveLines(c.observation_key_questions);
}

function countObservationProductSignals(c: EnrichedSurgicalCaseListItem): number {
  return countDelimitedObjectiveLines(c.observation_signals_to_validate);
}

function countObservationOpportunitySignals(c: EnrichedSurgicalCaseListItem): number {
  let count = 0;
  if (Boolean(c.follow_up_needed)) count += 1;
  if (c.related_opportunity_id) count += 1;
  return count;
}

export function caseDictationNoteCount(c: EnrichedSurgicalCaseListItem): number {
  const activityCount = Number(c.note_count ?? 0);
  if (Number.isFinite(activityCount) && activityCount > 0) return Math.floor(activityCount);
  return String(c.notes ?? "").trim() ? 1 : 0;
}

export function caseDictationStatusLabel(c: EnrichedSurgicalCaseListItem): string {
  const count = caseDictationNoteCount(c);
  if (count <= 0) return "Dictation needed";
  return count === 1 ? "Dictation captured" : `${count} dictations captured`;
}

function countMetricPill(
  id: string,
  count: number,
  singular: string,
  plural?: string,
): CaseBoardCardMetricPill | null {
  if (count <= 0) return null;
  const label = count === 1 ? singular : (plural ?? `${singular}s`);
  return { id, text: `${count} ${label}` };
}

function textMetricPill(id: string, text: string): CaseBoardCardMetricPill {
  return { id, text };
}

export function resolveCaseBoardCardKind(c: EnrichedSurgicalCaseListItem): CaseBoardCardKind {
  if (String(c.case_type ?? "").trim().toLowerCase() === "product_support") {
    return "product_support";
  }
  return "observation";
}

export function isProductSupportBoardCase(c: EnrichedSurgicalCaseListItem): boolean {
  return resolveCaseBoardCardKind(c) === "product_support";
}

export function deriveObservationBoardStatusLabel(
  c: EnrichedSurgicalCaseListItem,
  today = utcToday(),
): string {
  if (Boolean(c.archived_at)) return "Archived";
  const st = caseStatus(c);
  if (st === "cancelled") return "Cancelled";
  if (needsDebriefCase(c)) return "Debrief Due";
  if (Boolean(c.follow_up_needed)) return "Follow-up Needed";

  const notesCaptured = caseDictationNoteCount(c) > 0;
  const pastCaseDay = Boolean(c.case_date && c.case_date < today);
  if ((st === "completed" || pastCaseDay) && !notesCaptured && !isDoneListCase(c)) return "Notes Pending";
  if (isCaseReadyToObserve(c)) return "Ready to Observe";
  if (st === "scheduled" || st === "confirmed") return "Observation Scheduled";
  if (isDoneListCase(c)) return formatSurgicalCaseStatus(c.status);
  return formatSurgicalCaseStatus(c.status);
}

export function deriveProductSupportOutcomeReviewStatus(c: EnrichedSurgicalCaseListItem): string {
  const recorded = productSupportCaseOutcomeLabel(String(c.case_support_outcome ?? ""));
  if (recorded) return recorded;
  const st = caseStatus(c);
  if (isDoneListCase(c) || st === "completed" || st === "docs_needed") {
    return "Outcome review pending";
  }
  return "Outcome pending";
}

function countProductSupportFollowUpActions(c: EnrichedSurgicalCaseListItem): number {
  let count = 0;
  if (Boolean(c.follow_up_needed)) count += 1;
  if (String(c.case_support_outcome ?? "").trim().toLowerCase() === "follow_up_needed") count += 1;
  return count;
}

export function buildObservationBoardMetricPills(c: EnrichedSurgicalCaseListItem): CaseBoardCardMetricPill[] {
  const pills: CaseBoardCardMetricPill[] = [];
  pills.push(textMetricPill("dictation_status", caseDictationStatusLabel(c)));
  for (const pill of [
    countMetricPill(
      "learning_objectives",
      countObservationLearningObjectives(c),
      "Learning Objective",
      "Learning Objectives",
    ),
    countMetricPill("open_questions", countObservationOpenQuestions(c), "Open Question", "Open Questions"),
    countMetricPill("product_signals", countObservationProductSignals(c), "Product Signal", "Product Signals"),
    countMetricPill(
      "opportunity_signals",
      countObservationOpportunitySignals(c),
      "Product Fit Signal",
      "Product Fit Signals",
    ),
  ]) {
    if (pill) pills.push(pill);
  }
  return pills;
}

/** @deprecated Use buildObservationBoardMetricPills */
export function buildObservationBoardIntelligenceItems(
  c: EnrichedSurgicalCaseListItem,
): CaseBoardCardIntelligenceItem[] {
  return buildObservationBoardMetricPills(c).map((pill) => {
    const match = /^(\d+)\s+(.+)$/.exec(pill.text);
    if (match) return { label: match[2], value: match[1] };
    return { label: pill.text, value: "" };
  });
}

function countProductSupportRepTasksRemaining(c: EnrichedSurgicalCaseListItem): number {
  const view = buildCaseOperationalContextView({ caseRow: c, surgeonContact: null });
  return view.dimensions.filter((dimension) => dimension.status !== "strong" && dimension.status !== "validated")
    .length;
}

export function buildProductSupportBoardMetricPills(c: EnrichedSurgicalCaseListItem): CaseBoardCardMetricPill[] {
  const pills: CaseBoardCardMetricPill[] = [];
  const productName = String(c.product_name ?? "").trim();
  pills.push(textMetricPill("product", productName || "No product attached"));

  const tasksRemaining = countProductSupportRepTasksRemaining(c);
  if (tasksRemaining > 0) {
    pills.push(
      textMetricPill("rep_tasks", `${tasksRemaining} Rep Task${tasksRemaining === 1 ? "" : "s"} Remaining`),
    );
  }

  const followUpActions = countProductSupportFollowUpActions(c);
  if (followUpActions > 0) {
    pills.push(
      textMetricPill(
        "follow_up",
        `${followUpActions} Follow-up Action${followUpActions === 1 ? "" : "s"}`,
      ),
    );
  }

  pills.push(textMetricPill("outcome_review", deriveProductSupportOutcomeReviewStatus(c)));

  return pills;
}

/** @deprecated Use buildProductSupportBoardMetricPills */
export function buildProductSupportBoardIntelligenceItems(
  c: EnrichedSurgicalCaseListItem,
): CaseBoardCardIntelligenceItem[] {
  return buildProductSupportBoardMetricPills(c).map((pill) => {
    const match = /^(\d+)\s+(.+)$/.exec(pill.text);
    if (match) return { label: match[2], value: match[1] };
    return { label: pill.text, value: pill.text };
  });
}

/** @deprecated Use statusLabel on case-type-specific board views. */
export function deriveCaseBoardWorkflowStatusLabel(c: EnrichedSurgicalCaseListItem): string {
  return formatSurgicalCaseStatus(c.status);
}

export function deriveProductSupportBoardStatusLabel(c: EnrichedSurgicalCaseListItem): string {
  return deriveProductSupportCoverageStatus(c);
}

function mapMetricPillsToIntelligenceItems(pills: CaseBoardCardMetricPill[]): CaseBoardCardIntelligenceItem[] {
  return pills.map((pill) => {
    const match = /^(\d+)\s+(.+)$/.exec(pill.text);
    if (match) return { label: match[2], value: match[1] };
    return { label: pill.text, value: pill.text };
  });
}

function buildObservationBoardCardViewInternal(c: EnrichedSurgicalCaseListItem): SurgicalCaseBoardCardView {
  const metricPills = buildObservationBoardMetricPills(c);
  const statusLabel = deriveObservationBoardStatusLabel(c);
  const priorityInsight = deriveCaseBoardPriorityInsightResult({ ...c, product_name: c.product_name });
  return {
    ...buildCaseBoardCardMeta(c),
    caseBoardKind: "observation",
    statusLabel,
    workflowStatusLabel: statusLabel,
    priorityInsight: priorityInsight.insight,
    priorityInsightSourceLabel: priorityInsight.sourceLabel,
    priorityInsightSourceField: priorityInsight.sourceField,
    insightSectionLabel: "Priority Insight",
    metricsSectionLabel: "Observation Metrics",
    metricsEmptyLabel: "No observation metrics yet",
    metricPills,
    intelligenceItems: mapMetricPillsToIntelligenceItems(metricPills),
    nextRecommendedAction: deriveCaseBoardNextAction(c),
  };
}

function buildProductSupportBoardCardViewInternal(c: EnrichedSurgicalCaseListItem): SurgicalCaseBoardCardView {
  const metricPills = buildProductSupportBoardMetricPills(c);
  const statusLabel = deriveProductSupportBoardStatusLabel(c);
  const priorityInsight = deriveCaseBoardPriorityInsightResult({ ...c, product_name: c.product_name });
  return {
    ...buildCaseBoardCardMeta(c),
    caseBoardKind: "product_support",
    statusLabel,
    workflowStatusLabel: statusLabel,
    priorityInsight: priorityInsight.insight,
    priorityInsightSourceLabel: priorityInsight.sourceLabel,
    priorityInsightSourceField: priorityInsight.sourceField,
    insightSectionLabel: "Support Insight",
    metricsSectionLabel: "Support Metrics",
    metricsEmptyLabel: "No support metrics yet",
    metricPills,
    intelligenceItems: mapMetricPillsToIntelligenceItems(metricPills),
    nextRecommendedAction: deriveCaseBoardNextAction(c),
  };
}

export {
  deriveCaseBoardNextAction,
  deriveCaseBoardNextRecommendedAction,
} from "@/lib/surgical-sales/buildCaseBoardNextAction";

export function buildSurgicalCaseBoardCardView(c: EnrichedSurgicalCaseListItem): SurgicalCaseBoardCardView {
  if (isProductSupportBoardCase(c)) {
    return buildProductSupportBoardCardViewInternal(c);
  }
  return buildObservationBoardCardViewInternal(c);
}

/** Observation-only board card view. */
export function buildObservationBoardCardView(c: EnrichedSurgicalCaseListItem): ObservationBoardCardView {
  return buildObservationBoardCardViewInternal(c);
}

/** Product support-only board card view. */
export function buildProductSupportBoardCardView(c: EnrichedSurgicalCaseListItem): ProductSupportBoardCardView {
  return buildProductSupportBoardCardViewInternal(c);
}

/** @deprecated Use deriveCaseBoardPriorityInsight from buildCaseBoardPriorityInsight */
export function deriveObservationBoardPrimaryGap(_c: EnrichedSurgicalCaseListItem): string | null {
  return null;
}

/** @deprecated Use deriveProductSupportBoardIntelligenceItems */
export function deriveProductSupportCoverageStatus(c: EnrichedSurgicalCaseListItem): string {
  const operationalContext = buildCaseOperationalContextView({ caseRow: c, surgeonContact: null });
  const productName = String(c.product_name ?? "").trim();
  const products = productName ? [{ id: "line-1", name: productName, expectedQuantity: null }] : [];
  const badges = buildProductSupportCaseStatusBadges({
    caseRow: c,
    products,
    operationalContext,
  });

  if (badges.find((badge) => badge.id === "coverage_confirmed")?.active) return "Coverage Confirmed";
  return "Coverage pending";
}

/** Rep-facing next action for the cases list — field execution language only. */
export function deriveCaseListNextAction(c: EnrichedSurgicalCaseListItem, today = utcToday()): string {
  if (c.archived_at) return "Review archive";
  const st = caseStatus(c);
  if (st === "cancelled") return "—";

  if (needsDebriefCase(c)) return "Complete debrief";
  if (Boolean(c.follow_up_needed)) return "Schedule follow-up";
  if (!c.surgeon_contact_id && !String(c.surgeon_display ?? "").trim()) return "Assign provider";

  if (!isDoneListCase(c) && isSurgicalObservationCase(c.case_type)) {
    const notes = String(c.notes ?? "").trim();
    const pastCaseDay = Boolean(c.case_date && c.case_date < today);
    if ((st === "completed" || pastCaseDay) && !notes) return "Capture observation notes";
    if (c.case_date === today && (st === "scheduled" || st === "confirmed")) return "Enter live observation";
    if (!String(c.observation_goal ?? "").trim()) return "Set observation objectives";
  }

  if (c.missing_po) return "Upload PO";
  if (c.missing_invoice) return "Upload invoice";
  if (st === "docs_needed") return "Submit documentation";
  if (st === "billing_review") return "Finish billing";

  const logistics = operationalLogisticsNextAction(c);
  if (logistics && !isDoneListCase(c)) return logistics;

  if (c.case_date === today && (st === "scheduled" || st === "confirmed")) return "Attend case today";
  if (st === "scheduled" || st === "confirmed") return "Prep for case day";
  if (isDoneListCase(c)) return "—";
  return "Review case";
}

function operationalLogisticsNextAction(c: EnrichedSurgicalCaseListItem): string | null {
  const hasLogistics =
    String(c.case_implants_on_site ?? "").trim() ||
    String(c.case_trays_sterilization_status ?? "").trim() ||
    String(c.case_support_coverage ?? "").trim() ||
    String(c.case_operational_risks ?? "").trim();
  if (!hasLogistics) return null;

  const prep = caseListOperationalPrepHint(c);
  if (!prep) return null;
  const lower = prep.toLowerCase();
  if (lower.includes("strong")) return null;
  if (lower.includes("add logistics")) return "Add logistics details";
  return "Confirm logistics";
}

export function countMissionBoardOpenItems(cases: EnrichedSurgicalCaseListItem[]): number {
  return countCaseBoardWorkflowOpenItems(cases);
}

export type MobileCaseListSegmentId =
  | "all"
  | "active"
  | "scheduled"
  | "in_progress"
  | "debrief"
  | "follow_up"
  | "completed";

export const MOBILE_CASE_LIST_SEGMENTS: ReadonlyArray<{
  id: MobileCaseListSegmentId;
  label: string;
  title: string;
}> = [
  { id: "all", label: "All", title: "All cases" },
  { id: "active", label: "Active", title: "Active cases" },
  { id: "scheduled", label: "Sched", title: "Scheduled" },
  { id: "in_progress", label: "Live", title: "In progress today" },
  { id: "debrief", label: "Debrief", title: "Debrief pending" },
  { id: "follow_up", label: "Follow", title: "Follow-up needed" },
  { id: "completed", label: "Done", title: "Completed" },
] as const;

const DONE_STATUSES = new Set(["completed", "invoiced", "closed"]);

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function caseStatus(c: EnrichedSurgicalCaseListItem): string {
  return String(c.status ?? "").trim().toLowerCase();
}

export function isDoneListCase(c: EnrichedSurgicalCaseListItem): boolean {
  return DONE_STATUSES.has(caseStatus(c));
}

function needsDebriefCase(c: EnrichedSurgicalCaseListItem): boolean {
  return caseNeedsDebriefPlanning(c);
}

export function filterCasesByMobileSegment(
  cases: EnrichedSurgicalCaseListItem[],
  segment: MobileCaseListSegmentId,
  today = utcToday()
): EnrichedSurgicalCaseListItem[] {
  return cases.filter((c) => {
    const st = caseStatus(c);
    const archived = Boolean(c.archived_at);
    const cancelled = st === "cancelled";
    const done = isDoneListCase(c);

    if (segment === "all") return true;
    if (segment === "completed") return done || archived;
    if (archived || cancelled) return false;

    if (segment === "active") return !done;
    if (segment === "scheduled") return (st === "scheduled" || st === "confirmed") && !done;
    if (segment === "in_progress") {
      return c.case_date === today && !done && (st === "scheduled" || st === "confirmed" || st === "completed");
    }
    if (segment === "debrief") return needsDebriefCase(c);
    if (segment === "follow_up") return Boolean(c.follow_up_needed);
    return true;
  });
}

export function filterCasesBySearchQuery(
  cases: EnrichedSurgicalCaseListItem[],
  query: string
): EnrichedSurgicalCaseListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return cases;
  return cases.filter((c) => {
    const haystack = [
      c.case_number,
      formatSurgicalCaseNumber(c.case_number),
      c.account_name,
      c.surgeon_display,
      c.procedure_type,
      c.product_name,
      formatSurgicalCaseStatus(c.status),
      formatSurgicalCaseType(c.case_type),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortCasesForMobileFeed(a: EnrichedSurgicalCaseListItem, b: EnrichedSurgicalCaseListItem): number {
  const ad = a.case_date || "";
  const bd = b.case_date || "";
  if (ad !== bd) return ad < bd ? -1 : ad > bd ? 1 : 0;
  const at = a.case_time ? String(a.case_time) : "";
  const bt = b.case_time ? String(b.case_time) : "";
  return at.localeCompare(bt);
}

/** Attention-first sort for the default list view. */
export function sortCasesForExecutionList(
  a: EnrichedSurgicalCaseListItem,
  b: EnrichedSurgicalCaseListItem,
  newestFirst = false
): number {
  const aNeeds = caseListRowNeedsAttention(a) ? 0 : 1;
  const bNeeds = caseListRowNeedsAttention(b) ? 0 : 1;
  if (aNeeds !== bNeeds) return aNeeds - bNeeds;
  const cmp = sortCasesForMobileFeed(a, b);
  return newestFirst ? -cmp : cmp;
}

export function caseNeedsAttention(c: EnrichedSurgicalCaseListItem): boolean {
  const st = caseStatus(c);
  return Boolean(c.missing_po || c.missing_invoice || st === "docs_needed" || st === "billing_review");
}

export function buildCaseWorkflowSummary(c: EnrichedSurgicalCaseListItem, today = utcToday()): string {
  const st = caseStatus(c);
  const observation = isSurgicalObservationCase(c.case_type);
  const typeLabel = observation ? "Observation" : formatSurgicalCaseType(c.case_type);

  if (Boolean(c.follow_up_needed) && c.case_date && c.case_date < today && !isDoneListCase(c)) {
    return `${typeLabel} · Follow-up overdue`;
  }

  if (needsDebriefCase(c)) {
    return observation ? `${typeLabel} · Debrief pending` : `${typeLabel} · Documentation pending`;
  }

  if (c.case_date === today && (st === "scheduled" || st === "confirmed")) {
    return `${typeLabel} · Live today`;
  }

  if (st === "billing_review" || st === "docs_needed") {
    return `${typeLabel} · ${formatSurgicalCaseStatus(c.status)}`;
  }

  if (c.requires_billing_workflow && c.billing_checklist_score < 3 && !isDoneListCase(c)) {
    return `${typeLabel} · Billing ${c.billing_checklist_score}/3`;
  }

  return `${typeLabel} · ${formatSurgicalCaseStatus(c.status)}`;
}

export function buildCaseProgressHint(c: EnrichedSurgicalCaseListItem): string | null {
  const prepHint = caseListOperationalPrepHint(c);
  if (prepHint && !isDoneListCase(c) && caseStatus(c) !== "cancelled") {
    return prepHint;
  }
  if (c.requires_billing_workflow && !isDoneListCase(c)) {
    const score = Math.max(0, Math.min(3, Number(c.billing_checklist_score) || 0));
    return `Billing ${score}/3`;
  }
  if (caseRecordNeedsAction(c)) return "Needs action";
  if (Boolean(c.related_opportunity_id)) return "Related opportunity";
  if (isSurgicalObservationCase(c.case_type)) return "Observation";
  if (String(c.case_type).toLowerCase() === "product_support") return "Product support";
  return null;
}
