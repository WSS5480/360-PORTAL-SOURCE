/**
 * Discovery intelligence — shared field lifecycle statuses + capture confidence nuance.
 */

import {
  DISCOVERY_FIELD_STATUS,
  type DiscoveryFieldStatusLabel,
} from "@/lib/surgical-sales/discoveryFieldStatus";
import {
  DISCOVERY_CAPTURE_CONFIDENCE_SUFFIX,
  discoverySignalOperationalNarrative,
} from "@/lib/surgical-sales/discoveryIntelligenceNarrative";
import { CONTACT_INFO_MISSING_RE } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  FACILITY_CREDENTIALING_FIELD_KEYS,
  facilityCredentialingDraftFromContact,
  facilityCredentialingDraftHasSignal,
} from "@/lib/surgical-sales/facilityCredentialingFields";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  OR_ACCESS_CONSTRAINT_NONE_TOKEN,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  resolveWorkflowMaturityFromContact,
  resolveWorkflowVisibilityStatus,
  workflowMaturityLabel,
} from "@/lib/surgical-sales/workflowUnderstandingMaturity";
import {
  isCredentialingWorkflowComplete,
  isObservationAccessConditionallyAllowed,
  observationFeasibilityToken,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import { resolveSchedulingOwnerFieldText } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import {
  missionObservationInterestLabel,
  missionSchedulerReferencedLabel,
  MISSION_ACCESS_STATUS_LABELS,
} from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import {
  OPPORTUNITY_INTELLIGENCE_SIGNALS,
  type OpportunityIntelligenceSignalId,
} from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryStructuredSignalIds";

export type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryStructuredSignalIds";

export { DISCOVERY_FIELD_STATUS, type DiscoveryFieldStatusLabel };
export { DISCOVERY_SIGNAL_STATUS } from "@/lib/surgical-sales/discoverySignalStatusConstants";

const F = DISCOVERY_FIELD_STATUS;

/** 1 = gate (pathway), 2 = important (execution), 3 = strategic (opportunity). */
export type DiscoverySignalPriority = 1 | 2 | 3;

export type DiscoverySignalPriorityTier = "gate" | "important" | "strategic";

const DISCOVERY_SIGNAL_PRIORITY: Record<DiscoveryStructuredSignalId, DiscoverySignalPriority> = {
  observation_approval: 1,
  scheduling_owner: 1,
  facility_vendor_pathway: 1,
  observation_logistics: 2,
  workflow_visibility: 2,
  product_alignment: 2,
  case_opportunity: 3,
  clinical_champion: 3,
  decision_influence: 3,
  opportunity_clinical_frustrations: 2,
  opportunity_workflow_inefficiencies: 2,
  opportunity_products_in_use: 2,
  opportunity_product_gaps: 2,
  opportunity_outcome_priorities: 2,
  opportunity_staff_frustrations: 2,
  opportunity_future_signals: 2,
};

export function discoverySignalPriority(
  signalId: DiscoveryStructuredSignalId,
): DiscoverySignalPriority {
  return DISCOVERY_SIGNAL_PRIORITY[signalId];
}

export function discoverySignalPriorityTier(
  priority: DiscoverySignalPriority,
): DiscoverySignalPriorityTier {
  if (priority === 1) return "gate";
  if (priority === 2) return "important";
  return "strategic";
}

export function discoverySignalPriorityLabel(priority: DiscoverySignalPriority): string {
  switch (priority) {
    case 1:
      return "Gate";
    case 2:
      return "Important";
    case 3:
      return "Strategic";
    default:
      return "";
  }
}

export function compareDiscoverySignalPriority(
  a: DiscoveryStructuredSignalId,
  b: DiscoveryStructuredSignalId,
): number {
  return discoverySignalPriority(a) - discoverySignalPriority(b);
}

function raw(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function lower(contact: Record<string, unknown>, dbKey: string): string {
  return raw(contact, dbKey).toLowerCase();
}

function hasSignal(contact: Record<string, unknown>, dbKey: string): boolean {
  return fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined);
}

function validated(contact: Record<string, unknown>, dbKey: string): boolean {
  return isIntelligenceFieldValidatedOnFile(dbKey, contact);
}

function token(contact: Record<string, unknown>, dbKey: string): string | null {
  const parsed = parseIntelligenceCaptureValue(dbKey, raw(contact, dbKey));
  return parsed.token?.toLowerCase() ?? null;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function resolveLifecycleFromFields(
  contact: Record<string, unknown>,
  dbKeys: string[],
  primaryDbKey: string,
  options?: {
    notApplicable?: () => boolean;
    blocked?: () => boolean;
  },
): DiscoveryFieldStatusLabel {
  if (options?.notApplicable?.()) return F.notApplicable;
  if (options?.blocked?.()) return F.blocked;

  const anySignal = dbKeys.some((k) => hasSignal(contact, k));
  if (!anySignal) return F.unknown;

  const primaryValidated = validated(contact, primaryDbKey);
  const allValidated = dbKeys.every((k) => !hasSignal(contact, k) || validated(contact, k));
  if (primaryValidated && allValidated) return F.validated;

  return F.captured;
}

function observationApprovalBlocked(contact: Record<string, unknown>): boolean {
  const feasibility = lower(contact, "provider_observation_feasibility");
  const openness = lower(contact, "provider_evaluation_openness");
  const combined = `${feasibility} ${openness}`;

  return (
    matchesAny(combined, [
      /\b(declined|denied|blocked|not allowed|won'?t allow|no access|closed)\b/,
      /\b(no|blocked|denied)\b/,
    ]) || token(contact, "provider_evaluation_openness") === "closed"
  );
}

function observationApprovalValidated(contact: Record<string, unknown>): boolean {
  if (!validated(contact, "provider_observation_feasibility")) return false;
  const feasibility =
    token(contact, "provider_observation_feasibility") ??
    lower(contact, "provider_observation_feasibility");
  // Rep-validated "Approved" status or explicit on-file approval only — not "discussed"/interest.
  if (matchesAny(feasibility, [/^approved$/, /^yes$/])) return true;
  // Segmented capture "Allowed" / restricted — rep-confirmed access, not debrief interest language.
  if (matchesAny(feasibility, [/^easy$/, /^restricted$/])) return true;
  return false;
}

export function resolveObservationApprovalStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  if (observationApprovalBlocked(contact)) return F.blocked;
  if (observationApprovalValidated(contact)) return F.validated;
  if (isObservationAccessConditionallyAllowed(contact)) return F.conditional;

  if (
    observationFeasibilityToken(contact) === "credentialing_required" &&
    hasSignal(contact, "provider_observation_feasibility")
  ) {
    return F.conditional;
  }

  if (
    hasSignal(contact, "provider_evaluation_openness") ||
    hasSignal(contact, "provider_observation_feasibility")
  ) {
    return F.captured;
  }

  return F.unknown;
}

export function resolveSchedulingOwnerStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  const dbKeys = [
    "provider_scheduling_contact",
    "provider_observation_coordinator_contact",
    "provider_facility_scheduling_contact",
    "provider_observation_scheduling_control",
  ];
  const primaryDbKey =
    dbKeys.find((k) => hasSignal(contact, k)) ?? "provider_scheduling_contact";
  return resolveLifecycleFromFields(contact, dbKeys, primaryDbKey);
}

function facilityPathwayNotApplicable(contact: Record<string, unknown>): boolean {
  const pathTok = token(contact, "provider_observation_access_path");
  if (pathTok === OR_ACCESS_CONSTRAINT_NONE_TOKEN) return true;
  return /\b(no vendor|no credentialing|not required|n\/a|none needed)\b/i.test(
    lower(contact, "provider_observation_access_path"),
  );
}

export function resolveFacilityVendorPathwayStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  const structuredKeys = Object.values(FACILITY_CREDENTIALING_FIELD_KEYS);
  const draft = facilityCredentialingDraftFromContact(contact);
  const primaryDbKey = facilityCredentialingDraftHasSignal(draft)
    ? FACILITY_CREDENTIALING_FIELD_KEYS.platformName
    : "provider_observation_access_path";

  return resolveLifecycleFromFields(
    contact,
    [
      ...structuredKeys,
      "provider_observation_access_path",
      "provider_observation_credentialing_needed",
      "provider_credentialing_status",
    ],
    primaryDbKey,
    { notApplicable: () => facilityPathwayNotApplicable(contact) },
  );
}

