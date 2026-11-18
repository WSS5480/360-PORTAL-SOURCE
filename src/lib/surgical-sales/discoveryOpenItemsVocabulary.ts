/**
 * Rapid Discovery & intelligence cards — neutral open-item language (not gaps/blockers).
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { sanitizeLegacyIntelligenceUserCopy } from "@/lib/surgical-sales/legacyIntelligenceUserCopy";

export const DISCOVERY_OPEN_ITEMS_COPY = {
  openItems: "Open items",
  stillLearning: "Still learning",
  additionalContext: "Additional context",
  refineLater: "Refine later",
  insightOpportunity: "Insight opportunity",
  operationalRisk: "Operational risk",
  insightOpportunities: "Insight opportunities",
} as const;

/** Fields that can block OR access / observation execution when still unknown. */
export const EXECUTION_RISK_INTELLIGENCE_DB_KEYS = new Set([
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_observation_access_path",
  "provider_observation_feasibility",
  "provider_observation_coordinator_contact",
]);

const EXECUTION_RISK_SECTIONS = new Set<ProviderIntelligenceSectionId>([
  "observation_readiness",
  "or_environment",
]);

export function formatOpenItemsCount(count: number): string {
  if (count <= 0) return "No open items";
  return `${count} open item${count === 1 ? "" : "s"}`;
}

export function formatStillLearningCount(count: number): string {
  if (count <= 0) return DISCOVERY_OPEN_ITEMS_COPY.stillLearning;
  return `${count} ${DISCOVERY_OPEN_ITEMS_COPY.stillLearning.toLowerCase()}`;
}

export function isOperationalExecutionRiskDbKey(
  dbKey: string,
  sectionId?: ProviderIntelligenceSectionId | null,
): boolean {
  if (EXECUTION_RISK_INTELLIGENCE_DB_KEYS.has(dbKey)) return true;
  if (!sectionId || !EXECUTION_RISK_SECTIONS.has(sectionId)) return false;
  return (
    dbKey.includes("credential") ||
    dbKey.includes("observation_access") ||
    dbKey.includes("observation_feasibility") ||
    dbKey.includes("observation_coordinator")
  );
}

/** Sanitize dynamic discovery / card copy that still uses legacy negative terms. */
/** True when summary text describes a real execution/commercialization risk (not a clear-state fallback). */
export function hasOperationalRiskSummary(summary: string): boolean {
  const lower = summary.toLowerCase().trim();
  if (!lower) return false;
  return !/no major|no hard|not flagged|keep building|validate access before scaling/i.test(
    lower,
  );
}

export function sanitizeDiscoveryOpenItemsCopy(text: string): string {
  return sanitizeLegacyIntelligenceUserCopy(
    text
      .replace(/\bunresolved\s+gaps?\b/gi, "open items")
      .replace(/\bintelligence\s+gaps?\b/gi, "open items")
      .replace(/\bdeployment\s+gaps?\b/gi, "open items")
      .replace(/\bunmapped\b/gi, "still learning")
      .replace(/\bnot\s+ready\b/gi, "still learning")
      .replace(/\bmissing\s+fields?\b/gi, "additional context")
      .replace(/\bopen\s+questions?\b/gi, "open items")
      .replace(/\bblockers?\b/gi, "open items")
      .replace(/\bneed(s)?\s+attention\b/gi, "insight opportunities")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}
