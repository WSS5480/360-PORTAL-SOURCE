/**
 * Structured intelligence propagated from debrief extraction to Discovery Mapping.
 * Preserves known facts, evidence, entities, and remaining unknowns — never generic placeholders.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  classifySchedulingDebriefStrength,
  inferSchedulingControlFromDebrief,
} from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import { humanEvidenceForFieldUpdate } from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import type { IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import { stageMappingRegistryDbKeys } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import {
  extractSourceQuoteFromPersistedValue,
  PARTIAL_INTELLIGENCE_LEAD_PREFIX,
} from "@/lib/surgical-sales/partialIntelligencePersist";
import { extractPreservedNamedEntities } from "@/lib/surgical-sales/namedEntityPreservation";
import { extractSuspectedContactFromSchedulingContext } from "@/lib/surgical-sales/namedEntityIntelligenceGuardrails";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceFieldAttribution,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { sanitizeDiscoveryEvidenceQuote } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import {
  namedEntityEvidenceBelongsToSignal,
  textHasSchedulingNamedEntityContext,
} from "@/lib/surgical-sales/namedEntityIntelligenceGuardrails";

export type PropagatedIntelligenceNamedEntity = {
  name: string;
  role?: string;
};

export type PropagatedIntelligenceSignal = {
  signalType: string;
  evidenceText: string;
  namedEntities: PropagatedIntelligenceNamedEntity[];
  knownFacts: string[];
  remainingUnknowns: string[];
};

const GENERIC_SUMMARY_RE =
  /scheduling coordination was mentioned|ownership is not confirmed|mentioned indirectly|still need(s)? confirmation/i;

export function isGenericIntelligenceSummary(text: string | null | undefined): boolean {
  const t = String(text ?? "").trim();
  if (!t) return true;
  return GENERIC_SUMMARY_RE.test(t);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function extractSchedulingEvidenceQuote(note: string): string | null {
  const text = note.trim();
  if (!text) return null;

  const sentencePatterns = [
    /\b[A-Z][a-z]+[^.]{0,120}\bhandles?\s+scheduling[^.]*\./i,
    /\b[A-Z][a-z]+[^.]{0,120}\bcoordinat(?:e|es|ing)\s+scheduling[^.]*\./i,
    /\b[A-Z][a-z]+[^.]{0,120}\b(?:works?|help(?:s|ed)?)\s+with\s+(?:the\s+)?or\s+scheduling[^.]*\./i,
    /\bhandles?\s+scheduling[^.]*\./i,
  ];
  for (const re of sentencePatterns) {
    const m = text.match(re);
    if (m?.[0]) return m[0].trim();
  }
  return null;
}

function extractNamedEntitiesFromNote(note: string, domain?: IntelligenceDomain): PropagatedIntelligenceNamedEntity[] {
  return extractPreservedNamedEntities(note).map((entity) => ({
    name: entity.name,
    role: entity.possibleRole?.toLowerCase() ?? undefined,
  }));
}

function signalTypeForDomain(domain: IntelligenceDomain): string {
  switch (domain) {
    case "scheduling":
      return "scheduling_pathway";
    case "or_access":
      return "observation_access";
    case "credentialing":
      return "facility_vendor_pathway";
    case "workflow":
      return "workflow_visibility";
    case "product_fit":
      return "product_alignment";
    case "case_mix":
      return "case_opportunity";
    case "stakeholders":
      return "clinical_champion";
    default:
      return domain;
  }
}

function signalTypeForStageSignal(signalId: StageMappingSignalId): string {
  switch (signalId) {
    case "scheduling_owner":
      return "scheduling_pathway";
    case "observation_approval":
      return "observation_access";
    case "facility_vendor_pathway":
      return "facility_vendor_pathway";
    case "workflow_visibility":
      return "workflow_visibility";
    case "product_alignment":
      return "product_alignment";
    case "case_opportunity":
      return "case_opportunity";
    case "clinical_champion":
      return signalId;
    case "observation_logistics":
      return "observation_logistics";
    default:
      return signalId;
  }
}

function buildSchedulingPropagatedSignal(
  note: string,
  field?: LogUpdateRoutedFieldUpdate,
  logUpdate?: LogUpdateParseResult,
): PropagatedIntelligenceSignal {
  const evidenceText =
    (field && logUpdate
      ? sanitizeDiscoveryEvidenceQuote(humanEvidenceForFieldUpdate(field, logUpdate))
      : null) ??
    extractSchedulingEvidenceQuote(note) ??
    extractSourceQuoteFromPersistedValue(field?.proposedValue) ??
    note.trim();

  const strength = classifySchedulingDebriefStrength(note);
  const entities = extractNamedEntitiesFromNote(note, "scheduling");
  const primaryName =
    entities[0]?.name ??
    extractSuspectedContactFromSchedulingContext(field?.proposedValue ?? "") ??
    extractSuspectedContactFromSchedulingContext(note);

  const knownFacts: string[] = [];
  const remainingUnknowns: string[] = [];

  if (primaryName) {
    if (/\bhandles?\s+scheduling\b/i.test(note)) {
      knownFacts.push(`${primaryName} handles scheduling`);
    } else if (/\bcoordinat(?:e|es|ing)\s+scheduling\b/i.test(note)) {
      knownFacts.push(`${primaryName} coordinates scheduling`);
    } else if (/\bhelp(?:s|ed)?\s+with\s+timing\b/i.test(note)) {
      knownFacts.push(`${primaryName} helps with scheduling timing`);
    } else if (strength !== "none") {
      knownFacts.push(`${primaryName} was mentioned in scheduling context`);
    }
    remainingUnknowns.push("Contact information");
    if (strength !== "clear") {
      remainingUnknowns.push("Authority confirmation");
    }
  } else if (strength !== "none") {
    knownFacts.push("Scheduling coordination was discussed");
    remainingUnknowns.push("Scheduling owner name", "Authority confirmation", "Contact information");
  }

  const control = inferSchedulingControlFromDebrief(note);
  if (control === "shared_workflow" || /\bor\s+scheduling\b/i.test(note)) {
    knownFacts.push("Office coordinates with OR scheduling team");
  }

  const stillFromField = field?.proposedValue?.match(/Still needed:\s*([^.]+)/i)?.[1];
  if (stillFromField) {
    remainingUnknowns.push(
      ...stillFromField.split(/[;,]/).map((s) => s.trim()).filter(Boolean),
    );
  }

  return {
    signalType: "scheduling_pathway",
    evidenceText,
    namedEntities: entities,
    knownFacts: uniqueStrings(knownFacts),
    remainingUnknowns: uniqueStrings(remainingUnknowns),
  };
}

function buildPropagatedSignalFromField(
  field: LogUpdateRoutedFieldUpdate,
  logUpdate: LogUpdateParseResult,
): PropagatedIntelligenceSignal | null {
  const note = logUpdate.sourceText.trim();
  if (!note) return null;

  const ai = logUpdate.aiMapping;
  const domain =
    ai?.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`)?.domain ??
    ai?.partial_updates.find((_, i) => field.id === `ai-partial-${i}`)?.domain;

  if (
    domain === "scheduling" ||
    field.dbKey === "provider_observation_scheduling_control" ||
    field.dbKey === "provider_scheduling_contact"
  ) {
    return buildSchedulingPropagatedSignal(note, field, logUpdate);
  }

  const evidenceText =
    sanitizeDiscoveryEvidenceQuote(humanEvidenceForFieldUpdate(field, logUpdate)) ??
    extractSourceQuoteFromPersistedValue(field.proposedValue) ??
    note.slice(0, 400);

  const partial = ai?.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  const knownFacts = partial?.value && !isGenericIntelligenceSummary(partial.value)
    ? [partial.value.trim()]
    : evidenceText && !isGenericIntelligenceSummary(evidenceText)
      ? [evidenceText]
      : [];

  const namedEntities = extractNamedEntitiesFromNote(note, domain);
  const mappedSignalId = (domain ? signalTypeForDomain(domain) : field.dbKey) as StageMappingSignalId;
  const filteredFacts = knownFacts.filter((fact) =>
    namedEntityEvidenceBelongsToSignal(mappedSignalId, fact),
  );
  const filteredEvidence =
    evidenceText && namedEntityEvidenceBelongsToSignal(mappedSignalId, evidenceText)
      ? evidenceText
      : namedEntities.length > 0
        ? ""
        : evidenceText;

  return {
    signalType: domain ? signalTypeForDomain(domain) : field.dbKey,
    evidenceText: filteredEvidence,
    namedEntities,
    knownFacts: uniqueStrings(filteredFacts),
    remainingUnknowns: uniqueStrings(partial?.still_needs ?? []),
  };
}

export function buildFieldSignalsFromLogUpdate(
  logUpdate: LogUpdateParseResult | null,
): Record<string, PropagatedIntelligenceSignal> {
  if (!logUpdate?.usesProviderIntelligence) return {};
  const out: Record<string, PropagatedIntelligenceSignal> = {};
  for (const field of logUpdate.fieldUpdates) {
    if (!field.accepted || !field.dbKey) continue;
    const signal = buildPropagatedSignalFromField(field, logUpdate);
    if (!signal || (signal.knownFacts.length === 0 && !signal.evidenceText)) continue;
    out[field.dbKey] = signal;
  }
  return out;
}

/** Build propagated signals when only commit payload (patches + source text) is available. */
export function buildFieldSignalsFromCommit(input: {
  sourceText: string;
  fieldPatches: Array<{ dbKey: string; value: string }>;
}): Record<string, PropagatedIntelligenceSignal> {
  const logUpdate: LogUpdateParseResult = {
    sourceText: input.sourceText,
    suggestedUpdates: [],
    fieldUpdates: input.fieldPatches.map((fp, index) => ({
      id: `commit-${index}`,
      label: fp.dbKey,
      dbKey: fp.dbKey,
      proposedValue: fp.value,
      accepted: true,
      conflict: null,
      proposedScope: "provider" as const,
      scopeReason: "",
      proposedDestination: "provider" as const,
      destinationReason: "",
    })),
    intelligenceReview: {
      confirmedUpdates: [],
      partiallyConfirmed: [],
      stillWorthConfirming: [],
      relatedOperationalAreas: [],
    },
    stillMissing: [],
    saveAsNoteAccepted: false,
    usesProviderIntelligence: true,
    aiMapping: null,
    mappingSource: null,
  };
  return buildFieldSignalsFromLogUpdate(logUpdate);
}

