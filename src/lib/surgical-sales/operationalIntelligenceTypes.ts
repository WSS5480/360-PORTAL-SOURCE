/**
 * Canonical Sales Command operational intelligence model.
 * All debrief, discovery mapping, overview, and engagement surfaces read from this shape.
 */

export const OPERATIONAL_INTELLIGENCE_DOMAINS = [
  "access_readiness",
  "scheduling_ownership",
  "credentialing",
  "clinical_fit",
  "observation_readiness",
  "relationship",
  "product_interest",
  "evaluation_readiness",
  "case_commitment",
  "outcomes",
] as const;

export type OperationalIntelligenceDomain = (typeof OPERATIONAL_INTELLIGENCE_DOMAINS)[number];

export const OPERATIONAL_SIGNAL_TYPES = [
  "evidence",
  "blocker",
  "dependency",
  "soft_contact",
  "next_step",
  "confirmed_fact",
  "early_signal",
] as const;

export type OperationalSignalType = (typeof OPERATIONAL_SIGNAL_TYPES)[number];

export const OPERATIONAL_CONFIDENCE_LEVELS = [
  "unknown",
  "early_signal",
  "operationally_inferred",
  "provider_confirmed",
  "observed_directly",
] as const;

export type OperationalConfidence = (typeof OPERATIONAL_CONFIDENCE_LEVELS)[number];

export const OPERATIONAL_SIGNAL_STATUSES = [
  "unknown",
  "partial",
  "likely",
  "confirmed",
  "blocked",
  "conditional",
] as const;

export type OperationalSignalStatus = (typeof OPERATIONAL_SIGNAL_STATUSES)[number];

export const OPERATIONAL_SIGNAL_SOURCE_TYPES = [
  "debrief",
  "engagement",
  "manual",
  "observation",
  "case",
] as const;

export type OperationalSignalSourceType = (typeof OPERATIONAL_SIGNAL_SOURCE_TYPES)[number];

export const SALES_PATHWAY_OPERATIONAL_STAGES = [
  "discovery",
  "observe",
  "debrief",
  "evaluation",
  "commitment",
  "outcomes",
] as const;

export type ProviderOperationalStage = (typeof SALES_PATHWAY_OPERATIONAL_STAGES)[number];

export type OperationalSignal = {
  id: string;
  providerId: string;
  organizationId?: string;
  engagementId?: string;
  debriefId?: string;

  domain: OperationalIntelligenceDomain;
  signalType: OperationalSignalType;

  label: string;
  summary: string;
  evidenceText?: string;

  confidence: OperationalConfidence;
  status: OperationalSignalStatus;

  suggestedAnswer?: string;
  blockerType?: string;
  softContactName?: string;
  softContactRole?: string;

  sourceType: OperationalSignalSourceType;
  sourceLabel: string;
  createdAt: string;
  updatedAt: string;

  /** Internal db key when signal maps to a persisted provider field. */
  dbKey?: string;
};

export type DomainReadiness = {
  domain: OperationalIntelligenceDomain;
  label: string;
  status: OperationalSignalStatus;
  readinessPercent: number;
  summary: string | null;
  primarySignalId: string | null;
  unlocked: boolean;
  blockReason: string | null;
};

export type OperationalBlocker = {
  id: string;
  domain: OperationalIntelligenceDomain;
  label: string;
  summary: string;
  signalId: string;
};

export type OperationalAction = {
  id: string;
  domain: OperationalIntelligenceDomain;
  label: string;
  summary: string;
  priority: number;
};

export type SoftWorkflowContact = {
  id: string;
  name: string;
  role: string | null;
  scope: string | null;
  status: OperationalSignalStatus;
  signalId: string;
  confirmed: boolean;
};

export type ProviderOperationalState = {
  providerId: string;
  currentStage: ProviderOperationalStage;
  readinessByDomain: Record<OperationalIntelligenceDomain, DomainReadiness>;
  blockers: OperationalBlocker[];
  nextActions: OperationalAction[];
  mappedEvidence: OperationalSignal[];
  softContacts: SoftWorkflowContact[];
};

export const OPERATIONAL_DOMAIN_LABELS: Record<OperationalIntelligenceDomain, string> = {
  access_readiness: "Access readiness",
  scheduling_ownership: "Scheduling ownership",
  credentialing: "Credentialing",
  clinical_fit: "Clinical fit",
  observation_readiness: "Observation readiness",
  relationship: "Surgeon relationship",
  product_interest: "Product interest",
  evaluation_readiness: "Evaluation readiness",
  case_commitment: "Case commitment",
  outcomes: "Outcomes / QTi",
};
