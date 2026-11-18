/**
 * Operational snapshot — synthesized tactical briefing from field intelligence.
 */

import type { IntelligenceScopeBullet, ProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import { synthesizeOperationalInsight } from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import type { ProviderOverviewFieldReadiness } from "@/lib/surgical-sales/buildProviderOverviewFieldReadiness";
import {
  PROVIDER_OVERVIEW_DEFAULT_FACILITY_SIGNALS,
  PROVIDER_OVERVIEW_DEFAULT_PROVIDER_SIGNALS,
  PROVIDER_OVERVIEW_DEFAULT_SUGGESTED_STEP,
} from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";
import type { ProviderOverviewIntelligenceDensity } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";
import { resolveProviderLastActivity } from "@/lib/surgical-sales/buildProviderStrategicSummary";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { formatLastValidatedLine } from "@/lib/surgical-sales/providerIntelligenceFreshness";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  OVERVIEW_CAPTURE_AFTER_TOUCH,
  OVERVIEW_OBSERVATION_VIABILITY_NOT_VALIDATED,
  OVERVIEW_OPERATIONAL_CONFIDENCE_BUILDING,
  OVERVIEW_VISIBILITY_STILL_FORMING,
} from "@/lib/surgical-sales/providerOverviewEarlyDiscoveryVocabulary";
import { shortenOverviewSignalLine } from "@/lib/surgical-sales/providerOverviewSignalCopy";
import {
  providerHasFieldIntelligenceEvidence,
  type ProviderFieldIntelligenceEvidenceInput,
} from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";

export type SnapshotInsight = {
  id: string;
  synthesis: string;
  confidenceLabel?: string | null;
  contextHint?: string | null;
  freshnessLabel?: string | null;
};

export type OperationalSnapshotGroupId = "facility" | "workflow" | "observation" | "readiness";

export type OperationalSnapshotGroup = {
  id: OperationalSnapshotGroupId;
  label: string;
  insights: SnapshotInsight[];
};

export type ProviderOperationalSnapshot = {
  groups: OperationalSnapshotGroup[];
  suggestedNextStep: string;
  briefingFreshness: string | null;
  /** @deprecated Prefer groups — facility environment syntheses */
  facilitySignals: string[];
  /** @deprecated Prefer groups — provider workflow syntheses */
  providerSignals: string[];
};

const GROUP_LABELS: Record<OperationalSnapshotGroupId, string> = {
  facility: "Facility environment",
  workflow: "Provider workflow",
  observation: "Observation viability",
  readiness: "Field readiness",
};

const GROUP_ORDER: OperationalSnapshotGroupId[] = [
  "facility",
  "workflow",
  "observation",
  "readiness",
];

const GAP_SYNTHESIS: Partial<Record<string, string>> = {
  provider_credentialing_status: "Vendor clearance path still forming",
  provider_observation_access_path: "OR access gates not yet validated",
  provider_observation_feasibility: "Observation access not yet confirmed",
  provider_observation_coordinator_contact: "Scheduling owner not yet identified",
  provider_observation_best_days_case_types: "Observation workflow not yet mapped",
  provider_procedure_focus: "Procedure mix still emerging",
  provider_evaluation_openness: "Evaluation posture not yet discussed",
  provider_preference_card_signals: "Dock and preference-card path unclear",
};

const DEFAULT_FACILITY_SYNTHESIS: Record<string, string> = {
  "Vendor clearance path still forming": "Vendor clearance path still forming",
  "Observation workflow developing": "Observation workflow developing",
  "Scheduling pathway emerging": "Scheduling pathway emerging",
};

const DEFAULT_PROVIDER_SYNTHESIS: Record<string, string> = {
  "Procedure mix still emerging": "Procedure mix still emerging",
  "Evaluation openness developing": "Evaluation openness developing",
  "Dock preferences not yet validated": "Dock preferences not yet validated",
};

function resolveSnapshotGroup(dbKey: string): OperationalSnapshotGroupId {
  if (
    /observation|ideal_observation|first_observation|coordinator_contact|best_days_case/i.test(
      dbKey,
    )
  ) {
    return "observation";
  }
  if (isOrganizationIntelligenceDbKey(dbKey)) return "facility";
  return "workflow";
}

