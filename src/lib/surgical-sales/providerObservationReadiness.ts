/**
 * Observation readiness — field execution state after debrief (not CRM discovery).
 * Discovery stage means observation approval is not yet secured, not "schedule another intro."
 */

import {
  MISSION_OBSERVATION_READINESS_LABELS,
  missionSchedulerReferencedLabel,
} from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import {
  formatProcedureInterestsOverviewSummary,
  hasClinicalProcedureIntelligenceOnFile,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { CONTACT_INFO_MISSING_RE } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  isCredentialingWorkflowComplete,
  isObservationAccessConditionallyAllowed,
  observationFeasibilityToken,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  resolveSchedulingOwnerFieldText,
} from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import { SCHEDULING_OWNER_FIELD_DB_KEYS } from "@/lib/surgical-sales/schedulingIntelligenceDbKeyConstants";
import { resolveNormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";
import {
  ADVANCE_OBSERVATION_ACCESS_OBJECTIVE,
  PROVIDER_ACCESS_FOLLOW_UP_CTA,
  PROVIDER_POST_INTRO_NEXT_ENGAGEMENT_LABEL,
  PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT,
  REMOVE_OBSERVATION_ACCESS_BLOCKERS_OBJECTIVE,
} from "@/lib/surgical-sales/providerObservationCta";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/providerObservationApproval";
import { commercialIntelligenceIsPopulated } from "@/lib/surgical-sales/buildProviderFieldIntelligenceFromCommercial";
import {
  calculateObservationReadinessFromCommercialIntelligence,
  observationReadinessBlockerLabels,
  type DerivedObservationReadinessLevel,
} from "@/lib/surgical-sales/deriveProviderObservationReadiness";
import {
  observationReadinessCoreFromCommercialIntelligence,
  pickSchedulerState,
  pickTriState,
} from "@/lib/surgical-sales/providerCommercialIntelligenceReadBridge";
import { parseProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { hasOrganizationSchedulerConfirmedForProvider } from "@/lib/surgical-sales/organizationIntelligenceInheritance";

export {
  ADVANCE_OBSERVATION_ACCESS_OBJECTIVE,
  PROVIDER_ACCESS_FOLLOW_UP_CTA,
  PROVIDER_POST_INTRO_NEXT_ENGAGEMENT_LABEL,
  PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT,
  REMOVE_OBSERVATION_ACCESS_BLOCKERS_OBJECTIVE,
};

function schedulingOwnerDisplayLine(contact: Record<string, unknown>): string | null {
  const text = resolveSchedulingOwnerFieldText(contact).trim();
  return text || null;
}

export type ObservationReadinessTriState = "yes" | "no" | "unknown";
export type SchedulerReadinessState = "yes" | "partial" | "no" | "unknown";
export type ObservationReadinessLevel = DerivedObservationReadinessLevel;

export type ProviderObservationReadiness = {
  providerInterest: ObservationReadinessTriState;
  observationApproved: ObservationReadinessTriState;
  credentialingRequired: ObservationReadinessTriState;
  credentialingPathKnown: ObservationReadinessTriState;
  schedulerIdentified: SchedulerReadinessState;
  schedulerContactInfoCaptured: ObservationReadinessTriState;
  candidateCasesIdentified: ObservationReadinessTriState;
  observationDatesDiscussed: ObservationReadinessTriState;
  readinessLevel: ObservationReadinessLevel;
  blockers: string[];
  compactObservationAccess: string;
  briefingStatusLine: string;
  display: {
    observationInterest: string;
    observationApproval: string;
    observationReadiness: string;
    credentialing: string;
    scheduler: string;
  };
};

const SCHEDULER_FIELD_KEYS = SCHEDULING_OWNER_FIELD_DB_KEYS;

/** Scheduler linked via Save & Link or validated intelligence — not a text-only reference. */
export function isSchedulerContactLinkedOnFile(contact: Record<string, unknown>): boolean {
  for (const key of SCHEDULER_FIELD_KEYS) {
    if (isIntelligenceFieldValidatedOnFile(key, contact)) return true;
  }
  const intel = parseProviderCommercialIntelligence(contact);
  return intel?.scheduling.scheduler_contact_linked === "yes";
}

function contactText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function contactBlob(contact: Record<string, unknown>): string {
  const parts = [
    contactText(contact, "provider_observation_feasibility"),
    contactText(contact, "provider_observation_access_path"),
    contactText(contact, "provider_evaluation_openness"),
    contactText(contact, "provider_observation_coordinator_contact"),
    contactText(contact, "provider_scheduling_contact"),
    contactText(contact, "provider_observation_best_days_case_types"),
    contactText(contact, "provider_ideal_observation_cases"),
    contactText(contact, "provider_credentialing_status"),
    contactText(contact, "provider_observation_credentialing_needed"),
    contactText(contact, "provider_credentialing_platform_name"),
  ];

  const meta = contact.provider_intelligence_field_metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    for (const row of Object.values(meta as Record<string, unknown>)) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const quote = String((row as { evidence_text?: string }).evidence_text ?? "").trim();
      if (quote) parts.push(quote);
    }
  }

  return parts.filter(Boolean).join(" ");
}

