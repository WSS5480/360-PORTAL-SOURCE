import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import {
  buildProviderOverviewCommandIntelligence,
  type ProviderOverviewCommandIntelligenceItem,
} from "@/lib/surgical-sales/buildProviderOverviewCommandIntelligence";
import {
  buildProviderFieldIntelligenceModel,
  providerFieldIntelligenceLinesForOverview,
  PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";

export { PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN };
export type { ProviderOverviewCommandIntelligenceItem };

export type ProviderOverviewFieldIntelligenceRowId =
  | "observation_approval"
  | "scheduler"
  | "credentialing"
  | "champion"
  | "procedure_interests"
  | "workflow_notes"
  | "support_contacts"
  | "facility_notes";

export type ProviderOverviewIntelligenceSummaryItemKind = "progression" | "optional";

export type ProviderOverviewIntelligenceSummaryItem = {
  id: ProviderOverviewFieldIntelligenceRowId;
  label: string;
  value: string;
  detailLine?: string | null;
  kind: ProviderOverviewIntelligenceSummaryItemKind;
  requiredForProgression?: boolean;
};

export type ProviderOverviewIntelligenceSummary = {
  /** Derived command-center intelligence objects — primary overview surface. */
  commandIntelligence: ProviderOverviewCommandIntelligenceItem[];
  /** Legacy field rows — retained for dossier coverage and propagation tests. */
  confirmed: ProviderOverviewIntelligenceSummaryItem[];
  stillLearning: ProviderOverviewIntelligenceSummaryItem[];
};

function buildLegacyFieldIntelligenceSummary(input: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
}): Pick<ProviderOverviewIntelligenceSummary, "confirmed" | "stillLearning"> {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const model = buildProviderFieldIntelligenceModel({
    contact,
    relatedContacts: input.relatedContacts,
  });
  const lines = providerFieldIntelligenceLinesForOverview(model);

  const confirmed: ProviderOverviewIntelligenceSummaryItem[] = [];
  const stillLearning: ProviderOverviewIntelligenceSummaryItem[] = [];

  for (const line of lines) {
    const item: ProviderOverviewIntelligenceSummaryItem = {
      id: line.id as ProviderOverviewFieldIntelligenceRowId,
      label: line.label,
      value: line.value,
      detailLine: line.detailLine,
      kind: line.kind,
      requiredForProgression: line.requiredForProgression,
    };

    if (line.isConfirmed) {
      confirmed.push(item);
    } else {
      stillLearning.push({
        ...item,
        value: PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN,
      });
    }
  }

  return { confirmed, stillLearning };
}

export function buildProviderOverviewIntelligenceSummary(input: {
  contact: Record<string, unknown>;
  organizationName?: string | null;
  specialty?: string | null;
  relatedContacts?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
}): ProviderOverviewIntelligenceSummary {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const legacy = buildLegacyFieldIntelligenceSummary({
    contact,
    relatedContacts: input.relatedContacts,
  });

  return {
    commandIntelligence: buildProviderOverviewCommandIntelligence({
      contact,
      relatedContacts: input.relatedContacts,
      engagements: input.engagements,
    }),
    ...legacy,
  };
}
