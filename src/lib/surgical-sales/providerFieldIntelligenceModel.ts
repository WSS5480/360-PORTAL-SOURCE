/**
 * Single source of truth for provider field intelligence — debrief-reviewed contact
 * state consumed by Provider Overview, Mission Engine, and Intelligence tab.
 */

import {
  contactInfoNextStepForName,
} from "@/lib/surgical-sales/buildConcreteDebriefNextSteps";
import {
  formatProcedureInterestsOverviewSummary,
  parseClinicalStorageValue,
  normalizeClinicalIntelligenceFromFact,
  isGenericClinicalFactText,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { enrichProviderIntelligenceContact } from "@/lib/surgical-sales/enrichProviderIntelligenceContact";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  DISCOVERY_FIELD_STATUS,
  resolveObservationApprovalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  isCredentialingWorkflowComplete,
  observationFeasibilityToken,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceCaptureSourceType,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  hasOrganizationSchedulerConfirmedForProvider,
  ORGANIZATION_SCHEDULER_INHERITANCE_DB_KEYS,
  readOrganizationInheritanceFromContact,
} from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import { providerHasFieldIntelligenceEvidence } from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";
import {
  buildProviderObservationReadiness,
  type ProviderObservationReadiness,
} from "@/lib/surgical-sales/providerObservationReadiness";
import { resolveNormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";
import { SCHEDULING_OWNER_FIELD_DB_KEYS } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import { schedulingOwnerDisplayLine } from "@/lib/surgical-sales/schedulingIntelligenceReadModel";
import {
  readOptionalIntelligenceCategorySummary,
  OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID,
  formatSupportContactRecord,
} from "@/lib/surgical-sales/optionalIntelligenceCategories";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import {
  resolveWorkflowMaturityFromContact,
  workflowMaturityLabel,
} from "@/lib/surgical-sales/workflowUnderstandingMaturity";
import {
  resolveDiscoveryStructuredSignalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  accessStatusDisplayLabel,
  buildClinicalSectionFromCommercial,
  commercialIntelligenceIsPopulated,
  credentialingHasCommercialEvidence,
  credentialingPlatformFromCommercial,
  formatSupportContactsFromCommercial,
  observationHasCommercialEvidence,
  resolveCommercialIntelligence,
  schedulerNameFromCommercial,
  schedulingHasCommercialEvidence,
} from "@/lib/surgical-sales/buildProviderFieldIntelligenceFromCommercial";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { resolveSuggestedSchedulerCandidate } from "@/lib/surgical-sales/candidateContactIntelligence";
import { MISSION_INTELLIGENCE_NOT_YET_OBSERVED } from "@/lib/surgical-sales/providerMissionExecutionLanguage";

export const PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN = MISSION_INTELLIGENCE_NOT_YET_OBSERVED;

export type FieldIntelligenceCaptureState = "empty" | "verified" | "referenced" | "learning";

export type ProviderFieldIntelligenceLine = {
  id: string;
  label: string;
  primaryLine: string;
  secondaryLine: string | null;
  captureState: FieldIntelligenceCaptureState;
  hasEngagementEvidence: boolean;
  displayValue: string;
  isConfirmed: boolean;
};

export type ProviderFieldIntelligenceBriefItem = {
  id: string;
  text: string;
};

export type ProviderFieldIntelligenceModel = {
  hasFieldEvidence: boolean;
  readiness: ProviderObservationReadiness;
  observationApproval: ProviderFieldIntelligenceLine;
  scheduler: ProviderFieldIntelligenceLine;
  credentialing: ProviderFieldIntelligenceLine;
  procedureInterests: ProviderFieldIntelligenceLine;
  champion: ProviderFieldIntelligenceLine;
  workflowNotes: ProviderFieldIntelligenceLine;
  supportContacts: ProviderFieldIntelligenceLine;
  facilityNotes: ProviderFieldIntelligenceLine;
  clinical: {
    procedures: string[];
    trends: string[];
    frustrations: string[];
    preferences: string[];
    workflowObservations: string[];
    productInterests: string[];
    summary: string | null;
  };
  verified: ProviderFieldIntelligenceBriefItem[];
  stillLearning: ProviderFieldIntelligenceBriefItem[];
  followUps: ProviderFieldIntelligenceBriefItem[];
};

const ENGAGEMENT_CAPTURE_SOURCES = new Set<IntelligenceCaptureSourceType>([
  "intro_call",
  "observation",
  "case",
  "engagement",
  "promote",
]);

function combineDisplay(primary: string, secondary?: string | null): string {
  const main = primary.trim();
  const detail = secondary?.trim();
  if (!main) return detail ?? PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN;
  if (!detail) return main;
  return `${main} · ${detail}`;
}

function schedulerNameFromContact(contact: Record<string, unknown>): string | null {
  for (const dbKey of SCHEDULING_OWNER_FIELD_DB_KEYS) {
    const line = String(contact[dbKey] ?? "").trim();
    if (!line) continue;
    const candidates = line.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
    for (const candidate of candidates) {
      if (isPlausiblePersonName(candidate)) return candidate;
    }
  }
  return null;
}

function contactHasEngagementFieldEvidence(contact: Record<string, unknown>): boolean {
  const meta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);
  for (const entry of Object.values(meta)) {
    if (entry?.source_engagement_id) return true;
    if (entry?.source_type && ENGAGEMENT_CAPTURE_SOURCES.has(entry.source_type)) return true;
    if (entry?.evidence_text?.trim()) return true;
  }
  return Object.keys(meta).some((dbKey) =>
    fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined),
  );
}

