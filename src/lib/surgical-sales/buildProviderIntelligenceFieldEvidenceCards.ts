/**
 * Provider Intelligence tab — evidence cards from saved intelligence (not stale field blobs).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type {
  FieldBriefingEvidenceCard,
  FieldBriefingEvidenceIcon,
  FieldBriefingEvidenceImpact,
} from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { isPlausiblePersonName, isInvalidSchedulingContactArtifact } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  isValidProductName,
  resolveCurrentProductFromContact,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";
import type { ProviderIntelligenceTimelineEvent } from "@/lib/surgical-sales/buildProviderIntelligenceTimeline";
import type { ProviderFieldIntelligenceModel } from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import type { NormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";
import { isCredentialingWorkflowComplete } from "@/lib/surgical-sales/observationAccessWorkflowState";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { schedulingOwnerDisplayLine } from "@/lib/surgical-sales/schedulingIntelligenceReadModel";
import { SCHEDULING_OWNER_FIELD_DB_KEYS } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { ProviderObservationIntelligenceRollup } from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import { isLowQualityIntelligenceText } from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import { adaptUniversalFactsToObservationFieldEvidenceCards } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToFieldEvidenceCards";
import {
  adaptUniversalFactsToClinicalTrendEvidenceCards,
  adaptUniversalFactsToProductInterestEvidenceCard,
  adaptUniversalFactsToWorkflowEvidenceCards,
} from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProviderClinicalSignals";
import { isObservationCaseComplete } from "@/lib/surgical-sales/observationProgramGate";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  resolveReadModelSection,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceFieldAttribution,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldLabelForRepPreview } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { resolveIntelligenceSourceDisplay } from "@/lib/surgical-sales/resolveIntelligenceSourceDisplay";
import { sanitizeDiscoveryEvidenceQuote } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";

const PREVIEW_LIMIT = 5;

function firstFieldMeta(
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
  dbKeys: string[],
): IntelligenceFieldAttribution | undefined {
  for (const dbKey of dbKeys) {
    const meta = fieldMeta[dbKey];
    if (meta) return meta;
  }
  return undefined;
}

function evidenceQuoteFromMeta(meta: IntelligenceFieldAttribution | undefined): string | null {
  const quote = sanitizeDiscoveryEvidenceQuote(meta?.evidence_text);
  return quote?.trim() ? quote : null;
}

function withEvidenceSource(
  card: FieldBriefingEvidenceCard,
  input: {
    meta?: IntelligenceFieldAttribution;
    engagements?: ProviderEngagementSummary[];
    providerId: string;
    mappedFieldDbKey?: string;
    sourceQuote?: string | null;
    cases?: Array<Record<string, unknown>>;
    caseId?: string | null;
  },
): FieldBriefingEvidenceCard {
  const caseRow = input.caseId
    ? (input.cases ?? []).find((row) => String(row.id) === String(input.caseId))
    : undefined;
  const source = resolveIntelligenceSourceDisplay({
    meta: input.meta,
    engagements: input.engagements,
    providerId: input.providerId,
    caseType: caseRow ? String(caseRow.case_type ?? "") : null,
  });
  const quote = input.sourceQuote ?? evidenceQuoteFromMeta(input.meta) ?? card.excerpt;
  return {
    ...card,
    dateLabel: source.sourceRelativeLabel,
    sourceTypeLabel: source.sourceTypeLabel,
    sourceDateLabel: source.sourceDateLabel,
    sourceQuote: quote,
    mappedFieldLabel: input.mappedFieldDbKey
      ? fieldLabelForRepPreview(input.mappedFieldDbKey)
      : card.mappedFieldLabel,
    href: card.href ?? source.href,
  };
}

function introCallIsPrimaryEvidenceSource(
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
  dbKeys: string[],
  engagements?: ProviderEngagementSummary[],
): boolean {
  const meta = firstFieldMeta(fieldMeta, dbKeys);
  if (!meta) return false;
  const source = resolveIntelligenceSourceDisplay({
    meta,
    engagements,
    providerId: "check",
  });
  return source.sourceType === "intro_call";
}

const STALE_OBSERVATION_APPROVAL_DENIED_RE =
  /Observation\s+interest:\s*Yes[\s.]*Observation\s+approval:\s*No/i;

const GENERIC_ENGAGEMENT_EXCERPT_RE =
  /^(?:intro\s+call|debrief|engagement\s+debrief|observation\s+case)$/i;

function normalizeCaseType(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function resolveSchedulerName(
  contact: Record<string, unknown>,
  commercial: ReturnType<typeof readProviderCommercialIntelligence>,
): string | null {
  const supportName = commercial?.support_contacts.find((c) =>
    isPlausiblePersonName(c.contact_name),
  )?.contact_name;
  if (supportName && isPlausiblePersonName(supportName)) return supportName;

  for (const dbKey of SCHEDULING_OWNER_FIELD_DB_KEYS) {
    const line = String(contact[dbKey] ?? "").trim();
    if (!line || isInvalidSchedulingContactArtifact(line)) continue;
    const candidates = line.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
    for (const candidate of candidates) {
      if (isPlausiblePersonName(candidate)) return candidate;
    }
  }

  const fallbackLine = schedulingOwnerDisplayLine(contact) ?? "";
  const fallbackCandidates = fallbackLine.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
  for (const candidate of fallbackCandidates) {
    if (isPlausiblePersonName(candidate)) return candidate;
  }
  return null;
}

function observationApproved(permission: NormalizedObservationPermission): boolean {
  return (
    permission.stageId === "permission_confirmed" ||
    permission.stageId === "observation_scheduled" ||
    permission.stageId === "observation_completed"
  );
}

function hasScheduledObservation(input: {
  permission: NormalizedObservationPermission;
  cases?: Array<Record<string, unknown>>;
}): boolean {
  if (
    input.permission.stageId === "observation_scheduled" ||
    input.permission.stageId === "observation_completed"
  ) {
    return true;
  }
  return (input.cases ?? []).some((row) => normalizeCaseType(row.case_type) === "observation");
}

import { resolveProductNeedsConfirmation } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProviderIntelligenceClinicalReads";

function productNeedsConfirmationFromCrm(contact: Record<string, unknown>): {
  productName: string;
  sourceText: string | null;
} | null {
  const resolved = resolveCurrentProductFromContact(contact);
  if (!resolved || !isValidProductName(resolved.productName)) return null;
  return {
    productName: resolved.productName,
    sourceText: resolved.sourceText,
  };
}

export function productNeedsConfirmation(
  contact: Record<string, unknown>,
  options?: { providerRuns?: UniversalFactExtractionRun[] },
): {
  productName: string;
  sourceText: string | null;
} | null {
  return resolveProductNeedsConfirmation({
    contact,
    providerRuns: options?.providerRuns,
    crmFallback: () => productNeedsConfirmationFromCrm(contact),
  });
}

function workflowOpportunityNeedsValidation(contact: Record<string, unknown>): string | null {
  const commercial = readProviderCommercialIntelligence(contact);
  for (const entry of commercial?.clinical.entries ?? []) {
    if (entry.category !== "product_opportunity") continue;
    if (/visualization|fixation|workflow/i.test(entry.display_label)) {
      return entry.display_label;
    }
  }

  const raw = String(contact.provider_dissatisfaction_areas ?? "").trim();
  if (/visualization|fixation/i.test(raw)) {
    return "visualization/fixation workflow";
  }
  return null;
}

function hasProviderPainPoints(contact: Record<string, unknown>, model: ProviderFieldIntelligenceModel): boolean {
  if (model.clinical.frustrations.length > 0) return true;
  for (const dbKey of [
    "provider_workflow_pain_points",
    "provider_clinical_frustrations",
    "provider_dissatisfaction_areas",
  ] as const) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (fieldHasIntelligenceSignal(dbKey, raw)) return true;
  }
  return false;
}

function hasStaffWorkflowPainPoints(contact: Record<string, unknown>): boolean {
  for (const dbKey of [
    "provider_or_team_dynamics",
    "provider_workflow_pain_points",
  ] as const) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (fieldHasIntelligenceSignal(dbKey, raw) && /staff|team|nurs|circul|scrub|workflow/i.test(raw)) {
      return true;
    }
  }
  return false;
}

function cardImpact(label: string, validated = true): FieldBriefingEvidenceImpact | null {
  if (/^current product identified:/i.test(label)) {
    const productName = label.replace(/^current product identified:\s*/i, "").trim();
    if (!isValidProductName(productName)) return null;
  }
  return { label, impact: validated ? "validated" : "created" };
}

