/**
 * Operational Intelligence tab — field workspace read model (six sections only).
 */

import {
  buildProviderIntelligenceDashboardView,
  type ProviderIntelligenceDashboardView,
} from "@/lib/surgical-sales/buildProviderIntelligenceDashboardView";
import {
  buildCommercialDeploymentReadinessSnapshot,
  DEPLOYMENT_CONFIDENCE_TIER_LABELS,
  type DeploymentConfidenceTier,
} from "@/lib/surgical-sales/commercialDeploymentReadiness";
import { buildGuidedIntelCaptureLaunchStats } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  PROVIDER_INTELLIGENCE_MATURITY_LABELS,
  type ProviderIntelligenceMaturitySnapshot,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { IntelligenceDiscoveryStakeholder } from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import {
  buildTacticalRealities,
  resolveIntelligenceObservationHistory,
  sanitizeIntelligenceTabUserCopy,
} from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import { isIntelligenceFieldDeprioritizedForDiscovery } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export type ValidationQueueScope = "Facility" | "Provider" | "Engagement";

export type ValidationQueueAction = "update" | "ask_next_touch" | "mark_not_relevant";

export type IntelligenceValidationQueueRow = {
  id: string;
  title: string;
  scopeLabel: ValidationQueueScope;
  statusLabel: string;
  hint: string;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};

export type IntelligenceContextLine = {
  id: string;
  text: string;
};

export type IntelligenceRecommendedMoveKind =
  | "schedule"
  | "log"
  | "open_briefing"
  | "discovery";

export type IntelligenceRecommendedMove = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionKind: IntelligenceRecommendedMoveKind;
};

export type OperationalIntelligenceWorkspaceView = {
  header: {
    eyebrow: string;
    title: string;
    subtitle: string;
    facilityConfidence: string;
    providerConfidence: string;
    lastFieldUpdate: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
  validationQueue: IntelligenceValidationQueueRow[];
  facilityContext: {
    subtitle: string;
    lines: IntelligenceContextLine[];
  };
  providerContext: {
    subtitle: string;
    lines: IntelligenceContextLine[];
  };
  recommendedMoves: IntelligenceRecommendedMove[];
  deep: {
    moduleCards: ProviderIntelligenceDashboardView["facility"]["readinessCards"];
    providerCards: ProviderIntelligenceDashboardView["provider"]["readinessCards"];
    engagements: ProviderIntelligenceDashboardView["engagements"];
  };
};

const FACILITY_CONTEXT_DEFAULTS = [
  "Vendor clearance path still forming",
  "Credentialing steps not validated",
  "OR access process not yet confirmed",
  "Scheduling authority not mapped",
] as const;

const PROVIDER_CONTEXT_DEFAULTS = [
  "Procedure mix still developing",
  "Technique preferences not validated",
  "Field workflow not observed yet",
  "Relationship still early",
] as const;

const HEADER_SUBTITLE_BY_STAGE: Partial<
  Record<ProviderIntelligenceMaturitySnapshot["stage"], string>
> = {
  early_discovery:
    "Operational picture is still developing. Capture field updates as access, workflow, and provider behavior become clearer.",
  observation_ready:
    "Access and workflow reads are forming. Validate scheduling and credentialing before heavy field spend.",
  evaluation_active:
    "Core context is on file. Keep facility and provider intelligence current as evaluation moves forward.",
  operationally_qualified:
    "Facility access and workflow signals are forming. Confirm scheduling and credentialing before field visits.",
  adoption_building:
    "Adoption signals are building. Keep case support and workflow intelligence current.",
  strategic_account:
    "Strong operational context supports case support. Refresh intelligence when the account shifts.",
};

type CanonicalValidationRow = {
  id: string;
  title: string;
  scopeLabel: ValidationQueueScope;
  dbKeys: string[];
  sectionId?: ProviderIntelligenceSectionId;
  defaultHint: string;
  defaultStatus: string;
};

const VALIDATION_QUEUE_CANONICAL: CanonicalValidationRow[] = [
  {
    id: "credentialing_path",
    title: "Credentialing path",
    scopeLabel: "Facility",
    dbKeys: ["provider_credentialing_status", "provider_observation_credentialing_needed"],
    sectionId: "or_environment",
    defaultHint: "Confirm how vendor clearance works before observation planning.",
    defaultStatus: "Needs validation",
  },
  {
    id: "or_access_path",
    title: "OR access path",
    scopeLabel: "Facility",
    dbKeys: ["provider_observation_access_path", "provider_observation_feasibility"],
    sectionId: "or_environment",
    defaultHint: "Identify who approves observation or vendor access.",
    defaultStatus: "Needs validation",
  },
  {
    id: "vendor_clearance",
    title: "Vendor clearance",
    scopeLabel: "Facility",
    dbKeys: ["provider_credentialing_status"],
    sectionId: "or_environment",
    defaultHint: "Clarify steps before field support or observation.",
    defaultStatus: "Needs validation",
  },
  {
    id: "procedure_mix",
    title: "Procedure mix",
    scopeLabel: "Provider",
    dbKeys: ["provider_procedure_focus", "provider_technique_preferences"],
    sectionId: "clinical_workflow",
    defaultHint: "Confirm open, laparoscopic, robotic, or hybrid mix.",
    defaultStatus: "Still learning",
  },
  {
    id: "observation_history",
    title: "Observation history",
    scopeLabel: "Engagement",
    dbKeys: [],
    sectionId: "observation_readiness",
    defaultHint: "No observation history captured yet.",
    defaultStatus: "Not observed",
  },
];

function shortConfidenceLabel(tier: DeploymentConfidenceTier): string {
  const raw = DEPLOYMENT_CONFIDENCE_TIER_LABELS[tier];
  if (/developing/i.test(raw)) return "Developing";
  if (/early|forming/i.test(raw)) return "Developing";
  if (/strong|mapped|field-ready/i.test(raw)) return "Confirmed";
  if (/validated/i.test(raw)) return "Confirmed";
  return "Still learning";
}

function formatRelativeFieldUpdate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 14) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function resolveLastFieldUpdateLabel(
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  engagements?: ProviderEngagementSummary[],
): string {
  const meta =
    fieldMetadata ?? parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);
  let latestIso = "";
  for (const entry of Object.values(meta)) {
    const iso = entry?.updated_at?.trim();
    if (!iso) continue;
    if (!latestIso || new Date(iso).getTime() > new Date(latestIso).getTime()) {
      latestIso = iso;
    }
  }
  for (const e of engagements ?? []) {
    const iso = String(e.updated_at ?? e.scheduled_at ?? "").trim();
    if (!iso) continue;
    if (!latestIso || new Date(iso).getTime() > new Date(latestIso).getTime()) {
      latestIso = iso;
    }
  }
  if (!latestIso) return "None yet";
  return formatRelativeFieldUpdate(latestIso) ?? "Recent";
}

