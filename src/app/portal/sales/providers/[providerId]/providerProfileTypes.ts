import {
  PROVIDER_FIELD_OPS_TAB_LABELS,
  PROVIDER_FIELD_OPS_TAB_MOBILE_LABELS,
} from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import type { ProviderLongitudinalIntelligence } from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";
import type { ProviderVisualEnrichment } from "@/lib/surgical-sales/providerVisualIdentity";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerProfileFields";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { ProviderAiSalesBriefing } from "@/lib/surgical-sales/generateProviderAiSalesBriefing";

export type { ProviderEngagementSummary };

export type ProviderTabId =
  | "overview"
  | "operations"
  | "briefing"
  | "deploy"
  | "intelligence"
  | "engagements"
  | "cases"
  | "opportunities"
  | "activity";

/** Mobile-first procedural field execution (not shown on desktop tab bar). */
export const PROVIDER_DEPLOY_TAB: { id: ProviderTabId; label: string } = {
  id: "deploy",
  label: "Deploy",
};

export type ProviderProfilePayload = {
  ok?: boolean;
  error?: string;
  provider?: Record<string, unknown>;
  specialty?: string | null;
  primary_organization?: { id?: string; name?: string | null; territory?: string | null };
  organization_links?: Record<string, unknown>[];
  related_contacts?: Record<string, unknown>[];
  relationships?: Record<string, unknown>[];
  cases?: Record<string, unknown>[];
  opportunities?: Record<string, unknown>[];
  engagements?: ProviderEngagementSummary[];
  activity_timeline?: Array<Record<string, unknown>>;
  planning_completion?: ProviderPlanningCompletion;
  clinical_discovery_answers?: ProviderClinicalDiscoveryAnswer[];
  relationship_status?: string;
  /** Facility-wide intelligence aggregated from other providers at this site. */
  organization_intelligence_baseline?: OrganizationIntelligenceBaseline | null;
  /** Aggregated observation learning across all linked cases. */
  longitudinal_intelligence?: ProviderLongitudinalIntelligence | null;
  /** Phase 1 UF read model — present when UNIVERSAL_FACTS_READ_MODEL=1. */
  universal_facts_read_model?: UniversalFactsReadModelPayload | null;
  /** Latest completed debrief narrative for dossier backfill (may be another rep's engagement). */
  debrief_narrative_context?: ProviderDebriefNarrativeContext | null;
  /** OpenAI-generated sales briefing. Dossier cards remain deterministic. */
  provider_ai_summary?: ProviderAiSalesBriefing | null;
  /** Optional API-provided overrides for header avatar, org logo, and focus labels. */
  visual_enrichment?: ProviderVisualEnrichment | null;
};

/** Tabs that render only their workspace — no mission/intelligence summary chrome in sticky header. */
export const PROVIDER_TAB_SPECIFIC_WORKSPACES: readonly ProviderTabId[] = [
  "engagements",
  "cases",
  "activity",
  "opportunities",
] as const;

export function isProviderTabSpecificWorkspace(tab: ProviderTabId): boolean {
  return (PROVIDER_TAB_SPECIFIC_WORKSPACES as readonly string[]).includes(tab);
}

/** Primary provider profile tabs (desktop + mobile strip). */
export const PROVIDER_VISIBLE_TAB_IDS = [
  "overview",
  "engagements",
  "cases",
  "intelligence",
  "activity",
] as const satisfies readonly ProviderTabId[];

export const PROVIDER_TABS: { id: ProviderTabId; label: string }[] = PROVIDER_VISIBLE_TAB_IDS.map((id) => ({
  id,
  label: PROVIDER_FIELD_OPS_TAB_LABELS[id],
}));

export function parseProviderTab(
  raw: string | null,
  noteParam?: string | null,
): ProviderTabId {
  if ((noteParam || "").trim() === "1") return "activity";
  const t = (raw || "").toLowerCase();
  const resolved = (t || "overview").toLowerCase();
  if (resolved === "planning") return "intelligence";
  if (
    resolved === "operations" ||
    resolved === "briefing" ||
    resolved === "deploy" ||
    resolved === "intelligence" ||
    resolved === "engagements" ||
    resolved === "cases" ||
    resolved === "opportunities" ||
    resolved === "activity"
  ) {
    return resolved;
  }
  return "overview";
}

/** Mobile primary strip — high-frequency operational sections. */
export const PROVIDER_MOBILE_PRIMARY_TAB_IDS: ProviderTabId[] = [...PROVIDER_VISIBLE_TAB_IDS];

/** @deprecated Mobile overflow menu removed — deploy remains reachable via deep link only. */
export const PROVIDER_MOBILE_MORE_TABS: { id: ProviderTabId; label: string }[] = [];

export function providerTabLabel(id: ProviderTabId): string {
  if (id === "deploy") return PROVIDER_DEPLOY_TAB.label;
  return PROVIDER_TABS.find((t) => t.id === id)?.label ?? id;
}

export function providerMobilePrimaryTabs(): { id: ProviderTabId; label: string }[] {
  return PROVIDER_MOBILE_PRIMARY_TAB_IDS.map((id) => ({
    id,
    label:
      id in PROVIDER_FIELD_OPS_TAB_MOBILE_LABELS
        ? PROVIDER_FIELD_OPS_TAB_MOBILE_LABELS[id as keyof typeof PROVIDER_FIELD_OPS_TAB_MOBILE_LABELS]
        : providerTabLabel(id),
  }));
}

export function providerTabsForViewport(isMobile: boolean): { id: ProviderTabId; label: string }[] {
  if (!isMobile) return PROVIDER_TABS;
  return [...providerMobilePrimaryTabs(), ...PROVIDER_MOBILE_MORE_TABS];
}

export function relStatusLabel(raw: string): string {
  const s = String(raw || "unknown");
  if (s === "strong") return "Strong";
  if (s === "medium") return "Developing";
  if (s === "weak") return "Early";
  return "Unknown";
}

export function formatOppMoney(cents: unknown): string {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    n / 100,
  );
}
