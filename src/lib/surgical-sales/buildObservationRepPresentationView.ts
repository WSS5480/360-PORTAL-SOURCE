/**
 * Rep-facing presentation view for Observation Intelligence.
 * Wraps calculation-layer builders; does not change scoring or extraction.
 */

import {
  buildObservationLearningTabView,
  type ObservationLearningTabView,
} from "@/lib/surgical-sales/buildObservationLearningTabView";
import {
  buildObservationCaseBriefingView,
  buildObservationCaseIntelligenceSections,
} from "@/lib/surgical-sales/buildObservationCaseBriefingView";
import { buildSharedUnresolvedEvidenceQuestions } from "@/lib/surgical-sales/buildSharedUnresolvedEvidenceQuestions";
import { OBSERVATION_INTELLIGENCE_STILL_NEED_MAX } from "@/lib/surgical-sales/observationLearningObjectiveLimits";
import {
  buildProviderIntelligenceContext,
  resolveProcedureContext,
} from "@/lib/surgical-sales/caseIntelligenceSignals";
import {
  buildProviderPriorEvidencePool,
  priorEvidencePoolToFindings,
} from "@/lib/surgical-sales/providerPriorEvidencePool";
import type { EvidenceAreaStatus } from "@/lib/surgical-sales/observationIntelligence/scoreObservationEvidence";
import {
  OBSERVATION_REP_PROGRAM_GOAL,
  OBSERVATION_REP_SECTIONS,
  buildDebriefReadinessNextStep,
  buildDebriefReadinessReasons,
  buildFocusObjectiveLines,
  buildProviderFieldBriefing,
  buildWhatWeKnowLines,
  repDebriefReadinessHeadline,
  repEvidenceAreaStatusLabel,
  repEvidencePillarLabel,
  repEvidenceProgressLead,
  repProgramMaturityNote,
} from "@/lib/surgical-sales/observationRepPresentationCopy";
import { repProgramCompletedCaseCountFromCases } from "@/lib/surgical-sales/observationRepFindingPresentation";
import {
  adaptUniversalFactsToFollowUpNextVisitItems,
  adaptUniversalFactsToThisObservationItems,
  adaptUniversalFactsToWhatWeKnowLines,
  priorCompletedObservationCaseIds,
  resolveActiveOperationalNoteIdsFromActivities,
  resolveReadModelSection,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { universalCaptureToExtractionRun } from "@/lib/surgical-sales/universalExtractor/universalCaptureToExtractionRun";
import type { UniversalCaptureEnvelope } from "@/lib/surgical-sales/universalExtractor/runUniversalExtractorShadow";
import {
  buildCaseIdentity,
  buildObservationCaseIdentity,
  formatCaseIntelligenceSectionTitle,
} from "@/lib/surgical-sales/buildCaseIdentity";
import {
  resolveCoachingIntelligenceSignals,
  resolveEvidenceGapsForCase,
  resolveEvidencePillarScores,
} from "@/lib/surgical-sales/universalExtractor/resolveCoachingIntelligenceSignals";

export type ObservationRepListItem = {
  id: string;
  text: string;
  /** §7.2: verbatim evidence quote shown under the finding (reported v2 facts only). */
  quote?: string;
  evidenceText?: string | null;
  sourceNoteText?: string | null;
  extractedFactId?: string | null;
  inferred?: boolean;
  supportingEvidence?: string[];
  concept?: string | null;
  sourceCategory?: string | null;
  sourceType?: string | null;
  productMentioned?: string | null;
  personMentioned?: string | null;
};

export type ObservationRepPresentationView = {
  learningView: ObservationLearningTabView;
  statusSummary: {
    programCasesLabel: string;
    programInProgressNote: string | null;
    maturityNote: string;
  };
  whatWeKnow: ObservationRepListItem[];
  whatWeKnowEmptyMessage: string;
  stillNeedToLearn: ObservationRepListItem[];
  stillNeedToLearnEmptyMessage: string;
  focusForNextObservation: ObservationRepListItem[];
  thisObservation: {
    title: string;
    items: ObservationRepListItem[];
    emptyMessage: string;
    showInProgressNote: boolean;
  };
  providerBriefing: {
    title: string;
    items: ObservationRepListItem[];
  };
  evidenceProgress: {
    title: string;
    lead: string;
    items: Array<{ id: string; label: string; status: EvidenceAreaStatus; statusLabel: string }>;
  };
  debriefReadiness: {
    title: string;
    headline: string;
    programUnlockLabel: string;
    evidenceCoverageLabel: string;
    reasons: string[];
    nextStep: string;
    programGoal: string;
    programCasesLabel: string;
    progressCompleted: number;
    progressTotal: number;
    debriefUnlocked: boolean;
    openDetailsByDefault: boolean;
  };
};

function toListItems(lines: string[], prefix: string): ObservationRepListItem[] {
  return lines.map((text, index) => ({
    id: `${prefix}-${index}`,
    text,
  }));
}

function looksLikeRepNextActionLine(text: string): boolean {
  return /\b(?:send|share|email|text|follow up|follow-up|call|schedule)\b/i.test(text);
}

const GENERIC_OBSERVATION_FOCUS_LINES = [
  /^observe workflow, product use, and any provider or staff friction\.?$/i,
  /^observe workflow patterns during the case\.?$/i,
  /^watch for provider or staff friction\.?$/i,
  /^listen for provider frustrations\.?$/i,
  /^listen for staff frustrations\.?$/i,
  /^watch for staff workflow friction\.?$/i,
  /^confirm which products are being used\.?$/i,
  /^identify products used during the case\.?$/i,
  /^watch for moments where a different product might help\.?$/i,
  /^watch for product-fit opportunities and related workflow friction\.?$/i,
];

function normalizeObservationItemKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+(?:\u2014|-)\s+(?:seen in|across|in \d+).+$/i, "")
    .replace(/\bcompetitor product\b/g, "")
    .replace(/\bwas used during the case\b/g, "")
    .replace(/\bused during the case\b/g, "")
    .replace(/\bobserved during (?:the )?case\b/g, "")
    .replace(/\bobservation(?:s)?\b/g, "")
    .replace(/\bcurrent product\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeProductKey(text: string | null | undefined): string | null {
  const key = normalizeObservationItemKey(String(text ?? ""));
  return key.length >= 3 ? key : null;
}

function observationItemDedupeKey(item: ObservationRepListItem): string {
  const productKey = normalizeProductKey(item.productMentioned);
  if (productKey && (item.concept === "current_product" || item.concept === "competitor_product")) {
    return `product:${productKey}`;
  }
  const personKey = normalizeProductKey(item.personMentioned);
  if (personKey && item.concept === "contact_role") return `person:${personKey}:${item.concept}`;
  return `text:${normalizeObservationItemKey(item.text)}`;
}

function dedupeObservationRepItems(items: ObservationRepListItem[]): ObservationRepListItem[] {
  const seen = new Set<string>();
  const deduped: ObservationRepListItem[] = [];

  for (const item of items) {
    const key = observationItemDedupeKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function lineOverlapsObservationSummary(line: string, summaryItems: ObservationRepListItem[]): boolean {
  const lineKey = normalizeObservationItemKey(line);
  if (lineKey.length < 4) return false;

  for (const item of summaryItems) {
    const itemKey = normalizeObservationItemKey(item.text);
    if (itemKey.length < 4) continue;
    if (lineKey === itemKey) return true;
    if (lineKey.length >= 8 && itemKey.includes(lineKey)) return true;
    if (itemKey.length >= 8 && lineKey.includes(itemKey)) return true;

    const productKey = normalizeProductKey(item.productMentioned);
    if (productKey && lineKey.includes(productKey)) return true;
  }

  return false;
}

function filterWhatWeKnowForNewValue(
  lines: string[],
  summaryItems: ObservationRepListItem[],
): string[] {
  return lines.filter((line) => !lineOverlapsObservationSummary(line, summaryItems));
}

function isGenericObservationFocusLine(text: string): boolean {
  return GENERIC_OBSERVATION_FOCUS_LINES.some((pattern) => pattern.test(text.trim()));
}

function filterProviderSpecificFocusLines(lines: string[]): string[] {
  return lines.filter((line) => !isGenericObservationFocusLine(line));
}

function currentCaseId(caseRow: Record<string, unknown>): string {
  return String(caseRow.id ?? "current").trim() || "current";
}

function readInlineUniversalCapture(metadata: Record<string, unknown> | null | undefined): UniversalCaptureEnvelope | null {
  const aiExtraction = metadata?.ai_extraction;
  if (!aiExtraction || typeof aiExtraction !== "object") return null;
  const capture = (aiExtraction as Record<string, unknown>).universal_capture;
  if (!capture || typeof capture !== "object") return null;
  const universal = (capture as { universal?: unknown }).universal;
  if (!universal || typeof universal !== "object") return null;
  if (!Array.isArray((universal as { facts?: unknown }).facts)) return null;
  return capture as UniversalCaptureEnvelope;
}

function buildInlineUniversalFactRuns(input: {
  activities?: Array<{ metadata_json?: Record<string, unknown> | null }>;
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
}): NonNullable<UniversalFactsReadModelPayload["caseRuns"]> {
  const caseId = currentCaseId(input.caseRow);
  const providerId = String(input.caseRow.surgeon_contact_id ?? input.providerContact?.id ?? "").trim() || undefined;
  const organizationId = String(input.caseRow.account_id ?? "").trim() || undefined;

  return (input.activities ?? [])
    .map((activity) => readInlineUniversalCapture(activity.metadata_json))
    .filter((capture): capture is UniversalCaptureEnvelope => Boolean(capture))
    .map((capture) =>
      universalCaptureToExtractionRun({
        capture,
        context: {
          case_id: caseId,
          ...(providerId ? { provider_id: providerId } : {}),
          ...(organizationId ? { organization_id: organizationId } : {}),
        },
      }),
    );
}

function buildLocalNoteUniversalFactRuns(input: {
  activities?: Array<{
    id?: string;
    body?: string;
    created_at?: string;
    metadata_json?: Record<string, unknown> | null;
  }>;
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
}): UniversalFactExtractionRun[] {
  const caseId = currentCaseId(input.caseRow);
  const providerId = String(input.caseRow.surgeon_contact_id ?? input.providerContact?.id ?? "").trim() || null;
  const organizationId = String(input.caseRow.account_id ?? "").trim() || null;

  const runs: Array<UniversalFactExtractionRun | null> = (input.activities ?? [])
    .map((activity, activityIndex) => {
      const noteBody = String(activity.body ?? "").trim();
      if (!noteBody) return null;
      const extracted = extractUniversalSurgicalFacts({
        raw_note: noteBody,
        declared_source_type: "observation_case",
        context: {
          provider_display_name: String(input.providerContact?.display_name ?? "").trim() || undefined,
        },
      });
      if (extracted.facts.length === 0) return null;
      const noteId = String(activity.metadata_json?.note_id ?? activity.id ?? `local-note-${activityIndex}`).trim();
      const captureId = `local-current-note-${noteId || activityIndex}`;
      const createdAt = String(activity.created_at ?? new Date().toISOString());
      return {
        capture_id: captureId,
        declared_source_type: "observation_case",
        extraction_model: "local-universal-rules",
        created_at: createdAt,
        operational_note_id: noteId || null,
        facts: extracted.facts.map((fact, factIndex) => ({
          ...fact,
          id: `${captureId}-${factIndex}`,
          capture_id: captureId,
          provider_id: providerId,
          organization_id: organizationId,
          case_id: caseId,
          encounter_id: null,
          suppressed: false,
          created_at: createdAt,
        })),
      } satisfies UniversalFactExtractionRun;
    });

  return runs.filter((run): run is UniversalFactExtractionRun => run !== null);
}

function mergeInlineUniversalFactsReadModel(input: {
  readModel?: UniversalFactsReadModelPayload | null;
  inlineCaseRuns: NonNullable<UniversalFactsReadModelPayload["caseRuns"]>;
}): UniversalFactsReadModelPayload | null {
  if (input.inlineCaseRuns.length === 0) return input.readModel ?? null;

  const seenCaptureIds = new Set(input.inlineCaseRuns.map((run) => run.capture_id));
  const persistedCaseRuns = (input.readModel?.caseRuns ?? []).filter((run) => !seenCaptureIds.has(run.capture_id));
  return {
    ...(input.readModel ?? {}),
    caseRuns: [...input.inlineCaseRuns, ...persistedCaseRuns],
  };
}

export function buildObservationRepPresentationView(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): ObservationRepPresentationView {
  const priorCases = input.priorCases ?? [];
  const inlineCaseRuns = buildInlineUniversalFactRuns({
    activities: input.activities,
    caseRow: input.caseRow,
    providerContact: input.providerContact,
  });
  const universalFactsReadModel = mergeInlineUniversalFactsReadModel({
    readModel: input.universalFactsReadModel,
    inlineCaseRuns,
  });
  const inputWithReadModel = { ...input, universalFactsReadModel };
  const learningView = buildObservationLearningTabView(inputWithReadModel);
  const intelligenceSections = buildObservationCaseIntelligenceSections(inputWithReadModel);
  const briefingView = buildObservationCaseBriefingView(input);
  const procedureContext = resolveProcedureContext(input.caseRow, priorCases);
  const activeOperationalNoteIds = resolveActiveOperationalNoteIdsFromActivities(input.activities);
  const caseIdentity = buildObservationCaseIdentity({
    caseRow: input.caseRow,
    providerContact: input.providerContact,
    priorCases,
    activities: input.activities,
  });
  const providerName =
    caseIdentity.providerName !== "Provider pending" ? caseIdentity.providerName : null;

  const priorEvidencePool = buildProviderPriorEvidencePool({
    currentCaseId: currentCaseId(input.caseRow),
    caseRow: input.caseRow,
    activities: input.activities,
    priorCases,
    providerContact: input.providerContact,
  });
  const priorFindings = priorEvidencePoolToFindings(priorEvidencePool);
  const mergedFindings = [...learningView.knownFindings, ...priorFindings].filter(
    (finding, index, all) =>
      all.findIndex(
        (candidate) =>
          (candidate.normalizedFindingId || candidate.matchKey) ===
          (finding.normalizedFindingId || finding.matchKey),
      ) === index,
  );
  const intelligenceSignals = resolveCoachingIntelligenceSignals({
    oieFindings: mergedFindings,
    evidenceProgress: learningView.evidenceProgress,
    procedureContext,
    priorCases,
    caseRow: input.caseRow,
    briefingKind: briefingView.kind,
    programCompletedCount: repProgramCompletedCaseCountFromCases({
      caseRow: input.caseRow,
      priorCases,
    }),
    universalFactsReadModel,
    signalScope: "merged",
  });

  const evidenceGaps = resolveEvidenceGapsForCase({
    oieGaps: learningView.evidenceGaps,
    universalFactsReadModel,
    caseRow: input.caseRow,
    priorCases,
    briefingKind: briefingView.kind,
    programCompletedCount: repProgramCompletedCaseCountFromCases({
      caseRow: input.caseRow,
      priorCases,
    }),
  });

  const providerContext = buildProviderIntelligenceContext({
    signals: intelligenceSignals,
    evidenceGaps,
    kind: briefingView.kind,
  });

  const programCompletedCount = repProgramCompletedCaseCountFromCases({
    caseRow: input.caseRow,
    priorCases,
  });
  const ufWhatWeKnowLines = universalFactsReadModel?.programRuns?.length
    ? adaptUniversalFactsToWhatWeKnowLines({
          programRuns: universalFactsReadModel.programRuns,
          completedCaseIds: priorCompletedObservationCaseIds({ caseRow: input.caseRow, priorCases }),
          programCompletedCount,
          countStyle: "program_fraction",
          providerName,
        })
    : [];
  const whatWeKnowLines = universalFactsReadModel?.programRuns?.length
    ? ufWhatWeKnowLines
    : resolveReadModelSection(
        [],
        () =>
      buildWhatWeKnowLines({
        findings: learningView.knownFindings,
        providerName,
        programCompletedCount,
        countStyle: "program_fraction",
      }),
    );

  const ufThisObservationItems = universalFactsReadModel?.caseRuns?.length
    ? adaptUniversalFactsToThisObservationItems({
          caseRuns: universalFactsReadModel.caseRuns,
          caseId: currentCaseId(input.caseRow),
          hasCurrentNotes: learningView.currentCaseHasCapturedNotes,
          activeOperationalNoteIds,
          providerName,
        })
    : [];
  const localNoteUniversalFactRuns = learningView.currentCaseHasCapturedNotes
    ? buildLocalNoteUniversalFactRuns({
        activities: input.activities,
        caseRow: input.caseRow,
        providerContact: input.providerContact,
      })
    : [];
  const localUfThisObservationItems =
    localNoteUniversalFactRuns.length > 0
      ? adaptUniversalFactsToThisObservationItems({
          caseRuns: localNoteUniversalFactRuns,
          caseId: currentCaseId(input.caseRow),
          hasCurrentNotes: learningView.currentCaseHasCapturedNotes,
          activeOperationalNoteIds,
          providerName,
        })
      : [];
  const fallbackThisObservationItems = () => {
    const sourceNoteText = (input.activities ?? [])
      .map((activity) => String(activity.body ?? "").trim())
      .filter(Boolean)
      .join(" ");
    return intelligenceSections.thisCaseItems
      .map((item) => ({
        id: item.id,
        text: item.text,
        evidenceText: item.quote ?? (sourceNoteText || item.text),
        sourceNoteText: sourceNoteText || item.quote || item.text,
        extractedFactId: item.id,
        ...(item.quote ? { quote: item.quote } : {}),
      }))
      .filter((item) => !looksLikeRepNextActionLine(item.text));
  };
  const thisObservationItems =
    ufThisObservationItems.length > 0
      ? [...ufThisObservationItems, ...localUfThisObservationItems]
      : localUfThisObservationItems.length > 0
        ? localUfThisObservationItems
      : resolveReadModelSection([], fallbackThisObservationItems);
  const displayedThisObservationItems = dedupeObservationRepItems(thisObservationItems);
  const displayedWhatWeKnowLines =
    whatWeKnowLines.length > 0 || !learningView.currentCaseHasCapturedNotes
      ? whatWeKnowLines
      : thisObservationItems.map((item) => item.text);
  const distinctWhatWeKnowLines = learningView.currentCaseHasCapturedNotes
    ? filterWhatWeKnowForNewValue(displayedWhatWeKnowLines, displayedThisObservationItems)
    : displayedWhatWeKnowLines;

  const nextActionItems = adaptUniversalFactsToFollowUpNextVisitItems({
    universalFactsReadModel,
    caseId: currentCaseId(input.caseRow),
    activeOperationalNoteIds,
    providerName,
    limit: OBSERVATION_INTELLIGENCE_STILL_NEED_MAX,
  });
  const nextActionLines = nextActionItems.map((item) => item.text);

  const stillNeedToLearnItems =
    learningView.currentCaseHasCapturedNotes && nextActionItems.length > 0
      ? nextActionItems
      : learningView.currentCaseHasCapturedNotes
        ? []
        : toListItems(
            buildSharedUnresolvedEvidenceQuestions({
              caseRow: input.caseRow,
              priorCases,
              providerContact: input.providerContact,
              activities: input.activities,
              learningView,
              universalFactsReadModel,
              maxItems: OBSERVATION_INTELLIGENCE_STILL_NEED_MAX,
            }),
            "learn",
          );
  const stillNeedToLearnLines = stillNeedToLearnItems.map((item) => item.text);

  const focusLines = buildFocusObjectiveLines(
    providerContext.focusCuesRaw,
    briefingView.caseFocus.focusToday,
  );
  const displayFocusLines = learningView.currentCaseHasCapturedNotes
    ? filterProviderSpecificFocusLines(focusLines)
    : focusLines;

  const providerBriefingLines = buildProviderFieldBriefing({
    findings: learningView.knownFindings,
    evidenceGaps: learningView.evidenceGaps,
    evidenceProgress: learningView.evidenceProgress,
    providerName,
    procedureContext,
  });

  const resolvedPillarScores = resolveEvidencePillarScores({
    oiePillars: learningView.evidenceProgress.map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      maturityStatus: item.validated ? "validated_pattern" : item.status === "missing" ? "missing" : "captured_signal",
      validated: item.validated,
      confirmed: item.confirmed,
      supportingFactCount: 0,
    })),
    universalFactsReadModel,
    caseRow: input.caseRow,
    priorCases,
  });

  const evidenceItems = resolvedPillarScores.map((item) => ({
    id: item.id,
    label: repEvidencePillarLabel(item.id, item.label),
    status: item.status,
    statusLabel: repEvidenceAreaStatusLabel(item.status),
  }));

  const knownCount = evidenceItems.filter((item) => item.statusLabel === "Known").length;
  const emergingCount = evidenceItems.filter((item) => item.statusLabel === "Early Observations").length;

  const readinessReasons = buildDebriefReadinessReasons({
    findings: learningView.knownFindings,
    evidenceGaps,
    evidenceProgress: resolvedPillarScores.map((pillar) => ({
      id: pillar.id,
      label: pillar.label,
      status: pillar.status,
      validated: pillar.validated,
      confirmed: pillar.confirmed,
    })),
    providerName,
  });

  const readinessNextStep = buildDebriefReadinessNextStep({
    phase: learningView.debriefReadinessPhase,
    observationsRemaining: learningView.observationsRemaining,
    stillNeedToLearn: stillNeedToLearnLines,
    focusObjectives: displayFocusLines,
    debriefUnlocked: learningView.debriefUnlocked,
    evidenceProgress: resolvedPillarScores.map((pillar) => ({
      id: pillar.id,
      label: pillar.label,
      status: pillar.status,
      validated: pillar.validated,
      confirmed: pillar.confirmed,
    })),
  });

  return {
    learningView,
    statusSummary: {
      programCasesLabel: learningView.programCasesLabel,
      programInProgressNote: learningView.programInProgressNote,
      maturityNote: repProgramMaturityNote({
        currentCaseComplete: learningView.currentCaseComplete,
        currentCaseHasCapturedNotes: learningView.currentCaseHasCapturedNotes,
      }),
    },
    whatWeKnow: toListItems(distinctWhatWeKnowLines, "known"),
    whatWeKnowEmptyMessage: "Complete more observations to establish what we know about this provider.",
    stillNeedToLearn: stillNeedToLearnItems,
    stillNeedToLearnEmptyMessage: "No major learning gaps flagged right now.",
    focusForNextObservation: toListItems(displayFocusLines, "focus"),
    thisObservation: {
      title: formatCaseIntelligenceSectionTitle(OBSERVATION_REP_SECTIONS.thisObservation, caseIdentity),
      items: displayedThisObservationItems,
      emptyMessage: intelligenceSections.thisCaseEmptyMessage,
      showInProgressNote:
        !learningView.currentCaseComplete && thisObservationItems.length > 0,
    },
    providerBriefing: {
      title: OBSERVATION_REP_SECTIONS.providerContext,
      items: toListItems(providerBriefingLines, "provider"),
    },
    evidenceProgress: {
      title: OBSERVATION_REP_SECTIONS.evidenceProgress,
      lead: repEvidenceProgressLead({ knownCount, emergingCount, total: evidenceItems.length }),
      items: evidenceItems,
    },
    debriefReadiness: {
      title: OBSERVATION_REP_SECTIONS.debriefReadiness,
      headline: repDebriefReadinessHeadline(learningView.debriefReadinessPhase),
      programUnlockLabel: "Program unlock",
      evidenceCoverageLabel: "Evidence coverage",
      reasons: readinessReasons,
      nextStep: readinessNextStep,
      programGoal: OBSERVATION_REP_PROGRAM_GOAL,
      programCasesLabel: learningView.programCasesLabel,
      progressCompleted: learningView.progress.completed,
      progressTotal: learningView.progress.total,
      debriefUnlocked: learningView.debriefUnlocked,
      openDetailsByDefault: learningView.progress.completed >= 3,
    },
  };
}

export { OBSERVATION_REP_SECTIONS };
