/**
 * Discovery intelligence — grouped signal panels for the Provider Intelligence tab.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildDiscoveryIntelligencePriorityUnknowns } from "@/lib/surgical-sales/buildDiscoveryIntelligencePriorityUnknowns";
import type { DiscoveryIntelligencePriorityUnknown } from "@/lib/surgical-sales/buildDiscoveryIntelligencePriorityUnknowns";
import {
  buildDiscoveryIntelligenceGroupFraming,
  type DiscoveryIntelligenceGroupFraming,
} from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import {
  computeDiscoveryGroupProgress,
  computeDiscoveryIntelligenceOverallProgress,
  discoveryIntelligenceConfidenceLabel,
  type DiscoveryIntelligenceGroupId,
  type DiscoveryIntelligenceGroupProgress,
} from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  compareDiscoverySignalPriority,
  discoverySignalPriority,
  resolveDiscoverySignalCaptureConfidence,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryFieldStatusLabel,
  type DiscoverySignalPriority,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  resolveSalesPathwayStage,
  SALES_PATHWAY_STAGE_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/providerSalesPathwayExecution";
import { resolveProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  discoveryIntelligenceStatusDisplayLabel,
  resolveDiscoveryIntelligenceMaturity,
  type DiscoveryIntelligenceMaturity,
} from "@/lib/surgical-sales/discoveryIntelligenceMaturity";
import { buildDiscoveryIntelligenceRowActions } from "@/lib/surgical-sales/discoveryIntelligenceRowActions";
import { discoveryIntelligenceSignalSupportsContact } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import { formatFieldCaptureHistoryLine } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import { evidenceSnippetBelongsToDbKey } from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import { sanitizeDiscoveryEvidenceQuote } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import type { WorkflowRowAction } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";

export type DiscoveryIntelligenceSignalRow = {
  id: string;
  /** Structured signal id when row maps to a discovery signal (including open questions). */
  signalId?: DiscoveryStructuredSignalId;
  /** 1 = gate, 2 = important, 3 = strategic — calmer hierarchy in the Intelligence tab. */
  priority: DiscoverySignalPriority;
  label: string;
  statusLabel: DiscoveryFieldStatusLabel;
  maturity: DiscoveryIntelligenceMaturity;
  maturityLabel: string;
  evidenceSnippet: string | null;
  evidenceSourceLabel: string | null;
  confidenceLabel: string;
  lastUpdatedLabel: string;
  primaryDbKey: string;
  dbKeys: string[];
  sectionId?: ProviderIntelligenceSectionId;
  primaryActions: WorkflowRowAction[];
  overflowActions: WorkflowRowAction[];
  supportsContactAssignment: boolean;
};

export type { DiscoveryIntelligencePriorityUnknown } from "@/lib/surgical-sales/buildDiscoveryIntelligencePriorityUnknowns";

export type { DiscoveryIntelligenceGroupId, DiscoveryIntelligenceGroupProgress } from "@/lib/surgical-sales/discoveryIntelligenceProgress";

export type DiscoveryIntelligenceGroup = {
  id: DiscoveryIntelligenceGroupId;
  title: string;
  /** Short group question — detail in {@link framing}. */
  purpose: string;
  framing: DiscoveryIntelligenceGroupFraming;
  rows: DiscoveryIntelligenceSignalRow[];
  progress: DiscoveryIntelligenceGroupProgress;
};

export type DiscoveryIntelligenceGroupsView = {
  pathwayStageId: SalesPathwayStageId;
  pathwayStageLabel: string;
  confidenceScore: number;
  confidenceLabel: string;
  priorityUnknowns: DiscoveryIntelligencePriorityUnknown[];
  groups: DiscoveryIntelligenceGroup[];
};

type SignalSpec = {
  id: DiscoveryStructuredSignalId;
  label: string;
  dbKeys: string[];
  primaryDbKey: string;
  sectionId?: ProviderIntelligenceSectionId;
};

import { OPPORTUNITY_INTELLIGENCE_SIGNALS } from "@/lib/surgical-sales/opportunityIntelligenceSignals";

