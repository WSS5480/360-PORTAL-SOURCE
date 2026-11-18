/** Rep-facing evaluation activity status — shared vocabulary on Mission Board and provider page. */
export const EVALUATION_STATUS_NOT_SCHEDULED = "Not Scheduled";
export const EVALUATION_STATUS_PLANNED = "Planned";
export const EVALUATION_STATUS_ACTIVE = "Active";
export const EVALUATION_STATUS_COMPLETE = "Complete";

export type EvaluationActivityStatusChoice =
  | "not_scheduled"
  | "planned"
  | "active"
  | "complete";

export const EVALUATION_ACTIVITY_STATUS_DB_KEY = "provider_evaluation_activity_status";

export const EVALUATION_ACTIVITY_STATUS_EDIT_CHOICES = [
  "not_scheduled",
  "planned",
  "active",
  "complete",
] as const satisfies readonly EvaluationActivityStatusChoice[];

export const MISSION_BOARD_EVALUATION_ACTIVITY_STATUS_LABELS: Record<
  EvaluationActivityStatusChoice,
  string
> = {
  not_scheduled: EVALUATION_STATUS_NOT_SCHEDULED,
  planned: EVALUATION_STATUS_PLANNED,
  active: EVALUATION_STATUS_ACTIVE,
  complete: EVALUATION_STATUS_COMPLETE,
};

export function normalizeEvaluationActivityStatus(
  raw: string,
): EvaluationActivityStatusChoice | null {
  switch (raw.trim().toLowerCase()) {
    case "not_scheduled":
    case "not scheduled":
      return "not_scheduled";
    case "planned":
      return "planned";
    case "active":
    case "in_progress":
      return "active";
    case "complete":
    case "completed":
      return "complete";
    default:
      return null;
  }
}

export function evaluationActivityStatusLabel(status: EvaluationActivityStatusChoice): string {
  return MISSION_BOARD_EVALUATION_ACTIVITY_STATUS_LABELS[status];
}

export function evaluationActivityStatusFromLabel(label: string): EvaluationActivityStatusChoice {
  const normalized = normalizeEvaluationActivityStatus(label);
  if (normalized) return normalized;
  switch (label.trim()) {
    case EVALUATION_STATUS_NOT_SCHEDULED:
      return "not_scheduled";
    case EVALUATION_STATUS_PLANNED:
      return "planned";
    case EVALUATION_STATUS_ACTIVE:
      return "active";
    case EVALUATION_STATUS_COMPLETE:
      return "complete";
    default:
      return "not_scheduled";
  }
}

export function resolveStoredEvaluationActivityStatus(
  contact?: Record<string, unknown> | null,
): EvaluationActivityStatusChoice | null {
  return normalizeEvaluationActivityStatus(
    String(contact?.[EVALUATION_ACTIVITY_STATUS_DB_KEY] ?? ""),
  );
}

/** Effective status for Mission Board — stored override wins over derived engagement status. */
export function resolveEvaluationActivityStatusFromContact(
  contact: Record<string, unknown>,
  derivedStatusLabel: string,
): EvaluationActivityStatusChoice {
  const stored = resolveStoredEvaluationActivityStatus(contact);
  if (stored) return stored;
  return evaluationActivityStatusFromLabel(derivedStatusLabel);
}

