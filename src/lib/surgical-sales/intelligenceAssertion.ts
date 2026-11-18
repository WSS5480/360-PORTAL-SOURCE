/**
 * Source-aware assertion — who vouches for a piece of provider intelligence.
 *
 *   provider_reported (1) < observed (2) < validated (3)
 *
 * Declared capture source sets a ceiling; precedence rules guarantee a
 * lower-assertion capture never overwrites or blocks a higher one
 * (fixes first-writer-wins: a field note must never block observation promotion).
 *
 * HARD RULE: assertion stamping (C1) and precedence (C2) are one flag-gated
 * unit — `ASSERTION_AWARE_INTELLIGENCE`. Never enable one without the other.
 */

import type { DeclaredSourceType } from "@/lib/surgical-sales/declaredSourceType";

export const INTELLIGENCE_ASSERTIONS = ["provider_reported", "observed", "validated"] as const;

export type IntelligenceAssertion = (typeof INTELLIGENCE_ASSERTIONS)[number];

export const INTELLIGENCE_ASSERTION_RANK: Record<IntelligenceAssertion, number> = {
  provider_reported: 1,
  observed: 2,
  validated: 3,
};

export const INTELLIGENCE_ASSERTION_LABELS: Record<IntelligenceAssertion, string> = {
  provider_reported: "Provider-reported",
  observed: "Observed",
  validated: "Validated",
};

export function assertionAwareIntelligenceEnabled(): boolean {
  return process.env.ASSERTION_AWARE_INTELLIGENCE === "1";
}

export function parseIntelligenceAssertion(value: unknown): IntelligenceAssertion | undefined {
  return typeof value === "string" &&
    (INTELLIGENCE_ASSERTIONS as readonly string[]).includes(value)
    ? (value as IntelligenceAssertion)
    : undefined;
}

/** Positive when a outranks b, 0 when equal, negative when b outranks a. */
export function compareIntelligenceAssertion(
  a: IntelligenceAssertion,
  b: IntelligenceAssertion,
): number {
  return INTELLIGENCE_ASSERTION_RANK[a] - INTELLIGENCE_ASSERTION_RANK[b];
}

/** Maximum assertion a capture source may claim, no matter how the note is phrased. */
export function assertionCeilingForSource(source: DeclaredSourceType): IntelligenceAssertion {
  switch (source) {
    case "field_note":
      return "provider_reported";
    case "observation_case":
      return "observed";
    case "debrief":
    case "evaluation":
    case "outcome":
      return "validated";
  }
}

/**
 * Default assertion stamped for a capture source. Debrief defaults to
 * provider_reported — `validated` is granted per-fact only when the debrief
 * corroborates an existing finding (a debrief is still a conversation).
 */
export function defaultAssertionForSource(source: DeclaredSourceType): IntelligenceAssertion {
  switch (source) {
    case "field_note":
    case "debrief":
      return "provider_reported";
    case "observation_case":
      return "observed";
    case "evaluation":
    case "outcome":
      return "validated";
  }
}

export function clampAssertionToCeiling(
  assertion: IntelligenceAssertion,
  ceiling: IntelligenceAssertion,
): IntelligenceAssertion {
  return compareIntelligenceAssertion(assertion, ceiling) > 0 ? ceiling : assertion;
}

/**
 * Legacy inference for fields stamped before assertion existed.
 * Conservative: legacy values are upgradeable, never blocking.
 */
export function inferAssertionFromLegacySourceType(
  sourceType: string | null | undefined,
): IntelligenceAssertion {
  switch (String(sourceType ?? "").trim()) {
    case "observation":
    case "case":
    case "promote":
      return "observed";
    default:
      return "provider_reported";
  }
}

/** Resolve a field's effective assertion from its metadata attribution (legacy-safe). */
export function resolveFieldAssertion(
  meta:
    | { assertion?: IntelligenceAssertion | undefined; source_type?: string | undefined }
    | null
    | undefined,
): IntelligenceAssertion {
  if (!meta) return "provider_reported";
  if (meta.assertion) return meta.assertion;
  return inferAssertionFromLegacySourceType(meta.source_type);
}

/** Assertion an incoming capture claims, given its capture context. */
export function resolveAssertionForCapture(ctx: {
  declared_source_type?: DeclaredSourceType;
  source_type?: string;
  assertion?: IntelligenceAssertion;
}): IntelligenceAssertion {
  if (ctx.declared_source_type) {
    const ceiling = assertionCeilingForSource(ctx.declared_source_type);
    if (ctx.assertion) return clampAssertionToCeiling(ctx.assertion, ceiling);
    return defaultAssertionForSource(ctx.declared_source_type);
  }
  if (ctx.assertion) return ctx.assertion;
  return inferAssertionFromLegacySourceType(ctx.source_type);
}

/** OIE confirmation state → assertion (promotion boundary). */
export function assertionFromObservationConfirmation(
  confirmationState: string | null | undefined,
): IntelligenceAssertion {
  // Legacy observation entities carry no confirmation state; they came from an
  // observation case note, so the declared-source ceiling (observed) applies.
  if (String(confirmationState ?? "") === "reported") return "provider_reported";
  return "observed";
}

export type AssertionWriteVerdict =
  | "upgrade"
  | "merge"
  | "append_context"
  | "blocked_downgrade";

/**
 * Precedence decision for a single field write.
 *
 * | incoming vs existing | replace strategy    | append strategy  |
 * |----------------------|---------------------|------------------|
 * | higher               | upgrade             | upgrade          |
 * | equal                | merge               | merge            |
 * | lower                | blocked_downgrade   | append_context   |
 */
export function resolveAssertionWrite(params: {
  existing: IntelligenceAssertion;
  incoming: IntelligenceAssertion;
  mergeStrategy: "replace" | "append";
}): AssertionWriteVerdict {
  const delta = compareIntelligenceAssertion(params.incoming, params.existing);
  if (delta > 0) return "upgrade";
  if (delta === 0) return "merge";
  return params.mergeStrategy === "append" ? "append_context" : "blocked_downgrade";
}

/** Assertion to stamp after a write: never downgrades an existing field. */
export function nextFieldAssertion(
  existing: IntelligenceAssertion | undefined,
  incoming: IntelligenceAssertion,
): IntelligenceAssertion {
  if (!existing) return incoming;
  return compareIntelligenceAssertion(incoming, existing) > 0 ? incoming : existing;
}