export function parsePropagatedIntelligenceSignal(raw: unknown): PropagatedIntelligenceSignal | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const evidenceText = String(row.evidenceText ?? row.evidence_text ?? "").trim();
  const signalType = String(row.signalType ?? row.signal_type ?? "").trim();
  if (!signalType || !evidenceText) return null;

  const rawNamedEntities = row.namedEntities ?? row.named_entities;
  const namedEntities = Array.isArray(rawNamedEntities)
    ? rawNamedEntities
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return null;
          const e = item as Record<string, unknown>;
          const name = String(e.name ?? "").trim();
          if (!name) return null;
          return {
            name,
            role: String(e.role ?? "").trim() || undefined,
          };
        })
        .filter(Boolean) as PropagatedIntelligenceNamedEntity[]
    : [];

  const rawKnownFacts = row.knownFacts ?? row.known_facts;
  const knownFacts = Array.isArray(rawKnownFacts)
    ? rawKnownFacts.map((v) => String(v).trim()).filter(Boolean)
    : [];
  const rawRemainingUnknowns = row.remainingUnknowns ?? row.remaining_unknowns;
  const remainingUnknowns = Array.isArray(rawRemainingUnknowns)
    ? rawRemainingUnknowns.map((v) => String(v).trim()).filter(Boolean)
    : [];

  return {
    signalType,
    evidenceText,
    namedEntities,
    knownFacts: uniqueStrings(knownFacts),
    remainingUnknowns: uniqueStrings(remainingUnknowns),
  };
}

