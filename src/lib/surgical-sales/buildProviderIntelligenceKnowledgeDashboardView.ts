/**
 * Provider Intelligence tab — field briefing read model.
 */

import {
  buildProviderIntelligenceReferenceView,
  type ProviderIntelligenceReferenceView,
} from "@/lib/surgical-sales/buildProviderIntelligenceReferenceView";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderFieldIntelligenceModel,
  type ProviderFieldIntelligenceModel,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import { buildProviderOpenQuestions } from "@/lib/surgical-sales/buildProviderOpenQuestions";
import { buildProviderIntelligenceFieldBriefingStory } from "@/lib/surgical-sales/buildProviderIntelligenceFieldBriefingStory";
import {
  buildProviderIntelligenceFieldEvidenceCards,
} from "@/lib/surgical-sales/buildProviderIntelligenceFieldEvidenceCards";
import {
  buildProviderIntelligenceTimeline,
  timelineEventIsVerifiedFinding,
  type ProviderIntelligenceTimelineEvent,
} from "@/lib/surgical-sales/buildProviderIntelligenceTimeline";
import { buildProviderActivityTimeline } from "@/lib/surgical-sales/buildProviderActivityTimeline";
import type { ProviderActivityTimelineItem } from "@/lib/surgical-sales/buildProviderActivityTimeline";
import { buildProviderIntelligenceConfidence } from "@/lib/surgical-sales/buildProviderIntelligenceConfidence";
import {
  contactDisplayName,
  formatSurgicalContactRole,
} from "@/lib/surgical-sales/labels";
import { buildProviderDiscoveryState } from "@/lib/surgical-sales/buildProviderDiscoveryState";
import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import type { NormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";
import { isCredentialingWorkflowComplete } from "@/lib/surgical-sales/observationAccessWorkflowState";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderPathwayExecutionAction } from "@/lib/surgical-sales/providerPathwayExecutionRouting";
import {
  enrichOpenQuestionWithPathwayAction,
} from "@/lib/surgical-sales/providerPathwayExecutionRouting";
import { resolveSuggestedSchedulerCandidate } from "@/lib/surgical-sales/candidateContactIntelligence";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  buildProviderCaseIntelligenceRollup,
  type ProviderCaseIntelligenceRollup,
} from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import {
  buildOrganizationSuggestedContextForProvider,
  type OrganizationSuggestedContextView,
} from "@/lib/surgical-sales/buildOrganizationSuggestedContextForProvider";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import {
  resolveReadModelSection,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import {
  filterProviderScopedFactRuns,
} from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProviderIntelligenceClinicalReads";
import {
  adaptUniversalFactsToCategoryEmergingChips,
  adaptUniversalFactsToProcedureVolumeEmergingChips,
  adaptUniversalFactsToProductEmergingChips,
  type UniversalEmergingChip,
} from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProviderClinicalSignals";
import { isObservationCaseComplete } from "@/lib/surgical-sales/observationProgramGate";

export type FieldBriefingChipTone = "known" | "gap" | "opportunity";

export type FieldBriefingChip = {
  id: string;
  text: string;
  tone: FieldBriefingChipTone;
  highlight?: boolean;
  description?: string | null;
  actionLabel?: string | null;
  action?: ProviderPathwayExecutionAction | null;
  evidenceQuote?: string | null;
  evidenceSource?: string | null;
  evidenceCapturedAt?: string | null;
};

export type FieldBriefingPulseTone = "success" | "warning" | "progress" | "neutral";

export type FieldBriefingPulse = {
  biggestUnknown: string | null;
  biggestUnknownSource?: string | null;
  mostImportantRelationship: { name: string; role: string } | null;
  mostImportantRelationshipSource?: string | null;
  strongestCommercialSignal: string | null;
  strongestCommercialSignalSource?: string | null;
  accessPathwayStatus: string;
  accessPathwayTone: FieldBriefingPulseTone;
  accessPathwaySource?: string | null;
};

export type FieldBriefingAccessStepState = "known" | "partial" | "missing";

export type FieldBriefingAccessStep = {
  id: string;
  label: string;
  state: FieldBriefingAccessStepState;
  /** e.g. "Suggested — Karen Smith from Test Hospital" */
  detailLine?: string | null;
  actionable?: boolean;
  action?: ProviderPathwayExecutionAction | null;
  actionLabel?: string | null;
};

export type FieldBriefingProgress = {
  completionPercent: number;
  completionLabel: string;
  confidenceLabel: string;
  accessSteps: FieldBriefingAccessStep[];
  knownCount: number;
  missingCount: number;
};

export type FieldBriefingPersonImportance = "critical" | "high" | "medium";
export type FieldBriefingPersonStatus = "confirmed" | "partial" | "referenced";

export type FieldBriefingPerson = {
  id: string;
  name: string;
  role: string;
  importance: FieldBriefingPersonImportance;
  importanceLabel: string;
  status: FieldBriefingPersonStatus;
  statusLabel: string;
  missingInfo: string | null;
  whyTheyMatter: string;
  phone: string | null;
  email: string | null;
  href: string | null;
};

export type FieldBriefingEvidenceIcon =
  | "intro_call"
  | "debrief"
  | "observation"
  | "clinical_signal"
  | "field_note";

export type FieldBriefingEvidenceImpact = {
  label: string;
  impact: "created" | "validated";
};

export type FieldBriefingEvidenceCard = {
  id: string;
  icon: FieldBriefingEvidenceIcon;
  title: string;
  dateLabel: string;
  excerpt: string | null;
  whyItMatters: string;
  intelligenceImpacts: FieldBriefingEvidenceImpact[];
  href: string | null;
  /** Display-only intelligence evidence fields */
  sourceTypeLabel?: string;
  sourceDateLabel?: string;
  sourceQuote?: string | null;
  mappedFieldLabel?: string | null;
};

type RawDictationRollup = {
  productInterest: string | null;
  workflowPain: string | null;
  procedureFocus: string | null;
  hasSignal: boolean;
};

export type ProviderIntelligenceFieldBriefingView = {
  providerName: string;
  hasFieldEvidence: boolean;
  showIntelChipGrid: boolean;
  pulse: FieldBriefingPulse;
  progress: FieldBriefingProgress;
  caseIntelligence: ProviderCaseIntelligenceRollup | null;
  fieldBrief: string[];
  emergingSignals: FieldBriefingChip[];
  needsMoreEvidence: FieldBriefingChip[];
  commercialMeaning: FieldBriefingChip[];
  /** @deprecated use caseIntelligence */
  observationIntelligence: ProviderCaseIntelligenceRollup | null;
  /** @deprecated use emergingSignals */
  whatWeKnow: FieldBriefingChip[];
  /** @deprecated use needsMoreEvidence */
  whatWeStillNeed: FieldBriefingChip[];
  /** @deprecated use commercialMeaning */
  whyThisMatters: FieldBriefingChip[];
  keyPeople: FieldBriefingPerson[];
  fieldEvidence: FieldBriefingEvidenceCard[];
  providerTimeline: ProviderActivityTimelineItem[];
  emptyStateMessage: string | null;
  organizationSuggestedContext: OrganizationSuggestedContextView | null;
};

/** @deprecated use ProviderIntelligenceFieldBriefingView */
export type ProviderIntelligenceKnowledgeDashboardView = ProviderIntelligenceFieldBriefingView;

/** @deprecated use FieldBriefingChip */
export type FieldBriefingFact = FieldBriefingChip;

const PREVIEW_LIMIT = 5;
const WHAT_WE_KNOW_LIMIT = 12;
const WHAT_WE_STILL_NEED_LIMIT = 5;

function parsePersonName(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const head = trimmed.split(/\s*(?:[—–-]|·|\|)\s*/)[0]?.trim() ?? "";
  if (!head || /referenced|unknown|missing|not yet|contact info/i.test(head)) return null;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(head)) return head;
  if (/^[A-Z][a-z]+$/.test(head)) return head;
  return null;
}

