import { PROVIDER_INTELLIGENCE_REQUIRED_DB_KEYS } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  intelligenceCaptureHasSignal,
  intelligenceCaptureSpecForKey,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  deriveIntelligenceSectionConfidence,
  formatIntelligenceSectionConfidenceLabel,
  planningStatusFromConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderPlanningStatus } from "@/lib/surgical-sales/providerPlanning";
import {
  fieldKeysForPlanningSection,
  normalizePlanningSectionId,
  PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS,
  PROVIDER_PLANNING_COMMERCIAL_SIGNALS_FIELD_KEYS,
  PROVIDER_PLANNING_OR_ENVIRONMENT_FIELD_KEYS,
  PROVIDER_PLANNING_OBSERVATION_READINESS_FIELD_KEYS,
  PROVIDER_PLANNING_PROFILE_SECTION_ORDER,
  PROVIDER_PLANNING_RELATIONSHIP_INTELLIGENCE_FIELD_KEYS,
  PROVIDER_PLANNING_SECTION_LABELS,
  PROVIDER_PLANNING_TAB_SECTION_ORDER,
  type ProviderPlanningSectionId,
  type ProviderPlanningTabSectionId,
} from "@/lib/surgical-sales/providerPlanningTabSections";

export type { ProviderPlanningSectionId, ProviderPlanningTabSectionId };
export {
  PROVIDER_PLANNING_PROFILE_SECTION_ORDER,
  PROVIDER_PLANNING_SECTION_LABELS,
  PROVIDER_PLANNING_TAB_SECTION_ORDER,
  normalizePlanningSectionId,
};

/** Sections that should have signal before marking intelligence complete. */
export const PROVIDER_PLANNING_REQUIRED_FOR_COMPLETE: ProviderPlanningSectionId[] = [
  "observation_readiness",
  "clinical_workflow",
];

export const PROVIDER_PLANNING_SECTION_STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
} as const;

export type ProviderPlanningSectionStatus = keyof typeof PROVIDER_PLANNING_SECTION_STATUS_LABEL;

export const PROVIDER_PLANNING_STALE_MS = 90 * 24 * 60 * 60 * 1000;
export const PROVIDER_PLANNING_RECENT_CASE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type ProviderPlanningSectionCompletion = {
  id: ProviderPlanningSectionId;
  label: string;
  status: ProviderPlanningSectionStatus;
  /** @deprecated Raw field counts — prefer confidence for UI. */
  filled: number;
  total: number;
  percent: number;
  confidence: IntelligenceSectionConfidence;
  confidence_score: number;
  confidence_progress: number;
  anchors_confirmed: boolean;
  recency_factor: number;
  attribution_factor: number;
  last_updated_at: string | null;
};

export type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

export type ProviderPlanningCompletion = {
  filled: number;
  total: number;
  percent: number;
  status: ProviderPlanningStatus;
  sections: ProviderPlanningSectionCompletion[];
  sections_complete: number;
  sections_total: number;
};

export type ProviderPlanningContext = {
  referenceCaseDate?: string | null;
  referenceCaseUpdatedAt?: string | null;
  latestCaseDate?: string | null;
};

export type ProviderOrgLinkForPlanning = {
  account_id?: string;
  is_primary_org?: boolean;
  is_active?: boolean;
  accounts?: { id?: string } | null;
};

function fieldFilled(row: Record<string, unknown>, key: string): boolean {
  const value = String(row[key] ?? "").trim();
  if (!value) return false;
  if (intelligenceCaptureSpecForKey(key)) {
    return intelligenceCaptureHasSignal(key, value);
  }
  if (key === "influence_level" || key === "preferred_contact_method") {
    return value !== "unknown";
  }
  return true;
}

function deriveSectionStatus(filled: number, total: number): ProviderPlanningSectionStatus {
  if (filled <= 0) return "not_started";
  if (filled >= total && total > 0) return "complete";
  return "in_progress";
}

function countFilledKeys(row: Record<string, unknown>, keys: readonly string[]): number {
  return keys.filter((key) => fieldFilled(row, key)).length;
}

function sectionLastUpdated(
  sectionId: ProviderPlanningTabSectionId,
  contact: Record<string, unknown>,
  filled: number,
): string | null {
  if (filled <= 0) return null;
  if (
    sectionId === "clinical_workflow" ||
    sectionId === "or_environment" ||
    sectionId === "observation_readiness"
  ) {
    return String(contact.provider_planning_updated_at || contact.updated_at || "").trim() || null;
  }
  return String(contact.updated_at || "").trim() || null;
}

export function formatPlanningSectionTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function resolvePlanningSectionId(sectionId: ProviderPlanningSectionId): ProviderPlanningTabSectionId {
  const normalized = normalizePlanningSectionId(sectionId);
  return normalized ?? "clinical_workflow";
}

export function findPlanningSection(
  planning: ProviderPlanningCompletion | null | undefined,
  sectionId: ProviderPlanningSectionId,
): ProviderPlanningSectionCompletion | undefined {
  if (!planning) return undefined;
  const normalized = resolvePlanningSectionId(sectionId);
  return planning.sections.find((s) => s.id === normalized);
}

/** @deprecated Clinical discovery removed from persistent intelligence */
export function clinicalDiscoverySectionFromPlanning(
  planning: ProviderPlanningCompletion,
): ProviderPlanningSectionCompletion | undefined {
  return findPlanningSection(planning, "clinical_workflow");
}