function fieldHasEngagementEvidence(
  dbKeys: string[],
  contact: Record<string, unknown>,
  meta: ProviderIntelligenceFieldMetadataMap,
): boolean {
  for (const dbKey of dbKeys) {
    const entry = meta[dbKey];
    if (entry?.source_engagement_id) return true;
    if (entry?.source_type && ENGAGEMENT_CAPTURE_SOURCES.has(entry.source_type)) return true;
    if (entry?.evidence_text?.trim()) return true;
    if (fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)) return true;
  }
  return false;
}

function isVerifiedDbKey(
  dbKey: string,
  contact: Record<string, unknown>,
  meta: ProviderIntelligenceFieldMetadataMap,
): boolean {
  if (isIntelligenceFieldValidatedOnFile(dbKey, contact)) return true;
  const entry = meta[dbKey];
  if (entry?.lifecycle_state === "validated") return true;
  if (entry?.lifecycle_state === "confirmed" && entry.validated_at) return true;
  return false;
}

function buildLine(input: {
  id: string;
  label: string;
  primaryLine: string;
  secondaryLine?: string | null;
  captureState: FieldIntelligenceCaptureState;
  hasEngagementEvidence: boolean;
}): ProviderFieldIntelligenceLine {
  const primaryLine =
    input.primaryLine.trim() ||
    (input.captureState === "empty" ? PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN : "");
  const secondaryLine = input.secondaryLine?.trim() || null;
  const displayValue =
    input.captureState === "empty"
      ? PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN
      : combineDisplay(primaryLine, secondaryLine);
  return {
    id: input.id,
    label: input.label,
    primaryLine,
    secondaryLine,
    captureState: input.captureState,
    hasEngagementEvidence: input.hasEngagementEvidence,
    displayValue,
    isConfirmed: input.captureState === "verified",
  };
}

function buildObservationApprovalLine(
  contact: Record<string, unknown>,
  readiness: ProviderObservationReadiness,
  hasEvidence: boolean,
  commercial: ReturnType<typeof resolveCommercialIntelligence>,
): ProviderFieldIntelligenceLine {
  const commercialEvidence =
    commercial && observationHasCommercialEvidence(commercial) ? true : hasEvidence;
  const permission = resolveNormalizedObservationPermission({ contact });

  if (permission.stageId === "unknown" && !hasEvidence) {
    return buildLine({
      id: "observation_approval",
      label: "Observation permission",
      primaryLine: "",
      captureState: "empty",
      hasEngagementEvidence: false,
    });
  }

  const hasSignal =
    commercialEvidence ||
    fieldHasIntelligenceSignal(
      "provider_observation_feasibility",
      contact.provider_observation_feasibility as string | null | undefined,
    ) ||
    readiness.providerInterest !== "unknown" ||
    readiness.observationApproved !== "unknown";

  return buildLine({
    id: "observation_approval",
    label: "Observation permission",
    primaryLine: permission.label,
    secondaryLine: permission.approvalDetailLabel,
    captureState:
      permission.stageId === "unknown"
        ? "empty"
        : permission.stageId === "permission_confirmed" ||
            permission.stageId === "observation_scheduled" ||
            permission.stageId === "observation_completed"
          ? "verified"
          : "referenced",
    hasEngagementEvidence: hasSignal || hasEvidence,
  });
}

