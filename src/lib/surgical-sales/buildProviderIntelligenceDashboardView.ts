/**
 * Operational commercialization dashboard — read model for the Intelligence tab.
 */

import {
  buildAccountUnderstandingConfirmCards,
  type AccountUnderstandingConfirmCard,
} from "@/lib/surgical-sales/buildAccountUnderstandingUncertaintyCards";
import {
  buildCommercializationOperationalPicture,
  type CommercializationOperationalPictureLine,
} from "@/lib/surgical-sales/buildCommercializationOperationalPicture";
import {
  buildProviderIntelligenceScopeDisplay,
  type IntelligenceScopeBullet,
  type ProviderIntelligenceScopeDisplay,
} from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { extractEngagementMemoryContextLine } from "@/lib/surgical-sales/engagementMemoryContextLine";
import {
  buildOrganizationIntelligenceSections,
  ORGANIZATION_INTELLIGENCE_SECTION_LABELS,
  type OrganizationIntelligenceSectionId,
} from "@/lib/surgical-sales/organizationIntelligenceArchitecture";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import {
  ACCOUNT_UNDERSTANDING_AREA_ORDER,
  ACCOUNT_UNDERSTANDING_AREAS,
  type AccountUnderstandingAreaId,
} from "@/lib/surgical-sales/providerAccountUnderstanding";
import {
  intelligenceSectionIdForDbKey,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { buildGuidedIntelCaptureLaunchStats } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import {
  buildCommercialDeploymentReadinessSnapshot,
  type CommercialDeploymentReadinessView,
} from "@/lib/surgical-sales/commercialDeploymentReadiness";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { IntelligenceDiscoveryStakeholder } from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { readOrganizationInheritanceFromContact } from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import { buildKnownSummaryForSection } from "@/lib/surgical-sales/buildProviderAccountUnderstandingView";
import {
  buildOperationalReadinessCardsForProvider,
  type OperationalReadinessCardView,
} from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import { getOrganizationAccessContext } from "@/lib/surgical-sales/organizationAccessContext";
import {
  buildImmediateBlockers,
  buildIntelligenceCriticalUnknowns,
  buildOperationalStatusSummary,
  buildRequiredActions,
  buildTacticalRealities,
  resolveIntelligenceObservationHistory,
  sanitizeIntelligenceTabUserCopy,
  type ImmediateBlocker,
  type OperationalStatusSummary,
  type RequiredAction,
  type TacticalRealities,
} from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import { providerProfileFieldContext } from "@/lib/surgical-sales/backgroundIntelligenceSections";

export type IntelligenceDashboardHero = {
  facilityReadiness: CommercialDeploymentReadinessView;
  providerReadiness: CommercialDeploymentReadinessView;
  deploymentRecommendations: string[];
  openGaps: number;
  riskSummary: string;
  discoveryCta: string;
  discoverySubtitle: string;
};

export type IntelligenceDashboardFact = {
  dbKey: string;
  label: string;
  line: string;
  state: IntelligenceScopeBullet["state"];
  scope: IntelligenceScope;
  inherited?: boolean;
};

export type IntelligenceDashboardFactGroup = {
  id: string;
  title: string;
  hint: string;
  facts: IntelligenceDashboardFact[];
};

export type IntelligenceDashboardEngagementTouch = {
  id: string;
  typeLabel: string;
  dateLabel: string;
  statusLabel: string;
  summary: string;
  href: string;
};

export type IntelligenceDashboardAction = {
  id: string;
  label: string;
  detail: string;
  sectionId: ProviderIntelligenceSectionId;
  priority: "high" | "medium";
};

export type ProviderIntelligenceDashboardView = {
  hero: IntelligenceDashboardHero;
  statusSummary: OperationalStatusSummary;
  immediateBlockers: ImmediateBlocker[];
  tacticalRealities: TacticalRealities;
  requiredActions: RequiredAction[];
  facility: {
    organizationName: string;
    inheritedBadge: string;
    groups: IntelligenceDashboardFactGroup[];
    readinessCards: OperationalReadinessCardView[];
  };
  provider: {
    providerName: string;
    groups: IntelligenceDashboardFactGroup[];
    readinessCards: OperationalReadinessCardView[];
  };
  engagements: IntelligenceDashboardEngagementTouch[];
  operationalPicture: {
    lines: CommercializationOperationalPictureLine[];
    recommendedNext: string;
    actions: IntelligenceDashboardAction[];
  };
  scope: ProviderIntelligenceScopeDisplay;
};

const PROVIDER_AREA_ORDER: AccountUnderstandingAreaId[] = [
  "workflow",
  "relationship",
  "operational",
  "commercial",
];

const PROVIDER_ONLY_KEYS = new Set(
  PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey).filter((k) => !isOrganizationIntelligenceDbKey(k)),
);