export function formatPropagatedSignalSummary(
  signal: PropagatedIntelligenceSignal,
  signalId?: StageMappingSignalId,
): string {
  const primaryFact = signal.knownFacts[0]?.trim();
  if (primaryFact && !isGenericIntelligenceSummary(primaryFact)) {
    if (signalId && !namedEntityEvidenceBelongsToSignal(signalId, primaryFact)) {
      return "";
    }
    const entity = signal.namedEntities[0];
    if (
      entity &&
      /\bhandles?\s+scheduling\b/i.test(primaryFact) &&
      primaryFact.toLowerCase().startsWith(entity.name.toLowerCase())
    ) {
      return `${entity.name} was mentioned as the scheduling coordinator.`;
    }
    if (
      entity &&
      /\bcoordinat/i.test(primaryFact) &&
      primaryFact.toLowerCase().includes(entity.name.toLowerCase())
    ) {
      return `${entity.name} was mentioned as the scheduling coordinator.`;
    }
    return primaryFact.endsWith(".") ? primaryFact : `${primaryFact}.`;
  }

  if (signal.evidenceText && !isGenericIntelligenceSummary(signal.evidenceText)) {
    if (signalId && !namedEntityEvidenceBelongsToSignal(signalId, signal.evidenceText)) {
      return "";
    }
    return signal.evidenceText.endsWith(".") ? signal.evidenceText : `${signal.evidenceText}.`;
  }

  const entity = signal.namedEntities[0];
  if (entity?.role?.includes("scheduling")) {
    if (signalId && !signalAllowsSchedulingSummary(signalId)) {
      return "";
    }
    return `${entity.name} was mentioned as the scheduling coordinator.`;
  }

  return primaryFact ?? signal.evidenceText;
}

function signalAllowsSchedulingSummary(signalId: StageMappingSignalId): boolean {
  return namedEntityEvidenceBelongsToSignal(signalId, "scheduling coordinator");
}

export function stillNeedFromPropagatedSignal(signal: PropagatedIntelligenceSignal): string[] {
  return uniqueStrings(signal.remainingUnknowns);
}