function readOrganizationInheritanceDisplayForScheduler(
  contact: Record<string, unknown>,
): string | null {
  for (const dbKey of ORGANIZATION_SCHEDULER_INHERITANCE_DB_KEYS) {
    const inheritance = readOrganizationInheritanceFromContact(contact, dbKey);
    if (inheritance?.stance === "applies" || inheritance?.stance === "exception") {
      return (
        inheritance.facility_display_line?.trim() ||
        String(contact[dbKey] ?? "").trim() ||
        null
      );
    }
  }
  return null;
}

function buildSchedulerLine(
  contact: Record<string, unknown>,
  readiness: ProviderObservationReadiness,
  meta: ProviderIntelligenceFieldMetadataMap,
  commercial: ReturnType<typeof resolveCommercialIntelligence>,
): ProviderFieldIntelligenceLine {
  const dbKeys = [
    "provider_scheduling_contact",
    "provider_observation_coordinator_contact",
    "provider_facility_scheduling_contact",
  ];
  const hasEvidence =
    (commercial && schedulingHasCommercialEvidence(commercial)) ||
    fieldHasEngagementEvidence(dbKeys, contact, meta) ||
    Boolean(resolveSuggestedSchedulerCandidate(contact));
  const suggestedCandidate = resolveSuggestedSchedulerCandidate(contact);
  const name =
    (commercial && schedulerNameFromCommercial(commercial)) ??
    schedulerNameFromContact(contact) ??
    suggestedCandidate?.contact_name ??
    null;

  if (hasOrganizationSchedulerConfirmedForProvider(contact)) {
    const inheritedLine =
      readOrganizationInheritanceDisplayForScheduler(contact) ??
      schedulingOwnerDisplayLine(contact) ??
      name ??
      "Confirmed from organization";
    return buildLine({
      id: "scheduler",
      label: "Scheduler",
      primaryLine: inheritedLine,
      captureState: "verified",
      hasEngagementEvidence: hasEvidence,
    });
  }

  if (readiness.schedulerIdentified === "yes" && readiness.schedulerContactInfoCaptured === "yes") {
    return buildLine({
      id: "scheduler",
      label: "Scheduler",
      primaryLine: schedulingOwnerDisplayLine(contact) ?? name ?? "Identified",
      captureState: "verified",
      hasEngagementEvidence: hasEvidence,
    });
  }

  if (
    hasEvidence &&
    (readiness.schedulerIdentified === "partial" || readiness.schedulerContactInfoCaptured === "no")
  ) {
    return buildLine({
      id: "scheduler",
      label: "Scheduler",
      primaryLine: `${name ?? "Scheduler"} (Referenced)`,
      secondaryLine: "Contact information needed",
      captureState: "referenced",
      hasEngagementEvidence: true,
    });
  }

  if (hasEvidence && readiness.schedulerIdentified === "yes") {
    return buildLine({
      id: "scheduler",
      label: "Scheduler",
      primaryLine: schedulingOwnerDisplayLine(contact) ?? `${name ?? "Scheduler"} (Referenced)`,
      secondaryLine: "Contact information needed",
      captureState: "referenced",
      hasEngagementEvidence: true,
    });
  }

  if (suggestedCandidate) {
    return buildLine({
      id: "scheduler",
      label: "Scheduler",
      primaryLine: `${suggestedCandidate.contact_name} identified — not linked yet`,
      secondaryLine: suggestedCandidate.contact_role,
      captureState: "referenced",
      hasEngagementEvidence: true,
    });
  }

  return buildLine({
    id: "scheduler",
    label: "Scheduler",
    primaryLine: "",
    captureState: "empty",
    hasEngagementEvidence: false,
  });
}

