/**
 * Plain-English compact summaries for answered Discovery Mapping questions.
 */

import type { DiscoveryMappingQuestionView } from "@/lib/surgical-sales/buildDiscoveryMappingQuestionView";
import {
  DISCOVERY_FIELD_STATUS,
  resolveDiscoveryStructuredSignalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  isIntelligenceCaptureTokenValue,
  sanitizeDiscoveryEvidenceQuote,
} from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import { observationAccessConditionalDisplay } from "@/lib/surgical-sales/observationAccessWorkflowState";
import {
  OBSERVATION_CREDENTIALING_NEEDED_DB_KEY,
  observationFeasibilityToken,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import {
  WORKFLOW_RESPONSIBILITIES,
  workflowResponsibilityLabel,
  type WorkflowResponsibilityId,
} from "@/lib/surgical-sales/operationalSupportContact";
import { facilityCredentialingDraftFromContact } from "@/lib/surgical-sales/facilityCredentialingFields";
import { PROVIDER_CREDENTIALING_METADATA_KEYS } from "@/lib/surgical-sales/providerCredentialing";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  SCHEDULING_OWNERSHIP_FIELD_KEYS,
  schedulingControlPathFromContact,
  type SchedulingControlPathId,
} from "@/lib/surgical-sales/schedulingOwnershipFields";
import {
  schedulingControlPathLabel,
} from "@/lib/surgical-sales/schedulingOwnershipIntelligence";
import {
  getStageMappingSignalSpec,
  type StageMappingSignalId,
} from "@/lib/surgical-sales/stageMappingQuestions";
import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import {
  formatIntelligenceCaptureDisplay,
  labelForIntelligenceToken,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  normalizeWorkflowMaturityChoice,
  resolveWorkflowMaturityFromContact,
  WORKFLOW_MATURITY_OPTIONS,
} from "@/lib/surgical-sales/workflowUnderstandingMaturity";
import { stripStoredIntelligenceEncoding } from "@/lib/surgical-sales/debriefReviewDisplayLanguage";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";

const SNAKE_TOKEN_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OBSERVATION_APPROVAL_SUMMARY: Record<string, string> = {
  approved: "Observation access approved",
  partial: "Observation access partially approved",
  pending: "Observation access pending approval",
  declined: "Observation access declined",
};

const SCHEDULING_PATH_SUMMARY: Record<SchedulingControlPathId, string> = {
  provider_office: "Observation scheduling is handled by the provider office",
  facility: "Observation scheduling is handled by the facility",
  shared_workflow: "Observation scheduling uses a shared office and facility workflow",
  unknown: "Observation scheduling control is still unknown",
};

const PATHWAY_CHOICE_SUMMARY: Record<string, string> = {
  path_clear: "Vendor and facility access path is clear",
  partial_path: "Access pathway is partially mapped",
  required_pending: "Vendor credentialing is required and pending",
  unknown: "Facility access pathway is still unknown",
};

const ACCESS_PATHWAY_ROLE_PHRASE: Record<string, string> = {
  office_manager: "office manager",
  coordinator: "OR coordinator",
  surgeon_direct: "the surgeon directly",
  or_coordinator: "OR coordinator",
  vendor_access_contact: "vendor access contact",
  scheduler: "scheduler",
  committee: "committee approval",
  credentialing: "credentialing",
};

const WORKFLOW_ROLE_PHRASE: Partial<Record<WorkflowResponsibilityId, string>> = {
  observation_scheduling_owner: "observation scheduling",
  approval_contact: "vendor approval",
  credentialing_contact: "credentialing",
  clinical_champion: "clinical champion",
  product_evaluator: "product evaluation",
  case_coordination: "case coordination",
  decision_influence: "decision influence",
  vendor_access: "vendor access",
};

export function isOperationalSummaryToken(value: string | null | undefined): boolean {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (UUID_RE.test(text)) return true;
  if (isIntelligenceCaptureTokenValue(text)) return true;
  return SNAKE_TOKEN_RE.test(text);
}

