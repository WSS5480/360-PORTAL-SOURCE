/**
 * Discovery Intelligence — operational field narratives (not CRM field labels).
 */

import { DISCOVERY_FIELD_STATUS, type DiscoveryFieldStatusLabel } from "@/lib/surgical-sales/discoveryFieldStatus";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";

const S = DISCOVERY_FIELD_STATUS;

type NarrativeMap = Record<DiscoveryFieldStatusLabel, string>;

const SIGNAL_NARRATIVES: Record<DiscoveryStructuredSignalId, NarrativeMap> = {
  observation_approval: {
    [S.unknown]: "No confirmed provider approval pathway documented yet.",
    [S.captured]: "Approval signals captured in the field — not yet validated for planning.",
    [S.validated]: "Observation approval validated and ready for field planning.",
    [S.conditional]:
      "Observation access conditionally allowed pending credentialing.",
    [S.blocked]: "Provider has declined observation access.",
    [S.notApplicable]: "Observation approval not required for this pursuit.",
  },
  scheduling_owner: {
    [S.unknown]: "No operational scheduling contact identified.",
    [S.captured]: "Scheduling contact named — reachability and role still need confirmation.",
    [S.validated]: "Scheduling owner confirmed for observation coordination.",
    [S.conditional]: "Scheduling contact named — reachability and role still need confirmation.",
    [S.blocked]: "Scheduling ownership not available on file.",
    [S.notApplicable]: "Dedicated scheduling owner not required.",
  },
  facility_vendor_pathway: {
    [S.unknown]: "Vendor access requirements remain unclear.",
    [S.captured]: "Access pathway partially documented — facility and vendor steps need confirmation.",
    [S.validated]: "Facility and vendor access pathway confirmed.",
    [S.conditional]: "Credentialing required before vendor access is complete.",
    [S.blocked]: "Facility or vendor access not available for observation.",
    [S.notApplicable]: "Facility and vendor access not required for observation.",
  },
  observation_logistics: {
    [S.unknown]: "Ideal observation timing and case mix not yet mapped.",
    [S.captured]: "Observation timing noted — not yet confirmed for planning.",
    [S.validated]: "Observation timing and case mix confirmed for planning.",
    [S.conditional]: "Observation timing noted — credentialing must clear first.",
    [S.blocked]: "Observation timing constrained by access or scheduling.",
    [S.notApplicable]: "Observation timing not applicable.",
  },
  workflow_visibility: {
    [S.unknown]: "Procedure workflow understanding not yet captured.",
    [S.captured]: "Workflow understanding forming — maturity may still need field confirmation.",
    [S.validated]: "Procedure workflow understanding validated for planning.",
    [S.conditional]: "Workflow understanding forming — maturity may still need field confirmation.",
    [S.blocked]: "Workflow understanding limited until access opens.",
    [S.notApplicable]: "Procedure workflow intelligence not required.",
  },
  product_alignment: {
    [S.unknown]: "Product fit and competitive context not yet assessed.",
    [S.captured]: "Competitive context noted — fit not yet confirmed.",
    [S.validated]: "Product alignment confirmed for pursuit.",
    [S.conditional]: "Competitive context noted — fit not yet confirmed.",
    [S.blocked]: "Product fit looks limited at current posture.",
    [S.notApplicable]: "Product fit assessment not required.",
  },
  case_opportunity: {
    [S.unknown]: "Case volume and pursuit value not yet sized.",
    [S.captured]: "Case opportunity noted — volume and timing need confirmation.",
    [S.validated]: "Case opportunity confirmed worth pursuing.",
    [S.conditional]: "Case opportunity noted — volume and timing need confirmation.",
    [S.blocked]: "Case pursuit constrained at current volume or access.",
    [S.notApplicable]: "Case opportunity sizing not required.",
  },
  clinical_champion: {
    [S.unknown]: "No clinical champion identified in the account.",
    [S.captured]: "Champion lead noted — influence and commitment need confirmation.",
    [S.validated]: "Clinical champion confirmed for internal advocacy.",
    [S.conditional]: "Champion lead noted — influence and commitment need confirmation.",
    [S.blocked]: "Champion path not open at current posture.",
    [S.notApplicable]: "Clinical champion not required for this stage.",
  },
  decision_influence: {
    [S.unknown]: "Decision influence and buying committee not yet mapped.",
    [S.captured]: "Influence contacts noted — decision map needs confirmation.",
    [S.validated]: "Decision influence mapped and confirmed.",
    [S.conditional]: "Influence contacts noted — decision map needs confirmation.",
    [S.blocked]: "Decision path politically closed on file.",
    [S.notApplicable]: "Decision mapping not required.",
  },
  ...Object.fromEntries(
    (
      [
        "opportunity_clinical_frustrations",
        "opportunity_workflow_inefficiencies",
        "opportunity_products_in_use",
        "opportunity_product_gaps",
        "opportunity_outcome_priorities",
        "opportunity_staff_frustrations",
        "opportunity_future_signals",
      ] as const
    ).map((signalId) => [
      signalId,
      {
        [S.unknown]: "No opportunity signal captured yet.",
        [S.captured]: "Opportunity signal captured — validate before acting on it.",
        [S.validated]: "Opportunity signal validated for pursuit planning.",
        [S.conditional]: "Opportunity signal captured — more detail needed.",
        [S.blocked]: "Opportunity path constrained by access or adoption.",
        [S.notApplicable]: "Opportunity signal not relevant for this stage.",
      },
    ]),
  ),
} as Record<DiscoveryStructuredSignalId, NarrativeMap>;

