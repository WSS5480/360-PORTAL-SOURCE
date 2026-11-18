/**
 * Mission-oriented discovery priority briefs — impact, unlock, capture source, urgency, confidence.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceGapBestLearnedFrom } from "@/lib/surgical-sales/providerIntelligenceGapDiscoverySource";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import { discoveryPriorityWhyItMatters } from "@/lib/surgical-sales/providerDiscoveryPriorityNarrative";
import { intelligenceUnlocksNextCapability } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import type { DiscoveryPriorityDriver } from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import {
  INTELLIGENCE_REVALIDATION_OPERATIONAL_CONSEQUENCE,
  providerOperationalConsequenceForField,
  type IntelligenceGapOperationalConsequence,
} from "@/lib/surgical-sales/providerOperationalImpact";

export type DiscoveryPriorityUrgency = "critical" | "high" | "medium" | "supporting";

export type DiscoveryPriorityMissionBrief = {
  operationalConsequence: IntelligenceGapOperationalConsequence;
  operationalImpact: string;
  unlockValue: string;
  captureMethod: string;
  confidenceGain: string;
  urgency: DiscoveryPriorityUrgency;
  urgencyLabel: string;
};

type MissionMetaCore = {
  operationalImpact: string;
  unlockValue: string;
  captureMethod: string;
};

const SECTION_OPERATIONAL_READINESS_GAIN: Record<ProviderIntelligenceSectionId, string> = {
  observation_readiness: "Observation readiness → operationally validated",
  clinical_workflow: "Clinical workflow → operationally validated",
  or_environment: "OR access workflow → field-validated",
  relationship_intelligence: "Relationship intelligence → operationally validated",
  commercial_signals: "Commercial path → operationally validated",
};

/** Per-field mission brief (impact, unlock, capture source). */
export const DISCOVERY_PRIORITY_MISSION_META: Record<string, MissionMetaCore> = {
  provider_observation_feasibility: {
    operationalImpact: "Confirms whether observation is worth scheduling before you commit field time.",
    unlockValue: "Observation-ready qualification.",
    captureMethod: "Practice manager or surgeon — allowance conversation.",
  },
  provider_observation_credentialing_needed: {
    operationalImpact: "Surfaces credentialing blockers before the first case day slips.",
    unlockValue: "Bookable observation window.",
    captureMethod: "Credentialing coordinator + vendor rep checklist.",
  },
  provider_ideal_observation_cases: {
    operationalImpact: "Targets high-signal procedures for the first observation day.",
    unlockValue: "Focused case-day plan.",
    captureMethod: "Surgeon preference + scheduler case mix review.",
  },
  provider_observation_access_path: {
    operationalImpact:
      "Maps how observation access works — approvals and scheduler rules — before you commit case days.",
    unlockValue: "Operational access workflow on file.",
    captureMethod: "OR scheduler — how observation access and scheduling coordination work.",
  },
  provider_observation_coordinator_contact: {
    operationalImpact: "Without a scheduler owner, observation dates never hold.",
    unlockValue: "Observation scheduling authority.",
    captureMethod: "Scheduler + circulating nurse.",
  },
  provider_observation_cadence_preference: {
    operationalImpact: "Sets realistic cadence so the account plan matches OR reality.",
    unlockValue: "Repeatable observation rhythm.",
    captureMethod: "OR coordinator",
  },
  provider_observation_best_days_case_types: {
    operationalImpact: "Aligns field time to when cases are posted and bookable.",
    unlockValue: "Calendar-backed observation plan.",
    captureMethod: "Scheduler posting window + case board.",
  },
  provider_first_observation_questions: {
    operationalImpact: "Focuses the first case day on proof that moves evaluation.",
    unlockValue: "Validated in-room hypotheses.",
    captureMethod: "Pre-case huddle with rep + clinical.",
  },
  provider_procedure_focus: {
    operationalImpact: "Aligns product story to procedures that drive volume and revenue.",
    unlockValue: "Procedure-matched positioning.",
    captureMethod: "Surgeon + case log review.",
  },
  provider_technique_preferences: {
    operationalImpact: "Narrows positioning across open, lap, and robotic mix on live cases.",
    unlockValue: "Modality-accurate trials and observations.",
    captureMethod: "Surgeon + PA at preference card review.",
  },
  provider_technique_detail: {
    operationalImpact: "Informs dock, setup, and tray design for the next in-room touch.",
    unlockValue: "Technique-specific evaluation design.",
    captureMethod: "Observation day — setup and dock walkthrough.",
  },
  provider_workflow_pain_points: {
    operationalImpact: "Surfaces turnover and setup friction worth solving in evaluation.",
    unlockValue: "Workflow-led conversion narrative.",
    captureMethod: "Scrub tech or circulating nurse",
  },
  provider_case_volume_estimate: {
    operationalImpact: "Prioritizes field time and forecasts adoption upside by volume band.",
    unlockValue: "Territory prioritization clarity.",
    captureMethod: "Surgeon + scheduling analytics.",
  },
  provider_or_team_dynamics: {
    operationalImpact: "Predicts in-room access, turnover constraints, and who gates vendors.",
    unlockValue: "OR access playbook.",
    captureMethod: "Live case — charge RN and PA dynamics.",
  },
  provider_credentialing_status: {
    operationalImpact: "Determines whether product can be in the room on the next visit.",
    unlockValue: "Vendor clearance path.",
    captureMethod: "Materials manager + credentialing packet.",
  },
  provider_current_vendors: {
    operationalImpact:
      "Maps which vendors are active in cases — informs evaluation design after access is mapped.",
    unlockValue: "Commercial vendor landscape for evaluation.",
    captureMethod: "Supply chain or surgeon — during evaluation, not intro prep.",
  },
  provider_support_expectations: {
    operationalImpact: "Right-sizes clinical and rep support for observations and trials.",
    unlockValue: "Support-matched evaluation motion.",
    captureMethod: "Coordinator + surgeon expectations conversation.",
  },
  provider_communication_style: {
    operationalImpact: "Reduces coordinator bottlenecks and misaligned outreach between visits.",
    unlockValue: "Engagement rhythm that sticks.",
    captureMethod: "First call + office staff cues.",
  },
  provider_responsiveness: {
    operationalImpact: "Predicts deal velocity and follow-up windows between case days.",
    unlockValue: "Realistic pursuit timeline.",
    captureMethod: "Office trial — response time on requests.",
  },
  influence_level: {
    operationalImpact: "Determines adoption pathway and evaluation authority.",
    unlockValue: "Commercialization readiness.",
    captureMethod: "Office manager or supply chain",
  },
  provider_decision_maker_status: {
    operationalImpact: "Avoids pursuing the wrong signatory for trials and preference cards.",
    unlockValue: "Decision-aligned evaluation path.",
    captureMethod: "Surgeon + committee chair mapping.",
  },
  provider_champion_potential: {
    operationalImpact: "Signals internal air cover during evaluation and committee moves.",
    unlockValue: "Champion-backed adoption motion.",
    captureMethod: "Surgeon allies + nursing leadership.",
  },
  provider_follow_up_approach: {
    operationalImpact: "Keeps momentum without over-contacting the office.",
    unlockValue: "Sustainable touch cadence.",
    captureMethod: "Coordinator agreement on channel and frequency.",
  },
  provider_evaluation_openness: {
    operationalImpact: "Decides whether to push trials or stay in observation-only mode.",
    unlockValue: "Evaluation-stage activation.",
    captureMethod: "Surgeon + supply chain lead.",
  },
  provider_competitive_products: {
    operationalImpact: "Shapes evaluation and trial design against systems already in use.",
    unlockValue: "Competitive evaluation frame.",
    captureMethod: "Preference card + materials review.",
  },
  provider_dissatisfaction_areas: {
    operationalImpact: "Strengthens committee and preference-card narratives with real friction.",
    unlockValue: "Evaluation wedge from documented friction.",
    captureMethod: "Nursing + surgeon dissatisfaction listen.",
  },
  provider_preference_card_signals: {
    operationalImpact: "Identifies stakeholders and proof needed for adoption on the card.",
    unlockValue: "Preference-card conversion path.",
    captureMethod: "Materials manager + committee prep.",
  },
};

