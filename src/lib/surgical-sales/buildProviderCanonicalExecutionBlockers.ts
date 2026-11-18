/**
 * Execution blockers — single system of record for overview hard stops.
 * Merges operational risks and prioritized intelligence gaps without duplicate headlines.
 */

import { buildProviderOperationalRisks } from "@/lib/surgical-sales/buildProviderOperationalRisks";
import type { ProviderOperationalRisk } from "@/lib/surgical-sales/buildProviderOperationalRisks";
import { buildProviderOverviewStrategyGaps } from "@/lib/surgical-sales/buildProviderOverviewStrategyGaps";
import type { ProviderOverviewOperationalGap } from "@/lib/surgical-sales/buildProviderOverviewStrategyGaps";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { dedupeOperationalRisksForOverview } from "@/lib/surgical-sales/providerOverviewDedup";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { PROVIDER_CANONICAL_SURFACES } from "@/lib/surgical-sales/providerProfileCanonicalSurfaces";
import type { IntelligenceGapOperationalConsequence } from "@/lib/surgical-sales/providerOperationalImpact";
import type { IntelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import {
  buildProtectFieldTimeAssessment,
  type ProtectFieldTimeAssessment,
} from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import { overviewRiskTitle } from "@/lib/surgical-sales/providerOverviewRiskCopy";
import { operationalValidateBeforeDeployLabel } from "@/lib/surgical-sales/providerOperationalActionLabels";
import type { ProtectFieldTimeDimensionId } from "@/lib/surgical-sales/protectFieldTimeVocabulary";
import {
  filterPrimaryAlertItems,
  isAdminBackgroundDbKey,
  type ActiveScheduledFieldContext,
} from "@/lib/surgical-sales/backgroundIntelligenceSections";

export const CANONICAL_EXECUTION_BLOCKERS_TITLE = "Top operational risks";

export type CanonicalExecutionBlockerKind = "hard_stop" | "capture_before_deploy" | "protect_field_time";

export type CanonicalExecutionBlocker = {
  id: string;
  kind: CanonicalExecutionBlockerKind;
  headline: string;
  operationalImpact: string;
  /** Full three-part consequence for intelligence gaps. */
  operationalConsequence?: IntelligenceGapOperationalConsequence;
  resolveScan: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
  severity: "high" | "medium" | "low" | null;
  fieldGuidance?: IntelligenceGapFieldGuidance;
};

function normalizeHeadline(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function gapToBlocker(gap: ProviderOverviewOperationalGap): CanonicalExecutionBlocker {
  return {
    id: `gap:${gap.dbKey}`,
    kind: "capture_before_deploy",
    headline: overviewRiskTitle({ dbKey: gap.dbKey, rawHeadline: gap.headline }),
    operationalImpact: gap.operationalImpact,
    operationalConsequence: gap.operationalConsequence,
    resolveScan: scanLine(gap.unlockScan, 56),
    sectionId: gap.sectionId,
    dbKey: gap.dbKey,
    severity: null,
    fieldGuidance: gap.fieldGuidance,
  };
}

function protectFieldTimeToBlocker(
  protect: ProtectFieldTimeAssessment,
  index: number,
): CanonicalExecutionBlocker {
  const levelOrder = { critical: 3, high: 2, elevated: 1, low: 0 };
  const threats = protect.dimensions
    .filter((d) => d.level === "critical" || d.level === "high")
    .sort((a, b) => levelOrder[b.level] - levelOrder[a.level]);
  const threat = threats[index];

  if (!threat) {
    return {
      id: `protect-field-time:summary`,
      kind: "protect_field_time",
      headline: overviewRiskTitle({
        dbKey: protect.fieldTimeRisk.primaryDbKey ?? "provider_observation_feasibility",
        rawHeadline: protect.headline,
      }),
      operationalImpact: protect.deploymentRecommendation,
      resolveScan: scanLine(
        operationalValidateBeforeDeployLabel(
          protect.fieldTimeRisk.primaryDbKey ?? "provider_observation_feasibility",
        ),
        56,
      ),
      sectionId: protect.fieldTimeRisk.primarySectionId,
      dbKey: protect.fieldTimeRisk.primaryDbKey ?? "provider_observation_feasibility",
      severity: protect.overallLevel === "critical" ? "high" : "medium",
    };
  }

  return {
    id: `protect-field-time:${threat.id}`,
    kind: "protect_field_time",
    headline: overviewRiskTitle({
      protectDimensionId: threat.id as ProtectFieldTimeDimensionId,
      dbKey: threat.dbKey,
      rawHeadline: threat.scan,
    }),
    operationalImpact: threat.scan,
    resolveScan: scanLine(operationalValidateBeforeDeployLabel(threat.dbKey), 56),
    sectionId: threat.sectionId,
    dbKey: threat.dbKey,
    severity: threat.level === "critical" ? "high" : "medium",
  };
}

function riskToBlocker(risk: ProviderOperationalRisk): CanonicalExecutionBlocker {
  return {
    id: `risk:${risk.id}`,
    kind: "hard_stop",
    headline: risk.title,
    operationalImpact: risk.consequenceScan,
    resolveScan: risk.mitigationScan,
    sectionId: risk.sectionId,
    dbKey: risk.dbKey,
    severity: risk.severity,
  };
}

export function buildProviderCanonicalExecutionBlockers(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  relationshipStage?: string | null;
  maxItems?: number;
  fieldContext?: ActiveScheduledFieldContext;
}): CanonicalExecutionBlocker[] {
  const maxItems = input.maxItems ?? 5;
  const relationshipStage = String(
    input.relationshipStage ?? input.contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();

  const protectFieldTime = buildProtectFieldTimeAssessment({
    contact: input.contact,
    relationshipStage,
    commercialStage: input.commercialStage,
    engagements: input.engagements,
  });

  const gaps = buildProviderOverviewStrategyGaps({
    contact: input.contact,
    planning: input.planning,
    commercialStage: input.commercialStage,
    maxItems: maxItems + 2,
  });

  const risks = dedupeOperationalRisksForOverview(
    buildProviderOperationalRisks({
      contact: input.contact,
      commercialStage: input.commercialStage,
      engagements: input.engagements,
    }),
    gaps,
  );

  const seen = new Set<string>();
  const merged: CanonicalExecutionBlocker[] = [];

  if (
    protectFieldTime.posture === "protect_field_time" ||
    protectFieldTime.posture === "hold_field_time"
  ) {
    const protectCount =
      protectFieldTime.posture === "protect_field_time" ? 3 : 2;
    for (let i = 0; i < protectCount; i += 1) {
      const blocker = protectFieldTimeToBlocker(protectFieldTime, i);
      const key = normalizeHeadline(blocker.headline);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(blocker);
      }
    }
  }

  for (const gap of gaps) {
    if (isAdminBackgroundDbKey(gap.dbKey)) continue;
    const key = normalizeHeadline(gap.headline);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(gapToBlocker(gap));
  }

  for (const risk of risks) {
    const key = normalizeHeadline(risk.headline);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(riskToBlocker(risk));
    if (merged.length >= maxItems) break;
  }

  const severityRank = { high: 3, medium: 2, low: 1 };
  const fieldContext: ActiveScheduledFieldContext = input.fieldContext ?? {
    upcomingEngagementCount: (input.engagements ?? []).filter((e) => {
      const status = String(e.status ?? "").trim().toLowerCase();
      return status === "scheduled" || status === "confirmed" || status === "pending";
    }).length,
  };

  return filterPrimaryAlertItems(
    merged.sort((a, b) => {
      const aRank = a.severity ? severityRank[a.severity] : 0;
      const bRank = b.severity ? severityRank[b.severity] : 0;
      if (bRank !== aRank) return bRank - aRank;
      if (a.kind !== b.kind) {
        const kindRank = { protect_field_time: 4, hard_stop: 3, capture_before_deploy: 1 };
        return (kindRank[b.kind] ?? 0) - (kindRank[a.kind] ?? 0);
      }
      return 0;
    }),
    (blocker) => blocker.headline,
    fieldContext,
  ).slice(0, maxItems);
}