function hasContactInfoInText(text: string): boolean {
  if (!text.trim()) return false;
  if (CONTACT_INFO_MISSING_RE.test(text)) return false;
  return /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]?\d{4})\b/i.test(text);
}

function schedulerReferencedWithoutContactInfo(contact: Record<string, unknown>): boolean {
  if (isSchedulerContactLinkedOnFile(contact)) return false;
  if (hasOrganizationSchedulerConfirmedForProvider(contact)) return false;
  for (const key of SCHEDULER_FIELD_KEYS) {
    const text = contactText(contact, key);
    if (!text) continue;
    if (/\b(?:jennifer|karen|scheduler|coordinator|scheduling)\b/i.test(text) && !hasContactInfoInText(text)) {
      return true;
    }
  }
  return false;
}

function resolveSchedulerIdentified(
  contact: Record<string, unknown>,
): SchedulerReadinessState {
  if (isSchedulerContactLinkedOnFile(contact)) return "yes";
  if (hasOrganizationSchedulerConfirmedForProvider(contact)) return "yes";
  const line = schedulingOwnerDisplayLine(contact);
  if (line && hasContactInfoInText(line)) return "yes";
  if (schedulerReferencedWithoutContactInfo(contact)) return "partial";
  if (line && /\b(?:scheduling|scheduler|coordinator|office)\b/i.test(line)) return "partial";
  return "no";
}

function resolveCredentialingRequired(contact: Record<string, unknown>): ObservationReadinessTriState {
  if (isCredentialingWorkflowComplete(contact)) return "no";
  const credNeeded = contactText(contact, "provider_observation_credentialing_needed").toLowerCase();
  if (credNeeded === "not_required" || credNeeded === "none") return "no";
  if (
    credNeeded === "required" ||
    credNeeded === "in_progress" ||
    /\b(?:credentialing|credential|vendor credential|intellicentrics|acsis)\b/i.test(contactBlob(contact))
  ) {
    return "yes";
  }
  const credStatus = contactText(contact, "provider_credentialing_status").toLowerCase();
  if (credStatus && credStatus !== "not_required" && credStatus !== "none") return "yes";
  return "unknown";
}

function resolveCredentialingPathKnown(contact: Record<string, unknown>): ObservationReadinessTriState {
  if (isCredentialingWorkflowComplete(contact)) return "yes";
  const blob = contactBlob(contact);
  if (
    /\b(?:not sure|unsure|unknown platform|pathway unknown|confirm the credentialing|intellicentrics or|or through the hospital directly)\b/i.test(
      blob,
    )
  ) {
    return "no";
  }
  const platform = contactText(contact, "provider_credentialing_platform_name");
  if (platform && !/\b(?:unknown|unsure|not sure|tbd)\b/i.test(platform)) return "yes";
  if (/\b(?:intellicentrics|acsis|symplr|vendor credentialing portal)\b/i.test(blob)) return "yes";
  if (resolveCredentialingRequired(contact) === "yes") return "no";
  return "unknown";
}

