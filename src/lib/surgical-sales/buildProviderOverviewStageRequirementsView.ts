/**
 * Provider overview workflow groups — access vs clinical validation (discovery).
 */

import type { ProviderOverviewPathwayStageModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import type { ProviderOverviewTacticalProgressionModel } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import { buildDiscoveryOverviewSynthesis } from "@/lib/surgical-sales/buildDiscoveryOverviewSynthesis";
import {
  buildDiscoveryOverviewReadinessGroup,
  type DiscoveryReadinessSignalDetail,
} from "@/lib/surgical-sales/buildDiscoveryOverviewReadinessGroup";
import { DISCOVERY_INTELLIGENCE_UI } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import {
  DISCOVERY_READINESS_MARKERS,
  mapContactFieldReadinessStatus,
} from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  DISCOVERY_OVERVIEW_GROUP_COPY,
  type DiscoveryOverviewGroupId,
} from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import { formatOperationalBlockerLabel } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";

export type StageRequirementRowStatus =
  | "complete"
  | "partial"
  | "open"
  | "blocked"
  /** @deprecated Pre-approval rows use prepare_early instead */
  | "deferred"
  /** Editable before approval when field is empty — optional operational prep */
  | "prepare_early"
  | "not_started"
  | "pending";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export type ProviderOverviewWorkflowApiAction =
  | "mark_observation_approved"
  | "mark_observation_interested"
  | "mark_observation_declined"
  | "undo_observation_approval"
  | "mark_access_path_known"
  | "mark_pathway_partially_known"
  | "mark_credentialing_known"
  | "mark_champion_confirmed";

export type WorkflowRowActionKind =
  | "api"
  | "capture_field"
  | "assign_support_contact"
  | "manage_support_contacts";

export type WorkflowRowAction = {
  id: string;
  label: string;
  kind: WorkflowRowActionKind;
  apiAction?: ProviderOverviewWorkflowApiAction;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
  /** For assign_support_contact — open picker in create vs select mode. */
  contactPickerMode?: "select" | "create";
};

export type StageRequirementRow = {
  id: string;
  label: string;
  status: StageRequirementRowStatus;
  marker: string;
  /** Compact operational pill label (discovery rows). */
  statusLabel?: string;
  /** Raw discovery status label — drives contextual row actions. */
  rawStatusLabel?: string;
  /** CSS modifier for status pill — from discoveryOperationalPillSlug */
  pillSlug?: string;
  signalId?: DiscoveryStructuredSignalId;
  primaryDbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
  /** Secondary line (e.g. confirmed date). */
  statusDetail?: string | null;
  actions?: WorkflowRowAction[];
};

export type { DiscoveryReadinessSignalDetail } from "@/lib/surgical-sales/buildDiscoveryOverviewReadinessGroup";
export type { DiscoveryOverviewGroupId } from "@/lib/surgical-sales/providerOverviewBriefingCopy";

export type DiscoveryIntelligenceGroupView = {
  id: DiscoveryOverviewGroupId;
  title: string;
  /** Short section subtitle — not a status synthesis paragraph */
  subtitle: string;
  /** Intelligence-aligned summary — detail lives on the Intelligence tab */
  summary: string;
  /** Evidence-based capture summary — e.g. "2 confirmed · 1 open" */
  progressLabel: string;
  /** @deprecated Internal weighted score — do not display without evidence gate */
  progressPercent: number;
  progressConstrained: boolean;
  /** Concise blocker bullets — max 3 */
  blockers: string[];
  /** @deprecated Use blockers */
  narrativeLines: string[];
  /** @deprecated Use blockers */
  primaryBlocker: string | null;
  primaryAction: WorkflowRowAction | null;
  primaryActionLabel: string | null;
  quickActions: WorkflowRowAction[];
  signals: DiscoveryReadinessSignalDetail[];
  rows: StageRequirementRow[];
};

export type ProviderOverviewStageRequirementsModel = {
  /** Discovery stage — four intelligence groups */
  discoveryIntelligenceGroups: DiscoveryIntelligenceGroupView[];
  /** Access-readiness signals for inline workflow actions */
  accessWorkflow: StageRequirementRow[];
  /** @deprecated Discovery uses discoveryIntelligenceGroups */
  clinicalValidation: StageRequirementRow[];
  /** @deprecated Deferred rows are inline in accessWorkflow */
  locked: Array<{ id: string; label: string }>;
  /** @deprecated */
  showLocked: boolean;
  pathwayNextMove: string | null;
  /** @deprecated Early-prep helper removed from overview UI */
  showAccessEarlyPrepHint: boolean;
};

const CLINICAL_VALIDATION_SPECS: Array<{
  id: string;
  label: string;
  dbKeys: string[];
}> = [
  {
    id: "workflow_visibility",
    label: "Workflow visibility",
    dbKeys: [
      "provider_observation_best_days_case_types",
      "provider_preference_card_signals",
      "observation_history",
    ],
  },
  {
    id: "procedure_volume",
    label: "Procedure volume",
    dbKeys: ["provider_procedure_focus"],
  },
  {
    id: "product_alignment",
    label: "Product alignment",
    dbKeys: ["provider_competitive_products"],
  },
  {
    id: "clinical_fit_observed",
    label: "Clinical fit observed",
    dbKeys: ["provider_preference_card_signals", "observation_history"],
  },
];

const CLINICAL_LEARNING_DB_KEYS = [
  "observation_history",
  "provider_preference_card_signals",
  "provider_observation_best_days_case_types",
] as const;

