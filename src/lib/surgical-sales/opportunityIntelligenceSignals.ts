/**
 * Opportunity Intelligence — discovery mapping signals for future product opportunities.
 *
 * Populated automatically from intro debriefs, observation notes, provider debriefs,
 * and product support notes via structured intelligence extraction.
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryStructuredSignalIds";
import type { StageMappingSignalSpec } from "@/lib/surgical-sales/stageMappingAnswerTypes";

export type OpportunityIntelligenceSignalId = Extract<
  DiscoveryStructuredSignalId,
  | "opportunity_clinical_frustrations"
  | "opportunity_workflow_inefficiencies"
  | "opportunity_products_in_use"
  | "opportunity_product_gaps"
  | "opportunity_outcome_priorities"
  | "opportunity_staff_frustrations"
  | "opportunity_future_signals"
>;

export type OpportunityIntelligenceSignalSpec = {
  id: OpportunityIntelligenceSignalId;
  question: string;
  dbKey: string;
  dbKeys: string[];
  helper: string;
  notesPlaceholder: string;
};

export const OPPORTUNITY_INTELLIGENCE_SIGNAL_ORDER: OpportunityIntelligenceSignalId[] = [
  "opportunity_clinical_frustrations",
  "opportunity_workflow_inefficiencies",
  "opportunity_products_in_use",
  "opportunity_product_gaps",
  "opportunity_outcome_priorities",
  "opportunity_staff_frustrations",
  "opportunity_future_signals",
];

export const OPPORTUNITY_INTELLIGENCE_SIGNALS: OpportunityIntelligenceSignalSpec[] = [
  {
    id: "opportunity_clinical_frustrations",
    question: "What clinical frustrations were mentioned?",
    dbKey: "provider_clinical_frustrations",
    dbKeys: ["provider_clinical_frustrations", "provider_dissatisfaction_areas"],
    helper: "Pain points that could drive a future product conversation.",
    notesPlaceholder: "Clinical frustrations, complications, or unmet needs…",
  },
  {
    id: "opportunity_workflow_inefficiencies",
    question: "What workflow inefficiencies were mentioned?",
    dbKey: "provider_workflow_pain_points",
    dbKeys: ["provider_workflow_pain_points"],
    helper: "OR workflow friction that a product could address.",
    notesPlaceholder: "Turnover delays, setup friction, coordination gaps…",
  },
  {
    id: "opportunity_products_in_use",
    question: "What products are currently being used?",
    dbKey: "provider_current_vendors",
    dbKeys: [
      "provider_current_vendors",
      "provider_preference_card_signals",
      "provider_competitive_products",
    ],
    helper: "Products and vendors observed or discussed — including competitors.",
    notesPlaceholder: "Products, trays, implants, competitor systems, or vendors in active use…",
  },
  {
    id: "opportunity_product_gaps",
    question: "What product gaps exist?",
    dbKey: "provider_product_gaps",
    dbKeys: ["provider_product_gaps", "provider_dissatisfaction_areas"],
    helper: "Unmet needs where no incumbent fully solves the problem.",
    notesPlaceholder: "Missing capabilities, workaround behavior, wish-list items…",
  },
  {
    id: "opportunity_outcome_priorities",
    question: "What outcomes does the provider care most about?",
    dbKey: "provider_strategic_goal",
    dbKeys: ["provider_strategic_goal"],
    helper: "Clinical or operational outcomes that would justify adoption.",
    notesPlaceholder: "Turnover, complications, staff burden, patient outcomes…",
  },
  {
    id: "opportunity_staff_frustrations",
    question: "What staff frustrations were mentioned?",
    dbKey: "provider_staff_frustrations",
    dbKeys: ["provider_staff_frustrations", "provider_or_team_dynamics"],
    helper: "Nursing, tech, or coordination pain that affects adoption.",
    notesPlaceholder: "Staff comments, turnover friction, team dynamics…",
  },
  {
    id: "opportunity_future_signals",
    question: "What future opportunities were hinted at?",
    dbKey: "provider_future_opportunity_signals",
    dbKeys: ["provider_future_opportunity_signals", "provider_case_volume_estimate"],
    helper: "Expansion, new service lines, or upcoming evaluation windows.",
    notesPlaceholder: "Future cases, new procedures, growth plans…",
  },
];

const OPPORTUNITY_SIGNAL_BY_ID = Object.fromEntries(
  OPPORTUNITY_INTELLIGENCE_SIGNALS.map((spec) => [spec.id, spec]),
) as Record<OpportunityIntelligenceSignalId, OpportunityIntelligenceSignalSpec>;

export function opportunityIntelligenceSignalSpec(
  signalId: OpportunityIntelligenceSignalId,
): OpportunityIntelligenceSignalSpec {
  return OPPORTUNITY_SIGNAL_BY_ID[signalId];
}

export function isOpportunityIntelligenceSignalId(
  signalId: string,
): signalId is OpportunityIntelligenceSignalId {
  return signalId in OPPORTUNITY_SIGNAL_BY_ID;
}

export const OPPORTUNITY_INTELLIGENCE_DB_KEY_TO_SIGNAL: Record<string, OpportunityIntelligenceSignalId> =
  Object.fromEntries(
    OPPORTUNITY_INTELLIGENCE_SIGNALS.flatMap((spec) =>
      spec.dbKeys.map((dbKey) => [dbKey, spec.id] as const),
    ),
  ) as Record<string, OpportunityIntelligenceSignalId>;

export function opportunitySignalIdForDbKey(dbKey: string): OpportunityIntelligenceSignalId | null {
  return OPPORTUNITY_INTELLIGENCE_DB_KEY_TO_SIGNAL[dbKey] ?? null;
}

const OPPORTUNITY_CAPTURE_CHOICES: StageMappingSignalSpec["choices"] = [
  { value: "captured", label: "Mentioned", tone: "positive" },
  { value: "partial", label: "Partial lead", tone: "partial" },
  { value: "not_discussed", label: "Not discussed", tone: "neutral" },
  { value: "unknown", label: "Unknown", tone: "neutral" },
];

export function buildOpportunityIntelligenceStageMappingSpec(
  spec: OpportunityIntelligenceSignalSpec,
): StageMappingSignalSpec {
  return {
    questionType: "opportunity",
    expectationLevel: "helpful",
    expectationHelper: `${spec.helper} Informational until observation — capture when mentioned.`,
    choices: OPPORTUNITY_CAPTURE_CHOICES,
    notesPlaceholder: spec.notesPlaceholder,
  };
}

export const OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_QUESTIONS: Record<
  OpportunityIntelligenceSignalId,
  string
> = Object.fromEntries(
  OPPORTUNITY_INTELLIGENCE_SIGNALS.map((spec) => [spec.id, spec.question]),
) as Record<OpportunityIntelligenceSignalId, string>;

export const OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_SPECS: Record<
  OpportunityIntelligenceSignalId,
  StageMappingSignalSpec
> = Object.fromEntries(
  OPPORTUNITY_INTELLIGENCE_SIGNALS.map((spec) => [
    spec.id,
    buildOpportunityIntelligenceStageMappingSpec(spec),
  ]),
) as Record<OpportunityIntelligenceSignalId, StageMappingSignalSpec>;