function resolveProviderInterest(contact: Record<string, unknown>): ObservationReadinessTriState {
  if (hasProviderObservationApprovalValidated(contact)) return "yes";
  if (isObservationAccessConditionallyAllowed(contact)) return "yes";
  const token = observationFeasibilityToken(contact);
  if (token === "interested" || token === "mentioned") return "yes";
  const accessPath = contactText(contact, "provider_observation_access_path");
  if (/\b(?:not opposed|interested|open to|not a problem)\b/i.test(accessPath)) return "yes";
  if (/\b(?:opposed|denied|not interested|won't allow)\b/i.test(contactBlob(contact))) return "no";
  return "unknown";
}

function resolveObservationApproved(contact: Record<string, unknown>): ObservationReadinessTriState {
  if (hasProviderObservationApprovalValidated(contact)) return "yes";
  const token = observationFeasibilityToken(contact);
  if (token === "denied" || token === "no") return "no";
  const blob = contactBlob(contact);
  if (/\b(?:no observation was approved|not approved today|observation was not approved|observation approval:\s*no)\b/i.test(blob)) {
    return "no";
  }
  if (/\b(?:observation approved|approved for observation|approved today)\b/i.test(blob)) return "yes";
  if (token === "approved" || token === "yes" || token === "easy") return "yes";
  if (isObservationAccessConditionallyAllowed(contact)) return "no";
  return "unknown";
}

function resolveCandidateCases(contact: Record<string, unknown>): ObservationReadinessTriState {
  for (const key of [
    "provider_observation_best_days_case_types",
    "provider_ideal_observation_cases",
  ] as const) {
    const raw = contactText(contact, key);
    if (!raw) continue;
    if (fieldHasIntelligenceSignal(key, raw) || isIntelligenceFieldValidatedOnFile(key, contact)) {
      return "yes";
    }
  }
  const blob = contactBlob(contact);
  if (
    /\b(?:identify upcoming|understand what upcoming|upcoming robotic hernia cases might be)\b/i.test(
      blob,
    )
  ) {
    return "no";
  }
  if (/\b(?:no (?:specific )?case|not discussed|did not discuss specific)\b/i.test(blob)) {
    return "no";
  }
  return "unknown";
}

function resolveObservationDatesDiscussed(contact: Record<string, unknown>): ObservationReadinessTriState {
  const blob = contactBlob(contact);
  if (/\b(?:discussed specific dates|observation (?:is )?scheduled|date (?:was )?set)\b/i.test(blob)) {
    return "yes";
  }
  if (
    /\b(?:did not discuss specific dates|no observation date|dates not discussed|no observation was approved)\b/i.test(
      blob,
    ) ||
    (/\bobservation approval:\s*no\b/i.test(blob) && !/\b(?:scheduled for|date set|june|july)\b/i.test(blob))
  ) {
    return "no";
  }
  return "unknown";
}

function resolveSchedulerContactInfo(
  contact: Record<string, unknown>,
  schedulerIdentified: SchedulerReadinessState,
): ObservationReadinessTriState {
  if (isSchedulerContactLinkedOnFile(contact)) return "yes";
  if (hasOrganizationSchedulerConfirmedForProvider(contact)) return "yes";
  if (schedulerIdentified === "partial") return "no";
  const line = schedulingOwnerDisplayLine(contact);
  if (line && hasContactInfoInText(line)) return "yes";
  if (schedulerReferencedWithoutContactInfo(contact)) return "no";
  return "unknown";
}

const BLOCKER_DISPLAY_PRIORITY: Record<string, number> = {
  "Scheduler Contact": 1,
  "Credentialing Pathway": 2,
  "Credentialing Platform": 3,
  "Candidate Case": 4,
  "Observation Date": 5,
  "Observation Approval": 6,
  "Provider Interest": 7,
  "Scheduling Workflow": 8,
};

function sortBlockersForDisplay(blockers: string[]): string[] {
  return [...blockers].sort(
    (a, b) =>
      (BLOCKER_DISPLAY_PRIORITY[a] ?? 99) - (BLOCKER_DISPLAY_PRIORITY[b] ?? 99),
  );
}
function buildStillNeededItems(
  readiness: Omit<
    ProviderObservationReadiness,
    "blockers" | "readinessLevel" | "compactObservationAccess" | "briefingStatusLine" | "display"
  >,
): string[] {
  if (readiness.providerInterest === "unknown" && readiness.observationApproved === "unknown") {
    return [];
  }

  const stillNeeded: string[] = [];
  if (
    readiness.providerInterest === "yes" &&
    readiness.schedulerContactInfoCaptured !== "yes"
  ) {
    stillNeeded.push("Scheduler Contact");
  }
  if (
    readiness.credentialingRequired === "yes" &&
    readiness.credentialingPathKnown !== "yes"
  ) {
    stillNeeded.push("Credentialing Pathway");
  }
  if (readiness.candidateCasesIdentified === "no") {
    stillNeeded.push("Candidate Case");
  }
  if (readiness.observationDatesDiscussed === "no") {
    stillNeeded.push("Observation Date");
  }
  return stillNeeded.slice(0, 6);
}

function resolveReadinessLevel(input: {
  observationApproved: ObservationReadinessTriState;
  blockers: string[];
}): ObservationReadinessLevel {
  if (input.observationApproved === "yes" && input.blockers.length === 0) return "ready";
  if (input.observationApproved === "yes") return "conditional";
  if (input.blockers.length === 0 && input.observationApproved === "unknown") return "conditional";
  return "not_ready";
}

export function buildProviderObservationReadiness(
  contact: Record<string, unknown>,
): ProviderObservationReadiness {
  const structured = parseProviderCommercialIntelligence(contact);
  const structuredCore = structured
    ? observationReadinessCoreFromCommercialIntelligence(structured)
    : null;

  const legacyScheduler = resolveSchedulerIdentified(contact);
  const legacyInterest = resolveProviderInterest(contact);
  const legacyApproved = resolveObservationApproved(contact);
  const legacyCredentialingRequired = resolveCredentialingRequired(contact);
  const legacyCredentialingPath = resolveCredentialingPathKnown(contact);

  const schedulerLinked = isSchedulerContactLinkedOnFile(contact);
  const schedulerIdentified = schedulerLinked
    ? "yes"
    : structuredCore
      ? pickSchedulerState(structuredCore.schedulerIdentified, legacyScheduler)
      : legacyScheduler;
  const providerInterest = structuredCore
    ? pickTriState(structuredCore.providerInterest, legacyInterest)
    : legacyInterest;
  const observationApproved = structuredCore
    ? pickTriState(structuredCore.observationApproved, legacyApproved)
    : legacyApproved;
  const credentialingRequired = structuredCore
    ? pickTriState(structuredCore.credentialingRequired, legacyCredentialingRequired)
    : legacyCredentialingRequired;
  const credentialingPathKnown = structuredCore
    ? pickTriState(structuredCore.credentialingPathKnown, legacyCredentialingPath)
    : legacyCredentialingPath;
  const schedulerContactInfoCaptured = schedulerLinked
    ? "yes"
    : structuredCore
      ? pickTriState(
          structuredCore.schedulerContactInfoCaptured,
          resolveSchedulerContactInfo(contact, schedulerIdentified),
        )
      : resolveSchedulerContactInfo(contact, schedulerIdentified);
  const candidateCasesIdentified = resolveCandidateCases(contact);
  const observationDatesDiscussed = resolveObservationDatesDiscussed(contact);

  const core = {
    providerInterest,
    observationApproved,
    credentialingRequired,
    credentialingPathKnown,
    schedulerIdentified,
    schedulerContactInfoCaptured,
    candidateCasesIdentified,
    observationDatesDiscussed,
  };

  const blockers = buildStillNeededItems(core);
  const derived =
    structured && commercialIntelligenceIsPopulated(structured)
      ? calculateObservationReadinessFromCommercialIntelligence(structured)
      : null;
  const readinessLevel = derived ? derived.readiness : resolveReadinessLevel({ observationApproved, blockers });
  const derivedBlockers = derived ? observationReadinessBlockerLabels(derived.blockers) : [];
  const legacyOperationalBlockers = blockers.filter((item) =>
    item === "Candidate Case" || item === "Observation Date",
  );
  const resolvedBlockers = sortBlockersForDisplay(
    derived
      ? [...new Set([...legacyOperationalBlockers, ...derivedBlockers])]
      : blockers,
  );

  const interestLabel =
    providerInterest === "yes"
      ? "Interested"
      : providerInterest === "no"
        ? "Not interested"
        : "Unknown";

  const approvalLabel =
    observationApproved === "yes"
      ? "Approved"
      : observationApproved === "no"
        ? "Not Approved"
        : "Unknown";

  const readinessLabel = derived ? derived.displayLabel : (
    readinessLevel === "ready"
      ? MISSION_OBSERVATION_READINESS_LABELS.ready
      : readinessLevel === "conditional"
        ? MISSION_OBSERVATION_READINESS_LABELS.conditional
        : MISSION_OBSERVATION_READINESS_LABELS.not_ready
  );

  const credentialingLabel =
    credentialingRequired === "yes"
      ? credentialingPathKnown === "yes"
        ? "Required — path known"
        : "Required"
      : credentialingRequired === "no"
        ? "Not required"
        : "Unknown";

  let schedulerLabel = "Unknown";
  if (schedulerIdentified === "yes") {
    schedulerLabel = schedulingOwnerDisplayLine(contact) ?? "Identified";
  } else if (schedulerIdentified === "partial") {
    const schedLine = schedulingOwnerDisplayLine(contact) ?? contactBlob(contact);
    const nameMatch = schedLine.match(/\b(Jennifer|Karen|[A-Z][a-z]{2,})\b/);
    const name = nameMatch ? nameMatch[1] : "Scheduler";
    schedulerLabel = missionSchedulerReferencedLabel(name);
  } else if (schedulerIdentified === "no") {
    schedulerLabel = "Not identified";
  }

  const compactObservationAccess = resolveNormalizedObservationPermission({ contact }).label;

  const briefingStatusLine =
    providerInterest === "yes" && observationApproved === "no"
      ? blockers.length > 0
        ? "Provider is receptive to observation. Scheduling coordination and credentialing process still need to be confirmed."
        : "Observation interest established. Confirm scheduling and credentialing before requesting OR access."
      : observationApproved === "yes"
        ? "Observation approved — confirm logistics before OR day."
        : "Build provider openness before mapping facility access or scheduling logistics.";

  return {
    ...core,
    readinessLevel,
    blockers: resolvedBlockers,
    compactObservationAccess,
    briefingStatusLine,
    display: {
      observationInterest: interestLabel,
      observationApproval: approvalLabel,
      observationReadiness: readinessLabel,
      credentialing: credentialingLabel,
      scheduler: schedulerLabel,
    },
  };
}

export function formatProviderObservationAccessMetaLine(
  contact: Record<string, unknown>,
  engagements?: import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary[],
): string {
  const line = resolveNormalizedObservationPermission({ contact, engagements }).label;
  const readiness = buildProviderObservationReadiness(contact);
  const stillNeededPart =
    readiness.blockers.length > 0 && hasProviderObservationApprovalValidated(contact)
      ? ` · Optional prep: ${readiness.blockers.length}`
      : "";
  return `${line}${stillNeededPart}`;
}

/** Field execution summary — observation access posture plus still-needed items. */
export function formatProviderObservationReadinessSummary(
  contact: Record<string, unknown>,
  options?: { compact?: boolean },
): string {
  const readiness = buildProviderObservationReadiness(contact);
  if (options?.compact) {
    return formatProviderObservationAccessMetaLine(contact);
  }

  const lines = [
    "Observation Readiness",
    "",
    readiness.display.observationInterest,
    readiness.display.observationApproval,
  ];

  if (readiness.blockers.length > 0) {
    lines.push("", "Still Needed:");
    for (const item of readiness.blockers) {
      lines.push(`• ${item}`);
    }
  }

  return lines.join("\n");
}

export function providerPostIntroAccessWorkRemaining(contact: Record<string, unknown>): boolean {
  const structured = parseProviderCommercialIntelligence(contact);
  if (structured && commercialIntelligenceIsPopulated(structured)) {
    const derived = calculateObservationReadinessFromCommercialIntelligence(structured);
    return derived.readiness !== "ready";
  }
  const readiness = buildProviderObservationReadiness(contact);
  return readiness.observationApproved !== "yes" && readiness.providerInterest === "yes";
}

export type ObservationAccessBriefingBullet = {
  key: string;
  label: string;
  value: string;
};

/** Prep briefing bullets after intro debrief — observation readiness, not generic CRM notes. */
export function buildObservationAccessBriefingBullets(
  contact: Record<string, unknown>,
): ObservationAccessBriefingBullet[] {
  if (!providerPostIntroAccessWorkRemaining(contact)) return [];

  const readiness = buildProviderObservationReadiness(contact);
  const bullets: ObservationAccessBriefingBullet[] = [];

  if (readiness.providerInterest === "yes") {
    bullets.push({
      key: "observation_open",
      label: "Observation access",
      value: "Provider is receptive to observation once scheduling and credentialing are confirmed",
    });
  }
  if (readiness.observationApproved === "no") {
    bullets.push({
      key: "observation_not_approved",
      label: "Approval status",
      value: readiness.display.observationApproval,
    });
  }
  if (
    readiness.schedulerIdentified === "partial" ||
    readiness.schedulerContactInfoCaptured === "no"
  ) {
    bullets.push({
      key: "scheduler_contact",
      label: "Scheduling",
      value: "Scheduler contact information needed before coordinating OR access",
    });
  }
  if (readiness.credentialingRequired === "yes" && readiness.credentialingPathKnown !== "yes") {
    bullets.push({
      key: "credentialing_path",
      label: "Credentialing",
      value: "Credentialing path needs confirmation",
    });
  }
  if (readiness.candidateCasesIdentified === "no") {
    bullets.push({
      key: "candidate_cases",
      label: "Cases",
      value: "Candidate observation cases still need to be identified",
    });
  }

  return bullets.slice(0, 6);
}

export { hasClinicalProcedureIntelligenceOnFile, formatProcedureInterestsOverviewSummary };
