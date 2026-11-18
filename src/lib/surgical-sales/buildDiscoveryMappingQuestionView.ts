/**
 * Discovery Mapping question drawer — shared read model with checklist / domain cards.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildDiscoveryIntelligenceGroupsView,
  type DiscoveryIntelligenceGroupsView,
  type DiscoveryIntelligenceSignalRow,
} from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import {
  intelligenceSectionIdForDbKey,
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceFieldWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import type { DiscoveryIntelligenceMaturity } from "@/lib/surgical-sales/discoveryIntelligenceMaturity";
import {
  discoveryMaturityStatusSlug,
} from "@/lib/surgical-sales/discoveryIntelligenceMaturity";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { STAGE_MAPPING_UI } from "@/lib/surgical-sales/stageMappingQuestions";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import {
  observationAccessConditionalDisplay,
  OBSERVATION_FEASIBILITY_DB_KEY,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { discoveryIntelligenceStatusDisplayLabel } from "@/lib/surgical-sales/discoveryIntelligenceMaturity";
import {
  isIntelligenceCaptureTokenValue,
  resolveDiscoveryCaptureLabelFallback,
  resolveDiscoveryFieldEvidence,
  sanitizeDiscoveryEvidenceQuote,
} from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import {
  buildProviderOperationalState,
  hasOperationalEvidenceForDbKey,
  operationalEvidenceForDbKey,
  sanitizeOperationalUserText,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";

const FIELD_DEF_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));

const SECTION_TO_GROUP: Partial<Record<ProviderIntelligenceSectionId, DiscoveryIntelligenceGroupId>> = {
  observation_readiness: "access_readiness",
  clinical_workflow: "clinical_fit",
  relationship_intelligence: "champion_landscape",
  commercial_signals: "champion_landscape",
  or_environment: "access_readiness",
};

const OBSERVATION_EVIDENCE_DB_KEYS = [
  "provider_observation_feasibility",
  "provider_observation_access_path",
] as const;

const SCHEDULING_EVIDENCE_DB_KEYS = [
  "provider_observation_scheduling_control",
  "provider_scheduling_contact",
  "provider_facility_scheduling_contact",
  "provider_observation_coordinator_contact",
] as const;

export type DiscoveryMappingQuestionEvidence = {
  quote: string;
  sourceLabel: string;
};

export type DiscoveryMappingQuestionConditionalWorkflow = {
  statusLabel: string;
  answer: string;
  conditionBlocker: string | null;
  nextStep: string;
};

export type DiscoveryMappingQuestionView = {
  dbKey: string;
  title: string;
  categoryChip: string;
  currentState: {
    maturityLabel: string;
    maturitySlug: string;
    summary: string;
  };
  evidence: DiscoveryMappingQuestionEvidence | null;
  conditionalWorkflow: DiscoveryMappingQuestionConditionalWorkflow | null;
  repQuestion: string | null;
  whyItMatters: string | null;
  signalRow: DiscoveryIntelligenceSignalRow | null;
};

function categoryChipForSection(sectionId: ProviderIntelligenceSectionId): string {
  const groupId = SECTION_TO_GROUP[sectionId];
  if (groupId && STAGE_MAPPING_UI.sectionLabels[groupId as keyof typeof STAGE_MAPPING_UI.sectionLabels]) {
    return STAGE_MAPPING_UI.sectionLabels[groupId as keyof typeof STAGE_MAPPING_UI.sectionLabels];
  }
  const full = PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId];
  return full.replace(/\s+readiness$/i, "").trim() || full;
}

export function findDiscoverySignalRowForDbKey(
  view: DiscoveryIntelligenceGroupsView,
  dbKey: string,
): DiscoveryIntelligenceSignalRow | null {
  for (const group of view.groups) {
    for (const row of group.rows) {
      if (row.primaryDbKey === dbKey) return row;
    }
  }
  return null;
}

function resolveEvidenceForDbKey(
  dbKey: string,
  contact: Record<string, unknown>,
  row: DiscoveryIntelligenceSignalRow | null,
): DiscoveryMappingQuestionEvidence | null {
  const dbKeys =
    dbKey === OBSERVATION_FEASIBILITY_DB_KEY || row?.signalId === "observation_approval"
      ? [...OBSERVATION_EVIDENCE_DB_KEYS]
      : row?.signalId === "scheduling_owner" || dbKey === "provider_observation_scheduling_control"
        ? [...SCHEDULING_EVIDENCE_DB_KEYS]
        : [dbKey];

  const fromMeta = resolveDiscoveryFieldEvidence({ dbKeys, contact });
  if (fromMeta) {
    return { quote: fromMeta.quote, sourceLabel: fromMeta.sourceLabel };
  }

  const snippet = sanitizeDiscoveryEvidenceQuote(row?.evidenceSnippet);
  if (snippet) {
    return {
      quote: snippet,
      sourceLabel: row?.evidenceSourceLabel?.trim() || "Field activity",
    };
  }

  return null;
}

function buildCurrentSummary(params: {
  dbKey: string;
  contact: Record<string, unknown>;
  providerId?: string;
  maturity: DiscoveryIntelligenceMaturity;
  maturityLabel: string;
  row: DiscoveryIntelligenceSignalRow | null;
  evidence: DiscoveryMappingQuestionEvidence | null;
  conditionalOverview: string | null;
}): string {
  if (params.conditionalOverview) {
    return params.conditionalOverview;
  }

  if (params.providerId) {
    const state = buildProviderOperationalState({
      providerId: params.providerId,
      contact: params.contact,
    });
    if (hasOperationalEvidenceForDbKey(state, params.dbKey)) {
      const canonical = operationalEvidenceForDbKey(state, params.dbKey);
      if (canonical?.summary) {
        return sanitizeOperationalUserText(canonical.summary);
      }
    }
  }

  if (params.evidence?.quote) {
    return params.evidence.quote;
  }

  const rowSnippet = sanitizeDiscoveryEvidenceQuote(params.row?.evidenceSnippet);
  if (rowSnippet) {
    return rowSnippet;
  }

  if (params.row?.confidenceLabel && params.maturity !== "unknown") {
    const conf = params.row.confidenceLabel.trim();
    if (!isIntelligenceCaptureTokenValue(conf)) {
      return conf;
    }
  }

  const fallback = resolveDiscoveryCaptureLabelFallback(params.dbKey, params.contact);
  if (fallback && !/\bon file$/i.test(fallback)) {
    return fallback;
  }

  const raw = String(params.contact[params.dbKey] ?? "").trim();
  if (/\bon file$/i.test(raw)) {
    return "No validated answer yet.";
  }
  if (fieldHasIntelligenceSignal(params.dbKey, raw)) {
    const cleaned = raw
      .replace(/^\[Partial lead\][^\n]*\n*/i, "")
      .replace(/\n\nStill needed:[\s\S]*$/i, "")
      .trim();
    const readable = sanitizeDiscoveryEvidenceQuote(cleaned);
    if (readable) {
      return readable.length > 220 ? `${readable.slice(0, 217)}…` : readable;
    }
  }

  if (params.maturity === "unknown") {
    return "No validated answer yet.";
  }

  return `${params.maturityLabel} — confirm on your next touch.`;
}