function humanizeLooseToken(token: string): string {
  const key = token.trim().toLowerCase();
  if (ACCESS_PATHWAY_ROLE_PHRASE[key]) return ACCESS_PATHWAY_ROLE_PHRASE[key]!;
  const workflow = WORKFLOW_RESPONSIBILITIES.find((r) => r.id === key);
  if (workflow) return workflow.label.toLowerCase();
  return labelForIntelligenceToken("provider_observation_access_path", key);
}

function sanitizeSummaryCandidate(text: string | null | undefined, maxLen = 120): string | null {
  let t = stripStoredIntelligenceEncoding(String(text ?? "").trim());
  t = t.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/gi, (match) => humanizeLooseToken(match));
  t = t.replace(/\s{2,}/g, " ").trim();
  if (!t || isOperationalSummaryToken(t)) return null;
  if (/^on file$/i.test(t)) return null;
  if (/^no validated answer yet/i.test(t)) return null;
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function choiceLabel(signalId: StageMappingSignalId, choice: string): string | null {
  const spec = getStageMappingSignalSpec(signalId);
  return spec.choices.find((c) => c.value === choice)?.label ?? null;
}

function summarizeChoice(signalId: StageMappingSignalId, choice: string): string | null {
  const normalized = choice.trim().toLowerCase();
  if (!normalized || normalized === "unknown") return null;

  if (signalId === "observation_approval") {
    return OBSERVATION_APPROVAL_SUMMARY[normalized] ?? null;
  }

  if (signalId === "scheduling_owner") {
    return SCHEDULING_PATH_SUMMARY[normalized as SchedulingControlPathId] ?? null;
  }

  if (signalId === "facility_vendor_pathway") {
    return PATHWAY_CHOICE_SUMMARY[normalized] ?? null;
  }

  if (signalId === "workflow_visibility") {
    const maturity = normalizeWorkflowMaturityChoice(normalized);
    const opt = WORKFLOW_MATURITY_OPTIONS.find((o) => o.value === maturity);
    return opt ? `Procedure workflow: ${opt.label.toLowerCase()}` : null;
  }

  const label = choiceLabel(signalId, normalized);
  if (!label) return null;

  switch (signalId) {
    case "observation_logistics":
      if (normalized === "immediate") return "Observation access is available immediately";
      if (normalized === "scheduled") return "Observation timing is scheduled";
      if (normalized === "delayed") return "Observation timing is delayed";
      break;
    case "product_alignment":
      return `Product alignment: ${label.toLowerCase()}`;
    case "case_opportunity":
      return `Case opportunity: ${label.toLowerCase()}`;
    case "clinical_champion":
      if (normalized === "confirmed") return "Clinical champion confirmed";
      if (normalized === "suspected") return "Clinical champion suspected";
      if (normalized === "none_identified") return "No clinical champion identified";
      break;
    default:
      break;
  }

  return label;
}

function nameFromIntelligenceLine(line: string | null | undefined): string | null {
  const raw = String(line ?? "").trim();
  if (!raw || isOperationalSummaryToken(raw)) return null;

  const withoutPrefix = raw.replace(/^Scheduling:\s*/i, "").trim();
  const segments = withoutPrefix.split("·").map((s) => s.trim()).filter(Boolean);
  for (const segment of segments) {
    const afterRole = segment.match(/^(?:Provider office|Facility|Provider):\s*(.+)$/i)?.[1]?.trim();
    const candidate = afterRole ?? segment;
    if (!candidate || isOperationalSummaryToken(candidate)) continue;
    if (/^\d{3}[-.)]\s*\d{3}/.test(candidate)) continue;
    if (candidate.includes("@")) {
      const namePart = candidate.split("@")[0]?.replace(/[._]/g, " ").trim();
      if (namePart && namePart.length >= 2) return namePart;
      continue;
    }
    if (candidate.length >= 2 && candidate.length <= 64) return candidate;
  }
  return null;
}