function isRealPersonName(name: string | null | undefined): boolean {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return false;
  if (/missing|not captured|referenced|unknown|role identified|not yet/i.test(trimmed)) return false;
  return trimmed.length >= 2;
}

function personDedupeKeys(person: FieldBriefingPerson): string[] {
  const normalized = person.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];

  const keys = [`name:${normalized}`];
  if (person.href) keys.push(`href:${person.href}`);
  if (/^(?:provider|surgeon)$/i.test(person.role.trim())) return keys;
  const tokens = normalized.split(" ").filter((token) => token.length >= 2);
  if (tokens.length === 1) {
    keys.push(`first:${tokens[0]}`);
  } else if (tokens.length > 1) {
    keys.push(`first:${tokens[0]}`);
    keys.push(`first-last:${tokens[0]}:${tokens[tokens.length - 1]}`);
  }
  return keys;
}

function pushUniqueChip(
  rows: FieldBriefingChip[],
  seen: Set<string>,
  id: string,
  text: string,
  tone: FieldBriefingChipTone,
  extras?: {
    highlight?: boolean;
    description?: string | null;
    evidenceQuote?: string | null;
    evidenceSource?: string | null;
    evidenceCapturedAt?: string | null;
  },
) {
  const line = scanLine(text, 120).trim();
  if (!line) return;
  const key = line.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({
    id,
    text: line,
    tone,
    highlight: extras?.highlight ?? false,
    description: extras?.description ?? null,
    evidenceQuote: extras?.evidenceQuote ?? null,
    evidenceSource: extras?.evidenceSource ?? null,
    evidenceCapturedAt: extras?.evidenceCapturedAt ?? null,
  });
}

function sentenceChunks(text: string): string[] {
  return text
    .replace(/\[[^\]]+\]/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function rawTextFromProviderActivity(
  contact: Record<string, unknown>,
  activityTimeline?: Array<Record<string, unknown>>,
): string {
  const chunks = [String(contact.access_notes ?? "").trim()];
  for (const row of activityTimeline ?? []) {
    const kind = String(row.kind ?? row.activity_type ?? row.type ?? "").toLowerCase();
    if (!/note|field|activity|provider_activity/.test(kind)) continue;
    const body = String(row.body ?? row.summary ?? row.detail ?? row.title ?? "").trim();
    if (body) chunks.push(body);
  }
  return chunks.filter(Boolean).join("\n");
}

function summarizeProductInterestSentence(sentence: string): string | null {
  const trimmed = sentence.trim();
  if (!trimmed) return null;
  const acronym = trimmed.match(/\b[A-Z][A-Z0-9-]{2,}\b/)?.[0] ?? null;
  if (acronym) {
    const details: string[] = [];
    if (/\bcurved\s+design\b/i.test(trimmed)) details.push("curved design");
    if (/\b(existing\s+)?suction\s+setup\b/i.test(trimmed)) details.push("suction setup compatibility");
    if (/\blearning\s+curve\b/i.test(trimmed)) details.push("learning curve");
    return details.length > 0 ? `${acronym} — ${details.join(", ")}` : acronym;
  }
  return scanLine(trimmed, 110);
}

function buildRawDictationRollup(input: {
  contact: Record<string, unknown>;
  activityTimeline?: Array<Record<string, unknown>>;
}): RawDictationRollup {
  const text = rawTextFromProviderActivity(input.contact, input.activityTimeline);
  const sentences = sentenceChunks(text);
  const productSentence =
    sentences.find(
      (sentence) =>
        /\b(discussed|asked whether|asked if|interested in|curious about|wanted to understand|question(?:s)? about)\b/i.test(
          sentence,
        ) &&
        /\b([A-Z][A-Z0-9-]{2,}|product|device|design|setup|learning curve)\b/i.test(sentence),
    ) ?? null;
  const workflowSentence =
    sentences.find((sentence) =>
      /\b(challenge|struggle|tight|pooled|fluid|suction|setup|instrument|reach|friction|pain)\b/i.test(
        sentence,
      ),
    ) ?? null;
  const procedureSentence =
    sentences.find((sentence) => /\b(robotic|hernia|colorectal|procedure|case)\b/i.test(sentence)) ?? null;

  const productInterest = productSentence ? summarizeProductInterestSentence(productSentence) : null;
  const workflowPain = workflowSentence ? scanLine(workflowSentence, 120) : null;
  const procedureFocus = procedureSentence ? scanLine(procedureSentence, 120) : null;

  return {
    productInterest,
    workflowPain,
    procedureFocus,
    hasSignal: Boolean(productInterest || workflowPain || procedureFocus),
  };
}

function isObservationExecutionStage(input: {
  permission: NormalizedObservationPermission;
  cases?: Array<Record<string, unknown>>;
  caseRollup?: ProviderCaseIntelligenceRollup | null;
}): boolean {
  if (input.caseRollup?.visible) return true;
  if (
    input.permission.stageId === "permission_confirmed" ||
    input.permission.stageId === "observation_scheduled" ||
    input.permission.stageId === "observation_completed"
  ) {
    return true;
  }
  return (input.cases ?? []).some(
    (row) => String(row.case_type ?? "").trim().toLowerCase() === "observation",
  );
}

function isAccessPathwayGapText(text: string): boolean {
  return /schedul(?:er|ing)?|credentialing|first observation not scheduled|contact information unknown|contact needs confirmation|observation allowance/i.test(
    text,
  );
}

function pushUniversalEmergingChips(
  rows: FieldBriefingChip[],
  seen: Set<string>,
  chips: UniversalEmergingChip[],
  idPrefix: string,
) {
  for (const chip of chips) {
    pushUniqueChip(rows, seen, chip.id || `${idPrefix}-${chip.text}`, chip.text, "known", {
      evidenceQuote: chip.evidenceQuote,
      evidenceSource: chip.evidenceSource,
      evidenceCapturedAt: chip.evidenceCapturedAt,
    });
  }
}

function providerEmergingSignalPriority(row: FieldBriefingChip): number {
  const text = row.text.toLowerCase();
  if (/current product|was used during the case|competitor product/.test(text)) return 0;
  if (/sarah|evaluation contact|coordinat|scheduling coordinator|access/.test(text)) return 1;
  if (/contour|conform|take(?:s)? longer|annoyance|slows?|awkward|positioning/.test(text)) {
    return 1;
  }
  if (/inventory|availability|unavailable|not stocked|delayed|correct implant/.test(text)) return 2;
  if (/clinical information|comparison|comparing products|product interest|alternatives?/.test(text)) return 4;
  if (/staff reported workflow delays|instrumentation availability concern/.test(text)) return 6;
  return 5;
}

function limitProviderEmergingSignals(rows: FieldBriefingChip[]): FieldBriefingChip[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const priorityDelta = providerEmergingSignalPriority(left.row) - providerEmergingSignalPriority(right.row);
      if (priorityDelta !== 0) return priorityDelta;
      return left.index - right.index;
    })
    .slice(0, WHAT_WE_KNOW_LIMIT)
    .map(({ row }) => row);
}

