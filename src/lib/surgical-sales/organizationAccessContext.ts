/**
 * Facility-scoped access intelligence read model (org baseline + readiness cards).
 */

import {
  buildOrganizationOperationalReadinessCards,
  type OperationalReadinessCardView,
} from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type OrganizationAccessContext = {
  baseline: OrganizationIntelligenceBaseline | null;
  readinessCards: OperationalReadinessCardView[];
};

/** Synchronous view from an already-loaded org baseline + provider contact mirror. */
export function getOrganizationAccessContext(input: {
  contact: Record<string, unknown>;
  baseline?: OrganizationIntelligenceBaseline | null;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
}): OrganizationAccessContext {
  return {
    baseline: input.baseline ?? null,
    readinessCards: buildOrganizationOperationalReadinessCards({
      contact: input.contact,
      planning: input.planning,
      fieldMetadata: input.fieldMetadata,
    }),
  };
}
