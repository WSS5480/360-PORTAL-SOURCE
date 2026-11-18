/**
 * Operational warnings — calm field cautions with mitigation (max 3).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderCanonicalExecutionBlockers,
  type CanonicalExecutionBlocker,
} from "@/lib/surgical-sales/buildProviderCanonicalExecutionBlockers";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { overviewRiskTitle } from "@/lib/surgical-sales/providerOverviewRiskCopy";

import { OPERATIONAL_WARNINGS_SECTION_TITLE } from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

export { OPERATIONAL_WARNINGS_SECTION_TITLE };
export const OPERATIONAL_WARNINGS_MAX = 3;

const LINE_MAX = 150;

export type OperationalWarningCard = {
  id: string;
  title: string;
  whyItMatters: string;
  reduceRisk: string;
  ctaLabel: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
};

const JARGON_RE =
  /\b(protect field time|operational impact|hard stop|critical|wasted field|high wasted)\b/gi;

function stripJargon(text: string): string {
  return text
    .replace(JARGON_RE, "")
    .replace(/\s*—\s*—/g, " — ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function riskTitle(blocker: CanonicalExecutionBlocker): string {
  return overviewRiskTitle({ dbKey: blocker.dbKey, rawHeadline: stripJargon(blocker.headline) });
}

function riskWhy(blocker: CanonicalExecutionBlocker): string {
  const consequence = blocker.operationalConsequence?.summary?.trim();
  const raw = stripJargon(consequence || blocker.operationalImpact || "");
  if (raw.length < 12) {
    return "This gap can waste a trip if it is still open when you schedule.";
  }
  return scanLine(raw, LINE_MAX);
}

function riskReduce(blocker: CanonicalExecutionBlocker): string {
  let raw = stripJargon(blocker.resolveScan || "");
  raw = raw.replace(/^capture reducer$/i, "Confirm the open item before you book OR time.");
  raw = raw.replace(/^validate before travel$/i, "Validate access and scheduling before booking.");
  if (raw.length < 12) {
    return "Confirm on a short call before booking OR time.";
  }
  return scanLine(raw, LINE_MAX);
}

function riskCta(dbKey: string): string {
  return intelligenceContextualCaptureCta(dbKey);
}

export function canonicalBlockerToWarningCard(blocker: CanonicalExecutionBlocker): OperationalWarningCard {
  return {
    id: blocker.id,
    title: riskTitle(blocker),
    whyItMatters: riskWhy(blocker),
    reduceRisk: riskReduce(blocker),
    ctaLabel: riskCta(blocker.dbKey),
    sectionId: blocker.sectionId,
    dbKey: blocker.dbKey,
  };
}

export function buildProviderOperationalWarningCards(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  maxItems?: number;
}): OperationalWarningCard[] {
  if (!input.planning) return [];

  const relationshipStage = String(
    input.relationshipStage ?? input.contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();

  const commercialStage: ProviderCommercialWorkflowStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  const maxItems = input.maxItems ?? OPERATIONAL_WARNINGS_MAX;

  const blockers = buildProviderCanonicalExecutionBlockers({
    contact: input.contact,
    planning: input.planning,
    commercialStage,
    engagements: input.engagements,
    relationshipStage,
    maxItems: maxItems + 2,
  });

  const seen = new Set<string>();
  const cards: OperationalWarningCard[] = [];

  for (const blocker of blockers) {
    if (cards.length >= maxItems) break;
    const key = blocker.dbKey;
    if (seen.has(key)) continue;
    const titleKey = riskTitle(blocker).toLowerCase();
    if (seen.has(titleKey)) continue;
    seen.add(key);
    seen.add(titleKey);
    cards.push(canonicalBlockerToWarningCard(blocker));
  }

  return cards;
}
