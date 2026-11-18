/**
 * Operational consequence copy for open intelligence gaps — why each gap matters in the field.
 */

import { OVERVIEW_RISK_DESCRIPTION_BY_DB_KEY } from "@/lib/surgical-sales/providerOverviewRiskCopy";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export const PROVIDER_OVERVIEW_OPERATIONAL_IMPACT_LABEL = "Why it matters";

export type IntelligenceGapOperationalConsequence = {
  /** What breaks operationally if this stays unresolved. */
  operationalProblem: string;
  /** Commercial / adoption risk for the account motion. */
  businessRisk: string;
  /** How reps waste or misallocate field time. */
  fieldInefficiency: string;
  /** One-line scan (defaults to field inefficiency). */
  summary: string;
};

type ConsequenceParts = Omit<IntelligenceGapOperationalConsequence, "summary">;

function consequence(parts: ConsequenceParts): IntelligenceGapOperationalConsequence {
  return {
    ...parts,
    summary: scanLine(parts.fieldInefficiency, 96),
  };
}

const DEFAULT_CONSEQUENCE = consequence({
  operationalProblem: "Field time may be wasted until this is confirmed in the OR.",
  businessRisk: "Trial motion may stall without a fresh read on file.",
  fieldInefficiency: "Field time may be wasted until this is confirmed in the OR.",
});

/** Stale validated signals — revalidation missions on Intelligence. */
export const INTELLIGENCE_REVALIDATION_OPERATIONAL_CONSEQUENCE = consequence({
  operationalProblem: "OR access, volume, or influence on file may be out of date.",
  businessRisk: "Trial motion may advance on notes that no longer match the room.",
  fieldInefficiency: "OR day may land on the wrong cases or contacts until you reconfirm.",
});

function applyOverviewRiskLanguage(
  consequences: Record<string, IntelligenceGapOperationalConsequence>,
): Record<string, IntelligenceGapOperationalConsequence> {
  const out = { ...consequences };
  for (const [dbKey, line] of Object.entries(OVERVIEW_RISK_DESCRIPTION_BY_DB_KEY)) {
    if (!out[dbKey]) continue;
    out[dbKey] = consequence({
      operationalProblem: line,
      businessRisk: line,
      fieldInefficiency: line,
    });
  }
  return out;
}

/** Per-field operational consequences — every INTELLIGENCE_GAP_STATE_LABELS key. */
export const INTELLIGENCE_GAP_OPERATIONAL_CONSEQUENCES: Record<
  string,
  IntelligenceGapOperationalConsequence
