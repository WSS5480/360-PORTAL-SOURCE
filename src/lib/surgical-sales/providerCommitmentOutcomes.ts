import {
  resolveStoredEvaluationPath,
  resolveEvaluationStatus,
  deriveProviderEvaluationPath,
  isEvaluationStatusComplete,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  PATHWAY_CONTACT_COMMITMENT_CONFIRMED,
  PATHWAY_CONTACT_EVALUATION_MARKED_SUCCESSFUL,
  PATHWAY_CONTACT_OUTCOMES_TRACKING_ACTIVE,
} from "@/lib/surgical-sales/pathway/pathwayContactFlags";

function contactFlagYes(contact: Record<string, unknown>, key: string): boolean {
  const raw = String(contact[key] ?? "").trim().toLowerCase();
  return raw === "yes" || raw === "true" || raw === "1" || raw === "complete" || raw === "completed";
}

/** Canonical type saved when rep confirms structured use on the pathway. */
export const DEFAULT_PROVIDER_COMMITMENT_TYPE = "structured_use" as const;

export const PROVIDER_COMMITMENT_TYPES = [
  "structured_use",
  "use_next_case",
  "trial_series",
  "preferred_product",
  "education_ready",
  "other",
] as const;

export type ProviderCommitmentType = (typeof PROVIDER_COMMITMENT_TYPES)[number];

export const PROVIDER_COMMITMENT_TYPE_LABELS: Record<ProviderCommitmentType, string> = {
  structured_use: "Structured product use",
  use_next_case: "Use in next case",
  trial_series: "Trial series",
  preferred_product: "Preferred product consideration",
  education_ready: "Education completed, ready for use",
  other: "Other",
};

export const PROVIDER_STRUCTURED_USE_COMMITMENT_SUMMARY = "Structured product use confirmed";

export const PROVIDER_OUTCOME_UPDATE_TYPES = [
  "utilization",
  "outcome",
  "qti",
  "provider_feedback",
  "staff_feedback",
  "barrier_issue",
] as const;

export type ProviderOutcomeUpdateType = (typeof PROVIDER_OUTCOME_UPDATE_TYPES)[number];

export const PROVIDER_OUTCOME_UPDATE_TYPE_LABELS: Record<ProviderOutcomeUpdateType, string> = {
  utilization: "Utilization",
  outcome: "Outcome",
  qti: "QTi",
  provider_feedback: "Provider feedback",
  staff_feedback: "Staff feedback",
  barrier_issue: "Barrier / issue",
};

export type ProviderCommitmentView = {
  statusLabel: string;
  summaryLabel: string;
  commitmentTypeLabel: string | null;
  productPath: string | null;
  startDate: string | null;
  notes: string | null;
  evaluationPathCompleted: string | null;
};

export type ProviderOutcomesTrackingView = {
  statusLabel: string;
  summaryLabel: string;
  productPath: string | null;
  startDate: string | null;
  updateCount: number;
  productUseCount: number;
  lastUpdateLabel: string | null;
};

export function isProviderCommitmentType(value: string): value is ProviderCommitmentType {
  return (PROVIDER_COMMITMENT_TYPES as readonly string[]).includes(value);
}

export function isProviderOutcomeUpdateType(value: string): value is ProviderOutcomeUpdateType {
  return (PROVIDER_OUTCOME_UPDATE_TYPES as readonly string[]).includes(value);
}

export function hasEvaluationMarkedSuccessful(contact?: Record<string, unknown> | null): boolean {
  return contactFlagYes(contact ?? {}, PATHWAY_CONTACT_EVALUATION_MARKED_SUCCESSFUL);
}

export function hasOutcomesTrackingActive(contact?: Record<string, unknown> | null): boolean {
  return contactFlagYes(contact ?? {}, PATHWAY_CONTACT_OUTCOMES_TRACKING_ACTIVE);
}