function resolveRowStatus(
  contact: Record<string, unknown>,
  dbKeys: string[],
  fieldMetadata: ProviderIntelligenceFieldMetadataMap | undefined,
  defaultStatus: string,
): { statusLabel: string; dbKey?: string } {
  for (const dbKey of dbKeys) {
    if (isIntelligenceFieldDeprioritizedForDiscovery(dbKey, fieldMetadata)) {
      return { statusLabel: "Not relevant", dbKey };
    }
    const raw = String(contact[dbKey] ?? "").trim();
    if (fieldHasIntelligenceSignal(dbKey, raw)) {
      return { statusLabel: "Confirmed", dbKey };
    }
  }
  const primaryKey = dbKeys[0];
  return { statusLabel: defaultStatus, dbKey: primaryKey };
}

function resolveRowHint(
  contact: Record<string, unknown>,
  planning: ProviderPlanningCompletion,
  dbKey: string | undefined,
  defaultHint: string,
): string {
  if (!dbKey) return sanitizeIntelligenceTabUserCopy(defaultHint);
  const gaps = buildIntelligenceLearningGaps(contact, planning, 48);
  const gap = gaps.find((g) => g.dbKey === dbKey);
  if (gap?.operationalImpact) {
    return sanitizeIntelligenceTabUserCopy(gap.operationalImpact);
  }
  const guidance = intelligenceGapFieldGuidance(dbKey);
  if (guidance) {
    return sanitizeIntelligenceTabUserCopy(
      `${guidance.bestInteraction} — ${guidance.idealTiming}`,
    );
  }
  return sanitizeIntelligenceTabUserCopy(defaultHint);
}

function buildValidationQueue(input: {
  contact: Record<string, unknown>;
  planning: ProviderPlanningCompletion;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  hasObservationHistory: boolean;
}): IntelligenceValidationQueueRow[] {
  const meta =
    input.fieldMetadata ??
    parseProviderIntelligenceFieldMetadata(input.contact.provider_intelligence_field_metadata);

  const rows: IntelligenceValidationQueueRow[] = [];

  for (const template of VALIDATION_QUEUE_CANONICAL) {
    if (template.id === "observation_history") {
      rows.push({
        id: template.id,
        title: template.title,
        scopeLabel: template.scopeLabel,
        statusLabel: input.hasObservationHistory ? "Confirmed" : template.defaultStatus,
        hint: input.hasObservationHistory
          ? "Observation or OR visit history is on file."
          : sanitizeIntelligenceTabUserCopy(template.defaultHint),
        sectionId: template.sectionId,
      });
      continue;
    }

    const { statusLabel, dbKey } = resolveRowStatus(
      input.contact,
      template.dbKeys,
      meta,
      template.defaultStatus,
    );

    if (statusLabel === "Confirmed" || statusLabel === "Not relevant") continue;

    rows.push({
      id: template.id,
      title: template.title,
      scopeLabel: template.scopeLabel,
      statusLabel,
      hint: resolveRowHint(input.contact, input.planning, dbKey, template.defaultHint),
      dbKey,
      sectionId: template.sectionId,
    });
  }

  return rows;
}

