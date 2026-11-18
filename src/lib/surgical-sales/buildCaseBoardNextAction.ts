import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { SALES_TERMINOLOGY as T } from "@/lib/sales/salesTerminology";
import {
  caseNeedsDebriefOrOutcomeReview,
  deriveCaseBoardWorkflowStage,
  type CaseBoardWorkflowStageId,
} from "@/lib/surgical-sales/buildCaseBoardWorkflowStage";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { countDelimitedObjectiveLines } from "@/lib/surgical-sales/observationObjectives";
import { GENERATE_DEBRIEF_LABEL } from "@/lib/surgical-sales/observationProgramGate";
import { productSupportCaseOutcomeRecorded } from "@/lib/surgical-sales/productSupportCaseOutcome";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function caseStatus(c: EnrichedSurgicalCaseListItem): string {
  return String(c.status ?? "").trim().toLowerCase();
}

function isProductSupportCase(c: EnrichedSurgicalCaseListItem): boolean {
  return String(c.case_type ?? "").trim().toLowerCase() === "product_support";
}

function observationNotesCaptured(c: EnrichedSurgicalCaseListItem): boolean {
  const noteCount = Number(c.note_count ?? 0);
  return (Number.isFinite(noteCount) && noteCount > 0) || Boolean(String(c.notes ?? "").trim());
}

function observationDebriefCaptured(c: EnrichedSurgicalCaseListItem): boolean {
  if (String(c.debrief_key_findings ?? "").trim()) return true;
  const notes = String(c.notes ?? "").trim();
  const goal = String(c.observation_goal ?? "").trim();
  return Boolean(notes && goal);
}

function observationLearningObjectivesSet(c: EnrichedSurgicalCaseListItem): boolean {
  return countDelimitedObjectiveLines(c.observation_goal) > 0;
}

function productSupportCoverageConfirmed(c: EnrichedSurgicalCaseListItem): boolean {
  const coverage = String(c.case_support_coverage ?? "").trim().toLowerCase();
  if (!coverage) return false;
  return coverage.includes("confirm") || coverage.includes("rep") || coverage.includes("assigned");
}

function productSupportLogisticsConfirmed(c: EnrichedSurgicalCaseListItem): boolean {
  const implants = String(c.case_implants_on_site ?? "").trim().toLowerCase();
  const trays = String(c.case_trays_sterilization_status ?? "").trim().toLowerCase();

  if (!implants || !trays) return false;

  const implantsOk =
    implants.includes("confirm") ||
    implants.includes("on site") ||
    implants.includes("yes") ||
    implants.includes("ready");
  const traysOk =
    trays.includes("confirm") ||
    trays.includes("ready") ||
    trays.includes("steril");

  return implantsOk && traysOk;
}

function productSupportReadinessConfirmed(c: EnrichedSurgicalCaseListItem): boolean {
  return productSupportCoverageConfirmed(c) && productSupportLogisticsConfirmed(c);
}

function deriveObservationNextAction(
  c: EnrichedSurgicalCaseListItem,
  stage: CaseBoardWorkflowStageId,
  today: string,
): string {
  const st = caseStatus(c);

  if (stage === "closed") return "View Case Summary";
  if (st === "cancelled") return "Review Cancellation";

  if (stage === "requested") return "Secure Observation Access";

  if (stage === "approved") {
    if (!c.case_date) return "Schedule Observation";
    if (!observationLearningObjectivesSet(c)) return "Set Learning Objectives";
    return "Perform Observation";
  }

  if (stage === "scheduled") {
    if (c.case_date === today) return "Perform Observation Today";
    if (!observationLearningObjectivesSet(c)) return "Set Learning Objectives";
    return "Perform Observation";
  }

  if (stage === "completed") {
    if (!observationNotesCaptured(c)) return "Complete Observation Notes";
    if (!observationDebriefCaptured(c) || caseNeedsDebriefOrOutcomeReview(c)) {
      return GENERATE_DEBRIEF_LABEL;
    }
    if (!c.related_opportunity_id && Boolean(c.follow_up_needed)) return T.addToOpportunities;
    return "Review Intelligence";
  }

  if (stage === "debrief_ready") {
    if (!observationNotesCaptured(c) && !String(c.debrief_key_findings ?? "").trim()) {
      return "Complete Observation Notes";
    }
    if (String(c.debrief_key_findings ?? "").trim()) {
      if (!c.related_opportunity_id) return T.addToOpportunities;
      return T.advanceEvaluation;
    }
    if (!observationDebriefCaptured(c) || caseNeedsDebriefOrOutcomeReview(c)) {
      return GENERATE_DEBRIEF_LABEL;
    }
    if (!c.related_opportunity_id) return T.addToOpportunities;
    return T.advanceEvaluation;
  }

  if (stage === "follow_up") {
    if (!c.related_opportunity_id) return T.addToOpportunities;
    return "Follow Up with Provider";
  }

  return "Review Case";
}

function deriveProductSupportNextAction(
  c: EnrichedSurgicalCaseListItem,
  stage: CaseBoardWorkflowStageId,
  today: string,
): string {
  const st = caseStatus(c);

  if (stage === "closed") return "View Case Summary";
  if (st === "cancelled") return "Review Cancellation";

  if (stage === "requested") return "Secure Case Coverage";

  if (stage === "approved") {
    if (!c.case_date) return "Schedule Case";
    return "Confirm Product Readiness";
  }

  if (stage === "scheduled") {
    if (c.case_date === today && productSupportReadinessConfirmed(c)) return "Support Procedure Today";
    if (!productSupportReadinessConfirmed(c)) return "Confirm Product Readiness";
    return "Support Procedure";
  }

  if (stage === "completed" || stage === "debrief_ready") {
    if (st === "docs_needed" || st === "billing_review" || c.missing_po || c.missing_invoice) {
      return "Complete Case Review";
    }
    if (!productSupportCaseOutcomeRecorded(c as Record<string, unknown>)) {
      return "Complete Case Review";
    }
    if (!c.related_opportunity_id && Boolean(c.follow_up_needed)) return T.addToOpportunities;
    return "Complete Case Review";
  }

  if (stage === "follow_up") {
    if (!c.related_opportunity_id) return T.addToOpportunities;
    return "Follow Up on Outcome";
  }

  return "Review Case";
}

/** Single field-execution next move for a case board card. */
export function deriveCaseBoardNextAction(
  c: EnrichedSurgicalCaseListItem,
  today = utcToday(),
): string {
  if (c.archived_at) return "View Case Summary";

  const stage = deriveCaseBoardWorkflowStage(c, today);
  if (isProductSupportCase(c)) {
    return deriveProductSupportNextAction(c, stage, today);
  }
  if (isSurgicalObservationCase(c.case_type)) {
    return deriveObservationNextAction(c, stage, today);
  }

  if (stage === "closed") return "View Case Summary";
  if (caseStatus(c) === "cancelled") return "Review Cancellation";
  if (stage === "follow_up" && !c.related_opportunity_id) return T.addToOpportunities;
  if (stage === "debrief_ready") return "Complete Case Review";
  if (stage === "scheduled") return "Confirm Product Readiness";
  return "Review Case";
}

/** @deprecated Use deriveCaseBoardNextAction */
export function deriveCaseBoardNextRecommendedAction(
  c: EnrichedSurgicalCaseListItem,
  today = utcToday(),
): string {
  return deriveCaseBoardNextAction(c, today);
}
