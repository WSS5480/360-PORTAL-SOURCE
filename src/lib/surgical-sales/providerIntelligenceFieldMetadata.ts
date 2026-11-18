/**
 * Per-field attribution for provider intelligence — source, author, validation time.
 */

import { PROVIDER_INTELLIGENCE_PERSISTENT_DB_KEYS } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { ORGANIZATION_INTELLIGENCE_DB_KEYS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import {
  buildOrganizationInheritancePatchValue,
  buildOrganizationInheritanceRecord,
  isOrganizationInheritanceDbKey,
  type OrganizationInheritanceRecord,
  type OrganizationInheritanceStance,
} from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import { formatEngagementType, normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type {
  IntelligenceDiscoveryStance,
  OperationalIntelligenceUncertaintyKind,
} from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import { formatLastValidatedLine } from "@/lib/surgical-sales/providerIntelligenceFreshness";
import {
  lifecycleStateForCapture,
  type IntelligenceSignalLifecycleState,
} from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { isHumanReadableDiscoveryEvidence } from "@/lib/surgical-sales/discoveryIntelligenceEvidenceFormat";
import {
  parsePropagatedIntelligenceSignal,
  type PropagatedIntelligenceSignal,
} from "@/lib/surgical-sales/propagatedIntelligenceSignal";
import {
  parseDeclaredSourceType,
  type DeclaredSourceType,
} from "@/lib/surgical-sales/declaredSourceType";
import {
  assertionAwareIntelligenceEnabled,
  nextFieldAssertion,
  parseIntelligenceAssertion,
  resolveAssertionForCapture,
  resolveFieldAssertion,
  type IntelligenceAssertion,
} from "@/lib/surgical-sales/intelligenceAssertion";
import type { DiscoveryMappingIntelligenceItem } from "@/lib/surgical-sales/discoveryMappingIntelligenceItem";
import { parseDiscoveryMappingIntelligenceItem } from "@/lib/surgical-sales/discoveryMappingIntelligenceItem";

export type IntelligenceCaptureSourceType =
  | "profile"
  | "intro_call"
  | "observation"
  | "case"
  | "engagement"
  | "ai_capture"
  | "promote";

export type IntelligenceCaptureContext = {
  source_type: IntelligenceCaptureSourceType;
  source_label?: string;
  source_engagement_id?: string;
  source_case_id?: string;
  source_case_number?: string;
  /** Capture source declared by the surface (field_note | observation_case | debrief | evaluation | outcome). */
  declared_source_type?: DeclaredSourceType;
};

export type IntelligenceFieldAttribution = {
  source_type: IntelligenceCaptureSourceType;
  source_label: string;
  source_engagement_id?: string;
  source_case_id?: string;
  updated_at: string;
  updated_by_user_id?: string;
  updated_by_name?: string;
  /** Explicit validation lifecycle stamp (see providerIntelligenceLifecycle). */
  lifecycle_state?: IntelligenceSignalLifecycleState;
  confirmed_at?: string;
  validated_at?: string;
  /** Progressive discovery — not forced completion. */
  discovery_stance?: IntelligenceDiscoveryStance;
  /** unexplored = not learned yet; opaque = account may be politically locked. */
  uncertainty_kind?: OperationalIntelligenceUncertaintyKind;
  /** How this provider relates to an inherited facility-wide fact. */
  organization_inheritance?: OrganizationInheritanceRecord;
  /** Source quote or operational evidence supporting this capture. */
  evidence_text?: string;
  /** Structured propagated signal — known facts, entities, evidence, unknowns. */
  propagated_signal?: import("@/lib/surgical-sales/propagatedIntelligenceSignal").PropagatedIntelligenceSignal;
  /** Layered discovery mapping intelligence (evidence vs interpretation vs mapping). */
  discovery_mapping?: DiscoveryMappingIntelligenceItem;
  /** Workflow dependency enum — display via accessBlockerDisplayLabel, not as evidence. */
  access_blocker?: string;
  /** Declared capture source that last touched this field. */
  declared_source_type?: DeclaredSourceType;
  /** Who vouches for this field: provider_reported < observed < validated. Never silently downgraded. */
  assertion?: IntelligenceAssertion;
};

export type ProviderIntelligenceFieldMetadataMap = Record<string, IntelligenceFieldAttribution>;

const INTELLIGENCE_KEY_SET = new Set([
  ...PROVIDER_INTELLIGENCE_PERSISTENT_DB_KEYS,
  ...ORGANIZATION_INTELLIGENCE_DB_KEYS,
]);

const INTELLIGENCE_LIFECYCLE_PARSE = (raw: unknown): IntelligenceSignalLifecycleState | undefined => {
  const s = String(raw ?? "").trim().toLowerCase();
  if (
    s === "captured" ||
    s === "assumed" ||
    s === "confirmed" ||
    s === "validated" ||
    s === "outdated"
  ) {
    return s;
  }
  return undefined;
};

export function isProviderIntelligenceDbKey(key: string): boolean {
  return INTELLIGENCE_KEY_SET.has(key);
}

export function parseProviderIntelligenceFieldMetadata(
  raw: unknown,
): ProviderIntelligenceFieldMetadataMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ProviderIntelligenceFieldMetadataMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isProviderIntelligenceDbKey(key) || !value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const v = value as Record<string, unknown>;
    const source_label = String(v.source_label ?? "").trim();
    const updated_at = String(v.updated_at ?? "").trim();
    const validated_at = String(v.validated_at ?? "").trim();
    const lifecycle_state = INTELLIGENCE_LIFECYCLE_PARSE(v.lifecycle_state);
    if (!source_label && !updated_at && !validated_at && lifecycle_state !== "validated") continue;
    const source_type = String(v.source_type ?? "profile") as IntelligenceCaptureSourceType;
    out[key] = {
      source_type,
      source_label: source_label || (validated_at ? "Validated on file" : "Intelligence capture"),
      source_engagement_id: String(v.source_engagement_id ?? "").trim() || undefined,
      source_case_id: String(v.source_case_id ?? "").trim() || undefined,
      updated_at: updated_at || validated_at || new Date(0).toISOString(),
      updated_by_user_id: String(v.updated_by_user_id ?? "").trim() || undefined,
      updated_by_name: String(v.updated_by_name ?? "").trim() || undefined,
      lifecycle_state: INTELLIGENCE_LIFECYCLE_PARSE(v.lifecycle_state),
      confirmed_at: String(v.confirmed_at ?? "").trim() || undefined,
      validated_at: String(v.validated_at ?? "").trim() || undefined,
      discovery_stance: parseDiscoveryStance(v.discovery_stance),
      uncertainty_kind: parseUncertaintyKind(v.uncertainty_kind),
      organization_inheritance: parseOrganizationInheritance(v.organization_inheritance),
      evidence_text: String(v.evidence_text ?? "").trim() || undefined,
      propagated_signal:
        parsePropagatedIntelligenceSignal(v.propagated_signal) ?? undefined,
      discovery_mapping:
        parseDiscoveryMappingIntelligenceItem(v.discovery_mapping) ?? undefined,
      access_blocker: String(v.access_blocker ?? "").trim() || undefined,
      declared_source_type: parseDeclaredSourceType(v.declared_source_type),
      assertion: parseIntelligenceAssertion(v.assertion),
    };
  }
  return out;
}