export function resolveObservationLogisticsStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  return resolveLifecycleFromFields(
    contact,
    ["provider_observation_best_days_case_types", "provider_ideal_observation_cases"],
    "provider_observation_best_days_case_types",
  );
}

export function resolveProductAlignmentStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  const opennessTok = token(contact, "provider_evaluation_openness");
  if (opennessTok === "closed") return F.blocked;

  return resolveLifecycleFromFields(
    contact,
    ["provider_competitive_products", "provider_evaluation_openness"],
    "provider_competitive_products",
  );
}

export function resolveCaseOpportunityStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  return resolveLifecycleFromFields(
    contact,
    ["provider_case_volume_estimate", "provider_ideal_observation_cases"],
    "provider_case_volume_estimate",
  );
}

export function resolveChampionIdentifiedStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  const dbKey = "provider_champion_potential";
  const teamDynamics = lower(contact, "provider_or_team_dynamics");
  const legacySponsorOnPath = /\b(sponsor|champion|internal ally|supports observation)\b/i.test(
    lower(contact, "provider_observation_access_path"),
  );

  if (!hasSignal(contact, dbKey) && !hasSignal(contact, "provider_or_team_dynamics")) {
    return legacySponsorOnPath ? F.captured : F.unknown;
  }

  return resolveLifecycleFromFields(
    contact,
    [dbKey, "provider_or_team_dynamics"],
    dbKey,
  );
}

