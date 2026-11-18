/**
 * Guided Intel Capture (Rapid Discovery Mode) — cross-section operational question queue.
 */

import {
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  PROVIDER_INTELLIGENCE_SECTION_ORDER,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  buildIntelligenceCapturePriorities,
  fieldHasIntelligenceSignal,
  intelligenceFieldTier,
  type IntelligenceFieldTier,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  buildProviderIntelligenceMaturitySnapshot,
  isIntelligenceSectionVisibleForMaturityStage,
  type ProviderIntelligenceMaturitySnapshot,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { deriveIntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  buildOrganizationDiscoveryCaptureSteps,
  buildProgressiveCaptureSteps,
  type ProgressiveCaptureStep,
} from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import {
  formatInheritedOrganizationPrompt,
  resolveInheritedOrganizationDiscovery,
  type GuidedDiscoveryMode,
} from "@/lib/surgical-sales/organizationIntelligenceDiscovery";
import {
  ORGANIZATION_INTELLIGENCE_SECTION_LABELS,
  type OrganizationIntelligenceSectionId,
} from "@/lib/surgical-sales/organizationIntelligenceArchitecture";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { intelligenceFieldWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import { resolveIntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import type { IntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import {
  buildCommercialDeploymentReadinessSnapshot,
  deploymentDiscoveryCta,
  type CommercialDeploymentReadinessSnapshot,
} from "@/lib/surgical-sales/commercialDeploymentReadiness";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";
import { isIntelligenceFieldDeprioritizedForDiscovery } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import { isVendorFootprintDiscoveryVisibleForMaturityStage } from "@/lib/surgical-sales/providerIntelligenceDiscoveryRouting";
import { buildDiscoveryLearnedFeedback } from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import {
  buildIntelligenceSaveConfirmationGroups,
  type IntelligenceSaveConfirmationGroup,
} from "@/lib/surgical-sales/intelligenceSaveConfirmation";
import {
  discoveryAudienceCategoryForField,
  INTELLIGENCE_DISCOVERY_CONTEXT_CHIP,
  isIntelligenceFieldAppropriateForStakeholder,
  resolveDiscoveryScopeForField,
  stakeholderPriorityBoost,
  type IntelligenceDiscoveryStakeholder,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import { formatOpenItemsCount } from "@/lib/surgical-sales/discoveryOpenItemsVocabulary";
import {
  discoveryProviderDisplayName,
  personalizeDiscoveryPromptForProvider,
} from "@/lib/surgical-sales/discoveryPromptPersonalization";
import { fieldScanSummaryLine } from "@/lib/surgical-sales/intelligenceSectionScanView";
import { deploymentTierToVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";

const FIELD_LABEL = new Map([
  ...PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
  ...ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
]);

export const GUIDED_INTEL_CAPTURE = {
  productName: "Rapid Discovery",
  altName: "Rapid Discovery",
  buildAccountIntel: "Build account intelligence",
  addContext: "Add operational context",
  refineVisibility: "Refine field visibility",
  /** @deprecated Use addContext */
  continueDiscovery: "Add operational context",
  /** @deprecated Use addContext */
  resolveGaps: "Add operational context",
  /** @deprecated Use buildAccountIntel */
  rapidMode: "Build account intelligence",
  /** @deprecated Use refineVisibility */
  updateIntel: "Refine field visibility",
  outstanding: "open items",
  sessionComplete: "Enrichment complete",
  insightsCaptured: "Insights captured this session",
  readinessShift: "Visibility",
  leftForLater: "Left for later",
  /** @deprecated Use leftForLater */
  remainingBlockers: "Left for later",
  remainingOpenItems: "Items to refine later",
  recommendedNext: "Optional next",
  resumeLater: "Resume anytime",
  done: "Done",
  doneForNow: "Done for now",
  pausedTitle: "Paused — resume anytime",
  emptyScope: "Nothing to enrich in this scope — try another filter or close anytime.",
} as const;

export const GUIDED_INTEL_ACTION_LABELS = {
  saveAndNext: "Save & next",
  confirmed: "Save & next",
  stillLearning: "Still learning",
  /** @deprecated Use stillLearning */
  unknown: "Still learning",
  skip: "Skip",
  notRelevant: "Not relevant",
} as const;

export type GuidedIntelPriority = "critical" | "high" | "medium";

export type GuidedIntelCaptureQuestion = ProgressiveCaptureStep & {
  sectionId: ProviderIntelligenceSectionId | OrganizationIntelligenceSectionId;
  sectionLabel: string;
  fieldLabel: string;
  /** Surgeon / Office / Admin — shown when discovery audience is All. */
  audienceCategory: string;
  proposedScope: IntelligenceScope;
  scopeReason: string;
  proposedDestination: IntelligenceSaveDestination;
  destinationReason: string;
  discoveryMode: GuidedDiscoveryMode;
  /** Facility baseline shown when discoveryMode is inherited_organization. */
  inheritedOrganizationName?: string;
  inheritedDisplayLine?: string;
  inheritedBaselineValue?: string;
  priority: GuidedIntelPriority;
  priorityLabel: string;
  priorityScore: number;
  positionInSection: number;
  remainingInSection: number;
  globalIndex: number;
  globalTotal: number;
};

export type GuidedIntelCaptureLaunchStats = {
  unresolvedTotal: number;
  mappedTotal: number;
  fieldTotal: number;
  ctaLabel: string;
  subtitle: string;
  /** @deprecated Use deployment.provider.confidenceIndex */
  missionReadinessScore: number;
  deployment: CommercialDeploymentReadinessSnapshot;
};

export type GuidedIntelCaptureSessionEnd = {
  answeredCount: number;
  skippedCount: number;
  dontKnowYetCount: number;
  notRelevantCount: number;
  /** @deprecated Use skippedCount + dontKnowYetCount + notRelevantCount */
  deferredCount: number;
  capturedLabels: string[];
  /** Grouped confirmation of where session saves were stored. */
  savedByScope: IntelligenceSaveConfirmationGroup[];
  remainingCount: number;
  sessionTotal: number;
  exitSummaryLines: string[];
  exitedEarly: boolean;
  remainingBlockers: string[];
  readinessScore: number;
  recommendedNext: string | null;
  readinessLine: string;
};

export type GuidedIntelCaptureProgressView = {
  sessionTotal: number;
  currentQuestionNumber: number;
  remainingCount: number;
  /** Rep-facing line, e.g. "3 workflow gaps remaining". */
  remainingLabel: string;
  progressPercent: number;
  categoryLabel: string;
  mapProgressLabel: string;
};

/** Display label for progress header (e.g. Office / scheduler). */
export function guidedDiscoveryCategoryDisplay(
  discoveryStakeholder: IntelligenceDiscoveryStakeholder,
  audienceCategory: string,
): string {
  if (discoveryStakeholder !== "unspecified") {
    return INTELLIGENCE_DISCOVERY_CONTEXT_CHIP[discoveryStakeholder];
  }
  if (audienceCategory === "Provider") return "Provider";
  if (audienceCategory === "Facility") return "Facility";
  if (audienceCategory === "Case") return "Case";
  if (audienceCategory === "Office") return "Office / Scheduler";
  if (audienceCategory === "Admin") return "Admin / Purchasing";
  return audienceCategory;
}

const STAKEHOLDER_GAP_CATEGORY: Record<
  Exclude<IntelligenceDiscoveryStakeholder, "unspecified">,
  string
> = {
  provider_surgeon: "provider",
  facility_or_access: "facility",
  case_scoped: "case",
  scheduler_office: "office",
  administrative_procurement: "admin",
};

const SECTION_GAP_CATEGORY: Partial<Record<ProviderIntelligenceSectionId, string>> = {
  observation_readiness: "access",
  or_environment: "OR access",
  clinical_workflow: "workflow",
  relationship_intelligence: "relationship",
  commercial_signals: "commercial",
};

/** Remaining queue label for discovery header (operational, not form-like). */
export function formatGuidedIntelRemainingLabel(input: {
  remainingCount: number;
  discoveryStakeholder: IntelligenceDiscoveryStakeholder;
  sectionId?: ProviderIntelligenceSectionId | OrganizationIntelligenceSectionId | null;
}): string {
  const n = input.remainingCount;
  if (n === 0) return "Nothing open in this scope — enrich another lane or close anytime";
  const items = formatOpenItemsCount(n);

  if (input.discoveryStakeholder !== "unspecified") {
    const scope = STAKEHOLDER_GAP_CATEGORY[input.discoveryStakeholder];
    return `${items} · ${scope} still learning`;
  }

  const sectionId = input.sectionId;
  if (sectionId && sectionId in SECTION_GAP_CATEGORY) {
    const category = SECTION_GAP_CATEGORY[sectionId as ProviderIntelligenceSectionId];
    if (category) return `${items} · ${category} insight opportunities`;
  }

  return `${items} still learning`;
}

export function buildGuidedIntelCaptureProgress(input: {
  sessionTotal: number;
  queueLength: number;
  discoveryStakeholder: IntelligenceDiscoveryStakeholder;
  audienceCategory: string;
  sectionId?: ProviderIntelligenceSectionId | OrganizationIntelligenceSectionId | null;
}): GuidedIntelCaptureProgressView {
  const sessionTotal = Math.max(0, input.sessionTotal);
  const queueLength = Math.max(0, input.queueLength);
  const currentQuestionNumber =
    sessionTotal > 0 ? Math.min(sessionTotal, Math.max(1, sessionTotal - queueLength + 1)) : 0;
  const remainingCount = Math.max(0, queueLength - 1);
  const completed = sessionTotal > 0 ? sessionTotal - queueLength : 0;
  const progressPercent =
    sessionTotal > 0 ? Math.round((completed / sessionTotal) * 100) : 100;
  const categoryLabel = guidedDiscoveryCategoryDisplay(
    input.discoveryStakeholder,
    input.audienceCategory,
  );

  return {
    sessionTotal,
    currentQuestionNumber,
    remainingCount,
    remainingLabel: formatGuidedIntelRemainingLabel({
      remainingCount,
      discoveryStakeholder: input.discoveryStakeholder,
      sectionId: input.sectionId,
    }),
    progressPercent,
    categoryLabel,
    mapProgressLabel:
      sessionTotal > 0
        ? `${completed} of ${sessionTotal} insights captured this session`
        : "Optional enrichment — skip or close anytime",
  };
}

export function formatGuidedIntelExitSummaryLines(input: {
  answeredCount: number;
  skippedCount: number;
  dontKnowYetCount: number;
  notRelevantCount: number;
  remainingCount: number;
  facilityVisibilityImproved?: boolean;
  providerVisibilityImproved?: boolean;
}): string[] {
  const lines: string[] = [];
  if (input.answeredCount > 0) {
    lines.push(
      `${input.answeredCount} insight${input.answeredCount === 1 ? "" : "s"} added`,
    );
  }
  if (input.facilityVisibilityImproved) {
    lines.push("Facility visibility improved");
  }
  if (input.providerVisibilityImproved) {
    lines.push("Provider visibility improved");
  }
  const leftForLater =
    input.remainingCount + input.skippedCount + input.dontKnowYetCount + input.notRelevantCount;
  if (leftForLater > 0) {
    lines.push(`${leftForLater} item${leftForLater === 1 ? "" : "s"} left for later`);
  }
  if (lines.length === 0) {
    lines.push("No changes this session — close anytime");
  }
  return lines;
}

function priorityFromTier(tier: IntelligenceFieldTier, score: number): GuidedIntelPriority {
  if (tier === "anchor" || score >= 90) return "critical";
  if (tier === "supporting" || score >= 40) return "high";
  return "medium";
}

function priorityLabel(priority: GuidedIntelPriority): string {
  if (priority === "critical") return "High priority";
  if (priority === "high") return "Priority";
  return "Supporting";
}

export function guidedIntelCaptureCtaLabel(unresolvedTotal: number, mappedTotal: number): string {
  if (unresolvedTotal === 0) return GUIDED_INTEL_CAPTURE.refineVisibility;
  if (mappedTotal === 0) return GUIDED_INTEL_CAPTURE.buildAccountIntel;
  return GUIDED_INTEL_CAPTURE.addContext;
}

const DISCOVERY_AUDIENCE_FILTERS: IntelligenceDiscoveryStakeholder[] = [
  "unspecified",
  "facility_or_access",
  "provider_surgeon",
  "case_scoped",
];

/** Unresolved guided-capture counts per audience filter (excludes not_relevant). */
export function buildGuidedIntelCaptureAudienceCounts(
  contact: Record<string, unknown>,
  options?: {
    planning?: ProviderPlanningCompletion | null;
    fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
    maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
    organizationBaseline?: OrganizationIntelligenceBaseline | null;
  },
): Record<IntelligenceDiscoveryStakeholder, number> {
  const counts = {} as Record<IntelligenceDiscoveryStakeholder, number>;
  for (const discoveryStakeholder of DISCOVERY_AUDIENCE_FILTERS) {
    counts[discoveryStakeholder] = buildGuidedIntelCaptureQueue(contact, {
      ...options,
      discoveryStakeholder,
    }).length;
  }
  return counts;
}

export function formatDiscoveryAudienceChipLabel(
  shortLabel: string,
  count: number | undefined,
): string {
  if (count === undefined) return shortLabel;
  return `${shortLabel} (${count})`;
}

export function buildGuidedIntelCaptureLaunchStats(
  contact: Record<string, unknown>,
  options?: {
    planning?: ProviderPlanningCompletion | null;
    fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
    maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
    discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
    organizationBaseline?: OrganizationIntelligenceBaseline | null;
  },
): GuidedIntelCaptureLaunchStats {
  const queue = buildGuidedIntelCaptureQueue(contact, options);
  const maturity =
    options?.maturitySnapshot ??
    buildProviderIntelligenceMaturitySnapshot({
      contact,
      planning: options?.planning,
    });

  let mappedTotal = 0;
  let fieldTotal = 0;

  for (const sectionId of PROVIDER_INTELLIGENCE_SECTION_ORDER) {
    if (!isIntelligenceSectionVisibleForMaturityStage(sectionId, maturity.stage)) continue;
    const keys = buildProgressiveCaptureSteps(sectionId, contact, {
      includeAnswered: true,
      discoveryStakeholder: options?.discoveryStakeholder,
      maturityStage: maturity.stage,
      sectionConfidence:
        options?.planning?.sections.find((s) => s.id === sectionId)?.confidence ??
        deriveIntelligenceSectionConfidence(sectionId, contact).confidence,
    });
    for (const step of keys) {
      fieldTotal += 1;
      if (step.answered) mappedTotal += 1;
    }
  }

  const unresolvedTotal = queue.length;
  const deployment = buildCommercialDeploymentReadinessSnapshot({
    contact,
    planning: options?.planning,
    fieldMetadata: options?.fieldMetadata,
    organizationBaseline: options?.organizationBaseline,
    unresolvedDiscoveryCount: unresolvedTotal,
  });
  const ctaLabel = deploymentDiscoveryCta(deployment.combinedTier, unresolvedTotal);
  const subtitle = deployment.discoverySubtitle;

  return {
    unresolvedTotal,
    mappedTotal,
    fieldTotal,
    ctaLabel,
    subtitle,
    missionReadinessScore: deployment.provider.confidenceIndex,
    deployment,
  };
}

function organizationSectionIdForDbKey(dbKey: string): OrganizationIntelligenceSectionId {
  if (
    dbKey === "provider_credentialing_status" ||
    dbKey === "provider_observation_credentialing_needed" ||
    dbKey === "provider_observation_access_path"
  ) {
    return "facility_access";
  }
  if (
    dbKey === "provider_observation_coordinator_contact" ||
    dbKey === "provider_observation_best_days_case_types"
  ) {
    return "scheduling_approval";
  }
  if (dbKey === "provider_preference_card_signals" || dbKey === "provider_current_vendors") {
    return "purchasing_committee";
  }
  return "or_environment";
}

function applyOrganizationInheritanceToStep(
  step: ProgressiveCaptureStep,
  contact: Record<string, unknown>,
  baseline: OrganizationIntelligenceBaseline | null | undefined,
): Omit<
  GuidedIntelCaptureQuestion,
  | "positionInSection"
  | "remainingInSection"
  | "globalIndex"
  | "globalTotal"
  | "sectionId"
  | "sectionLabel"
  | "fieldLabel"
  | "audienceCategory"
  | "proposedScope"
  | "scopeReason"
  | "priority"
  | "priorityLabel"
  | "priorityScore"
> | null {
  if (!isOrganizationIntelligenceDbKey(step.dbKey)) {
    return {
      ...step,
      discoveryMode: "standard",
    } as Omit<
      GuidedIntelCaptureQuestion,
      | "positionInSection"
      | "remainingInSection"
      | "globalIndex"
      | "globalTotal"
      | "sectionId"
      | "sectionLabel"
      | "fieldLabel"
      | "audienceCategory"
      | "proposedScope"
      | "scopeReason"
      | "priority"
      | "priorityLabel"
      | "priorityScore"
    >;
  }

  const inherited = resolveInheritedOrganizationDiscovery(step.dbKey, contact, baseline);
  if (inherited.mode === "skip") return null;

  if (inherited.mode === "inherited" && inherited.baselineField) {
    return {
      ...step,
      discoveryMode: "inherited_organization",
      prompt: formatInheritedOrganizationPrompt(
        inherited.organizationName,
        inherited.baselineField.displayLine,
      ),
      inheritedOrganizationName: inherited.organizationName,
      inheritedDisplayLine: inherited.baselineField.displayLine,
      inheritedBaselineValue: inherited.baselineField.value,
    } as Omit<
      GuidedIntelCaptureQuestion,
      | "positionInSection"
      | "remainingInSection"
      | "globalIndex"
      | "globalTotal"
      | "sectionId"
      | "sectionLabel"
      | "fieldLabel"
      | "audienceCategory"
      | "proposedScope"
      | "scopeReason"
      | "priority"
      | "priorityLabel"
      | "priorityScore"
    >;
  }

  return { ...step, discoveryMode: "standard" } as Omit<
    GuidedIntelCaptureQuestion,
    | "positionInSection"
    | "remainingInSection"
    | "globalIndex"
    | "globalTotal"
    | "sectionId"
    | "sectionLabel"
    | "fieldLabel"
    | "audienceCategory"
    | "proposedScope"
    | "scopeReason"
    | "priority"
    | "priorityLabel"
    | "priorityScore"
  >;
}

/** Re-order discovery queue using OpenAI-prioritized db keys (deterministic tie-break). */
export function reorderGuidedIntelCaptureQueue(
  queue: GuidedIntelCaptureQuestion[],
  orderedDbKeys: readonly string[],
): GuidedIntelCaptureQuestion[] {
  if (!orderedDbKeys.length) return queue;
  const order = new Map(orderedDbKeys.map((k, i) => [k, i]));
  return [...queue].sort((a, b) => {
    const aiA = order.get(a.dbKey) ?? 999;
    const aiB = order.get(b.dbKey) ?? 999;
    if (aiA !== aiB) return aiA - aiB;
    return b.priorityScore - a.priorityScore;
  });
}

export function buildGuidedIntelCaptureQueue(
  contact: Record<string, unknown>,
  options?: {
    planning?: ProviderPlanningCompletion | null;
    maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
    emphasizeDbKey?: string;
    excludeDbKeys?: ReadonlySet<string>;
    discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
    organizationBaseline?: OrganizationIntelligenceBaseline | null;
    providerDisplayName?: string;
  },
): GuidedIntelCaptureQuestion[] {
  const discoveryStakeholder = options?.discoveryStakeholder ?? "unspecified";
  const providerLabel =
    options?.providerDisplayName?.trim() || discoveryProviderDisplayName(contact);
  const fieldMetadata = intelligenceMetadataFromContact(contact);
  const maturity =
    options?.maturitySnapshot ??
    buildProviderIntelligenceMaturitySnapshot({
      contact,
      planning: options?.planning,
    });

  const priorityByKey = new Map(
    buildIntelligenceCapturePriorities(contact, options?.planning, 48, {
      maturitySnapshot: maturity,
      discoveryStakeholder,
    }).map((p) => [p.dbKey, p]),
  );

  const raw: Omit<
    GuidedIntelCaptureQuestion,
    "positionInSection" | "remainingInSection" | "globalIndex" | "globalTotal"
  >[] = [];
  const queuedDbKeys = new Set<string>();

  function pushGuidedStep(
    step: ProgressiveCaptureStep,
    sectionId: ProviderIntelligenceSectionId | OrganizationIntelligenceSectionId,
    sectionLabel: string,
  ) {
    if (options?.excludeDbKeys?.has(step.dbKey)) return;
    if (queuedDbKeys.has(step.dbKey)) return;
    if (isIntelligenceFieldDeprioritizedForDiscovery(step.dbKey, fieldMetadata)) return;
    if (
      discoveryStakeholder !== "unspecified" &&
      !isIntelligenceFieldAppropriateForStakeholder(step.dbKey, discoveryStakeholder)
    ) {
      return;
    }
    if (!isVendorFootprintDiscoveryVisibleForMaturityStage(step.dbKey, maturity.stage)) {
      return;
    }

    const inheritedStep = applyOrganizationInheritanceToStep(
      step,
      contact,
      options?.organizationBaseline,
    );
    if (!inheritedStep) return;

    const priorityMeta = priorityByKey.get(step.dbKey);
    const tier = intelligenceFieldTier(
      step.dbKey,
      sectionId in PROVIDER_INTELLIGENCE_SECTION_LABELS
        ? (sectionId as ProviderIntelligenceSectionId)
        : "or_environment",
    );
    const priorityScore =
      (priorityMeta?.priorityScore ?? 0) + stakeholderPriorityBoost(step.dbKey, discoveryStakeholder);
    const priority = priorityFromTier(tier, priorityScore);
    const { scope: proposedScope, reason: scopeReason } = resolveDiscoveryScopeForField(
      step.dbKey,
      discoveryStakeholder,
    );
    const { destination: proposedDestination, reason: destinationReason } = resolveIntelligenceSaveDestination({
      scope: proposedScope,
      dbKey: step.dbKey,
    });

    raw.push({
      ...inheritedStep,
      prompt: personalizeDiscoveryPromptForProvider(inheritedStep.prompt, providerLabel),
      sectionId,
      sectionLabel,
      fieldLabel: FIELD_LABEL.get(step.dbKey) ?? step.field.label,
      audienceCategory: discoveryAudienceCategoryForField(step.dbKey),
      proposedScope,
      scopeReason,
      proposedDestination,
      destinationReason,
      priority,
      priorityLabel: priorityLabel(priority),
      priorityScore,
      whyItMatters: step.whyItMatters ?? intelligenceFieldWhyItMatters(step.dbKey),
    });
    queuedDbKeys.add(step.dbKey);
  }

  for (const sectionId of PROVIDER_INTELLIGENCE_SECTION_ORDER) {
    if (!isIntelligenceSectionVisibleForMaturityStage(sectionId, maturity.stage)) continue;

    const sectionConfidence =
      options?.planning?.sections.find((s) => s.id === sectionId)?.confidence ??
      deriveIntelligenceSectionConfidence(sectionId, contact).confidence;

    const steps = buildProgressiveCaptureSteps(sectionId, contact, {
      sectionConfidence,
      discoveryStakeholder,
      maturityStage: maturity.stage,
    });
    const sectionLabel = PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId];

    for (const step of steps) {
      pushGuidedStep(step, sectionId, sectionLabel);
    }
  }

  const orgSteps = buildOrganizationDiscoveryCaptureSteps(contact, {
    discoveryStakeholder,
  });
  for (const step of orgSteps) {
    const orgSectionId = organizationSectionIdForDbKey(step.dbKey);
    pushGuidedStep(
      step,
      orgSectionId,
      ORGANIZATION_INTELLIGENCE_SECTION_LABELS[orgSectionId],
    );
  }

  raw.sort((a, b) => b.priorityScore - a.priorityScore);

  let ordered = raw;
  if (options?.emphasizeDbKey) {
    const idx = raw.findIndex((q) => q.dbKey === options.emphasizeDbKey);
    if (idx > 0) ordered = [...raw.slice(idx), ...raw.slice(0, idx)];
  }

  const bySection = new Map<GuidedIntelCaptureQuestion["sectionId"], number>();
  for (const q of ordered) {
    bySection.set(q.sectionId, (bySection.get(q.sectionId) ?? 0) + 1);
  }

  const sectionSeen = new Map<GuidedIntelCaptureQuestion["sectionId"], number>();

  return ordered.map((q, globalIndex) => {
    const pos = (sectionSeen.get(q.sectionId) ?? 0) + 1;
    sectionSeen.set(q.sectionId, pos);
    const remainingInSection = (bySection.get(q.sectionId) ?? 1) - pos + 1;
    return {
      ...q,
      positionInSection: pos,
      remainingInSection,
      globalIndex: globalIndex + 1,
      globalTotal: ordered.length,
    };
  });
}

export function buildGuidedIntelCaptureSessionEnd(input: {
  baseline: Record<string, unknown>;
  current: Record<string, unknown>;
  answeredDbKeys: readonly string[];
  skippedDbKeys?: readonly string[];
  dontKnowYetDbKeys?: readonly string[];
  notRelevantDbKeys?: readonly string[];
  /** @deprecated Pass skippedDbKeys, dontKnowYetDbKeys, notRelevantDbKeys */
  deferredDbKeys?: readonly string[];
  sessionTotal: number;
  remainingQueueLength: number;
  exitedEarly?: boolean;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
  discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
}): GuidedIntelCaptureSessionEnd {
  const skippedDbKeys = input.skippedDbKeys ?? [];
  const dontKnowYetDbKeys = input.dontKnowYetDbKeys ?? [];
  const notRelevantDbKeys = input.notRelevantDbKeys ?? [];
  const legacyDeferred = input.deferredDbKeys ?? [];
  const savedByScope = buildIntelligenceSaveConfirmationGroups({
    baseline: input.baseline,
    current: input.current,
    answeredDbKeys: input.answeredDbKeys,
    discoveryStakeholder: input.discoveryStakeholder,
    organizationName: input.organizationBaseline?.organizationName,
  });

  const capturedLabels: string[] = [];
  for (const group of savedByScope) {
    for (const line of group.lines) {
      capturedLabels.push(`+ ${line}`);
    }
  }
  for (const dbKey of input.answeredDbKeys) {
    const before = input.baseline[dbKey];
    const after = input.current[dbKey];
    if (
      !fieldHasIntelligenceSignal(dbKey, before as string | null | undefined) &&
      fieldHasIntelligenceSignal(dbKey, after as string | null | undefined)
    ) {
      const line = `+ ${buildDiscoveryLearnedFeedback(dbKey, after as string)}`;
      if (!capturedLabels.includes(line)) capturedLabels.push(line);
    }
  }

  const excludeDbKeys = new Set([
    ...skippedDbKeys,
    ...dontKnowYetDbKeys,
    ...notRelevantDbKeys,
    ...legacyDeferred,
  ]);

  const remaining = buildGuidedIntelCaptureQueue(input.current, {
    planning: input.planning,
    maturitySnapshot: input.maturitySnapshot,
    excludeDbKeys,
    discoveryStakeholder: input.discoveryStakeholder,
    organizationBaseline: input.organizationBaseline,
  });

  const remainingCount = input.remainingQueueLength;
  const skippedCount = skippedDbKeys.length;
  const dontKnowYetCount = dontKnowYetDbKeys.length;
  const notRelevantCount = notRelevantDbKeys.length;
  const deferredCount = skippedCount + dontKnowYetCount + notRelevantCount + legacyDeferred.length;

  const launchBefore = buildGuidedIntelCaptureLaunchStats(input.baseline, {
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    maturitySnapshot: input.maturitySnapshot,
    discoveryStakeholder: input.discoveryStakeholder,
  });
  const launchAfter = buildGuidedIntelCaptureLaunchStats(input.current, {
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    maturitySnapshot: input.maturitySnapshot,
    discoveryStakeholder: input.discoveryStakeholder,
  });

  const facilityVisibilityImproved =
    launchAfter.deployment.facility.confidenceIndex >
      launchBefore.deployment.facility.confidenceIndex ||
    deploymentTierToVisibilityState(launchAfter.deployment.facility.tier) !==
      deploymentTierToVisibilityState(launchBefore.deployment.facility.tier);
  const providerVisibilityImproved =
    launchAfter.deployment.provider.confidenceIndex >
      launchBefore.deployment.provider.confidenceIndex ||
    deploymentTierToVisibilityState(launchAfter.deployment.provider.tier) !==
      deploymentTierToVisibilityState(launchBefore.deployment.provider.tier);

  const exitSummaryLines = formatGuidedIntelExitSummaryLines({
    answeredCount: input.answeredDbKeys.length,
    skippedCount,
    dontKnowYetCount,
    notRelevantCount,
    remainingCount,
    facilityVisibilityImproved,
    providerVisibilityImproved,
  });

  const tierImproved = facilityVisibilityImproved || providerVisibilityImproved;
  const providerVis = launchAfter.deployment.provider.tierLabel;
  const facilityVis = launchAfter.deployment.facility.tierLabel;
  const readinessLine = tierImproved
    ? `Visibility improved — ${providerVis} provider · ${facilityVis} facility`
    : input.answeredDbKeys.length > 0
      ? `${providerVis} provider · ${facilityVis} facility — optional enrichment any time`
      : `${providerVis} provider · ${facilityVis} facility — resume when helpful`;

  const next = buildGuidedIntelCaptureQueue(input.current, {
    planning: input.planning,
    maturitySnapshot: input.maturitySnapshot,
  })[0];

  return {
    answeredCount: input.answeredDbKeys.length,
    skippedCount,
    dontKnowYetCount,
    notRelevantCount,
    deferredCount,
    capturedLabels,
    savedByScope,
    remainingCount,
    sessionTotal: input.sessionTotal,
    exitSummaryLines,
    exitedEarly: input.exitedEarly ?? false,
    remainingBlockers: remaining
      .slice(0, 4)
      .map((q) => fieldScanSummaryLine(q.dbKey)),
    readinessScore: launchAfter.deployment.provider.confidenceIndex,
    recommendedNext: next ? `${next.sectionLabel}: ${next.prompt}` : null,
    readinessLine,
  };
}