function oieProcedureVolumeEmergingChips(reference: ProviderIntelligenceReferenceView): UniversalEmergingChip[] {
  return buildOieProcedureVolumeEmergingChipTexts({ reference }).map((text, index) => ({
    id: `oie-proc-${index}`,
    text,
    evidenceQuote: null,
    evidenceSource: null,
    evidenceCapturedAt: null,
  }));
}

function buildOieProcedureVolumeEmergingChipTexts(input: {
  reference: ProviderIntelligenceReferenceView;
}): string[] {
  const procedureLabels: string[] = [];
  for (const group of input.reference.clinicalSignals) {
    if (group.id !== "procedure-focus") continue;
    for (const item of group.items) {
      const title = item.includes("·") ? item.split("·")[0]?.trim() || item : item;
      if (
        title &&
        !isGenericClinicalFactText(title) &&
        !/\bgeneral\s+volume\b/i.test(title) &&
        !procedureLabels.includes(title)
      ) {
        procedureLabels.push(title);
      }
    }
  }

  const hasIncreasingVolume = input.reference.clinicalSignals.some(
    (group) =>
      group.id === "volume-trends" &&
      group.items.some((item) => /increas|growing|uptick/i.test(item)),
  );

  const lines: string[] = [];
  if (procedureLabels.length >= 2 && hasIncreasingVolume) {
    lines.push(`${procedureLabels[0]} / ${procedureLabels[1]} volume increasing`);
  } else {
    for (const proc of procedureLabels) {
      lines.push(proc);
    }
    if (hasIncreasingVolume && procedureLabels.length === 1) {
      lines.push("Increasing procedure volume");
    }
  }
  return lines;
}

function oieProductEmergingChips(input: {
  contact: Record<string, unknown>;
  caseRollup?: ProviderCaseIntelligenceRollup | null;
  executionStage: boolean;
}): UniversalEmergingChip[] {
  return buildOieProductEmergingChipTexts(input).map((text, index) => ({
    id: `oie-product-${index}`,
    text,
    evidenceQuote: null,
    evidenceSource: null,
    evidenceCapturedAt: null,
  }));
}

function buildOieProductEmergingChipTexts(input: {
  contact: Record<string, unknown>;
  caseRollup?: ProviderCaseIntelligenceRollup | null;
  executionStage: boolean;
}): string[] {
  const competitiveProducts = String(input.contact.provider_competitive_products ?? "").trim();
  if (
    (!input.caseRollup?.productEvidence ||
      input.caseRollup.productEvidence.maturity === "intro_only") &&
    fieldHasIntelligenceSignal("provider_competitive_products", competitiveProducts) &&
    /bard mesh|mesh/i.test(competitiveProducts)
  ) {
    return [
      input.executionStage
        ? "Bard Mesh mentioned in intro call"
        : "Current product identified: Bard Mesh",
    ];
  }
  return [];
}

function buildEmergingSignals(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  reference: ProviderIntelligenceReferenceView;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  caseRollup?: ProviderCaseIntelligenceRollup | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  rawRollup?: RawDictationRollup;
}): FieldBriefingChip[] {
  const { contact, model, reference, engagements } = input;
  const rows: FieldBriefingChip[] = [];
  const seen = new Set<string>();
  const commercial = readProviderCommercialIntelligence(contact);
  const permission = buildProviderDiscoveryState({
    contact,
    engagements,
    cases: input.cases,
  }).permissionStage;
  const executionStage = isObservationExecutionStage({
    permission,
    cases: input.cases,
    caseRollup: input.caseRollup,
  });

  if (!executionStage) {
    if (
      permission.stageId === "interested" ||
      permission.stageId === "permission_not_yet_confirmed" ||
      permission.stageId === "permission_confirmed" ||
      permission.stageId === "observation_scheduled"
    ) {
      if (
        permission.stageId === "permission_confirmed" ||
        permission.stageId === "observation_scheduled"
      ) {
        pushUniqueChip(rows, seen, "observation-approved", "Observation approval confirmed", "known");
      } else {
        pushUniqueChip(rows, seen, "observation-interest", "Interested in observation", "known");
      }
    }

    if (
      !isCredentialingWorkflowComplete(contact) &&
      (model.credentialing.captureState !== "empty" ||
        commercial?.credentialing.credentialing_required === "yes")
    ) {
      pushUniqueChip(rows, seen, "credentialing", "Credentialing required", "known");
    }

    if (model.scheduler.captureState === "verified") {
      pushUniqueChip(rows, seen, "scheduler-confirmed", "Scheduler contact captured", "known");
    } else if (model.scheduler.captureState === "referenced") {
      const suggested = resolveSuggestedSchedulerCandidate(contact);
      pushUniqueChip(rows, seen, "scheduler", "Scheduler referenced", "known", {
        description: suggested
          ? `${suggested.contact_name}${suggested.contact_role ? ` · ${suggested.contact_role}` : ""}`
          : null,
        evidenceQuote: suggested?.source_quote ?? null,
        evidenceSource: suggested?.source_reference ?? null,
        evidenceCapturedAt: suggested?.captured_at ?? null,
      });
    }
  }

  if (input.caseRollup?.emergingCaseSignals.length) {
    for (const signal of input.caseRollup.emergingCaseSignals) {
      pushUniqueChip(rows, seen, `case-signal-${signal.toLowerCase().replace(/\s+/g, "-")}`, signal, "known");
    }
  }

  const procedureChips = resolveReadModelSection(
    input.universalFactsReadModel?.providerRuns?.length
      ? adaptUniversalFactsToProcedureVolumeEmergingChips({
          providerRuns: input.universalFactsReadModel.providerRuns,
          completedCaseIds: (input.cases ?? [])
            .filter((row) => String(row.case_type ?? "").trim().toLowerCase() === "observation")
            .filter((row) => isObservationCaseComplete(row))
            .map((row) => String(row.id ?? "").trim())
            .filter(Boolean),
          programCompletedCount: input.caseRollup?.completedCount ?? 0,
        })
      : [],
    () => oieProcedureVolumeEmergingChips(reference),
  );

  pushUniversalEmergingChips(rows, seen, procedureChips, "proc");

  if (commercial?.clinical.entries.length) {
    for (const entry of commercial.clinical.entries) {
      if (entry.category === "product_opportunity") {
        if (input.caseRollup?.productEvidence && input.caseRollup.productEvidence.maturity !== "intro_only") {
          continue;
        }
        const label = entry.display_label.startsWith("Current product") ||
          entry.display_label.startsWith("Product interest")
          ? entry.display_label
          : `Product interest: ${entry.display_label}`;
        pushUniqueChip(rows, seen, `commercial-product-${entry.display_label}`, label, "known");
      }
    }
  }

  const rawProductInterests = String(contact.provider_product_interests ?? "").trim();
  if (fieldHasIntelligenceSignal("provider_product_interests", rawProductInterests)) {
    pushUniqueChip(rows, seen, "field-product-interest", `Product interest: ${rawProductInterests}`, "known");
  } else if (input.rawRollup?.productInterest) {
    pushUniqueChip(
      rows,
      seen,
      "raw-product-interest",
      `Product interest: ${input.rawRollup.productInterest}`,
      "known",
    );
  }

  for (const productInterest of model.clinical.productInterests) {
    pushUniqueChip(rows, seen, `clinical-product-interest-${productInterest}`, `Product interest: ${productInterest}`, "known");
  }

  for (const workflow of model.clinical.workflowObservations) {
    if (!/\b(challenge|struggle|tight|pooled|fluid|suction|setup|instrument|reach|friction|pain)\b/i.test(workflow)) {
      continue;
    }
    pushUniqueChip(rows, seen, `workflow-${workflow}`, workflow, "known");
  }
  if (input.rawRollup?.workflowPain) {
    pushUniqueChip(rows, seen, "raw-workflow-pain", input.rawRollup.workflowPain, "known");
  }

  const productChips = resolveReadModelSection(
    input.universalFactsReadModel?.providerRuns?.length
      ? adaptUniversalFactsToProductEmergingChips({
          providerRuns: input.universalFactsReadModel.providerRuns,
          executionStage,
        })
      : [],
    () =>
      oieProductEmergingChips({
        contact,
        caseRollup: input.caseRollup,
        executionStage,
      }),
  );

  for (const chip of productChips) {
    if (rows.some((row) => /bard mesh|current product/i.test(row.text))) continue;
    pushUniqueChip(rows, seen, chip.id || `product-${chip.text}`, chip.text, "known", {
      evidenceQuote: chip.evidenceQuote,
      evidenceSource: chip.evidenceSource,
      evidenceCapturedAt: chip.evidenceCapturedAt,
    });
  }

  const categoryChips = resolveReadModelSection(
    input.universalFactsReadModel?.providerRuns?.length
      ? adaptUniversalFactsToCategoryEmergingChips({
          providerRuns: input.universalFactsReadModel.providerRuns,
        })
      : [],
    () => [],
  );

  pushUniversalEmergingChips(rows, seen, categoryChips, "category");

  return limitProviderEmergingSignals(rows);
}