export function resolveDecisionInfluenceStatus(contact: Record<string, unknown>): DiscoveryFieldStatusLabel {
  return resolveLifecycleFromFields(
    contact,
    ["influence_level", "provider_decision_maker_status"],
    "influence_level",
  );
}

function resolveOpportunityIntelligenceSignalStatus(
  contact: Record<string, unknown>,
  signalId: OpportunityIntelligenceSignalId,
): DiscoveryFieldStatusLabel {
  const spec = OPPORTUNITY_INTELLIGENCE_SIGNALS.find((entry) => entry.id === signalId);
  if (!spec) return F.unknown;
  return resolveLifecycleFromFields(contact, spec.dbKeys, spec.dbKey);
}

const STATUS_RESOLVERS: Record<
  DiscoveryStructuredSignalId,
  (contact: Record<string, unknown>) => DiscoveryFieldStatusLabel
> = {
  observation_approval: resolveObservationApprovalStatus,
  scheduling_owner: resolveSchedulingOwnerStatus,
  facility_vendor_pathway: resolveFacilityVendorPathwayStatus,
  observation_logistics: resolveObservationLogisticsStatus,
  workflow_visibility: resolveWorkflowVisibilityStatus,
  product_alignment: resolveProductAlignmentStatus,
  case_opportunity: resolveCaseOpportunityStatus,
  clinical_champion: resolveChampionIdentifiedStatus,
  decision_influence: resolveDecisionInfluenceStatus,
  opportunity_clinical_frustrations: (contact) =>
    resolveOpportunityIntelligenceSignalStatus(contact, "opportunity_clinical_frustrations"),
  opportunity_workflow_inefficiencies: (contact) =>
    resolveOpportunityIntelligenceSignalStatus(contact, "opportunity_workflow_inefficiencies"),
  opportunity_products_in_use: (contact) =>
    resolveOpportunityIntelligenceSignalStatus(contact, "opportunity_products_in_use"),
  opportunity_product_gaps: (contact) =>
    resolveOpportunityIntelligenceSignalStatus(contact, "opportunity_product_gaps"),
  opportunity_outcome_priorities: (contact) =>
    resolveOpportunityIntelligenceSignalStatus(contact, "opportunity_outcome_priorities"),
  opportunity_staff_frustrations: (contact) =>
    resolveOpportunityIntelligenceSignalStatus(contact, "opportunity_staff_frustrations"),
  opportunity_future_signals: (contact) =>
    resolveOpportunityIntelligenceSignalStatus(contact, "opportunity_future_signals"),
};

