/**
 * Opportunity pipeline — provider-centric prospect view (V1).
 * Opportunities = providers worth pursuing. Product Fits = product-level evidence.
 */

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  isProviderActiveCustomer,
  isProviderOpportunityEligible,
  normalizeProviderCommercialStatus,
} from "@/lib/surgical-sales/providerCommercialStatus";
import { deriveProviderFieldMissionForHealth } from "@/lib/surgical-sales/providerMissionHealth";
import { providerMissionHealthRank } from "@/lib/surgical-sales/providerMissionHealth";
import { providerNeedsDebrief } from "@/lib/surgical-sales/salesExecutionNeedsAction";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryFieldStatus";
import { resolveDiscoveryStructuredSignalStatus } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { formatProviderRelationshipStage } from "@/lib/surgical-sales/providerRelationshipStage";
import { SALES_PATHWAY_STAGE_SHORT_LABELS } from "@/lib/surgical-sales/salesPathwayCanonical";
import { isAdoptionSuccessStage } from "@/lib/sales/stages";

export const OPPORTUNITY_PIPELINE_SECTIONS = [
  "new_prospects",
  "observation_needed",
  "product_fit_emerging",
  "product_fit_validated",
  "evaluation_first_case",
] as const;

export type OpportunityPipelineSectionId = (typeof OPPORTUNITY_PIPELINE_SECTIONS)[number];

export const OPPORTUNITY_PIPELINE_SECTION_META: Record<
  OpportunityPipelineSectionId,
  { label: string; title: string }
> = {
  new_prospects: {
    label: "New Prospects",
    title: "Providers entered but not yet developed",
  },
  observation_needed: {
    label: "Observation Needed",
    title: "Prospects where we need to observe a case to understand fit",
  },
  product_fit_emerging: {
    label: "Product Fit Emerging",
    title: "Early pain points, workflow friction, or product signals",
  },
  product_fit_validated: {
    label: "Product Fit Validated",
    title: "Specific product fit supported by observation or discovery evidence",
  },
  evaluation_first_case: {
    label: "Evaluation / First Case",
    title: "Prospects moving toward product use",
  },
};

export type ProductFitStatus =
  | "validated"
  | "investigating"
  | "possible_fit"
  | "not_enough_evidence";

export type ProductFitEntry = {
  product: string;
  status: ProductFitStatus;
  statusLabel: string;
};

export const PRODUCT_FIT_STATUS_LABEL: Record<ProductFitStatus, string> = {
  validated: "Validated",
  investigating: "Investigating",
  possible_fit: "Possible fit",
  not_enough_evidence: "Not enough evidence",
};

const KNOWN_PRODUCT_FAMILIES: ReadonlyArray<{ id: string; label: string; pattern: RegExp }> = [
  { id: "acsis", label: "ACSIS", pattern: /\bacs?is\b/i },
  { id: "endolumik", label: "Endolumik", pattern: /\bendolumik\b/i },
  { id: "skeletal_dynamics", label: "Skeletal Dynamics", pattern: /\bskeletal\s*dynamics\b/i },
  { id: "biotissue", label: "BioTissue", pattern: /\bbio\s*tissue\b/i },
  { id: "merakris", label: "Merakris", pattern: /\bmerakris\b|\bdermacyte\b/i },
  { id: "telabio", label: "TelaBio", pattern: /\btela\s*bio\b/i },
];

const INTELLIGENCE_TEXT_KEYS = [
  "provider_product_gaps",
  "provider_product_interests",
  "provider_clinical_frustrations",
  "provider_workflow_pain_points",
  "provider_future_opportunity_signals",
  "provider_competitive_products",
  "provider_current_vendors",
  "provider_dissatisfaction_areas",
  "provider_preference_card_signals",
  "provider_staff_frustrations",
] as const;

export type OpportunityPipelineProviderInput = {
  provider: ProviderDirectoryRow;
  contact?: Record<string, unknown> | null;
  hasWonOpportunity?: boolean;
  hasProductSupportCase?: boolean;
  hasObservationCase?: boolean;
  observationDebriefComplete?: boolean;
};

