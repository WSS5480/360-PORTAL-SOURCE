/**
 * Intelligence capture category workspace — focused read model per category.
 */

import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import { buildCategoryFindingsFeed } from "@/lib/surgical-sales/intelligenceCapture/buildCategoryFindingsFeed";
import {
  intelligenceCaptureCategoryDef,
  type IntelligenceCaptureCategoryId,
  type IntelligenceCaptureCategorySlice,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { SCHEDULING_OWNER_FIELD_DB_KEYS } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import { stageMappingRegistryDbKeys } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import {
  formatCategoryFindingsStat,
  formatCategoryOpenItemsStat,
  INTELLIGENCE_CAPTURE_CATEGORY_STATUS_UI,
  resolveIntelligenceCaptureCategoryStatus,
  type IntelligenceCaptureCategoryStatusId,
} from "@/lib/surgical-sales/intelligenceCapture/resolveIntelligenceCaptureCategoryStatus";
import {
  REP_INTELLIGENCE_VOCAB,
  repSafeProgressLabel,
} from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";

export const INTELLIGENCE_CAPTURE_WORKSPACE_UI = {
  progressSuffix: REP_INTELLIGENCE_VOCAB.progress,
  findingsCaptured: "Findings",
  openQuestions: REP_INTELLIGENCE_VOCAB.stillExploring,
  confirmed: REP_INTELLIGENCE_VOCAB.captured,
  confirmedFindings: "Findings",
  openQuestionsTitle: REP_INTELLIGENCE_VOCAB.stillExploring,
  relatedContacts: REP_INTELLIGENCE_VOCAB.relatedContacts,
  supportingEvidence: REP_INTELLIGENCE_VOCAB.supportingEvidence,
  recentUpdates: "Recent updates",
  validateOne: REP_INTELLIGENCE_VOCAB.addDetails,
  noConfirmedFindings: `${REP_INTELLIGENCE_VOCAB.noCapturedYet} Capture what you learn above.`,
  noOpenQuestions: REP_INTELLIGENCE_VOCAB.nothingToExplore,
  noRelatedContacts: "No related contacts linked yet.",
  noSupportingEvidence: "No supporting evidence captured yet.",
  noRecentUpdates: "No recent updates in this area.",
  emptySection: REP_INTELLIGENCE_VOCAB.noCapturedYet,
} as const;

const CATEGORY_CONTACT_DB_KEYS: Record<IntelligenceCaptureCategoryId, readonly string[]> = {
  observation_access: [],
  access_pathway: [...SCHEDULING_OWNER_FIELD_DB_KEYS],
  credentialing_facility: [
    "provider_credentialing_contact",
    "provider_observation_access_path",
    "provider_credentialing_platform_name",
  ],
  key_people_influence: [
    "provider_champion_potential",
    "provider_or_team_dynamics",
    "provider_decision_maker_status",
    "influence_level",
  ],
  clinical_focus: ["provider_procedure_focus", "provider_technique_preferences", "provider_strategic_goal"],
  opportunity_signals: [
    "provider_future_opportunity_signals",
    "provider_competitive_products",
    "provider_current_vendors",
    "provider_product_gaps",
  ],
  procedure_workflow: [
    "provider_workflow_pain_points",
    "provider_observation_best_days_case_types",
    "provider_technique_preferences",
    "provider_or_team_dynamics",
  ],
  clinical_challenges: [
    "provider_staff_frustrations",
    "provider_clinical_frustrations",
    "provider_dissatisfaction_areas",
  ],
  product_fit_evaluation: [
    "provider_preference_card_signals",
    "provider_competitive_products",
    "provider_workflow_pain_points",
  ],
  adoption_strategy: ["provider_case_volume_estimate", "provider_champion_potential", "provider_ideal_observation_cases"],
};

function formatRelativeUpdate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recently";
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 14) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function categoryDbKeys(categoryId: IntelligenceCaptureCategoryId): Set<string> {
  const def = intelligenceCaptureCategoryDef(categoryId);
  const keys = new Set<string>(CATEGORY_CONTACT_DB_KEYS[categoryId]);
  for (const signalId of def.signalIds) {
    for (const key of stageMappingRegistryDbKeys(signalId as StageMappingSignalId)) {
      keys.add(key);
    }
  }
  return keys;
}