export function hasStructuredCommitmentSaved(contact?: Record<string, unknown> | null): boolean {
  const c = contact ?? {};
  if (!contactFlagYes(c, PATHWAY_CONTACT_COMMITMENT_CONFIRMED)) return false;
  return Boolean(String(c.provider_commitment_type ?? "").trim());
}

export function buildProviderCommitmentView(contact: Record<string, unknown>): ProviderCommitmentView | null {
  if (!hasStructuredCommitmentSaved(contact)) return null;

  const typeRaw = String(contact.provider_commitment_type ?? "").trim();
  const commitmentTypeLabel = isProviderCommitmentType(typeRaw)
    ? PROVIDER_COMMITMENT_TYPE_LABELS[typeRaw]
    : typeRaw || null;
  const productPath =
    String(contact.provider_commitment_product_path ?? "").trim() ||
    resolveStoredEvaluationPath(contact) ||
    null;
  const startDate = String(contact.provider_commitment_start_date ?? "").trim() || null;
  const notes = String(contact.provider_commitment_notes ?? "").trim() || null;
  const evaluationPath = resolveStoredEvaluationPath(contact);

  const summaryLabel =
    typeRaw === DEFAULT_PROVIDER_COMMITMENT_TYPE
      ? PROVIDER_STRUCTURED_USE_COMMITMENT_SUMMARY
      : [commitmentTypeLabel, productPath].filter(Boolean).join(" · ") ||
        PROVIDER_STRUCTURED_USE_COMMITMENT_SUMMARY;

  return {
    statusLabel: PROVIDER_STRUCTURED_USE_COMMITMENT_SUMMARY,
    summaryLabel,
    commitmentTypeLabel,
    productPath,
    startDate,
    notes,
    evaluationPathCompleted: evaluationPath,
  };
}

export function buildProviderOutcomesTrackingView(
  contact: Record<string, unknown>,
  activityCounts?: { outcomeUpdates?: number; productUseLogs?: number; lastUpdateAt?: string | null },
): ProviderOutcomesTrackingView | null {
  if (!hasOutcomesTrackingActive(contact)) return null;

  const commitment = buildProviderCommitmentView(contact);
  const productPath =
    commitment?.productPath ||
    String(contact.provider_commitment_product_path ?? "").trim() ||
    resolveStoredEvaluationPath(contact) ||
    null;
  const startDate =
    commitment?.startDate || String(contact.provider_commitment_start_date ?? "").trim() || null;
  const updateCount = activityCounts?.outcomeUpdates ?? 0;
  const productUseCount = activityCounts?.productUseLogs ?? 0;
  const storedStatus = String(contact.provider_outcomes_tracking_status ?? "").trim();

  let statusLabel = storedStatus || "Active tracking";
  if (!storedStatus) {
    if (updateCount + productUseCount === 0) statusLabel = "Tracking started";
    else statusLabel = `${updateCount + productUseCount} log${updateCount + productUseCount === 1 ? "" : "s"} on file`;
  }

  const summaryLabel = commitment?.summaryLabel ?? productPath ?? "Outcomes tracking active";

  return {
    statusLabel,
    summaryLabel,
    productPath,
    startDate,
    updateCount,
    productUseCount,
    lastUpdateLabel: activityCounts?.lastUpdateAt
      ? new Date(activityCounts.lastUpdateAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null,
  };
}

export function isEvaluationReadyForCommitment(
  contact: Record<string, unknown>,
  evidence?: {
    engagements?: ProviderEngagementSummary[];
    cases?: Array<Record<string, unknown>>;
  },
): boolean {
  if (hasEvaluationMarkedSuccessful(contact)) return true;
  if (!resolveStoredEvaluationPath(contact)) return false;
  const path = deriveProviderEvaluationPath({ contact });
  const status = resolveEvaluationStatus({
    pathLabel: path,
    engagements: evidence?.engagements,
    cases: evidence?.cases,
    contact,
  });
  return isEvaluationStatusComplete(status);
}