export type OpportunityPipelineRow = {
  providerId: string;
  providerName: string;
  organization: string | null;
  specialty: string | null;
  missionStage: string;
  pathwayStageLabel: string | null;
  lastTouchAt: string | null;
  lastTouchLabel: string | null;
  nextRecommendedAction: string | null;
  productsInUse: string[];
  productFits: ProductFitEntry[];
  observationDebriefStatus: string;
  priorityScore: number;
  priorityLabel: string;
  sectionId: OpportunityPipelineSectionId;
  providerHref: string;
};

function trimText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function collectIntelligenceText(contact: Record<string, unknown> | null | undefined): string {
  if (!contact) return "";
  return INTELLIGENCE_TEXT_KEYS.map((key) => String(contact[key] ?? ""))
    .filter(Boolean)
    .join("\n");
}

function productAlignmentStatus(contact: Record<string, unknown> | null | undefined): string | null {
  if (!contact) return null;
  return resolveDiscoveryStructuredSignalStatus("product_alignment", contact);
}

function hasEmergingFitSignals(contact: Record<string, unknown> | null | undefined): boolean {
  const text = collectIntelligenceText(contact);
  if (!text.trim()) return false;
  return INTELLIGENCE_TEXT_KEYS.some((key) => trimText(contact?.[key]));
}

function hasValidatedProductFit(contact: Record<string, unknown> | null | undefined): boolean {
  const alignment = productAlignmentStatus(contact);
  if (alignment === DISCOVERY_FIELD_STATUS.validated) return true;

  const text = collectIntelligenceText(contact).toLowerCase();
  if (!text) return false;

  return (
    /\bvalidated\b/.test(text) ||
    /\bconfirmed\s+fit\b/.test(text) ||
    /\bevidence\s+of\s+fit\b/.test(text)
  );
}

function resolveProductFitStatus(input: {
  contact: Record<string, unknown> | null | undefined;
  productPattern: RegExp;
  hasObservationEvidence: boolean;
}): ProductFitStatus | null {
  const text = collectIntelligenceText(input.contact);
  if (!input.productPattern.test(text)) return null;

  const alignment = productAlignmentStatus(input.contact);
  if (alignment === DISCOVERY_FIELD_STATUS.validated && input.productPattern.test(text)) {
    return "validated";
  }
  if (input.hasObservationEvidence && input.productPattern.test(text)) {
    return "investigating";
  }
  if (
    /\bpossible\b/i.test(text) ||
    /\binterest\b/i.test(text) ||
    /\bpain\b/i.test(text) ||
    /\bfriction\b/i.test(text)
  ) {
    return "possible_fit";
  }
  return "not_enough_evidence";
}

export function buildProductFitEntries(input: {
  contact?: Record<string, unknown> | null;
  hasObservationEvidence?: boolean;
}): ProductFitEntry[] {
  const contact = input.contact ?? null;
  const hasObservationEvidence = Boolean(input.hasObservationEvidence);
  const entries: ProductFitEntry[] = [];

  for (const family of KNOWN_PRODUCT_FAMILIES) {
    const status = resolveProductFitStatus({
      contact,
      productPattern: family.pattern,
      hasObservationEvidence,
    });
    if (!status) continue;
    entries.push({
      product: family.label,
      status,
      statusLabel: PRODUCT_FIT_STATUS_LABEL[status],
    });
  }

  return entries;
}