export type CategoryWorkspaceProgress = {
  label: string;
  status: IntelligenceCaptureCategoryStatusId;
  statusLabel: string;
  statusCssModifier: string;
  findingsCaptured: number;
  openQuestions: number;
  confirmed: number;
  findingsLabel: string;
  openItemsLabel: string;
};

export type CategoryWorkspaceConfirmedFinding = {
  id: string;
  summary: string;
  capturedLabel: string;
};

export type CategoryWorkspaceOpenQuestion = {
  signalId: string;
  question: string;
  statusLabel: string;
};

export type CategoryWorkspaceContact = {
  id: string;
  name: string;
  context: string | null;
};

export type CategoryWorkspaceEvidence = {
  id: string;
  quote: string;
  interpretation: string | null;
  capturedLabel: string;
};

export type CategoryWorkspaceUpdate = {
  id: string;
  summary: string;
  capturedLabel: string;
  sourceLabel: string | null;
};

export type IntelligenceCaptureCategoryWorkspaceView = {
  categoryId: IntelligenceCaptureCategoryId;
  name: string;
  description: string;
  progress: CategoryWorkspaceProgress;
  confirmedFindings: CategoryWorkspaceConfirmedFinding[];
  openQuestions: CategoryWorkspaceOpenQuestion[];
  relatedContacts: CategoryWorkspaceContact[];
  supportingEvidence: CategoryWorkspaceEvidence[];
  recentUpdates: CategoryWorkspaceUpdate[];
};

function humanFieldSummary(dbKey: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const firstLine = trimmed.split(/\n/)[0]?.trim() ?? trimmed;
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
}

function isContactLikeValue(value: string): boolean {
  const t = value.trim();
  if (!t || t.toLowerCase() === "unknown") return false;
  if (/^[0-9a-f-]{36}$/i.test(t)) return false;
  return /[A-Za-z]{2,}/.test(t);
}