function bulletToFact(bullet: IntelligenceScopeBullet, inherited?: boolean): IntelligenceDashboardFact {
  return {
    dbKey: bullet.dbKey,
    label: bullet.label,
    line: bullet.line,
    state: bullet.state,
    scope: bullet.scope,
    inherited,
  };
}

function groupFacilityFacts(
  bullets: IntelligenceScopeBullet[],
  contact: Record<string, unknown>,
): IntelligenceDashboardFactGroup[] {
  const bulletByKey = new Map(bullets.map((b) => [b.dbKey, b]));
  return buildOrganizationIntelligenceSections().map((section) => {
    const facts: IntelligenceDashboardFact[] = [];
    for (const field of section.fields) {
      const bullet = bulletByKey.get(field.dbKey);
      if (!bullet) continue;
      const inherited = Boolean(readOrganizationInheritanceFromContact(contact, field.dbKey));
      facts.push(bulletToFact(bullet, inherited));
    }
    return {
      id: section.id,
      title: ORGANIZATION_INTELLIGENCE_SECTION_LABELS[section.id as OrganizationIntelligenceSectionId],
      hint: section.hint,
      facts,
    };
  }).filter((g) => g.facts.length > 0);
}

function groupProviderFacts(bullets: IntelligenceScopeBullet[]): IntelligenceDashboardFactGroup[] {
  const byArea = new Map<AccountUnderstandingAreaId, IntelligenceDashboardFact[]>();
  for (const bullet of bullets) {
    if (!PROVIDER_ONLY_KEYS.has(bullet.dbKey)) continue;
    const sectionId = intelligenceSectionIdForDbKey(bullet.dbKey);
    const areaId = ACCOUNT_UNDERSTANDING_AREA_ORDER.find(
      (id) => ACCOUNT_UNDERSTANDING_AREAS[id].sectionId === sectionId,
    );
    if (!areaId) continue;
    const list = byArea.get(areaId) ?? [];
    list.push(bulletToFact(bullet));
    byArea.set(areaId, list);
  }
  return PROVIDER_AREA_ORDER.filter((areaId) => byArea.has(areaId)).map((areaId) => {
    const def = ACCOUNT_UNDERSTANDING_AREAS[areaId];
    return {
      id: areaId,
      title: def.title,
      hint: def.hint,
      facts: byArea.get(areaId) ?? [],
    };
  });
}

function formatEngagementDate(e: ProviderEngagementSummary): string {
  const raw = e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : "");
  if (!raw) return "Date TBD";
  try {
    return new Date(raw).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(e.engagement_date ?? "Recent");
  }
}

function buildEngagementTouches(
  engagements: ProviderEngagementSummary[] | undefined,
  providerId: string,
): IntelligenceDashboardEngagementTouch[] {
  return [...(engagements ?? [])]
    .sort((a, b) => {
      const ta = new Date(a.updated_at ?? a.scheduled_at ?? a.engagement_date ?? 0).getTime();
      const tb = new Date(b.updated_at ?? b.scheduled_at ?? b.engagement_date ?? 0).getTime();
      return tb - ta;
    })
    .slice(0, 4)
    .map((e) => {
      const memory =
        e.memory_context_line?.trim() ||
        extractEngagementMemoryContextLine({
          notes: e.notes ?? "",
          engagement_type: e.engagement_type,
        }) ||
        "";
      const summary =
        memory ||
        e.outcome_label?.trim() ||
        (e.notes?.trim() ? e.notes.trim().slice(0, 120) : "No debrief captured yet.");
      return {
        id: e.id,
        typeLabel: e.engagement_type_label || e.engagement_type,
        dateLabel: formatEngagementDate(e),
        statusLabel: e.status_label || e.status,
        summary: summary.length > 140 ? `${summary.slice(0, 139)}…` : summary,
        href: `/portal/sales/engagements/${encodeURIComponent(e.id)}?provider_id=${encodeURIComponent(providerId)}`,
      };
    });
}

function buildDashboardActions(cards: AccountUnderstandingConfirmCard[]): IntelligenceDashboardAction[] {
  const ranked = [...cards].sort((a, b) => {
    const risk = (c: AccountUnderstandingConfirmCard) =>
      c.confidenceLevel === "high_risk" ? 0 : c.confidenceLevel === "partial" ? 1 : 2;
    return risk(a) - risk(b);
  });
  return ranked.slice(0, 4).map((card) => ({
    id: card.id,
    label: card.bestNextAction || card.sectionTitle,
    detail: card.tacticalImplication || card.unknown || card.operationalRisk,
    sectionId: card.sectionId,
    priority: card.confidenceLevel === "high_risk" ? "high" : "medium",
  }));
}