function synthesizeFromBullet(
  bullet: IntelligenceScopeBullet,
  contact: Record<string, unknown>,
): string {
  if (bullet.state === "gap" && GAP_SYNTHESIS[bullet.dbKey]) {
    return GAP_SYNTHESIS[bullet.dbKey]!;
  }
  const raw = String(contact[bullet.dbKey] ?? "").trim();
  if (bullet.state === "known" && raw) {
    const insight = synthesizeOperationalInsight(bullet.dbKey, raw);
    if (insight) return shortenOverviewSignalLine(insight, 52);
  }
  return shortenOverviewSignalLine(bullet.line, 52);
}

function freshnessForField(
  dbKey: string,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): string | null {
  const line = formatLastValidatedLine(fieldMeta[dbKey]);
  if (!line) return null;
  if (line.startsWith("Captured ")) {
    return line.replace(/^Captured /, "Updated ");
  }
  return line.replace(/^Last validated /, "Validated ");
}

function insightFromBullet(
  bullet: IntelligenceScopeBullet,
  contact: Record<string, unknown>,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): SnapshotInsight {
  return {
    id: `snap-${bullet.dbKey}`,
    synthesis: synthesizeFromBullet(bullet, contact),
    confidenceLabel: bullet.confidenceLabel ?? (bullet.state === "gap" ? "Needs validation" : null),
    contextHint: bullet.contextHint ?? null,
    freshnessLabel: freshnessForField(bullet.dbKey, fieldMeta),
  };
}

function maxPerGroup(density: ProviderOverviewIntelligenceDensity): number {
  if (density === "sparse") return 2;
  if (density === "developing") return 2;
  return 3;
}

function buildReadinessInsights(input: {
  fieldReadiness: ProviderOverviewFieldReadiness;
  maturityLabel: string;
  openItemCount: number;
  briefingFreshness: string | null;
  density: ProviderOverviewIntelligenceDensity;
}): SnapshotInsight[] {
  const synthesis =
    input.openItemCount > 0
      ? scanLine(
          `${input.maturityLabel} — ${input.openItemCount} open item${input.openItemCount === 1 ? "" : "s"} to resolve`,
          56,
        )
      : scanLine(`${input.maturityLabel} — ${input.fieldReadiness.hint}`, 56);

  return [
    {
      id: "readiness-posture",
      synthesis,
      confidenceLabel:
        input.density === "sparse"
          ? OVERVIEW_VISIBILITY_STILL_FORMING
          : input.density === "grounded"
            ? "Field confidence increasing"
            : OVERVIEW_OPERATIONAL_CONFIDENCE_BUILDING,
      contextHint: input.fieldReadiness.label,
      freshnessLabel: input.briefingFreshness,
    },
  ];
}