/** @deprecated use buildEmergingSignals */
const buildWhatWeKnow = buildEmergingSignals;

function buildNeedsMoreEvidence(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  providerId: string;
  accountId?: string | null;
  intelligenceHref?: string;
  caseRollup?: ProviderCaseIntelligenceRollup | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): FieldBriefingChip[] {
  const rows: FieldBriefingChip[] = [];
  const seen = new Set<string>();

  const pushGap = (id: string, text: string, description?: string | null, highlight = false) => {
    const line = scanLine(text, 120).trim();
    if (!line || seen.has(line.toLowerCase())) return;
    seen.add(line.toLowerCase());
    rows.push({
      id,
      text: line,
      tone: "gap",
      highlight,
      description: description ?? null,
      actionLabel: null,
      action: null,
    });
  };

  const productEvidence = input.caseRollup?.productEvidence;
  for (const gap of input.caseRollup?.needsMoreEvidence ?? []) {
    if (/^current products used$/i.test(gap.trim())) continue;
    if (input.model.scheduler.captureState === "verified" && /schedul(?:er|ing)?|contact needs confirmation/i.test(gap)) {
      continue;
    }
    if (
      productEvidence?.gapText &&
      (/confirm whether .* consistent/i.test(gap) ||
        productEvidence.gapText.toLowerCase() === gap.toLowerCase())
    ) {
      pushGap(
        "gap-product-consistency",
        productEvidence.gapText,
        productEvidence.gapDescription,
        rows.length === 0,
      );
      continue;
    }
    pushGap(`case-gap-${gap.toLowerCase().replace(/\s+/g, "-")}`, gap, null, rows.length === 0);
  }

  const pathwayGaps = buildProviderOpenQuestions({
    contact: input.contact,
    planning: input.planning,
    model: input.model,
    maxItems: WHAT_WE_STILL_NEED_LIMIT + 3,
    engagements: input.engagements,
    cases: input.cases,
    observationRollup: input.caseRollup,
    universalFactsReadModel: input.universalFactsReadModel,
  })
    .filter((question) => !isAccessPathwayGapText(question.text))
    .map((q, index) => {
      const enriched = enrichOpenQuestionWithPathwayAction(q, {
        providerId: input.providerId,
        accountId: input.accountId,
        intelligenceHref: input.intelligenceHref,
      });
      return {
        id: enriched.id,
        text: scanLine(enriched.text, 120).trim(),
        tone: "gap" as const,
        highlight: rows.length === 0 && index === 0,
        description: enriched.description,
        actionLabel: enriched.actionLabel,
        action: enriched.action,
      };
    })
    .filter((chip) => !rows.some((row) => row.text.toLowerCase() === chip.text.toLowerCase()))
    .filter((chip) => {
      if (/^current products used$/i.test(chip.text.trim())) return false;
      if (
        productEvidence &&
        productEvidence.maturity !== "intro_only" &&
        /confirm current product use/i.test(chip.text)
      ) {
        return false;
      }
      return true;
    });

  for (const chip of pathwayGaps) {
    if (rows.length >= WHAT_WE_STILL_NEED_LIMIT) break;
    if (seen.has(chip.text.toLowerCase())) continue;
    seen.add(chip.text.toLowerCase());
    rows.push(chip);
  }

  if (rows.length > 0 && !rows.some((row) => row.highlight)) {
    rows[0] = { ...rows[0], highlight: true };
  }

  return rows.slice(0, WHAT_WE_STILL_NEED_LIMIT);
}

/** @deprecated use buildNeedsMoreEvidence */
const buildWhatWeStillNeed = buildNeedsMoreEvidence;

