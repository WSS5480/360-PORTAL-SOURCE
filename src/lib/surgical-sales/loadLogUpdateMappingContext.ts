import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  buildEngagementIntelligenceReadiness,
  type EngagementIntelligenceReadiness,
} from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import { buildProviderOperationalRisks } from "@/lib/surgical-sales/buildProviderOperationalRisks";
import { resolveProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  extractProviderIntelligenceFieldValuesFromRow,
  loadProviderIntelligenceFieldValues,
} from "@/lib/surgical-sales/logUpdateApplyProvider";
import {
  LOG_UPDATE_GAP_CATALOG,
} from "@/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateMappingInputContext } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import {
  loadDebriefIntelligenceExtractionContext,
  loadDebriefIntelligenceExtractionContextLite,
} from "@/lib/surgical-sales/loadDebriefIntelligenceExtractionContext";

export type LogUpdateDiscoveryLoadMode = "full" | "lite";

export type LoadLogUpdateMappingContextInput = {
  actorUserId: string;
  rawNote: string;
  providerId?: string | null;
  organizationId?: string | null;
  engagementId?: string | null;
  productFocus?: string | null;
  /** Skip duplicate engagement/provider/org fetches when the caller already loaded them. */
  preloaded?: {
    engagement?: Record<string, unknown> | null;
    providerRow?: Record<string, unknown> | null;
    organizationName?: string | null;
    productFocus?: string | null;
  };
  /** `lite` skips engagement history for faster debrief analyze. */
  discoveryLoadMode?: LogUpdateDiscoveryLoadMode;
  /** Use a smaller OpenAI prompt (paired with discoveryLoadMode lite). */
  compactDiscoveryPrompt?: boolean;
};