/** Field-focus line for page-level priority unknowns and blockers. */
const SIGNAL_FIELD_FOCUS: Partial<Record<DiscoveryStructuredSignalId, Partial<NarrativeMap>>> = {
  observation_approval: {
    [S.unknown]: "Observation approval unconfirmed.",
    [S.conditional]: "Credentialing required before observation.",
    [S.blocked]: "Observation access declined.",
  },
  scheduling_owner: {
    [S.unknown]: "Scheduling process still being learned.",
    [S.captured]: "Scheduler referenced — details still open.",
  },
  facility_vendor_pathway: {
    [S.unknown]: "Vendor pathway still being learned.",
    [S.captured]: "Vendor pathway partially learned.",
  },
  observation_logistics: {
    [S.unknown]: "Observation timing unknown.",
    [S.captured]: "Timing unconfirmed.",
  },
  workflow_visibility: {
    [S.unknown]: "Workflow understanding unknown.",
    [S.captured]: "Workflow maturity unconfirmed.",
  },
  product_alignment: {
    [S.unknown]: "Product fit unknown.",
    [S.blocked]: "Product fit limited on file.",
  },
  case_opportunity: {
    [S.unknown]: "Case volume unknown.",
    [S.captured]: "Volume unconfirmed.",
  },
  clinical_champion: {
    [S.unknown]: "No champion identified.",
    [S.captured]: "Champion unconfirmed.",
  },
  decision_influence: {
    [S.unknown]: "Influence unmapped.",
    [S.captured]: "Influence unconfirmed.",
  },
};

export function discoverySignalOperationalNarrative(
  signalId: DiscoveryStructuredSignalId,
  status: DiscoveryFieldStatusLabel,
): string {
  return SIGNAL_NARRATIVES[signalId][status];
}

/** Shorter headline for priority-unknown lists and briefing blockers. */
export function discoverySignalFieldFocusLine(
  signalId: DiscoveryStructuredSignalId,
  status: DiscoveryFieldStatusLabel,
): string | null {
  const focus = SIGNAL_FIELD_FOCUS[signalId]?.[status];
  if (focus) return focus;
  const narrative = SIGNAL_NARRATIVES[signalId]?.[status];
  return narrative ?? null;
}

/** Ultra-short bullets for Provider Overview readiness cards. */
const SIGNAL_BLOCKER_BULLET: Partial<
  Record<DiscoveryStructuredSignalId, Partial<Record<DiscoveryFieldStatusLabel, string>>>
