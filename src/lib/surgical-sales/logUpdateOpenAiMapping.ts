import type { AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { parseLogUpdateFreeform } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateIntelligenceReview } from "@/lib/surgical-sales/logUpdateRelatedIntelligence";
import {
  applyIntelligencePipelineToMapping,
  type ExtractedIntelligenceSignal,
} from "@/lib/surgical-sales/intelligenceSignalPipeline";
import { enrichDebriefMappingWithPartialLeads } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import { formatPartialIntelligencePersistValue } from "@/lib/surgical-sales/partialIntelligencePersist";
import { suspectedContactForPartialUpdate } from "@/lib/surgical-sales/namedEntityIntelligenceGuardrails";
import { inferSchedulingControlFromDebrief } from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import { pickSchedulingIntelligenceDbKey } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import { applyReviewSelectionDefaults } from "@/lib/surgical-sales/logUpdateReviewSelection";
import {
  formatDebriefExtractionContextForPrompt,
  formatDebriefExtractionContextForPromptCompact,
  type DebriefIntelligenceExtractionContext,
} from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import {
  CATEGORY_AWARE_MERGE_DB_KEYS,
  intelligenceFieldConflict,
} from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";
import {
  CLINICAL_SIGNAL_LABEL,
  CLINICAL_STORAGE_SEPARATOR,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import {
  applyIntelligenceReversalsToFieldUpdates,
  fieldLabelForDbKey,
  routeLogUpdateToProviderFields,
  valuesConflict,
  type LogUpdateRoutedFieldUpdate,
} from "@/lib/surgical-sales/logUpdateProviderRouting";
import { pickDbKeyForScope } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import { resolveIntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  isEngagementNoteTarget,
  resolveIntelligenceSaveDestination,
  type IntelligenceSaveDestination,
} from "@/lib/surgical-sales/intelligenceSaveDestination";
import {
  intelligenceScopeForDbKey,
  type IntelligenceScope,
} from "@/lib/surgical-sales/intelligenceScopeModel";
import {
  isLowQualityIntelligenceText,
  sanitizeOperationalDisplayText,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  formatWorkflowMaturityPersistValue,
  inferWorkflowMaturityFromText,
  WORKFLOW_MATURITY_OPTIONS,
} from "@/lib/surgical-sales/workflowUnderstandingMaturity";
import {
  ACTION_PRIORITIES,
  CONFIDENCE_LEVELS,
  INTELLIGENCE_DOMAINS,
  LEGACY_INTELLIGENCE_TARGETS,
  OWNER_TYPES,
  type ConfirmedIntelligenceUpdate,
  type IntelligenceDomain,
  type IntelligenceSaveTarget,
  type LegacyIntelligenceTarget,
  type PartialIntelligenceUpdate,
  type StructuredIntelligenceAnalysis,
  StructuredIntelligenceAnalysisSchema,
  legacyTargetFromSaveTarget,
  normalizeStructuredIntelligencePayload,
  runStructuredIntelligenceAnalysis,
  STRUCTURED_INTELLIGENCE_SYSTEM_PROMPT,
  type ConfidenceLevel,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

export {
  INTELLIGENCE_DOMAINS,
  CONFIDENCE_LEVELS,
  ACTION_PRIORITIES,
  OWNER_TYPES,
  type IntelligenceDomain,
  type ConfidenceLevel,
  type IntelligenceSaveTarget,
};

/** @deprecated Use INTELLIGENCE_SAVE_TARGETS from structuredIntelligenceAnalysis */
export const INTELLIGENCE_TARGETS = LEGACY_INTELLIGENCE_TARGETS;
export type IntelligenceTarget = LegacyIntelligenceTarget;

export const LogUpdateOpenAiMappingSchema = StructuredIntelligenceAnalysisSchema;

export type LogUpdateOpenAiMapping = StructuredIntelligenceAnalysis;
export type LogUpdateOperationalSignal = StructuredIntelligenceAnalysis["operational_signals"][number];

/** Routed update row with legacy target alias for existing guardrails. */
export type LogUpdateConfirmedUpdate = ConfirmedIntelligenceUpdate & {
  target: IntelligenceTarget;
  reason: string;
};

export type LogUpdatePartialUpdate = PartialIntelligenceUpdate & {
  target: IntelligenceTarget;
  reason: string;
};

function withLegacyTarget<T extends { save_target: IntelligenceSaveTarget; reasoning: string }>(
  row: T,
): T & { target: IntelligenceTarget; reason: string } {
  return {
    ...row,
    target: legacyTargetFromSaveTarget(row.save_target),
    reason: row.reasoning,
  };
}

export function enrichMappingWithLegacyTargets(
  mapping: StructuredIntelligenceAnalysis,
): LogUpdateOpenAiMapping & {
  confirmed_updates: LogUpdateConfirmedUpdate[];
  partial_updates: LogUpdatePartialUpdate[];
} {
  return {
    ...mapping,
    confirmed_updates: mapping.confirmed_updates.map(withLegacyTarget),
    partial_updates: mapping.partial_updates.map(withLegacyTarget),
  };
}

/** Coerce messy model JSON into canonical structured intelligence shape. */
export function normalizeLogUpdateOpenAiPayload(raw: unknown, rawNote: string): unknown {
  return normalizeStructuredIntelligencePayload(raw, rawNote);
}

export type LogUpdateMappingInputContext = {
  rawNote: string;
  providerId: string | null;
  providerName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  engagementId: string | null;
  engagementType: string | null;
  productFocus: string | null;
  existingKnownFields: Record<string, string>;
  unresolvedGaps: string[];
  operationalRisks: string[];
  readinessSummary: string | null;
  writableFieldKeys: string[];
  /** Provider discovery pathway, open questions, contacts, platforms — loaded before AI runs. */
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  /** Smaller discovery block in the OpenAI user prompt (faster debrief analyze). */
  compactDiscoveryPrompt?: boolean;
};

/** Preferred provider db keys per operational domain (first match wins). */
export const DOMAIN_DB_KEY_CANDIDATES: Record<IntelligenceDomain, readonly string[]> = {
  or_access: [
    "provider_observation_feasibility",
    "provider_observation_access_path",
    "provider_ideal_observation_cases",
  ],
  credentialing: ["provider_credentialing_status", "provider_observation_credentialing_needed"],
  scheduling: [
    "provider_scheduling_contact",
    "provider_observation_scheduling_control",
    "provider_observation_coordinator_contact",
    "provider_facility_scheduling_contact",
    "provider_observation_best_days_case_types",
    "provider_observation_cadence_preference",
  ],
  workflow: [
    "provider_procedure_focus",
    "provider_technique_preferences",
    "provider_workflow_pain_points",
    "provider_clinical_frustrations",
    "provider_staff_frustrations",
    "provider_case_volume_estimate",
  ],
  relationship: [
    "provider_communication_style",
    "provider_responsiveness",
    "provider_follow_up_approach",
    "provider_decision_maker_status",
    "provider_champion_potential",
  ],
  stakeholders: [
    "provider_decision_maker_status",
    "provider_or_team_dynamics",
    "influence_level",
    "provider_observation_coordinator_contact",
  ],
  evaluation: [
    "provider_evaluation_openness",
    "provider_preference_card_signals",
    "provider_clinical_frustrations",
    "provider_product_gaps",
    "provider_dissatisfaction_areas",
  ],
  product_fit: [
    "provider_preference_card_signals",
    "provider_competitive_products",
    "provider_current_vendors",
    "provider_product_gaps",
    "provider_future_opportunity_signals",
  ],
  case_mix: [
    "provider_procedure_focus",
    "provider_case_volume_estimate",
    "provider_observation_best_days_case_types",
    "provider_future_opportunity_signals",
    "provider_strategic_goal",
  ],
  procurement: ["provider_current_vendors", "provider_evaluation_openness"],
  next_steps: [],
};

const WRITABLE_DB_KEYS = new Set(PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS);

const WORKFLOW_PERSIST_DB_KEYS = new Set(DOMAIN_DB_KEY_CANDIDATES.workflow);

function enrichWorkflowPersistValue(
  dbKey: string,
  proposedValue: string,
  rawNote: string,
): string {
  if (!WORKFLOW_PERSIST_DB_KEYS.has(dbKey)) return proposedValue;
  const maturity =
    inferWorkflowMaturityFromText(proposedValue) ?? inferWorkflowMaturityFromText(rawNote);
  if (!maturity) return proposedValue;
  return formatWorkflowMaturityPersistValue(maturity, proposedValue, undefined);
}

function pickDbKeyForUpdate(
  update: LogUpdateConfirmedUpdate,
  writableKeys: Set<string>,
  proposedScope: IntelligenceScope,
): string | null {
  const candidates = DOMAIN_DB_KEY_CANDIDATES[update.domain] ?? [];
  const scoped = pickDbKeyForScope(candidates, proposedScope, writableKeys);
  if (scoped) return scoped;

  const labelLower = update.label.toLowerCase();
  for (const key of writableKeys) {
    if (intelligenceScopeForDbKey(key) !== proposedScope) continue;
    const label = fieldLabelForDbKey(key).toLowerCase();
    if (labelLower.includes(label) || label.includes(labelLower.slice(0, 12))) return key;
  }
  return null;
}

function saveTargetAllowsFieldPersistence(saveTarget: IntelligenceSaveTarget): boolean {
  return saveTarget === "provider" || saveTarget === "organization";
}

function scopeFieldsForUpdate(
  update: Pick<LogUpdateConfirmedUpdate, "domain" | "label" | "value" | "target" | "save_target">,
): {
  proposedScope: LogUpdateRoutedFieldUpdate["proposedScope"];
  scopeReason: string;
  proposedDestination: IntelligenceSaveDestination;
  destinationReason: string;
} {
  const resolved = resolveIntelligenceScope({
    domain: update.domain,
    text: `${update.label} ${update.value}`,
    logUpdateTarget: update.target,
  });
  const destination = resolveIntelligenceSaveDestination({
    scope: resolved.scope,
    text: `${update.label} ${update.value}`,
    domain: update.domain,
    logUpdateTarget: update.target,
  });
  return {
    proposedScope: resolved.scope,
    scopeReason: resolved.reason,
    proposedDestination: destination.destination,
    destinationReason: destination.reason,
  };
}

export function confirmedUpdateToFieldRow(
  update: LogUpdateConfirmedUpdate,
  index: number,
  existingFields: Record<string, string>,
  writableKeys: Set<string>,
  rawNote = "",
): LogUpdateRoutedFieldUpdate | null {
  const { proposedScope, scopeReason, proposedDestination, destinationReason } = scopeFieldsForUpdate(update);
  if (
    proposedDestination === "engagement_note" ||
    proposedScope === "case" ||
    isEngagementNoteTarget(update.target) ||
    update.target === "case"
  ) {
    return null;
  }
  if (!saveTargetAllowsFieldPersistence(update.save_target)) return null;
  const dbKey = pickDbKeyForUpdate(update, writableKeys, proposedScope);
  if (!dbKey) return null;

  let proposedValue = sanitizeOperationalDisplayText(update.value.trim());
  if (!proposedValue) return null;
  if (update.domain === "workflow") {
    proposedValue = enrichWorkflowPersistValue(dbKey, proposedValue, rawNote);
  }
  const existingValue = String(existingFields[dbKey] ?? "").trim();
  const conflict =
    intelligenceFieldConflict({ dbKey, existingValue, proposedValue }) ??
    (valuesConflict(existingValue, proposedValue)
      ? {
          dbKey,
          existingValue,
          newValue: proposedValue,
          resolution: null,
        }
      : null);

  const defaultAccepted = update.confidence === "high";

  return {
    id: `ai-confirmed-${index}`,
    label: update.label.trim() || fieldLabelForDbKey(dbKey),
    dbKey,
    proposedValue,
    accepted: defaultAccepted && !conflict,
    conflict,
    proposedScope,
    scopeReason,
    proposedDestination,
    destinationReason,
  };
}

export function buildIntelligenceReviewFromMapping(
  mapping: LogUpdateOpenAiMapping,
): LogUpdateIntelligenceReview {
  return {
    summary: mapping.summary,
    confirmedUpdates: mapping.confirmed_updates.map((u) => u.label),
    partiallyConfirmed: mapping.partial_updates.map((p) => ({
      label: p.label,
      reason: p.still_needs.length
        ? `${p.reasoning} Still needs: ${p.still_needs.join("; ")}`
        : p.reasoning,
      domain: p.domain,
      confidence: p.confidence,
      target: legacyTargetFromSaveTarget(p.save_target),
    })),
    stillWorthConfirming: mapping.still_to_validate.map(
      (s) => `${s.question}${s.priority === "high" ? " (high priority)" : ""}`,
    ),
    relatedOperationalAreas: [
      ...new Set(
        [
          ...(mapping.operational_signals ?? []).map((u) => u.domain),
          ...mapping.confirmed_updates.map((u) => u.domain),
          ...mapping.partial_updates.map((u) => u.domain),
        ].map((d) => d.replace(/_/g, " ")),
      ),
    ],
    suggestedNextActions: mapping.recommended_next_moves,
    doNotUpdate: mapping.do_not_update,
  };
}

export type LogUpdateMappingParseResult = LogUpdateParseResult & {
  aiMapping: LogUpdateOpenAiMapping | null;
  mappingSource: "openai" | "keyword_fallback";
};

export function partialUpdateToFieldRow(
  update: LogUpdatePartialUpdate,
  index: number,
  existingFields: Record<string, string>,
  writableKeys: Set<string>,
  rawNote = "",
): LogUpdateRoutedFieldUpdate | null {
  const pseudo = {
    domain: update.domain,
    label: update.label,
    value: update.value,
    target: update.target,
    save_target: update.save_target,
  };
  const { proposedScope, scopeReason, proposedDestination, destinationReason } = scopeFieldsForUpdate(pseudo);
  if (
    proposedDestination === "engagement_note" ||
    proposedScope === "case" ||
    isEngagementNoteTarget(update.target) ||
    update.target === "case"
  ) {
    return null;
  }
  if (!saveTargetAllowsFieldPersistence(update.save_target)) return null;

  const pseudoConfirmed = {
    domain: update.domain,
    label: update.label,
    value: update.value,
    confidence: "medium" as const,
    target: update.target,
    save_target: update.save_target,
    reasoning: update.reasoning,
    reason: update.reason,
  } as LogUpdateConfirmedUpdate;

  const observationAccessBlob = `${update.label} ${update.value} ${update.reasoning}`;
  const dbKey =
    update.domain === "scheduling"
      ? pickSchedulingIntelligenceDbKey({
          label: update.label,
          value: update.value,
          reasoning: update.reasoning,
          sourceScope: update.source_scope,
          rawNote,
          proposedScope,
          writableKeys,
        })
      : update.domain === "or_access" &&
          /\bobservation\b/i.test(observationAccessBlob) &&
          writableKeys.has("provider_observation_feasibility")
        ? "provider_observation_feasibility"
        : pickDbKeyForUpdate(pseudoConfirmed, writableKeys, proposedScope);
  if (!dbKey) return null;

  const narrative = sanitizeOperationalDisplayText(update.value.trim());
  if (!narrative && update.still_needs.length === 0) return null;

  const suspected = suspectedContactForPartialUpdate({
    domain: update.domain,
    label: update.label,
    value: update.value,
    reasoning: update.reasoning,
    rawNote,
  });
  const sourceQuoteMatch = update.reasoning.match(/Source quote:\s*"([^"]+)"/i);

  const schedulingControl =
    update.domain === "scheduling" && dbKey === "provider_observation_scheduling_control"
      ? inferSchedulingControlFromDebrief(rawNote)
      : null;

  let proposedValue: string;
  if (schedulingControl) {
    proposedValue = schedulingControl;
  } else {
    proposedValue = formatPartialIntelligencePersistValue({
      narrative: narrative || update.label.trim(),
      stillNeeds: update.still_needs,
      suspectedContact: suspected,
      contactScopeNote:
        update.domain === "scheduling" && update.save_target === "provider"
          ? "provider office — not confirmed facility-wide"
          : update.domain === "stakeholders"
            ? "suspected contact lead"
            : null,
      sourceQuote: sourceQuoteMatch?.[1] ?? null,
    });
  }

  if (update.domain === "workflow") {
    proposedValue = enrichWorkflowPersistValue(dbKey, proposedValue, rawNote);
  }
  const existingValue = String(existingFields[dbKey] ?? "").trim();
  const conflict =
    intelligenceFieldConflict({ dbKey, existingValue, proposedValue }) ??
    (valuesConflict(existingValue, proposedValue)
      ? {
          dbKey,
          existingValue,
          newValue: proposedValue,
          resolution: null,
        }
      : null);

  return {
    id: `ai-partial-${index}`,
    label: update.label.trim() || fieldLabelForDbKey(dbKey),
    dbKey,
    proposedValue,
    accepted: false,
    conflict,
    proposedScope,
    scopeReason,
    proposedDestination,
    destinationReason,
  };
}

export function buildParseResultFromOpenAiMapping(params: {
  sourceText: string;
  mapping: LogUpdateOpenAiMapping;
  context?: AiNoteCaptureContext;
  existingFields?: Record<string, string>;
}): LogUpdateMappingParseResult {
  const existingFields = params.existingFields ?? {};
  const writableKeys = new Set(
    (params.context?.writableFieldKeys?.length
      ? params.context.writableFieldKeys
      : [...WRITABLE_DB_KEYS]) as string[],
  );

  const pipelineMapping = applyIntelligencePipelineToMapping(params.mapping, {
    writableFieldKeys: [...writableKeys],
    rawNote: params.sourceText,
  });
  const enrichedMapping = enrichDebriefMappingWithPartialLeads(
    pipelineMapping,
    params.sourceText,
  );
  const mapping = enrichMappingWithLegacyTargets(enrichedMapping) as StructuredIntelligenceAnalysis & {
    confirmed_updates: LogUpdateConfirmedUpdate[];
    partial_updates: LogUpdatePartialUpdate[];
  };

  const fieldUpdates: LogUpdateRoutedFieldUpdate[] = [];
  mapping.confirmed_updates.forEach((u, i) => {
    const row = confirmedUpdateToFieldRow(
      u as LogUpdateConfirmedUpdate,
      i,
      existingFields,
      writableKeys,
      params.sourceText,
    );
    if (row) fieldUpdates.push(row);
  });
  mapping.partial_updates.forEach((u, i) => {
    const row = partialUpdateToFieldRow(
      u as LogUpdatePartialUpdate,
      i,
      existingFields,
      writableKeys,
      params.sourceText,
    );
    if (row && !fieldUpdates.some((f) => f.dbKey === row.dbKey)) fieldUpdates.push(row);
  });

  if (fieldUpdates.length === 0 && params.context?.providerId) {
    const keyword = routeLogUpdateToProviderFields(params.sourceText, existingFields);
    for (const u of keyword) {
      if (isLowQualityIntelligenceText(u.proposedValue)) continue;
      if (!fieldUpdates.some((f) => f.dbKey === u.dbKey)) fieldUpdates.push(u);
    }
  }

  const normalizedFieldUpdates = applyIntelligenceReversalsToFieldUpdates(
    params.sourceText,
    fieldUpdates,
    existingFields,
  );
  fieldUpdates.length = 0;
  fieldUpdates.push(...normalizedFieldUpdates);

  const intelligenceReview = buildIntelligenceReviewFromMapping(mapping);
  const usesProviderIntelligence = Boolean(params.context?.providerId);

  return {
    ...applyReviewSelectionDefaults({
      sourceText: params.sourceText.trim(),
      suggestedUpdates: fieldUpdates.map((u) => ({
        id: u.id,
        label: u.label,
        accepted: u.accepted,
      })),
      fieldUpdates,
      intelligenceReview,
      stillMissing: intelligenceReview.stillWorthConfirming,
      saveAsNoteAccepted: true,
      usesProviderIntelligence,
      aiMapping: mapping,
      mappingSource: "openai",
    }),
    aiMapping: mapping,
    mappingSource: "openai",
  } satisfies LogUpdateMappingParseResult;
}

export function buildKeywordFallbackParseResult(
  sourceText: string,
  context?: AiNoteCaptureContext,
  existingFields?: Record<string, string>,
): LogUpdateMappingParseResult {
  const base = parseLogUpdateFreeform(sourceText, context, existingFields);
  return {
    ...base,
    intelligenceReview: {
      ...base.intelligenceReview,
      summary: null,
      suggestedNextActions: [],
      doNotUpdate: [],
    },
    saveAsNoteAccepted: false,
    aiMapping: null,
    mappingSource: "keyword_fallback",
  };
}

const CLINICAL_SIGNAL_LABEL_SET = new Set(
  Object.values(CLINICAL_SIGNAL_LABEL).map((label) => label.trim().toLowerCase()),
);

/**
 * Strip trend/status suffixes ("· Increasing procedure volume") from on-file
 * clinical values before they enter the extraction prompt. Trends must come
 * from the current note's evidence — never echoed from stored labels
 * (RCA Failure 1 leak vector).
 */
export function stripClinicalTrendSuffixesForPrompt(dbKey: string, value: string): string {
  if (!CATEGORY_AWARE_MERGE_DB_KEYS.has(dbKey)) return value;
  return value
    .split(/\s*\|\s*|\n+|\s*;\s*/)
    .map((segment) => {
      const parts = segment.split(CLINICAL_STORAGE_SEPARATOR).map((p) => p.trim());
      // Segments that are nothing but a trend label drop entirely — they are
      // the exact echo the model re-emits as fake new facts.
      const kept = parts.filter((p) => p && !CLINICAL_SIGNAL_LABEL_SET.has(p.toLowerCase()));
      return kept.join(CLINICAL_STORAGE_SEPARATOR);
    })
    .filter(Boolean)
    .join(" | ");
}

export function buildOpenAiUserPrompt(ctx: LogUpdateMappingInputContext): string {
  const compact = ctx.compactDiscoveryPrompt === true;
  const knownFieldLimit = compact ? 24 : 40;
  const knownValueLen = compact ? 180 : 280;

  const knownLines = Object.entries(ctx.existingKnownFields)
    .filter(([, v]) => String(v).trim())
    .slice(0, knownFieldLimit)
    .map(
      ([k, v]) =>
        `- ${fieldLabelForDbKey(k)}: ${stripClinicalTrendSuffixesForPrompt(k, String(v).trim()).slice(0, knownValueLen)}`,
    );

  const gapLines = ctx.unresolvedGaps.slice(0, compact ? 12 : 20).map((g) => `- ${g}`);
  const riskLines = ctx.operationalRisks.slice(0, compact ? 6 : 12).map((r) => `- ${r}`);

  return [
    "Context:",
    ctx.providerId ? `- provider_id: ${ctx.providerId} (${ctx.providerName || "Provider"})` : "- provider: (none)",
    ctx.organizationId
      ? `- organization_id: ${ctx.organizationId} (${ctx.organizationName || "Organization"})`
      : "- organization: (none)",
    ctx.engagementId
      ? `- engagement_id: ${ctx.engagementId} (type: ${ctx.engagementType || "unknown"})`
      : "- engagement: (none)",
    ctx.productFocus ? `- product_focus: ${ctx.productFocus}` : "",
    ctx.readinessSummary ? `- readiness / stage: ${ctx.readinessSummary}` : "",
    "",
    ctx.discoveryContext
      ? [
          "Discovery intelligence context:",
          compact
            ? formatDebriefExtractionContextForPromptCompact(ctx.discoveryContext)
            : formatDebriefExtractionContextForPrompt(ctx.discoveryContext),
          "",
        ].join("\n")
      : "",
    "",
    "Existing known intelligence fields:",
    knownLines.length ? knownLines.join("\n") : "- (none on file)",
    "",
    "Unresolved intelligence gaps (do not mark missing if note partially answers):",
    gapLines.length ? gapLines.join("\n") : "- (none listed)",
    "",
    "Current operational risks:",
    riskLines.length ? riskLines.join("\n") : "- (none listed)",
    "",
    "Writable provider field keys (map provider targets to these domains only):",
    ctx.writableFieldKeys.slice(0, compact ? 32 : 48).join(", "),
    "",
    "Classification reminder (any dictation style — fragments, bullets, or sentences):",
    "- confirmed = explicit affirmative facts only; confidence high only when plainly stated without hedging",
    "- partial = useful signal with gaps, hedging (\"might\", \"I think\", \"probably\"), or missing detail — include still_needs[]",
    "- still_to_validate = unknowns and rep open needs — never store absence as a confirmed fact",
    "- Separate interest vs approval, pain vs product interest, mentioned names vs confirmed contacts, next steps vs completed actions",
    "- evidence on each operational_signal must quote the note; never invent facts not in the note",
    "- Never re-emit on-file clinical volume/trend labels unless the note contains explicit growth language (increasing, growing, more cases, higher volume, newly adopted)",
    "- Map answers to open intelligence questions when the note addresses them",
    "- Do not overwrite validated on-file facts; if note conflicts, use partial_updates with reasoning",
    "- Do not infer adoption, evaluation likelihood, or commercial impact unless explicit",
    "- Observation approval: confirmed only with explicit approval language — openness/interest is partial only",
    "",
    "Procedure workflow understanding (workflow domain):",
    "- Infer maturity from debrief language — not observation-only",
    `- Maturity values: ${WORKFLOW_MATURITY_OPTIONS.map((o) => o.label).join(" | ")}`,
    "- Examples: \"We discussed their hernia flow\" → Discussed only; \"I saw the OR setup and tray prep\" → Observed in field; \"We now fully understand their workflow and product fit\" → Fully validated",
    "- Prefix provider field values with maturity token when clear (e.g. discussed_only|Verbal understanding — hernia flow discussed on intro)",
    "",
    "Field language:",
    "- short, direct operational phrasing — not consultant or strategy memo tone",
    "- prefer \"partially mapped,\" \"still needs confirmation,\" \"mentioned but not validated\"",
    "- never \"indicating potential interest,\" \"could impact product acceptance,\" or \"diverse product applications\"",
    "",
    "Rep note:",
    '"""',
    ctx.rawNote.trim(),
    '"""',
  ]
    .filter(Boolean)
    .join("\n");
}

export type RunOpenAiLogUpdateMappingOptions = {
  /** Lower token cap speeds debrief analyze (default 4096). */
  maxTokens?: number;
};

export async function runOpenAiLogUpdateMapping(
  ctx: LogUpdateMappingInputContext,
  options?: RunOpenAiLogUpdateMappingOptions,
): Promise<LogUpdateOpenAiMapping> {
  const sourceScope = ctx.engagementId
    ? `engagement:${ctx.engagementId}`
    : ctx.providerId
      ? `provider:${ctx.providerId}`
      : "field_note";

  const maxTokens =
    options?.maxTokens ??
    (ctx.compactDiscoveryPrompt ? 2048 : 4096);

  const analysis = await runStructuredIntelligenceAnalysis({
    userPrompt: buildOpenAiUserPrompt(ctx),
    rawNote: ctx.rawNote,
    sourceScope,
    systemPrompt: STRUCTURED_INTELLIGENCE_SYSTEM_PROMPT,
    maxTokens,
  });

  return applyIntelligencePipelineToMapping(analysis, {
    writableFieldKeys: ctx.writableFieldKeys,
    rawNote: ctx.rawNote,
  });
}

export async function mapLogUpdateNoteWithOpenAi(params: {
  sourceText: string;
  context?: AiNoteCaptureContext;
  existingFields?: Record<string, string>;
  mappingContext: LogUpdateMappingInputContext;
}): Promise<LogUpdateMappingParseResult> {
  const mapping = await runOpenAiLogUpdateMapping({
    ...params.mappingContext,
    rawNote: params.sourceText,
  });
  return buildParseResultFromOpenAiMapping({
    sourceText: params.sourceText,
    mapping,
    context: params.context,
    existingFields: params.existingFields,
  });
}