export function buildProviderIntelligenceDashboardView(input: {
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
}): ProviderIntelligenceDashboardView | null {
  if (!input.planning) return null;

  const contact = input.contact;
  const orgName = String(input.organizationName ?? "").trim() || "This facility";
  const providerName =
    String(input.providerName ?? "").trim() ||
    contactDisplayName({
      first_name: contact.first_name as string,
      last_name: contact.last_name as string,
      email: contact.email as string,
    }) ||
    "This provider";

  const scope = buildProviderIntelligenceScopeDisplay({
    contact,
    organizationName: orgName,
    providerName,
    organizationBaseline: input.organizationBaseline,
  });

  const launchStats = buildGuidedIntelCaptureLaunchStats(contact, {
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    maturitySnapshot: input.maturitySnapshot,
    discoveryStakeholder: input.discoveryStakeholder,
    organizationBaseline: input.organizationBaseline,
  });

  const deploymentReadiness = buildCommercialDeploymentReadinessSnapshot({
    contact,
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    organizationBaseline: input.organizationBaseline,
    engagements: input.engagements,
    unresolvedDiscoveryCount: launchStats.unresolvedTotal,
  });

  const gaps = buildIntelligenceLearningGaps(contact, input.planning, 24);
  const confirmCards = buildAccountUnderstandingConfirmCards({
    contact,
    gaps,
    knownSummaryForSection: (sectionId) => buildKnownSummaryForSection(contact, sectionId),
    fieldMetadata: input.fieldMetadata,
    planning: input.planning,
  });
  const operationalPictureLines = buildCommercializationOperationalPicture({
    contact,
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    confirmCards,
    gaps,
    engagements: input.engagements,
  });
  const blockerLine =
    operationalPictureLines.find((r) => r.id === "commercial_blockers")?.line ??
    "No major operational risk on file — keep building visibility.";

  const recommendedNext = sanitizeIntelligenceTabUserCopy(
    operationalPictureLines.find((r) => r.id === "recommended_next")?.line ??
      buildDashboardActions(confirmCards)[0]?.label ??
      "Continue operational map discovery.",
  );

  const facilityGroups = groupFacilityFacts(scope.facility.bullets, contact);
  const providerGroups = groupProviderFacts(scope.provider.bullets);

  const signalList = buildIntelligenceCriticalUnknowns({
    scope,
    organizationLinked: Boolean(input.organizationLinked),
    hasObservationHistory: resolveIntelligenceObservationHistory({
      cases: input.cases,
      engagements: input.engagements,
    }),
    combinedTier: deploymentReadiness.combinedTier,
  });

  const statusSummary = buildOperationalStatusSummary({
    contact,
    maturitySnapshot: input.maturitySnapshot,
    nextBestMove: recommendedNext,
    engagements: input.engagements,
    cases: input.cases,
    opportunities: input.opportunities,
    relationshipStage: input.relationshipStage,
  });

  const immediateBlockers = buildImmediateBlockers(
    signalList,
    5,
    providerProfileFieldContext({
      cases: input.cases,
      engagements: input.engagements,
    }),
  );
  const tacticalRealities = buildTacticalRealities({
    facilityGroups,
    providerGroups,
    facilityBullets: scope.facility.bullets,
    providerBullets: scope.provider.bullets,
  });
  const dashboardActions = buildDashboardActions(confirmCards);
  const requiredActions = buildRequiredActions(dashboardActions, {
    excludeLabels: [
      recommendedNext,
      ...immediateBlockers.map((b) => b.title),
    ],
  });

  return {
    hero: {
      facilityReadiness: deploymentReadiness.facility,
      providerReadiness: deploymentReadiness.provider,
      deploymentRecommendations: deploymentReadiness.combinedRecommendations,
      openGaps: launchStats.unresolvedTotal,
      riskSummary: blockerLine,
      discoveryCta: deploymentReadiness.discoveryCta,
      discoverySubtitle: deploymentReadiness.discoverySubtitle,
    },
    statusSummary,
    immediateBlockers,
    tacticalRealities,
    requiredActions,
    facility: {
      organizationName: orgName,
      inheritedBadge: "Inherited across providers",
      groups: facilityGroups,
      readinessCards: getOrganizationAccessContext({
        contact,
        baseline: input.organizationBaseline,
        planning: input.planning,
        fieldMetadata: input.fieldMetadata,
      }).readinessCards,
    },
    provider: {
      providerName,
      groups: providerGroups,
      readinessCards: buildOperationalReadinessCardsForProvider({
        contact,
        planning: input.planning,
        confirmCards,
        fieldMetadata: input.fieldMetadata,
      }),
    },
    engagements: buildEngagementTouches(input.engagements, input.providerId),
    operationalPicture: {
      lines: operationalPictureLines,
      recommendedNext,
      actions: buildDashboardActions(confirmCards),
    },
    scope,
  };
}
