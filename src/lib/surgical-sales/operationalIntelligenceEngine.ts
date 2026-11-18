/**
 * Canonical operational intelligence engine — single source for debrief mapping,
 * pathway guardrails, and cross-surface read models.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  buildSchedulingOwnershipEvidenceSummary,
  classifySchedulingDebriefStrength,
  humanEvidenceForDomain,
  inferSchedulingControlFromDebrief,
} from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import {
  assessObservationAccessFromDebrief,
  buildObservationAccessDebriefPersistValue,
  debriefExplicitlyApprovesObservation,
  debriefIndicatesObservationInterest,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import { enrichDebriefMappingWithPartialLeads } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import {
  buildParseResultFromOpenAiMapping,
  type LogUpdateOpenAiMapping,
} from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { sanitizeDiscoveryEvidenceQuote } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  countObservedProcedures,
  deriveGatedPathwayStage,
  hasDebriefNotesReviewedWithSurgeon,
  hasValidatedClinicalInterest,
  isProductSalesConversationAllowed,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import { SALES_PATHWAY_MIN_OBSERVATIONS } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import {
  OPERATIONAL_DOMAIN_LABELS,
  type DomainReadiness,
  type OperationalAction,
  type OperationalBlocker,
  type OperationalConfidence,
  type OperationalIntelligenceDomain,
  type OperationalSignal,
  type OperationalSignalSourceType,
  type OperationalSignalStatus,
  type OperationalSignalType,
  type ProviderOperationalStage,
  type ProviderOperationalState,
  type SoftWorkflowContact,
} from "@/lib/surgical-sales/operationalIntelligenceTypes";

const NOW_ISO = () => new Date().toISOString();

function signalId(parts: string[]): string {
  return parts.join(":").replace(/\s+/g, "_").slice(0, 120);
}

function slugDomain(domain: OperationalIntelligenceDomain): string {
  return domain;
}

/** UI-safe text — strips enum tokens and internal keys. */
export function sanitizeOperationalUserText(text: string | null | undefined, max = 280): string {
  let t = String(text ?? "").trim();
  if (!t) return "";
  const banned = [
    /\bdiscussed_only\b/gi,
    /\bcredentialing_required\b/gi,
    /\bobservation_scheduling_control\b/gi,
    /\bshared_workflow\b/gi,
    /\bprovider_office\b/gi,
    /\b\[Partial lead\]\s*/gi,
    /\bStill needed:\s*/gi,
  ];
  for (const re of banned) t = t.replace(re, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  if (t.length > max) return `${t.slice(0, max - 1)}…`;
  return t;
}

const DOMAIN_FROM_DB_KEY: Partial<Record<string, OperationalIntelligenceDomain>> = {
  provider_observation_feasibility: "access_readiness",
  provider_observation_access_path: "access_readiness",
  provider_evaluation_openness: "access_readiness",
  provider_observation_scheduling_control: "scheduling_ownership",
  provider_scheduling_contact: "scheduling_ownership",
  provider_facility_scheduling_contact: "scheduling_ownership",
  provider_observation_coordinator_contact: "scheduling_ownership",
  provider_observation_credentialing_needed: "credentialing",
  provider_credentialing_platform_name: "credentialing",
  provider_credentialing_status: "credentialing",
  provider_procedure_focus: "clinical_fit",
  provider_technique_preferences: "clinical_fit",
  provider_workflow_pain_points: "clinical_fit",
  provider_competitive_products: "product_interest",
  provider_preference_card_signals: "product_interest",
  provider_champion_potential: "relationship",
  provider_decision_maker_status: "relationship",
  influence_level: "relationship",
  provider_case_volume_estimate: "case_commitment",
  provider_strategic_goal: "outcomes",
  provider_dissatisfaction_areas: "outcomes",
};

const DOMAIN_FROM_AI: Partial<Record<IntelligenceDomain, OperationalIntelligenceDomain>> = {
  or_access: "access_readiness",
  scheduling: "scheduling_ownership",
  credentialing: "credentialing",
  workflow: "clinical_fit",
  case_mix: "clinical_fit",
  product_fit: "product_interest",
  evaluation: "evaluation_readiness",
  relationship: "relationship",
  stakeholders: "relationship",
  procurement: "case_commitment",
  next_steps: "access_readiness",
};

function statusFromField(
  dbKey: string,
  value: string,
  contact: Record<string, unknown>,
): OperationalSignalStatus {
  if (isIntelligenceFieldValidatedOnFile(dbKey, contact)) return "confirmed";
  if (/\bblocked\b/i.test(value)) return "blocked";
  if (/\bpartial\b/i.test(value) || value.startsWith("[Partial lead]")) return "partial";
  if (fieldHasIntelligenceSignal(dbKey, value)) return "likely";
  return "unknown";
}

function confidenceFromStatus(status: OperationalSignalStatus): OperationalConfidence {
  if (status === "confirmed") return "provider_confirmed";
  if (status === "likely" || status === "partial") return "operationally_inferred";
  if (status === "blocked" || status === "conditional") return "operationally_inferred";
  return "unknown";
}

function extractKarenFromNote(note: string): { name: string; role: string } | null {
  if (!/\bKaren\b/i.test(note)) return null;
  return {
    name: "Karen",
    role: /\bschedul|timing\b/i.test(note) ? "Scheduling coordinator" : "Office contact",
  };
}

function extractNamedContactFromValue(value: string): { name: string; role: string | null } | null {
  const m = value.match(/\[Partial lead\]\s*([A-Z][a-z]+)/);
  if (m?.[1]) {
    return {
      name: m[1],
      role: /\bschedul/i.test(value) ? "Scheduling coordinator" : null,
    };
  }
  return null;
}

/** Map debrief narrative + optional parse result into canonical operational signals. */
export function mapDebriefNarrativeToOperationalSignals(input: {
  providerId: string;
  narrative: string;
  organizationId?: string;
  engagementId?: string;
  debriefId?: string;
  sourceLabel?: string;
  parse?: LogUpdateParseResult | null;
}): OperationalSignal[] {
  const note = input.narrative.trim();
  if (!note) return [];

  const sourceLabel = input.sourceLabel ?? "Debrief";
  const sourceType: OperationalSignalSourceType = "debrief";
  const ts = NOW_ISO();
  const signals: OperationalSignal[] = [];

  const push = (row: Omit<OperationalSignal, "providerId" | "createdAt" | "updatedAt">) => {
    signals.push({
      ...row,
      providerId: input.providerId,
      organizationId: input.organizationId,
      engagementId: input.engagementId,
      debriefId: input.debriefId,
      createdAt: ts,
      updatedAt: ts,
    });
  };

  // --- Scheduling ownership ---
  const schedulingStrength = classifySchedulingDebriefStrength(note);
  if (schedulingStrength !== "none") {
    const isClear = schedulingStrength === "clear";
    const control = isClear ? inferSchedulingControlFromDebrief(note) : null;
    const evidence = buildSchedulingOwnershipEvidenceSummary(note);
    push({
      id: signalId(["sched", input.providerId, "ownership"]),
      domain: "scheduling_ownership",
      signalType: "evidence",
      label: isClear ? "Scheduling ownership identified" : "Scheduling coordination lead surfaced",
      summary: sanitizeOperationalUserText(
        isClear
          ? evidence
          : "Scheduling mentioned indirectly — confirm office vs hospital authority and capture contact details.",
      ),
      evidenceText: evidence,
      confidence: isClear ? "operationally_inferred" : "early_signal",
      status: isClear ? "likely" : "partial",
      suggestedAnswer:
        control === "shared_workflow" ? "shared_scheduling_workflow" : control ?? undefined,
      sourceType,
      sourceLabel,
    });

    const namedContact = extractKarenFromNote(note);
    if (namedContact) {
      push({
        id: signalId(["sched", input.providerId, "soft", namedContact.name]),
        domain: "scheduling_ownership",
        signalType: "soft_contact",
        label: `${namedContact.name} — workflow contact lead`,
        summary: sanitizeOperationalUserText(evidence),
        evidenceText: evidence,
        confidence: isClear ? "operationally_inferred" : "early_signal",
        status: "partial",
        softContactName: namedContact.name,
        softContactRole: namedContact.role,
        sourceType,
        sourceLabel,
      });

      push({
        id: signalId(["sched", input.providerId, "next", "contact"]),
        domain: "scheduling_ownership",
        signalType: "next_step",
        label: "Create workflow contact",
        summary: `Capture ${namedContact.name}'s contact details and confirm scheduling authority.`,
        confidence: isClear ? "operationally_inferred" : "early_signal",
        status: "partial",
        sourceType,
        sourceLabel,
      });
    }
  }

  // --- Access readiness (interest vs approval) ---
  const accessAssessment = assessObservationAccessFromDebrief(note);
  if (debriefIndicatesObservationInterest(note)) {
    const evidence =
      accessAssessment.evidenceQuote ??
      humanEvidenceForDomain("or_access", note) ??
      buildObservationAccessDebriefPersistValue(accessAssessment);
    push({
      id: signalId(["access", input.providerId, "obs"]),
      domain: "access_readiness",
      signalType: "evidence",
      label: accessAssessment.observationApprovalExplicit
        ? "Observation approval stated"
        : "Observation interest without approval",
      summary: sanitizeOperationalUserText(buildObservationAccessDebriefPersistValue(accessAssessment)),
      evidenceText: sanitizeOperationalUserText(evidence) ?? undefined,
      confidence: debriefExplicitlyApprovesObservation(note)
        ? "operationally_inferred"
        : "early_signal",
      status: accessAssessment.observationApprovalExplicit ? "partial" : "partial",
      sourceType,
      sourceLabel,
    });

    if (!accessAssessment.observationApprovalExplicit) {
      push({
        id: signalId(["access", input.providerId, "blocker", "approval"]),
        domain: "access_readiness",
        signalType: "blocker",
        label: "Observation approval not confirmed",
        summary: "Observation interest noted; official approval still needs confirmation.",
        evidenceText: evidence,
        confidence: "early_signal",
        status: "blocked",
        blockerType: "provider_approval_required",
        sourceType,
        sourceLabel,
      });
    }

    if (accessAssessment.blockers.includes("credentialing")) {
      push({
        id: signalId(["access", input.providerId, "blocker", "credentialing"]),
        domain: "access_readiness",
        signalType: "blocker",
        label: "Credentialing before observation",
        summary: "Observation may depend on completing vendor credentialing first.",
        evidenceText: evidence,
        confidence: "early_signal",
        status: "conditional",
        blockerType: "credentialing_required",
        sourceType,
        sourceLabel,
      });
    }
  }

  // --- Product interest guardrail (ACSIS) ---
  if (/\bACSIS\b/i.test(note) || /\bseemed interested\b/i.test(note) && /\bproduct\b/i.test(note)) {
    push({
      id: signalId(["product", input.providerId, "early"]),
      domain: "product_interest",
      signalType: "early_signal",
      label: "Early clinical interest surfaced",
      summary: sanitizeOperationalUserText(
        "ACSIS discussed conceptually — observe relevant cases and validate fit before evaluation.",
      ),
      evidenceText: sanitizeOperationalUserText(
        note.match(/[^.]{0,80}ACSIS[^.]{0,80}\./i)?.[0] ?? "Product interest mentioned without case validation.",
      ),
      confidence: "early_signal",
      status: "partial",
      sourceType,
      sourceLabel,
    });

    push({
      id: signalId(["product", input.providerId, "next", "observe"]),
      domain: "product_interest",
      signalType: "next_step",
      label: "Observe cases before evaluation",
      summary: `Complete at least ${SALES_PATHWAY_MIN_OBSERVATIONS} observations and review notes with surgeon before product evaluation.`,
      confidence: "early_signal",
      status: "partial",
      sourceType,
      sourceLabel,
    });
  }

  // --- Credentialing ---
  if (/\bcredential/i.test(note)) {
    const evidence =
      humanEvidenceForDomain("credentialing", note) ??
      "Vendor credentialing pathway mentioned; platform and steps need confirmation.";
    push({
      id: signalId(["cred", input.providerId]),
      domain: "credentialing",
      signalType: "evidence",
      label: "Credentialing pathway noted",
      summary: sanitizeOperationalUserText(evidence),
      evidenceText: evidence,
      confidence: /\bIntelliCentrics\b/i.test(note) ? "operationally_inferred" : "early_signal",
      status: "partial",
      sourceType,
      sourceLabel,
    });
  }

  // --- Clinical fit / procedure focus ---
  if (
    /\babdominal wall\b/i.test(note) ||
    /\brobotic hernia\b/i.test(note) ||
    (/\bhernia\b/i.test(note) && /\bvolume\b/i.test(note)) ||
    /\bprocedure\b/i.test(note)
  ) {
    const evidence =
      humanEvidenceForDomain("case_mix", note) ??
      humanEvidenceForDomain("workflow", note) ??
      (/\brobotic hernia\b/i.test(note)
        ? "Robotic hernia case volume appears to be increasing."
        : "Procedure focus or workflow context discussed.");
    push({
      id: signalId(["clinical", input.providerId]),
      domain: "clinical_fit",
      signalType: "evidence",
      label: "Clinical context captured",
      summary: sanitizeOperationalUserText(evidence),
      evidenceText: evidence,
      confidence: "operationally_inferred",
      status: "partial",
      sourceType,
      sourceLabel,
    });
  }

  // Merge field updates from parse result when present
  if (input.parse) {
    for (const field of input.parse.fieldUpdates) {
      const fromField = operationalSignalFromFieldUpdate({
        field,
        providerId: input.providerId,
        contact: {},
        sourceType,
        sourceLabel,
        parse: input.parse,
        engagementId: input.engagementId,
        debriefId: input.debriefId,
      });
      if (fromField) signals.push(fromField);
    }
  }

  return dedupeOperationalSignals(signals);
}

/** Build parse + signals from raw debrief text (used in tests and analyze flow). */
export function buildOperationalSignalsFromDebriefText(input: {
  providerId: string;
  narrative: string;
  sourceLabel?: string;
  existingFields?: Record<string, unknown>;
}): { parse: LogUpdateParseResult; signals: OperationalSignal[] } {
  const enriched = enrichDebriefMappingWithPartialLeads(emptyOpenAiMapping(), input.narrative);
  const writableKeys = [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS];
  const parse = buildParseResultFromOpenAiMapping({
    sourceText: input.narrative,
    mapping: enriched,
    context: { providerId: input.providerId, writableFieldKeys: writableKeys },
    existingFields: (input.existingFields ?? {}) as Record<string, string>,
  });
  const signals = mapDebriefNarrativeToOperationalSignals({
    providerId: input.providerId,
    narrative: input.narrative,
    sourceLabel: input.sourceLabel,
    parse,
  });
  return { parse, signals };
}

function emptyOpenAiMapping(): LogUpdateOpenAiMapping {
  return {
    summary: "",
    confidence: "medium",
    reasoning: "",
    source_scope: "debrief",
    operational_signals: [],
    confirmed_updates: [],
    partial_updates: [],
    still_to_validate: [],
    recommended_next_moves: [],
    do_not_update: [],
  };
}

function operationalSignalFromFieldUpdate(input: {
  field: LogUpdateRoutedFieldUpdate;
  providerId: string;
  contact: Record<string, unknown>;
  sourceType: OperationalSignalSourceType;
  sourceLabel: string;
  parse?: LogUpdateParseResult | null;
  engagementId?: string;
  debriefId?: string;
}): OperationalSignal | null {
  const dbKey = input.field.dbKey;
  if (!dbKey) return null;

  const domain = DOMAIN_FROM_DB_KEY[dbKey];
  if (!domain) return null;

  const value = String(input.field.proposedValue ?? "").trim();
  if (!value) return null;

  // Product interest fields should not become evaluation readiness
  if (domain === "product_interest" && /evaluation|commitment|preference card/i.test(dbKey)) {
    return null;
  }

  const status = statusFromField(dbKey, value, input.contact);
  const evidence =
    sanitizeDiscoveryEvidenceQuote(value) ??
    sanitizeOperationalUserText(value);

  const signalType: OperationalSignalType =
    value.startsWith("[Partial lead]") && /\b[A-Z][a-z]+\b/.test(value)
      ? "soft_contact"
      : "evidence";

  const named = extractNamedContactFromValue(value);

  return {
    id: signalId(["field", dbKey, input.providerId]),
    providerId: input.providerId,
    engagementId: input.engagementId,
    debriefId: input.debriefId,
    domain,
    signalType,
    label: sanitizeOperationalUserText(input.field.label) || OPERATIONAL_DOMAIN_LABELS[domain],
    summary: sanitizeOperationalUserText(evidence) || OPERATIONAL_DOMAIN_LABELS[domain],
    evidenceText: evidence || undefined,
    confidence: confidenceFromStatus(status),
    status,
    softContactName: named?.name,
    softContactRole: named?.role ?? undefined,
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel,
    createdAt: NOW_ISO(),
    updatedAt: NOW_ISO(),
    dbKey,
  };
}

/** Derive operational signals persisted on a provider contact row. */
export function operationalSignalsFromContact(input: {
  providerId: string;
  contact: Record<string, unknown>;
  engagementId?: string;
}): OperationalSignal[] {
  const meta = parseProviderIntelligenceFieldMetadata(
    input.contact.provider_intelligence_field_metadata,
  );
  const signals: OperationalSignal[] = [];
  const ts = NOW_ISO();

  for (const [dbKey, mappedDomain] of Object.entries(DOMAIN_FROM_DB_KEY)) {
    if (!mappedDomain) continue;
    const domain = mappedDomain;
    const raw = String(input.contact[dbKey] ?? "").trim();
    if (!raw && !meta[dbKey]?.evidence_text) continue;

    const fieldMeta = meta[dbKey];
    const evidence =
      sanitizeDiscoveryEvidenceQuote(fieldMeta?.evidence_text) ??
      sanitizeDiscoveryEvidenceQuote(raw);
    if (!evidence && !fieldHasIntelligenceSignal(dbKey, raw)) continue;

    const status = statusFromField(dbKey, raw, input.contact);
    const sourceLabel = fieldMeta?.source_label?.trim() || "Provider profile";
    const sourceType = (fieldMeta?.source_type as OperationalSignalSourceType) || "manual";

    let signalType: OperationalSignalType = "evidence";
    const named = extractNamedContactFromValue(raw);
    if (named || dbKey.includes("contact")) signalType = "soft_contact";

    signals.push({
      id: signalId(["contact", dbKey, input.providerId]),
      providerId: input.providerId,
      engagementId: input.engagementId,
      domain,
      signalType,
      label: OPERATIONAL_DOMAIN_LABELS[domain],
      summary: sanitizeOperationalUserText(evidence ?? raw),
      evidenceText: evidence ?? undefined,
      confidence: confidenceFromStatus(status),
      status,
      softContactName: named?.name,
      softContactRole: named?.role ?? undefined,
      sourceType,
      sourceLabel,
      createdAt: fieldMeta?.updated_at ?? ts,
      updatedAt: fieldMeta?.updated_at ?? ts,
      dbKey,
      suggestedAnswer:
        dbKey === "provider_observation_scheduling_control" ? raw : undefined,
    });
  }

  return dedupeOperationalSignals(signals);
}

export function dedupeOperationalSignals(signals: OperationalSignal[]): OperationalSignal[] {
  const byKey = new Map<string, OperationalSignal>();
  for (const s of signals) {
    const key = `${s.domain}:${s.signalType}:${s.dbKey ?? s.label}:${s.softContactName ?? ""}`;
    const existing = byKey.get(key);
    if (!existing || s.updatedAt >= existing.updatedAt) byKey.set(key, s);
  }
  return [...byKey.values()];
}

export function mergeOperationalSignals(...groups: OperationalSignal[][]): OperationalSignal[] {
  return dedupeOperationalSignals(groups.flat());
}

export function signalsForDomain(
  signals: OperationalSignal[],
  domain: OperationalIntelligenceDomain,
): OperationalSignal[] {
  return signals.filter((s) => s.domain === domain);
}

export function primaryEvidenceForDomain(
  signals: OperationalSignal[],
  domain: OperationalIntelligenceDomain,
): OperationalSignal | null {
  const domainSignals = signalsForDomain(signals, domain);
  return (
    domainSignals.find((s) => s.signalType === "evidence") ??
    domainSignals.find((s) => s.signalType === "early_signal") ??
    domainSignals[0] ??
    null
  );
}

/** Apply 360 pathway guardrails to domain readiness unlock flags. */
export function applyOperationalPathwayGuardrails(
  state: ProviderOperationalState,
  gateInput: PathwayGateInput,
): ProviderOperationalState {
  const observationCount = countObservedProcedures(gateInput);
  const notesReviewed = hasDebriefNotesReviewedWithSurgeon(gateInput);
  const validatedInterest = hasValidatedClinicalInterest(gateInput);
  const productAllowed = isProductSalesConversationAllowed(gateInput);

  const readinessByDomain = { ...state.readinessByDomain };

  const lock = (domain: OperationalIntelligenceDomain, reason: string) => {
    const row = readinessByDomain[domain];
    if (!row) return;
    readinessByDomain[domain] = {
      ...row,
      unlocked: false,
      blockReason: reason,
      readinessPercent: Math.min(row.readinessPercent, 35),
    };
  };

  if (!productAllowed) {
    lock(
      "evaluation_readiness",
      `Requires ${SALES_PATHWAY_MIN_OBSERVATIONS} observed cases, surgeon-reviewed notes, and validated clinical interest.`,
    );
    lock("case_commitment", "Case commitment unlocks after structured product evaluation.");
    if (observationCount < SALES_PATHWAY_MIN_OBSERVATIONS) {
      const product = readinessByDomain.product_interest;
      if (product && product.status !== "confirmed") {
        readinessByDomain.product_interest = {
          ...product,
          summary:
            product.summary ??
            "Early clinical interest only — observe cases before product evaluation.",
        };
      }
    }
  }

  if (!validatedInterest || !notesReviewed) {
    lock("evaluation_readiness", "Validate clinical fit with surgeon-reviewed observation notes.");
  }

  const committedCases = Boolean(String(gateInput.contact.provider_preference_card_signals ?? "").trim());
  if (!committedCases) {
    lock("outcomes", "Outcomes tracking follows committed case use and selected outcomes.");
  }

  return { ...state, readinessByDomain };
}

function deriveDomainReadiness(
  domain: OperationalIntelligenceDomain,
  signals: OperationalSignal[],
): DomainReadiness {
  const domainSignals = signalsForDomain(signals, domain);
  const primary = primaryEvidenceForDomain(signals, domain);
  const blocker = domainSignals.find((s) => s.signalType === "blocker");

  let status: OperationalSignalStatus = primary?.status ?? "unknown";
  if (blocker && status !== "confirmed") status = "blocked";

  const statusScore: Record<OperationalSignalStatus, number> = {
    unknown: 8,
    partial: 45,
    likely: 60,
    conditional: 55,
    blocked: 25,
    confirmed: 100,
  };

  const hasEarlyProductOnly =
    domain === "product_interest" &&
    domainSignals.some((s) => s.signalType === "early_signal") &&
    !domainSignals.some((s) => s.status === "confirmed");

  return {
    domain,
    label: OPERATIONAL_DOMAIN_LABELS[domain],
    status,
    readinessPercent: hasEarlyProductOnly
      ? Math.min(statusScore[status], 40)
      : statusScore[status],
    summary: primary ? sanitizeOperationalUserText(primary.summary) : null,
    primarySignalId: primary?.id ?? null,
    unlocked: domain !== "evaluation_readiness" && domain !== "case_commitment" && domain !== "outcomes",
    blockReason: blocker ? sanitizeOperationalUserText(blocker.summary) : null,
  };
}

function deriveBlockers(signals: OperationalSignal[]): OperationalBlocker[] {
  return signals
    .filter((s) => s.signalType === "blocker")
    .map((s) => ({
      id: s.id,
      domain: s.domain,
      label: s.label,
      summary: sanitizeOperationalUserText(s.summary),
      signalId: s.id,
    }));
}

function deriveNextActions(signals: OperationalSignal[]): OperationalAction[] {
  const priority: Record<OperationalIntelligenceDomain, number> = {
    access_readiness: 1,
    scheduling_ownership: 2,
    credentialing: 3,
    observation_readiness: 4,
    clinical_fit: 5,
    relationship: 6,
    product_interest: 7,
    evaluation_readiness: 8,
    case_commitment: 9,
    outcomes: 10,
  };

  return signals
    .filter((s) => s.signalType === "next_step")
    .map((s) => ({
      id: s.id,
      domain: s.domain,
      label: s.label,
      summary: sanitizeOperationalUserText(s.summary),
      priority: priority[s.domain],
    }))
    .sort((a, b) => a.priority - b.priority);
}

function deriveSoftContacts(signals: OperationalSignal[]): SoftWorkflowContact[] {
  return signals
    .filter((s) => s.signalType === "soft_contact" && s.softContactName)
    .map((s) => ({
      id: s.id,
      name: s.softContactName!,
      role: s.softContactRole ?? null,
      scope: s.domain === "scheduling_ownership" ? "Provider office / shared OR scheduling" : null,
      status: s.status,
      signalId: s.id,
      confirmed: false,
    }));
}

/** Build canonical provider operational state from contact + optional pending debrief. */
export function buildProviderOperationalState(input: {
  providerId: string;
  contact: Record<string, unknown>;
  gateInput?: PathwayGateInput;
  pendingDebrief?: { narrative: string; parse?: LogUpdateParseResult | null; sourceLabel?: string } | null;
  engagementId?: string;
}): ProviderOperationalState {
  const persisted = operationalSignalsFromContact({
    providerId: input.providerId,
    contact: input.contact,
    engagementId: input.engagementId,
  });

  const pending =
    input.pendingDebrief?.narrative.trim() ?
      mapDebriefNarrativeToOperationalSignals({
        providerId: input.providerId,
        narrative: input.pendingDebrief.narrative,
        parse: input.pendingDebrief.parse ?? null,
        sourceLabel: input.pendingDebrief.sourceLabel,
        engagementId: input.engagementId,
      })
    : [];

  const mappedEvidence = mergeOperationalSignals(persisted, pending);

  const gateInput: PathwayGateInput = input.gateInput ?? { contact: input.contact };
  const currentStage = deriveGatedPathwayStage(gateInput) as ProviderOperationalStage;

  const readinessByDomain = {} as Record<OperationalIntelligenceDomain, DomainReadiness>;
  for (const domain of Object.keys(OPERATIONAL_DOMAIN_LABELS) as OperationalIntelligenceDomain[]) {
    readinessByDomain[domain] = deriveDomainReadiness(domain, mappedEvidence);
  }

  let state: ProviderOperationalState = {
    providerId: input.providerId,
    currentStage,
    readinessByDomain,
    blockers: deriveBlockers(mappedEvidence),
    nextActions: deriveNextActions(mappedEvidence),
    mappedEvidence,
    softContacts: deriveSoftContacts(mappedEvidence),
  };

  state = applyOperationalPathwayGuardrails(state, gateInput);
  return state;
}

/** Evidence summary for a discovery mapping db key from canonical signals. */
export function operationalEvidenceForDbKey(
  state: ProviderOperationalState,
  dbKey: string,
): { summary: string; evidence: string | null; status: OperationalSignalStatus } | null {
  const domain = DOMAIN_FROM_DB_KEY[dbKey];
  if (!domain) return null;

  const signal =
    state.mappedEvidence.find((s) => s.dbKey === dbKey) ??
    primaryEvidenceForDomain(state.mappedEvidence, domain);

  if (!signal) return null;

  const evidence = signal.evidenceText ?? signal.summary;
  return {
    summary: sanitizeOperationalUserText(evidence),
    evidence: sanitizeOperationalUserText(evidence),
    status: signal.status,
  };
}

/** Signals contributed by a specific engagement (post-save or pending). */
export function operationalSignalsForEngagement(input: {
  providerId: string;
  engagementId: string;
  contact: Record<string, unknown>;
  engagementSourceLabel?: string;
}): OperationalSignal[] {
  const all = operationalSignalsFromContact({
    providerId: input.providerId,
    contact: input.contact,
    engagementId: input.engagementId,
  });
  const label = input.engagementSourceLabel?.trim().toLowerCase();
  if (!label) return all.filter((s) => s.engagementId === input.engagementId);
  return all.filter(
    (s) =>
      s.engagementId === input.engagementId ||
      s.sourceLabel.toLowerCase().includes(label),
  );
}

export function operationalSignalsFromAiMapping(
  mapping: LogUpdateOpenAiMapping,
  providerId: string,
  sourceLabel: string,
): OperationalSignal[] {
  const ts = NOW_ISO();
  const signals: OperationalSignal[] = [];
  for (const row of mapping.partial_updates) {
    const domain = DOMAIN_FROM_AI[row.domain];
    if (!domain) continue;
    signals.push({
      id: signalId(["ai", row.domain, row.label, providerId]),
      providerId,
      domain,
      signalType: domain === "product_interest" ? "early_signal" : "evidence",
      label: sanitizeOperationalUserText(row.label),
      summary: sanitizeOperationalUserText(row.value),
      evidenceText: sanitizeOperationalUserText(row.value),
      confidence: "operationally_inferred",
      status: "partial",
      sourceType: "debrief",
      sourceLabel,
      createdAt: ts,
      updatedAt: ts,
    });
  }
  return dedupeOperationalSignals(signals);
}

/** Returns true when generic pending/unknown copy should be suppressed. */
export function hasOperationalEvidenceForDbKey(
  state: ProviderOperationalState,
  dbKey: string,
): boolean {
  return operationalEvidenceForDbKey(state, dbKey) != null;
}

export type { ProviderIntelligenceFieldMetadataMap };
