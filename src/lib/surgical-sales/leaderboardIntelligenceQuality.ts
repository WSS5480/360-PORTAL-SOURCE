import type { ExecutionLeaderboardMetricKey } from "@/lib/surgical-sales/executionLeaderboardConfig";
import type { RepIntelligenceDeduper } from "@/lib/surgical-sales/executionLeaderboardSafeguards";
import {
  intelligenceConfidenceMultiplier,
  normalizeIntelligenceContent,
  parseIntelligenceConfidence,
  type IntelligenceConfidenceLevel,
} from "@/lib/surgical-sales/executionLeaderboardSafeguards";
import type { ExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";
import {
  extractObservationNoteEntities,
  type ObservationNoteEntityType,
  type ObservationNoteExtraction,
  type ObservationNoteExtractedEntity,
} from "@/lib/surgical-sales/extractObservationNoteEntities";
import { observationEntityIntelligenceCategory } from "@/lib/surgical-sales/observationNoteEntityMapping";
import { isGenericObservationIntelligenceLabel } from "@/lib/surgical-sales/observationCaseIntelligenceDedup";
import { isUsableObservationEntity, observationEntityFinding } from "@/lib/surgical-sales/observationEntityAccessors";

export type LeaderboardIntelligenceUnit = {
  metric: ExecutionLeaderboardMetricKey;
  content: string;
  confidence: IntelligenceConfidenceLevel;
};

const PAIN_POINT_PATTERN =
  /\b(pain|fixation|visuali[sz]ation|difficult(y|ies)|hard to|struggl|inconsisten|clinical|tissue handling|bleeding|access)\b/i;
const WORKFLOW_FRICTION_PATTERN =
  /\b(friction|delay|turnover|setup step|extra step|workaround|inefficien|bottleneck|additional setup|circulation|handoff)\b/i;
const COMPETITOR_PATTERN =
  /\b(competitor|comp\s+rep|rival|incumbent|ethicon|medtronic|stryker|jj|johnson|covidien|intuitive|siemens|olympus)\b/i;
const PRODUCT_SIGNAL_PATTERN =
  /\b(product|implant|tray|peel[- ]?pack|acs?is|fit|interest|evaluation|trial|demo|adoption|preference card|usage)\b/i;

export function parseObservationAiExtraction(raw: unknown): ObservationNoteExtraction | null {
  if (!raw || typeof raw !== "object") return null;
  const extraction = raw as ObservationNoteExtraction;
  if (!Array.isArray(extraction.entities)) return null;
  return extraction;
}

export function observationNoteConfidenceToLevel(raw: unknown): IntelligenceConfidenceLevel {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "low") return "low";
  if (value === "medium" || value === "med") return "medium";
  if (value === "high") return "high";
  if (value === "validated" || value === "validate") return "validated";
  if (value === "confirmed" || value === "confirm") return "confirmed";
  return parseIntelligenceConfidence(raw);
}

export function qualifiesPainPointContent(content: string): boolean {
  const normalized = normalizeIntelligenceContent(content);
  if (!normalized || normalized.length < 12) return false;
  if (isGenericObservationIntelligenceLabel(content)) return false;
  return PAIN_POINT_PATTERN.test(normalized);
}

export function qualifiesWorkflowFrictionContent(content: string): boolean {
  const normalized = normalizeIntelligenceContent(content);
  if (!normalized || normalized.length < 12) return false;
  if (isGenericObservationIntelligenceLabel(content)) return false;
  return WORKFLOW_FRICTION_PATTERN.test(normalized);
}

export function qualifiesCompetitorContent(content: string): boolean {
  const normalized = normalizeIntelligenceContent(content);
  if (!normalized || normalized.length < 8) return false;
  if (isGenericObservationIntelligenceLabel(content)) return false;
  return COMPETITOR_PATTERN.test(normalized);
}

export function qualifiesProductSignalContent(content: string): boolean {
  const normalized = normalizeIntelligenceContent(content);
  if (!normalized || normalized.length < 10) return false;
  if (isGenericObservationIntelligenceLabel(content)) return false;
  return PRODUCT_SIGNAL_PATTERN.test(normalized);
}

