/**
 * Discovery intelligence — dynamic open questions from incomplete structured signals.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { discoveryIntelligenceSignalSupportsContact } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import {
  DISCOVERY_FIELD_STATUS,
  isDiscoverySignalStatusResolved,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryFieldStatusLabel,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { WORKFLOW_UNDERSTANDING_QUESTION } from "@/lib/surgical-sales/workflowUnderstandingConstants";

const F = DISCOVERY_FIELD_STATUS;

type OpenQuestionRule = {
  signalId: DiscoveryStructuredSignalId;
  whenStatuses: readonly string[];
  question: string;
  primaryDbKey: string;
  sectionId?: ProviderIntelligenceSectionId;
};

/** Order for display — access blockers first, then clinical, then champion. */
export const DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER: DiscoveryStructuredSignalId[] = [
  "observation_approval",
  "scheduling_owner",
  "facility_vendor_pathway",
  "workflow_visibility",
  "product_alignment",
  "clinical_champion",
];

const OPEN_QUESTION_RULES: OpenQuestionRule[] = [
  {
    signalId: "observation_approval",
    whenStatuses: [F.unknown],
    question: "Has the provider approved observation access?",
    primaryDbKey: "provider_observation_feasibility",
    sectionId: "observation_readiness",
  },
  {
    signalId: "scheduling_owner",
    whenStatuses: [F.unknown],
    question: "Who owns observation scheduling?",
    primaryDbKey: "provider_observation_coordinator_contact",
    sectionId: "observation_readiness",
  },
  {
    signalId: "facility_vendor_pathway",
    whenStatuses: [F.unknown],
    question: "What facility or vendor approval steps are required?",
    primaryDbKey: "provider_observation_access_path",
    sectionId: "observation_readiness",
  },
  {
    signalId: "workflow_visibility",
    whenStatuses: [F.unknown],
    question: WORKFLOW_UNDERSTANDING_QUESTION,
    primaryDbKey: "provider_procedure_focus",
    sectionId: "clinical_workflow",
  },
  {
    signalId: "product_alignment",
    whenStatuses: [F.unknown],
    question: "Which product category appears most relevant based on procedure mix?",
    primaryDbKey: "provider_competitive_products",
    sectionId: "commercial_signals",
  },
  {
    signalId: "clinical_champion",
    whenStatuses: [F.unknown],
    question: "Who inside the account can help move access forward?",
    primaryDbKey: "provider_champion_potential",
    sectionId: "relationship_intelligence",
  },
];

const RULE_BY_SIGNAL_ID = new Map(
  OPEN_QUESTION_RULES.map((rule) => [rule.signalId, rule]),
);

export function openQuestionForIncompleteSignal(
  signalId: DiscoveryStructuredSignalId,
  statusLabel: string,
): string | null {
  const rule = RULE_BY_SIGNAL_ID.get(signalId);
  if (!rule) return null;
  if (isDiscoverySignalStatusResolved(signalId, statusLabel)) return null;
  if (!rule.whenStatuses.includes(statusLabel)) return null;
  return rule.question;
}

export type DiscoveryOpenQuestionRow = {
  id: string;
  label: string;
  statusLabel: string;
  confidenceLabel: string;
  lastUpdatedLabel: string;
  primaryDbKey: string;
  sectionId?: ProviderIntelligenceSectionId;
  supportsContactAssignment: boolean;
  signalId: DiscoveryStructuredSignalId;
};

export function buildDiscoveryOpenQuestionRows(input: {
  contact: Record<string, unknown>;
  confidenceForDbKeys: (
    dbKeys: string[],
    primaryDbKey: string,
    signalId: DiscoveryStructuredSignalId,
    statusLabel: DiscoveryFieldStatusLabel,
  ) => string;
  lastUpdatedForDbKeys: (dbKeys: string[]) => string;
  max?: number;
}): DiscoveryOpenQuestionRow[] {
  const max = input.max ?? 12;
  const rows: DiscoveryOpenQuestionRow[] = [];
  const usedQuestions = new Set<string>();

  for (const signalId of DISCOVERY_OPEN_QUESTION_SIGNAL_ORDER) {
    const rule = RULE_BY_SIGNAL_ID.get(signalId);
    if (!rule) continue;

    const statusLabel = resolveDiscoveryStructuredSignalStatus(signalId, input.contact);
    const question = openQuestionForIncompleteSignal(signalId, statusLabel);
    if (!question) continue;

    const normalized = question.toLowerCase();
    if (usedQuestions.has(normalized)) continue;
    usedQuestions.add(normalized);

    rows.push({
      id: `open:${signalId}`,
      label: question,
      statusLabel: "Open",
      confidenceLabel: input.confidenceForDbKeys(
        [rule.primaryDbKey],
        rule.primaryDbKey,
        signalId,
        statusLabel,
      ),
      lastUpdatedLabel: input.lastUpdatedForDbKeys([rule.primaryDbKey]),
      primaryDbKey: rule.primaryDbKey,
      sectionId: rule.sectionId,
      supportsContactAssignment: discoveryIntelligenceSignalSupportsContact(signalId),
      signalId,
    });

    if (rows.length >= max) break;
  }

  return rows;
}