function nameFromContactDraft(draft: RapidDiscoverySupportContactDraft | null | undefined): string | null {
  if (!draft) return null;
  if (draft.mode === "create") {
    const name = [draft.firstName, draft.lastName].filter((p) => p.trim()).join(" ").trim();
    return name || null;
  }
  return null;
}

function summarizeWorkflowRoles(ids: WorkflowResponsibilityId[]): string | null {
  if (!ids.length) return null;
  const phrases = ids
    .map((id) => WORKFLOW_ROLE_PHRASE[id] ?? workflowResponsibilityLabel(id).toLowerCase())
    .filter(Boolean);
  if (!phrases.length) return null;
  if (phrases.length === 1) return `Role includes ${phrases[0]}`;
  return `Roles include ${phrases.slice(0, 2).join(" and ")}`;
}

function summarizeCredentialingRequired(contact: Record<string, unknown>, metadata?: Record<string, string>): string | null {
  const metaApproval = metadata?.[PROVIDER_CREDENTIALING_METADATA_KEYS.approvalRequired]?.trim().toLowerCase();
  if (metaApproval === "yes") return "Credentialing required before observation";
  if (metaApproval === "no") return "Credentialing not required";

  const needed = String(contact[OBSERVATION_CREDENTIALING_NEEDED_DB_KEY] ?? "").trim().toLowerCase();
  if (needed === "required" || needed === "blocked" || needed === "gate before access") {
    return "Credentialing required before observation";
  }
  if (needed === "cleared" || needed === "not_required" || needed === "completed") {
    return "Credentialing not required";
  }

  const credStatus = String(contact.provider_credentialing_status ?? "").trim().toLowerCase();
  if (credStatus === "not_required") return "Credentialing not required";
  if (credStatus && credStatus !== "unknown" && credStatus !== "not_started") {
    return "Credentialing required before observation";
  }

  return null;
}

