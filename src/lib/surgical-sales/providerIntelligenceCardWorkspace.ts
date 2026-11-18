/**
 * Action-oriented intelligence card workspace — capture targets, validation, notes, follow-up.
 */

import {
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  buildIntelligenceCapturePriorities,
  fieldHasIntelligenceSignal,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  assessIntelligenceFieldQuality,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { resolveIntelligenceFieldLifecycle } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { intelligenceCaptureSpecForKey } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { IntelligenceStatusCardId } from "@/lib/surgical-sales/providerIntelligenceStatusCards";

export type IntelligenceCardActionId =
  | "capture"
  | "validate"
  | "note"
  | "open_area"
  | "follow_up";

export type IntelligenceCardWorkspace = {
  sectionId: ProviderIntelligenceSectionId;
  captureDbKey: string | null;
  noteDbKey: string | null;
  validateDbKeys: string[];
  canMarkValidated: boolean;
  canAddNote: boolean;
  followUpEngagementType: "follow_up";
};

const STATUS_CARD_SECTION: Record<IntelligenceStatusCardId, ProviderIntelligenceSectionId> = {
  observation_pathway: "observation_readiness",
  workflow_understanding: "clinical_workflow",
  commercial_influence: "or_environment",
  relationship_confidence: "relationship_intelligence",
};

function fieldSupportsNotes(dbKey: string): boolean {
  const spec = intelligenceCaptureSpecForKey(dbKey);
  if (!spec) return false;
  return spec.input === "chips_plus_notes" || spec.input === "segmented_plus_notes";
}

function noteFieldForSection(sectionId: ProviderIntelligenceSectionId): string | null {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  return keys.find((k) => fieldSupportsNotes(k)) ?? keys[0] ?? null;
}

function primaryCaptureDbKey(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
): string | null {
  const gap = buildIntelligenceLearningGaps(contact, planning, 8).find((g) => g.sectionId === sectionId);
  if (gap) return gap.dbKey;
  const priority = buildIntelligenceCapturePriorities(contact, planning, 6).find(
    (p) => p.sectionId === sectionId,
  );
  return priority?.dbKey ?? null;
}

export function fieldsEligibleForValidation(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): string[] {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  const candidates: Array<{ dbKey: string; priority: number }> = [];
  for (const dbKey of keys) {
    const raw = contact[dbKey] as string | null | undefined;
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const meta = fieldMetadata?.[dbKey];
    const lifecycle = resolveIntelligenceFieldLifecycle(dbKey, raw, meta);
    const assessment = assessIntelligenceFieldQuality(dbKey, raw);
    if (assessment.depth === "none") continue;

    if (lifecycle?.state === "outdated" || lifecycle?.needsRefresh) {
      candidates.push({ dbKey, priority: lifecycle.revalidationPriority + 20 });
      continue;
    }
    if (meta?.validated_at?.trim() && lifecycle?.state === "validated") continue;
    candidates.push({
      dbKey,
      priority: lifecycle?.state === "assumed" ? 16 : 8,
    });
  }
  return candidates
    .sort((a, b) => b.priority - a.priority)
    .map((c) => c.dbKey);
}

export function buildIntelligenceSectionCardWorkspace(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): IntelligenceCardWorkspace {
  const captureDbKey = primaryCaptureDbKey(sectionId, contact, planning);
  const validateDbKeys = fieldsEligibleForValidation(sectionId, contact, fieldMetadata);
  const noteDbKey = noteFieldForSection(sectionId);

  return {
    sectionId,
    captureDbKey,
    noteDbKey,
    validateDbKeys,
    canMarkValidated: validateDbKeys.length > 0,
    canAddNote: Boolean(noteDbKey),
    followUpEngagementType: "follow_up",
  };
}

export function buildIntelligenceStatusCardWorkspace(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  targetDbKey?: string | null,
): IntelligenceCardWorkspace {
  const sectionId = STATUS_CARD_SECTION[cardId];
  const base = buildIntelligenceSectionCardWorkspace(sectionId, contact, planning, fieldMetadata);
  if (targetDbKey && (PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? []).includes(targetDbKey)) {
    return { ...base, captureDbKey: targetDbKey };
  }
  return base;
}

export function buildProviderFollowUpEngagementHref(
  providerId: string,
  accountId?: string | null,
  engagementType = "follow_up",
): string {
  const p = new URLSearchParams({ provider_id: providerId, engagement_type: engagementType });
  if (accountId?.trim()) p.set("organization_id", accountId.trim());
  return `/portal/sales/engagements/new?${p.toString()}`;
}