function markerForStatus(status: StageRequirementRowStatus): string {
  switch (status) {
    case "complete":
      return DISCOVERY_READINESS_MARKERS.complete;
    case "partial":
      return DISCOVERY_READINESS_MARKERS.partial;
    case "blocked":
      return DISCOVERY_READINESS_MARKERS.blocked;
    case "prepare_early":
    case "deferred":
    case "not_started":
    case "pending":
      return "—";
    case "open":
    default:
      return DISCOVERY_READINESS_MARKERS.open;
  }
}

function aggregateDbKeyStatus(
  dbKeys: string[],
  contact: Record<string, unknown>,
): StageRequirementRowStatus {
  const tones = dbKeys.map((key) => mapContactFieldReadinessStatus(key, contact));
  if (tones.every((t) => t === "complete")) return "complete";
  if (tones.some((t) => t === "blocked")) return "blocked";
  if (tones.some((t) => t === "partial")) return "partial";
  if (tones.some((t) => t === "open")) return "open";
  return "open";
}

function hasClinicalLearningCaptured(contact: Record<string, unknown>): boolean {
  return CLINICAL_LEARNING_DB_KEYS.some((key) => {
    if (isIntelligenceFieldValidatedOnFile(key, contact)) return true;
    return fieldHasIntelligenceSignal(key, contact[key] as string | null | undefined);
  });
}

function buildClinicalValidationRows(input: {
  contact: Record<string, unknown>;
  approvalMet: boolean;
}): StageRequirementRow[] {
  const learningCaptured = hasClinicalLearningCaptured(input.contact);

  return CLINICAL_VALIDATION_SPECS.map((spec) => {
    if (!input.approvalMet) {
      return {
        id: spec.id,
        label: spec.label,
        status: "not_started",
        marker: markerForStatus("not_started"),
      };
    }
    if (!learningCaptured) {
      return {
        id: spec.id,
        label: spec.label,
        status: "pending",
        marker: markerForStatus("pending"),
      };
    }
    const status = aggregateDbKeyStatus(spec.dbKeys, input.contact);
    return {
      id: spec.id,
      label: spec.label,
      status,
      marker: markerForStatus(status),
    };
  });
}

function buildDiscoveryWorkflowGroups(input: {
  pathway: ProviderOverviewPathwayStageModel;
  contact: Record<string, unknown>;
  engagements?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewStageRequirementsModel {
  const discovery = input.pathway.discoveryProgression!;
  const approvalMet = discovery.advancementSignal.met;
  const synthesis = buildDiscoveryOverviewSynthesis({
    contact: input.contact,
    relationshipStage:
      typeof input.contact.provider_relationship_stage === "string"
        ? input.contact.provider_relationship_stage
        : null,
    engagements: input.engagements as never,
    cases: input.cases,
  });
  const intelligenceGroups = synthesis.intelligenceView.groups;

  const discoveryIntelligenceGroups: DiscoveryIntelligenceGroupView[] = (
    Object.keys(DISCOVERY_OVERVIEW_GROUP_COPY) as DiscoveryOverviewGroupId[]
  )
    .filter((id) => id !== "access_readiness")
    .map((id) => {
    const copy = DISCOVERY_OVERVIEW_GROUP_COPY[id];
    const synthesisGroup = synthesis.groups.find((g) => g.id === id);
    const intelGroup = intelligenceGroups.find((g) => g.id === id);
    if (!intelGroup) {
      return {
        id,
        title: copy.title,
        subtitle: copy.subtitle,
        summary: synthesisGroup?.summary ?? "Still learning",
        progressLabel: "",
        progressPercent: 0,
        progressConstrained: false,
        blockers: [DISCOVERY_INTELLIGENCE_UI.overviewReadiness.open],
        narrativeLines: [DISCOVERY_INTELLIGENCE_UI.overviewReadiness.open],
        primaryBlocker: null,
        primaryAction: null,
        primaryActionLabel: null,
        quickActions: [],
        signals: [],
        rows: [],
      };
    }
    return buildDiscoveryOverviewReadinessGroup({
      id,
      title: copy.title,
      subtitle: copy.subtitle,
      summary: synthesisGroup?.summary ?? "Still learning",
      intelGroup,
      contact: input.contact,
    });
  });

  return {
    discoveryIntelligenceGroups,
    accessWorkflow: [],
    clinicalValidation: [],
    locked: [],
    showLocked: false,
    pathwayNextMove: synthesis.nextFieldMove,
    showAccessEarlyPrepHint: false,
  };
}

export function buildProviderOverviewStageRequirementsView(input: {
  pathway: ProviderOverviewPathwayStageModel;
  progression: ProviderOverviewTacticalProgressionModel;
  contact?: Record<string, unknown>;
  engagements?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewStageRequirementsModel {
  const { pathway } = input;
  const contact = input.contact ?? {};

  if (pathway.stageId === "discovery" && pathway.discoveryProgression) {
    return buildDiscoveryWorkflowGroups({
      pathway,
      contact,
      engagements: input.engagements,
      cases: input.cases,
    });
  }

  const accessWorkflow: StageRequirementRow[] = pathway.requirements.map((req) => ({
    id: req.id,
    label: formatOperationalBlockerLabel(req.label, req.id),
    status:
      req.status === "validated"
        ? "complete"
        : req.status === "blocked"
          ? "blocked"
          : req.status === "in_progress" || req.status === "needs_follow_up"
            ? "partial"
            : "open",
    marker:
      req.status === "validated"
        ? "✓"
        : req.status === "blocked"
          ? "!"
          : req.status === "in_progress"
            ? "△"
            : "○",
  }));

  return {
    discoveryIntelligenceGroups: [],
    accessWorkflow,
    clinicalValidation: buildClinicalValidationRows({
      contact,
      approvalMet: true,
    }),
    locked: [],
    showLocked: false,
    pathwayNextMove: null,
    showAccessEarlyPrepHint: false,
  };
}
