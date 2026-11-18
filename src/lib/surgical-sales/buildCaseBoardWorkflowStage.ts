import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { productSupportCaseOutcomeRecorded } from "@/lib/surgical-sales/productSupportCaseOutcome";

export type CaseBoardWorkflowStageId =
  | "requested"
  | "approved"
  | "scheduled"
  | "completed"
  | "debrief_ready"
  | "follow_up"
  | "closed";

export const CASE_BOARD_WORKFLOW_STAGES: ReadonlyArray<{
  id: CaseBoardWorkflowStageId;
  label: string;
  title: string;
}> = [
  {
    id: "requested",
    label: "Observation Requested",
    title: "Case initiated — observation access or support coverage not yet confirmed",
  },
  {
    id: "approved",
    label: "Observation Approved",
    title: "Access or coverage approved — schedule the case day",
  },
  {
    id: "scheduled",
    label: "Scheduled Cases",
    title: "On the calendar — prep objectives and field plan",
  },
  {
    id: "completed",
    label: "Completed Cases",
    title: "Case day complete — capture notes and field intelligence",
  },
  {
    id: "debrief_ready",
    label: "Debrief Ready",
    title: "Ready for debrief, documentation, or outcome review",
  },
  {
    id: "follow_up",
    label: "Follow Up",
    title: "Commercial follow-up or adoption motion in progress",
  },
  {
    id: "closed",
    label: "Closed",
    title: "Invoiced, archived, or otherwise closed out",
  },
] as const;

const CLOSED_BOARD_STATUSES = new Set(["invoiced", "closed"]);

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function caseStatus(c: EnrichedSurgicalCaseListItem): string {
  return String(c.status ?? "").trim().toLowerCase();
}

function isClosedBoardCase(c: EnrichedSurgicalCaseListItem): boolean {
  return CLOSED_BOARD_STATUSES.has(caseStatus(c));
}

function isProductSupportCase(c: EnrichedSurgicalCaseListItem): boolean {
  return String(c.case_type ?? "").trim().toLowerCase() === "product_support";
}

function hasObservationAccessApproved(c: EnrichedSurgicalCaseListItem): boolean {
  return Boolean(String(c.observation_access_pathway ?? "").trim());
}

function hasProductSupportCoverageApproved(c: EnrichedSurgicalCaseListItem): boolean {
  if (hasObservationAccessApproved(c)) return true;
  const coverage = String(c.case_support_coverage ?? "").trim().toLowerCase();
  if (!coverage) return false;
  return coverage.includes("confirmed") || coverage.includes("rep") || coverage.includes("assigned");
}

function isApprovedForField(c: EnrichedSurgicalCaseListItem): boolean {
  if (isProductSupportCase(c)) return hasProductSupportCoverageApproved(c);
  if (isSurgicalObservationCase(c.case_type)) return hasObservationAccessApproved(c);
  return hasObservationAccessApproved(c) || hasProductSupportCoverageApproved(c);
}

const CALENDAR_BOARD_STATUSES = new Set(["draft", "scheduled", "rescheduled", "confirmed"]);

function isScheduledOnCalendar(c: EnrichedSurgicalCaseListItem): boolean {
  const st = caseStatus(c);
  return Boolean(c.case_date) && CALENDAR_BOARD_STATUSES.has(st);
}

export function caseNeedsDebriefOrOutcomeReview(c: EnrichedSurgicalCaseListItem): boolean {
  const st = caseStatus(c);

  if (!isSurgicalObservationCase(c.case_type)) {
    if (st === "docs_needed" || st === "billing_review") return true;
    if (st === "completed" && !productSupportCaseOutcomeRecorded(c as Record<string, unknown>)) {
      return true;
    }
    return false;
  }

  if (st === "completed" || st === "docs_needed" || st === "billing_review") {
    const goal = String(c.observation_goal ?? "").trim();
    const notes = String(c.notes ?? "").trim();
    if (!goal && !notes) return true;
    return st === "docs_needed" || st === "billing_review";
  }

  return false;
}

function isFieldWorkComplete(c: EnrichedSurgicalCaseListItem, today: string): boolean {
  const st = caseStatus(c);
  if (st === "completed") return true;

  const notes = String(c.notes ?? "").trim();
  if (c.case_date && c.case_date < today && notes && (st === "scheduled" || st === "confirmed")) {
    return true;
  }

  if (isProductSupportCase(c) && st === "completed") return true;

  return false;
}

/** Workflow column for the unified case board — progression through the surgical sales process. */
export function deriveCaseBoardWorkflowStage(
  c: EnrichedSurgicalCaseListItem,
  today = utcToday(),
): CaseBoardWorkflowStageId {
  const st = caseStatus(c);

  if (st === "cancelled" || Boolean(c.archived_at) || isClosedBoardCase(c)) {
    return "closed";
  }

  if (caseNeedsDebriefOrOutcomeReview(c)) {
    return "completed";
  }

  if (Boolean(c.follow_up_needed)) {
    return "follow_up";
  }

  if (isFieldWorkComplete(c, today)) {
    return "completed";
  }

  if (isScheduledOnCalendar(c)) {
    return "scheduled";
  }

  if (isApprovedForField(c)) {
    return "approved";
  }

  return "requested";
}

export function groupCasesByBoardWorkflowStage(
  cases: EnrichedSurgicalCaseListItem[],
  sortFn: (a: EnrichedSurgicalCaseListItem, b: EnrichedSurgicalCaseListItem) => number,
): Map<CaseBoardWorkflowStageId, EnrichedSurgicalCaseListItem[]> {
  const grouped = new Map<CaseBoardWorkflowStageId, EnrichedSurgicalCaseListItem[]>(
    CASE_BOARD_WORKFLOW_STAGES.map((stage) => [stage.id, []]),
  );

  for (const c of cases) {
    const stage = deriveCaseBoardWorkflowStage(c);
    grouped.get(stage)!.push(c);
  }

  for (const stage of CASE_BOARD_WORKFLOW_STAGES) {
    grouped.set(stage.id, [...(grouped.get(stage.id) ?? [])].sort(sortFn));
  }

  return grouped;
}

/** Always show Scheduled + Completed; also show any other column that actually has cards. */
export function visibleCaseBoardWorkflowStages(
  grouped: Map<CaseBoardWorkflowStageId, EnrichedSurgicalCaseListItem[]>,
): Array<(typeof CASE_BOARD_WORKFLOW_STAGES)[number]> {
  return CASE_BOARD_WORKFLOW_STAGES.filter((stage) => {
    if (stage.id === "scheduled" || stage.id === "completed") return true;
    return (grouped.get(stage.id)?.length ?? 0) > 0;
  });
}

export function countCaseBoardWorkflowOpenItems(cases: EnrichedSurgicalCaseListItem[]): number {
  return cases.filter((c) => deriveCaseBoardWorkflowStage(c) !== "closed").length;
}