function buildCredentialingLine(
  contact: Record<string, unknown>,
  readiness: ProviderObservationReadiness,
  meta: ProviderIntelligenceFieldMetadataMap,
  commercial: ReturnType<typeof resolveCommercialIntelligence>,
): ProviderFieldIntelligenceLine {
  const dbKeys = [
    "provider_observation_credentialing_needed",
    "provider_credentialing_status",
    "provider_credentialing_platform_name",
  ];
  const hasEvidence =
    (commercial && credentialingHasCommercialEvidence(commercial)) ||
    fieldHasEngagementEvidence(dbKeys, contact, meta);
  const workflowComplete = isCredentialingWorkflowComplete(contact);

  if (!hasEvidence && readiness.credentialingRequired === "unknown") {
    return buildLine({
      id: "credentialing",
      label: "Credentialing",
      primaryLine: "",
      captureState: "empty",
      hasEngagementEvidence: false,
    });
  }

  if (workflowComplete) {
    return buildLine({
      id: "credentialing",
      label: "Credentialing",
      primaryLine: "Credentialing complete",
      captureState: "verified",
      hasEngagementEvidence: hasEvidence,
    });
  }

  if (readiness.credentialingRequired === "no") {
    return buildLine({
      id: "credentialing",
      label: "Credentialing",
      primaryLine: "Not required",
      captureState: "verified",
      hasEngagementEvidence: hasEvidence,
    });
  }

  const platformLabel =
    (commercial && credentialingPlatformFromCommercial(commercial, contact)) ||
    String(contact.provider_credentialing_platform_name ?? "").trim();
  const pathKnown =
    commercial?.credentialing.credentialing_platform_known ??
    (readiness.credentialingPathKnown === "yes"
      ? "yes"
      : readiness.credentialingPathKnown === "no"
        ? "no"
        : "unknown");

  if (pathKnown === "yes") {
    return buildLine({
      id: "credentialing",
      label: "Credentialing",
      primaryLine: "Credentialing Required",
      secondaryLine:
        platformLabel && platformLabel.length <= 120 ? platformLabel : "Path confirmed",
      captureState: isVerifiedDbKey("provider_credentialing_platform_name", contact, meta)
        ? "verified"
        : "referenced",
      hasEngagementEvidence: true,
    });
  }

  if (readiness.credentialingRequired === "yes" || hasEvidence) {
    return buildLine({
      id: "credentialing",
      label: "Credentialing",
      primaryLine: "Credentialing Required",
      secondaryLine: "Platform Unknown",
      captureState: "referenced",
      hasEngagementEvidence: true,
    });
  }

  return buildLine({
    id: "credentialing",
    label: "Credentialing",
    primaryLine: "",
    captureState: "empty",
    hasEngagementEvidence: false,
  });
}

function buildClinicalSection(contact: Record<string, unknown>): ProviderFieldIntelligenceModel["clinical"] {
  const procedures: string[] = [];
  const trends: string[] = [];
  const seenProc = new Set<string>();
  const seenTrend = new Set<string>();

  const raw = String(contact.provider_procedure_focus ?? "").trim();
  for (const part of raw.split(/\||\n/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const parsed = parseClinicalStorageValue(trimmed);
    if (parsed) {
      const procKey = parsed.procedureFocus.toLowerCase();
      if (!seenProc.has(procKey)) {
        seenProc.add(procKey);
        procedures.push(parsed.procedureFocus);
      }
      if (/increasing|volume|trend|adoption/i.test(parsed.signalLabel)) {
        const trend = `Increasing ${parsed.procedureFocus.charAt(0).toLowerCase()}${parsed.procedureFocus.slice(1)} volume`;
        const trendKey = trend.toLowerCase();
        if (!seenTrend.has(trendKey)) {
          seenTrend.add(trendKey);
          trends.push(trend);
        }
      }
      continue;
    }

    const normalized = normalizeClinicalIntelligenceFromFact({ value: trimmed, evidence: trimmed });
    if (normalized) {
      const procKey = normalized.procedureFocus.toLowerCase();
      if (!seenProc.has(procKey)) {
        seenProc.add(procKey);
        procedures.push(normalized.procedureFocus);
      }
      if (/increasing|volume|trend/i.test(normalized.signalLabel)) {
        const trend = `Increasing ${normalized.procedureFocus.charAt(0).toLowerCase()}${normalized.procedureFocus.slice(1)} volume`;
        const trendKey = trend.toLowerCase();
        if (!seenTrend.has(trendKey)) {
          seenTrend.add(trendKey);
          trends.push(trend);
        }
      }
    } else if (!isGenericClinicalFactText(trimmed)) {
      const procKey = trimmed.toLowerCase();
      if (!seenProc.has(procKey)) {
        seenProc.add(procKey);
        procedures.push(trimmed);
      }
    }
  }

  return {
    procedures,
    trends,
    frustrations: [],
    preferences: [],
    workflowObservations: [],
    productInterests: [],
    summary: formatProcedureInterestsOverviewSummary(contact),
  };
}

function buildOptionalLine(
  id: string,
  label: string,
  value: string | null,
): ProviderFieldIntelligenceLine {
  if (!value?.trim()) {
    return buildLine({
      id,
      label,
      primaryLine: "",
      captureState: "empty",
      hasEngagementEvidence: false,
    });
  }
  return buildLine({
    id,
    label,
    primaryLine: value.trim(),
    captureState: "referenced",
    hasEngagementEvidence: true,
  });
}

function buildFollowUps(
  readiness: ProviderObservationReadiness,
  contact: Record<string, unknown>,
): ProviderFieldIntelligenceBriefItem[] {
  const items: ProviderFieldIntelligenceBriefItem[] = [];
  const seen = new Set<string>();

  const push = (id: string, text: string) => {
    const line = text.trim();
    if (!line) return;
    const key = line.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ id, text: line });
  };

  for (const blocker of readiness.blockers) {
    switch (blocker) {
      case "Scheduler Contact": {
        const name = schedulerNameFromContact(contact);
        push(
          "follow-scheduler",
          name ? contactInfoNextStepForName(name) : "Identify OR scheduling contact.",
        );
        break;
      }
      case "Credentialing Pathway":
        push("follow-credentialing", "Confirm which credentialing platform is required.");
        break;
      case "Candidate Case":
        push("follow-case", "Identify a candidate observation case.");
        break;
      case "Observation Date":
        push("follow-date", "Confirm a target observation date.");
        break;
      default:
        break;
    }
  }

  return items.slice(0, 5);
}