function parseProductsInUse(contact: Record<string, unknown> | null | undefined): string[] {
  const raw = trimText(contact?.provider_current_vendors) || trimText(contact?.provider_preference_card_signals);
  if (!raw) return [];
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function formatLastTouch(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const days = Math.max(0, Math.floor(ms / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function deriveNextRecommendedAction(p: ProviderDirectoryRow): string | null {
  if (p.onboarding_status === "draft") return "Complete provider profile";
  if (providerNeedsDebrief(p)) return "Schedule or complete debrief";
  if ((p.upcoming_engagement_count ?? 0) > 0) return "Prepare for upcoming engagement";
  if ((p.linked_opportunities_count ?? 0) > 0) return "Advance evaluation workflow";
  if ((p.recent_case_count ?? 0) === 0) return "Request or schedule observation";
  return "Review discovery intelligence and plan next touch";
}

function deriveObservationDebriefStatus(p: OpportunityPipelineProviderInput): string {
  if (providerNeedsDebrief(p.provider)) return "Debrief needed";
  if (p.observationDebriefComplete) return "Debrief complete";
  if (p.hasObservationCase) return "Observation captured";
  if ((p.provider.recent_case_count ?? 0) > 0) return "Case activity recorded";
  return "No observation yet";
}

function computePriorityScore(p: ProviderDirectoryRow, productFits: ProductFitEntry[]): number {
  let score = 50;
  score -= providerMissionHealthRank(p) * 8;

  const fitBoost = productFits.reduce((max, fit) => {
    if (fit.status === "validated") return Math.max(max, 30);
    if (fit.status === "investigating") return Math.max(max, 20);
    if (fit.status === "possible_fit") return Math.max(max, 12);
    return max;
  }, 0);
  score += fitBoost;

  if (providerNeedsDebrief(p)) score += 15;
  if ((p.linked_opportunities_count ?? 0) > 0) score += 10;

  const lastTouch = p.last_activity_at ? new Date(p.last_activity_at).getTime() : NaN;
  if (Number.isFinite(lastTouch)) {
    const days = (Date.now() - lastTouch) / 86_400_000;
    if (days <= 7) score += 8;
    else if (days > 60) score -= 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function priorityLabel(score: number): string {
  if (score >= 75) return "High priority";
  if (score >= 50) return "Moderate";
  return "Developing";
}

export function classifyOpportunityPipelineSection(
  input: OpportunityPipelineProviderInput,
): OpportunityPipelineSectionId {
  const p = input.provider;
  const contact = input.contact ?? null;

  const movingToEvaluation =
    (p.linked_opportunities_count ?? 0) > 0 ||
    input.hasProductSupportCase ||
    String(p.relationship_stage ?? "").toLowerCase() === "active_evaluation";
  if (movingToEvaluation) return "evaluation_first_case";

  if (hasValidatedProductFit(contact) || buildProductFitEntries({ contact, hasObservationEvidence: true }).some((f) => f.status === "validated")) {
    return "product_fit_validated";
  }

  if (hasEmergingFitSignals(contact)) return "product_fit_emerging";

  const mission = deriveProviderFieldMissionForHealth(p);
  const undeveloped =
    p.onboarding_status === "draft" ||
    mission === "Intro Call Needed" ||
    (!input.hasObservationCase && (p.recent_case_count ?? 0) === 0 && !observationWorkStarted(p));
  if (undeveloped) return "new_prospects";

  const needsObservation =
    mission === "Discovery In Progress" ||
    mission === "Discovery — Approved" ||
    mission === "Observation Scheduled" ||
    mission === "Debrief Ready" ||
    !input.hasObservationCase;
  if (needsObservation) return "observation_needed";

  return "new_prospects";
}

function observationWorkStarted(p: ProviderDirectoryRow): boolean {
  const obs = p.planning_completion?.sections?.find((s) => s.id === "observation_readiness");
  if (!obs) return false;
  return obs.status !== "not_started" || obs.confidence !== "unknown";
}

export function buildOpportunityPipelineRow(input: OpportunityPipelineProviderInput): OpportunityPipelineRow {
  const p = input.provider;
  const contact = input.contact ?? null;
  const productFits = buildProductFitEntries({
    contact,
    hasObservationEvidence: Boolean(input.hasObservationCase || input.observationDebriefComplete),
  });
  const sectionId = classifyOpportunityPipelineSection(input);
  const priorityScore = computePriorityScore(p, productFits);
  const pathwayStage = p.relationship_pathway_stage_id;

  return {
    providerId: p.id,
    providerName: contactDisplayName(p),
    organization: p.primary_organization_name,
    specialty: p.specialty,
    missionStage: deriveProviderFieldMissionForHealth(p),
    pathwayStageLabel: pathwayStage ? SALES_PATHWAY_STAGE_SHORT_LABELS[pathwayStage] : null,
    lastTouchAt: p.last_activity_at,
    lastTouchLabel: formatLastTouch(p.last_activity_at),
    nextRecommendedAction: deriveNextRecommendedAction(p),
    productsInUse: parseProductsInUse(contact),
    productFits,
    observationDebriefStatus: deriveObservationDebriefStatus(input),
    priorityScore,
    priorityLabel: priorityLabel(priorityScore),
    sectionId,
    providerHref: `/portal/sales/providers/${p.id}`,
  };
}

export function filterEligibleOpportunityProviders(
  rows: OpportunityPipelineProviderInput[],
): OpportunityPipelineProviderInput[] {
  return rows.filter((row) =>
    isProviderOpportunityEligible({
      commercialStatus: row.provider.crm_status,
      relationshipStage: row.provider.relationship_stage,
      archivedAt: row.provider.archived_at,
      hasWonOpportunity: row.hasWonOpportunity,
      hasActiveProductSupportCase: row.hasProductSupportCase,
    }),
  );
}

export function groupOpportunityPipelineRows(
  rows: OpportunityPipelineRow[],
): Map<OpportunityPipelineSectionId, OpportunityPipelineRow[]> {
  const grouped = new Map<OpportunityPipelineSectionId, OpportunityPipelineRow[]>(
    OPPORTUNITY_PIPELINE_SECTIONS.map((id) => [id, []]),
  );

  for (const row of rows) {
    grouped.get(row.sectionId)!.push(row);
  }

  for (const sectionId of OPPORTUNITY_PIPELINE_SECTIONS) {
    grouped.set(
      sectionId,
      [...(grouped.get(sectionId) ?? [])].sort((a, b) => b.priorityScore - a.priorityScore),
    );
  }

  return grouped;
}

export function buildOpportunityPipelineView(rows: OpportunityPipelineProviderInput[]): {
  sections: Array<{
    id: OpportunityPipelineSectionId;
    label: string;
    title: string;
    providers: OpportunityPipelineRow[];
  }>;
  totalCount: number;
} {
  const eligible = filterEligibleOpportunityProviders(rows);
  const pipelineRows = eligible.map(buildOpportunityPipelineRow);
  const grouped = groupOpportunityPipelineRows(pipelineRows);

  return {
    totalCount: pipelineRows.length,
    sections: OPPORTUNITY_PIPELINE_SECTIONS.map((id) => ({
      id,
      label: OPPORTUNITY_PIPELINE_SECTION_META[id].label,
      title: OPPORTUNITY_PIPELINE_SECTION_META[id].title,
      providers: grouped.get(id) ?? [],
    })),
  };
}

/** Resolve won opportunity flag from linked opportunity rows. */
export function providerHasWonOpportunity(
  provider: ProviderDirectoryRow,
  opportunities: Array<Record<string, unknown>>,
): boolean {
  for (const opp of opportunities) {
    const stage = String(opp.stage ?? "");
    if (!isAdoptionSuccessStage(stage)) continue;
    const contactMatch =
      String(opp.surgeon_contact_id ?? "") === provider.id ||
      String(opp.physician_name ?? "")
        .trim()
        .toLowerCase() === contactDisplayName(provider).toLowerCase();
    if (contactMatch) return true;
  }
  return false;
}

export function providerRelationshipStageLabel(raw: string | null | undefined): string {
  return formatProviderRelationshipStage(raw);
}

export { isProviderActiveCustomer, isProviderOpportunityEligible, normalizeProviderCommercialStatus };
