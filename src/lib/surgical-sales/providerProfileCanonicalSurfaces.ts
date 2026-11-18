/**
 * Canonical homes for provider profile concepts — each idea has one system of record.
 *
 * Overview (field deployment):
 * - operational_readiness → deployment briefing (four gates; powered by readiness framework)
 * - execution_blockers → unified blockers panel
 *
 * Intelligence (capture workspace):
 * - operational_progression → horizontal maturity timeline (six phases)
 * - field_time_waste_prevention → proactive visit-failure scan (five threat lanes)
 * - discovery_priorities → intelligence collection queue
 * - validated_intelligence → operational scan by area
 *
 * Do not reintroduce these concepts elsewhere under alternate labels
 * (confidence, pathway confidence, operational risk, execution risk, signal coverage on overview).
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export const PROVIDER_CANONICAL_SURFACE_IDS = [
  "operational_readiness",
  "execution_blockers",
  "field_time_waste_prevention",
  "operational_progression",
  "discovery_priorities",
  "validated_intelligence",
  "field_execution",
] as const;

export type ProviderCanonicalSurfaceId = (typeof PROVIDER_CANONICAL_SURFACE_IDS)[number];

export type ProviderProfileTabId = "overview" | "intelligence" | "briefing";

export type ProviderCanonicalSurfaceDef = {
  id: ProviderCanonicalSurfaceId;
  label: string;
  homeTab: ProviderProfileTabId;
  builder: string;
  panel: string;
};

export const PROVIDER_CANONICAL_SURFACES: Record<ProviderCanonicalSurfaceId, ProviderCanonicalSurfaceDef> =
  {
    operational_readiness: {
      id: "operational_readiness",
      label: "Operational readiness",
      homeTab: "overview",
      builder: "buildProviderOperationalReadinessEngine",
      panel: "ProviderOverviewCommandSummaryPanel",
    },
    execution_blockers: {
      id: "execution_blockers",
      label: "Open items to confirm",
      homeTab: "overview",
      builder: "buildProviderCanonicalExecutionBlockers",
      panel: "ProviderExecutionBlockersPanel",
    },
    field_time_waste_prevention: {
      id: "field_time_waste_prevention",
      label: "Likely risks",
      homeTab: "intelligence",
      builder: "buildProviderFieldTimeWastePrevention",
      panel: "ProviderFieldTimeWastePreventionPanel",
    },
    operational_progression: {
      id: "operational_progression",
      label: "Field readiness path",
      homeTab: "intelligence",
      builder: "buildProviderOperationalProgressionTimeline",
      panel: "ProviderIntelligenceProgressionDashboard",
    },
    discovery_priorities: {
      id: "discovery_priorities",
      label: "Recommended field discoveries",
      homeTab: "intelligence",
      builder: "buildProviderNextDiscoveryPriorities",
      panel: "ProviderNextDiscoveryPrioritiesPanel",
    },
    validated_intelligence: {
      id: "validated_intelligence",
      label: "Confirmed by area",
      homeTab: "intelligence",
      builder: "buildProviderIntelligenceStatusCards",
      panel: "ProviderIntelligenceWorkspaceSummary",
    },
    field_execution: {
      id: "field_execution",
      label: "Field deployment",
      homeTab: "briefing",
      builder: "buildProviderFieldExecutionBriefing",
      panel: "ProviderFieldExecutionMode",
    },
  };

/** Labels retired from UI copy — use canonical surface labels instead. */
export const PROVIDER_RETIRED_SURFACE_LABELS = [
  "Field missions",
  "Discovery priorities",
  "Confidence by area",
  "Pathway confidence",
  "Operational risk",
  "Field execution risk",
  "Signal coverage",
  "Open operational gaps",
  "Priority captures",
] as const;

export function canonicalSurfaceForSection(
  sectionId: ProviderIntelligenceSectionId,
): ProviderCanonicalSurfaceId {
  return "validated_intelligence";
}
