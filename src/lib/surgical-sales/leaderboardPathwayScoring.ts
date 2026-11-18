/** Shared pathway scoring rules for the execution leaderboard. */

export const LEADERBOARD_EVALUATION_ENGAGEMENT_TYPES = new Set([
  "office_visit_360",
  "lab_visit",
  "peer_discussion",
  "product_demo",
  "evaluation_planning",
  "evaluation_follow_up",
  "in_service_training",
]);

export const LEADERBOARD_EVALUATION_STARTED_EVENT_TYPES = new Set(["EVALUATION_ACTIVE"]);

export const LEADERBOARD_COMMITMENT_SECURED_EVENT_TYPES = new Set(["OPPORTUNITY_WON"]);

export const LEADERBOARD_OUTCOME_QTI_EVENT_TYPES = new Set(["OUTCOMES_TRACKING_STARTED", "QTI_STARTED"]);

const COMMITMENT_FIELD_PATTERN =
  /\b(preference card|committed case|commitment secured|structured product use|case target)\b/i;

const OUTCOME_QTI_FIELD_PATTERN = /\b(qti|outcomes report|outcome tracking|outcomes_qti|patient outcomes)\b/i;

export function isEvaluationEngagementType(engagementType: string | null | undefined): boolean {
  return LEADERBOARD_EVALUATION_ENGAGEMENT_TYPES.has(String(engagementType || "").toLowerCase());
}

export function providerMilestoneKey(providerId: string | null | undefined): string {
  const id = String(providerId ?? "").trim();
  return id || "unknown-provider";
}

export function promotedFieldScoresCommitment(fieldLabel: unknown): boolean {
  const normalized = String(fieldLabel ?? "").trim();
  if (!normalized) return false;
  return COMMITMENT_FIELD_PATTERN.test(normalized);
}

export function promotedFieldScoresOutcomeQti(fieldLabel: unknown): boolean {
  const normalized = String(fieldLabel ?? "").trim();
  if (!normalized) return false;
  return OUTCOME_QTI_FIELD_PATTERN.test(normalized);
}

export function countCompletedObservationsForProvider(
  cases: Array<{
    sales_rep_id: string;
    surgeon_contact_id?: string | null;
    case_type?: string | null;
    status?: string | null;
  }>,
  repId: string,
  providerId: string | null | undefined,
): number {
  const providerKey = providerMilestoneKey(providerId);
  return cases.filter((row) => {
    if (row.sales_rep_id !== repId) return false;
    if (providerMilestoneKey(row.surgeon_contact_id) !== providerKey) return false;
    if (String(row.case_type || "").toLowerCase() !== "observation") return false;
    const status = String(row.status || "").toLowerCase();
    return status === "completed" || status === "closed";
  }).length;
}
