import {
  DOMAIN_DB_KEY_CANDIDATES,
  type ConfidenceLevel,
  type IntelligenceDomain,
  type LogUpdateConfirmedUpdate,
  type LogUpdateOpenAiMapping,
  type LogUpdatePartialUpdate,
} from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { pickDbKeyForScope } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import type { IntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import {
  buildSynthesizedIntelligenceItem,
  type SynthesizedIntelligenceItem,
} from "@/lib/surgical-sales/aiSynthesisGuardrails";
import { isLowQualityIntelligenceText, sanitizeOperationalDisplayText } from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import { fieldLabelForDbKey } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  classifyIntelligenceRow,
  reclassifyIntelligenceMapping,
  textHasUncertaintyMarkers,
  textIsRepOpenNeed,
  textStatesAbsenceAsFact,
  defaultStillNeedsForPartial,
  formatPartialUpdateLabel,
} from "@/lib/surgical-sales/intelligenceClassificationGuardrails";
import {
  buildFieldIntelligenceSummary,
  sanitizeFieldIntelligenceLabel,
  sanitizeFieldIntelligenceText,
  sanitizeFieldIntelligenceValue,
} from "@/lib/surgical-sales/fieldIntelligenceLanguage";
import {
  legacyTargetFromSaveTarget,
  type IntelligenceSaveTarget,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

export type ExtractedIntelligenceSignal = {
  domain: IntelligenceDomain;
  signal: string;
  confidence: ConfidenceLevel;
  evidence: string;
  operational_meaning: string;
  save_target: IntelligenceSaveTarget;
  reasoning: string;
  source_scope?: string;
  /** Legacy routing target derived from save_target when not supplied. */
  target?: ReturnType<typeof legacyTargetFromSaveTarget>;
};

export type NormalizedIntelligenceSignal = ExtractedIntelligenceSignal & {
  dbKey: string | null;
  persistEligible: boolean;
  displayText: string;
  proposedScope: IntelligenceScope;
  scopeReason: string;
  proposedDestination: IntelligenceSaveDestination;
  destinationReason: string;
  durability: SynthesizedIntelligenceItem["durability"];
  /** Raw rep-note excerpt — preserved separately from synthesized display text. */
  source: string;
  synthesis: SynthesizedIntelligenceItem;
};

const DEFAULT_WRITABLE_DB_KEYS = new Set(PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS);

function slugKey(value: string): string {
  return value.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function pickDbKeyForSignal(
  signal: ExtractedIntelligenceSignal,
  writableKeys: Set<string>,
  scope: IntelligenceScope,
): string | null {
  if (scope === "case") return null;

  const candidates = DOMAIN_DB_KEY_CANDIDATES[signal.domain] ?? [];
  const scoped = pickDbKeyForScope(candidates, scope, writableKeys);
  if (scoped) return scoped;

  const labelLower = signal.signal.toLowerCase();
  for (const key of writableKeys) {
    const label = fieldLabelForDbKey(key).toLowerCase();
    if (labelLower.includes(label) || label.includes(labelLower.slice(0, 12))) return key;
  }
  return null;
}

function meaningKey(text: string): string {
  return slugKey(text).replace(/[^a-z0-9_]/g, "").slice(0, 120);
}

function mergeMeanings(existing: string, incoming: string): string {
  const a = existing.trim();
  const b = incoming.trim();
  if (!a) return b;
  if (!b || meaningKey(a) === meaningKey(b)) return a;
  if (a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase())) {
    return a.length >= b.length ? a : b;
  }
  return `${a} ${b.charAt(0).toLowerCase()}${b.slice(1)}`;
}

function signalFromConfirmedRow(
  row: LogUpdateOpenAiMapping["confirmed_updates"][number],
): ExtractedIntelligenceSignal | null {
  const meaning = sanitizeOperationalDisplayText(row.value) ?? "";
  if (!meaning) return null;
  const legacy = row as LogUpdateConfirmedUpdate;
  return {
    domain: row.domain,
    signal: row.label,
    confidence: row.confidence,
    evidence: row.reasoning,
    operational_meaning: meaning,
    save_target: row.save_target,
    reasoning: row.reasoning,
    source_scope: row.source_scope,
    target: legacy.target ?? legacyTargetFromSaveTarget(row.save_target),
  };
}

function signalFromPartialRow(
  row: LogUpdateOpenAiMapping["partial_updates"][number],
): ExtractedIntelligenceSignal | null {
  const meaning = sanitizeOperationalDisplayText(row.value) ?? "";
  if (!meaning) return null;
  const legacy = row as LogUpdatePartialUpdate;
  return {
    domain: row.domain,
    signal: row.label,
    confidence: row.confidence === "high" ? "medium" : row.confidence,
    evidence: row.still_needs.length ? row.still_needs.join("; ") : row.reasoning,
    operational_meaning: meaning,
    save_target: row.save_target,
    reasoning: row.reasoning,
    source_scope: row.source_scope,
    target: legacy.target ?? legacyTargetFromSaveTarget(row.save_target),
  };
}

function operationalSignalToExtracted(
  raw: LogUpdateOpenAiMapping["operational_signals"][number],
): ExtractedIntelligenceSignal {
  return {
    domain: raw.domain,
    signal: raw.signal,
    confidence: raw.confidence,
    evidence: raw.evidence,
    operational_meaning: raw.operational_meaning,
    save_target: raw.save_target,
    reasoning: raw.reasoning,
    source_scope: raw.source_scope,
    target: legacyTargetFromSaveTarget(raw.save_target),
  };
}

export function normalizeExtractedSignals(
  signals: ExtractedIntelligenceSignal[],
  options?: { writableFieldKeys?: string[] },
): NormalizedIntelligenceSignal[] {
  const writableKeys = new Set(
    options?.writableFieldKeys?.length ? options.writableFieldKeys : [...DEFAULT_WRITABLE_DB_KEYS],
  );

  const byMergeKey = new Map<string, NormalizedIntelligenceSignal>();

  for (const raw of signals) {
    if (
      isLowQualityIntelligenceText(raw.operational_meaning) &&
      isLowQualityIntelligenceText(raw.signal)
    ) {
      continue;
    }

    const synthesized = buildSynthesizedIntelligenceItem({
      domain: raw.domain,
      signal: raw.signal,
      confidence: raw.confidence,
      evidence: raw.evidence,
      operational_meaning: raw.operational_meaning,
      target: raw.target ?? legacyTargetFromSaveTarget(raw.save_target),
      reason: raw.reasoning,
    });
    if (!synthesized?.displayEligible) continue;

    const displayText = synthesized.operational_meaning;
    const proposedScope = synthesized.scope;
    const proposedDestination = synthesized.destination;
    const scopeReason = synthesized.guardrailNotes.join(" ") || raw.reasoning;
    const destinationReason = raw.reasoning;

    const dbKey =
      proposedDestination === "engagement_note"
        ? null
        : proposedScope === "case"
          ? null
          : pickDbKeyForSignal(
              {
                ...raw,
                confidence: synthesized.confidence,
                target: raw.target ?? legacyTargetFromSaveTarget(raw.save_target),
              },
              writableKeys,
              proposedScope,
            );

    const mergeKey = dbKey
      ? `field:${dbKey}`
      : `dest:${proposedDestination}:${raw.domain}:${meaningKey(displayText)}`;

    const persistEligible =
      synthesized.persistEligible && Boolean(dbKey) && proposedDestination !== "engagement_note";

    const existing = byMergeKey.get(mergeKey);
    if (!existing) {
      byMergeKey.set(mergeKey, {
        ...raw,
        confidence: synthesized.confidence,
        dbKey,
        persistEligible,
        displayText,
        proposedScope,
        scopeReason,
        proposedDestination,
        destinationReason,
        durability: synthesized.durability,
        source: synthesized.source,
        synthesis: { ...synthesized, dbKey },
      });
      continue;
    }

    const mergedConfidence: ConfidenceLevel =
      synthesized.confidence === "high" || existing.confidence === "high"
        ? "high"
        : synthesized.confidence === "medium" || existing.confidence === "medium"
          ? "medium"
          : "low";

    const mergedMeaning = mergeMeanings(existing.displayText, displayText);
    const merged = buildSynthesizedIntelligenceItem({
      domain: raw.domain,
      signal: existing.signal,
      confidence: mergedConfidence,
      evidence: mergeMeanings(existing.source, raw.evidence),
      operational_meaning: mergedMeaning,
      target: raw.target ?? legacyTargetFromSaveTarget(raw.save_target),
      reason: raw.reasoning,
      dbKey: existing.dbKey ?? dbKey,
    });
    if (!merged?.displayEligible) continue;

    byMergeKey.set(mergeKey, {
      ...existing,
      confidence: merged.confidence,
      operational_meaning: merged.operational_meaning,
      displayText: merged.operational_meaning,
      evidence: merged.source,
      source: merged.source,
      persistEligible:
        merged.persistEligible &&
        Boolean(existing.dbKey ?? dbKey) &&
        merged.destination !== "engagement_note",
      dbKey: existing.dbKey ?? dbKey,
      proposedScope: merged.scope,
      scopeReason: merged.guardrailNotes.join(" ") || existing.scopeReason,
      proposedDestination: merged.destination,
      durability: merged.durability,
      synthesis: merged,
    });
  }

  return [...byMergeKey.values()].filter((s) => s.synthesis.displayEligible);
}

export function buildOperationalSynthesisSummary(signals: NormalizedIntelligenceSignal[]): string {
  const lines = signals
    .filter((s) => s.confidence !== "low")
    .map((s) => sanitizeFieldIntelligenceText(s.displayText, { preferShort: true, maxLen: 160 }))
    .filter((t) => t && !isLowQualityIntelligenceText(t))
    .slice(0, 3);
  return buildFieldIntelligenceSummary(lines);
}

export function deriveMappingUpdatesFromSignals(
  signals: NormalizedIntelligenceSignal[],
): Pick<LogUpdateOpenAiMapping, "confirmed_updates" | "partial_updates"> {
  const confirmed_updates: LogUpdateOpenAiMapping["confirmed_updates"] = [];
  const partial_updates: LogUpdateOpenAiMapping["partial_updates"] = [];

  for (const s of signals) {
    if (isLowQualityIntelligenceText(s.displayText)) continue;

    const blob = `${s.displayText} ${s.source}`;
    const kind = classifyIntelligenceRow({
      label: s.signal,
      value: s.displayText,
      evidence: s.source,
      reasoning: s.reasoning,
      confidence: s.confidence,
    });

    if (kind === "still_to_validate" || kind === "omit") continue;

    if (
      kind === "confirmed" &&
      s.confidence === "high" &&
      s.persistEligible &&
      s.dbKey &&
      !textHasUncertaintyMarkers(blob) &&
      !textStatesAbsenceAsFact(blob) &&
      !textIsRepOpenNeed(blob)
    ) {
      confirmed_updates.push({
        domain: s.domain,
        label: sanitizeFieldIntelligenceLabel(s.signal),
        value: sanitizeFieldIntelligenceValue(s.displayText),
        confidence: "high",
        save_target: s.save_target,
        reasoning: sanitizeFieldIntelligenceText(s.reasoning, { maxLen: 400 }),
        source_scope: s.source_scope,
      });
      continue;
    }

    const stillNeeds =
      s.proposedDestination === "engagement_note"
        ? ["Save as engagement note when you confirm"]
        : defaultStillNeedsForPartial(s.signal, s.displayText, s.source).length > 0
          ? defaultStillNeedsForPartial(s.signal, s.displayText, s.source)
          : s.confidence === "high" && !s.dbKey && s.proposedScope !== "case"
            ? ["Map to a profile field on approval"]
            : s.proposedScope === "case"
              ? ["Save on case record when you confirm"]
              : ["Additional detail still needs validation"];

    partial_updates.push({
      domain: s.domain,
      label: sanitizeFieldIntelligenceLabel(formatPartialUpdateLabel(s.domain, s.signal, s.signal)),
      value: sanitizeFieldIntelligenceValue(s.displayText),
      still_needs: stillNeeds.map((n) => sanitizeFieldIntelligenceText(n, { maxLen: 200 })).filter(Boolean),
      confidence: "medium",
      save_target: s.save_target,
      reasoning: sanitizeFieldIntelligenceText(s.reasoning, { maxLen: 400 }),
      source_scope: s.source_scope,
    });
  }

  return { confirmed_updates, partial_updates };
}

export function applyIntelligencePipelineToMapping(
  mapping: LogUpdateOpenAiMapping,
  options?: { writableFieldKeys?: string[]; rawNote?: string },
): LogUpdateOpenAiMapping {
  const legacySignals: ExtractedIntelligenceSignal[] = [
    ...mapping.confirmed_updates.map((u) => signalFromConfirmedRow(u)).filter(Boolean),
    ...mapping.partial_updates.map((u) => signalFromPartialRow(u)).filter(Boolean),
  ] as ExtractedIntelligenceSignal[];

  const operationalSignals = (mapping.operational_signals ?? []).map(operationalSignalToExtracted);

  const allRaw: ExtractedIntelligenceSignal[] = [...operationalSignals, ...legacySignals];

  const normalized = normalizeExtractedSignals(allRaw, options);
  const derived = deriveMappingUpdatesFromSignals(normalized);
  const synthesis = buildOperationalSynthesisSummary(normalized);

  const merged: LogUpdateOpenAiMapping = {
    ...mapping,
    summary: sanitizeFieldIntelligenceText(synthesis || mapping.summary, {
      preferShort: true,
      maxLen: 320,
    }),
    confirmed_updates: derived.confirmed_updates,
    partial_updates: derived.partial_updates,
  };

  return reclassifyIntelligenceMapping(merged, { rawNote: options?.rawNote });
}
