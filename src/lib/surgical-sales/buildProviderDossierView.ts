/**
 * Provider Dossier — accumulated field intelligence grouped for review (not capture forms).
 */

import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import type { DiscoveryIntelligenceSignalRow } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  parseIntelligenceDomainFieldMetadata,
  resolveIntelligenceDomainTraceSource,
} from "@/lib/surgical-sales/providerIntelligenceDomainEvidence";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import {
  assessIntelligenceFieldQuality,
  INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS,
  INTELLIGENCE_SECTION_CONFIDENCE_PROGRESS,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { resolveProviderIntelligenceProgressiveState } from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import { buildProviderOverviewIntelligenceSummary } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceSummary";
import type { ProviderFieldIntelligenceEvidenceInput } from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/providerSalesPathwayExecution";

export const PROVIDER_DOSSIER_KNOWLEDGE_AREA_TOTAL = 8;

export type ProviderDossierSectionId =
  | "access"
  | "workflow"
  | "relationship"
  | "facility"
  | "procedure";

export const PROVIDER_DOSSIER_SECTION_ORDER: ProviderDossierSectionId[] = [
  "access",
  "workflow",
  "relationship",
  "facility",
  "procedure",
];

export const PROVIDER_DOSSIER_SECTION_LABELS: Record<ProviderDossierSectionId, string> = {
  access: "Access Intelligence",
  workflow: "Workflow Intelligence",
  relationship: "Relationship Intelligence",
  facility: "Facility Intelligence",
  procedure: "Procedure Intelligence",
};

export const PROVIDER_DOSSIER_SECTION_PURPOSE: Record<ProviderDossierSectionId, string> = {
  access: "Observation pathway, scheduling control, and clearance to get in the room.",
  workflow: "Clinical friction, staff pain, and how cases actually run day to day.",
  relationship: "Communication style, influence, and who moves decisions forward.",
  facility: "Site-wide OR access, credentialing, logistics, and vendor landscape.",
  procedure: "Procedure mix, technique, and volume signals for this surgeon.",
};

const F = DISCOVERY_FIELD_STATUS;

const DOSSIER_FIELD_KEYS: Record<ProviderDossierSectionId, readonly string[]> = {
  access: [
    "provider_observation_feasibility",
    "provider_evaluation_openness",
    "provider_observation_access_path",
    "provider_observation_credentialing_needed",
    "provider_credentialing_status",
    "provider_ideal_observation_cases",
    "provider_observation_cadence_preference",
    "provider_first_observation_questions",
    "provider_observation_scheduling_control",
    "provider_scheduling_contact",
    "provider_observation_coordinator_contact",
    "provider_facility_scheduling_contact",
    "provider_observation_best_days_case_types",
  ],
  workflow: [
    "provider_workflow_pain_points",
    "provider_clinical_frustrations",
    "provider_staff_frustrations",
    "provider_product_gaps",
    "provider_future_opportunity_signals",
    "provider_competitive_products",
    "provider_dissatisfaction_areas",
    "provider_preference_card_signals",
  ],
  relationship: [
    "provider_communication_style",
    "provider_responsiveness",
    "influence_level",
    "provider_decision_maker_status",
    "provider_champion_potential",
    "provider_follow_up_approach",
    "provider_or_team_dynamics",
  ],
  facility: [
    "provider_credentialing_platform_name",
    "provider_credentialing_platform_id",
    "provider_credentialing_contact",
    "provider_credentialing_approval_contact",
    "provider_credentialing_renewal_notes",
    "provider_credentialing_required_documents",
    "provider_credentialing_facility_instructions",
    "provider_support_expectations",
    "provider_facility_spd_tray_behavior",
    "provider_facility_logistics_notes",
    "provider_facility_room_turnover_patterns",
    "provider_current_vendors",
  ],
  procedure: [
    "provider_procedure_focus",
    "provider_technique_preferences",
    "provider_technique_detail",
    "provider_case_volume_estimate",
  ],
};

const DB_KEY_TO_DOSSIER = new Map<string, ProviderDossierSectionId>();
for (const sectionId of PROVIDER_DOSSIER_SECTION_ORDER) {
  for (const dbKey of DOSSIER_FIELD_KEYS[sectionId]) {
    DB_KEY_TO_DOSSIER.set(dbKey, sectionId);
  }
}

export type DossierKnowledgeCard = {
  id: string;
  label: string;
  value: string;
  sourceLabel: string | null;
  sourceKind: "engagement" | "observation" | "debrief" | "case" | "note" | null;
  capturedLabel: string | null;
};

export type DossierUnknownItem = {
  id: string;
  label: string;
  detail: string | null;
};

export type ProviderDossierSectionView = {
  id: ProviderDossierSectionId;
  title: string;
  purpose: string;
  confidence: IntelligenceSectionConfidence;
  confidenceLabel: string;
  confidenceProgress: number;
  known: DossierKnowledgeCard[];
  unknown: DossierUnknownItem[];
};

export type ProviderDossierKnowledgeCoverage = {
  capturedAreas: number;
  totalAreas: number;
  coverageLabel: string;
};

export type ProviderDossierView = {
  pageTitle: string;
  subtitle: string;
  stateId: ReturnType<typeof resolveProviderIntelligenceProgressiveState>;
  pathwayStageId: SalesPathwayStageId;
  knowledgeCoverage: ProviderDossierKnowledgeCoverage;
  sections: ProviderDossierSectionView[];
  hasAnyKnowledge: boolean;
};

export function buildProviderDossierKnowledgeCoverage(input: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
}): ProviderDossierKnowledgeCoverage {
  const summary = buildProviderOverviewIntelligenceSummary(input);
  const capturedAreas = summary.confirmed.length;
  const totalAreas = PROVIDER_DOSSIER_KNOWLEDGE_AREA_TOTAL;
  return {
    capturedAreas,
    totalAreas,
    coverageLabel: `${capturedAreas} / ${totalAreas} Areas Captured`,
  };
}