const GROUP_SPECS: Array<{
  id: DiscoveryIntelligenceGroupId;
  title: string;
  purpose: string;
  signals: SignalSpec[];
}> = [
  {
    id: "opportunity_intelligence",
    title: "Product fit intelligence",
    purpose: "What future product opportunities exist?",
    signals: OPPORTUNITY_INTELLIGENCE_SIGNALS.map((spec) => ({
      id: spec.id,
      label: spec.question.replace(/\?$/, ""),
      dbKeys: spec.dbKeys,
      primaryDbKey: spec.dbKey,
      sectionId: "commercial_signals" as const,
    })),
  },
  {
    id: "access_readiness",
    title: "Access readiness",
    purpose: "Can observation access be secured?",
    signals: [
      {
        id: "observation_approval",
        label: "Observation approval",
        dbKeys: ["provider_observation_feasibility", "provider_evaluation_openness"],
        primaryDbKey: "provider_observation_feasibility",
        sectionId: "observation_readiness",
      },
      {
        id: "scheduling_owner",
        label: "Scheduling owner",
        dbKeys: [
          "provider_scheduling_contact",
          "provider_observation_coordinator_contact",
          "provider_facility_scheduling_contact",
          "provider_observation_scheduling_control",
        ],
        primaryDbKey: "provider_scheduling_contact",
        sectionId: "observation_readiness",
      },
      {
        id: "facility_vendor_pathway",
        label: "Facility and vendor access",
        dbKeys: [
          "provider_observation_access_path",
          "provider_observation_credentialing_needed",
          "provider_credentialing_status",
        ],
        primaryDbKey: "provider_observation_access_path",
        sectionId: "observation_readiness",
      },
      {
        id: "observation_logistics",
        label: "Observation timing",
        dbKeys: [
          "provider_observation_best_days_case_types",
          "provider_ideal_observation_cases",
        ],
        primaryDbKey: "provider_observation_best_days_case_types",
        sectionId: "observation_readiness",
      },
    ],
  },
  {
    id: "clinical_fit",
    title: "Clinical fit",
    purpose: "Is this worth pursuing clinically?",
    signals: [
      {
        id: "workflow_visibility",
        label: "Procedure workflow understanding",
        dbKeys: [
          "provider_procedure_focus",
          "provider_technique_preferences",
          "provider_workflow_pain_points",
        ],
        primaryDbKey: "provider_procedure_focus",
        sectionId: "clinical_workflow",
      },
      {
        id: "product_alignment",
        label: "Product fit",
        dbKeys: [
          "provider_preference_card_signals",
          "provider_competitive_products",
          "provider_workflow_pain_points",
        ],
        primaryDbKey: "provider_preference_card_signals",
        sectionId: "commercial_signals",
      },
      {
        id: "case_opportunity",
        label: "Case opportunity",
        dbKeys: ["provider_case_volume_estimate", "provider_ideal_observation_cases"],
        primaryDbKey: "provider_case_volume_estimate",
        sectionId: "clinical_workflow",
      },
    ],
  },
  {
    id: "champion_landscape",
    title: "Champion landscape",
    purpose: "Who can help move this forward?",
    signals: [
      {
        id: "clinical_champion",
        label: "Clinical champion",
        dbKeys: ["provider_champion_potential", "provider_or_team_dynamics"],
        primaryDbKey: "provider_champion_potential",
        sectionId: "relationship_intelligence",
      },
    ],
  },
];

function lastUpdatedLabelForKeys(
  dbKeys: string[],
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): string {
  let latestMeta: ProviderIntelligenceFieldMetadataMap[string] | null = null;
  let latestMs = 0;
  for (const dbKey of dbKeys) {
    const meta = fieldMeta[dbKey];
    if (!meta?.updated_at) continue;
    const d = new Date(meta.updated_at);
    if (Number.isNaN(d.getTime())) continue;
    const ms = d.getTime();
    if (!latestMeta || ms > latestMs) {
      latestMeta = meta;
      latestMs = ms;
    }
  }
  if (!latestMeta) return "—";
  const line = formatFieldCaptureHistoryLine(latestMeta);
  return line ?? "—";
}

function primaryDbKeyForSignal(spec: SignalSpec, contact: Record<string, unknown>): string {
  for (const dbKey of spec.dbKeys) {
    if (!fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)) {
      if (!isIntelligenceFieldValidatedOnFile(dbKey, contact)) return dbKey;
    }
  }
  return spec.primaryDbKey;
}

function resolveEvidenceSnippet(
  spec: SignalSpec,
  contact: Record<string, unknown>,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): string | null {
  for (const dbKey of spec.dbKeys) {
    const quote = sanitizeDiscoveryEvidenceQuote(fieldMeta[dbKey]?.evidence_text);
    if (quote && evidenceSnippetBelongsToDbKey(dbKey, quote, spec.id)) return quote;
    const raw = contact[dbKey];
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text && sanitizeDiscoveryEvidenceQuote(text)) {
      const fromSource = text.match(/Source:\s*"([^"]+)"/i)?.[1]?.trim();
      if (fromSource && sanitizeDiscoveryEvidenceQuote(fromSource)) {
        const snippet =
          fromSource.length > 280 ? `${fromSource.slice(0, 277)}…` : fromSource;
        if (evidenceSnippetBelongsToDbKey(dbKey, snippet, spec.id)) return snippet;
      }
      if (!text.startsWith("[Partial lead]")) {
        const direct = sanitizeDiscoveryEvidenceQuote(text);
        if (direct) {
          const snippet = direct.length > 280 ? `${direct.slice(0, 277)}…` : direct;
          if (evidenceSnippetBelongsToDbKey(dbKey, snippet, spec.id)) return snippet;
        }
      }
      const narrative = text
        .replace(/^\[Partial lead\][^\n]*\n*/i, "")
        .replace(/\n\nStill needed:[\s\S]*$/i, "")
        .replace(/\n\nSource:[\s\S]*$/i, "")
        .trim();
      const cleaned = sanitizeDiscoveryEvidenceQuote(narrative);
      if (cleaned) {
        const snippet = cleaned.length > 280 ? `${cleaned.slice(0, 277)}…` : cleaned;
        if (evidenceSnippetBelongsToDbKey(dbKey, snippet, spec.id)) return snippet;
      }
    }
  }
  return null;
}

