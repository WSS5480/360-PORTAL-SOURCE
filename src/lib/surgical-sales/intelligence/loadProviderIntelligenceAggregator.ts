/**
 * Provider Intelligence Context Aggregator — loads all commercial-pathway intelligence
 * and normalizes it into a single chronological timeline.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSurgicalAccountIntelligence } from "@/lib/surgical-sales/fetchSurgicalAccountIntelligence";
import { loadProviderObservationNoteCorpus } from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";
import { loadProviderEngagementsForProfile } from "@/lib/surgical-sales/engagements/loadProviderEngagements";
import { loadProviderObservationCasesForIntelligence } from "@/lib/surgical-sales/loadProviderObservationCasesForIntelligence";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import {
  extractDebriefVisitFacts,
  extractDiscoveryContactFacts,
  extractDiscoveryEngagementFacts,
  extractEvaluationEngagementFacts,
  extractIntroCallFacts,
  extractObservationCaseFacts,
  extractObservationNoteFacts,
  extractOrganizationFacts,
  extractProviderDebriefFacts,
  extractProviderProfileFacts,
  sortTimelineFacts,
} from "@/lib/surgical-sales/intelligence/extractProviderIntelligenceFacts";
import type {
  ProviderIntelligenceAggregatorResult,
  ProviderIntelligenceFact,
  ProviderIntelligenceSourceBucket,
  ProviderIntelligenceSourceType,
} from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";

const ALL_SOURCE_TYPES: ProviderIntelligenceSourceType[] = [
  "discovery_contact",
  "discovery_engagement",
  "intro_call",
  "observation_case",
  "observation_note",
  "provider_debrief",
  "debrief_visit",
  "evaluation_engagement",
  "evaluation_outcome",
  "provider_profile",
  "organization_account",
];

function buildSourceBuckets(
  facts: ProviderIntelligenceFact[],
): ProviderIntelligenceSourceBucket[] {
  return ALL_SOURCE_TYPES.map((sourceType) => {
    const matching = facts.filter((fact) => fact.sourceType === sourceType);
    return {
      sourceType,
      loadedCount: matching.length,
      ignoredCount: 0,
      factIds: matching.map((fact) => fact.id),
    };
  });
}

export async function loadProviderIntelligenceAggregator(
  supabase: SupabaseClient,
  input: {
    providerId: string;
    salesRepId: string;
    organizationId?: string | null;
    contact?: Record<string, unknown> | null;
  },
): Promise<ProviderIntelligenceAggregatorResult> {
  const providerId = input.providerId.trim();
  const salesRepId = input.salesRepId.trim();

  const [contactRes, orgRes, engagementBundle, observationCases, observationCorpus] =
    await Promise.all([
      input.contact
        ? Promise.resolve({ data: input.contact })
        : supabase.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle(),
      input.organizationId
        ? supabase
            .from(SALES_ORGANIZATIONS_TABLE)
            .select("id, name, linked_ordering_account_id")
            .eq("id", input.organizationId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      loadProviderEngagementsForProfile(supabase, {
        providerId,
        salesRepId,
        contact: (input.contact ?? {}) as Record<string, unknown>,
        primaryOrganizationId: input.organizationId ?? null,
      }),
      loadProviderObservationCasesForIntelligence(supabase, { providerId, salesRepId }),
      loadProviderObservationNoteCorpus(supabase, { providerId, salesRepId }),
    ]);

  const contact = (contactRes.data ?? {}) as Record<string, unknown>;
  const organization = orgRes.data as Record<string, unknown> | null;
  const organizationId =
    input.organizationId?.trim() ||
    trimOrNull(contact.organization_id) ||
    trimOrNull(contact.account_id) ||
    trimOrNull(organization?.id) ||
    null;
  const organizationName = trimOrNull(organization?.name);

  const { data: rawEngagements } = await supabase
    .from("surgical_sales_engagements")
    .select(
      "id, engagement_type, status, scheduled_at, engagement_date, updated_at, debrief_completed, debrief_completed_at, debrief_intelligence_snapshot, notes, pre_observation_value_hypothesis, pre_observation_probes, pre_observation_additional_notes",
    )
    .eq("provider_id", providerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  const engagementRows = (rawEngagements ?? []) as Array<Record<string, unknown>>;

  let accountIntelligence = null;
  const accountId =
    trimOrNull(organization?.linked_ordering_account_id) ?? organizationId;

  if (accountId) {
    try {
      const bundle = await fetchSurgicalAccountIntelligence({
        accountId,
        contacts: [
          {
            id: providerId,
            first_name: contact.first_name as string | null,
            last_name: contact.last_name as string | null,
            email: contact.email as string | null,
          },
        ],
      });
      accountIntelligence = bundle.intelligence;
    } catch (error) {
      console.error("[loadProviderIntelligenceAggregator] account intelligence failed", error);
    }
  }

  const facts: ProviderIntelligenceFact[] = [
    ...extractDiscoveryContactFacts(contact),
    ...extractDiscoveryEngagementFacts(engagementBundle.engagements),
    ...extractIntroCallFacts(engagementRows),
    ...extractObservationCaseFacts(observationCases),
    ...extractObservationNoteFacts(observationCorpus),
    ...extractProviderDebriefFacts(engagementRows),
    ...extractDebriefVisitFacts(engagementRows),
    ...extractEvaluationEngagementFacts(engagementRows),
    ...extractProviderProfileFacts(contact, providerId),
    ...extractOrganizationFacts({
      organizationId,
      organizationName,
      accountIntelligence,
    }),
  ];

  const timeline = sortTimelineFacts(facts);

  return {
    providerId,
    salesRepId,
    assembledAt: new Date().toISOString(),
    organizationId,
    organizationName,
    timeline,
    sourceBuckets: buildSourceBuckets(timeline),
    totalFacts: timeline.length,
  };
}

function trimOrNull(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}