export function buildIntelligenceCaptureCategoryWorkspace(input: {
  categoryId: IntelligenceCaptureCategoryId;
  contact: Record<string, unknown>;
  slice: IntelligenceCaptureCategorySlice;
}): IntelligenceCaptureCategoryWorkspaceView {
  const def = intelligenceCaptureCategoryDef(input.categoryId);
  const meta = parseProviderIntelligenceFieldMetadata(input.contact.provider_intelligence_field_metadata);
  const dbKeys = categoryDbKeys(input.categoryId);

  const findingsFeed = buildCategoryFindingsFeed({
    categoryId: input.categoryId,
    contact: input.contact,
    limit: 24,
  });

  const openQuestionRows = [...input.slice.open, ...input.slice.laterStage];
  const confirmedQuestionRows = input.slice.confirmed;

  const findingsCaptured = findingsFeed.length;
  const openQuestions = openQuestionRows.length;
  const confirmed = confirmedQuestionRows.length;
  const status = resolveIntelligenceCaptureCategoryStatus({
    findingsCount: findingsCaptured,
    openCount: openQuestions,
    confirmedCount: confirmed,
  });
  const statusUi = INTELLIGENCE_CAPTURE_CATEGORY_STATUS_UI[status];

  const confirmedFindings: CategoryWorkspaceConfirmedFinding[] = [];

  for (const question of confirmedQuestionRows) {
    const keys = stageMappingRegistryDbKeys(question.signalId as StageMappingSignalId);
    const primaryKey = keys[0];
    const value = primaryKey ? String(input.contact[primaryKey] ?? "").trim() : "";
    const interpretation =
      (primaryKey && meta[primaryKey]?.discovery_mapping?.interpretation?.trim()) ||
      humanFieldSummary(primaryKey ?? question.signalId, value) ||
      question.maturityLabel;
    if (!interpretation) continue;
    confirmedFindings.push({
      id: `confirmed-q-${question.signalId}`,
      summary: interpretation,
      capturedLabel: question.maturityLabel,
    });
  }

  for (const dbKey of dbKeys) {
    const entry = meta[dbKey];
    if (!entry?.validated_at && entry?.lifecycle_state !== "validated") continue;
    const interpretation = entry.discovery_mapping?.interpretation?.trim();
    const value = String(input.contact[dbKey] ?? "").trim();
    const summary = interpretation || humanFieldSummary(dbKey, value);
    if (!summary || !fieldHasIntelligenceSignal(dbKey, value)) continue;
    confirmedFindings.push({
      id: `confirmed-meta-${dbKey}`,
      summary,
      capturedLabel: entry.validated_at
        ? formatRelativeUpdate(entry.validated_at)
        : REP_INTELLIGENCE_VOCAB.captured,
    });
  }

  const seenConfirmed = new Set<string>();
  const uniqueConfirmed = confirmedFindings.filter((row) => {
    const key = row.summary.toLowerCase();
    if (seenConfirmed.has(key)) return false;
    seenConfirmed.add(key);
    return true;
  });

  const openQuestionList: CategoryWorkspaceOpenQuestion[] = openQuestionRows.map((q) => ({
    signalId: q.signalId,
    question: q.question,
    statusLabel: repSafeProgressLabel(q.maturityLabel || q.statusLabel),
  }));

  const relatedContacts: CategoryWorkspaceContact[] = [];
  const contactKeys = CATEGORY_CONTACT_DB_KEYS[input.categoryId];
  for (const dbKey of contactKeys) {
    const value = String(input.contact[dbKey] ?? "").trim();
    if (!isContactLikeValue(value)) continue;
    relatedContacts.push({
      id: dbKey,
      name: value.split(/[—–-]/)[0]?.trim() || value,
      context: value.includes("—") || value.includes(" - ") ? value : null,
    });
  }

  const supportingEvidence: CategoryWorkspaceEvidence[] = [];
  for (const dbKey of dbKeys) {
    const entry = meta[dbKey];
    const quote = entry?.discovery_mapping?.evidence_text?.trim() || entry?.evidence_text?.trim();
    if (!quote) continue;
    supportingEvidence.push({
      id: `evidence-${dbKey}`,
      quote,
      interpretation: entry.discovery_mapping?.interpretation?.trim() ?? null,
      capturedLabel: entry.updated_at ? formatRelativeUpdate(entry.updated_at) : "Recently",
    });
  }

  const seenEvidence = new Set<string>();
  const uniqueEvidence = supportingEvidence.filter((row) => {
    const key = row.quote.toLowerCase();
    if (seenEvidence.has(key)) return false;
    seenEvidence.add(key);
    return true;
  });

  const recentUpdatesRaw: Array<CategoryWorkspaceUpdate & { sortIso: string }> = [];
  for (const dbKey of dbKeys) {
    const entry = meta[dbKey];
    if (!entry?.updated_at) continue;
    const interpretation = entry.discovery_mapping?.interpretation?.trim();
    const value = String(input.contact[dbKey] ?? "").trim();
    const summary = interpretation || humanFieldSummary(dbKey, value);
    if (!summary) continue;
    recentUpdatesRaw.push({
      id: `update-${dbKey}`,
      summary,
      capturedLabel: formatRelativeUpdate(entry.updated_at),
      sourceLabel: entry.source_label?.trim() || null,
      sortIso: entry.updated_at,
    });
  }

  recentUpdatesRaw.sort((a, b) => new Date(b.sortIso).getTime() - new Date(a.sortIso).getTime());
  const recentUpdates = recentUpdatesRaw.map(({ sortIso: _sortIso, ...row }) => row);

  return {
    categoryId: input.categoryId,
    name: def.name,
    description: def.description,
    progress: {
      label: `${def.name} ${INTELLIGENCE_CAPTURE_WORKSPACE_UI.progressSuffix}`,
      status,
      statusLabel: statusUi.label,
      statusCssModifier: statusUi.cssModifier,
      findingsCaptured,
      openQuestions,
      confirmed,
      findingsLabel: formatCategoryFindingsStat(findingsCaptured),
      openItemsLabel: formatCategoryOpenItemsStat(openQuestions),
    },
    confirmedFindings: uniqueConfirmed.slice(0, 8),
    openQuestions: openQuestionList,
    relatedContacts: relatedContacts.slice(0, 6),
    supportingEvidence: uniqueEvidence.slice(0, 8),
    recentUpdates: recentUpdates.slice(0, 6),
  };
}

/** Open questions as full session rows for validation UI. */
export function categoryWorkspaceValidationQuestions(
  slice: IntelligenceCaptureCategorySlice,
): StageMappingQuestion[] {
  return [...slice.open, ...slice.laterStage];
}