function pushImpact(
  target: FieldBriefingEvidenceImpact[],
  impact: FieldBriefingEvidenceImpact | null,
): void {
  if (impact) target.push(impact);
}

function dedupeEvidenceImpacts(
  impacts: Array<FieldBriefingEvidenceImpact | null>,
): FieldBriefingEvidenceImpact[] {
  const seen = new Set<string>();
  return impacts.filter((impact): impact is FieldBriefingEvidenceImpact => {
    if (!impact) return false;
    const key = `${impact.label}::${impact.impact}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildObservationAccessCard(input: {
  contact: Record<string, unknown>;
  providerId: string;
  model: ProviderFieldIntelligenceModel;
  permission: NormalizedObservationPermission;
  engagements?: ProviderEngagementSummary[];
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): FieldBriefingEvidenceCard | null {
  const { model, permission } = input;
  const approved = observationApproved(permission);
  const credentialing =
    !isCredentialingWorkflowComplete(input.contact) &&
    (model.credentialing.captureState !== "empty" ||
      readProviderCommercialIntelligence(input.contact)?.credentialing.credentialing_required === "yes");
  const schedulerReferenced = model.scheduler.captureState === "referenced" || model.scheduler.isConfirmed;

  if (!approved && !credentialing && !schedulerReferenced) return null;

  const parts: string[] = [];
  const impacts: FieldBriefingEvidenceImpact[] = [];

  if (approved) {
    parts.push("Observation approval confirmed");
    pushImpact(impacts, cardImpact("Observation approval confirmed"));
  } else if (permission.stageId === "interested" || permission.stageId === "permission_not_yet_confirmed") {
    parts.push("Observation interest captured");
    pushImpact(impacts, cardImpact("Observation interest", false));
  }

  if (credentialing) {
    parts.push("Credentialing required");
    pushImpact(impacts, cardImpact("Credentialing required"));
  }

  if (schedulerReferenced) {
    parts.push("Scheduler referenced for coordination");
    pushImpact(impacts, cardImpact("Scheduler referenced"));
  }

  const accessMeta = firstFieldMeta(input.fieldMeta, [
    "provider_observation_feasibility",
    "provider_observation_access_path",
    "provider_credentialing_status",
    "provider_observation_credentialing_needed",
  ]);
  const accessQuote =
    evidenceQuoteFromMeta(accessMeta) ?? scanLine(parts.join(". ") + ".", 220);

  return withEvidenceSource(
    {
      id: "evidence-observation-access",
      icon: "observation",
      title: "Observation Access",
      dateLabel: "—",
      excerpt: accessQuote,
      whyItMatters: approved
        ? "Provider can advance toward observation scheduling."
        : "Clarifies whether observation access can move forward.",
      intelligenceImpacts: dedupeEvidenceImpacts(impacts),
      href: null,
    },
    {
      meta: accessMeta,
      engagements: input.engagements,
      providerId: input.providerId,
      mappedFieldDbKey: "provider_observation_feasibility",
      sourceQuote: accessQuote,
    },
  );
}

function buildSchedulingContactCard(input: {
  contact: Record<string, unknown>;
  providerId: string;
  model: ProviderFieldIntelligenceModel;
  engagements?: ProviderEngagementSummary[];
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
}): FieldBriefingEvidenceCard | null {
  const commercial = readProviderCommercialIntelligence(input.contact);
  const schedulerName = resolveSchedulerName(input.contact, commercial);
  if (!schedulerName) return null;
  if (input.model.scheduler.captureState === "empty") return null;

  const schedulingMeta = firstFieldMeta(input.fieldMeta, [
    "provider_observation_coordinator_contact",
    "provider_scheduling_contact",
  ]);
  const evidenceQuoteRaw =
    schedulingMeta?.evidence_text?.trim() || null;
  const evidenceQuote =
    evidenceQuoteRaw && !isInvalidSchedulingContactArtifact(evidenceQuoteRaw)
      ? evidenceQuoteRaw
      : schedulerName
        ? `${schedulerName} was referenced as the person who usually helps coordinate the OR schedule.`
        : "Scheduler was referenced for observation coordination.";

  const contactIncomplete =
    input.model.scheduler.captureState === "referenced" ||
    !isIntelligenceFieldValidatedOnFile("provider_observation_coordinator_contact", input.contact);

  const impacts: FieldBriefingEvidenceImpact[] = [];
  pushImpact(impacts, cardImpact(`${schedulerName} — Scheduling Coordinator`));
  if (contactIncomplete) {
    pushImpact(impacts, cardImpact("Contact details incomplete", false));
    pushImpact(impacts, cardImpact("Contact decision required", false));
  }

  return withEvidenceSource(
    {
      id: `evidence-scheduler-${schedulerName.toLowerCase()}`,
      icon: "field_note",
      title: "Scheduling Contact",
      dateLabel: "—",
      excerpt: scanLine(evidenceQuote, 220),
      whyItMatters: `Observation logistics can now be coordinated once ${schedulerName}'s contact details are captured.`,
      intelligenceImpacts: dedupeEvidenceImpacts(impacts),
      href: null,
    },
    {
      meta: schedulingMeta,
      engagements: input.engagements,
      providerId: input.providerId,
      mappedFieldDbKey: "provider_observation_coordinator_contact",
      sourceQuote: scanLine(evidenceQuote, 220),
    },
  );
}