export function buildDiscoveryMappingQuestionView(params: {
  dbKey: string;
  contact: Record<string, unknown>;
  providerId?: string;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  discoveryView?: DiscoveryIntelligenceGroupsView | null;
}): DiscoveryMappingQuestionView | null {
  const def = FIELD_DEF_BY_KEY.get(params.dbKey);
  if (!def) return null;

  const sectionId = intelligenceSectionIdForDbKey(params.dbKey) ?? "observation_readiness";
  const view =
    params.discoveryView ??
    buildDiscoveryIntelligenceGroupsView({
      contact: params.contact,
      planning: params.planning,
      relationshipStage: params.relationshipStage,
      engagements: params.engagements,
    });

  const row = findDiscoverySignalRowForDbKey(view, params.dbKey);
  const maturity = row?.maturity ?? "unknown";
  const fieldStatus =
    row?.statusLabel ??
    (maturity === "unknown" ? DISCOVERY_FIELD_STATUS.unknown : DISCOVERY_FIELD_STATUS.captured);
  let maturityLabel =
    row?.maturityLabel ??
    discoveryIntelligenceStatusDisplayLabel({ statusLabel: fieldStatus, maturity });
  let maturitySlug = discoveryMaturityStatusSlug(maturity);

  const conditionalDisplay =
    params.dbKey === OBSERVATION_FEASIBILITY_DB_KEY
      ? observationAccessConditionalDisplay({ contact: params.contact })
      : null;

  const conditionalWorkflow = conditionalDisplay
    ? {
        statusLabel: conditionalDisplay.statusLabel,
        answer: conditionalDisplay.answer,
        conditionBlocker: conditionalDisplay.conditionBlocker,
        nextStep: conditionalDisplay.nextStep,
      }
    : null;

  if (conditionalWorkflow) {
    maturityLabel = conditionalWorkflow.statusLabel;
    maturitySlug = "captured";
  }

  const evidence = resolveEvidenceForDbKey(params.dbKey, params.contact, row);

  const summary = buildCurrentSummary({
    dbKey: params.dbKey,
    contact: params.contact,
    providerId:
      params.providerId ??
      (String(params.contact.id ?? params.contact.provider_id ?? "").trim() || undefined),
    maturity,
    maturityLabel,
    row,
    evidence,
    conditionalOverview: conditionalDisplay?.overviewSummary ?? null,
  });

  return {
    dbKey: params.dbKey,
    title: def.label,
    categoryChip: categoryChipForSection(sectionId),
    currentState: {
      maturityLabel,
      maturitySlug,
      summary,
    },
    evidence,
    conditionalWorkflow,
    repQuestion: def.helper?.trim() || null,
    whyItMatters: intelligenceFieldWhyItMatters(params.dbKey) ?? null,
    signalRow: row,
  };
}