export function resolveDiscoveryStructuredSignalStatus(
  signalId: DiscoveryStructuredSignalId,
  contact: Record<string, unknown>,
): DiscoveryFieldStatusLabel {
  return STATUS_RESOLVERS[signalId](contact);
}

/** Whether this status counts toward group progress (validated on file only). */
export function isDiscoverySignalStatusResolved(
  signalId: DiscoveryStructuredSignalId,
  statusLabel: string,
): boolean {
  return statusLabel === F.validated;
}

/** File-trust lifecycle for the Confidence column (separate from Status). */
export function resolveDiscoverySignalCaptureConfidence(input: {
  dbKeys: string[];
  primaryDbKey: string;
  contact: Record<string, unknown>;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  signalId?: DiscoveryStructuredSignalId;
  statusLabel?: DiscoveryFieldStatusLabel;
}): string {
  const { dbKeys, primaryDbKey, contact, fieldMeta, signalId, statusLabel } = input;
  const anySignal = dbKeys.some((k) => hasSignal(contact, k));
  if (!anySignal) {
    if (signalId != null && statusLabel != null) {
      return discoverySignalOperationalNarrative(signalId, statusLabel);
    }
    return DISCOVERY_CAPTURE_CONFIDENCE_SUFFIX.nothingDocumented;
  }

  if (statusLabel === F.blocked) {
    if (signalId != null) {
      return discoverySignalOperationalNarrative(signalId, F.blocked);
    }
    if (signalId != null) {
      return resolveDiscoverySignalConfidenceNuance(signalId, contact, statusLabel) ??
        MISSION_ACCESS_STATUS_LABELS.blocked;
    }
    return MISSION_ACCESS_STATUS_LABELS.blocked;
  }
  if (statusLabel === F.notApplicable) {
    return signalId != null
      ? discoverySignalOperationalNarrative(signalId, F.notApplicable)
      : "Not required for this pursuit";
  }

  const primaryValidated = validated(contact, primaryDbKey);
  const metaValidated = dbKeys.some(
    (k) => fieldMeta[k]?.lifecycle_state === "validated" || Boolean(fieldMeta[k]?.validated_at),
  );
  const onFileValidated = primaryValidated || statusLabel === F.validated;

  const nuance =
    signalId != null
      ? resolveDiscoverySignalConfidenceNuance(signalId, contact, statusLabel)
      : null;

  if (onFileValidated) {
    return nuance
      ? `${nuance} · ${DISCOVERY_CAPTURE_CONFIDENCE_SUFFIX.readyForPlanning}`
      : DISCOVERY_CAPTURE_CONFIDENCE_SUFFIX.readyForPlanning;
  }

  return nuance
    ? `${nuance} · ${DISCOVERY_CAPTURE_CONFIDENCE_SUFFIX.awaitingValidation}`
    : DISCOVERY_CAPTURE_CONFIDENCE_SUFFIX.awaitingValidation;
}