function summarizeAccessPathway(contact: Record<string, unknown>, metadata?: Record<string, string>): string | null {
  const metaPath = metadata?.access_pathway?.trim().toLowerCase();
  if (metaPath && metaPath !== "unknown") {
    const phrase = ACCESS_PATHWAY_ROLE_PHRASE[metaPath] ?? humanizeLooseToken(metaPath);
    return `Access pathway runs through ${phrase}`;
  }

  const display = formatIntelligenceCaptureDisplay(
    "provider_observation_access_path",
    contact.provider_observation_access_path as string,
  );
  if (display) {
    const cleaned = sanitizeSummaryCandidate(display);
    if (cleaned) {
      if (/^access pathway/i.test(cleaned)) return cleaned;
      return `Access pathway: ${cleaned}`;
    }
  }

  const raw = String(contact.provider_observation_access_path ?? "").trim();
  if (!raw) return null;

  const tokens = raw
    .split(/[,|]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const pathToken = tokens.find((t) => ACCESS_PATHWAY_ROLE_PHRASE[t] || t === "office_manager");
  if (pathToken) {
    const phrase = ACCESS_PATHWAY_ROLE_PHRASE[pathToken] ?? humanizeLooseToken(pathToken);
    return `Access pathway runs through ${phrase}`;
  }

  const quote = sanitizeDiscoveryEvidenceQuote(raw);
  if (quote) return sanitizeSummaryCandidate(`Access pathway: ${quote}`);

  return null;
}

function inferObservationApprovalChoice(
  contact: Record<string, unknown>,
  selectedChoice?: string | null,
): string | null {
  if (selectedChoice?.trim()) return selectedChoice.trim().toLowerCase();

  const status = resolveDiscoveryStructuredSignalStatus("observation_approval", contact);
  if (status === DISCOVERY_FIELD_STATUS.blocked) return "declined";
  if (status === DISCOVERY_FIELD_STATUS.validated) {
    const feas = observationFeasibilityToken(contact);
    if (feas === "restricted") return "partial";
    return "approved";
  }
  if (status === DISCOVERY_FIELD_STATUS.conditional) return "pending";
  if (status === DISCOVERY_FIELD_STATUS.captured) return "partial";
  return null;
}

function summarizeObservationApproval(
  contact: Record<string, unknown>,
  selectedChoice?: string | null,
  mappingDetail?: DiscoveryMappingQuestionView | null,
): string | null {
  const mappingConditional = mappingDetail?.conditionalWorkflow;
  if (mappingConditional?.answer) {
    return sanitizeSummaryCandidate(mappingConditional.answer);
  }
  const accessConditional = observationAccessConditionalDisplay({ contact });
  if (accessConditional?.overviewSummary) {
    return sanitizeSummaryCandidate(accessConditional.overviewSummary);
  }
  if (accessConditional?.answer) {
    return sanitizeSummaryCandidate(accessConditional.answer);
  }

  const choice = inferObservationApprovalChoice(contact, selectedChoice);
  if (choice) {
    const fromChoice = summarizeChoice("observation_approval", choice);
    if (fromChoice) return fromChoice;
  }

  const fallback = mappingDetail?.currentState.summary;
  return sanitizeSummaryCandidate(fallback);
}

function summarizeSchedulingOwner(
  contact: Record<string, unknown>,
  selectedChoice?: string | null,
  metadata?: Record<string, string>,
  providerContactDraft?: RapidDiscoverySupportContactDraft | null,
  facilityContactDraft?: RapidDiscoverySupportContactDraft | null,
): string | null {
  const path =
    (selectedChoice as SchedulingControlPathId | undefined) ||
    (metadata?.scheduling_control as SchedulingControlPathId | undefined) ||
    schedulingControlPathFromContact(contact) ||
    null;

  const schedulingLines = [
    contact[SCHEDULING_OWNERSHIP_FIELD_KEYS.providerSchedulingContact],
    contact[SCHEDULING_OWNERSHIP_FIELD_KEYS.facilitySchedulingContact],
    contact[SCHEDULING_OWNERSHIP_FIELD_KEYS.coordinatorSummary],
  ].map((v) => String(v ?? "").trim());

  const partialLeadName =
    schedulingLines
      .map((line) => line.match(/\[Partial lead\]\s*([A-Z][a-z]+)/)?.[1]?.trim())
      .find(Boolean) ?? null;

  const ownerName =
    nameFromContactDraft(providerContactDraft) ||
    nameFromContactDraft(facilityContactDraft) ||
    partialLeadName ||
    schedulingLines.map((line) => nameFromIntelligenceLine(line)).find(Boolean) ||
    null;

  if (ownerName) {
    const controlValidated = isIntelligenceFieldValidatedOnFile(
      "provider_observation_scheduling_control",
      contact,
    );
    if (!controlValidated && path && path !== "unknown") {
      return `${ownerName} may be involved in scheduling, but ownership is not confirmed.`;
    }
    return `${ownerName} may be involved in scheduling.`;
  }

  const roleLine = summarizeWorkflowRoles(
    providerContactDraft?.workflowResponsibilities ??
      facilityContactDraft?.workflowResponsibilities ??
      [],
  );
  if (roleLine) return roleLine;

  if (path) {
    return SCHEDULING_PATH_SUMMARY[path] ?? `Observation scheduling: ${schedulingControlPathLabel(path)}`;
  }

  return null;
}

function summarizeFacilityPathway(
  contact: Record<string, unknown>,
  selectedChoice?: string | null,
  metadata?: Record<string, string>,
): string | null {
  const credLine = summarizeCredentialingRequired(contact, metadata);
  const pathLine = summarizeAccessPathway(contact, metadata);

  if (credLine && pathLine && `${credLine} · ${pathLine}`.length <= 118) {
    return `${credLine} · ${pathLine}`;
  }
  if (credLine) return credLine;
  if (pathLine) return pathLine;

  const choice = selectedChoice?.trim().toLowerCase();
  if (choice) {
    const fromChoice = summarizeChoice("facility_vendor_pathway", choice);
    if (fromChoice) return fromChoice;
  }

  const draft = facilityCredentialingDraftFromContact(contact);
  if (draft.platformName.trim()) {
    return sanitizeSummaryCandidate(`Credentialing via ${draft.platformName.trim()}`);
  }

  return null;
}

function summarizeClinicalChampion(
  contact: Record<string, unknown>,
  selectedChoice?: string | null,
  contactDraft?: RapidDiscoverySupportContactDraft | null,
): string | null {
  const choice = selectedChoice?.trim().toLowerCase();
  if (choice) {
    const fromChoice = summarizeChoice("clinical_champion", choice);
    if (fromChoice) return fromChoice;
  }

  const draftName = nameFromContactDraft(contactDraft);
  if (draftName) return `Clinical champion: ${draftName}`;

  const roleLine = summarizeWorkflowRoles(contactDraft?.workflowResponsibilities ?? []);
  if (roleLine) return roleLine;

  const raw = String(contact.provider_champion_potential ?? "").trim();
  const display = formatIntelligenceCaptureDisplay("provider_champion_potential", raw);
  return sanitizeSummaryCandidate(display ?? raw);
}

export type StageMappingCompactSummaryInput = {
  question: StageMappingQuestion;
  contact: Record<string, unknown>;
  selectedChoice?: string | null;
  metadata?: Record<string, string>;
  mappingDetail?: DiscoveryMappingQuestionView | null;
  providerContactDraft?: RapidDiscoverySupportContactDraft | null;
  facilityContactDraft?: RapidDiscoverySupportContactDraft | null;
  contactDraft?: RapidDiscoverySupportContactDraft | null;
};

export function formatStageMappingCompactSummary(input: StageMappingCompactSummaryInput): string | null {
  const signalId = input.question.signalId as StageMappingSignalId;
  const { contact, selectedChoice, metadata, mappingDetail } = input;

  let summary: string | null = null;

  switch (signalId) {
    case "observation_approval":
      summary = summarizeObservationApproval(contact, selectedChoice, mappingDetail);
      break;
    case "scheduling_owner":
      summary = summarizeSchedulingOwner(
        contact,
        selectedChoice,
        metadata,
        input.providerContactDraft,
        input.facilityContactDraft,
      );
      break;
    case "facility_vendor_pathway":
      summary = summarizeFacilityPathway(contact, selectedChoice, metadata);
      break;
    case "clinical_champion":
      summary = summarizeClinicalChampion(contact, selectedChoice, input.contactDraft);
      break;
    case "workflow_visibility": {
      const choice =
        selectedChoice?.trim().toLowerCase() ||
        resolveWorkflowMaturityFromContact(contact) ||
        "";
      summary = choice ? summarizeChoice("workflow_visibility", choice) : null;
      if (!summary) {
        const display = formatIntelligenceCaptureDisplay(
          input.question.dbKey,
          contact[input.question.dbKey] as string,
        );
        summary = sanitizeSummaryCandidate(display);
      }
      break;
    }
    default: {
      const choice = selectedChoice?.trim().toLowerCase();
      if (choice) summary = summarizeChoice(signalId, choice);
      if (!summary && mappingDetail?.conditionalWorkflow?.answer) {
        summary = sanitizeSummaryCandidate(mappingDetail.conditionalWorkflow.answer);
      }
      if (!summary) {
        summary = sanitizeSummaryCandidate(mappingDetail?.currentState.summary);
      }
      break;
    }
  }

  if (summary) return summary;

  const choice = selectedChoice?.trim().toLowerCase();
  if (choice) {
    const fromChoice = summarizeChoice(signalId, choice);
    if (fromChoice) return fromChoice;
  }

  return sanitizeSummaryCandidate(mappingDetail?.currentState.summary) ?? null;
}