function buildIntroCallSummaryCard(input: {
  contact: Record<string, unknown>;
  providerId: string;
  model: ProviderFieldIntelligenceModel;
  permission: NormalizedObservationPermission;
  engagements?: ProviderEngagementSummary[];
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): FieldBriefingEvidenceCard | null {
  const introEngagement = (input.engagements ?? []).find(
    (e) =>
      String(e.engagement_type ?? "").toLowerCase() === "intro_call" &&
      String(e.status ?? "").toLowerCase() === "completed",
  );
  if (!introEngagement) return null;

  const introEvidenceKeys = [
    "provider_observation_feasibility",
    "provider_observation_coordinator_contact",
    "provider_procedure_focus",
    "provider_competitive_products",
    "provider_credentialing_status",
  ];
  if (!introCallIsPrimaryEvidenceSource(input.fieldMeta, introEvidenceKeys, input.engagements)) {
    return null;
  }

  const commercial = readProviderCommercialIntelligence(input.contact);
  const learnings: string[] = [];
  const impacts: FieldBriefingEvidenceImpact[] = [];

  if (observationApproved(input.permission)) {
    learnings.push("observation approval");
    pushImpact(impacts, cardImpact("Observation approval confirmed"));
  }

  if (
    !isCredentialingWorkflowComplete(input.contact) &&
    (input.model.credentialing.captureState !== "empty" ||
      commercial?.credentialing.credentialing_required === "yes")
  ) {
    learnings.push("credentialing requirement");
    pushImpact(impacts, cardImpact("Credentialing required"));
  }

  if (input.model.scheduler.captureState !== "empty") {
    learnings.push("scheduler involvement");
    pushImpact(impacts, cardImpact("Scheduler referenced"));
  }

  for (const proc of input.model.clinical.procedures) {
    learnings.push(`increased ${proc.toLowerCase()} volume`);
  }
  if (input.model.clinical.procedures.length > 0) {
    pushImpact(impacts, cardImpact("Increasing procedure volume"));
  }

  const product = productNeedsConfirmation(input.contact, {
    providerRuns: input.universalFactsReadModel?.providerRuns,
  });
  if (product) {
    learnings.push(`current ${product.productName} use needing confirmation`);
    pushImpact(impacts, cardImpact(`Current product identified: ${product.productName}`, false));
  }

  if (learnings.length === 0) return null;

  const summary =
    learnings.length === 1
      ? `Intro call confirmed ${learnings[0]}.`
      : `Intro call confirmed ${learnings.slice(0, -1).join(", ")}, and ${learnings[learnings.length - 1]}.`;

  const engagementId = String(introEngagement.id ?? "").trim();
  const introMeta = firstFieldMeta(input.fieldMeta, introEvidenceKeys);

  return withEvidenceSource(
    {
      id: `evidence-intro-${engagementId}`,
      icon: "intro_call",
      title: "Intro Call",
      dateLabel: "—",
      excerpt: scanLine(summary, 240),
      whyItMatters:
        "Establishes access path, observation planning priorities, and early commercial context.",
      intelligenceImpacts: dedupeEvidenceImpacts(impacts),
      href: engagementId ? `/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare` : null,
    },
    {
      meta: introMeta,
      engagements: input.engagements,
      providerId: input.providerId,
      sourceQuote: evidenceQuoteFromMeta(introMeta) ?? scanLine(summary, 240),
    },
  );
}

function buildOieClinicalTrendCards(input: {
  model: ProviderFieldIntelligenceModel;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  engagements?: ProviderEngagementSummary[];
  providerId: string;
}): FieldBriefingEvidenceCard[] {
  const cards: FieldBriefingEvidenceCard[] = [];
  const procedureMeta = input.fieldMeta.provider_procedure_focus;
  const procedureQuote = evidenceQuoteFromMeta(procedureMeta);

  for (const proc of input.model.clinical.procedures) {
    if (isGenericClinicalFactText(proc) || /\bgeneral\s+volume\b/i.test(proc)) continue;
    const excerpt =
      procedureQuote ??
      scanLine(`Increasing ${proc.toLowerCase()} volume noted during discovery.`, 180);
    cards.push(
      withEvidenceSource(
        {
          id: `evidence-clinical-${proc.toLowerCase().replace(/\s+/g, "-")}`,
          icon: "clinical_signal",
          title: "Clinical Trend",
          dateLabel: "—",
          excerpt,
          whyItMatters: "Shows commercial opportunity and clinical fit.",
          intelligenceImpacts: dedupeEvidenceImpacts([
            cardImpact(`${proc} — volume increasing`),
            cardImpact("Increasing procedure volume"),
          ]),
          href: null,
        },
        {
          meta: procedureMeta,
          engagements: input.engagements,
          providerId: input.providerId,
          mappedFieldDbKey: "provider_procedure_focus",
          sourceQuote: excerpt,
        },
      ),
    );
  }
  return cards;
}

function buildClinicalTrendCards(input: {
  model: ProviderFieldIntelligenceModel;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  engagements?: ProviderEngagementSummary[];
  providerId: string;
  providerRuns?: UniversalFactExtractionRun[];
}): FieldBriefingEvidenceCard[] {
  const ufCards =
    input.providerRuns?.length
      ? adaptUniversalFactsToClinicalTrendEvidenceCards({
          providerRuns: input.providerRuns,
        }).map((card) =>
          withEvidenceSource(card, {
            meta: input.fieldMeta.provider_procedure_focus,
            engagements: input.engagements,
            providerId: input.providerId,
            mappedFieldDbKey: "provider_procedure_focus",
            sourceQuote: card.sourceQuote ?? card.excerpt,
          }),
        )
      : [];

  return resolveReadModelSection(ufCards, () =>
    buildOieClinicalTrendCards({
      model: input.model,
      fieldMeta: input.fieldMeta,
      engagements: input.engagements,
      providerId: input.providerId,
    }),
  );
}

function buildOieWorkflowEvidenceCard(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  engagements?: ProviderEngagementSummary[];
  providerId: string;
}): FieldBriefingEvidenceCard | null {
  const raw = String(input.contact.provider_workflow_pain_points ?? "").trim();
  const modelWorkflow = input.model.clinical.workflowObservations.find((line) =>
    /\b(challenge|struggle|tight|pooled|fluid|suction|setup|instrument|reach|friction|pain)\b/i.test(line),
  );
  const workflow = fieldHasIntelligenceSignal("provider_workflow_pain_points", raw)
    ? raw
    : modelWorkflow;
  if (!workflow?.trim()) return null;

  const workflowMeta = input.fieldMeta.provider_workflow_pain_points;
  const workflowQuote = evidenceQuoteFromMeta(workflowMeta) ?? scanLine(workflow, 220);
  return withEvidenceSource(
    {
      id: "evidence-workflow-provider-field",
      icon: "clinical_signal",
      title: "Workflow Pain Point",
      dateLabel: "—",
      excerpt: workflowQuote,
      whyItMatters: "Highlights the OR friction to validate during observation and product-fit follow-up.",
      intelligenceImpacts: dedupeEvidenceImpacts([cardImpact(workflow, false)]),
      href: null,
    },
    {
      meta: workflowMeta,
      engagements: input.engagements,
      providerId: input.providerId,
      mappedFieldDbKey: "provider_workflow_pain_points",
      sourceQuote: workflowQuote,
    },
  );
}

