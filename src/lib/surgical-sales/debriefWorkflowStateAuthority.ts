/**
 * Workflow-state source-of-truth hierarchy for the debrief review pipeline:
 *
 *   1. Engagement outcome explicitly selected by the rep (e.g. the
 *      "Observation Approved" tap at engagement completion)
 *   2. Structured workflow updates already validated on the provider record
 *      (the outcome tap writes + validates these before debrief review runs)
 *   3. AI-extracted signals from dictation
 *
 * AI extraction must never duplicate or overwrite a state already confirmed
 * by layers 1–2. Observation Access continues to display the status chip;
 * the Debrief Summary ("What Changed") only reports newly learned
 * intelligence.
 *
 * Intentionally dependency-light (no provider-metadata module imports) so it
 * can be used from both the review-summary builder and the field-update
 * pipeline without module cycles.
 */

/** Canonical provider dbKey for observation approval state. */
export const OBSERVATION_APPROVAL_WORKFLOW_DB_KEY = "provider_observation_feasibility";

/** Provider dbKeys that represent workflow state (vs. learned intelligence). */
export const WORKFLOW_STATE_DB_KEYS = [
  OBSERVATION_APPROVAL_WORKFLOW_DB_KEY,
  "provider_credentialing_status",
  "provider_observation_credentialing_needed",
  "provider_scheduling_contact",
  "provider_observation_coordinator_contact",
] as const;

export type ConfirmedWorkflowStates = {
  /** Observation approval confirmed by rep outcome or validated on file. */
  observationApproved: boolean;
  /** Observation explicitly denied by rep outcome or validated on file. */
  observationDenied: boolean;
  /** Credentialing requirement/pathway already validated on file. */
  credentialingKnown: boolean;
  /** Validated on-file scheduling owner value (for same-name suppression). */
  schedulingOwnerOnFile: string | null;
};

/**
 * Same validated-on-file semantics as isIntelligenceFieldValidatedOnFile,
 * re-implemented locally to keep this module a cycle-safe leaf.
 */
function fieldValidatedOnFile(
  dbKey: string,
  contact: Record<string, unknown> | null | undefined,
): string | null {
  if (!contact) return null;
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw) return null;
  if (/\bvalidated_at:/i.test(raw)) return raw;

  const metaRaw = contact.provider_intelligence_field_metadata;
  type FieldMeta = { validated_at?: unknown; lifecycle_state?: unknown };
  let meta: Record<string, FieldMeta> | null = null;
  if (metaRaw && typeof metaRaw === "object") {
    meta = metaRaw as Record<string, FieldMeta>;
  } else if (typeof metaRaw === "string" && metaRaw.trim()) {
    try {
      meta = JSON.parse(metaRaw) as Record<string, FieldMeta>;
    } catch {
      meta = null;
    }
  }
  const fieldMeta = meta?.[dbKey];
  if (fieldMeta?.validated_at || fieldMeta?.lifecycle_state === "validated") return raw;
  return null;
}

const APPROVED_STATE_RE = /\b(approved|permission[_ ]confirmed|confirmed)\b/i;
const DENIED_STATE_RE = /\b(denied|declined|refused|not allowed)\b/i;

/**
 * Resolve which workflow states are already confirmed at review time.
 * Engagement outcome (rep tap) is the highest authority; validated provider
 * fields are the structured layer beneath it.
 */
export function deriveConfirmedWorkflowStates(input: {
  engagementOutcomeId?: string | null;
  providerContact?: Record<string, unknown> | null;
}): ConfirmedWorkflowStates {
  const outcome = String(input.engagementOutcomeId ?? "").trim().toLowerCase();
  const contact = input.providerContact ?? null;

  const approvalOnFile = fieldValidatedOnFile(OBSERVATION_APPROVAL_WORKFLOW_DB_KEY, contact);

  const observationApproved =
    outcome === "observation_approved" ||
    Boolean(approvalOnFile && APPROVED_STATE_RE.test(approvalOnFile) && !DENIED_STATE_RE.test(approvalOnFile));

  const observationDenied =
    !observationApproved &&
    (outcome === "observation_denied" ||
      Boolean(approvalOnFile && DENIED_STATE_RE.test(approvalOnFile)));

  const credentialingKnown = Boolean(
    fieldValidatedOnFile("provider_credentialing_status", contact) ??
      fieldValidatedOnFile("provider_observation_credentialing_needed", contact),
  );

  const schedulingOwnerOnFile =
    fieldValidatedOnFile("provider_scheduling_contact", contact) ??
    fieldValidatedOnFile("provider_observation_coordinator_contact", contact);

  return { observationApproved, observationDenied, credentialingKnown, schedulingOwnerOnFile };
}

const NO_CONFIRMED_STATES: ConfirmedWorkflowStates = {
  observationApproved: false,
  observationDenied: false,
  credentialingKnown: false,
  schedulingOwnerOnFile: null,
};

export function emptyConfirmedWorkflowStates(): ConfirmedWorkflowStates {
  return { ...NO_CONFIRMED_STATES };
}

const OBSERVATION_STATE_TOKEN_RE =
  /^(interested|approved|denied|mentioned|yes|easy|restricted|credentialing_required)$/i;

function observationStateToken(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (OBSERVATION_STATE_TOKEN_RE.test(trimmed)) return trimmed;
  if (APPROVED_STATE_RE.test(trimmed)) return "approved";
  if (DENIED_STATE_RE.test(trimmed)) return "denied";
  return null;
}

/**
 * True when an AI-proposed workflow field update only restates the state
 * already on file — the update is a no-op and should not surface as a change.
 * Contradicting values are NOT suppressed; they continue through the conflict
 * flow so a rep decides (AI never silently overwrites a confirmed state).
 */
export function workflowFieldUpdateRestatesConfirmedState(input: {
  dbKey: string;
  existingValue: string;
  proposedValue: string;
}): boolean {
  if (!(WORKFLOW_STATE_DB_KEYS as readonly string[]).includes(input.dbKey)) return false;
  const existing = input.existingValue.trim();
  const proposed = input.proposedValue.trim();
  if (!existing || !proposed) return false;

  if (input.dbKey === OBSERVATION_APPROVAL_WORKFLOW_DB_KEY) {
    const existingToken = observationStateToken(existing);
    const proposedToken = observationStateToken(proposed);
    return Boolean(existingToken && proposedToken && existingToken === proposedToken);
  }

  return existing.toLowerCase() === proposed.toLowerCase();
}
