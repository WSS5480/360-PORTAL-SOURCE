/**
 * Provider Overview — interactive pathway requirements (operational milestones, not passive checkboxes).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildOperationalIntelligencePathwayView,
  type PathwayIntelligenceItem,
} from "@/lib/surgical-sales/buildOperationalIntelligencePathwayView";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { formatLastValidatedLine } from "@/lib/surgical-sales/providerIntelligenceFreshness";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export type ProviderOverviewRequirementStatus =
  | "unknown"
  | "in_progress"
  | "validated"
  | "blocked"
  | "needs_follow_up";

export const PROVIDER_OVERVIEW_REQUIREMENT_STATUS_LABELS: Record<
  ProviderOverviewRequirementStatus,
  string
> = {
  unknown: "Unknown",
  in_progress: "In progress",
  validated: "Validated",
  blocked: "Declined on file",
  needs_follow_up: "Needs follow-up",
};

export type ProviderOverviewRequirementItem = {
  id: string;
  label: string;
  status: ProviderOverviewRequirementStatus;
  statusLabel: string;
  /** Short operational context shown on the row (scan-first). */
  contextLine: string | null;
  whyItMatters: string;
  knownEvidence: string | null;
  stillNeeded: string | null;
  sourceEngagement: string | null;
  lastUpdated: string | null;
  met: boolean;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};

const STATUS_SORT: Record<ProviderOverviewRequirementStatus, number> = {
  blocked: 0,
  unknown: 1,
  needs_follow_up: 2,
  in_progress: 3,
  validated: 4,
};

function fieldLooksBlocked(dbKey: string, contact: Record<string, unknown>): boolean {
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (/\b(blocked|denied|not allowed|won'?t allow|no vendor clearance)\b/i.test(lower)) return true;
  if (dbKey === "provider_observation_feasibility" && (lower === "no" || lower === "blocked")) {
    return true;
  }
  if (dbKey === "provider_credentialing_status" && /\b(block|denied|vendor)\b/i.test(lower)) {
    return true;
  }
  return false;
}

function resolveOperationalStatus(
  item: PathwayIntelligenceItem,
  contact: Record<string, unknown>,
): ProviderOverviewRequirementStatus {
  if (item.status === "validated") return "validated";

  const dbKey = item.dbKey;
  if (dbKey && fieldLooksBlocked(dbKey, contact)) return "blocked";

  const meta = dbKey ? parseProviderIntelligenceFieldMetadata(contact)[dbKey] : undefined;
  if (meta?.lifecycle_state === "outdated") return "needs_follow_up";

  if (item.status === "confirmed") return "in_progress";
  if (item.status === "not_validated") {
    if (dbKey && fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)) {
      return "in_progress";
    }
    return "needs_follow_up";
  }

  if (dbKey && fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)) {
    return "in_progress";
  }

  return "unknown";
}

function buildContextLine(
  status: ProviderOverviewRequirementStatus,
  item: PathwayIntelligenceItem,
  contact: Record<string, unknown>,
): string | null {
  const meta = item.dbKey ? parseProviderIntelligenceFieldMetadata(contact)[item.dbKey] : undefined;

  if (status === "validated") {
    if (item.sourceEngagement) {
      return scanLine(`Validated during ${item.sourceEngagement}`, 72);
    }
    if (meta) {
      const line = formatLastValidatedLine(meta);
      if (line) return scanLine(line, 72);
    }
    if (item.knownEvidence) {
      return scanLine(item.knownEvidence.replace(/^"|"$/g, ""), 72);
    }
    return "Validated on file";
  }

  if (status === "blocked") {
    if (/credential/i.test(item.requirementLabel)) {
      return scanLine("Credentialing path still open", 72);
    }
    if (/coordinator|schedul/i.test(item.requirementLabel)) {
      return scanLine("Awaiting coordinator confirmation", 72);
    }
    return scanLine(item.stillNeeded ?? "Confirm before advancing", 72);
  }

  if (status === "needs_follow_up") {
    return scanLine(item.stillNeeded ?? "Needs follow-up confirmation", 72);
  }

  if (status === "in_progress") {
    return scanLine(item.stillNeeded ?? "Capture in progress", 72);
  }

  return scanLine(item.stillNeeded ?? "Not yet captured", 72);
}

function buildLastUpdated(
  item: PathwayIntelligenceItem,
  contact: Record<string, unknown>,
): string | null {
  if (!item.dbKey) return null;
  const meta = parseProviderIntelligenceFieldMetadata(contact)[item.dbKey];
  if (!meta) return null;
  const line = formatLastValidatedLine(meta);
  return line ? scanLine(line, 48) : null;
}

function toOverviewItem(
  item: PathwayIntelligenceItem,
  contact: Record<string, unknown>,
): ProviderOverviewRequirementItem {
  const status = resolveOperationalStatus(item, contact);
  return {
    id: item.id,
    label: item.requirementLabel,
    status,
    statusLabel: PROVIDER_OVERVIEW_REQUIREMENT_STATUS_LABELS[status],
    contextLine: buildContextLine(status, item, contact),
    whyItMatters: item.whyItMatters,
    knownEvidence: item.knownEvidence,
    stillNeeded: item.stillNeeded,
    sourceEngagement: item.sourceEngagement,
    lastUpdated: buildLastUpdated(item, contact),
    met: status === "validated",
    dbKey: item.dbKey,
    sectionId: item.sectionId,
  };
}

export function sortProviderOverviewRequirements(
  items: ProviderOverviewRequirementItem[],
): ProviderOverviewRequirementItem[] {
  return [...items].sort((a, b) => {
    const sa = STATUS_SORT[a.status];
    const sb = STATUS_SORT[b.status];
    if (sa !== sb) return sa - sb;
    return a.label.localeCompare(b.label);
  });
}

export function buildProviderOverviewPathwayRequirements(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewRequirementItem[] {
  const view = buildOperationalIntelligencePathwayView(input);
  return sortProviderOverviewRequirements(
    view.requirementsToAdvance.map((item) => toOverviewItem(item, input.contact)),
  );
}

export function providerOverviewRequirementsMetCount(items: ProviderOverviewRequirementItem[]): number {
  return items.filter((r) => r.met).length;
}
