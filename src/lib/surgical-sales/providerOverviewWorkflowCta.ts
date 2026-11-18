/**
 * Provider overview — workflow CTAs route to Discovery Mapping (read-only overview).
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { PROVIDER_PROGRESSION_CTA } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import {
  PROVIDER_PROGRESSION_CTA_LOG_CREDENTIALING_STATUS,
  PROVIDER_PROGRESSION_CTA_START_CREDENTIALING,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import {
  discoverySignalIdForDbKey,
  resolveContinueDiscoveryMappingSignal,
} from "@/lib/surgical-sales/providerDiscoveryMappingNavigation";

export type ProviderOverviewWorkflowCtaAction =
  | { type: "open_discovery_mapping"; signalId?: DiscoveryStructuredSignalId }
  | { type: "coordinate_observation"; href: string }
  | { type: "plan_engagement"; href: string }
  | { type: "external_link"; href: string };

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

function parseInternalProviderHref(href: string): {
  workflow: string | null;
  field: string | null;
} {
  if (!href?.trim()) return { workflow: null, field: null };
  try {
    const url = href.startsWith("/")
      ? new URL(href, "https://portal.local")
      : new URL(href);
    return {
      workflow: url.searchParams.get("workflow"),
      field: url.searchParams.get("field"),
    };
  } catch {
    return { workflow: null, field: null };
  }
}

function isExternalNavigationHref(href: string): boolean {
  const h = href.trim();
  if (!h) return false;
  if (h.includes("/engagements/")) return true;
  if (h.includes("panel=debrief")) return true;
  if (h.includes("/portal/sales/engagements/new")) return true;
  const { workflow } = parseInternalProviderHref(h);
  return !workflow;
}

export function isProviderOverviewWorkflowCtaExternal(
  action: ProviderOverviewWorkflowCtaAction,
): boolean {
  return (
    action.type === "external_link" ||
    action.type === "coordinate_observation" ||
    action.type === "plan_engagement"
  );
}

export function resolveProviderOverviewWorkflowCta(input: {
  label: string;
  href: string;
  contact?: Record<string, unknown>;
}): ProviderOverviewWorkflowCtaAction {
  const label = normalizeLabel(input.label);
  const href = input.href?.trim() ?? "";
  const contact = input.contact ?? {};

  if (label.includes("start credentialing")) {
    return { type: "open_discovery_mapping", signalId: "facility_vendor_pathway" };
  }
  if (
    label.includes("log credentialing") ||
    label.includes("update credentialing")
  ) {
    return { type: "open_discovery_mapping", signalId: "facility_vendor_pathway" };
  }
  if (label === normalizeLabel(PROVIDER_PROGRESSION_CTA.continueDiscovery)) {
    return {
      type: "open_discovery_mapping",
      signalId: resolveContinueDiscoveryMappingSignal(contact),
    };
  }
  if (label === normalizeLabel(PROVIDER_PROGRESSION_CTA.validateSchedulingWorkflow)) {
    return { type: "open_discovery_mapping", signalId: "scheduling_owner" };
  }
  if (
    label === normalizeLabel(PROVIDER_PROGRESSION_CTA.coordinateObservation) ||
    label === normalizeLabel(PROVIDER_PROGRESSION_CTA.scheduleObservation) ||
    label.includes("plan observation")
  ) {
    return { type: "coordinate_observation", href: href || "" };
  }
  if (
    label === normalizeLabel(PROVIDER_PROGRESSION_CTA.planEngagement) ||
    label.includes("start intro call")
  ) {
    return { type: "plan_engagement", href: href || "" };
  }

  const { workflow, field } = parseInternalProviderHref(href);
  if (workflow === "scheduling_owner") {
    return { type: "open_discovery_mapping", signalId: "scheduling_owner" };
  }
  if (workflow === "capture_field" && field) {
    if (
      label.includes("log credentialing") ||
      label === normalizeLabel(PROVIDER_PROGRESSION_CTA_LOG_CREDENTIALING_STATUS)
    ) {
      return { type: "open_discovery_mapping", signalId: "facility_vendor_pathway" };
    }
    if (label === normalizeLabel(PROVIDER_PROGRESSION_CTA_START_CREDENTIALING)) {
      return { type: "open_discovery_mapping", signalId: "facility_vendor_pathway" };
    }
    const signalId = discoverySignalIdForDbKey(field);
    return {
      type: "open_discovery_mapping",
      signalId: signalId ?? resolveContinueDiscoveryMappingSignal(contact),
    };
  }

  if (href && isExternalNavigationHref(href)) {
    return { type: "external_link", href };
  }

  if (href) {
    return { type: "external_link", href };
  }

  return {
    type: "open_discovery_mapping",
    signalId: resolveContinueDiscoveryMappingSignal(contact),
  };
}

export function workflowCtaUsesButton(action: ProviderOverviewWorkflowCtaAction): boolean {
  return !isProviderOverviewWorkflowCtaExternal(action);
}

/** @deprecated Overview no longer opens capture drawers — use resolveContinueDiscoveryMappingSignal */
export function resolveContinueDiscoveryCaptureTarget(contact: Record<string, unknown>): {
  dbKey: string;
  sectionId: "observation_readiness";
} {
  const signalId = resolveContinueDiscoveryMappingSignal(contact);
  return { dbKey: signalId, sectionId: "observation_readiness" };
}

/** @deprecated Credentialing edits belong in Discovery Mapping */
export function shouldOpenCredentialingDrawerForDbKey(_dbKey: string): boolean {
  return false;
}

/** @deprecated Use resolveProviderOverviewWorkflowCta */
export function resolveWorkflowCtaFromRecommendation(input: {
  label: string;
  href: string;
  contact?: Record<string, unknown>;
}): ProviderOverviewWorkflowCtaAction {
  return resolveProviderOverviewWorkflowCta(input);
}