function buildCommercialMeaning(input: {
  reference: ProviderIntelligenceReferenceView;
  model: ProviderFieldIntelligenceModel;
  contact: Record<string, unknown>;
  caseRollup?: ProviderCaseIntelligenceRollup | null;
  rawRollup?: RawDictationRollup;
}): FieldBriefingChip[] {
  const { reference, model, contact, caseRollup } = input;
  const rows: FieldBriefingChip[] = [];
  const seen = new Set<string>();
  const commercial = readProviderCommercialIntelligence(contact);

  const pushOpportunity = (id: string, text: string, highlight = false) => {
    const normalized = text.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      id,
      text: normalized,
      tone: "opportunity",
      highlight: highlight && rows.length === 0,
    });
  };

  if (commercial?.clinical.entries.length) {
    for (const entry of commercial.clinical.entries) {
      if (entry.category === "product_opportunity") {
        pushOpportunity(`opp-${entry.display_label}`, entry.display_label, true);
      }
      if (entry.category === "clinical_trend") {
        if (/robotic|program/i.test(entry.display_label)) {
          pushOpportunity(`trend-${entry.display_label}`, "Growing robotic program");
        } else if (/increas|volume|growing/i.test(entry.display_label)) {
          pushOpportunity(`volume-${entry.display_label}`, "Procedure volume increasing");
        } else {
          pushOpportunity(`clinical-${entry.display_label}`, entry.display_label);
        }
      }
    }
  }

  const productInterest = String(contact.provider_product_interests ?? "").trim();
  if (fieldHasIntelligenceSignal("provider_product_interests", productInterest)) {
    pushOpportunity("product-interest", `Product interest: ${productInterest}`, true);
  } else if (input.rawRollup?.productInterest) {
    pushOpportunity("raw-product-interest", `Product interest: ${input.rawRollup.productInterest}`, true);
  }

  for (const interest of model.clinical.productInterests) {
    pushOpportunity(`product-interest-${interest}`, `Product interest: ${interest}`, true);
  }

  if (
    model.clinical.workflowObservations.some((signal) =>
      /challenge|struggle|tight|pooled|fluid|suction|setup|instrument|reach/i.test(signal),
    )
  ) {
    pushOpportunity("workflow-fit", "ACSIS fit may relate to suction access in tight anatomy");
  } else if (input.rawRollup?.workflowPain) {
    pushOpportunity("raw-workflow-fit", `Workflow fit signal: ${input.rawRollup.workflowPain}`);
  }

  for (const group of reference.clinicalSignals) {
    if (group.id === "volume-trends") {
      for (const item of group.items) {
        if (/increas|growing|uptick/i.test(item)) {
          pushOpportunity(`signal-volume-${item}`, "Procedure volume increasing");
        }
      }
    }
    if (group.id === "procedure-focus") {
      for (const item of group.items) {
        const focus = item.includes("·") ? item.split("·")[0]?.trim() || item : item;
        if (/robotic/i.test(focus)) {
          pushOpportunity(`signal-robotic-${focus}`, "Growing robotic program");
        }
      }
    }
  }

  if (model.procedureInterests.isConfirmed && model.procedureInterests.primaryLine.trim()) {
    pushOpportunity("eval-pathway", "Potential evaluation pathway");
  }

  if (caseRollup?.emergingCaseSignals.some((signal) => /visualization|fixation|workflow/i.test(signal))) {
    pushOpportunity("workflow-fit", "Product fit may relate to visualization/fixation workflow");
  }

  if (caseRollup?.learningView && !caseRollup.learningView.debriefUnlocked) {
    pushOpportunity("debrief-not-ready", "Debrief not ready yet");
  }

  if (
    reference.clinicalSignals.some(
      (group) =>
        group.id === "volume-trends" &&
        group.items.some((item) => /increas|growing|uptick/i.test(item)),
    )
  ) {
    pushOpportunity("volume-priority", "Procedure volume supports prioritization");
  }

  if (rows.length > 0 && !rows.some((r) => r.highlight)) {
    rows[0] = { ...rows[0], highlight: true };
  }

  return rows.slice(0, PREVIEW_LIMIT);
}

/** @deprecated use buildCommercialMeaning */
function buildWhyThisMatters(
  reference: ProviderIntelligenceReferenceView,
  model: ProviderFieldIntelligenceModel,
  contact: Record<string, unknown>,
): FieldBriefingChip[] {
  return buildCommercialMeaning({ reference, model, contact });
}

function personImportance(role: string): FieldBriefingPersonImportance {
  const haystack = role.toLowerCase();
  if (haystack.includes("provider") || haystack.includes("surgeon")) return "critical";
  if (haystack.includes("scheduler") || haystack.includes("coordinator")) return "critical";
  if (haystack.includes("champion") || haystack.includes("office")) return "high";
  return "medium";
}

function importanceLabel(level: FieldBriefingPersonImportance): string {
  if (level === "critical") return "Critical";
  if (level === "high") return "High";
  return "Medium";
}

function whyPersonMatters(role: string): string {
  const haystack = role.toLowerCase();
  if (haystack.includes("provider") || haystack.includes("surgeon")) {
    return "Primary clinical relationship and observation target.";
  }
  if (haystack.includes("scheduler") || haystack.includes("coordinator")) {
    return "Controls observation scheduling and OR access.";
  }
  if (haystack.includes("champion")) {
    return "Potential internal advocate for adoption.";
  }
  if (haystack.includes("office")) {
    return "Influences practice workflow and coordination.";
  }
  return "Supports access and coordination for this account.";
}

function personStatus(
  phone: string | null,
  email: string | null,
  fromReferenceOnly: boolean,
): { status: FieldBriefingPersonStatus; statusLabel: string; missingInfo: string | null } {
  if (phone && email) {
    return { status: "confirmed", statusLabel: "Contact captured", missingInfo: null };
  }
  if (phone || email) {
    return { status: "confirmed", statusLabel: "Contact captured", missingInfo: null };
  }
  if (fromReferenceOnly) {
    return {
      status: "referenced",
      statusLabel: "Referenced — not captured",
      missingInfo: null,
    };
  }
  return { status: "confirmed", statusLabel: "Contact captured", missingInfo: null };
}

function resolveRelatedContactStakeholderRole(record: Record<string, unknown>): string {
  const roleRaw = String(record.role ?? record.title ?? record.relationship_type ?? record.role_type ?? "")
    .trim()
    .toLowerCase();
  const formatted = formatSurgicalContactRole(String(record.role ?? record.title ?? record.role_type ?? ""));

  if (
    roleRaw.includes("office") ||
    roleRaw.includes("practice manager") ||
    roleRaw.includes("office_manager")
  ) {
    return "Office manager";
  }
  if (roleRaw.includes("coordinator") && !roleRaw.includes("schedul")) {
    return "OR coordinator";
  }
  if (roleRaw.includes("credential")) {
    return "Credentialing contact";
  }
  if (roleRaw.includes("schedul")) {
    return "Scheduler";
  }
  if (/champion|influencer|advocate/i.test(roleRaw)) {
    return "Clinical champion";
  }
  if (formatted) return formatted;
  return "Key contact";
}