function readinessSummaryLine(readiness: EngagementIntelligenceReadiness | null): string | null {
  if (!readiness) return null;
  const parts: string[] = [];
  if (readiness.preVisitBlockers.length) {
    parts.push(`observation objectives: ${readiness.preVisitBlockers.map((b) => b.label).join(", ")}`);
  }
  if (readiness.discoveryObjectives.length) {
    parts.push(`discovery targets: ${readiness.discoveryObjectives.slice(0, 3).map((o) => o.label).join(", ")}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function unresolvedGapPhrases(
  text: string,
  existingFields: Record<string, string>,
  learningGapPhrases: string[],
): string[] {
  const fromCatalog = LOG_UPDATE_GAP_CATALOG.filter((g) => !g.satisfied(text, existingFields)).map(
    (g) => g.label,
  );
  const merged = [...fromCatalog, ...learningGapPhrases];
  const seen = new Set<string>();
  return merged.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadLogUpdateMappingContext(
  input: LoadLogUpdateMappingContextInput,
): Promise<LogUpdateMappingInputContext | null> {
  const rawNote = input.rawNote.trim();
  if (!rawNote) return null;

  let providerId = input.providerId?.trim() || null;
  let organizationId = input.organizationId?.trim() || null;
  let engagementId = input.engagementId?.trim() || null;
  let engagementType: string | null = null;
  let productFocus = input.productFocus?.trim() || null;
  let providerName: string | null = null;
  let organizationName: string | null = null;

  let engagementRow: Record<string, unknown> | null =
    input.preloaded?.engagement != null ? input.preloaded.engagement : null;

  if (engagementId && !engagementRow) {
    const engagement = await loadEngagementForPortalActor(engagementId, input.actorUserId, {
      includeArchived: true,
    });
    if (!engagement) {
      engagementId = null;
    } else {
      engagementRow = engagement as Record<string, unknown>;
      providerId = providerId || String(engagement.provider_id ?? "") || null;
      organizationId = organizationId || (engagement.organization_id ? String(engagement.organization_id) : null);
      engagementType = String(engagement.engagement_type ?? "").trim() || null;
      if (!productFocus) {
        productFocus = String(engagement.product_line ?? "").trim() || null;
      }
    }
  } else if (engagementRow) {
    providerId = providerId || String(engagementRow.provider_id ?? "") || null;
    organizationId =
      organizationId || (engagementRow.organization_id ? String(engagementRow.organization_id) : null);
    engagementType = engagementType || String(engagementRow.engagement_type ?? "").trim() || null;
    if (!productFocus) {
      productFocus = String(engagementRow.product_line ?? "").trim() || null;
    }
  }

  let providerRow: Record<string, unknown> | null =
    input.preloaded?.providerRow != null ? input.preloaded.providerRow : null;

  const needsProviderFetch = providerId && !providerRow;
  const needsOrgFetch = organizationId && !input.preloaded?.organizationName;
  const needsOppFetch = Boolean(engagementRow?.opportunity_id) && !productFocus;

  const [providerRes, orgRes, oppRes] = await Promise.all([
    needsProviderFetch
      ? supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId!).maybeSingle()
      : Promise.resolve({ data: null }),
    needsOrgFetch
      ? supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").eq("id", organizationId!).maybeSingle()
      : Promise.resolve({ data: null }),
    needsOppFetch
      ? supabaseAdmin
          .from("sales_opportunities")
          .select("product_line")
          .eq("id", String(engagementRow!.opportunity_id))
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!providerRow && providerRes.data) {
    providerRow = providerRes.data as Record<string, unknown>;
  }
  const orgRow = orgRes.data as { id?: string; name?: string } | null;
  const oppRow = oppRes.data as { product_line?: string | null } | null;

  if (providerRow) {
    providerName = contactDisplayName(providerRow);
    if (!organizationId && providerRow.account_id) {
      organizationId = String(providerRow.account_id);
    }
  }
  if (!organizationName && input.preloaded?.organizationName) {
    organizationName = input.preloaded.organizationName;
  }
  if (orgRow?.name) organizationName = orgRow.name;
  if (!productFocus && oppRow?.product_line) productFocus = String(oppRow.product_line).trim() || null;

  const existingKnownFields = providerRow
    ? extractProviderIntelligenceFieldValuesFromRow(providerRow)
    : providerId
      ? await loadProviderIntelligenceFieldValues(providerId)
      : {};

  const learningGapPhrases = providerRow
    ? buildIntelligenceLearningGaps(providerRow, null, 12).map((g) => g.phrase)
    : [];

  const unresolvedGaps = unresolvedGapPhrases(rawNote, existingKnownFields, learningGapPhrases);

  const operationalRisks = providerRow
    ? buildProviderOperationalRisks({
        contact: providerRow,
        commercialStage: resolveProviderCommercialWorkflowStage({
          relationshipStage: providerRow.relationship_stage as string | null | undefined,
        }),
        maxItems: 8,
      }).map((r) => r.title)
    : [];

  let readinessSummary: string | null = null;
  if (engagementRow && providerRow && engagementType) {
    const readiness = buildEngagementIntelligenceReadiness({
      provider: providerRow,
      engagementType,
      providerId,
    });
    readinessSummary = readinessSummaryLine(readiness);
  }

  const writableFieldKeys = [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS];

  const discoveryLoadMode = input.discoveryLoadMode ?? "full";
  let discoveryContext: DebriefIntelligenceExtractionContext | null = null;
  if (providerRow) {
    try {
      discoveryContext =
        discoveryLoadMode === "lite"
          ? await loadDebriefIntelligenceExtractionContextLite({
              providerRow,
              organizationName,
              productFocus,
            })
          : await loadDebriefIntelligenceExtractionContext({
              actorUserId: input.actorUserId,
              providerRow,
              organizationName,
              productFocus,
            });
    } catch (e: unknown) {
      console.error("[loadLogUpdateMappingContext] discovery context load failed:", e);
      discoveryContext = null;
    }
  }

  return {
    rawNote,
    providerId,
    providerName,
    organizationId,
    organizationName,
    engagementId,
    engagementType,
    productFocus,
    existingKnownFields,
    unresolvedGaps,
    operationalRisks,
    readinessSummary,
    writableFieldKeys,
    discoveryContext,
    compactDiscoveryPrompt: input.compactDiscoveryPrompt ?? discoveryLoadMode === "lite",
  };
}

export type { DebriefIntelligenceExtractionContext };