> = {
  observation_approval: {
    [S.unknown]: "Approval unconfirmed",
    [S.captured]: "Approval unconfirmed",
    [S.conditional]: "Credentialing required",
    [S.blocked]: "Access declined",
  },
  scheduling_owner: {
    [S.unknown]: "No scheduler",
    [S.captured]: "Scheduler unconfirmed",
  },
  facility_vendor_pathway: {
    [S.unknown]: "Pathway unknown",
    [S.captured]: "Pathway unconfirmed",
  },
  observation_logistics: {
    [S.unknown]: "Timing unknown",
    [S.captured]: "Timing unconfirmed",
  },
  workflow_visibility: {
    [S.unknown]: "Workflow unknown",
    [S.captured]: "Workflow maturity unconfirmed",
  },
  product_alignment: {
    [S.unknown]: "Fit unknown",
    [S.captured]: "Fit unconfirmed",
    [S.blocked]: "Fit not yet confirmed",
  },
  case_opportunity: {
    [S.unknown]: "Volume unknown",
    [S.captured]: "Volume unconfirmed",
  },
  clinical_champion: {
    [S.unknown]: "No champion",
    [S.captured]: "Champion unconfirmed",
  },
  decision_influence: {
    [S.unknown]: "Influence unknown",
    [S.captured]: "Influence unconfirmed",
  },
};

/** Mission summary strip — operational status bullets (cross-domain). */
const MISSION_STATUS_LINE: Partial<
  Record<DiscoveryStructuredSignalId, Partial<Record<DiscoveryFieldStatusLabel, string>>>
> = {
  observation_approval: {
    [S.unknown]: "Observation access not confirmed",
    [S.captured]: "Observation access not confirmed",
    [S.conditional]: "Credentialing required",
    [S.blocked]: "Observation access declined",
  },
  scheduling_owner: {
    [S.unknown]: "No scheduling owner identified",
    [S.captured]: "Scheduling owner not confirmed",
  },
  facility_vendor_pathway: {
    [S.unknown]: "Access pathway not confirmed",
    [S.captured]: "Access pathway not confirmed",
  },
  observation_logistics: {
    [S.unknown]: "Observation timing not mapped",
    [S.captured]: "Observation timing not confirmed",
  },
  workflow_visibility: {
    [S.unknown]: "Procedure workflow understanding unknown",
    [S.captured]: "Workflow maturity not confirmed",
  },
  product_alignment: {
    [S.unknown]: "Product fit not assessed",
    [S.captured]: "Product fit not confirmed",
  },
  case_opportunity: {
    [S.unknown]: "Case opportunity not sized",
    [S.captured]: "Case opportunity not confirmed",
  },
  clinical_champion: {
    [S.unknown]: "No clinical champion mapped",
    [S.captured]: "Clinical champion not confirmed",
  },
  decision_influence: {
    [S.unknown]: "Decision influence not mapped",
    [S.captured]: "Decision influence not confirmed",
  },
};

export function discoveryMissionStatusLine(
  signalId: DiscoveryStructuredSignalId,
  status: DiscoveryFieldStatusLabel,
): string | null {
  if (status === S.validated || status === S.notApplicable) return null;
  return (
    MISSION_STATUS_LINE[signalId]?.[status] ??
    discoveryReadinessBlockerLine(signalId, status) ??
    discoverySignalFieldFocusLine(signalId, status)
  );
}

export function discoveryReadinessBlockerLine(
  signalId: DiscoveryStructuredSignalId,
  status: DiscoveryFieldStatusLabel,
): string | null {
  if (status === S.validated || status === S.notApplicable) return null;
  const bullet = SIGNAL_BLOCKER_BULLET[signalId]?.[status];
  if (bullet) return bullet;
  const focus = discoverySignalFieldFocusLine(signalId, status);
  if (!focus) return null;
  const short = focus.split("—")[0]?.split(".")[0]?.trim();
  return short || null;
}

export const DISCOVERY_CAPTURE_CONFIDENCE_SUFFIX = {
  awaitingValidation: "Awaiting validation on file",
  readyForPlanning: "Ready for field planning",
  nothingDocumented: "Nothing documented in the field yet",
} as const;