function buildBriefingTiers(
  contact: Record<string, unknown>,
  model: Omit<
    ProviderFieldIntelligenceModel,
    "verified" | "stillLearning" | "followUps"
  >,
): Pick<ProviderFieldIntelligenceModel, "verified" | "stillLearning"> {
  const verified: ProviderFieldIntelligenceBriefItem[] = [];
  const stillLearning: ProviderFieldIntelligenceBriefItem[] = [];
  const seenV = new Set<string>();
  const seenL = new Set<string>();

  const pushVerified = (id: string, text: string) => {
    const line = text.trim();
    if (!line) return;
    const key = line.toLowerCase();
    if (seenV.has(key)) return;
    seenV.add(key);
    verified.push({ id, text: line });
  };

  const pushLearning = (id: string, text: string) => {
    const line = text.trim();
    if (!line) return;
    const key = line.toLowerCase();
    if (seenL.has(key)) return;
    seenL.add(key);
    stillLearning.push({ id, text: line });
  };

  const readiness = model.readiness;
  const permission = resolveNormalizedObservationPermission({ contact });
  if (permission.stageId !== "unknown") {
    pushVerified("obs-permission", permission.label);
  }
  if (readiness.credentialingRequired === "yes") {
    pushVerified("cred-required", "Vendor credentialing required");
  }

  if (model.clinical.procedures.length > 0) {
    for (const proc of model.clinical.procedures) {
      pushVerified(`proc-${proc}`, proc);
    }
  }
  for (const trend of model.clinical.trends) {
    pushVerified(`trend-${trend}`, trend);
  }
  for (const frustration of model.clinical.frustrations) {
    pushLearning(`clinical-frustration-${frustration}`, frustration);
  }
  for (const preference of model.clinical.preferences) {
    pushVerified(`clinical-preference-${preference}`, preference);
  }
  for (const product of model.clinical.productInterests) {
    pushLearning(`product-interest-${product}`, `Product interest: ${product}`);
  }

  const accessPath = String(contact.provider_observation_access_path ?? "").trim();
  if (accessPath && !isGenericClinicalFactText(accessPath)) {
    pushVerified("access-path", accessPath);
  }

  if (model.scheduler.captureState === "referenced") {
    const name = schedulerNameFromContact(contact);
    pushLearning(
      "scheduler-contact",
      name ? `${name} contact information unknown` : "Scheduler contact information unknown",
    );
  }
  const credentialingNotes = String(contact.provider_credentialing_status ?? "").trim();
  const credentialingUnresolved =
    readiness.credentialingRequired === "yes" &&
    readiness.credentialingPathKnown !== "yes" &&
    (readiness.observationApproved === "yes" ||
      /\b(?:don'?t|do not)\s+know\b|\bstill\s+need/i.test(credentialingNotes) ||
      /still\s+needed:/i.test(credentialingNotes));
  if (credentialingUnresolved) {
    pushLearning("cred-platform", "Credentialing path needs confirmation");
  }
  if (readiness.observationApproved === "yes") {
    // Case/date selection is scheduling workflow — not intelligence gaps on the Intelligence tab.
  }

  return { verified, stillLearning };
}

function buildChampionLine(contact: Record<string, unknown>): ProviderFieldIntelligenceLine {
  const fromCategory = readOptionalIntelligenceCategorySummary(
    OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID.champion_candidates,
    contact,
  );
  if (fromCategory) {
    return buildOptionalLine("champion", BRIEF.influencePaths, fromCategory);
  }
  const championField = String(contact.provider_champion_potential ?? "").trim();
  if (fieldHasIntelligenceSignal("provider_champion_potential", championField)) {
    return buildOptionalLine("champion", BRIEF.influencePaths, championField);
  }
  const signalStatus = resolveDiscoveryStructuredSignalStatus("clinical_champion", contact);
  if (signalStatus !== DISCOVERY_FIELD_STATUS.unknown) {
    return buildOptionalLine("champion", BRIEF.influencePaths, "Influence path noted");
  }
  return buildOptionalLine("champion", BRIEF.influencePaths, null);
}

function readWorkflowNotesValue(contact: Record<string, unknown>): string | null {
  const fromCategory = readOptionalIntelligenceCategorySummary(
    OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID.workflow_notes,
    contact,
  );
  if (fromCategory) return fromCategory;

  for (const dbKey of [
    "provider_observation_best_days_case_types",
    "provider_ideal_observation_cases",
    "provider_workflow_pain_points",
  ]) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (fieldHasIntelligenceSignal(dbKey, raw)) return raw;
  }

  const maturity = resolveWorkflowMaturityFromContact(contact);
  if (maturity) return workflowMaturityLabel(maturity);

  const signalStatus = resolveDiscoveryStructuredSignalStatus("workflow_visibility", contact);
  if (signalStatus !== DISCOVERY_FIELD_STATUS.unknown) return "Workflow partially captured";

  return null;
}