function fieldLabel(dbKey: string): string {
  const provider = PROVIDER_INTELLIGENCE_FIELD_DEFS.find((f) => f.dbKey === dbKey);
  if (provider) return provider.label;
  const org = ORGANIZATION_INTELLIGENCE_FIELD_DEFS.find((f) => f.dbKey === dbKey);
  if (org) return org.label;
  return intelligenceFieldDisplayName(dbKey);
}

function dossierSectionForDbKey(dbKey: string): ProviderDossierSectionId | null {
  return DB_KEY_TO_DOSSIER.get(dbKey) ?? null;
}

function deriveDossierSectionConfidence(
  sectionId: ProviderDossierSectionId,
  contact: Record<string, unknown>,
): {
  confidence: IntelligenceSectionConfidence;
  confidenceLabel: string;
  confidenceProgress: number;
} {
  const fieldKeys = DOSSIER_FIELD_KEYS[sectionId];
  const assessments = fieldKeys.map((key) =>
    assessIntelligenceFieldQuality(key, contact[key] as string | null | undefined),
  );
  const withSignal = assessments.filter((a) => a.hasSignal);
  const validatedCount = withSignal.filter((a) => a.depth === "validated").length;
  const structuredCount = withSignal.filter(
    (a) => a.depth === "structured" || a.depth === "validated",
  ).length;

  let confidence: IntelligenceSectionConfidence = "unknown";
  if (withSignal.length === 0) {
    confidence = "unknown";
  } else if (validatedCount >= 2 || (validatedCount >= 1 && structuredCount >= 3)) {
    confidence = "validated";
  } else if (withSignal.length >= 2 && structuredCount >= 1) {
    confidence = "confirmed";
  } else {
    confidence = "partial";
  }

  return {
    confidence,
    confidenceLabel: INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS[confidence],
    confidenceProgress: INTELLIGENCE_SECTION_CONFIDENCE_PROGRESS[confidence],
  };
}

