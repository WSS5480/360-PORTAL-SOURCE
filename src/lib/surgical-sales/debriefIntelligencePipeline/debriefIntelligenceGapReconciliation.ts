/**
 * Contradiction reconciliation for the debrief review.
 *
 * A fact cannot be both confirmed and unconfirmed in the same review: when
 * intelligence captured in this debrief (field updates, identified contacts)
 * already resolves a "still to confirm" gap, the unresolved item is removed.
 *
 * Leaf module — keep imports type-only to stay cycle-safe.
 */

export type ResolvedIntelligenceContext = {
  /** Field updates proposed in this review (accepted or not — both render). */
  fieldUpdates?: Array<{ dbKey: string; proposedValue?: string }>;
  /** Display lines for contacts identified in this review, e.g. "Lisa — Office Manager, Scheduling Coordinator". */
  contactLines?: string[];
};

const SCHEDULING_OWNER_DB_KEYS = [
  "provider_observation_coordinator_contact",
  "provider_scheduling_contact",
];

const CREDENTIALING_DB_KEYS = [
  "provider_credentialing_status",
  "provider_observation_credentialing_needed",
];

function hasAnyDbKey(context: ResolvedIntelligenceContext, dbKeys: string[]): boolean {
  return (context.fieldUpdates ?? []).some((update) => dbKeys.includes(update.dbKey));
}

function fieldValueMatches(
  context: ResolvedIntelligenceContext,
  dbKey: string,
  pattern: RegExp,
): boolean {
  return (context.fieldUpdates ?? []).some(
    (update) => update.dbKey === dbKey && pattern.test(update.proposedValue ?? ""),
  );
}

function hasSchedulingContact(context: ResolvedIntelligenceContext): boolean {
  return (context.contactLines ?? []).some((line) =>
    /\b(schedul|coordinator|office manager)/i.test(line),
  );
}

type GapResolutionRule = {
  gapMatches: (gap: string) => boolean;
  resolvedBy: (context: ResolvedIntelligenceContext) => boolean;
};

const GAP_RESOLUTION_RULES: GapResolutionRule[] = [
  {
    // "Scheduling owner / coordinator named", "Confirm who controls scheduling"
    gapMatches: (gap) =>
      /\bschedul/i.test(gap) && /\b(owner|coordinator|who|named|controls?|confirm|identify)/i.test(gap),
    resolvedBy: (context) =>
      hasAnyDbKey(context, SCHEDULING_OWNER_DB_KEYS) || hasSchedulingContact(context),
  },
  {
    // "Vendor credentialing status confirmed" — but timing/platform gaps stay open.
    gapMatches: (gap) =>
      /\bcredential/i.test(gap) &&
      !/\b(turnaround|timeline|how long|lead time|platform)\b/i.test(gap),
    resolvedBy: (context) => hasAnyDbKey(context, CREDENTIALING_DB_KEYS),
  },
  {
    // Observation approval / permission gaps — resolved once approval is captured.
    gapMatches: (gap) =>
      /\b(observation|permission|approval)\b/i.test(gap) &&
      /\b(approv|permission|feasib)/i.test(gap) &&
      !/\b(cadence|days?|window)\b/i.test(gap),
    resolvedBy: (context) =>
      fieldValueMatches(context, "provider_observation_feasibility", /\b(approved|confirmed)\b/i),
  },
  {
    gapMatches: (gap) => /\bevaluation\b/i.test(gap) && /\b(readiness|openness|confirm)/i.test(gap),
    resolvedBy: (context) => hasAnyDbKey(context, ["provider_evaluation_openness"]),
  },
  {
    gapMatches: (gap) => /\b(best days?|posting window)\b/i.test(gap),
    resolvedBy: (context) => hasAnyDbKey(context, ["provider_observation_best_days_case_types"]),
  },
];

/**
 * Removes still-to-confirm items already resolved by intelligence captured in
 * the same review.
 */
export function removeResolvedIntelligenceGaps(
  gaps: string[],
  context: ResolvedIntelligenceContext,
): string[] {
  return gaps.filter(
    (gap) =>
      !GAP_RESOLUTION_RULES.some((rule) => rule.gapMatches(gap) && rule.resolvedBy(context)),
  );
}