function resolveEvidenceSourceLabel(
  spec: SignalSpec,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): string | null {
  for (const dbKey of spec.dbKeys) {
    const meta = fieldMeta[dbKey];
    if (!meta?.source_label?.trim()) continue;
    const label = meta.source_label.trim();
    if (/^provider profile$/i.test(label)) continue;
    if (meta.source_type === "engagement") {
      return label.toLowerCase().includes("debrief") ? label : `${label} debrief`;
    }
    return label;
  }
  return null;
}

function buildSignalRow(
  spec: SignalSpec,
  contact: Record<string, unknown>,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): DiscoveryIntelligenceSignalRow {
  const primaryDbKey = primaryDbKeyForSignal(spec, contact);
  const fieldStatusLabel = resolveDiscoveryStructuredSignalStatus(spec.id, contact);
  const maturity = resolveDiscoveryIntelligenceMaturity({
    statusLabel: fieldStatusLabel,
    fieldMeta,
    dbKeys: spec.dbKeys,
  });
  const maturityLabel = discoveryIntelligenceStatusDisplayLabel({
    statusLabel: fieldStatusLabel,
    maturity,
  });
  const sectionId =
    spec.sectionId ?? intelligenceSectionIdForDbKey(primaryDbKey) ?? undefined;
  const { primary, overflow } = buildDiscoveryIntelligenceRowActions({
    signalId: spec.id,
    statusLabel: fieldStatusLabel,
    sectionId,
  });

  return {
    id: spec.id,
    signalId: spec.id,
    priority: discoverySignalPriority(spec.id),
    label: spec.label,
    statusLabel: fieldStatusLabel,
    maturity,
    maturityLabel,
    evidenceSnippet: resolveEvidenceSnippet(spec, contact, fieldMeta),
    evidenceSourceLabel: resolveEvidenceSourceLabel(spec, fieldMeta),
    confidenceLabel: resolveDiscoverySignalCaptureConfidence({
      signalId: spec.id,
      statusLabel: fieldStatusLabel,
      dbKeys: spec.dbKeys,
      primaryDbKey,
      contact,
      fieldMeta,
    }),
    lastUpdatedLabel: lastUpdatedLabelForKeys(spec.dbKeys, fieldMeta),
    primaryDbKey,
    dbKeys: spec.dbKeys,
    sectionId,
    primaryActions: primary,
    overflowActions: overflow,
    supportsContactAssignment: discoveryIntelligenceSignalSupportsContact(spec.id),
  };
}

function buildStructuredGroup(
  spec: (typeof GROUP_SPECS)[number],
  contact: Record<string, unknown>,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): DiscoveryIntelligenceGroup {
  const rows = spec.signals
    .map((signal) => buildSignalRow(signal, contact, fieldMeta))
    .sort((a, b) => {
      const byPriority = a.priority - b.priority;
      if (byPriority !== 0) return byPriority;
      if (a.signalId && b.signalId) {
        return compareDiscoverySignalPriority(a.signalId, b.signalId);
      }
      return 0;
    });
  const progress = computeDiscoveryGroupProgress({
    groupId: spec.id,
    signals: rows.map((row) => ({
      signalId: row.signalId as DiscoveryStructuredSignalId,
      statusLabel: row.statusLabel,
    })),
  });

  return {
    id: spec.id,
    title: spec.title,
    purpose: spec.purpose,
    framing: buildDiscoveryIntelligenceGroupFraming(rows),
    rows,
    progress,
  };
}

export function buildDiscoveryIntelligenceGroupsView(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): DiscoveryIntelligenceGroupsView {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const relationshipStage = String(
    input.relationshipStage ?? contact.provider_relationship_stage ?? "early_discovery",
  ).trim();

  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  const stageId = resolveSalesPathwayStage({
    relationshipStage,
    commercialStage,
    contact,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );

  const groups: DiscoveryIntelligenceGroup[] = GROUP_SPECS.map((spec) =>
    buildStructuredGroup(spec, contact, fieldMeta),
  );

  const priorityUnknowns = buildDiscoveryIntelligencePriorityUnknowns({ contact, max: 3 });
  const confidenceScore = computeDiscoveryIntelligenceOverallProgress(groups.map((g) => g.progress));
  const confidenceLabel = discoveryIntelligenceConfidenceLabel(confidenceScore);

  return {
    pathwayStageId: stageId,
    pathwayStageLabel: SALES_PATHWAY_STAGE_LABELS[stageId],
    confidenceScore,
    confidenceLabel,
    priorityUnknowns,
    groups,
  };
}