/** @deprecated */
export function observationPromptsSectionFromPlanning(
  planning: ProviderPlanningCompletion,
): ProviderPlanningSectionCompletion | undefined {
  return undefined;
}

export { formatIntelligenceSectionConfidenceLabel } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

export function formatPlanningSectionProgress(section: ProviderPlanningSectionCompletion): string {
  return formatIntelligenceSectionConfidenceLabel(section.confidence);
}

/** @deprecated Interaction planning is not counted on provider intelligence */
export const CLINICAL_DISCOVERY_QUESTION_TOTAL = 0;

const SECTION_FIELD_KEYS: Record<ProviderPlanningTabSectionId, readonly string[]> = {
  clinical_workflow: PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS,
  or_environment: PROVIDER_PLANNING_OR_ENVIRONMENT_FIELD_KEYS,
  relationship_intelligence: PROVIDER_PLANNING_RELATIONSHIP_INTELLIGENCE_FIELD_KEYS,
  commercial_signals: PROVIDER_PLANNING_COMMERCIAL_SIGNALS_FIELD_KEYS,
  observation_readiness: PROVIDER_PLANNING_OBSERVATION_READINESS_FIELD_KEYS,
};

export function buildProviderPlanningSections(
  contact: Record<string, unknown>,
  _orgLinks?: ProviderOrgLinkForPlanning[],
): ProviderPlanningSectionCompletion[] {
  const sectionCounts: Array<{ id: ProviderPlanningTabSectionId; filled: number; total: number }> =
    PROVIDER_PLANNING_TAB_SECTION_ORDER.map((id) => {
      const fieldKeys = SECTION_FIELD_KEYS[id];
      return {
        id,
        filled: countFilledKeys(contact, fieldKeys),
        total: fieldKeys.length,
      };
    });

  const fieldMetadata = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );

  return sectionCounts.map(({ id, filled, total }) => {
    const confidenceResult = deriveIntelligenceSectionConfidence(id, contact, { fieldMetadata });
    return {
      id,
      label: PROVIDER_PLANNING_SECTION_LABELS[id],
      status: planningStatusFromConfidence(confidenceResult.confidence),
      filled,
      total,
      percent: total > 0 ? Math.round((filled / total) * 100) : 0,
      confidence: confidenceResult.confidence,
      confidence_score: confidenceResult.confidence_score,
      confidence_progress: confidenceResult.confidence_progress,
      anchors_confirmed: confidenceResult.anchors_confirmed,
      recency_factor: confidenceResult.recency_factor,
      attribution_factor: confidenceResult.attribution_factor,
      last_updated_at: sectionLastUpdated(id, contact, filled),
    };
  });
}

function allRequiredPlanningKeysFilled(contact: Record<string, unknown>): boolean {
  return PROVIDER_INTELLIGENCE_REQUIRED_DB_KEYS.every((key) => fieldFilled(contact, key));
}

export function deriveProviderPlanningStatusFromSections(
  sections: ProviderPlanningSectionCompletion[],
  contact: Record<string, unknown>,
  context?: ProviderPlanningContext,
): ProviderPlanningStatus {
  const totalFilled = sections.reduce((sum, section) => sum + section.filled, 0);

  if (totalFilled <= 0) return "not_started";
  if (!allRequiredPlanningKeysFilled(contact)) return "in_progress";

  const planningUpdatedAt = String(contact.provider_planning_updated_at || "").trim();
  const referenceIso = String(
    context?.referenceCaseUpdatedAt || context?.referenceCaseDate || context?.latestCaseDate || "",
  ).trim();

  if (planningUpdatedAt && referenceIso) {
    const planMs = new Date(planningUpdatedAt).getTime();
    const refMs = new Date(referenceIso).getTime();
    if (Number.isFinite(planMs) && Number.isFinite(refMs) && refMs > planMs) {
      return "needs_update";
    }
  }

  if (planningUpdatedAt) {
    const planMs = new Date(planningUpdatedAt).getTime();
    if (Number.isFinite(planMs) && Date.now() - planMs > PROVIDER_PLANNING_STALE_MS) {
      const latestCase = String(context?.latestCaseDate || "").trim();
      if (latestCase) {
        const caseMs = new Date(`${latestCase.slice(0, 10)}T12:00:00Z`).getTime();
        if (Number.isFinite(caseMs) && caseMs >= Date.now() - PROVIDER_PLANNING_RECENT_CASE_WINDOW_MS) {
          return "needs_update";
        }
      }
    }
  }

  return "complete";
}

export function buildProviderPlanningCompletion(
  contact: Record<string, unknown>,
  context?: ProviderPlanningContext,
  orgLinks?: ProviderOrgLinkForPlanning[],
): ProviderPlanningCompletion {
  const sections = buildProviderPlanningSections(contact, orgLinks);
  const filled = sections.reduce((sum, section) => sum + section.filled, 0);
  const total = sections.reduce((sum, section) => sum + section.total, 0);
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  const sections_complete = sections.filter((section) => section.confidence === "validated").length;

  return {
    filled,
    total,
    percent,
    sections,
    sections_complete,
    sections_total: sections.length,
    status: deriveProviderPlanningStatusFromSections(sections, contact, context),
  };
}

/** Keys persisted via planning PATCH for a given tab section. */
export function planningPatchKeysForSection(sectionId: ProviderPlanningTabSectionId): string[] {
  return fieldKeysForPlanningSection(sectionId);
}