const URGENCY_LABELS: Record<DiscoveryPriorityUrgency, string> = {
  critical: "Do first",
  high: "High priority",
  medium: "Worth doing next",
  supporting: "When you have time",
};

export function discoveryPriorityUrgency(input: {
  priorityScore: number;
  stageTier: 1 | 2 | 3 | null;
  drivers: DiscoveryPriorityDriver[];
  upcomingEngagements?: number;
}): { urgency: DiscoveryPriorityUrgency; urgencyLabel: string } {
  if (input.drivers.includes("revalidation")) {
    return { urgency: "critical", urgencyLabel: URGENCY_LABELS.critical };
  }
  if (input.stageTier === 1 || input.priorityScore >= 72) {
    return { urgency: "high", urgencyLabel: URGENCY_LABELS.high };
  }
  if (
    input.stageTier === 2 ||
    input.priorityScore >= 48 ||
    (input.upcomingEngagements ?? 0) > 0
  ) {
    return { urgency: "medium", urgencyLabel: URGENCY_LABELS.medium };
  }
  if (input.stageTier === 3) {
    return { urgency: "supporting", urgencyLabel: URGENCY_LABELS.supporting };
  }
  return { urgency: "medium", urgencyLabel: URGENCY_LABELS.medium };
}

function missionMetaCore(
  dbKey: string,
  sectionId: ProviderIntelligenceSectionId,
): MissionMetaCore {
  const unlockValue = intelligenceUnlocksNextCapability(dbKey);
  const direct = DISCOVERY_PRIORITY_MISSION_META[dbKey];
  if (direct) {
    return {
      ...direct,
      unlockValue,
      captureMethod: intelligenceGapBestLearnedFrom(dbKey, sectionId),
    };
  }
  return {
    operationalImpact: discoveryPriorityWhyItMatters(dbKey),
    unlockValue,
    captureMethod: intelligenceGapBestLearnedFrom(dbKey, sectionId),
  };
}

