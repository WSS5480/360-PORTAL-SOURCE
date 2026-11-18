import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryFieldStatus";

const F = DISCOVERY_FIELD_STATUS;

/**
 * Legacy grouped constants — values align with {@link DISCOVERY_FIELD_STATUS}.
 * Kept in a leaf module so row actions do not import the full signal-status graph.
 */
export const DISCOVERY_SIGNAL_STATUS = {
  observationApproval: {
    unknown: F.unknown,
    interested: F.captured,
    approved: F.validated,
    declined: F.blocked,
  },
  schedulingOwner: {
    unknown: F.unknown,
    identified: F.captured,
    confirmed: F.validated,
  },
  pathwayOrLogistics: {
    unknown: F.unknown,
    partial: F.captured,
    confirmed: F.validated,
  },
  workflowVisibility: {
    notObserved: F.unknown,
    partial: F.captured,
    validated: F.validated,
  },
  productAlignment: {
    unknown: F.unknown,
    low: F.captured,
    moderate: F.captured,
    strong: F.captured,
  },
  caseOpportunity: {
    unknown: F.unknown,
    low: F.captured,
    moderate: F.captured,
    high: F.captured,
  },
  champion: {
    unknown: F.unknown,
    potential: F.captured,
    confirmed: F.validated,
  },
  decisionInfluence: {
    unknown: F.unknown,
    partial: F.captured,
    mapped: F.validated,
  },
  opportunitySignal: {
    unknown: F.unknown,
    partial: F.captured,
    captured: F.captured,
    validated: F.validated,
  },
} as const;