function reconstructSchedulingSignalFromContact(input: {
  contact: Record<string, unknown>;
  dbKeys: string[];
  metaByKey: Record<string, IntelligenceFieldAttribution | undefined>;
}): PropagatedIntelligenceSignal | null {
  let evidenceText = "";
  let narrative = "";
  let contactName: string | null = null;

  for (const dbKey of input.dbKeys) {
    const meta = input.metaByKey[dbKey];
    const quote = sanitizeDiscoveryEvidenceQuote(meta?.evidence_text);
    if (quote && !evidenceText) evidenceText = quote;

    const raw = String(input.contact[dbKey] ?? "").trim();
    if (!raw) continue;
    if (raw === "shared_workflow" || raw === "provider_office" || raw === "facility") continue;

    const fromSource = extractSourceQuoteFromPersistedValue(raw);
    if (fromSource && !evidenceText) evidenceText = fromSource;

    const partialName = raw.match(new RegExp(`^${PARTIAL_INTELLIGENCE_LEAD_PREFIX}\\s*([A-Z][a-z]+)`))?.[1];
    if (partialName) contactName = partialName;

    const cleaned = raw
      .replace(new RegExp(`^${PARTIAL_INTELLIGENCE_LEAD_PREFIX}[^\\n]*\\n*`, "i"), "")
      .replace(/\n\nStill needed:[\s\S]*$/i, "")
      .replace(/\n\nSource:[\s\S]*$/i, "")
      .trim();
    if (cleaned && cleaned.length > narrative.length) narrative = cleaned;
  }

  const note = evidenceText || narrative;
  if (!note) return null;

  const rebuilt = buildSchedulingPropagatedSignal(note, {
    id: "reconstructed",
    label: "Scheduling",
    dbKey: "provider_scheduling_contact",
    proposedValue: narrative,
    accepted: true,
    proposedScope: "provider",
    scopeReason: "",
    proposedDestination: "provider",
    destinationReason: "",
    conflict: null,
  } satisfies LogUpdateRoutedFieldUpdate);

  if (contactName && !rebuilt.namedEntities.some((e) => e.name === contactName)) {
    rebuilt.namedEntities.unshift({ name: contactName, role: "scheduling coordinator" });
  }

  if (rebuilt.knownFacts.length === 0 && contactName) {
    rebuilt.knownFacts.push(`${contactName} was mentioned in scheduling context`);
    rebuilt.remainingUnknowns.push("Contact information", "Authority confirmation");
  }

  return rebuilt.knownFacts.length > 0 || rebuilt.evidenceText ? rebuilt : null;
}

/** Resolve the best propagated signal for a discovery mapping card. */
export function resolvePropagatedSignalForStageMapping(input: {
  signalId: StageMappingSignalId;
  contact: Record<string, unknown>;
}): PropagatedIntelligenceSignal | null {
  const dbKeys = stageMappingRegistryDbKeys(input.signalId);
  const meta = parseProviderIntelligenceFieldMetadata(input.contact.provider_intelligence_field_metadata);

  for (const dbKey of dbKeys) {
    const parsed = parsePropagatedIntelligenceSignal(meta[dbKey]?.propagated_signal);
    if (!parsed) continue;
    const evidenceAllowed = namedEntityEvidenceBelongsToSignal(
      input.signalId,
      parsed.evidenceText,
    );
    const factsAllowed = parsed.knownFacts.filter((fact) =>
      namedEntityEvidenceBelongsToSignal(input.signalId, fact),
    );
    if (!evidenceAllowed && factsAllowed.length === 0) continue;
    if (parsed.knownFacts.length > 0 || !isGenericIntelligenceSummary(parsed.evidenceText)) {
      return {
        ...parsed,
        evidenceText: evidenceAllowed ? parsed.evidenceText : "",
        knownFacts: factsAllowed,
        namedEntities: parsed.namedEntities.filter((entity) =>
          namedEntityEvidenceBelongsToSignal(
            input.signalId,
            `${entity.name} ${entity.role ?? ""}`.trim(),
          ),
        ),
      };
    }
  }

  if (input.signalId === "scheduling_owner") {
    return reconstructSchedulingSignalFromContact({
      contact: input.contact,
      dbKeys,
      metaByKey: meta,
    });
  }

  for (const dbKey of dbKeys) {
    const evidence = sanitizeDiscoveryEvidenceQuote(meta[dbKey]?.evidence_text);
    if (!evidence || isGenericIntelligenceSummary(evidence)) continue;
    if (!namedEntityEvidenceBelongsToSignal(input.signalId, evidence)) continue;
    return {
      signalType: signalTypeForStageSignal(input.signalId),
      evidenceText: evidence,
      namedEntities: [],
      knownFacts: [evidence],
      remainingUnknowns: [],
    };
  }

  return null;
}