function resolveBriefingFreshness(input: {
  contact?: Record<string, unknown>;
  activityTimeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
}): string | null {
  const lastActivity = resolveProviderLastActivity(input.activityTimeline ?? []);
  if (lastActivity?.atLabel) {
    return `Briefing refreshed ${lastActivity.atLabel.toLowerCase()}`;
  }

  const meta = parseProviderIntelligenceFieldMetadata(
    input.contact?.provider_intelligence_field_metadata,
  );
  let newest: Date | null = null;
  for (const m of Object.values(meta)) {
    const iso = m.validated_at || m.updated_at;
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    if (!newest || d > newest) newest = d;
  }
  if (!newest) return null;

  const days = Math.floor((Date.now() - newest.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Operational intelligence updated today";
  if (days === 1) return "Operational intelligence updated yesterday";
  if (days < 14) return `Operational intelligence updated ${days}d ago`;
  return `Operational intelligence updated ${newest.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function buildProviderOperationalSnapshot(input: {
  scope: ProviderIntelligenceScopeDisplay;
  density: ProviderOverviewIntelligenceDensity;
  suggestedNextStep: string;
  organizationLinked?: boolean;
  contact?: Record<string, unknown>;
  fieldReadiness?: ProviderOverviewFieldReadiness;
  maturityLabel?: string;
  openItemCount?: number;
  activityTimeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): ProviderOperationalSnapshot {
  const contact = input.contact ?? {};
  const hasFieldEvidence = providerHasFieldIntelligenceEvidence({
    contact,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
  });

  if (!hasFieldEvidence) {
    return {
      groups: [],
      suggestedNextStep: scanLine(
        input.suggestedNextStep || PROVIDER_OVERVIEW_DEFAULT_SUGGESTED_STEP,
        80,
      ),
      briefingFreshness: null,
      facilitySignals: [],
      providerSignals: [],
    };
  }

  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );
  const preferGaps = input.density === "sparse";
  const cap = maxPerGroup(input.density);
  const briefingFreshness = resolveBriefingFreshness(input);

  const buckets = new Map<OperationalSnapshotGroupId, SnapshotInsight[]>();
  for (const id of GROUP_ORDER) buckets.set(id, []);

  const push = (groupId: OperationalSnapshotGroupId, insight: SnapshotInsight) => {
    const list = buckets.get(groupId)!;
    if (list.some((i) => i.synthesis.toLowerCase() === insight.synthesis.toLowerCase())) return;
    if (list.length >= cap) return;
    list.push(insight);
  };

  const orderBullets = (bullets: IntelligenceScopeBullet[]) =>
    preferGaps
      ? [...bullets.filter((b) => b.state === "gap"), ...bullets.filter((b) => b.state === "known")]
      : [...bullets.filter((b) => b.state === "known"), ...bullets.filter((b) => b.state === "gap")];

  for (const bullet of orderBullets(input.scope.facility.bullets)) {
    if (bullet.state === "empty") continue;
    push(resolveSnapshotGroup(bullet.dbKey), insightFromBullet(bullet, contact, fieldMeta));
  }
  for (const bullet of orderBullets(input.scope.provider.bullets)) {
    if (bullet.state === "empty") continue;
    push(resolveSnapshotGroup(bullet.dbKey), insightFromBullet(bullet, contact, fieldMeta));
  }

  if (input.organizationLinked) {
    push("facility", {
      id: "facility-affiliation",
      synthesis: "Hospital affiliation anchored on file",
      confidenceLabel: "Field confirmed",
      contextHint: "Facility context",
      freshnessLabel: briefingFreshness,
    });
  }

  const fillDefaults = (
    groupId: OperationalSnapshotGroupId,
    defaults: readonly string[],
    map: Record<string, string>,
  ) => {
    const list = buckets.get(groupId)!;
    if (input.density !== "sparse" && list.length > 0) return;
    for (const line of defaults) {
      if (list.length >= cap) break;
      push(groupId, {
        id: `default-${line}`,
        synthesis: map[line] ?? shortenOverviewSignalLine(line, 52),
        confidenceLabel: "Needs validation",
        contextHint: "Awaiting field capture",
      });
    }
  };

  fillDefaults("facility", PROVIDER_OVERVIEW_DEFAULT_FACILITY_SIGNALS, DEFAULT_FACILITY_SYNTHESIS);
  fillDefaults("workflow", PROVIDER_OVERVIEW_DEFAULT_PROVIDER_SIGNALS, DEFAULT_PROVIDER_SYNTHESIS);

  if (buckets.get("observation")!.length === 0) {
    push("observation", {
      id: "obs-default",
      synthesis: "Observation pathway not yet validated",
      confidenceLabel: "Needs validation",
      contextHint: "Confirm on intro or coordinator touch",
    });
  }

  if (input.fieldReadiness && input.maturityLabel) {
    for (const insight of buildReadinessInsights({
      fieldReadiness: input.fieldReadiness,
      maturityLabel: input.maturityLabel,
      openItemCount: input.openItemCount ?? 0,
      briefingFreshness,
      density: input.density,
    })) {
      push("readiness", insight);
    }
  }

  if (input.density === "sparse" && buckets.get("facility")!.length === 0) {
    push("facility", {
      id: "sparse-capture",
      synthesis: OVERVIEW_CAPTURE_AFTER_TOUCH,
      confidenceLabel: OVERVIEW_VISIBILITY_STILL_FORMING,
      contextHint: "Workflow intelligence developing",
    });
  }

  const groups: OperationalSnapshotGroup[] = GROUP_ORDER.map((id) => ({
    id,
    label: GROUP_LABELS[id],
    insights: buckets.get(id) ?? [],
  })).filter((g) => g.insights.length > 0);

  const suggestedNextStep = scanLine(
    input.suggestedNextStep || PROVIDER_OVERVIEW_DEFAULT_SUGGESTED_STEP,
    80,
  );

  const facilitySignals =
    groups.find((g) => g.id === "facility")?.insights.map((i) => i.synthesis) ?? [];
  const providerSignals =
    groups.find((g) => g.id === "workflow")?.insights.map((i) => i.synthesis) ?? [];

  return {
    groups,
    suggestedNextStep,
    briefingFreshness,
    facilitySignals,
    providerSignals,
  };
}