function buildWorkflowNotesLine(contact: Record<string, unknown>): ProviderFieldIntelligenceLine {
  return buildOptionalLine("workflow_notes", BRIEF.progressDrivers, readWorkflowNotesValue(contact));
}

function buildSupportContactsLine(
  contact: Record<string, unknown>,
  relatedContacts?: Array<Record<string, unknown>>,
  commercial?: ReturnType<typeof resolveCommercialIntelligence>,
): ProviderFieldIntelligenceLine {
  const providerContacts = commercial
    ? formatSupportContactsFromCommercial(commercial.support_contacts, "provider")
    : null;
  if (providerContacts) {
    return buildOptionalLine("support_contacts", BRIEF.keyRelationships, providerContacts);
  }
  const fromCategory = readOptionalIntelligenceCategorySummary(
    OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID.staff_contacts,
    contact,
  );
  if (fromCategory) {
    return buildOptionalLine("support_contacts", BRIEF.keyRelationships, fromCategory);
  }
  if (!relatedContacts?.length) {
    return buildOptionalLine("support_contacts", BRIEF.keyRelationships, null);
  }
  const lines = relatedContacts
    .map((row) => formatSupportContactRecord(row))
    .filter((line) => line.trim());
  return buildOptionalLine(
    "support_contacts",
    BRIEF.keyRelationships,
    lines.length ? lines.join("; ") : null,
  );
}

function buildFacilityNotesLine(
  contact: Record<string, unknown>,
  commercial?: ReturnType<typeof resolveCommercialIntelligence>,
): ProviderFieldIntelligenceLine {
  const orgContacts = commercial
    ? formatSupportContactsFromCommercial(commercial.support_contacts, "organization")
    : null;
  if (orgContacts) {
    return buildOptionalLine("facility_notes", BRIEF.facilityContext, orgContacts);
  }
  const fromCategory = readOptionalIntelligenceCategorySummary(
    OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID.facility_notes,
    contact,
  );
  return buildOptionalLine("facility_notes", BRIEF.facilityContext, fromCategory);
}

