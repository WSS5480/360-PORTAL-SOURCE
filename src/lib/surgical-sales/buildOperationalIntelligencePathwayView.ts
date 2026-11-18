/**
 * Operational Intelligence — pathway advancement view (not a field encyclopedia).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { intelligenceFieldWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { providerOperationalConsequenceForField } from "@/lib/surgical-sales/providerOperationalImpact";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildProviderDiscoveryStageProgression,
  type DiscoveryReadinessRowStatus,
} from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  buildSalesPathwayRequirements,
  resolveSalesPathwayStage,
  salesPathwayProgressPercent,
  SALES_PATHWAY_STAGE_LABELS,
  type SalesPathwayRequirement,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/providerSalesPathwayExecution";
import {
  pathwayStageHardGateBlockers,
} from "@/lib/surgical-sales/pathway/pathwayProgressionPolicy";
import { resolveProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { MISSION_DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import { sanitizeOverviewDisplayText } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

export type PathwayIntelItemStatus = "validated" | "confirmed" | "not_validated" | "unknown";

export type PathwayIntelConfidence = "high" | "moderate" | "low" | "none";

export type PathwayIntelligenceItem = {
  id: string;
  requirementLabel: string;
  status: PathwayIntelItemStatus;
  statusLabel: string;
  confidence: PathwayIntelConfidence;
  confidenceLabel: string;
  whyItMatters: string;
  knownEvidence: string | null;
  stillNeeded: string | null;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
  sourceEngagement: string | null;
};

export type OperationalIntelligencePathwayView = {
  pathwayStageId: SalesPathwayStageId;
  pathwayStageLabel: string;
  confidenceScore: number;
  confidenceLabel: string;
  requirementsToAdvance: PathwayIntelligenceItem[];
  knownBlockers: PathwayIntelligenceItem[];
  confirmedLearnings: PathwayIntelligenceItem[];
  unknowns: PathwayIntelligenceItem[];
};

const STATUS_LABELS: Record<PathwayIntelItemStatus, string> = {
  validated: MISSION_DISCOVERY_FIELD_STATUS.validated,
  confirmed: MISSION_DISCOVERY_FIELD_STATUS.captured,
  not_validated: MISSION_DISCOVERY_FIELD_STATUS.conditional,
  unknown: MISSION_DISCOVERY_FIELD_STATUS.unknown,
};

const CONFIDENCE_LABELS: Record<PathwayIntelConfidence, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
  none: "None",
};

const LABEL_DB_HINTS: Array<{ pattern: RegExp; dbKey: string }> = [
  { pattern: /or access|observation allow|observation approval|observation feasible/i, dbKey: "provider_observation_feasibility" },
  { pattern: /credentialing/i, dbKey: "provider_observation_credentialing_needed" },
  { pattern: /coordinator|schedul/i, dbKey: "provider_observation_coordinator_contact" },
  { pattern: /procedure|workflow fit/i, dbKey: "provider_procedure_focus" },
  { pattern: /modality|technique|preference/i, dbKey: "provider_technique_preferences" },
  { pattern: /trial|evaluation|willingness/i, dbKey: "provider_evaluation_openness" },
  { pattern: /competitive|vendor/i, dbKey: "provider_competitive_products" },
  { pattern: /decision|champion/i, dbKey: "provider_champion_potential" },
  { pattern: /preference.?card/i, dbKey: "provider_preference_card_signals" },
];

const STAGE_WHY_DEFAULT: Record<SalesPathwayStageId, string> = {
  discovery:
    "Discovery advances when observation approval is validated on file — not when optional access mapping is complete.",
  observe: "Observation stage advances when the five-observation sequence is complete.",
  debrief: "Debrief advances when the debrief is complete and product fit is validated on file.",
  evaluation: "Evaluation advances when a structured evaluation activity is completed on file.",
  commitment: "Commitment advances when the committed case target is met.",
  outcomes: "Outcomes stage tracks adoption and repeat use — intelligence depth improves visibility only.",
};

function resolveDbKey(req: SalesPathwayRequirement): string | undefined {
  if (req.dbKey) return req.dbKey;
  const label = req.label.toLowerCase();
  for (const hint of LABEL_DB_HINTS) {
    if (hint.pattern.test(label)) return hint.dbKey;
  }
  return undefined;
}

function firstSentence(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const sentence = (t.split(/(?<=[.!?])\s+/)[0] || t).trim();
  return scanLine(sentence.endsWith(".") ? sentence : `${sentence}.`, max);
}

function formatEvidence(contact: Record<string, unknown>, dbKey: string): string | null {
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw) return null;
  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  const line = chip || raw;
  const formatted = firstSentence(line);
  if (!formatted) return null;
  return formatted.startsWith('"') ? formatted : `"${formatted.replace(/\.$/, "")}."`;
}

function sourceEngagementLabel(
  meta: ProviderIntelligenceFieldMetadataMap[string] | undefined,
  engagements: ProviderEngagementSummary[],
): string | null {
  if (!meta) return null;
  const label = meta.source_label?.trim();
  if (label && !/^profile$/i.test(label)) return scanLine(label, 48);
  const engId = meta.source_engagement_id?.trim();
  if (engId) {
    const eng = engagements.find((e) => e.id === engId);
    if (eng) {
      const title = eng.title?.trim() || eng.engagement_type_label || "Engagement";
      return scanLine(title, 48);
    }
  }
  if (/intro call/i.test(meta.source_type)) return "Intro call";
  if (/observation/i.test(meta.source_type)) return "Observation";
  if (/case/i.test(meta.source_type)) return "Case day";
  return null;
}

function resolveFieldStatus(
  contact: Record<string, unknown>,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
  dbKey: string,
  requirementMet: boolean,
): { status: PathwayIntelItemStatus; confidence: PathwayIntelConfidence } {
  const meta = fieldMeta[dbKey];
  const raw = contact[dbKey];
  const hasSignal = fieldHasIntelligenceSignal(dbKey, raw as string | null | undefined);

  if (meta?.lifecycle_state === "validated" || meta?.validated_at) {
    return { status: "validated", confidence: "high" };
  }
  if (requirementMet && hasSignal) {
    return { status: "confirmed", confidence: "moderate" };
  }
  if (!hasSignal) {
    return { status: "unknown", confidence: "none" };
  }

  const quality = assessIntelligenceFieldQuality(dbKey, String(raw ?? ""));
  if (quality.depth === "validated" || quality.depth === "structured") {
    return { status: "not_validated", confidence: "moderate" };
  }
  if (quality.depth === "weak") {
    return { status: "not_validated", confidence: "low" };
  }
  return { status: "unknown", confidence: "none" };
}

function whyItMattersFor(dbKey: string | undefined, sectionId: ProviderIntelligenceSectionId | undefined, stageId: SalesPathwayStageId): string {
  if (dbKey) {
    const fieldWhy = intelligenceFieldWhyItMatters(dbKey);
    if (fieldWhy) return scanLine(fieldWhy, 140);
    const consequence = providerOperationalConsequenceForField(dbKey);
    return scanLine(consequence.summary, 140);
  }
  return STAGE_WHY_DEFAULT[stageId];
}

function buildRequirementItem(
  req: SalesPathwayRequirement,
  input: {
    contact: Record<string, unknown>;
    fieldMeta: ProviderIntelligenceFieldMetadataMap;
    engagements: ProviderEngagementSummary[];
    gapsByKey: Map<string, string>;
    stageId: SalesPathwayStageId;
  },
): PathwayIntelligenceItem {
  const dbKey = resolveDbKey(req);
  const sectionId =
    req.sectionId ??
    (dbKey ? intelligenceSectionIdForDbKey(dbKey) ?? undefined : undefined);

  if (!dbKey) {
    return {
      id: `req:${req.label}`,
      requirementLabel: req.label,
      status: req.met ? "confirmed" : "unknown",
      statusLabel: req.met ? STATUS_LABELS.confirmed : STATUS_LABELS.unknown,
      confidence: req.met ? "moderate" : "none",
      confidenceLabel: req.met ? CONFIDENCE_LABELS.moderate : CONFIDENCE_LABELS.none,
      whyItMatters: whyItMattersFor(undefined, sectionId, input.stageId),
      knownEvidence: null,
      stillNeeded: req.met ? null : scanLine(`Confirm: ${req.label}`, 72),
      sectionId,
      sourceEngagement: null,
    };
  }

  const { status, confidence } = resolveFieldStatus(input.contact, input.fieldMeta, dbKey, req.met);
  const evidence = status === "validated" || status === "confirmed" ? formatEvidence(input.contact, dbKey) : null;
  const gapPhrase = input.gapsByKey.get(dbKey);
  const stillNeeded =
    status === "validated"
      ? null
      : scanLine(gapPhrase ?? `Official ${req.label.toLowerCase()} on file.`, 96);

  return {
    id: `req:${dbKey}`,
    requirementLabel: req.label,
    status,
    statusLabel: STATUS_LABELS[status],
    confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence],
    whyItMatters: whyItMattersFor(dbKey, sectionId, input.stageId),
    knownEvidence: evidence,
    stillNeeded,
    dbKey,
    sectionId,
    sourceEngagement: sourceEngagementLabel(input.fieldMeta[dbKey], input.engagements),
  };
}

function compactBlockerItem(
  label: string,
  dbKey: string | undefined,
  sectionId: ProviderIntelligenceSectionId | undefined,
  stageId: SalesPathwayStageId,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
  engagements: ProviderEngagementSummary[],
): PathwayIntelligenceItem {
  return {
    id: `blocker:${dbKey ?? label}`,
    requirementLabel: sanitizeOverviewDisplayText(label) || label,
    status: "not_validated",
    statusLabel: STATUS_LABELS.not_validated,
    confidence: "low",
    confidenceLabel: CONFIDENCE_LABELS.low,
    whyItMatters: dbKey ? whyItMattersFor(dbKey, sectionId, stageId) : STAGE_WHY_DEFAULT[stageId],
    knownEvidence: null,
    stillNeeded: scanLine(`Resolve: ${label}`, 72),
    dbKey,
    sectionId,
    sourceEngagement: dbKey ? sourceEngagementLabel(fieldMeta[dbKey], engagements) : null,
  };
}

export function buildOperationalIntelligencePathwayView(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): OperationalIntelligencePathwayView {
  const relationshipStage = String(
    input.relationshipStage ?? input.contact.provider_relationship_stage ?? "early_discovery",
  ).trim();

  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  const stageId = resolveSalesPathwayStage({
    contact: input.contact,
    relationshipStage,
    commercialStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const fieldMeta = parseProviderIntelligenceFieldMetadata(input.contact);
  const engagements = input.engagements ?? [];

  const gaps = buildIntelligenceLearningGaps(input.contact, input.planning, 24);
  const gapsByKey = new Map(gaps.map((g) => [g.dbKey, g.phrase]));

  const discoveryProgression =
    stageId === "discovery"
      ? buildProviderDiscoveryStageProgression({
          contact: input.contact,
          planning: input.planning,
          engagements,
          relationshipStage,
          opportunities: input.opportunities,
          cases: input.cases,
        })
      : null;

  const requirements = buildSalesPathwayRequirements({
    contact: input.contact,
    planning: input.planning,
    relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  function readinessToPathwayStatus(status: DiscoveryReadinessRowStatus): PathwayIntelItemStatus {
    if (status === "complete") return "validated";
    if (status === "partial") return "confirmed";
    if (status === "blocked") return "not_validated";
    return "unknown";
  }

  const requirementsToAdvance = requirements.map((req) =>
    buildRequirementItem(req, {
      contact: input.contact,
      fieldMeta,
      engagements,
      gapsByKey,
      stageId,
    }),
  );

  const optionalExecutionIntel =
    stageId === "discovery" && discoveryProgression
      ? discoveryProgression.observationReadiness.map((row) => {
          const status = readinessToPathwayStatus(row.status);
          const req: SalesPathwayRequirement = {
            label: row.label,
            met: row.status === "complete",
            dbKey: row.dbKey,
            sectionId: row.sectionId,
          };
          const item = buildRequirementItem(req, {
            contact: input.contact,
            fieldMeta,
            engagements,
            gapsByKey,
            stageId,
          });
          return { ...item, status, statusLabel: STATUS_LABELS[status] };
        })
      : [];

  const confirmedLearnings = requirementsToAdvance
    .filter((r) => r.status === "validated" || r.status === "confirmed")
    .slice(0, 6);

  const unknowns = [
    ...requirementsToAdvance.filter((r) => r.status === "unknown"),
    ...optionalExecutionIntel.filter((r) => r.status === "unknown" || r.status === "not_validated"),
  ].slice(0, 6);

  const hardGateBlockers = pathwayStageHardGateBlockers(stageId, {
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  }).map((blocker) =>
    compactBlockerItem(
      blocker.label,
      undefined,
      undefined,
      stageId,
      fieldMeta,
      engagements,
    ),
  );

  const knownBlockers = hardGateBlockers.slice(0, 6);

  const progress =
    discoveryProgression?.progressPercent ??
    salesPathwayProgressPercent({ requirements });
  let confidenceLabel = "Early";
  if (progress >= 85) confidenceLabel = "Strong";
  else if (progress >= 55) confidenceLabel = "Developing";
  else if (progress >= 25) confidenceLabel = "Partial";

  return {
    pathwayStageId: stageId,
    pathwayStageLabel: SALES_PATHWAY_STAGE_LABELS[stageId],
    confidenceScore: progress,
    confidenceLabel,
    requirementsToAdvance,
    knownBlockers,
    confirmedLearnings,
    unknowns,
  };
}
