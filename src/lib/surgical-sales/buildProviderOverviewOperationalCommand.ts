/**
 * Provider Overview — read-only command dashboard from canonical operational state.
 */

import { salesPathwayWorkspaceHref } from "@/lib/surgical-sales/deriveSalesPathwayState";
import { sanitizeDiscoveryEvidenceQuote } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderOperationalState,
  sanitizeOperationalUserText,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";
import {
  OPERATIONAL_DOMAIN_LABELS,
  type OperationalIntelligenceDomain,
} from "@/lib/surgical-sales/operationalIntelligenceTypes";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import { buildPathwayIntelligenceForStage } from "@/lib/surgical-sales/pathwayStageIntelligence";
import { pathwayStageIntelligenceSectionLabel } from "@/lib/surgical-sales/pathwayStageIntelligenceLabels";
import { buildProviderDiscoveryMappingHref } from "@/lib/surgical-sales/providerDiscoveryMappingNavigation";
import { resolveProviderIntelligenceAction } from "@/lib/surgical-sales/resolveProviderIntelligenceAction";
import {
  SALES_PATHWAY_STAGE_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export type ProviderOverviewOperationalCommandModel = {
  currentStageLabel: string;
  currentStageId: SalesPathwayStageId;
  intelligenceSectionLabel: string;
  priorityGaps: string[];
  readinessSummary: string;
  nextBestAction: string | null;
  latestSignals: string[];
  discoveryMappingHref: string;
  intelligenceWorkflowLabel: string;
  observationHref: string;
  credentialingHref: string;
};

const STAGE_DOMAIN_FOCUS: Record<SalesPathwayStageId, OperationalIntelligenceDomain[]> = {
  discovery: ["access_readiness", "scheduling_ownership", "credentialing", "relationship"],
  observe: ["observation_readiness", "clinical_fit"],
  debrief: ["clinical_fit", "product_interest"],
  evaluation: ["product_interest", "evaluation_readiness"],
  commitment: ["case_commitment", "evaluation_readiness"],
  outcomes: ["outcomes"],
};

function readinessSummaryLine(
  readinessByDomain: ReturnType<typeof buildProviderOperationalState>["readinessByDomain"],
  currentStage: SalesPathwayStageId,
): string {
  const domains = STAGE_DOMAIN_FOCUS[currentStage] ?? [];
  const parts: string[] = [];

  for (const domain of domains) {
    const readiness = readinessByDomain[domain];
    if (!readiness) continue;
    if (readiness.summary) {
      parts.push(`${readiness.label}: ${readiness.summary}`);
    } else if (readiness.blockReason) {
      parts.push(`${readiness.label}: ${readiness.blockReason}`);
    }
  }

  if (parts.length > 0) {
    return parts.slice(0, 2).join(" · ");
  }

  const confirmed = domains.filter((domain) => readinessByDomain[domain]?.status === "confirmed").length;
  if (domains.length > 0) {
    return `${confirmed} of ${domains.length} readiness areas confirmed`;
  }

  return "Operational readiness tracking in progress";
}

function priorityGapsForStage(
  stageId: SalesPathwayStageId,
  gateInput: PathwayGateInput,
  max = 3,
): string[] {
  return buildPathwayIntelligenceForStage(stageId, gateInput)
    .filter((signal) => !signal.met)
    .slice(0, max)
    .map((signal) => signal.label);
}

function fieldMetadataEvidenceLines(contact: Record<string, unknown>): string[] {
  const raw = contact.provider_intelligence_field_metadata;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  const lines: string[] = [];
  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const quote = sanitizeDiscoveryEvidenceQuote(
      String((value as Record<string, unknown>).evidence_text ?? ""),
    );
    if (quote) {
      lines.push(sanitizeOperationalUserText(quote));
    }
  }
  return lines;
}

function latestFieldSignals(
  state: ReturnType<typeof buildProviderOperationalState>,
  contact: Record<string, unknown>,
  max = 4,
): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];

  const push = (line: string | null | undefined) => {
    const text = sanitizeOperationalUserText(line);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(text);
  };

  for (const quote of fieldMetadataEvidenceLines(contact)) {
    push(quote);
  }

  for (const signal of [...state.mappedEvidence].sort((a, b) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  )) {
    push(signal.evidenceText ?? signal.summary);
    if (!signal.summary && signal.suggestedAnswer) {
      push(`${signal.label}: ${signal.suggestedAnswer}`);
    }
  }

  for (const domain of Object.values(state.readinessByDomain)) {
    push(domain.summary);
    push(domain.blockReason);
  }

  for (const blocker of state.blockers) {
    push(blocker.summary);
  }

  return lines.slice(0, max);
}

function toGateInput(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): PathwayGateInput {
  return {
    contact: input.contact,
    engagements: input.engagements ?? [],
    cases: input.cases ?? [],
  };
}

function buildProviderOverviewOperationalCommand(input: {
  providerId: string;
  contact: Record<string, unknown>;
  gateInput: PathwayGateInput;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewOperationalCommandModel {
  const state = buildProviderOperationalState({
    providerId: input.providerId,
    contact: input.contact,
    gateInput: input.gateInput,
  });

  const currentStageId = state.currentStage as SalesPathwayStageId;
  const currentStageLabel = SALES_PATHWAY_STAGE_LABELS[currentStageId] ?? currentStageId;
  const intelligenceSectionLabel = pathwayStageIntelligenceSectionLabel(currentStageId);
  const priorityGaps = priorityGapsForStage(currentStageId, input.gateInput);
  const readinessSummary = readinessSummaryLine(state.readinessByDomain, currentStageId);
  const nextBestAction = state.nextActions[0]?.label ?? state.blockers[0]?.label ?? null;
  const latestSignals = latestFieldSignals(state, input.contact);

  return {
    currentStageLabel,
    currentStageId,
    intelligenceSectionLabel,
    priorityGaps,
    readinessSummary,
    nextBestAction,
    latestSignals,
    discoveryMappingHref: buildProviderDiscoveryMappingHref({ providerId: input.providerId }),
    intelligenceWorkflowLabel: resolveProviderIntelligenceAction({
      contact: input.contact,
      engagements: input.engagements,
      cases: input.cases,
    }).label,
    observationHref: salesPathwayWorkspaceHref(input.providerId, "observe"),
    credentialingHref: buildProviderDiscoveryMappingHref({
      providerId: input.providerId,
      signalId: "facility_vendor_pathway",
    }),
  };
}

export function buildProviderOverviewOperationalCommandWithEngagements(input: {
  providerId: string;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewOperationalCommandModel {
  const gateInput = toGateInput(input);
  return buildProviderOverviewOperationalCommand({
    ...input,
    gateInput,
  });
}

/** @deprecated Internal stage labels — use SALES_PATHWAY_STAGE_LABELS from salesPathwayCanonical. */
export const STAGE_LABELS = Object.fromEntries(
  Object.entries(SALES_PATHWAY_STAGE_LABELS).map(([id, label]) => [id, label]),
) as Record<SalesPathwayStageId, string>;

/** Domain labels re-exported for operational command summaries. */
export { OPERATIONAL_DOMAIN_LABELS };