function buildProcedureInterestsLine(
  clinical: ProviderFieldIntelligenceModel["clinical"],
): ProviderFieldIntelligenceLine {
  if (
    !clinical.summary &&
    clinical.procedures.length === 0 &&
    clinical.frustrations.length === 0 &&
    clinical.productInterests.length === 0
  ) {
    return buildOptionalLine("procedure_interests", "Procedure interests", null);
  }
  const value =
    clinical.summary ??
    [
      ...clinical.procedures,
      ...clinical.trends,
      ...clinical.frustrations,
      ...clinical.preferences,
      ...clinical.productInterests.map((product) => `Product interest: ${product}`),
    ].join(" · ");
  return buildOptionalLine("procedure_interests", "Procedure interests", value);
}

export function buildProviderFieldIntelligenceModel(input: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
  engagements?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: Array<Record<string, unknown>>;
}): ProviderFieldIntelligenceModel {
  const contact = hydrateDiscoveryContactFromLegacy(
    enrichProviderIntelligenceContact({
      contact: input.contact,
      relatedContacts: input.relatedContacts,
    }),
  );
  const commercial = resolveCommercialIntelligence(contact);
  const meta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);
  const hasFieldEvidence =
    (commercial && commercialIntelligenceIsPopulated(commercial)) ||
    providerHasFieldIntelligenceEvidence({
      contact,
      relatedContacts: input.relatedContacts,
      engagements: input.engagements as never,
      cases: input.cases,
      activityTimeline: input.activityTimeline,
      clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers as never,
    }) ||
    contactHasEngagementFieldEvidence(contact);

  const readiness = buildProviderObservationReadiness(contact);
  const clinical =
    commercial && commercialIntelligenceIsPopulated(commercial)
      ? buildClinicalSectionFromCommercial(commercial, contact)
      : buildClinicalSection(contact);

  const observationApproval = buildObservationApprovalLine(
    contact,
    readiness,
    hasFieldEvidence,
    commercial,
  );
  const scheduler = buildSchedulerLine(contact, readiness, meta, commercial);
  const credentialing = buildCredentialingLine(contact, readiness, meta, commercial);
  const procedureInterests = buildProcedureInterestsLine(clinical);
  const champion = buildChampionLine(contact);
  const workflowNotes = buildWorkflowNotesLine(contact);
  const supportContacts = buildSupportContactsLine(contact, input.relatedContacts, commercial);
  const facilityNotes = buildFacilityNotesLine(contact, commercial);

  const core = {
    hasFieldEvidence,
    readiness,
    observationApproval,
    scheduler,
    credentialing,
    procedureInterests,
    champion,
    workflowNotes,
    supportContacts,
    facilityNotes,
    clinical,
  };

  const { verified, stillLearning } = hasFieldEvidence
    ? buildBriefingTiers(contact, core)
    : { verified: [], stillLearning: [] };

  return {
    ...core,
    verified,
    stillLearning,
    followUps: hasFieldEvidence ? buildFollowUps(readiness, contact) : [],
  };
}

/** Map model line to overview summary row value (never contradicts engagement evidence). */
export function providerFieldIntelligenceSummaryValue(
  line: ProviderFieldIntelligenceLine,
): string {
  return line.displayValue;
}

export function providerFieldIntelligenceLinesForOverview(
  model: ProviderFieldIntelligenceModel,
): Array<{
  id: ProviderFieldIntelligenceLine["id"];
  label: string;
  value: string;
  detailLine: string | null;
  isConfirmed: boolean;
  kind: "progression" | "optional";
  requiredForProgression?: boolean;
}> {
  const row = (
    line: ProviderFieldIntelligenceLine,
    kind: "progression" | "optional",
    requiredForProgression?: boolean,
  ) => ({
    id: line.id,
    label: line.label,
    value: line.isConfirmed ? line.primaryLine : PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN,
    detailLine: line.isConfirmed ? line.secondaryLine : null,
    isConfirmed: line.isConfirmed,
    kind,
    requiredForProgression,
  });

  return [
    row(model.observationApproval, "progression", true),
    row(model.scheduler, "optional"),
    row(model.credentialing, "optional"),
    row(model.champion, "optional"),
    row(model.procedureInterests, "optional"),
    row(model.workflowNotes, "optional"),
    row(model.supportContacts, "optional"),
    row(model.facilityNotes, "optional"),
  ];
}