function personFromRecord(
  record: Record<string, unknown>,
  role: string,
  providerId: string,
  fromReferenceOnly = false,
): FieldBriefingPerson | null {
  const name = contactDisplayName(record);
  if (!isRealPersonName(name)) return null;

  const id = String(record.id ?? name);
  const phone = String(record.phone ?? record.mobile_phone ?? "").trim() || null;
  const email = String(record.email ?? "").trim() || null;
  const resolvedRole =
    role === "Support contact"
      ? resolveRelatedContactStakeholderRole(record)
      : formatSurgicalContactRole(String(record.role_type ?? "")) ||
        String(record.title ?? "").trim() ||
        role;
  const importance = personImportance(resolvedRole);
  const verificationStatus = String(record.verification_status ?? "verified").toLowerCase();
  const contactState =
    verificationStatus === "suggested"
      ? {
          status: "partial" as const,
          statusLabel: "Needs Verification",
          missingInfo: "Suggested contact",
        }
      : personStatus(phone, email, fromReferenceOnly);

  return {
    id,
    name,
    role: resolvedRole,
    importance,
    importanceLabel: importanceLabel(importance),
    status: contactState.status,
    statusLabel: contactState.statusLabel,
    missingInfo: contactState.missingInfo,
    whyTheyMatter: whyPersonMatters(resolvedRole),
    phone,
    email,
    href: record.id ? `/portal/sales/contacts/${String(record.id)}` : null,
  };
}

function buildKeyPeople(input: {
  contact: Record<string, unknown>;
  providerId: string;
  model: ProviderFieldIntelligenceModel;
  relatedContacts?: Array<Record<string, unknown>>;
}): FieldBriefingPerson[] {
  const { contact, providerId, model, relatedContacts } = input;
  const people: FieldBriefingPerson[] = [];
  const seen = new Set<string>();

  const push = (person: FieldBriefingPerson | null) => {
    if (!person) return;
    const keys = personDedupeKeys(person);
    if (keys.some((key) => seen.has(key))) return;
    for (const key of keys) seen.add(key);
    people.push(person);
  };

  const providerName = contactDisplayName(contact);
  if (isRealPersonName(providerName)) {
    const phone = String(contact.phone ?? contact.mobile_phone ?? "").trim() || null;
    const email = String(contact.email ?? "").trim() || null;
    const contactState = personStatus(phone, email, false);
    push({
      id: providerId,
      name: providerName,
      role: "Provider",
      importance: "critical",
      importanceLabel: "Critical",
      status: contactState.status,
      statusLabel: contactState.statusLabel,
      missingInfo: contactState.missingInfo,
      whyTheyMatter: whyPersonMatters("Provider"),
      phone,
      email,
      href: `/portal/sales/providers/${providerId}`,
    });
  }

  for (const related of relatedContacts ?? []) {
    push(personFromRecord(related, "Support contact", providerId));
  }

  const coordinatorRaw = String(contact.provider_observation_coordinator_contact ?? "").trim();
  if (fieldHasIntelligenceSignal("provider_observation_coordinator_contact", coordinatorRaw)) {
    const coordinatorName =
      parsePersonName(coordinatorRaw) ?? coordinatorRaw.split(/[—–-]/)[0]?.trim() ?? null;
    if (coordinatorName && isRealPersonName(coordinatorName) && !seen.has(coordinatorName.toLowerCase())) {
      const contactState = personStatus(null, null, true);
      push({
        id: `coordinator-${coordinatorName}`,
        name: coordinatorName,
        role: "OR coordinator",
        importance: "critical",
        importanceLabel: "Critical",
        status: contactState.status,
        statusLabel: contactState.statusLabel,
        missingInfo: contactState.missingInfo,
        whyTheyMatter: whyPersonMatters("OR coordinator"),
        phone: null,
        email: null,
        href: null,
      });
    }
  }

  const schedulerName = parsePersonName(model.scheduler.primaryLine);
  if (
    schedulerName &&
    !seen.has(schedulerName.toLowerCase()) &&
    model.scheduler.captureState !== "verified"
  ) {
    const contactState = personStatus(null, null, true);
    push({
      id: `scheduler-${schedulerName}`,
      name: schedulerName,
      role: "Scheduler",
      importance: "critical",
      importanceLabel: "Critical",
      status: contactState.status,
      statusLabel: contactState.statusLabel,
      missingInfo: contactState.missingInfo,
      whyTheyMatter: whyPersonMatters("Scheduler"),
      phone: null,
      email: null,
      href: null,
    });
  }

  const championName = parsePersonName(model.champion.primaryLine);
  if (championName && !seen.has(championName.toLowerCase())) {
    const contactState = personStatus(null, null, true);
    push({
      id: `champion-${championName}`,
      name: championName,
      role: "Champion",
      importance: "high",
      importanceLabel: "High",
      status: contactState.status,
      statusLabel: contactState.statusLabel,
      missingInfo: contactState.missingInfo,
      whyTheyMatter: whyPersonMatters("Champion"),
      phone: null,
      email: null,
      href: null,
    });
  }

  return people.sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 };
    return rank[a.importance] - rank[b.importance];
  });
}

function resolveEvidenceIcon(event: ProviderIntelligenceTimelineEvent): FieldBriefingEvidenceIcon {
  const haystack = `${event.title} ${event.sourceLabel} ${event.kind}`.toLowerCase();
  if (/intro_call|intro call/.test(haystack)) return "intro_call";
  if (/debrief/.test(haystack)) return "debrief";
  if (/observation/.test(haystack)) return "observation";
  if (/clinical|procedure|pain|competitor|interest|signal/.test(haystack)) return "clinical_signal";
  return "field_note";
}

function evidenceTitle(event: ProviderIntelligenceTimelineEvent): string {
  const title = event.title.trim();
  if (/intro call/i.test(title)) return "Intro Call";
  if (/debrief/i.test(title)) return "Debrief";
  if (/observation/i.test(title)) return "Observation";
  if (/clinical|procedure|pain|competitor|interest/i.test(title)) return "Clinical finding";
  if (/scheduler/i.test(title)) return "Scheduling Contact";
  if (/field note|discovery note/i.test(title)) return "Field Note";
  return title;
}

function intelligenceLabelsForEvent(event: ProviderIntelligenceTimelineEvent): string[] {
  switch (event.kind) {
    case "intro_call_completed":
      return ["Initial relationship"];
    case "observation_interest_captured":
      return ["Observation interest"];
    case "observation_requested":
      return ["Observation request"];
    case "observation_completed":
      return ["Observation access", "Clinical workflow"];
    case "scheduler_referenced":
      return ["Scheduling contact"];
    case "debrief_completed":
      return ["Field debrief context"];
    case "clinical_interest_identified":
      return ["Clinical focus"];
    case "pain_point_captured":
      return ["Workflow understanding"];
    case "competitor_identified":
      return ["Competitive landscape"];
    case "champion_identified":
      return ["Key champion"];
    case "discovery_note":
      return ["Field note"];
    default:
      return [scanLine(event.title, 80)];
  }
}

function whyEvidenceMatters(event: ProviderIntelligenceTimelineEvent): string {
  const haystack = `${event.title} ${event.sourceLabel}`.toLowerCase();
  if (/intro call/i.test(haystack)) return "Establishes initial relationship and access posture.";
  if (/debrief/i.test(haystack)) return "Captures field learnings that shape this briefing.";
  if (/observation/i.test(haystack)) return "Direct evidence of clinical workflow and access.";
  if (/scheduler|scheduling/i.test(haystack)) return "Identifies who controls scheduling access.";
  if (/clinical|procedure|pain|competitor|interest|signal/i.test(haystack)) {
    return "Shows commercial opportunity and clinical fit.";
  }
  return "Supports what we know about this provider.";
}