function sectionConfidenceGainLine(sectionId: ProviderIntelligenceSectionId): string {
  return (
    SECTION_OPERATIONAL_READINESS_GAIN[sectionId] ??
    "Intelligence area → operationally validated"
  );
}

export function discoveryPriorityConfidenceGain(
  sectionId: ProviderIntelligenceSectionId,
  revalidate?: boolean,
): string {
  const gain = sectionConfidenceGainLine(sectionId);
  if (revalidate) {
    return `${gain.replace(" → operationally validated", "")} → validated on file`;
  }
  return gain;
}

export function buildDiscoveryPriorityMissionBrief(input: {
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  priorityScore: number;
  stageTier: 1 | 2 | 3 | null;
  drivers: DiscoveryPriorityDriver[];
  upcomingEngagements?: number;
  revalidate?: boolean;
}): DiscoveryPriorityMissionBrief {
  const core = missionMetaCore(input.dbKey, input.sectionId);
  const { urgency, urgencyLabel } = discoveryPriorityUrgency({
    priorityScore: input.priorityScore,
    stageTier: input.stageTier,
    drivers: input.drivers,
    upcomingEngagements: input.upcomingEngagements,
  });

  if (input.revalidate) {
    const operationalConsequence = INTELLIGENCE_REVALIDATION_OPERATIONAL_CONSEQUENCE;
    return {
      operationalConsequence,
      operationalImpact: operationalConsequence.summary,
      unlockValue: "Restores validated intelligence on file.",
      captureMethod: core.captureMethod,
      confidenceGain: discoveryPriorityConfidenceGain(input.sectionId, true),
      urgency,
      urgencyLabel,
    };
  }

  const operationalConsequence = providerOperationalConsequenceForField(input.dbKey);
  return {
    operationalConsequence,
    operationalImpact: operationalConsequence.summary,
    unlockValue: core.unlockValue,
    captureMethod: core.captureMethod,
    confidenceGain: discoveryPriorityConfidenceGain(input.sectionId),
    urgency,
    urgencyLabel,
  };
}

/** Profile-complete maintenance mission. */
const REFRESH_CONSEQUENCE = providerOperationalConsequenceForField("provider_follow_up_approach");

export const DISCOVERY_PRIORITY_REFRESH_MISSION: DiscoveryPriorityMissionBrief = {
  operationalConsequence: REFRESH_CONSEQUENCE,
  operationalImpact:
    "Small deltas after case days keep the plan aligned with how the account runs today.",
  unlockValue: "Strategic account accuracy.",
  captureMethod: "Post-case debrief or coordinator check-in.",
  confidenceGain: "Maintains operationally validated sections on file",
  urgency: "supporting",
  urgencyLabel: URGENCY_LABELS.supporting,
};