function parseOrganizationInheritance(raw: unknown): OrganizationInheritanceRecord | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const v = raw as Record<string, unknown>;
  const stance = String(v.stance ?? "").trim() as OrganizationInheritanceStance;
  const resolved_at = String(v.resolved_at ?? "").trim();
  if (!resolved_at) return undefined;
  if (stance !== "applies" && stance !== "does_not_apply" && stance !== "exception") {
    return undefined;
  }
  return {
    stance,
    resolved_at,
    facility_display_line: String(v.facility_display_line ?? "").trim() || undefined,
    facility_value: String(v.facility_value ?? "").trim() || undefined,
  };
}

function parseDiscoveryStance(raw: unknown): IntelligenceDiscoveryStance | undefined {
  const s = String(raw ?? "").trim() as IntelligenceDiscoveryStance;
  if (
    s === "skipped" ||
    s === "unknown" ||
    s === "needs_validation" ||
    s === "ask_next_touch" ||
    s === "not_relevant"
  ) {
    return s;
  }
  return undefined;
}

function parseUncertaintyKind(raw: unknown): OperationalIntelligenceUncertaintyKind | undefined {
  const s = String(raw ?? "").trim();
  if (s === "unexplored" || s === "opaque") return s;
  return undefined;
}

export function buildIntelligenceCaptureSourceLabel(ctx: IntelligenceCaptureContext): string {
  const custom = String(ctx.source_label ?? "").trim();
  if (custom) return custom;
  switch (ctx.source_type) {
    case "intro_call":
      return "Intro Call";
    case "observation":
      return ctx.source_case_number ? `Observation ${ctx.source_case_number}` : "Observation";
    case "case":
      return ctx.source_case_number ? `Case ${ctx.source_case_number}` : "Case";
    case "promote":
      return "Case insight";
    case "ai_capture":
      return "AI note capture";
    case "engagement":
      return "Engagement";
    default:
      return "Provider profile";
  }
}