function buildFieldEvidenceCards(events: ProviderIntelligenceTimelineEvent[]): FieldBriefingEvidenceCard[] {
  return events.slice(0, PREVIEW_LIMIT).map((event) => {
    const verified = timelineEventIsVerifiedFinding(event);
    const impactKind: FieldBriefingEvidenceImpact["impact"] = verified ? "validated" : "created";

    return {
      id: event.id,
      icon: resolveEvidenceIcon(event),
      title: evidenceTitle(event),
      dateLabel: event.whenLabel,
      excerpt: event.detail?.trim() || null,
      whyItMatters: whyEvidenceMatters(event),
      intelligenceImpacts: intelligenceLabelsForEvent(event).map((label) => ({
        label,
        impact: impactKind,
      })),
      href: event.href || null,
    };
  });
}

function buildProgress(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  permission: NormalizedObservationPermission;
  planning?: ProviderPlanningCompletion | null;
  providerId: string;
  accountId?: string | null;
  organizationName?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  cases?: Array<Record<string, unknown>>;
}): FieldBriefingProgress {
  const discoveryState = buildProviderDiscoveryState({
    contact: input.contact,
    providerId: input.providerId,
    accountId: input.accountId,
    organizationBaseline: input.organizationBaseline,
    cases: input.cases,
  });
  const confidence = buildProviderIntelligenceConfidence({
    contact: input.contact,
    planning: input.planning,
  });

  return {
    completionPercent: discoveryState.accessProgressPercent,
    completionLabel: discoveryState.accessPathway.completionLabel,
    confidenceLabel: confidence.label,
    accessSteps: discoveryState.accessPathway.steps,
    knownCount: discoveryState.accessPathway.knownCount,
    missingCount: discoveryState.accessPathway.missingCount,
  };
}

function buildPulseEvidenceGaps(
  caseRollup: ProviderCaseIntelligenceRollup | null,
  fallback: FieldBriefingChip[],
): FieldBriefingChip[] {
  if (!caseRollup?.visible) return fallback;

  return caseRollup.needsMoreEvidence.map((gap, index) => {
    const isProductGap = /consistency/i.test(gap);
    return {
      id: `pulse-case-gap-${index}`,
      text: gap,
      tone: "gap" as const,
      highlight: /provider pain points/i.test(gap),
      description: isProductGap ? caseRollup.productEvidence?.gapDescription ?? null : null,
      actionLabel: null,
      action: null,
    };
  });
}

const GENERIC_PULSE_COMMERCIAL_SIGNALS =
  /^observation access opportunity$|^potential evaluation pathway$/i;

const SNAPSHOT_SIGNAL_STOP_WORDS = new Set([
  "access",
  "case",
  "cases",
  "confirmed",
  "current",
  "interest",
  "observation",
  "pathway",
  "potential",
  "procedure",
  "product",
  "provider",
  "signal",
  "using",
  "with",
]);

function snapshotMatchTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !SNAPSHOT_SIGNAL_STOP_WORDS.has(token));
}

function evidenceQuoteForCard(card: FieldBriefingEvidenceCard): string | null {
  return card.sourceQuote?.trim() || card.excerpt?.trim() || null;
}

function evidenceSourceLine(card: FieldBriefingEvidenceCard): string {
  return card.sourceTypeLabel?.trim() || card.title.trim() || "Saved field intelligence";
}