function contextLines(lines: string[]): IntelligenceContextLine[] {
  return lines.map((text, index) => ({
    id: `ctx-${index}-${text.slice(0, 12)}`,
    text: sanitizeIntelligenceTabUserCopy(text),
  }));
}

function buildRecommendedMoves(): IntelligenceRecommendedMove[] {
  const moves: IntelligenceRecommendedMove[] = [
    {
      id: "schedule_intro",
      title: "Schedule intro call",
      description: "Validate workflow, access path, and realistic next step.",
      actionLabel: "Schedule",
      actionKind: "schedule",
    },
    ...(LOG_UPDATE_UI_ENABLED
      ? [
          {
            id: "log_field_update",
            title: "Log field update",
            description:
              "Capture anything learned from provider, office, scheduler, or OR staff.",
            actionLabel: "Log",
            actionKind: "log" as const,
          },
        ]
      : []),
    {
      id: "open_briefing",
      title: "Open tactical briefing",
      description: "Prepare questions for the next touch.",
      actionLabel: "Open",
      actionKind: "open_briefing",
    },
  ];
  return moves;
}

export function buildOperationalIntelligenceWorkspaceView(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  providerId: string;
  providerName?: string | null;
  organizationName?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  relationshipStage?: string | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
  discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  organizationLinked?: boolean;
}): OperationalIntelligenceWorkspaceView | null {
  const dashboard = buildProviderIntelligenceDashboardView(input);
  if (!dashboard || !input.planning) return null;

  const contact = input.contact;
  const launchStats = buildGuidedIntelCaptureLaunchStats(contact, {
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    maturitySnapshot: input.maturitySnapshot,
    discoveryStakeholder: input.discoveryStakeholder,
    organizationBaseline: input.organizationBaseline,
  });

  const deployment = buildCommercialDeploymentReadinessSnapshot({
    contact,
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    organizationBaseline: input.organizationBaseline,
    engagements: input.engagements,
    unresolvedDiscoveryCount: launchStats.unresolvedTotal,
  });

  const stage = input.maturitySnapshot?.stage ?? "early_discovery";
  const title =
    input.maturitySnapshot?.stageLabel ??
    PROVIDER_INTELLIGENCE_MATURITY_LABELS[stage] ??
    "Early discovery";

  const subtitle =
    HEADER_SUBTITLE_BY_STAGE[stage] ?? HEADER_SUBTITLE_BY_STAGE.early_discovery!;

  const hasObservationHistory = resolveIntelligenceObservationHistory({
    cases: input.cases,
    engagements: input.engagements,
  });

  const tactical = buildTacticalRealities({
    facilityGroups: dashboard.facility.groups,
    providerGroups: dashboard.provider.groups,
    facilityBullets: dashboard.scope.facility.bullets,
    providerBullets: dashboard.scope.provider.bullets,
  });

  const facilityLines =
    tactical.facilityAccess.length >= 2
      ? tactical.facilityAccess
      : [...FACILITY_CONTEXT_DEFAULTS];

  const providerLines =
    tactical.surgeonWorkflow.length >= 2
      ? tactical.surgeonWorkflow
      : [...PROVIDER_CONTEXT_DEFAULTS];

  const validationQueue = buildValidationQueue({
    contact,
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    hasObservationHistory,
  });

  return {
    header: {
      eyebrow: "Operational intelligence",
      title: sanitizeIntelligenceTabUserCopy(title),
      subtitle: sanitizeIntelligenceTabUserCopy(subtitle),
      facilityConfidence: shortConfidenceLabel(deployment.facility.tier),
      providerConfidence: shortConfidenceLabel(deployment.provider.tier),
      lastFieldUpdate: resolveLastFieldUpdateLabel(
        contact,
        input.fieldMetadata,
        input.engagements,
      ),
      primaryCtaLabel: "Build account intelligence",
      secondaryCtaLabel: "Log field update",
    },
    validationQueue,
    facilityContext: {
      subtitle: PROVIDER_FIELD_OPS_SECTION.facilityContextMeta,
      lines: contextLines(facilityLines.slice(0, 6)),
    },
    providerContext: {
      subtitle: PROVIDER_FIELD_OPS_SECTION.providerContextMeta,
      lines: contextLines(providerLines.slice(0, 6)),
    },
    recommendedMoves: buildRecommendedMoves(),
    deep: {
      moduleCards: [
        ...dashboard.facility.readinessCards,
        ...dashboard.provider.readinessCards,
      ],
      providerCards: dashboard.provider.readinessCards,
      engagements: dashboard.engagements,
    },
  };
}