export function buildCaptureContextFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): IntelligenceCaptureContext {
  const fromCase = String(params.get("from_case") ?? "").trim();
  const caseNumber = String(params.get("case_number") ?? "").trim();
  if (fromCase) {
    return {
      source_type: "observation",
      source_label: caseNumber ? `Observation ${caseNumber}` : "Observation",
      source_case_id: fromCase,
      source_case_number: caseNumber || undefined,
    };
  }

  const fromEngagement = String(params.get("from_engagement") ?? "").trim();
  const engagementType = normalizeEngagementType(String(params.get("engagement_type") ?? ""));
  if (fromEngagement) {
    const isIntro = engagementType === "intro_call";
    return {
      source_type: isIntro ? "intro_call" : "engagement",
      source_label: isIntro ? "Intro Call" : formatEngagementType(engagementType) || "Engagement",
      source_engagement_id: fromEngagement,
    };
  }

  return { source_type: "profile", source_label: "Provider profile" };
}

function formatLastValidatedLineFromMeta(meta: IntelligenceFieldAttribution): string | null {
  return formatLastValidatedLine(meta);
}

export function formatFieldCaptureHistoryLine(
  meta: IntelligenceFieldAttribution | null | undefined,
): string | null {
  if (!meta?.updated_at?.trim()) return null;
  const d = new Date(meta.updated_at);
  if (Number.isNaN(d.getTime())) return null;
  return `Updated ${d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export type IntelligenceFieldAttributionDisplay = {
  sourceLine: string | null;
  authorLine: string | null;
  validatedLine: string | null;
  /** Best single line when space is tight (edit headers, tooltips). */
  briefLine: string | null;
  /** @deprecated Use sourceLine */
  captureLine: string | null;
  /** @deprecated Use authorLine / validatedLine */
  detailLine: string | null;
};

const GENERIC_PROFILE_LABEL = "Provider profile";

export function isGenericProfileAttribution(meta: IntelligenceFieldAttribution): boolean {
  return meta.source_type === "profile" && meta.source_label === GENERIC_PROFILE_LABEL;
}

/** Attribution worth showing — skip noise from anonymous profile-only edits. */
export function isHelpfulFieldAttribution(
  meta: IntelligenceFieldAttribution | null | undefined,
): boolean {
  if (!meta) return false;
  if (meta.updated_by_name?.trim()) return true;
  if (meta.validated_at?.trim()) return true;
  if (!isGenericProfileAttribution(meta)) return true;
  return false;
}

function formatSourceLine(meta: IntelligenceFieldAttribution): string | null {
  const label = meta.source_label?.trim();
  if (!label || isGenericProfileAttribution(meta)) return null;
  return `Captured from ${label}`;
}

export function formatIntelligenceFieldAttributionDisplay(
  meta: IntelligenceFieldAttribution | null | undefined,
): IntelligenceFieldAttributionDisplay {
  if (!meta || !isHelpfulFieldAttribution(meta)) {
    return {
      sourceLine: null,
      authorLine: null,
      validatedLine: null,
      briefLine: null,
      captureLine: null,
      detailLine: null,
    };
  }

  const sourceLine = formatSourceLine(meta);
  const authorLine = meta.updated_by_name?.trim()
    ? `Added by ${meta.updated_by_name.trim()}`
    : null;
  const validatedLine = formatLastValidatedLineFromMeta(meta);
  const lifecycleLine = meta.lifecycle_state
    ? `Lifecycle: ${meta.lifecycle_state.charAt(0).toUpperCase()}${meta.lifecycle_state.slice(1)}`
    : null;

  const briefLine =
    validatedLine ?? lifecycleLine ?? sourceLine ?? authorLine ?? null;

  const detailParts = [authorLine, validatedLine].filter(Boolean) as string[];

  return {
    sourceLine,
    authorLine,
    validatedLine,
    briefLine,
    captureLine: sourceLine,
    detailLine: detailParts.length > 0 ? detailParts.join(" · ") : null,
  };
}

function attributionForFieldValue(
  dbKey: string,
  value: string | null | undefined,
  nowIso: string,
): Pick<IntelligenceFieldAttribution, "validated_at" | "confirmed_at" | "lifecycle_state"> {
  const raw = value === null || value === undefined ? "" : String(value);
  if (!fieldHasIntelligenceSignal(dbKey, raw)) {
    return {};
  }
  const quality = assessIntelligenceFieldQuality(dbKey, raw);
  if (quality.depth === "validated") {
    return { validated_at: nowIso, lifecycle_state: "validated" };
  }
  if (quality.depth === "structured") {
    return { confirmed_at: nowIso, lifecycle_state: "confirmed" };
  }
  if (quality.depth === "weak") {
    return { lifecycle_state: "assumed" };
  }
  return { lifecycle_state: "captured" };
}

/** Stamp validated_at on fields that already have signal (no value change). */
export function markIntelligenceFieldsValidated(params: {
  existing: ProviderIntelligenceFieldMetadataMap;
  dbKeys: readonly string[];
  fieldValues: Record<string, unknown>;
  actor: { userId: string; userName: string };
  now?: Date;
}): ProviderIntelligenceFieldMetadataMap {
  const nowIso = (params.now ?? new Date()).toISOString();
  const next = { ...params.existing };

  for (const dbKey of params.dbKeys) {
    if (!isProviderIntelligenceDbKey(dbKey)) continue;
    const raw = params.fieldValues[dbKey] as string | null | undefined;
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;

    const prior = next[dbKey];
    next[dbKey] = {
      source_type: prior?.source_type ?? "profile",
      source_label: prior?.source_label ?? "Provider profile",
      source_engagement_id: prior?.source_engagement_id,
      source_case_id: prior?.source_case_id,
      updated_at: prior?.updated_at ?? nowIso,
      updated_by_user_id: params.actor.userId,
      updated_by_name: params.actor.userName,
      validated_at: nowIso,
      lifecycle_state: "validated",
      confirmed_at: prior?.confirmed_at ?? nowIso,
    };
  }

  return next;
}

export function mergeIntelligenceFieldMetadata(params: {
  existing: ProviderIntelligenceFieldMetadataMap;
  changedKeys: readonly string[];
  fieldValues: Record<string, string | null | undefined>;
  captureContext: IntelligenceCaptureContext;
  actor: { userId: string; userName: string };
  fieldEvidence?: Record<string, string>;
  fieldSignals?: Record<string, PropagatedIntelligenceSignal>;
  fieldDiscoveryMapping?: Record<string, DiscoveryMappingIntelligenceItem>;
  fieldAccessBlockers?: Record<string, string | null | undefined>;
  now?: Date;
}): ProviderIntelligenceFieldMetadataMap {
  const nowIso = (params.now ?? new Date()).toISOString();
  const source_label = buildIntelligenceCaptureSourceLabel(params.captureContext);
  const next = { ...params.existing };

  for (const dbKey of params.changedKeys) {
    if (!isProviderIntelligenceDbKey(dbKey)) continue;
    const value = params.fieldValues[dbKey];
    const trimmed = value === null || value === undefined ? "" : String(value).trim();
    const evidenceQuote = params.fieldEvidence?.[dbKey]?.trim();
    const propagatedSignal = params.fieldSignals?.[dbKey];
    const discoveryMapping = params.fieldDiscoveryMapping?.[dbKey];
    const accessBlocker = params.fieldAccessBlockers?.[dbKey]?.trim();
    const sanitizedEvidence = isHumanReadableDiscoveryEvidence(evidenceQuote)
      ? evidenceQuote
      : propagatedSignal?.evidenceText && isHumanReadableDiscoveryEvidence(propagatedSignal.evidenceText)
        ? propagatedSignal.evidenceText
        : undefined;

    if (!trimmed || !fieldHasIntelligenceSignal(dbKey, trimmed)) {
      if (sanitizedEvidence) {
        const prior = next[dbKey];
        next[dbKey] = {
          source_type: params.captureContext.source_type,
          source_label,
          source_engagement_id: params.captureContext.source_engagement_id,
          source_case_id: params.captureContext.source_case_id,
          updated_at: nowIso,
          updated_by_user_id: params.actor.userId,
          updated_by_name: params.actor.userName,
          lifecycle_state: prior?.lifecycle_state ?? "captured",
          confirmed_at: prior?.confirmed_at,
          validated_at: prior?.validated_at,
          discovery_stance: prior?.discovery_stance ?? "needs_validation",
          uncertainty_kind: prior?.uncertainty_kind,
          organization_inheritance: prior?.organization_inheritance,
          evidence_text: sanitizedEvidence,
          propagated_signal: propagatedSignal ?? prior?.propagated_signal,
          discovery_mapping: discoveryMapping ?? prior?.discovery_mapping,
          access_blocker: accessBlocker || prior?.access_blocker,
          declared_source_type:
            params.captureContext.declared_source_type ?? prior?.declared_source_type,
          // Evidence-only touch makes no new claim — keep the prior assertion.
          assertion: prior?.assertion,
        };
      } else {
        delete next[dbKey];
      }
      continue;
    }

    const prior = next[dbKey];
    const validation = attributionForFieldValue(dbKey, trimmed, nowIso);
    const captureLifecycle = lifecycleStateForCapture(
      dbKey,
      trimmed,
      params.captureContext.source_type,
    );

    const debriefCapture =
      params.captureContext.source_type === "intro_call" ||
      (params.captureContext.source_type === "engagement" &&
        /debrief|intro call|tactical/i.test(String(params.captureContext.source_label ?? "")));

    // Assertion stamping is flag-gated together with precedence (C1+C2 are one
    // unit). Never downgrades: an existing higher assertion is preserved.
    const assertion = assertionAwareIntelligenceEnabled()
      ? nextFieldAssertion(
          prior ? resolveFieldAssertion(prior) : undefined,
          resolveAssertionForCapture(params.captureContext),
        )
      : prior?.assertion;

    next[dbKey] = {
      source_type: params.captureContext.source_type,
      source_label,
      source_engagement_id: params.captureContext.source_engagement_id,
      source_case_id: params.captureContext.source_case_id,
      updated_at: nowIso,
      updated_by_user_id: params.actor.userId,
      updated_by_name: params.actor.userName,
      lifecycle_state:
        validation.lifecycle_state ??
        captureLifecycle ??
        prior?.lifecycle_state,
      confirmed_at: validation.confirmed_at ?? prior?.confirmed_at,
      validated_at: validation.validated_at ?? prior?.validated_at,
      discovery_stance:
        prior?.discovery_stance ?? (debriefCapture ? "needs_validation" : undefined),
      uncertainty_kind: prior?.uncertainty_kind,
      organization_inheritance: prior?.organization_inheritance,
      evidence_text: sanitizedEvidence || prior?.evidence_text,
      propagated_signal: propagatedSignal ?? prior?.propagated_signal,
      discovery_mapping: discoveryMapping ?? prior?.discovery_mapping,
      access_blocker: accessBlocker || prior?.access_blocker,
      declared_source_type:
        params.captureContext.declared_source_type ?? prior?.declared_source_type,
      assertion,
    };
  }

  return next;
}

export type OrganizationInheritanceResolutionInput = {
  stance: OrganizationInheritanceStance;
  provider_value?: string | null;
  facility_display_line?: string;
  facility_value?: string;
  linked_contact_id?: string;
  workflow_role?: string;
  relationship_type?: string;
};

/**
 * Apply provider resolution for inherited facility intelligence.
 * Updates only this contact's column + metadata; does not touch peer providers.
 */
export function mergeOrganizationInheritanceResolutions(params: {
  existing: ProviderIntelligenceFieldMetadataMap;
  resolutions: Record<string, OrganizationInheritanceResolutionInput>;
  captureContext: IntelligenceCaptureContext;
  actor: { userId: string; userName: string };
  baseline?: OrganizationIntelligenceBaseline | null;
  now?: Date;
}): {
  metadata: ProviderIntelligenceFieldMetadataMap;
  fieldValues: Record<string, string | null>;
} {
  const nowIso = (params.now ?? new Date()).toISOString();
  const source_label = buildIntelligenceCaptureSourceLabel(params.captureContext);
  const next = { ...params.existing };
  const fieldValues: Record<string, string | null> = {};

  for (const [dbKey, row] of Object.entries(params.resolutions)) {
    if (!isOrganizationInheritanceDbKey(dbKey)) continue;

    const baselineField = params.baseline?.fields?.[dbKey];
    const inheritance = buildOrganizationInheritanceRecord({
      stance: row.stance,
      baseline: baselineField
        ? {
            ...baselineField,
            displayLine: row.facility_display_line ?? baselineField.displayLine,
            value: row.facility_value ?? baselineField.value,
          }
        : row.facility_value
          ? {
              dbKey,
              label: dbKey,
              value: row.facility_value,
              displayLine: row.facility_display_line ?? row.facility_value,
              contributorCount: 0,
            }
          : undefined,
      resolvedAt: nowIso,
    });

    const patchValue = buildOrganizationInheritancePatchValue({
      stance: row.stance,
      baseline: baselineField,
      providerValue: row.provider_value ?? row.facility_value ?? undefined,
    });

    fieldValues[dbKey] = patchValue;

    const prior = next[dbKey];
    next[dbKey] = {
      source_type: prior?.source_type ?? params.captureContext.source_type,
      source_label: prior?.source_label ?? source_label,
      source_engagement_id: prior?.source_engagement_id ?? params.captureContext.source_engagement_id,
      source_case_id: prior?.source_case_id ?? params.captureContext.source_case_id,
      updated_at: nowIso,
      updated_by_user_id: params.actor.userId,
      updated_by_name: params.actor.userName,
      lifecycle_state:
        row.stance === "exception" || row.stance === "applies"
          ? patchValue
            ? "confirmed"
            : prior?.lifecycle_state
          : prior?.lifecycle_state ?? "captured",
      confirmed_at: patchValue ? nowIso : prior?.confirmed_at,
      validated_at: prior?.validated_at,
      discovery_stance: row.stance === "does_not_apply" ? "not_relevant" : prior?.discovery_stance,
      uncertainty_kind: prior?.uncertainty_kind,
      organization_inheritance: inheritance,
    };
  }

  return { metadata: next, fieldValues };
}

export function mergeIntelligenceDiscoveryStances(params: {
  existing: ProviderIntelligenceFieldMetadataMap;
  stances: Record<
    string,
    { stance: IntelligenceDiscoveryStance; uncertainty_kind?: OperationalIntelligenceUncertaintyKind }
  >;
  captureContext: IntelligenceCaptureContext;
  actor: { userId: string; userName: string };
  now?: Date;
}): ProviderIntelligenceFieldMetadataMap {
  const nowIso = (params.now ?? new Date()).toISOString();
  const source_label = buildIntelligenceCaptureSourceLabel(params.captureContext);
  const next = { ...params.existing };

  for (const [dbKey, row] of Object.entries(params.stances)) {
    if (!isProviderIntelligenceDbKey(dbKey)) continue;
    const prior = next[dbKey];
    next[dbKey] = {
      source_type: prior?.source_type ?? params.captureContext.source_type,
      source_label: prior?.source_label ?? source_label,
      source_engagement_id: prior?.source_engagement_id ?? params.captureContext.source_engagement_id,
      source_case_id: prior?.source_case_id ?? params.captureContext.source_case_id,
      updated_at: nowIso,
      updated_by_user_id: params.actor.userId,
      updated_by_name: params.actor.userName,
      lifecycle_state:
        row.stance === "needs_validation" ? "assumed" : prior?.lifecycle_state ?? "captured",
      confirmed_at: prior?.confirmed_at,
      validated_at: prior?.validated_at,
      discovery_stance: row.stance,
      uncertainty_kind: row.uncertainty_kind ?? prior?.uncertainty_kind,
      organization_inheritance: prior?.organization_inheritance,
    };
  }

  return next;
}

export function applyIntelligenceFieldMetadataToPatch(
  patch: Record<string, unknown>,
  params: {
    existingMetadata: ProviderIntelligenceFieldMetadataMap;
    changedKeys: readonly string[];
    fieldValues: Record<string, string | null | undefined>;
    captureContext: IntelligenceCaptureContext;
    actor: { userId: string; userName: string };
    fieldEvidence?: Record<string, string>;
    fieldSignals?: Record<string, import("@/lib/surgical-sales/propagatedIntelligenceSignal").PropagatedIntelligenceSignal>;
    fieldDiscoveryMapping?: Record<string, DiscoveryMappingIntelligenceItem>;
    fieldAccessBlockers?: Record<string, string | null | undefined>;
  },
): void {
  const intelligenceChanges = params.changedKeys.filter(isProviderIntelligenceDbKey);
  if (intelligenceChanges.length === 0) return;

  patch.provider_intelligence_field_metadata = mergeIntelligenceFieldMetadata({
    existing: params.existingMetadata,
    changedKeys: intelligenceChanges,
    fieldValues: params.fieldValues,
    captureContext: params.captureContext,
    actor: params.actor,
    fieldEvidence: params.fieldEvidence,
    fieldSignals: params.fieldSignals,
    fieldDiscoveryMapping: params.fieldDiscoveryMapping,
  });
}