function findEvidenceCardForText(
  text: string,
  evidenceCards: FieldBriefingEvidenceCard[],
): FieldBriefingEvidenceCard | null {
  const tokens = snapshotMatchTokens(text);
  if (tokens.length === 0) return null;

  let best: { card: FieldBriefingEvidenceCard; score: number } | null = null;
  for (const card of evidenceCards) {
    if (!evidenceQuoteForCard(card)) continue;
    const haystack = [
      card.title,
      card.sourceTypeLabel,
      card.mappedFieldLabel,
      card.excerpt,
      card.sourceQuote,
      ...card.intelligenceImpacts.map((impact) => impact.label),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    if (score > (best?.score ?? 0)) best = { card, score };
  }

  return best && best.score > 0 ? best.card : null;
}

function sourceLineForChip(
  chip: FieldBriefingChip,
  evidenceCards: FieldBriefingEvidenceCard[],
): string | null {
  if (chip.evidenceSource?.trim()) return chip.evidenceSource.trim();
  if (chip.evidenceQuote?.trim() || chip.evidenceCapturedAt?.trim()) return "Saved field intelligence";
  const card = findEvidenceCardForText(`${chip.text} ${chip.description ?? ""}`, evidenceCards);
  return card ? evidenceSourceLine(card) : null;
}

export function isSecondaryStakeholderPerson(
  person: FieldBriefingPerson,
  providerId: string,
): boolean {
  if (String(person.id) === String(providerId)) return false;
  const role = person.role.trim().toLowerCase();
  if (role === "provider" || role === "surgeon") return false;
  return isRealPersonName(person.name);
}

export function resolveMostImportantRelationship(
  keyPeople: FieldBriefingPerson[],
  providerId: string,
): { name: string; role: string } | null {
  const candidate =
    keyPeople.find(
      (person) =>
        isSecondaryStakeholderPerson(person, providerId) &&
        person.status === "confirmed" &&
        person.importance === "critical",
    ) ??
    keyPeople.find(
      (person) =>
        isSecondaryStakeholderPerson(person, providerId) &&
        person.status === "confirmed",
    );

  return candidate ? { name: candidate.name, role: candidate.role } : null;
}

function resolvePulseBiggestUnknown(input: {
  whatWeStillNeed: FieldBriefingChip[];
  evidenceCards: FieldBriefingEvidenceCard[];
}): { value: string | null; source: string | null } {
  for (const gap of input.whatWeStillNeed) {
    const text = gap.text?.trim();
    if (!text) continue;
    const source = sourceLineForChip(gap, input.evidenceCards);
    if (source) return { value: text, source };
  }

  return { value: null, source: null };
}

function resolvePulseStrongestCommercialSignal(
  whyThisMatters: FieldBriefingChip[],
  emergingSignals: FieldBriefingChip[] = [],
  evidenceCards: FieldBriefingEvidenceCard[] = [],
): { value: string | null; source: string | null } {
  const prioritized = [
    ...whyThisMatters.filter((item) => item.highlight),
    ...whyThisMatters.filter((item) => !item.highlight),
    ...emergingSignals.filter((item) => /product interest|workflow|fit|pain|suction|setup/i.test(item.text)),
  ];

  for (const item of prioritized) {
    const text = item.text?.trim();
    if (!text) continue;
    if (GENERIC_PULSE_COMMERCIAL_SIGNALS.test(text)) continue;
    const source = sourceLineForChip(item, evidenceCards);
    if (!source) continue;
    return { value: text, source };
  }

  return { value: null, source: null };
}

function buildPulse(input: {
  whatWeStillNeed: FieldBriefingChip[];
  whyThisMatters: FieldBriefingChip[];
  emergingSignals?: FieldBriefingChip[];
  keyPeople: FieldBriefingPerson[];
  evidenceCards: FieldBriefingEvidenceCard[];
  providerId: string;
  discoveryState: ReturnType<typeof buildProviderDiscoveryState>;
}): FieldBriefingPulse {
  const biggestUnknown = resolvePulseBiggestUnknown({
    whatWeStillNeed: input.whatWeStillNeed,
    evidenceCards: input.evidenceCards,
  });
  const strongestCommercialSignal = resolvePulseStrongestCommercialSignal(
    input.whyThisMatters,
    input.emergingSignals,
    input.evidenceCards,
  );
  const mostImportantRelationship = resolveMostImportantRelationship(input.keyPeople, input.providerId);
  return {
    biggestUnknown: biggestUnknown.value,
    biggestUnknownSource: biggestUnknown.source,
    mostImportantRelationship,
    mostImportantRelationshipSource: mostImportantRelationship ? "Verified contact" : null,
    strongestCommercialSignal: strongestCommercialSignal.value,
    strongestCommercialSignalSource: strongestCommercialSignal.source,
    accessPathwayStatus: input.discoveryState.accessPathway.pulseStatusLabel,
    accessPathwayTone: input.discoveryState.accessPathway.pulseTone,
    accessPathwaySource: "Access pathway",
  };
}

export function buildProviderIntelligenceKnowledgeDashboardView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  accountId?: string | null;
  intelligenceHref?: string;
  planning?: ProviderPlanningCompletion | null;
  organizationName?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  relatedContacts?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): ProviderIntelligenceFieldBriefingView {
  const contact = input.contact ?? {};
  const universalFactsReadModel =
    input.universalFactsReadModel?.providerRuns?.length
      ? {
          ...input.universalFactsReadModel,
          providerRuns: filterProviderScopedFactRuns(
            input.universalFactsReadModel.providerRuns,
            contact,
          ),
        }
      : input.universalFactsReadModel;
  const viewInput = { ...input, universalFactsReadModel };
  const organizationSuggestedContext = buildOrganizationSuggestedContextForProvider({
    contact,
    providerId: input.providerId,
    organizationBaseline: input.organizationBaseline,
    relatedContacts: input.relatedContacts,
  });
  const reference = buildProviderIntelligenceReferenceView(viewInput);
  const model = buildProviderFieldIntelligenceModel({
    contact,
    relatedContacts: input.relatedContacts,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });
  const discoveryState = buildProviderDiscoveryState({
    contact,
    providerId: input.providerId,
    accountId: input.accountId,
    organizationBaseline: input.organizationBaseline,
    engagements: input.engagements,
    cases: input.cases,
    planning: input.planning,
  });
  const permission = discoveryState.permissionStage;

  const caseIntelligence = buildProviderCaseIntelligenceRollup({
    contact,
    providerId: input.providerId,
    cases: input.cases,
    universalFactsReadModel,
  });

  const fieldBrief = buildProviderIntelligenceFieldBriefingStory({
    contact,
    model,
    permission,
    reference,
    observationRollup: caseIntelligence,
    universalFactsReadModel,
  });

  const timelineEvents = buildProviderIntelligenceTimeline({
    providerId: input.providerId,
    contact,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  }).events;

  const providerTimeline = buildProviderActivityTimeline({
    providerId: input.providerId,
    activityTimeline: input.activityTimeline,
    engagements: input.engagements,
    cases: input.cases,
  });

  const rawRollup = buildRawDictationRollup({
    contact,
    activityTimeline: input.activityTimeline,
  });
  const hasDashboardSignal =
    reference.hasFieldEvidence ||
    rawRollup.hasSignal ||
    Boolean(universalFactsReadModel?.providerRuns?.length);

  const emergingSignals = hasDashboardSignal
    ? buildEmergingSignals({
        contact,
        model,
        reference,
        engagements: input.engagements,
        cases: input.cases,
        caseRollup: caseIntelligence,
        universalFactsReadModel,
        rawRollup,
      })
    : [];
  const needsMoreEvidence = hasDashboardSignal
    ? buildNeedsMoreEvidence({
        contact,
        model,
        planning: input.planning,
        engagements: input.engagements,
        cases: input.cases,
        providerId: input.providerId,
        accountId: input.accountId,
        intelligenceHref: input.intelligenceHref,
        caseRollup: caseIntelligence,
        universalFactsReadModel,
      })
    : [];
  const commercialMeaning = hasDashboardSignal
    ? buildCommercialMeaning({ reference, model, contact, caseRollup: caseIntelligence, rawRollup })
    : [];
  const keyPeople = hasDashboardSignal
    ? buildKeyPeople({
        contact,
        providerId: input.providerId,
        model,
        relatedContacts: input.relatedContacts,
      })
    : [];

  const progress = buildProgress({
    contact,
    model,
    permission,
    planning: input.planning,
    providerId: input.providerId,
    accountId: input.accountId,
    organizationName: input.organizationName ?? organizationSuggestedContext.organizationName,
    organizationBaseline: input.organizationBaseline,
    cases: input.cases,
  });
  const fieldEvidence = hasDashboardSignal
    ? buildProviderIntelligenceFieldEvidenceCards({
        contact,
        providerId: input.providerId,
        model,
        permission,
        engagements: input.engagements,
        cases: input.cases,
        timelineEvents,
        observationRollup: caseIntelligence,
        universalFactsReadModel,
      })
    : [];
  const pulseGaps = buildPulseEvidenceGaps(caseIntelligence, needsMoreEvidence);
  const pulse = buildPulse({
    whatWeStillNeed: pulseGaps,
    whyThisMatters: commercialMeaning,
    emergingSignals,
    keyPeople,
    evidenceCards: fieldEvidence,
    providerId: input.providerId,
    discoveryState,
  });

  return {
    providerName: reference.providerName,
    hasFieldEvidence: hasDashboardSignal,
    showIntelChipGrid: hasDashboardSignal && !caseIntelligence?.visible,
    pulse,
    progress,
    caseIntelligence,
    observationIntelligence: caseIntelligence,
    fieldBrief,
    emergingSignals,
    needsMoreEvidence,
    commercialMeaning,
    whatWeKnow: emergingSignals,
    whatWeStillNeed: needsMoreEvidence,
    whyThisMatters: commercialMeaning,
    keyPeople,
    fieldEvidence,
    providerTimeline,
    emptyStateMessage: hasDashboardSignal
      ? null
      : organizationSuggestedContext.hasSuggestions
        ? null
        : "No field intelligence captured yet. Log an intro call or debrief to start building this briefing.",
    organizationSuggestedContext,
  };
}

export const INTELLIGENCE_GRID_PREVIEW_LIMIT = PREVIEW_LIMIT;
export const INTELLIGENCE_FIELD_EVIDENCE_PREVIEW_LIMIT = PREVIEW_LIMIT;