> = {
  provider_observation_feasibility: consequence({
    operationalProblem: "Observation may be denied at the OR desk after travel is booked.",
    businessRisk: "Clinical validation cannot start until allowance is confirmed with the service line.",
    fieldInefficiency: "Rep travel and OR calendar holds may be wasted on a day observation is not permitted.",
  }),
  provider_observation_access_path: consequence({
    operationalProblem: "How observation access and scheduling coordination work is not documented.",
    businessRisk: "Observation cannot be scheduled reliably while the access workflow stays ambiguous.",
    fieldInefficiency: "Field time may be lost on approval steps that mapping would have surfaced earlier.",
  }),
  provider_observation_credentialing_needed: consequence({
    operationalProblem: "Vendor clearance may not complete before the scheduled observation date.",
    businessRisk: "First-case proof slips while credentialing queues run.",
    fieldInefficiency: "Booked OR days may cancel after reps have already committed travel.",
  }),
  provider_credentialing_status: consequence({
    operationalProblem: "In-room vendor support may be prohibited under current clearance rules.",
    businessRisk: "Product evaluation may pause until hospital vendor policy is satisfied.",
    fieldInefficiency: "Case days may require remote follow-up instead of planned OR presence.",
  }),
  provider_observation_coordinator_contact: consequence({
    operationalProblem: "No validated OR scheduling owner — posting and handoffs stay unreliable.",
    businessRisk: "Observation and trial windows cannot be committed to the account plan.",
    fieldInefficiency: "Rep may miss high-value case windows without a coordinator path.",
  }),
  provider_observation_cadence_preference: consequence({
    operationalProblem: "Realistic observation rhythm is unknown — cadence promises may not hold.",
    businessRisk: "Account plans may over- or under-state evaluation timing versus OR reality.",
    fieldInefficiency: "Rep may miss high-value case windows when posting cadence is unmapped.",
  }),
  provider_observation_best_days_case_types: consequence({
    operationalProblem: "Posting window and service-line case mix for observation are not confirmed.",
    businessRisk: "First observation may not cover procedures that matter for adoption proof.",
    fieldInefficiency: "Booked OR time may land on low-signal days or wrong case types.",
  }),
  provider_ideal_observation_cases: consequence({
    operationalProblem: "Target procedures for observation are not aligned to evaluation hypotheses.",
    businessRisk: "Clinical validation may not produce evidence that moves preference-card work.",
    fieldInefficiency: "Observation day may fail to validate the cases that unlock trials.",
  }),
  provider_first_observation_questions: consequence({
    operationalProblem: "In-room validation goals are not listed — the first case may not answer key questions.",
    businessRisk: "Observation may not reduce uncertainty on product fit or workflow fit.",
    fieldInefficiency: "First OR day may become anecdotal instead of decision-grade.",
  }),
  provider_procedure_focus: consequence({
    operationalProblem: "High-volume procedure mix is unconfirmed — positioning may miss the service line.",
    businessRisk: "SKU and trial design may not match where the surgeon actually operates.",
    fieldInefficiency: "Field talk may target low-volume procedures instead of economic cases.",
  }),
  provider_technique_preferences: consequence({
    operationalProblem: "Open, lap, and robotic mix is unknown — setup story may be wrong for the room.",
    businessRisk: "Evaluation may emphasize the wrong modality for this surgeon.",
    fieldInefficiency: "Demo and observation time may not match how cases are actually performed.",
  }),
  provider_technique_detail: consequence({
    operationalProblem:
      "Instrument and dock preferences not validated in the field — in-room friction may surprise the team.",
    businessRisk: "Product configuration may miss preferences that drive adoption.",
    fieldInefficiency: "OR day may surface avoidable technique mismatches late.",
  }),
  provider_workflow_pain_points: consequence({
    operationalProblem: "Turnover, setup, and team friction are not documented.",
    businessRisk: "Value story may not tie to pain the OR team actually feels.",
    fieldInefficiency: "Product positioning may not align to actual OR pain points.",
  }),
  provider_case_volume_estimate: consequence({
    operationalProblem: "Weekly case volume and mix band are unconfirmed.",
    businessRisk: "Account sizing and trial scope may misstate economic opportunity.",
    fieldInefficiency: "Field and OR time may be mis-prioritized against real volume.",
  }),
  provider_or_team_dynamics: consequence({
    operationalProblem: "Charge nurse, fellow, and turnover patterns are unknown.",
    businessRisk: "Access and trial design may conflict with how the OR team actually runs.",
    fieldInefficiency: "In-room time may be cut short by team rules discovered on arrival.",
  }),
  provider_current_vendors: consequence({
    operationalProblem: "Which vendors are active in cases is not confirmed.",
    businessRisk: "Evaluation design may lack context on systems already in the room.",
    fieldInefficiency: "Commercial conversations may start before operational access is mapped.",
  }),
  provider_competitive_products: consequence({
    operationalProblem: "Competitive footprint in the room is not confirmed.",
    businessRisk: "Trials may run without a plan against entrenched products.",
    fieldInefficiency: "Evaluation meetings may lack competitive proof points reps need.",
  }),
  provider_evaluation_openness: consequence({
    operationalProblem: "Whether they will run a real evaluation is not clear.",
    businessRisk: "Team may push trials before the surgeon has agreed to evaluate.",
    fieldInefficiency: "Field effort may chase a trial before the account is validated for evaluation.",
  }),
  provider_decision_maker_status: consequence({
    operationalProblem: "Preference-card and trial approvers are not identified.",
    businessRisk: "Evaluation may stall on the wrong committee or signatory path.",
    fieldInefficiency: "Trials may advance without authority that can actually convert.",
  }),
  provider_champion_potential: consequence({
    operationalProblem: "Whether anyone inside will back a new vendor is not clear.",
    businessRisk: "Evaluation may lack cover when access or committee pushback appears.",
    fieldInefficiency: "Rep may navigate OR politics alone without someone inside pushing.",
  }),
  influence_level: consequence({
    operationalProblem: "Who moves supply-chain and product choices is not confirmed.",
    businessRisk: "Evaluation effort may target the wrong stakeholder for adoption.",
    fieldInefficiency: "Commercial influence unclear — trials may chase non-deciders.",
  }),
  provider_communication_style: consequence({
    operationalProblem: "How the surgeon wants updates between visits is unknown.",
    businessRisk: "Engagement rhythm may break between case days and stall momentum.",
    fieldInefficiency: "Coordinator handoffs may fail because messaging style was assumed.",
  }),
  provider_responsiveness: consequence({
    operationalProblem: "Office response pattern between case days is not confirmed.",
    businessRisk: "Windows to advance trials may close before follow-up lands.",
    fieldInefficiency: "Rep may plan touches that the office cannot support in time.",
  }),
  provider_support_expectations: consequence({
    operationalProblem: "Expected in-room and clinical support level is not aligned.",
    businessRisk: "Trial commitments may over-promise staffing the account will reject.",
    fieldInefficiency: "OR days may be under- or over-staffed versus surgeon expectations.",
  }),
  provider_follow_up_approach: consequence({
    operationalProblem: "How to stay in touch between case days is not agreed.",
    businessRisk: "Relationship momentum may decay between procedural milestones.",
    fieldInefficiency: "Follow-up may land through the wrong channel or timing.",
  }),
  provider_dissatisfaction_areas: consequence({
    operationalProblem: "Friction with current vendors or workflow is not documented.",
    businessRisk: "Evaluation narrative may lack proof the surgeon already cares about.",
    fieldInefficiency: "Preference-card conversations may start without documented friction on file.",
  }),
  provider_preference_card_signals: consequence({
    operationalProblem: "Preference-card committee path and blockers are not confirmed.",
    businessRisk: "Adoption work may start without knowing who gates card changes.",
    fieldInefficiency: "Card meetings may stall on surprises that mapping would have surfaced.",
  }),
};