function buildOieProductEvidenceCard(input: {
  contact: Record<string, unknown>;
  providerId: string;
  observationRollup?: ProviderObservationIntelligenceRollup | null;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): FieldBriefingEvidenceCard | null {
  const { contact, observationRollup } = input;
  const productInterest = String(contact.provider_product_interests ?? "").trim();
  const productInterestMeta = input.fieldMeta.provider_product_interests;
  const productInterestQuote = fieldHasIntelligenceSignal("provider_product_interests", productInterest)
    ? evidenceQuoteFromMeta(productInterestMeta) ?? scanLine(productInterest, 220)
    : null;
  const productInterestImpact = productInterestQuote
    ? cardImpact(`Product interest: ${productInterest}`, false)
    : null;

  const observationProduct = observationRollup?.productEvidence;
  if (observationProduct && observationProduct.maturity !== "intro_only") {
    const excerpt = (() => {
      const raw =
        observationProduct.evidenceExcerpt ??
        observationProduct.gapDescription ??
        observationProduct.whatWeKnowText ??
        observationProduct.productName;
      const trimmed = String(raw).trim();
      return trimmed.length <= 220 ? trimmed : `${trimmed.slice(0, 219).trim()}…`;
    })();
    const productMeta = input.fieldMeta.provider_competitive_products;
    return withEvidenceSource(
      {
        id: `evidence-obs-product-${observationProduct.productName.toLowerCase().replace(/\s+/g, "-")}`,
        icon: "observation",
        title: "Product Intelligence",
        dateLabel: "—",
        excerpt,
        whyItMatters: "Observation evidence informs whether current product use is consistent across cases.",
        intelligenceImpacts: dedupeEvidenceImpacts([
          cardImpact(observationProduct.emergingSignalLabel ?? observationProduct.productName, false),
          productInterestImpact,
        ]),
        href: observationRollup?.detailsHref ?? null,
      },
      {
        meta: productMeta,
        engagements: input.engagements,
        providerId: input.providerId,
        mappedFieldDbKey: "provider_competitive_products",
        sourceQuote: excerpt,
        cases: input.cases,
        caseId: observationRollup?.primaryCaseId ?? null,
      },
    );
  }

  const product = productNeedsConfirmation(contact, {
    providerRuns: input.universalFactsReadModel?.providerRuns,
  });
  if (!product) {
    if (!productInterestQuote) return null;
    return withEvidenceSource(
      {
        id: "evidence-product-interest",
        icon: "clinical_signal",
        title: "Product Intelligence",
        dateLabel: "—",
        excerpt: productInterestQuote,
        whyItMatters: "Shows what the provider wants to understand before an evaluation or observation.",
        intelligenceImpacts: dedupeEvidenceImpacts([productInterestImpact]),
        href: null,
      },
      {
        meta: productInterestMeta,
        engagements: input.engagements,
        providerId: input.providerId,
        mappedFieldDbKey: "provider_product_interests",
        sourceQuote: productInterestQuote,
      },
    );
  }

  const productMeta = input.fieldMeta.provider_competitive_products;
  const productQuote =
    evidenceQuoteFromMeta(productMeta) ??
    scanLine(
      `${product.productName} was mentioned, but product usage should be confirmed during the first observation.`,
      220,
    );

  return withEvidenceSource(
    {
      id: `evidence-product-${product.productName.toLowerCase().replace(/\s+/g, "-")}`,
      icon: "clinical_signal",
      title: "Product Intelligence",
      dateLabel: "—",
      excerpt: productQuote,
      whyItMatters: "Early product context informs observation focus and evaluation planning.",
      intelligenceImpacts: dedupeEvidenceImpacts([
        cardImpact(`Current product identified: ${product.productName}`, false),
        cardImpact("Needs confirmation during observation", false),
        productInterestImpact,
      ]),
      href: null,
    },
    {
      meta: productMeta,
      engagements: input.engagements,
      providerId: input.providerId,
      mappedFieldDbKey: "provider_competitive_products",
      sourceQuote: productQuote,
    },
  );
}

function buildProductEvidenceCard(input: {
  contact: Record<string, unknown>;
  providerId: string;
  observationRollup?: ProviderObservationIntelligenceRollup | null;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  providerRuns?: UniversalFactExtractionRun[];
}): FieldBriefingEvidenceCard | null {
  const obsCases = (input.cases ?? []).filter(
    (row) => String(row.case_type ?? "").trim().toLowerCase() === "observation",
  );
  const completedCaseIds = obsCases
    .filter((row) => isObservationCaseComplete(row))
    .map((row) => String(row.id ?? "").trim())
    .filter(Boolean);
  const programCompletedCount = completedCaseIds.length;

  const ufCard =
    input.providerRuns?.length
      ? adaptUniversalFactsToProductInterestEvidenceCard({
          providerRuns: input.providerRuns,
          detailsHref: input.observationRollup?.detailsHref ?? null,
          primaryCaseId: input.observationRollup?.primaryCaseId ?? null,
          programCompletedCount,
          completedCaseIds,
        })
      : null;

  const resolved = resolveReadModelSection(ufCard ? [ufCard] : [], () => {
    const oieCard = buildOieProductEvidenceCard(input);
    return oieCard ? [oieCard] : [];
  });

  const card = resolved[0] ?? null;
  if (!card) return null;

  if (ufCard && card === ufCard) {
    const oieCard = buildOieProductEvidenceCard(input);
    return withEvidenceSource({
      ...card,
      title: "Product Intelligence",
      intelligenceImpacts: dedupeEvidenceImpacts([
        ...card.intelligenceImpacts,
        ...(oieCard?.intelligenceImpacts ?? []),
      ]),
    }, {
      meta: input.fieldMeta.provider_competitive_products,
      engagements: input.engagements,
      providerId: input.providerId,
      mappedFieldDbKey: "provider_competitive_products",
      sourceQuote: card.sourceQuote ?? card.excerpt,
      cases: input.cases,
      caseId: input.observationRollup?.primaryCaseId ?? null,
    });
  }

  return card;
}

function buildOieObservationRollupEvidenceCards(input: {
  observationRollup: ProviderObservationIntelligenceRollup;
  providerId: string;
  cases?: Array<Record<string, unknown>>;
}): FieldBriefingEvidenceCard[] {
  const observationRollup = input.observationRollup;
  const cards: FieldBriefingEvidenceCard[] = [];
  const caseHref = observationRollup.detailsHref;

  const noteExcerpt = scanLine(
    observationRollup.observationCaseNoteExcerpt ??
      `${observationRollup.capturedNoteCount} case note${observationRollup.capturedNoteCount === 1 ? "" : "s"} captured`,
    220,
  );
  cards.push(
    withEvidenceSource(
      {
        id: `evidence-observation-note-${observationRollup.primaryCaseId ?? "rollup"}`,
        icon: "observation",
        title: "Observation",
        dateLabel: "—",
        excerpt: noteExcerpt,
        whyItMatters: "Observation notes feed provider-level evidence maturity and next best actions.",
        intelligenceImpacts: dedupeEvidenceImpacts([
          cardImpact(observationRollup.programStatusLabel, false),
        ]),
        href: caseHref,
      },
      {
        providerId: input.providerId,
        sourceQuote: noteExcerpt,
        cases: input.cases,
        caseId: observationRollup.primaryCaseId ?? null,
        meta: {
          source_type: "observation",
          source_label: "Observation case note",
          source_case_id: observationRollup.primaryCaseId ?? undefined,
          updated_at: new Date().toISOString(),
        },
      },
    ),
  );

  const workflowSignal = observationRollup.earlySignals.find((signal) =>
    /visualization|fixation|workflow/i.test(signal),
  );
  if (workflowSignal) {
    const workflowExcerpt = scanLine(workflowSignal, 220);
    cards.push(
      withEvidenceSource(
        {
          id: `evidence-workflow-signal-${observationRollup.primaryCaseId ?? "rollup"}`,
          icon: "clinical_signal",
          title: "Workflow Pain Point",
          dateLabel: "—",
          excerpt: workflowExcerpt,
          whyItMatters: "Workflow friction or opportunity signals guide evaluation focus.",
          intelligenceImpacts: dedupeEvidenceImpacts([cardImpact(workflowSignal, false)]),
          href: caseHref,
        },
        {
          providerId: input.providerId,
          sourceQuote: workflowExcerpt,
          cases: input.cases,
          caseId: observationRollup.primaryCaseId ?? null,
          mappedFieldDbKey: "provider_workflow_pain_points",
          meta: {
            source_type: "observation",
            source_label: "Observation case note",
            source_case_id: observationRollup.primaryCaseId ?? undefined,
            updated_at: new Date().toISOString(),
          },
        },
      ),
    );
  }

  return cards;
}

function wrapUfObservationEvidenceCards(input: {
  cards: FieldBriefingEvidenceCard[];
  observationRollup: ProviderObservationIntelligenceRollup;
  providerId: string;
  cases?: Array<Record<string, unknown>>;
}): FieldBriefingEvidenceCard[] {
  return input.cards.map((card) =>
    withEvidenceSource(card, {
      providerId: input.providerId,
      sourceQuote: card.sourceQuote ?? card.excerpt,
      cases: input.cases,
      caseId: input.observationRollup.primaryCaseId ?? null,
      mappedFieldDbKey:
        card.title === "Workflow Pain Point" ? "provider_workflow_pain_points" : undefined,
      meta: {
        source_type: "observation",
        source_label: "Observation case note",
        source_case_id: input.observationRollup.primaryCaseId ?? undefined,
        updated_at: new Date().toISOString(),
      },
    }),
  );
}

function buildObservationRollupEvidenceCards(input: {
  observationRollup: ProviderObservationIntelligenceRollup | null | undefined;
  providerId: string;
  cases?: Array<Record<string, unknown>>;
  providerRuns?: UniversalFactExtractionRun[];
}): FieldBriefingEvidenceCard[] {
  const observationRollup = input.observationRollup;
  if (!observationRollup?.visible || observationRollup.capturedNoteCount === 0) return [];

  const ufCards =
    input.providerRuns?.length
      ? wrapUfObservationEvidenceCards({
          cards: adaptUniversalFactsToObservationFieldEvidenceCards({
            providerRuns: input.providerRuns,
            primaryCaseId: observationRollup.primaryCaseId,
            detailsHref: observationRollup.detailsHref,
            programStatusLabel: observationRollup.programStatusLabel,
          }),
          observationRollup,
          providerId: input.providerId,
          cases: input.cases,
        })
      : [];

  return resolveReadModelSection(ufCards, () =>
    buildOieObservationRollupEvidenceCards({
      observationRollup,
      providerId: input.providerId,
      cases: input.cases,
    }),
  );
}

function isStaleOrLowQualityTimelineExcerpt(
  excerpt: string | null,
  permission: NormalizedObservationPermission,
): boolean {
  const text = String(excerpt ?? "").trim();
  if (!text) return true;
  if (isInvalidSchedulingContactArtifact(text)) return true;
  if (GENERIC_ENGAGEMENT_EXCERPT_RE.test(text)) return true;
  if (isLowQualityIntelligenceText(text)) return true;
  if (observationApproved(permission) && STALE_OBSERVATION_APPROVAL_DENIED_RE.test(text)) return true;
  if (/And Follow appears involved/i.test(text)) return true;
  if (/appears involved in scheduler/i.test(text)) return true;

  const invalidProduct = text.match(/^current product identified:\s*(.+)$/i)?.[1]?.trim();
  if (invalidProduct && !isValidProductName(invalidProduct)) return true;

  return false;
}

function timelineCardFromEvent(
  event: ProviderIntelligenceTimelineEvent,
  permission: NormalizedObservationPermission,
): FieldBriefingEvidenceCard | null {
  if (isStaleOrLowQualityTimelineExcerpt(event.detail, permission)) return null;

  if (/scheduler/i.test(event.title) && event.detail) {
    const candidates = event.detail.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
    if (!candidates.some((c) => isPlausiblePersonName(c))) return null;
  }

  const icon: FieldBriefingEvidenceIcon =
    event.kind === "intro_call_completed"
      ? "intro_call"
      : event.kind === "debrief_completed"
        ? "debrief"
        : event.kind === "scheduler_referenced"
          ? "field_note"
          : /clinical|procedure|pain|competitor|interest/i.test(event.title)
            ? "clinical_signal"
            : /observation/i.test(event.title)
              ? "observation"
              : "field_note";

  const sourceTypeLabel =
    event.sourceKind === "debrief"
      ? "Debrief"
      : event.sourceKind === "engagement" && event.kind === "intro_call_completed"
        ? "Intro Call"
        : event.sourceKind === "case"
          ? "Observation"
          : "Field Note";

  return {
    id: event.id,
    icon,
    title: event.title,
    dateLabel: event.whenLabel,
    excerpt: event.detail,
    whyItMatters: "Supports what we know about this provider.",
    intelligenceImpacts: [{ label: scanLine(event.title, 80), impact: "created" }],
    href: event.href || null,
    sourceTypeLabel,
    sourceDateLabel: event.whenLabel,
    sourceQuote: event.detail,
    mappedFieldLabel: event.dbKey ? fieldLabelForRepPreview(event.dbKey) : null,
  };
}

function rawAccessNoteEvidenceCard(contact: Record<string, unknown>): FieldBriefingEvidenceCard | null {
  const raw = String(contact.access_notes ?? "").trim();
  if (!raw) return null;
  const sentences = raw
    .replace(/\[[^\]]+\]/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const excerpt =
    sentences.find(
      (sentence) =>
        /\b(discussed|asked whether|asked if|interested in|curious about|challenge|struggle|tight|pooled|suction|instrument|reach)\b/i.test(
          sentence,
        ) && /\b([A-Z][A-Z0-9-]{2,}|product|device|workflow|suction|case|procedure)\b/i.test(sentence),
    ) ?? null;
  if (!excerpt) return null;
  const scanned = scanLine(excerpt, 220);
  return {
    id: "evidence-raw-field-note",
    icon: "field_note",
    title: "Field Note",
    dateLabel: "Recent note",
    excerpt: scanned,
    whyItMatters: "Raw capture contains product or workflow intelligence that should be reviewed and structured.",
    intelligenceImpacts: [{ label: "Captured field intelligence", impact: "created" }],
    href: null,
    sourceTypeLabel: "Field Note",
    sourceDateLabel: "Recent note",
    sourceQuote: scanned,
    mappedFieldLabel: null,
  };
}

export function buildProviderIntelligenceFieldEvidenceCards(input: {
  contact: Record<string, unknown>;
  providerId: string;
  model: ProviderFieldIntelligenceModel;
  permission: NormalizedObservationPermission;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  timelineEvents: ProviderIntelligenceTimelineEvent[];
  observationRollup?: ProviderObservationIntelligenceRollup | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): FieldBriefingEvidenceCard[] {
  const cards: FieldBriefingEvidenceCard[] = [];
  const seenTitles = new Set<string>();
  const fieldMeta = parseProviderIntelligenceFieldMetadata(input.contact.provider_intelligence_field_metadata);

  const push = (card: FieldBriefingEvidenceCard | null) => {
    if (!card) return;
    const key = card.title.toLowerCase();
    if (seenTitles.has(key)) return;
    seenTitles.add(key);
    cards.push(card);
  };

  push(
    buildObservationAccessCard({
      contact: input.contact,
      providerId: input.providerId,
      model: input.model,
      permission: input.permission,
      engagements: input.engagements,
      fieldMeta,
    }),
  );
  push(
    buildSchedulingContactCard({
      contact: input.contact,
      providerId: input.providerId,
      model: input.model,
      engagements: input.engagements,
      fieldMeta,
    }),
  );
  push(
    buildIntroCallSummaryCard({
      contact: input.contact,
      providerId: input.providerId,
      model: input.model,
      permission: input.permission,
      engagements: input.engagements,
      fieldMeta,
    }),
  );

  const hasObservationNotes = (input.observationRollup?.capturedNoteCount ?? 0) > 0;
  if (hasObservationNotes) {
    for (const observationCard of buildObservationRollupEvidenceCards({
      observationRollup: input.observationRollup,
      providerId: input.providerId,
      cases: input.cases,
      providerRuns: input.universalFactsReadModel?.providerRuns,
    })) {
      push(observationCard);
    }
    push(
      buildProductEvidenceCard({
        contact: input.contact,
        providerId: input.providerId,
        observationRollup: input.observationRollup,
        fieldMeta,
        engagements: input.engagements,
        cases: input.cases,
        providerRuns: input.universalFactsReadModel?.providerRuns,
      }),
    );
  } else {
    for (const clinical of buildClinicalTrendCards({
      model: input.model,
      fieldMeta,
      engagements: input.engagements,
      providerId: input.providerId,
      providerRuns: input.universalFactsReadModel?.providerRuns,
    })) {
      push(clinical);
    }
    for (const workflow of adaptUniversalFactsToWorkflowEvidenceCards({
      providerRuns: input.universalFactsReadModel?.providerRuns ?? [],
    })) {
      push(workflow);
    }
    push(
      buildOieWorkflowEvidenceCard({
        contact: input.contact,
        model: input.model,
        fieldMeta,
        engagements: input.engagements,
        providerId: input.providerId,
      }),
    );
    push(
      buildProductEvidenceCard({
        contact: input.contact,
        providerId: input.providerId,
        observationRollup: input.observationRollup,
        fieldMeta,
        engagements: input.engagements,
        cases: input.cases,
        providerRuns: input.universalFactsReadModel?.providerRuns,
      }),
    );
  }

  if (cards.length < PREVIEW_LIMIT) {
    for (const event of input.timelineEvents) {
      if (cards.length >= PREVIEW_LIMIT) break;
      if (event.kind === "intro_call_completed" || event.kind === "debrief_completed") continue;
      if (event.dbKey && SCHEDULING_OWNER_FIELD_DB_KEYS.includes(event.dbKey)) continue;
      if (
        event.dbKey === "provider_observation_feasibility" ||
        event.dbKey === "provider_observation_access_path"
      ) {
        continue;
      }
      push(timelineCardFromEvent(event, input.permission));
    }
  }

  if (cards.length === 0) {
    push(rawAccessNoteEvidenceCard(input.contact));
  }

  const previewLimit =
    (input.observationRollup?.capturedNoteCount ?? 0) > 0 ? PREVIEW_LIMIT + 1 : PREVIEW_LIMIT;
  return cards.slice(0, previewLimit);
}

export {
  resolveSchedulerName,
  workflowOpportunityNeedsValidation,
  hasProviderPainPoints,
  hasStaffWorkflowPainPoints,
  hasScheduledObservation,
  observationApproved,
};