function buildFieldKnowledgeCard(
  dbKey: string,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
): DossierKnowledgeCard | null {
  const raw = contact[dbKey];
  if (!fieldHasIntelligenceSignal(dbKey, raw as string | null | undefined)) return null;
  const rawText = String(raw ?? "").trim();

  const formatted = formatRepIntelligenceFieldValue(dbKey, rawText);
  const value = formatted?.trim() || rawText;
  if (!value) return null;

  const meta = fieldMeta[dbKey];
  const trace = resolveIntelligenceDomainTraceSource(meta);
  const capturedLabel = meta?.updated_at
    ? new Date(meta.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return {
    id: `field-${dbKey}`,
    label: fieldLabel(dbKey),
    value,
    sourceLabel: trace?.label ?? meta?.source_label?.trim() ?? null,
    sourceKind: trace?.kind ?? null,
    capturedLabel,
  };
}

function buildSignalKnowledgeCard(row: DiscoveryIntelligenceSignalRow): DossierKnowledgeCard | null {
  if (!row.evidenceSnippet?.trim()) return null;
  return {
    id: `signal-${row.id}`,
    label: row.label,
    value: row.evidenceSnippet.trim(),
    sourceLabel: row.evidenceSourceLabel,
    sourceKind: row.evidenceSourceLabel?.toLowerCase().includes("observation")
      ? "observation"
      : row.evidenceSourceLabel?.toLowerCase().includes("debrief")
        ? "debrief"
        : row.evidenceSourceLabel?.toLowerCase().includes("engagement") ||
            row.evidenceSourceLabel?.toLowerCase().includes("call")
          ? "engagement"
          : "note",
    capturedLabel: row.lastUpdatedLabel !== "—" ? row.lastUpdatedLabel : null,
  };
}

function buildUnknownFromRow(row: DiscoveryIntelligenceSignalRow): DossierUnknownItem | null {
  if (row.statusLabel === F.validated || row.statusLabel === F.captured || row.statusLabel === F.notApplicable) {
    return null;
  }
  if (row.evidenceSnippet?.trim()) return null;

  return {
    id: `unknown-${row.id}`,
    label: row.label,
    detail: row.maturityLabel !== row.statusLabel ? row.maturityLabel : null,
  };
}

function buildUnknownFromField(dbKey: string, contact: Record<string, unknown>): DossierUnknownItem | null {
  const raw = contact[dbKey];
  if (fieldHasIntelligenceSignal(dbKey, raw as string | null | undefined)) return null;
  return {
    id: `unknown-field-${dbKey}`,
    label: fieldLabel(dbKey),
    detail: null,
  };
}

function buildDossierSection(
  sectionId: ProviderDossierSectionId,
  input: {
    contact: Record<string, unknown>;
    rows: DiscoveryIntelligenceSignalRow[];
  },
): ProviderDossierSectionView {
  const fieldMeta = parseIntelligenceDomainFieldMetadata(input.contact);
  const fieldKeys = DOSSIER_FIELD_KEYS[sectionId];
  const sectionRows = input.rows.filter((row) =>
    row.dbKeys.some((dbKey) => dossierSectionForDbKey(dbKey) === sectionId),
  );

  const knownById = new Map<string, DossierKnowledgeCard>();

  for (const dbKey of fieldKeys) {
    const card = buildFieldKnowledgeCard(dbKey, input.contact, fieldMeta);
    if (card) knownById.set(card.id, card);
  }

  for (const row of sectionRows) {
    const card = buildSignalKnowledgeCard(row);
    if (card) knownById.set(card.id, card);
  }

  const unknownById = new Map<string, DossierUnknownItem>();
  for (const dbKey of fieldKeys) {
    const item = buildUnknownFromField(dbKey, input.contact);
    if (item) unknownById.set(item.id, item);
  }
  for (const row of sectionRows) {
    const item = buildUnknownFromRow(row);
    if (item) unknownById.set(item.id, item);
  }

  const { confidence, confidenceLabel, confidenceProgress } = deriveDossierSectionConfidence(
    sectionId,
    input.contact,
  );

  return {
    id: sectionId,
    title: PROVIDER_DOSSIER_SECTION_LABELS[sectionId],
    purpose: PROVIDER_DOSSIER_SECTION_PURPOSE[sectionId],
    confidence,
    confidenceLabel,
    confidenceProgress,
    known: [...knownById.values()],
    unknown: [...unknownById.values()],
  };
}

export function buildProviderDossierView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  relatedContacts?: Array<Record<string, unknown>>;
}): ProviderDossierView {
  const evidenceInput: ProviderFieldIntelligenceEvidenceInput = {
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
  };

  const groupsView = buildDiscoveryIntelligenceGroupsView({
    contact: input.contact,
    planning: input.planning,
    relationshipStage: input.relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const allRows = groupsView.groups.flatMap((group) => group.rows);
  const sections = PROVIDER_DOSSIER_SECTION_ORDER.map((sectionId) =>
    buildDossierSection(sectionId, { contact: input.contact, rows: allRows }),
  );

  const hasAnyKnowledge = sections.some((section) => section.known.length > 0);
  const knowledgeCoverage = buildProviderDossierKnowledgeCoverage({
    contact: input.contact,
    relatedContacts: input.relatedContacts,
  });

  return {
    pageTitle: "Provider Intelligence",
    subtitle: "Accumulated field intelligence — review what the team has learned.",
    stateId: resolveProviderIntelligenceProgressiveState(evidenceInput),
    pathwayStageId: groupsView.pathwayStageId,
    knowledgeCoverage,
    sections,
    hasAnyKnowledge,
  };
}

/** Resolve dossier section for a planning / intelligence db key (tests, deep links). */
export function providerDossierSectionForDbKey(dbKey: string): ProviderDossierSectionId | null {
  return dossierSectionForDbKey(dbKey);
}

/** @internal — field defs for dossier section (documentation / tests). */
export function dossierFieldKeysForSection(sectionId: ProviderDossierSectionId): readonly string[] {
  return DOSSIER_FIELD_KEYS[sectionId];
}