const INTELLIGENCE_GAP_OPERATIONAL_CONSEQUENCES_WITH_OVERVIEW_COPY = applyOverviewRiskLanguage(
  INTELLIGENCE_GAP_OPERATIONAL_CONSEQUENCES,
);

/** @deprecated Use INTELLIGENCE_GAP_OPERATIONAL_CONSEQUENCES — flat string for legacy imports. */
export const PROVIDER_OPERATIONAL_IMPACT_BY_DB_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(INTELLIGENCE_GAP_OPERATIONAL_CONSEQUENCES_WITH_OVERVIEW_COPY).map(([key, c]) => [
    key,
    c.summary,
  ]),
);

export function providerOperationalConsequenceForField(
  dbKey: string,
): IntelligenceGapOperationalConsequence {
  return INTELLIGENCE_GAP_OPERATIONAL_CONSEQUENCES_WITH_OVERVIEW_COPY[dbKey] ?? DEFAULT_CONSEQUENCE;
}

export function providerOperationalImpactForField(dbKey: string): string {
  return providerOperationalConsequenceForField(dbKey).summary;
}

export function providerOperationalImpactScan(dbKey: string, maxLen = 72): string {
  return scanLine(providerOperationalImpactForField(dbKey), maxLen);
}

export function formatOperationalConsequenceLines(
  consequence: IntelligenceGapOperationalConsequence,
): string[] {
  return [
    consequence.operationalProblem,
    consequence.businessRisk,
    consequence.fieldInefficiency,
  ];
}
