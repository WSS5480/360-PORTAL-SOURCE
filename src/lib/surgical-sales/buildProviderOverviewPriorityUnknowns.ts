/**
 * Provider overview rail — top unresolved discovery questions (not a full open-questions list).
 */

import { buildDiscoveryOpenQuestionRows } from "@/lib/surgical-sales/discoveryIntelligenceOpenQuestions";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { isAdminBackgroundDbKey } from "@/lib/surgical-sales/backgroundIntelligenceSections";
import { isOptionalIntelligenceFieldOnFile } from "@/lib/surgical-sales/optionalIntelligenceCategories";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { providerHasFieldIntelligenceEvidence } from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";

export type ProviderOverviewPriorityUnknown = {
  id: string;
  question: string;
  primaryDbKey: string;
  sectionId?: ProviderIntelligenceSectionId;
};

const OVERVIEW_PRIORITY_UNKNOWN_LIMIT = 2;

export function buildProviderOverviewPriorityUnknowns(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  max?: number;
}): ProviderOverviewPriorityUnknown[] {
  if (
    !providerHasFieldIntelligenceEvidence({
      contact: input.contact,
      engagements: input.engagements,
      cases: input.cases,
    })
  ) {
    return [];
  }

  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const max = input.max ?? OVERVIEW_PRIORITY_UNKNOWN_LIMIT;

  return buildDiscoveryOpenQuestionRows({
    contact,
    confidenceForDbKeys: () => "",
    lastUpdatedForDbKeys: () => "",
    max: max + 4,
  })
    .filter(
      (row) =>
        !isAdminBackgroundDbKey(row.primaryDbKey) &&
        !isOptionalIntelligenceFieldOnFile(row.primaryDbKey, contact),
    )
    .slice(0, max)
    .map((row) => ({
      id: row.signalId,
      question: row.label,
      primaryDbKey: row.primaryDbKey,
      sectionId: row.sectionId,
    }));
}