export function observationEntityLeaderboardMetric(
  entity: Pick<ObservationNoteExtractedEntity, "type" | "value" | "finding">,
): ExecutionLeaderboardMetricKey | null {
  if (!isUsableObservationEntity(entity as ObservationNoteExtractedEntity)) return null;
  const value = observationEntityFinding(entity as ObservationNoteExtractedEntity);
  if (!value) return null;

  switch (entity.type) {
    case "clinical_pain_signal":
      return qualifiesPainPointContent(value) ? "validated_intelligence_captured" : null;
    case "workflow_friction_signal":
      return qualifiesWorkflowFrictionContent(value) ? "validated_intelligence_captured" : null;
    case "competitor_signal":
      return qualifiesCompetitorContent(value) ? "validated_intelligence_captured" : null;
    case "product_signal":
      return qualifiesProductSignalContent(value) ? "validated_intelligence_captured" : null;
    case "growth_signal":
      return qualifiesProductSignalContent(value) ? "validated_intelligence_captured" : null;
    case "workflow_signal": {
      const category = observationEntityIntelligenceCategory(entity.type, value);
      if (category === "clinical_pain_points" && qualifiesPainPointContent(value)) {
        return "validated_intelligence_captured";
      }
      if (category === "workflow_friction" && qualifiesWorkflowFrictionContent(value)) {
        return "validated_intelligence_captured";
      }
      if (category === "competitor_products" && qualifiesCompetitorContent(value)) {
        return "validated_intelligence_captured";
      }
      if (
        (category === "product_fit_signals" || category === "growth_opportunities") &&
        qualifiesProductSignalContent(value)
      ) {
        return "validated_intelligence_captured";
      }
      return null;
    }
    default:
      return null;
  }
}

export function entityQualifiesForLeaderboardScore(
  entity: Pick<ObservationNoteExtractedEntity, "type" | "value" | "finding" | "confidence">,
): boolean {
  const metric = observationEntityLeaderboardMetric(entity);
  if (!metric) return false;
  const confidence = observationNoteConfidenceToLevel(entity.confidence);
  return intelligenceConfidenceMultiplier(confidence) > 0;
}

export function collectLeaderboardUnitsFromExtraction(
  extraction: ObservationNoteExtraction | null | undefined,
): LeaderboardIntelligenceUnit[] {
  if (!extraction?.entities?.length) return [];

  const units: LeaderboardIntelligenceUnit[] = [];
  for (const entity of extraction.entities) {
    if (!entityQualifiesForLeaderboardScore(entity)) continue;
    const metric = observationEntityLeaderboardMetric(entity);
    if (!metric) continue;
    units.push({
      metric,
      content: observationEntityFinding(entity),
      confidence: observationNoteConfidenceToLevel(entity.confidence),
    });
  }
  return units;
}

export function extractLeaderboardUnitsFromText(rawText: unknown): LeaderboardIntelligenceUnit[] {
  const text = String(rawText ?? "").trim();
  if (!text) return [];
  return collectLeaderboardUnitsFromExtraction(extractObservationNoteEntities(text));
}

export function extractLeaderboardUnitsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  body?: unknown,
): LeaderboardIntelligenceUnit[] {
  const fromAi = collectLeaderboardUnitsFromExtraction(parseObservationAiExtraction(metadata?.ai_extraction));
  if (fromAi.length > 0) return fromAi;
  return extractLeaderboardUnitsFromText(body);
}

export function mergeLeaderboardIntelligenceUnits(
  ...groups: LeaderboardIntelligenceUnit[][]
): LeaderboardIntelligenceUnit[] {
  const merged: LeaderboardIntelligenceUnit[] = [];
  for (const group of groups) {
    merged.push(...group);
  }
  return merged;
}

export function scoreCaseObservationIntelligence(
  deduper: RepIntelligenceDeduper,
  caseId: string,
  sources: Array<{
    extraction?: ObservationNoteExtraction | null;
    text?: unknown;
  }>,
): Partial<Record<ExecutionLeaderboardMetricKey, number>> {
  const units = mergeLeaderboardIntelligenceUnits(
    ...sources.map((source) =>
      source.extraction
        ? collectLeaderboardUnitsFromExtraction(source.extraction)
        : extractLeaderboardUnitsFromText(source.text),
    ),
  );

  const scored = {} as Partial<Record<ExecutionLeaderboardMetricKey, number>>;
  for (const unit of units) {
    const weight = deduper.scoreObservationIntelligence({
      caseId,
      metric: "validated_intelligence_captured",
      content: unit.content,
      confidence: unit.confidence,
    });
    if (weight <= 0) continue;
    scored.validated_intelligence_captured = (scored.validated_intelligence_captured || 0) + weight;
  }
  return scored;
}

export function bumpValidatedIntelligenceUnits(args: {
  counts: ExecutionLeaderboardCounts;
  deduper: RepIntelligenceDeduper;
  bump: (counts: ExecutionLeaderboardCounts, key: ExecutionLeaderboardMetricKey, delta?: number) => void;
  metadata?: Record<string, unknown> | null;
  body?: unknown;
  caseId?: string | null;
}): void {
  const units = extractLeaderboardUnitsFromMetadata(args.metadata, args.body);
  for (const unit of units) {
    const weight = args.caseId
      ? args.deduper.scoreObservationIntelligence({
          caseId: String(args.caseId),
          metric: unit.metric,
          content: unit.content,
          confidence: unit.confidence,
        })
      : args.deduper.scoreUnique({
          metric: unit.metric,
          content: unit.content,
          confidence: unit.confidence,
        });
    if (weight > 0) args.bump(args.counts, "validated_intelligence_captured", weight);
  }
}