export function resolveDiscoverySignalConfidenceNuance(
  signalId: DiscoveryStructuredSignalId,
  contact: Record<string, unknown>,
  statusLabel?: DiscoveryFieldStatusLabel,
): string | null {
  switch (signalId) {
    case "observation_approval": {
      if (observationApprovalValidated(contact)) return "Approved";
      const openness = token(contact, "provider_evaluation_openness");
      const feasibility = lower(contact, "provider_observation_feasibility");
      const interested =
        openness === "open" ||
        openness === "cautious" ||
        openness === "trial_ready" ||
        matchesAny(lower(contact, "provider_evaluation_openness"), [/\b(interested|open|willing)\b/]);
      if (interested && !observationApprovalValidated(contact)) {
        return missionObservationInterestLabel(true, false);
      }
      if (statusLabel === F.blocked) return "Access declined";
      if (statusLabel === F.validated) return "Approved";
      if (matchesAny(feasibility, [/^approved$/, /^yes$/, /^easy$/, /^restricted$/])) {
        return "Approval noted";
      }
      if (
        openness === "open" ||
        openness === "cautious" ||
        openness === "trial_ready" ||
        matchesAny(lower(contact, "provider_evaluation_openness"), [/\b(interested|open|willing)\b/])
      ) {
        return "Interest noted";
      }
      return hasSignal(contact, "provider_observation_feasibility") ? "Feasibility noted" : null;
    }
    case "scheduling_owner": {
      const schedStatus = resolveSchedulingOwnerStatus(contact);
      const schedText = resolveSchedulingOwnerFieldText(contact).trim();
      if (schedStatus === F.validated && schedText) return schedText;
      if (schedStatus === F.captured && schedText) {
        if (CONTACT_INFO_MISSING_RE.test(schedText)) {
          const nameMatch = schedText.match(/\b([A-Z][a-z]{2,})\b/);
          return nameMatch
            ? missionSchedulerReferencedLabel(nameMatch[1])
            : missionSchedulerReferencedLabel(null);
        }
        return schedText;
      }
      return statusLabel === F.captured ? "Owner named" : null;
    }
    case "facility_vendor_pathway": {
      const credStatus = lower(contact, "provider_credentialing_status");
      const credNeeded = lower(contact, "provider_observation_credentialing_needed");
      const needsCredentialing =
        observationFeasibilityToken(contact) === "credentialing_required" ||
        credNeeded === "required" ||
        credNeeded === "in_progress" ||
        (hasSignal(contact, "provider_credentialing_status") &&
          Boolean(credStatus) &&
          credStatus !== "not_required" &&
          credStatus !== "none");
      if (needsCredentialing) {
        const blob = `${credStatus} ${lower(contact, "provider_facility_vendor_pathway")}`;
        if (/\b(?:not sure|unsure|unknown platform|pathway unknown|confirm the credentialing)\b/i.test(blob)) {
          return "Credentialing path unknown";
        }
        if (isCredentialingWorkflowComplete(contact)) return "Required — path known";
        return "Vendor credentialing required";
      }
      const draft = facilityCredentialingDraftFromContact(contact);
      if (facilityCredentialingDraftHasSignal(draft)) {
        return statusLabel === F.captured ? "Pathway noted" : null;
      }
      return statusLabel === F.captured ? "Pathway noted" : null;
    }
    case "observation_logistics":
      return statusLabel === F.captured ? "Timing noted" : null;
    case "workflow_visibility": {
      const maturity = resolveWorkflowMaturityFromContact(contact);
      if (maturity) return workflowMaturityLabel(maturity);
      if (statusLabel === F.captured) return "Partial understanding";
      return null;
    }
    case "product_alignment": {
      const opennessTok = token(contact, "provider_evaluation_openness");
      if (validated(contact, "provider_competitive_products")) return "Strong fit";
      if (opennessTok === "trial_ready") return "Trial-ready";
      if (opennessTok === "open" || opennessTok === "cautious") return "Moderate fit";
      if (hasSignal(contact, "provider_competitive_products")) return "Competitive context noted";
      return null;
    }
    case "case_opportunity": {
      const tok = token(contact, "provider_case_volume_estimate");
      if (tok === "high" || tok === "very_high") return "High opportunity";
      if (tok === "medium") return "Moderate opportunity";
      if (tok === "low") return "Low opportunity";
      return hasSignal(contact, "provider_case_volume_estimate") ? "Volume noted" : null;
    }
    case "clinical_champion": {
      const tok = token(contact, "provider_champion_potential");
      if (tok === "high") return "Champion identified";
      if (tok === "medium" || tok === "low") return "Possible champion";
      return statusLabel === F.captured ? "Champion lead noted" : null;
    }
    case "decision_influence":
      return statusLabel === F.captured ? "Partial map" : null;
    default:
      return null;
  }
}

export function discoverySignalStatusSlug(statusLabel: string): string {
  if (statusLabel === F.notApplicable) return "not_applicable";
  return statusLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
