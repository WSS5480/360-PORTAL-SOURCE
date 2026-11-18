"use client";



import React from "react";

import { FieldIntelligenceProcessingPanel } from "@/components/sales/intelligenceCapture/FieldIntelligenceProcessingPanel";

import { intelligenceCaptureCss } from "@/components/sales/intelligenceCapture/intelligenceCaptureCss";


import {
  ENGAGEMENT_SKIP_DEBRIEF_LABEL,
} from "@/lib/surgical-sales/engagements/engagementUiLabels";
import {
  INTRO_CALL_CONVERSATION_RESULT_TITLE,
  INTRO_CALL_FINISH_LABEL,
  PROVIDER_DEBRIEF_CONTINUE_TO_RESULT_LABEL,
  PROVIDER_DEBRIEF_CONVERSATION_RESULT_LEAD,
  PROVIDER_DEBRIEF_CONVERSATION_RESULT_TITLE,
  PROVIDER_DEBRIEF_FINISH_LABEL,
  PROVIDER_DEBRIEF_FINISH_SCHEDULE_EVALUATION_LABEL,
  TACTICAL_DEBRIEF_TITLE,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import {
  classifyIntroCallConversationResult,
  isDebriefFirstOutcomeEngagementType,
} from "@/lib/surgical-sales/engagements/introCallDebriefFirstCompletion";
import {
  classifyProviderDebriefConversationResult,
  buildProviderDebriefConversationResultDisplay,
} from "@/lib/surgical-sales/engagements/classifyProviderDebriefConversationResult";
import {
  resolvePostProviderDebriefFinishHref,
  resolvePostProviderDebriefScheduleHref,
} from "@/lib/surgical-sales/engagements/resolvePostProviderDebriefFinishNavigation";
import { shouldAdvancePathwayFromDebriefNextStep } from "@/lib/surgical-sales/engagements/syncPostObservationProviderDebriefPathwayAdvance";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import type { ClassifiedEngagementOutcome } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";

import type { TacticalDebriefAnalysis } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";

import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";
import { buildStoredTacticalDebriefNotes } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { notifyProviderEngagementsRefresh } from "@/lib/surgical-sales/engagements/providerEngagementsRefresh";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import {
  TACTICAL_DEBRIEF_CAPTURE_PROMPTS,
  TACTICAL_DEBRIEF_DICTATE_ACTIVE_HINT,
  TACTICAL_DEBRIEF_DICTATE_LABEL,
  TACTICAL_DEBRIEF_DICTATE_STOP_LABEL,
  TACTICAL_DEBRIEF_CANCEL_LABEL,
  TACTICAL_DEBRIEF_EDIT_DEBRIEF_LABEL,
  TACTICAL_DEBRIEF_KICKER,
  TACTICAL_DEBRIEF_PROCESSING_HEADLINE,
  TACTICAL_DEBRIEF_PROCESSING_SUBTITLE,
  TACTICAL_DEBRIEF_CONFIRM_TITLE,
  TACTICAL_DEBRIEF_CONFIRM_SUBTITLE,
  TACTICAL_DEBRIEF_POST_TOUCH_KICKER,
  TACTICAL_DEBRIEF_FALLBACK_SAVE_NOTE,
  TACTICAL_DEBRIEF_FALLBACK_TRY_AGAIN,
  TACTICAL_DEBRIEF_MAPPING_UNAVAILABLE,
  TACTICAL_DEBRIEF_SAVE_ANALYZE_LABEL,
  DEBRIEF_SAVE_LABEL,
} from "@/lib/surgical-sales/engagements/prepareTacticalDebriefUx";
import { PrepareTacticalDebriefReviewPanel } from "./PrepareTacticalDebriefReviewPanel";
import {
  LogUpdateSuggestedReview,
  logUpdateReviewScopeContext,
  type DebriefReviewSurface,
} from "@/components/sales/aiNoteCapture/LogUpdateSuggestedReview";
import {
  AI_DEBRIEF_REVIEW_BACK_TO_APPROVAL,
  AI_DEBRIEF_REVIEW_DISCARD,
  AI_DEBRIEF_REVIEW_REVIEW_UPDATES,
  resolveDebriefReviewUpdatesTitle,
  DEBRIEF_UPDATES_SAVED_TOAST,
} from "@/lib/surgical-sales/debriefApprovalUx";
import type { DebriefCompletionContext, DebriefCompletionCommercialReview, DebriefNextStepSnapshot, DebriefPatternValidationResult } from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import { buildDebriefCompletionCommercialReview } from "@/lib/surgical-sales/engagements/buildDebriefCompletionCommercialReview";
import {
  mergeDebriefCompletionAnalyzeSnapshot,
  readDebriefCompletionContextFromSnapshot,
  readDebriefNextStepFromSnapshot,
  readDebriefValidationResultsFromSnapshot,
} from "@/lib/surgical-sales/engagements/mergeDebriefCompletionSnapshot";
import { filterPostObservationDebriefCommitPatches, autoAcceptPostObservationDebriefFieldUpdates, buildFallbackPostObservationDebriefCompletionContext } from "@/lib/surgical-sales/engagements/postObservationDebriefCompletion";
import {
  applyReviewSelectionDefaults,
  hasStructuredIntelligenceReview,
  normalizeLogUpdateProviderIntelligenceFlag,
} from "@/lib/surgical-sales/logUpdateReviewPresentation";
import { aiNoteCaptureCss } from "@/components/sales/aiNoteCapture/aiNoteCaptureCss";
import {
  refreshLogUpdateIntelligenceReview,
} from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";

import {
  buildIntelligencePropagationTargets,
  type IntelligenceCaptureScope,
  type IntelligencePropagationTarget,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import { buildInitialProposedContacts } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import {
  buildDebriefIntelligenceSnapshot,
  buildFieldEvidenceFromLogUpdate,
  parseDebriefIntelligenceSnapshot,
  type DebriefIntelligenceSnapshotV1,
} from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import {
  buildEngagementDebriefVisitPersistFields,
} from "@/lib/surgical-sales/engagements/engagementDebriefVisitRecord";
import { discoveryIntelligenceDebug } from "@/lib/surgical-sales/discoveryIntelligenceDebug";
import { persistProviderCandidateContacts } from "@/lib/surgical-sales/candidateContactIntelligence";
import {
  persistDebriefDetectedContacts,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";

import {
  buildLogUpdateProviderCommitPayload,
  hasAcceptedProposedContacts,
} from "@/lib/surgical-sales/logUpdateReviewCommit";
import { logUpdateHasUnresolvedConflicts } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { acceptAllDebriefReviewUpdates } from "@/lib/surgical-sales/debriefReviewItemState";

import { LOG_UPDATE_ERR_UNRESOLVED_CONFLICT } from "@/lib/surgical-sales/logUpdateUx";

import { salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";

import {
  buildTacticalDebriefSaveConfirmation,
  finalizeTacticalDebriefSaveConfirmation,
  type TacticalDebriefSaveConfirmation,
} from "@/lib/surgical-sales/engagements/tacticalDebriefSaveConfirmation";
import {
  PrepareTacticalDebriefConfirmation,
  PrepareTacticalDebriefConfirmationFooter,
} from "./PrepareTacticalDebriefConfirmation";
import { PrepareIntroCallConversationResultPanel } from "./PrepareIntroCallConversationResultPanel";
import { userFacingError } from "@/lib/errors/userFacingError";

type DebriefStep = "capture" | "processing" | "review" | "conversation_result" | "mapping_failed" | "confirmed";

export type DebriefSheetMode = "capture" | "review";

export function PrepareTacticalDebriefSheet({

  open,

  engagementId,

  captureScope,

  initialNarrative,

  busy,

  onClose,

  onSaved,

  onError,

  onIntelligenceApplied,

  onSaveSuccess,

  engagementDetailHref,

  initialMode = "capture",

  debriefCompleted = false,

  existingNextAction = null,

  existingDebriefSnapshot = null,

  linkedCaseId = null,

}: {

  open: boolean;

  engagementId: string;

  engagementDetailHref: string;

  captureScope: IntelligenceCaptureScope;

  initialNarrative: string;

  initialMode?: DebriefSheetMode;

  debriefCompleted?: boolean;

  existingNextAction?: string | null;

  existingDebriefSnapshot?: unknown;

  linkedCaseId?: string | null;

  captureHint: string | null;

  busy?: boolean;

  onClose: (redirectTo?: string) => void;

  onSaved: () => void | Promise<void>;

  onError: (message: string | null) => void;

  onIntelligenceApplied?: (confirmation: TacticalDebriefSaveConfirmation) => void;

  onSaveSuccess?: (message: string) => void;

}) {

  const providerId = captureScope.providerId;
  const isProviderDebriefDebriefFirst = isProviderDebriefEngagement(
    captureScope.engagementType ?? "",
  );
  const isDebriefFirstOutcomeFlow = isDebriefFirstOutcomeEngagementType(
    captureScope.engagementType ?? "",
  );



  const [step, setStep] = React.useState<DebriefStep>("capture");

  const rawNarrativeRef = React.useRef(extractRawDebriefFromStoredNotes(initialNarrative));
  const narrativeTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const [narrative, setNarrative] = React.useState(() => rawNarrativeRef.current);

  const syncDebriefTextareaHeight = React.useCallback(() => {
    const el = narrativeTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(Math.max(el.scrollHeight, 148), Math.round(window.innerHeight * 0.52));
    el.style.height = `${next}px`;
  }, []);

  const [analysis, setAnalysis] = React.useState<TacticalDebriefAnalysis | null>(null);

  const [logUpdate, setLogUpdate] = React.useState<LogUpdateParseResult | null>(null);

  const [propagationTargets, setPropagationTargets] = React.useState<IntelligencePropagationTarget[]>([]);

  const [discoveryContext, setDiscoveryContext] =
    React.useState<DebriefIntelligenceExtractionContext | null>(null);
  const [providerContactSnapshot, setProviderContactSnapshot] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [engagementOutcomeId, setEngagementOutcomeId] = React.useState<string | null>(null);
  const [isPostObservationProviderDebrief, setIsPostObservationProviderDebrief] = React.useState(false);
  const [debriefCompletionContext, setDebriefCompletionContext] =
    React.useState<DebriefCompletionContext | null>(null);
  const [debriefValidationResults, setDebriefValidationResults] = React.useState<
    DebriefPatternValidationResult[]
  >([]);
  const [debriefNextStep, setDebriefNextStep] = React.useState<DebriefNextStepSnapshot | null>(null);

  const [proposedContacts, setProposedContacts] = React.useState<DebriefProposedContactItem[]>([]);

  const [processing, setProcessing] = React.useState(false);

  const [applying, setApplying] = React.useState(false);

  const [saveConfirmation, setSaveConfirmation] = React.useState<TacticalDebriefSaveConfirmation | null>(null);

  const [reviewSurface, setReviewSurface] = React.useState<DebriefReviewSurface>("updates");
  const [reviewMode, setReviewMode] = React.useState(initialMode === "review");
  const [readOnlyReview, setReadOnlyReview] = React.useState(
    initialMode === "review" && debriefCompleted,
  );
  const [loadingSnapshot, setLoadingSnapshot] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [mappingError, setMappingError] = React.useState<string | null>(null);
  const [introCallConversationResult, setIntroCallConversationResult] = React.useState<
    ClassifiedEngagementOutcome | null
  >(null);

  function classifyConversationResultFromNarrative(narrative: string): ClassifiedEngagementOutcome & {
    evidence?: string;
  } {
    if (isProviderDebriefDebriefFirst) {
      const classified = buildProviderDebriefConversationResultDisplay({
        narrative,
        nextStep: isPostObservationProviderDebrief ? debriefNextStep : null,
      });
      return {
        outcomeId: classified.outcomeId as ClassifiedEngagementOutcome["outcomeId"],
        label: classified.label,
        rationale: classified.rationale,
        evidence: classified.evidence,
      };
    }
    return classifyIntroCallConversationResult(narrative);
  }



  const {

    dictating,

    transcribing,

    dictationMode,

    dictationError,

    clearDictationError,

    startDictation,

    stopDictation,

    stopDictationAsync,

    teardownDictation,

  } = useSpeechDictation(setNarrative, salesDictationOptions());



  const wasOpenRef = React.useRef(false);

  const hydrateFromSnapshot = React.useCallback((snapshot: DebriefIntelligenceSnapshotV1) => {
    rawNarrativeRef.current = snapshot.narrative;
    setNarrative(snapshot.narrative);
    setAnalysis(snapshot.analysis);
    setLogUpdate(
      snapshot.logUpdate
        ? applyReviewSelectionDefaults(normalizeLogUpdateProviderIntelligenceFlag(snapshot.logUpdate))
        : null,
    );
    setPropagationTargets(snapshot.propagationTargets);
    setDiscoveryContext(snapshot.discoveryContext);
    setProviderContactSnapshot(snapshot.providerContactSnapshot);
    setProposedContacts(snapshot.proposedContacts);
    setStep(snapshot.logUpdate ? "review" : "capture");
    setReviewSurface("updates");
    setReadOnlyReview(true);
  }, []);

  React.useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    const raw = extractRawDebriefFromStoredNotes(initialNarrative);
    rawNarrativeRef.current = raw;
    setReviewMode(initialMode === "review");
    setReadOnlyReview(initialMode === "review" && debriefCompleted);
    setStep(initialMode === "review" ? "review" : "capture");
    setNarrative(raw);
    setAnalysis(null);
    setLogUpdate(null);
    setPropagationTargets([]);
    setDiscoveryContext(null);
    setProviderContactSnapshot(null);
    setEngagementOutcomeId(null);
    setProposedContacts([]);
    setProcessing(false);
    setApplying(false);
    setSaveConfirmation(null);
    setReviewSurface("updates");
    setLoadingSnapshot(false);
    setIntroCallConversationResult(null);
    setMappingError(null);
    teardownDictation();
    onError(null);
    clearDictationError();
    hydratePostObservationStateFromSnapshot(existingDebriefSnapshot);

    if (initialMode === "review") {
      setLoadingSnapshot(true);
      void fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/debrief/snapshot`)
        .then((res) => res.json())
        .then((j: { ok?: boolean; snapshot?: DebriefIntelligenceSnapshotV1 | null }) => {
          if (j.ok && j.snapshot) {
            hydrateFromSnapshot(j.snapshot);
            hydratePostObservationStateFromSnapshot(existingDebriefSnapshot);
          } else {
            setStep("capture");
            setReadOnlyReview(false);
          }
        })
        .catch(() => {
          setStep("capture");
          setReadOnlyReview(false);
        })
        .finally(() => setLoadingSnapshot(false));
    }
  }, [open, initialNarrative, initialMode, debriefCompleted, engagementId, hydrateFromSnapshot]);

  React.useEffect(() => {
    if (!open || step !== "capture") return;
    syncDebriefTextareaHeight();
  }, [open, step, narrative, syncDebriefTextareaHeight]);

  if (!open) return null;



  const debriefCommercialReview = React.useMemo<DebriefCompletionCommercialReview | null>(() => {
    if (!isPostObservationProviderDebrief || !debriefNextStep) return null;
    const previewLogUpdate =
      logUpdate && narrative.trim()
        ? autoAcceptPostObservationDebriefFieldUpdates({
            logUpdate,
            narrative: narrative.trim(),
            validationResults: debriefValidationResults,
          })
        : logUpdate;
    return buildDebriefCompletionCommercialReview({
      logUpdate: previewLogUpdate,
      proposedContacts,
      validationResults: debriefValidationResults,
      nextStep: debriefNextStep,
    });
  }, [
    debriefNextStep,
    debriefValidationResults,
    isPostObservationProviderDebrief,
    logUpdate,
    narrative,
    proposedContacts,
  ]);

  const disabled = busy || processing || applying || transcribing;



  async function saveAndAnalyze() {

    let text = narrative.trim();

    if (dictating || transcribing) {

      const merged = await stopDictationAsync();

      if (merged?.trim()) text = merged.trim();

      else text = narrative.trim();

    }

    if (text.length < 8) {

      onError("Add a few words about the visit first.");

      return;

    }



    rawNarrativeRef.current = text;
    setNarrative(text);

    setStep("processing");
    setProcessing(true);
    onError(null);
    setMappingError(null);

    try {

      const res = await fetch(

        `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/debrief/analyze`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ narrative: text }),

        },

      );

      const j = await readResponseJson<{
        ok?: boolean;
        mapping_failed?: boolean;
        error?: string;
        analysis?: TacticalDebriefAnalysis;
        propagation_targets?: IntelligencePropagationTarget[];
        discovery_context?: DebriefIntelligenceExtractionContext | null;
        provider_contact_snapshot?: Record<string, unknown> | null;
        engagement_outcome_id?: string | null;
        is_post_observation_provider_debrief?: boolean;
        debrief_completion_context?: DebriefCompletionContext | null;
        debrief_validation_results?: DebriefPatternValidationResult[];
        debrief_next_step?: DebriefNextStepSnapshot | null;
        debrief_validation_debug?: unknown;
      }>(res);

      if (j.mapping_failed || !res.ok || !j.ok) {
        setMappingError(
          typeof j.error === "string"
            ? j.error
            : !res.ok
              ? `Analyze request failed (HTTP ${res.status}).`
              : "Analyze failed.",
        );
        setStep("mapping_failed");
        return;
      }

      if (!j.analysis) {
        throw new Error(typeof j.error === "string" ? j.error : "Analyze failed");
      }



      setAnalysis(j.analysis);

      const validationResults = j.debrief_validation_results ?? [];
      const isPostObservation = Boolean(j.is_post_observation_provider_debrief);
      let nextLogUpdate = j.analysis.log_update
        ? applyReviewSelectionDefaults(
            normalizeLogUpdateProviderIntelligenceFlag(j.analysis.log_update),
          )
        : null;
      if (nextLogUpdate && isPostObservation) {
        nextLogUpdate = autoAcceptPostObservationDebriefFieldUpdates({
          logUpdate: nextLogUpdate,
          narrative: text,
          validationResults,
        });
      }
      setLogUpdate(nextLogUpdate);

      setPropagationTargets(j.propagation_targets ?? []);
      const discoveryCtx = j.discovery_context ?? null;
      setDiscoveryContext(discoveryCtx);
      setProviderContactSnapshot(j.provider_contact_snapshot ?? null);
      setEngagementOutcomeId(j.engagement_outcome_id ?? null);
      setIsPostObservationProviderDebrief(isPostObservation);
      setDebriefCompletionContext(j.debrief_completion_context ?? null);
      setDebriefValidationResults(validationResults);
      setDebriefNextStep(j.debrief_next_step ?? null);
      const sourceRef = `engagement:${engagementId}`;
      if (j.analysis?.log_update) {
        setProposedContacts(
          buildInitialProposedContacts({
            review: j.analysis.log_update,
            discoveryContext: discoveryCtx,
            sourceReference: sourceRef,
          }),
        );
      } else {
        setProposedContacts([]);
      }
      setStep("review");
      setReviewSurface("updates");
    } catch (e: unknown) {
      onError(userFacingError(e, "We could not review those notes. Please try again."));

      setStep("capture");

    } finally {

      setProcessing(false);

    }

  }



  function resolveUniversalFactCaptureId(
    review: LogUpdateParseResult | null,
  ): string | null {
    return review?.debriefUniversalFactsRuns?.[0]?.capture_id ?? null;
  }

  function resolveDebriefNarrative(): string {
    const candidates = [
      rawNarrativeRef.current,
      narrative,
      logUpdate?.sourceText,
      analysis?.log_update?.sourceText,
      extractRawDebriefFromStoredNotes(initialNarrative),
      parseDebriefIntelligenceSnapshot(existingDebriefSnapshot)?.narrative,
    ];
    for (const candidate of candidates) {
      const text = String(candidate ?? "").trim();
      if (!text) continue;
      rawNarrativeRef.current = text;
      return text;
    }
    return "";
  }

  function isBenignLogUpdateNothingToSave(message: string): boolean {
    return message === "Nothing to save." || message === "Nothing to save";
  }

  function hydratePostObservationStateFromSnapshot(snapshot: unknown) {
    const nextStep = readDebriefNextStepFromSnapshot(snapshot);
    const validationResults = readDebriefValidationResultsFromSnapshot(snapshot);
    const completionContext = readDebriefCompletionContextFromSnapshot(snapshot);
    if (!nextStep && !completionContext) return;
    setIsPostObservationProviderDebrief(true);
    if (validationResults.length > 0) {
      setDebriefValidationResults(validationResults);
    }
    if (nextStep) {
      setDebriefNextStep(nextStep);
    }
  }

  function buildVisitPersistPayload(snapshot: DebriefIntelligenceSnapshotV1 | null) {
    const raw = resolveDebriefNarrative();
    const engagementType = captureScope.engagementType?.trim() || "follow_up";
    const baseSnapshot =
      snapshot ??
      buildDebriefIntelligenceSnapshot({
        narrative: raw,
        analysis: analysis ?? null,
        logUpdate: logUpdate ?? null,
        propagationTargets,
        discoveryContext,
        providerContactSnapshot,
        proposedContacts,
        universalFactCaptureId: resolveUniversalFactCaptureId(logUpdate),
      });
    return buildEngagementDebriefVisitPersistFields({
      snapshot: baseSnapshot,
      narrative: raw,
      engagementType,
      existingNextAction,
      existingDebriefSnapshot:
        isPostObservationProviderDebrief && debriefNextStep
          ? mergeDebriefCompletionAnalyzeSnapshot(existingDebriefSnapshot, {
              completionContext:
                debriefCompletionContext ??
                buildFallbackPostObservationDebriefCompletionContext(),
              validationResults: debriefValidationResults,
              nextStep: debriefNextStep,
            })
          : existingDebriefSnapshot,
      logUpdate: logUpdate ?? null,
      proposedContacts,
      providerContact: providerContactSnapshot,
      providerLabel: captureScope.providerLabel,
    });
  }

  async function persistRawDebriefAndComplete(snapshot?: DebriefIntelligenceSnapshotV1 | null) {
    const raw = resolveDebriefNarrative();
    const visit = buildVisitPersistPayload(snapshot ?? null);
    const patchBody: Record<string, unknown> = {
      status: "completed",
      mark_debrief_completed: true,
      debrief_intelligence_snapshot: visit.debrief_intelligence_snapshot,
      next_action: visit.next_action,
      follow_up_tasks: visit.follow_up_tasks,
    };
    if (raw) {
      patchBody.notes = buildStoredTacticalDebriefNotes({
        narrative: raw,
        insights: analysis?.insights,
      });
    }
    const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    const j = await readResponseJson<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !j.ok) throw new Error(j.error || "");
    if (providerId) notifyProviderEngagementsRefresh(providerId);
  }

  function resolveDebriefFirstFinishHref(options?: { scheduleEvaluation?: boolean }) {
    if (!isProviderDebriefDebriefFirst || !providerId) return undefined;
    if (options?.scheduleEvaluation) {
      return (
        resolvePostProviderDebriefScheduleHref({
          providerId,
          organizationId: captureScope.organizationId,
          nextStep: debriefNextStep,
          returnTo: engagementDetailHref,
        }) ?? resolvePostProviderDebriefFinishHref({ providerId })
      );
    }
    return resolvePostProviderDebriefFinishHref({ providerId });
  }

  async function saveUpdates(options?: { scheduleEvaluation?: boolean }) {
    setApplying(true);
    onError(null);
    setSaveError(null);
    try {
      resolveDebriefNarrative();

      if (!logUpdate) {
        if (!resolveDebriefNarrative() && step !== "conversation_result") {
          throw new Error("Nothing to save");
        }
        await persistRawDebriefAndComplete();
        onSaveSuccess?.(DEBRIEF_UPDATES_SAVED_TOAST);
        await onSaved();
        onClose(resolveDebriefFirstFinishHref(options));
        return;
      }

      let logUpdateToSave = logUpdate;
      if (isPostObservationProviderDebrief) {
        logUpdateToSave = autoAcceptPostObservationDebriefFieldUpdates({
          logUpdate: logUpdateToSave,
          narrative: rawNarrativeRef.current,
          validationResults: debriefValidationResults,
        });
      } else if (
        reviewSurface === "approval" &&
        logUpdateToSave.usesProviderIntelligence &&
        !logUpdateToSave.fieldUpdates.some((u) => u.accepted)
      ) {
        logUpdateToSave = acceptAllDebriefReviewUpdates(logUpdateToSave);
      }

      const hasAcceptedFields =
        Boolean(logUpdateToSave.usesProviderIntelligence) &&
        logUpdateToSave.fieldUpdates.some((u) => u.accepted);

      if (providerId && logUpdateToSave.usesProviderIntelligence && hasAcceptedFields) {
        if (logUpdateHasUnresolvedConflicts(logUpdateToSave.fieldUpdates)) {
          throw new Error(LOG_UPDATE_ERR_UNRESOLVED_CONFLICT);
        }
        const built = buildLogUpdateProviderCommitPayload(logUpdateToSave, {
          hasAcceptedContacts: hasAcceptedProposedContacts(proposedContacts),
        });
        if ("error" in built) throw new Error(built.error);
      }

      const snapshot = buildDebriefIntelligenceSnapshot({
        narrative: resolveDebriefNarrative(),
        analysis,
        logUpdate: logUpdateToSave,
        propagationTargets,
        discoveryContext,
        providerContactSnapshot,
        proposedContacts,
        universalFactCaptureId: resolveUniversalFactCaptureId(logUpdateToSave),
      });
      await persistRawDebriefAndComplete(snapshot);

      let providerNoteSaved = false;
      if (providerId && logUpdateToSave.usesProviderIntelligence && hasAcceptedFields) {
        const built = buildLogUpdateProviderCommitPayload(logUpdateToSave, {
          hasAcceptedContacts: hasAcceptedProposedContacts(proposedContacts),
        });
        if ("error" in built) throw new Error(built.error);

        const fieldPatches = isPostObservationProviderDebrief
          ? filterPostObservationDebriefCommitPatches({
              fieldPatches: built.fieldPatches,
              narrative: rawNarrativeRef.current,
              validationResults: debriefValidationResults,
            })
          : built.fieldPatches;

        const hasCommittableProviderUpdates =
          fieldPatches.length > 0 ||
          built.saveAsNote ||
          hasAcceptedProposedContacts(proposedContacts);

        if (hasCommittableProviderUpdates) {
          const fieldEvidence = buildFieldEvidenceFromLogUpdate(logUpdateToSave);
        const engagementLabel =
          captureScope.engagementTypeLabel?.trim() || "Engagement debrief";
        discoveryIntelligenceDebug("debriefExtractionResult", {
          providerId,
          engagementId,
          acceptedFields: logUpdateToSave.fieldUpdates
            .filter((u) => u.accepted)
            .map((u) => u.dbKey),
          fieldUpdates: logUpdateToSave.fieldUpdates
            .filter((u) => u.accepted)
            .map((u) => ({ dbKey: u.dbKey, proposedValue: u.proposedValue?.slice(0, 120) })),
        });
        discoveryIntelligenceDebug("mappedDiscoveryEvidenceBeforeSave", {
          providerId,
          fieldEvidence,
        });
        discoveryIntelligenceDebug("debrief:save", {
          providerId,
          engagementId,
          acceptedFields: logUpdateToSave.fieldUpdates
            .filter((u) => u.accepted)
            .map((u) => u.dbKey),
          fieldEvidence,
        });
        const res = await fetch(
          `/api/portal/sales/providers/${encodeURIComponent(providerId)}/log-update`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...built,
              fieldPatches,
              captureContext: {
                source_type: "engagement",
                source_label: engagementLabel,
                source_engagement_id: engagementId,
                declared_source_type: "debrief",
              },
              fieldEvidence,
            }),
          },
        );
        const j = await readResponseJson<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !j.ok) {
          const message = j.error || "Could not apply updates";
          if (!isBenignLogUpdateNothingToSave(message)) {
            throw new Error(message);
          }
        } else {
          providerNoteSaved = true;
          if (providerId) notifyProviderEngagementsRefresh(providerId);
        }
        }
      }

      let contactFollowUps: string[] = [];
      if (providerId && proposedContacts.length > 0) {
        const contactResult = await persistDebriefDetectedContacts({
          providerId,
          organizationId: captureScope.organizationId,
          contacts: proposedContacts,
          sourceLabel: "Engagement debrief",
        }).catch(() => ({ saved: [], followUpTasks: [], errors: [] }));
        const contactsForCandidates = proposedContacts.map((contact) => {
          const saved = contactResult.saved.find(
            (row) => row.displayName.toLowerCase() === contact.displayName.toLowerCase(),
          );
          return saved ? { ...contact, linkedContactId: saved.contactId } : contact;
        });
        await persistProviderCandidateContacts({
          providerId,
          contacts: contactsForCandidates,
          sourceEngagementId: engagementId,
        }).catch((err) => {
          console.warn("[debrief] candidate contacts:", err);
        });
        contactFollowUps = contactResult.followUpTasks;
        if (contactResult.errors.length > 0) {
          console.warn("[debrief] contact persist:", contactResult.errors.join("; "));
        }
      }

      const engagementType = captureScope.engagementTypeLabel?.trim();
      const engagementDebriefLine = engagementType
        ? `${engagementType} debrief`
        : "Touch debrief saved";

      const confirmation = finalizeTacticalDebriefSaveConfirmation(
        buildTacticalDebriefSaveConfirmation({
          logUpdate: logUpdateToSave,
          propagationTargets,
          engagementDebriefSaved: true,
          providerNoteSaved,
          engagementDebriefLine,
          contactFollowUpTasks: contactFollowUps,
        }),
        {
          providerId,
          accountId: captureScope.organizationId,
          logUpdate: logUpdateToSave,
        },
      );
      setSaveConfirmation(confirmation);
      onIntelligenceApplied?.(confirmation);
      onSaveSuccess?.(confirmation.mappingHandoff?.toastMessage ?? DEBRIEF_UPDATES_SAVED_TOAST);
      await onSaved();
      onClose(resolveDebriefFirstFinishHref(options));
    } catch (e: unknown) {
      const message = userFacingError(e, "Could not apply updates");
      setSaveError(message);
      onError(message);
    } finally {
      setApplying(false);
    }
  }

  function editDebrief() {
    setNarrative(rawNarrativeRef.current);
    requestAnimationFrame(() => syncDebriefTextareaHeight());
    setReadOnlyReview(false);
    setStep("capture");
    onError(null);
  }

  async function savePlainDebriefOnly() {
    setApplying(true);
    onError(null);
    try {
      await persistRawDebriefAndComplete();
      await onSaved();
      onClose();
    } catch (e: unknown) {
      onError(userFacingError(e, "Could not save debrief"));
    } finally {
      setApplying(false);
    }
  }

  async function skipDebrief() {
    if (dictating || transcribing) {
      await stopDictationAsync();
    }
    rawNarrativeRef.current = "";
    setNarrative("");
    setApplying(true);
    onError(null);
    try {
      await persistRawDebriefAndComplete(null);
      await onSaved();
      onClose();
    } catch (e: unknown) {
      onError(userFacingError(e, "Could not skip debrief"));
    } finally {
      setApplying(false);
    }
  }

  function toggleLogUpdateField(id: string, accepted: boolean) {
    setLogUpdate((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        fieldUpdates: prev.fieldUpdates.map((u) => (u.id === id ? { ...u, accepted } : u)),
        suggestedUpdates: prev.suggestedUpdates.map((u) => (u.id === id ? { ...u, accepted } : u)),
      };
      return refreshLogUpdateIntelligenceReview(next, {});
    });
  }

  function resolveLogUpdateConflict(id: string, resolution: LogUpdateConflictResolution) {
    setLogUpdate((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        fieldUpdates: prev.fieldUpdates.map((u) => {
          if (u.id !== id || !u.conflict) return u;
          return {
            ...u,
            accepted: true,
            conflict: { ...u.conflict, resolution },
          };
        }),
      };
      return refreshLogUpdateIntelligenceReview(next, {});
    });
  }

  function replaceLogUpdateReview(
    nextOrUpdater:
      | LogUpdateParseResult
      | ((prev: LogUpdateParseResult) => LogUpdateParseResult),
  ) {
    setLogUpdate((prev) => {
      if (!prev) return prev;
      const next =
        typeof nextOrUpdater === "function" ? nextOrUpdater(prev) : nextOrUpdater;
      return refreshLogUpdateIntelligenceReview(next, {});
    });
  }

  const hasUnresolvedFieldConflicts = Boolean(
    logUpdate?.usesProviderIntelligence &&
      logUpdateHasUnresolvedConflicts(logUpdate.fieldUpdates),
  );
  const canSaveStructuredReview =
    rawNarrativeRef.current.trim().length >= 8 && !hasUnresolvedFieldConflicts;

  // The initial "Debrief" capture screen no longer shows a subtitle description;
  // later steps keep their contextual guidance.
  const headerHint =
    step === "confirmed"
      ? TACTICAL_DEBRIEF_CONFIRM_SUBTITLE
      : step === "conversation_result" && isProviderDebriefDebriefFirst
        ? "Finish debrief now, or schedule evaluation when you are ready."
        : step === "processing"
          ? TACTICAL_DEBRIEF_PROCESSING_SUBTITLE
          : null;

  return (

    <>

      <style dangerouslySetInnerHTML={{ __html: intelligenceCaptureCss + aiNoteCaptureCss }} />

      <div

        className="pfm-debrief-backdrop"

        role="presentation"

        onKeyDown={(e) => {

          if (e.key === "Escape" && step !== "processing") onClose();

        }}

      >

        <div

          className={`pfm-debrief-sheet${step === "review" || step === "conversation_result" ? " pfm-debrief-sheet--review" : ""}${step === "confirmed" ? " pfm-debrief-sheet--confirmed" : ""}`}

          role="dialog"

          aria-modal="true"

          aria-labelledby="pfm-debrief-title"

          onClick={(e) => e.stopPropagation()}

        >

          <header className="pfm-debrief-head">

            <div>

              <p className="pfm-debrief-kicker">
                {step === "confirmed"
                  ? TACTICAL_DEBRIEF_POST_TOUCH_KICKER
                  : step === "review" || step === "conversation_result"
                    ? TACTICAL_DEBRIEF_POST_TOUCH_KICKER
                    : TACTICAL_DEBRIEF_KICKER}
              </p>

              <h2 id="pfm-debrief-title">
                {step === "confirmed"
                  ? TACTICAL_DEBRIEF_CONFIRM_TITLE
                  : step === "conversation_result"
                    ? isProviderDebriefDebriefFirst
                      ? PROVIDER_DEBRIEF_CONVERSATION_RESULT_TITLE
                      : INTRO_CALL_CONVERSATION_RESULT_TITLE
                  : step === "review"
                    ? reviewMode
                      ? "Review Extracted Intelligence"
                      : hasStructuredIntelligenceReview(logUpdate) && reviewSurface === "updates"
                        ? resolveDebriefReviewUpdatesTitle(isPostObservationProviderDebrief)
                        : "Review"
                    : step === "processing"
                      ? TACTICAL_DEBRIEF_PROCESSING_HEADLINE
                      : TACTICAL_DEBRIEF_TITLE}
              </h2>

              {headerHint ? <p className="pfm-debrief-hint">{headerHint}</p> : null}

            </div>

            <button

              type="button"

              className="pfm-debrief-close"

              onClick={() => onClose()}

              disabled={step === "processing"}

              aria-label="Close"

            >

              ×

            </button>

          </header>



          <div className="pfm-debrief-body">

            {loadingSnapshot ? (
              <FieldIntelligenceProcessingPanel
                active
                embedded
                showTitle={false}
                providerLabel={captureScope.providerLabel}
                organizationLabel={captureScope.organizationLabel}
                engagementTypeLabel={captureScope.engagementTypeLabel}
              />
            ) : null}

            {step === "review" && readOnlyReview && reviewMode && !logUpdate ? (
              <section className="pfm-debrief-review-narrative" aria-label="Debrief narrative">
                <p className="pfm-debrief-review-narrative-kicker">Original debrief</p>
                <p className="pfm-debrief-review-narrative-body">{narrative}</p>
                <p className="pfm-debrief-review-narrative-hint">
                  Intelligence mapping is not saved for this debrief yet. Re-run analysis to review
                  extracted workflow intelligence.
                </p>
                <button
                  type="button"
                  className="pfm-debrief-footer-primary"
                  disabled={disabled}
                  onClick={() => void saveAndAnalyze()}
                >
                  Map intelligence from debrief
                </button>
              </section>
            ) : null}

            {step === "capture" && !loadingSnapshot ? (

              <>

                <ul className="pfm-debrief-prompts" aria-label="Capture prompts">

                  {TACTICAL_DEBRIEF_CAPTURE_PROMPTS.map((prompt) => (

                    <li key={prompt}>{prompt}</li>

                  ))}

                </ul>



                <div className="pfm-debrief-compose">

                  <textarea
                    ref={narrativeTextareaRef}
                    value={narrative}
                    rows={7}
                    disabled={disabled}
                    placeholder="Speak or type naturally — who you met, what mattered, friction, what changes before next touch…"
                    aria-label="Visit debrief"
                    onChange={(e) => {
                      const next = e.target.value;
                      rawNarrativeRef.current = next;
                      setNarrative(next);
                      clearDictationError();
                      requestAnimationFrame(() => syncDebriefTextareaHeight());
                    }}
                  />

                  <div className="pfm-debrief-compose-actions">

                    <button

                      type="button"

                      className={`pfm-debrief-mic${dictating ? " pfm-debrief-mic--active" : ""}`}

                      disabled={disabled}

                      aria-pressed={dictating}

                      onClick={() => {

                        if (dictating || transcribing) stopDictation();

                        else startDictation(narrative);

                      }}

                    >

                      <span className="pfm-debrief-mic-icon" aria-hidden>

                        {dictating || transcribing ? "●" : "◉"}

                      </span>

                      {transcribing

                        ? "Transcribing…"

                        : dictating

                          ? TACTICAL_DEBRIEF_DICTATE_STOP_LABEL

                          : TACTICAL_DEBRIEF_DICTATE_LABEL}

                    </button>

                    {dictating || transcribing ? (

                      <span className="pfm-debrief-mic-live" role="status">

                        {transcribing

                          ? "Turning your recording into text…"

                          : dictationMode === "server"

                            ? "Recording — speak, then tap stop"

                            : TACTICAL_DEBRIEF_DICTATE_ACTIVE_HINT}

                      </span>

                    ) : null}

                  </div>

                </div>



                {dictationError ? (

                  <p className="pfm-debrief-compose-error" role="alert">

                    {dictationError}

                  </p>

                ) : null}

              </>

            ) : null}



            {step === "processing" ? (
              <FieldIntelligenceProcessingPanel
                active
                embedded
                showTitle={false}
                providerLabel={captureScope.providerLabel}
                organizationLabel={captureScope.organizationLabel}
                engagementTypeLabel={captureScope.engagementTypeLabel}
              />
            ) : null}

            {step === "mapping_failed" ? (
              <div className="log-update-mapping-failed" role="alert">
                <p>{TACTICAL_DEBRIEF_MAPPING_UNAVAILABLE}</p>
                {mappingError ? (
                  <p className="pfm-debrief-compose-error">{mappingError}</p>
                ) : null}
                <div className="log-update-mapping-failed-actions">
                  <button
                    type="button"
                    className="pfm-debrief-footer-secondary"
                    disabled={disabled}
                    onClick={() => void savePlainDebriefOnly()}
                  >
                    {TACTICAL_DEBRIEF_FALLBACK_SAVE_NOTE}
                  </button>
                  <button
                    type="button"
                    className="pfm-debrief-footer-secondary"
                    disabled={disabled}
                    onClick={() => void saveAndAnalyze()}
                  >
                    {TACTICAL_DEBRIEF_FALLBACK_TRY_AGAIN}
                  </button>
                  <button type="button" className="pfm-debrief-footer-secondary" onClick={() => onClose()}>
                    {TACTICAL_DEBRIEF_CANCEL_LABEL}
                  </button>
                </div>
              </div>
            ) : null}

            {step === "review" && analysis && hasStructuredIntelligenceReview(logUpdate) && !loadingSnapshot ? (
              <LogUpdateSuggestedReview
                review={logUpdate!}
                propagationTargets={propagationTargets}
                discoveryContext={discoveryContext}
                providerContact={providerContactSnapshot}
                proposedContacts={proposedContacts}
                organizationId={captureScope.organizationId}
                sourceReference={`engagement:${engagementId}`}
                engagementTypeLabel={captureScope.engagementTypeLabel}
                engagementOutcomeId={engagementOutcomeId}
                reviewSurface={reviewSurface}
                readOnly={readOnlyReview}
                reviewUpdatesTitle={resolveDebriefReviewUpdatesTitle(isPostObservationProviderDebrief)}
                commercialReview={debriefCommercialReview}
                onEditDebrief={editDebrief}
                onContactsChange={setProposedContacts}
                engagementId={engagementId}
                providerId={providerId}
                scopeDisplayContext={logUpdateReviewScopeContext({
                  engagementId,
                  providerId,
                  providerLabel: captureScope.providerLabel,
                  organizationId: captureScope.organizationId,
                  organizationLabel: captureScope.organizationLabel,
                })}
                onReviewChange={replaceLogUpdateReview}
                onToggleUpdate={toggleLogUpdateField}
                onResolveConflict={resolveLogUpdateConflict}
              />
            ) : null}

            {step === "review" && analysis && !hasStructuredIntelligenceReview(logUpdate) ? (
              <PrepareTacticalDebriefReviewPanel
                analysis={analysis}
                propagationTargets={propagationTargets}
                logUpdate={logUpdate}
                scopeDisplayContext={logUpdateReviewScopeContext({
                  engagementId,
                  providerId,
                  providerLabel: captureScope.providerLabel,
                  organizationId: captureScope.organizationId,
                  organizationLabel: captureScope.organizationLabel,
                })}
                onToggleUpdate={toggleLogUpdateField}
                onResolveConflict={resolveLogUpdateConflict}
              />
            ) : null}

            {step === "confirmed" && saveConfirmation ? (
              <PrepareTacticalDebriefConfirmation confirmation={saveConfirmation} />
            ) : null}

            {step === "conversation_result" && introCallConversationResult ? (
              <PrepareIntroCallConversationResultPanel
                result={introCallConversationResult}
                compact
                title={
                  isProviderDebriefDebriefFirst
                    ? PROVIDER_DEBRIEF_CONVERSATION_RESULT_TITLE
                    : INTRO_CALL_CONVERSATION_RESULT_TITLE
                }
                lead={
                  isProviderDebriefDebriefFirst
                    ? PROVIDER_DEBRIEF_CONVERSATION_RESULT_LEAD
                    : undefined
                }
              />
            ) : null}

          </div>



          <footer className="pfm-debrief-footer">

            {step === "capture" ? (

              <>

                <button

                  type="button"

                  className="pfm-debrief-footer-secondary"

                  disabled={disabled}

                  onClick={() => void skipDebrief()}

                >

                  {ENGAGEMENT_SKIP_DEBRIEF_LABEL}

                </button>

                <button

                  type="button"

                  className="pfm-debrief-footer-secondary"

                  disabled={disabled}

                  onClick={() => onClose()}

                >

                  {TACTICAL_DEBRIEF_CANCEL_LABEL}

                </button>

                <button

                  type="button"

                  className="pfm-debrief-footer-primary"

                  disabled={disabled || narrative.trim().length < 8}

                  onClick={() => void saveAndAnalyze()}

                >

                  {TACTICAL_DEBRIEF_SAVE_ANALYZE_LABEL}

                </button>

              </>

            ) : null}



            {step === "review" && !loadingSnapshot ? (
              <>
                {saveError ? (
                  <p className="pfm-debrief-compose-error" role="alert">
                    {saveError}
                  </p>
                ) : null}
                {readOnlyReview ? (
                  <>
                    <button
                      type="button"
                      className="pfm-debrief-footer-primary"
                      disabled={disabled}
                      onClick={() => onClose()}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="pfm-debrief-footer-secondary"
                      disabled={disabled}
                      onClick={editDebrief}
                    >
                      {TACTICAL_DEBRIEF_EDIT_DEBRIEF_LABEL}
                    </button>
                    {logUpdate ? (
                      <button
                        type="button"
                        className="pfm-debrief-footer-secondary"
                        disabled={disabled}
                        onClick={() => {
                          setReadOnlyReview(false);
                          setReviewMode(false);
                        }}
                      >
                        Edit mappings
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="pfm-debrief-footer-approval">
                    <button
                      type="button"
                      className="pfm-debrief-footer-primary"
                      disabled={disabled || (hasStructuredIntelligenceReview(logUpdate) && !canSaveStructuredReview)}
                      onClick={() => {
                        // Provider debrief keeps the result step because the
                        // "Finish & schedule evaluation" option lives there.
                        if (isDebriefFirstOutcomeFlow && isProviderDebriefDebriefFirst) {
                          setIntroCallConversationResult(
                            classifyConversationResultFromNarrative(rawNarrativeRef.current.trim()),
                          );
                          setStep("conversation_result");
                          return;
                        }
                        void saveUpdates();
                      }}
                    >
                      {applying
                        ? "Saving…"
                        : isDebriefFirstOutcomeFlow && isProviderDebriefDebriefFirst
                          ? PROVIDER_DEBRIEF_CONTINUE_TO_RESULT_LABEL
                          : DEBRIEF_SAVE_LABEL}
                    </button>
                    {hasStructuredIntelligenceReview(logUpdate) ? (
                      <div className="pfm-debrief-footer-secondary-row">
                        {reviewSurface === "updates" ? (
                          <button
                            type="button"
                            className="pfm-debrief-footer-secondary"
                            disabled={disabled}
                            onClick={() => setReviewSurface("approval")}
                          >
                            {AI_DEBRIEF_REVIEW_BACK_TO_APPROVAL}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pfm-debrief-footer-secondary"
                            disabled={disabled}
                            onClick={() => setReviewSurface("updates")}
                          >
                            {AI_DEBRIEF_REVIEW_REVIEW_UPDATES}
                          </button>
                        )}
                        <button
                          type="button"
                          className="pfm-debrief-footer-secondary"
                          disabled={disabled}
                          onClick={() => onClose()}
                        >
                          {AI_DEBRIEF_REVIEW_DISCARD}
                        </button>
                      </div>
                    ) : (
                      <div className="pfm-debrief-footer-secondary-row">
                        <button
                          type="button"
                          className="pfm-debrief-footer-secondary"
                          disabled={disabled}
                          onClick={editDebrief}
                        >
                          {TACTICAL_DEBRIEF_EDIT_DEBRIEF_LABEL}
                        </button>
                        <button
                          type="button"
                          className="pfm-debrief-footer-secondary"
                          disabled={disabled}
                          onClick={() => onClose()}
                        >
                          {TACTICAL_DEBRIEF_CANCEL_LABEL}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}

            {step === "conversation_result" ? (
              <>
                {saveError ? (
                  <p className="pfm-debrief-compose-error" role="alert">
                    {saveError}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="pfm-debrief-footer-primary"
                  disabled={disabled}
                  onClick={() => void saveUpdates()}
                >
                  {applying
                    ? "Saving…"
                    : isProviderDebriefDebriefFirst
                      ? PROVIDER_DEBRIEF_FINISH_LABEL
                      : INTRO_CALL_FINISH_LABEL}
                </button>
                {isProviderDebriefDebriefFirst &&
                shouldAdvancePathwayFromDebriefNextStep(debriefNextStep) ? (
                  <button
                    type="button"
                    className="pfm-debrief-footer-secondary"
                    disabled={disabled}
                    onClick={() => void saveUpdates({ scheduleEvaluation: true })}
                  >
                    {applying ? "Saving…" : PROVIDER_DEBRIEF_FINISH_SCHEDULE_EVALUATION_LABEL}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="pfm-debrief-footer-secondary"
                  disabled={disabled}
                  onClick={() => setStep("review")}
                >
                  {AI_DEBRIEF_REVIEW_BACK_TO_APPROVAL}
                </button>
              </>
            ) : null}

            {step === "confirmed" && saveConfirmation ? (
              <PrepareTacticalDebriefConfirmationFooter
                confirmation={saveConfirmation}
                providerId={providerId}
                onDone={() => onClose()}
              />
            ) : null}

          </footer>

        </div>

      </div>

    </>

  );

}


