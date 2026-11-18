/**
 * Needs Action — only real sales/execution next steps.
 * Informational admin/intelligence gaps belong in optional secondary details.
 */

import type {
  EnrichedSurgicalCaseListItem,
  SurgicalCaseListRow,
} from "@/lib/surgical-sales/enrichSurgicalCasesForList";

/** List/board row — enriched fields optional when not loaded. */
export type CaseSalesExecutionInput = SurgicalCaseListRow & Partial<EnrichedSurgicalCaseListItem>;

import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { countDelimitedObjectiveLines } from "@/lib/surgical-sales/observationObjectives";
import { productSupportCaseOutcomeRecorded } from "@/lib/surgical-sales/productSupportCaseOutcome";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import {
  observationSeriesEngagementEligibleForDebrief,
  providerDebriefReady,
} from "@/lib/surgical-sales/providerObservationProgress";
import {
  EVALUATION_STATUS_ACTIVE,
  EVALUATION_STATUS_NOT_SCHEDULED,
  isEvaluationStatusComplete,
  providerEvaluationPathFromDirectoryRow,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import { normalizeSalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";

export const SALES_EXECUTION_NEEDS_ACTION_LABEL = "Needs Action";
export const OPTIONAL_INTELLIGENCE_MISSING_LABEL = "Optional intelligence missing";

export type SalesExecutionNeedsActionId =
  | "observation_debrief_pending"
  | "observation_notes_missing"
  | "follow_up_unscheduled"
  | "opportunity_no_next_step"
  | "opportunity_overdue_task"
  | "product_support_review_pending"
  | "scheduled_case_readiness_blocked"
  | "scheduled_case_provider_missing"
  | "engagement_debrief_pending"
  | "engagement_legacy_draft"
  | "provider_debrief_pending"
  | "evaluation_follow_up_needed";

export type SalesExecutionNeedsActionItem = {
  id: SalesExecutionNeedsActionId;
  label: string;
};

export type SalesExecutionNeedsActionAssessment = {
  needsAction: boolean;
  items: SalesExecutionNeedsActionItem[];
  primaryNextStep: string | null;
  optionalIntelligenceGaps: string[];
  optionalIntelligenceLabel: string | null;
};

const DONE_CASE_STATUSES = new Set(["invoiced", "closed"]);
const OBSERVATION_POST_FIELD_OPS_STATUSES = new Set(["billing_review", "docs_needed"]);

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addUtcDaysYmd(startYmd: string, days: number): string {
  const d = new Date(`${startYmd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function caseStatus(c: CaseSalesExecutionInput): string {
  return String(c.status ?? "").trim().toLowerCase();
}

function isDoneListCase(c: CaseSalesExecutionInput): boolean {
  return DONE_CASE_STATUSES.has(caseStatus(c));
}

function isObservationPostFieldOps(c: CaseSalesExecutionInput): boolean {
  return isSurgicalObservationCase(c.case_type) && OBSERVATION_POST_FIELD_OPS_STATUSES.has(caseStatus(c));
}

function isProductSupportCase(c: CaseSalesExecutionInput): boolean {
  return String(c.case_type ?? "").trim().toLowerCase() === "product_support";
}

function observationLearningObjectivesSet(c: CaseSalesExecutionInput): boolean {
  return countDelimitedObjectiveLines(c.observation_goal) > 0;
}

function caseNotesCaptured(c: CaseSalesExecutionInput): boolean {
  const noteCount = Number(c.note_count ?? 0);
  return (Number.isFinite(noteCount) && noteCount > 0) || Boolean(String(c.notes ?? "").trim());
}

function caseHasProvider(c: CaseSalesExecutionInput): boolean {
  return Boolean(String(c.surgeon_contact_id ?? "").trim() || String(c.surgeon_display ?? "").trim());
}

function productSupportReadinessConfirmed(c: CaseSalesExecutionInput): boolean {
  const coverage = String(c.case_support_coverage ?? "").trim().toLowerCase();
  const implants = String(c.case_implants_on_site ?? "").trim().toLowerCase();
  const trays = String(c.case_trays_sterilization_status ?? "").trim().toLowerCase();
  if (!coverage) return false;
  const coverageOk =
    coverage.includes("confirm") || coverage.includes("rep") || coverage.includes("assigned");
  if (!implants || !trays) return false;
  const implantsOk =
    implants.includes("confirm") ||
    implants.includes("on site") ||
    implants.includes("yes") ||
    implants.includes("ready");
  const traysOk =
    trays.includes("confirm") || trays.includes("ready") || trays.includes("steril");
  return coverageOk && implantsOk && traysOk;
}

function productSupportReviewPending(c: CaseSalesExecutionInput): boolean {
  if (!isProductSupportCase(c)) return false;
  const st = caseStatus(c);
  if (isDoneListCase(c) || st === "cancelled") return false;
  if (st === "docs_needed" || st === "billing_review") return true;
  if (!productSupportCaseOutcomeRecorded(c as Record<string, unknown>)) {
    return st === "completed" || st === "docs_needed" || st === "billing_review";
  }
  return false;
}

export function providerNeedsEvaluationFollowUp(p: ProviderDirectoryRow): boolean {
  const stage = normalizeSalesPathwayStageId(p.relationship_pathway_stage_id);
  if (stage !== "evaluation") return false;
  if ((p.upcoming_engagement_count ?? 0) > 0) return false;

  const evaluationPath = providerEvaluationPathFromDirectoryRow(p);
  if (isEvaluationStatusComplete(evaluationPath.statusLabel)) return false;
  if (evaluationPath.statusLabel === EVALUATION_STATUS_ACTIVE) return false;
  return evaluationPath.statusLabel === EVALUATION_STATUS_NOT_SCHEDULED;
}

/** Provider-level debrief due — five completed observations, debrief not wrapped up. */
export function providerNeedsDebrief(p: ProviderDirectoryRow): boolean {
  if (!providerDebriefReady(p)) return false;
  if ((p.upcoming_engagement_count ?? 0) > 0) return false;

  const stage = p.relationship_pathway_stage_id;
  if (stage === "evaluation" || stage === "commitment" || stage === "outcomes") return false;

  const planning = p.planning_completion;
  if (planning?.status === "complete") return false;

  return true;
}

export function caseNeedsDebriefPlanning(c: CaseSalesExecutionInput): boolean {
  if (isSurgicalObservationCase(c.case_type)) return false;

  const st = caseStatus(c);
  return st === "docs_needed" || st === "billing_review";
}

export function isCaseScheduledImminent(
  c: CaseSalesExecutionInput,
  today = utcToday(),
  horizonDays = 2,
): boolean {
  const date = String(c.case_date ?? "").trim();
  if (!date) return false;
  const st = caseStatus(c);
  if (st !== "scheduled" && st !== "confirmed") return false;
  const end = addUtcDaysYmd(today, horizonDays);
  return date >= today && date <= end;
}

function isScheduledObservationCase(c: CaseSalesExecutionInput): boolean {
  const st = caseStatus(c);
  return (
    isSurgicalObservationCase(c.case_type) &&
    Boolean(c.case_date) &&
    (st === "scheduled" || st === "confirmed")
  );
}

function emptyAssessment(): SalesExecutionNeedsActionAssessment {
  return {
    needsAction: false,
    items: [],
    primaryNextStep: null,
    optionalIntelligenceGaps: [],
    optionalIntelligenceLabel: null,
  };
}

function finalizeAssessment(items: SalesExecutionNeedsActionItem[]): SalesExecutionNeedsActionAssessment {
  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    const key = `${item.id}:${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    needsAction: deduped.length > 0,
    items: deduped,
    primaryNextStep: deduped[0]?.label ?? null,
    optionalIntelligenceGaps: [],
    optionalIntelligenceLabel: null,
  };
}

/** Canonical Needs Action assessment for a surgical case list/board row. */
export function assessCaseSalesExecutionNeedsAction(
  c: CaseSalesExecutionInput,
  today = utcToday(),
): SalesExecutionNeedsActionAssessment {
  if (Boolean(c.archived_at) || caseStatus(c) === "cancelled") {
    return emptyAssessment();
  }

  const items: SalesExecutionNeedsActionItem[] = [];
  const st = caseStatus(c);
  const observation = isSurgicalObservationCase(c.case_type);
  const productSupport = isProductSupportCase(c);
  const pastCaseDay = Boolean(c.case_date && c.case_date < today);

  if (productSupport && productSupportReviewPending(c)) {
    items.push({ id: "product_support_review_pending", label: "Complete case review" });
  }

  if (Boolean(c.follow_up_needed) && !isDoneListCase(c)) {
    items.push({ id: "follow_up_unscheduled", label: "Schedule follow-up" });
  }

  if (
    observation &&
    !isObservationPostFieldOps(c) &&
    (st === "completed" || pastCaseDay) &&
    !caseNotesCaptured(c) &&
    !isDoneListCase(c)
  ) {
    items.push({ id: "observation_notes_missing", label: "Capture observation notes" });
  }

  if (isCaseScheduledImminent(c, today)) {
    if (!caseHasProvider(c)) {
      items.push({ id: "scheduled_case_provider_missing", label: "Assign provider" });
    }

    if (productSupport && !productSupportReadinessConfirmed(c)) {
      items.push({
        id: "scheduled_case_readiness_blocked",
        label: "Confirm product readiness",
      });
    }
  }

  return finalizeAssessment(items);
}

export function caseRecordNeedsAction(c: CaseSalesExecutionInput, today = utcToday()): boolean {
  return assessCaseSalesExecutionNeedsAction(c, today).needsAction;
}

export function assessProviderSalesExecutionNeedsAction(
  p: ProviderDirectoryRow,
): SalesExecutionNeedsActionAssessment {
  if (p.archived_at || p.onboarding_status === "draft" || isProviderSalesCustomer(p)) {
    return emptyAssessment();
  }

  const items: SalesExecutionNeedsActionItem[] = [];

  if (providerNeedsDebrief(p)) {
    items.push({ id: "provider_debrief_pending", label: "Complete debrief" });
  }

  if (providerNeedsEvaluationFollowUp(p)) {
    const evaluationPath = providerEvaluationPathFromDirectoryRow(p);
    items.push({
      id: "evaluation_follow_up_needed",
      label: evaluationPath.nextActionLabel,
    });
  }

  return finalizeAssessment(items);
}

export function providerRecordNeedsAction(p: ProviderDirectoryRow): boolean {
  return assessProviderSalesExecutionNeedsAction(p).needsAction;
}

export function assessEngagementSalesExecutionNeedsAction(
  row: Partial<Pick<ProviderEngagementSummary, "is_legacy_draft" | "status" | "notes" | "engagement_type">> &
    Partial<ProviderEngagementSummary>,
  completedObservationCount = 0,
): SalesExecutionNeedsActionAssessment {
  const items: SalesExecutionNeedsActionItem[] = [];

  if (row.is_legacy_draft) {
    items.push({ id: "engagement_legacy_draft", label: "Migrate engagement plan" });
    return finalizeAssessment(items);
  }

  const status = String(row.status ?? "").trim().toLowerCase();
  if (
    status === "completed" &&
    !engagementHasTacticalDebrief(row as ProviderEngagementSummary) &&
    observationSeriesEngagementEligibleForDebrief(row.engagement_type, completedObservationCount)
  ) {
    items.push({ id: "engagement_debrief_pending", label: "Debrief" });
  }

  return finalizeAssessment(items);
}

export function engagementRecordNeedsAction(
  row: Pick<ProviderEngagementSummary, "notes"> &
    Partial<Pick<ProviderEngagementSummary, "is_legacy_draft" | "status">> &
    Partial<ProviderEngagementSummary>,
): boolean {
  return assessEngagementSalesExecutionNeedsAction(row).needsAction;
}

export type OpportunityNeedsActionInput = {
  id: string;
  next_action?: string | null;
  hasOpenTask?: boolean;
  hasOverdueTask?: boolean;
};

export function assessOpportunitySalesExecutionNeedsAction(
  opp: OpportunityNeedsActionInput,
): SalesExecutionNeedsActionAssessment {
  const items: SalesExecutionNeedsActionItem[] = [];

  if (opp.hasOverdueTask) {
    items.push({ id: "opportunity_overdue_task", label: "Complete overdue task" });
  }

  const hasNextActionText = Boolean(String(opp.next_action ?? "").trim());
  if (!opp.hasOpenTask && !hasNextActionText) {
    items.push({ id: "opportunity_no_next_step", label: "Assign next step" });
  }

  return finalizeAssessment(items);
}

export function opportunityRecordNeedsAction(opp: OpportunityNeedsActionInput): boolean {
  return assessOpportunitySalesExecutionNeedsAction(opp).needsAction;
}

export function formatOptionalIntelligenceDetail(_gaps: string[]): string | null {
  return null;
}
