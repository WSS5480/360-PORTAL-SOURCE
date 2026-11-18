"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import PhiPatternAdvisoryModal, { PhiPatternInlineHint } from "@/components/sales/PhiPatternAdvisoryModal";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import {
  AI_NOTE_CAPTURE_HIPAA_WARNING,
} from "@/lib/surgical-sales/aiNoteCapture/labels";
import type {
  AiNoteCaptureContext,
  AiNoteCaptureInputMode,
  AiNoteCaptureSavedResult,
} from "@/lib/surgical-sales/aiNoteCapture/types";
import {
  LOG_UPDATE_COMPOSE_TITLE,
  LOG_UPDATE_DONE_TITLE,
  LOG_UPDATE_ERR_EMPTY_NOTE,
  LOG_UPDATE_ERR_HIPAA_ACK,
  LOG_UPDATE_ERR_NO_TARGET,
  LOG_UPDATE_ERR_NOTHING_TO_SAVE,
  LOG_UPDATE_ERR_PHI_BEFORE_SAVE,
  LOG_UPDATE_ERR_UNRESOLVED_CONFLICT,
  LOG_UPDATE_EDIT_DEBRIEF_ACTION,
  LOG_UPDATE_PHI_ACK,
  formatLogUpdateApiError,
  LOG_UPDATE_FALLBACK_SAVE_NOTE,
  LOG_UPDATE_FALLBACK_TRY_AGAIN,
  LOG_UPDATE_MAPPING_UNAVAILABLE,
  LOG_UPDATE_QUICK_CAPTURE_ACTION,
  LOG_UPDATE_REVIEW_ACTION,
  LOG_UPDATE_REVIEW_PHI_BODY,
  LOG_UPDATE_REVIEW_PHI_HEADING,
  LOG_UPDATE_REVIEW_SELECTION_HINT,
  LOG_UPDATE_REVIEW_SUBTITLE,
  LOG_UPDATE_REVIEW_TITLE,
  LOG_UPDATE_SAVE_RECOMMENDED_ACTION,
  LOG_UPDATE_TOAST_SAVED,
} from "@/lib/surgical-sales/logUpdateUx";
import { AI_DEBRIEF_REVIEW_SAVE_UPDATES } from "@/lib/surgical-sales/debriefApprovalUx";
import {
  refreshLogUpdateIntelligenceReview,
  type LogUpdateParseResult,
} from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  buildLegacyCommitItemsFromLogUpdateReview,
  buildLogUpdateProviderCommitPayload,
  buildProviderFieldNoteFollowUpSyncPayload,
  hasAcceptedProposedContacts,
  reviewCanSaveStructuredIntelligence,
  reviewHasSavableSelection,
} from "@/lib/surgical-sales/logUpdateReviewCommit";
import { logUpdateHasUnresolvedConflicts } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import {
  isVoiceCaptureAvailable,
  salesDictationOptions,
  useSpeechDictation,
} from "@/hooks/useSpeechDictation";
import { intelligenceCaptureCss } from "@/components/sales/intelligenceCapture/intelligenceCaptureCss";
import { FieldIntelligenceProcessingPanel } from "@/components/sales/intelligenceCapture/FieldIntelligenceProcessingPanel";
import { LogUpdateCaptureCompose } from "./LogUpdateCaptureCompose";
import {
  buildIntelligenceCaptureScopeFromEngagement,
  buildIntelligencePropagationTargets,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { aiNoteCaptureCss } from "./aiNoteCaptureCss";
import {
  LogUpdateSuggestedReview,
  logUpdateReviewScopeContext,
} from "./LogUpdateSuggestedReview";
import { IntelligenceSaveConfirmation } from "@/components/sales/intelligenceCapture/IntelligenceSaveConfirmation";
import { IntelligencePostSaveFooter } from "@/components/sales/intelligenceCapture/IntelligencePostSaveFooter";
import {
  buildAcceptedByTargetForPostSave,
  buildLogUpdateIntelligenceSaveConfirmation,
} from "@/lib/surgical-sales/intelligenceSaveConfirmation";
import type { IntelligenceSaveConfirmationGroup } from "@/lib/surgical-sales/intelligenceSaveConfirmation";
import { buildIntelligencePostSaveActions } from "@/lib/surgical-sales/intelligencePostSaveActions";
import {
  applyReviewSelectionDefaults,
  buildLogUpdateReviewSaveSummary,
  hasStructuredIntelligenceReview,
} from "@/lib/surgical-sales/logUpdateReviewPresentation";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import { buildInitialProposedContacts } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { persistProviderCandidateContacts } from "@/lib/surgical-sales/candidateContactIntelligence";
import {
  persistDebriefDetectedContacts,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import {
  captureIntelligenceLaunchConfig,
  inferCaptureIntelligenceLaunchSurface,
} from "@/lib/surgical-sales/captureIntelligenceLaunch";
import {
  buildMissionBoardCaptureSaveToast,
  buildQuickCaptureSaveToast,
  isMissionBoardQuickCaptureSurface,
} from "@/lib/surgical-sales/missionBoardCaptureSaveToast";
import { userFacingError } from "@/lib/errors/userFacingError";

type Step = "compose" | "processing" | "review" | "mapping_failed" | "done";

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const mimeType = file.type || "image/jpeg";
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { base64: btoa(binary), mimeType };
}

export function AiNoteCaptureWorkflow({
  open,
  context,
  onClose,
  onSaved,
}: {
  open: boolean;
  context: AiNoteCaptureContext;
  onClose: () => void;
  onSaved?: (result?: AiNoteCaptureSavedResult) => void;
}) {
  const [step, setStep] = React.useState<Step>("compose");
  const [inputMode, setInputMode] = React.useState<AiNoteCaptureInputMode>("dictate");
  const [hipaaAck, setHipaaAck] = React.useState(false);
  const [rawText, setRawText] = React.useState("");
  const [reviewParse, setReviewParse] = React.useState<LogUpdateParseResult | null>(null);
  const logUpdateExistingFieldsRef = React.useRef<Record<string, string>>({});
  const [phiDetected, setPhiDetected] = React.useState(false);
  const [phiWarning, setPhiWarning] = React.useState<string | null>(null);
  const [riskyFragments, setRiskyFragments] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [phiModalOpen, setPhiModalOpen] = React.useState(false);
  const [phiBypass, setPhiBypass] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [saveConfirmationGroups, setSaveConfirmationGroups] = React.useState<
    IntelligenceSaveConfirmationGroup[]
  >([]);
  const [postSaveAiSummary, setPostSaveAiSummary] = React.useState<string | null>(null);
  const [mappingError, setMappingError] = React.useState<string | null>(null);
  const [discoveryContext, setDiscoveryContext] =
    React.useState<DebriefIntelligenceExtractionContext | null>(null);
  const [providerContactSnapshot, setProviderContactSnapshot] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [engagementOutcomeId, setEngagementOutcomeId] = React.useState<string | null>(null);
  const [proposedContacts, setProposedContacts] = React.useState<DebriefProposedContactItem[]>([]);
  const photoRef = React.useRef<HTMLInputElement>(null);
  const uploadRef = React.useRef<HTMLInputElement>(null);
  const pendingImageRef = React.useRef<{ base64: string; mimeType: string } | null>(null);
  const [dictationCapturedAt, setDictationCapturedAt] = React.useState<number | null>(null);

  const {
    dictationMode,
    dictationUiState,
    transcribing,
    dictationError,
    clearDictationError,
    startDictation,
    pauseDictation,
    resumeDictation,
    stopDictation,
    stopDictationAsync,
    clearTranscript,
    teardownDictation,
  } = useSpeechDictation(
    setRawText,
    salesDictationOptions({
      onDictationCaptured: () => {
        setDictationCapturedAt(Date.now());
        window.setTimeout(() => setDictationCapturedAt(null), 2600);
      },
    }),
  );

  const phiKinds = React.useMemo(() => detectSurgicalPhiPatternKinds(rawText), [rawText]);

  const voiceCaptureAvailable = React.useMemo(() => isVoiceCaptureAvailable(), []);

  const captureScope = React.useMemo(() => {
    if (!context.engagementId && !context.scopeLocked) return null;
    return buildIntelligenceCaptureScopeFromEngagement({
      engagementId: context.engagementId ?? "",
      providerId: context.providerId ?? null,
      organizationId: context.organizationId ?? null,
      providerLabel: context.providerLabel ?? null,
      organizationLabel: context.organizationLabel ?? null,
      engagementTypeLabel: context.engagementTypeLabel ?? null,
      productLine: context.productFocus ?? null,
    });
  }, [context]);

  const propagationTargets = React.useMemo(() => {
    if (!captureScope || !reviewParse) return [];
    return buildIntelligencePropagationTargets({
      scope: captureScope,
      logUpdate: reviewParse,
      engagementNotesSaved: false,
    });
  }, [captureScope, reviewParse]);

  const launchSurface = inferCaptureIntelligenceLaunchSurface(context);
  const launchConfig = captureIntelligenceLaunchConfig(launchSurface);

  const panelTitle = React.useMemo(() => {
    if (step === "review") return LOG_UPDATE_REVIEW_TITLE;
    if (step === "done") return LOG_UPDATE_DONE_TITLE;
    return context.composeTitle ?? launchConfig.composeTitle ?? LOG_UPDATE_COMPOSE_TITLE;
  }, [context.composeTitle, launchConfig.composeTitle, step]);

  React.useEffect(() => {
    if (!open) return;
    setStep("compose");
    setInputMode("dictate");
    setHipaaAck(false);
    setRawText("");
    setReviewParse(null);
    setSaveConfirmationGroups([]);
    setPostSaveAiSummary(null);
    setToastMessage(null);
    setMappingError(null);
    setPhiDetected(false);
    setPhiWarning(null);
    setRiskyFragments([]);
    setBusy(false);
    setError(null);
    setPhiModalOpen(false);
    setPhiBypass(false);
    setDictationCapturedAt(null);
    teardownDictation();
    pendingImageRef.current = null;
  }, [open, teardownDictation]);

  React.useEffect(() => () => teardownDictation(), [teardownDictation]);

  if (!open) return null;

  async function applyParseToReview(text: string) {
    const trimmed = text.trim();
    setRawText(trimmed);
    const kinds = detectSurgicalPhiPatternKinds(trimmed);
    setPhiDetected(kinds.length > 0);
    setPhiWarning(kinds.length > 0 ? AI_NOTE_CAPTURE_HIPAA_WARNING : null);
    setRiskyFragments(kinds.length ? [trimmed.slice(0, 120)] : []);

    const res = await fetch("/api/portal/sales/log-update/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawNote: trimmed,
        providerId: context.providerId ?? null,
        organizationId: context.organizationId ?? null,
        engagementId: context.engagementId ?? null,
        productFocus: context.productFocus ?? null,
        context,
      }),
    });

    const j = await readResponseJson<{
      ok?: boolean;
      mapping_failed?: boolean;
      mapping_warning?: string;
      parse?: LogUpdateParseResult;
      discovery_context?: DebriefIntelligenceExtractionContext | null;
      provider_contact_snapshot?: Record<string, unknown> | null;
      engagement_outcome_id?: string | null;
      universal_fact_capture_id?: string | null;
      error?: string;
    }>(res);

    if (j.mapping_failed || !res.ok || !j.ok || !j.parse) {
      pendingImageRef.current = null;
      setMappingError(typeof j.error === "string" ? j.error : "AI mapping failed");
      setStep("mapping_failed");
      return;
    }

    if (j.mapping_warning) {
      setMappingError(j.mapping_warning);
    } else {
      setMappingError(null);
    }

    if (context.providerId) {
      logUpdateExistingFieldsRef.current = {};
      const fieldsRes = await fetch(
        `/api/portal/sales/providers/${encodeURIComponent(context.providerId)}/log-update`,
      );
      const fj = await readResponseJson<{ ok?: boolean; fields?: Record<string, string> }>(fieldsRes);
      if (fieldsRes.ok && fj.ok && fj.fields) {
        logUpdateExistingFieldsRef.current = fj.fields;
      }
    }

    let parsed = applyReviewSelectionDefaults(j.parse);
    const captureId = String(j.universal_fact_capture_id ?? "").trim();
    if (!parsed.debriefUniversalFactsRuns?.length && captureId) {
      try {
        const hydrateRes = await fetch(
          `/api/portal/sales/universal-facts/${encodeURIComponent(captureId)}`,
        );
        const hydratePayload = await readResponseJson<{
          ok?: boolean;
          run?: NonNullable<LogUpdateParseResult["debriefUniversalFactsRuns"]>[number];
        }>(hydrateRes);
        if (hydrateRes.ok && hydratePayload.ok && hydratePayload.run) {
          parsed = { ...parsed, debriefUniversalFactsRuns: [hydratePayload.run] };
        }
      } catch {
        // Fall back to parse without inline UF runs.
      }
    }
    setReviewParse(parsed);
    setDiscoveryContext(j.discovery_context ?? null);
    setProviderContactSnapshot(j.provider_contact_snapshot ?? null);
    setEngagementOutcomeId(j.engagement_outcome_id ?? null);
    const sourceRef = context.engagementId
      ? `engagement:${context.engagementId}`
      : context.providerId
        ? `provider:${context.providerId}`
        : "log_update";
    setProposedContacts(
      buildInitialProposedContacts({
        review: parsed,
        discoveryContext: j.discovery_context ?? null,
        sourceReference: sourceRef,
        providerContact: j.provider_contact_snapshot ?? null,
      }),
    );
    pendingImageRef.current = null;
    setStep("review");
  }

  async function saveNoteOnly() {
    if (!rawText.trim()) return;
    setReviewParse({
      sourceText: rawText.trim(),
      suggestedUpdates: [],
      fieldUpdates: [],
      intelligenceReview: {
        confirmedUpdates: [],
        partiallyConfirmed: [],
        stillWorthConfirming: [],
        relatedOperationalAreas: [],
      },
      stillMissing: [],
      saveAsNoteAccepted: true,
      usesProviderIntelligence: false,
      aiMapping: null,
      mappingSource: undefined,
    });
    setStep("review");
  }

  async function runExtract(opts?: { text?: string; image?: { base64: string; mimeType: string } }) {
    setStep("processing");
    setError(null);
    try {
      const text = opts?.text ?? rawText.trim();
      const image = opts?.image ?? pendingImageRef.current ?? undefined;

      if (!text && !image) {
        throw new Error(LOG_UPDATE_ERR_EMPTY_NOTE);
      }

      if (!image && text) {
        await new Promise((r) => setTimeout(r, inputMode === "dictate" ? 280 : 420));
        await applyParseToReview(text);
        return;
      }

      const res = await fetch("/api/portal/sales/ai-note-capture/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text || undefined,
          imageBase64: image?.base64,
          imageMimeType: image?.mimeType,
          inputMode,
          context,
        }),
      });

      const j = await readResponseJson<{
        ok?: boolean;
        rawExtractedText?: string;
        phiDetected?: boolean;
        phiWarning?: string | null;
        riskyFragments?: string[];
        error?: string;
      }>(res);

      if (!res.ok || !j.ok) throw new Error(typeof j.error === "string" ? j.error : "Extraction failed");

      await applyParseToReview(j.rawExtractedText || text);
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not analyze notes"));
      setStep("compose");
    }
  }

  async function handleImageFile(file: File | null) {
    if (!file) return;
    if (!hipaaAck) {
      setError(LOG_UPDATE_ERR_HIPAA_ACK);
      return;
    }
    if (phiKinds.length && !phiBypass) {
      setPhiModalOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const image = await fileToBase64(file);
      pendingImageRef.current = image;
      await runExtract({ image });
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not process image"));
      setStep("compose");
    } finally {
      setBusy(false);
    }
  }

  async function resolveComposeText(): Promise<string | null> {
    if (!hipaaAck) {
      setError(LOG_UPDATE_ERR_HIPAA_ACK);
      return null;
    }
    let text = rawText.trim();
    if (dictationUiState === "listening" || dictationUiState === "paused" || transcribing) {
      const merged = await stopDictationAsync();
      if (merged) text = merged.trim();
      else text = rawText.trim();
    }
    if (!text) {
      setError(LOG_UPDATE_ERR_EMPTY_NOTE);
      return null;
    }
    return text;
  }

  async function proceedToQuickCapture() {
    const text = await resolveComposeText();
    if (!text) return;
    const usedVoice =
      dictationUiState === "listening" ||
      dictationUiState === "paused" ||
      transcribing ||
      dictationMode !== null;
    setInputMode(usedVoice ? "dictate" : "type");
    if ((phiKinds.length || phiDetected) && !phiBypass) {
      setPhiModalOpen(true);
      return;
    }
    if (!context.providerId) {
      setError(LOG_UPDATE_ERR_NO_TARGET);
      return;
    }

    setStep("processing");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/sales/log-update/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNote: text,
          providerId: context.providerId,
          organizationId: context.organizationId ?? null,
          engagementId: context.engagementId ?? null,
          productFocus: context.productFocus ?? null,
          launchSurface,
          context,
        }),
      });
      const j = await readResponseJson<{
        ok?: boolean;
        error?: string;
        suggestion_count?: number;
        mapping_warning?: string | null;
      }>(res);
      if (!res.ok || !j.ok) {
        throw new Error(typeof j.error === "string" ? j.error : "Quick capture failed");
      }
      const toast = buildQuickCaptureSaveToast(Number(j.suggestion_count ?? 0));
      if (j.mapping_warning) {
        toast.detail = [toast.detail, j.mapping_warning].filter(Boolean).join(" · ");
      }
      onSaved?.({ ...toast, sourceText: text });
      onClose();
    } catch (e: unknown) {
      setError(userFacingError(e, "We could not save that capture. Please try again."));
      setStep("compose");
    } finally {
      setBusy(false);
    }
  }

  async function proceedToReview() {
    const text = await resolveComposeText();
    if (!text) return;
    const usedVoice =
      dictationUiState === "listening" ||
      dictationUiState === "paused" ||
      transcribing ||
      dictationMode !== null;
    setInputMode(usedVoice ? "dictate" : "type");
    if ((phiKinds.length || phiDetected) && !phiBypass) {
      setPhiModalOpen(true);
      return;
    }
    void runExtract({ text });
  }

  async function commitAccepted() {
    if (!reviewParse) {
      setError(LOG_UPDATE_ERR_NOTHING_TO_SAVE);
      return;
    }

    if (phiDetected && !phiBypass) {
      setError(LOG_UPDATE_ERR_PHI_BEFORE_SAVE);
      return;
    }

    if (reviewParse.usesProviderIntelligence && logUpdateHasUnresolvedConflicts(reviewParse.fieldUpdates)) {
      setError(LOG_UPDATE_ERR_UNRESOLVED_CONFLICT);
      return;
    }

    const reviewToSave = { ...reviewParse, saveAsNoteAccepted: true };

    setBusy(true);
    setError(null);
    try {
      if (reviewToSave.usesProviderIntelligence && context.providerId) {
        const built = buildLogUpdateProviderCommitPayload(reviewToSave, {
          hasAcceptedContacts: hasAcceptedProposedContacts(proposedContacts),
        });
        if ("error" in built) throw new Error(built.error);

        // source_type stays "ai_capture" (today's default) — the engagement
        // outcome gate only applies to explicit engagement-typed saves.
        const engagementIdForContext =
          context.engagementId && UUID_LIKE_RE.test(context.engagementId)
            ? context.engagementId
            : undefined;
        const commitCaptureContext = {
          source_type: "ai_capture" as const,
          source_label: launchConfig.title || "Log update",
          source_engagement_id: engagementIdForContext,
          declared_source_type: context.declaredSourceType ?? ("field_note" as const),
        };
        const engagementDebriefSync = reviewToSave.usesProviderIntelligence
          ? buildProviderFieldNoteFollowUpSyncPayload({
              review: reviewToSave,
              engagementId: engagementIdForContext,
              proposedContacts,
            })
          : null;

        const res = await fetch(
          `/api/portal/sales/providers/${encodeURIComponent(context.providerId)}/log-update`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...built,
              captureContext: commitCaptureContext,
              ...(engagementDebriefSync
                ? {
                    engagementDebriefSync: {
                      ...engagementDebriefSync,
                      proposed_contacts: proposedContacts,
                    },
                  }
                : {}),
            }),
          },
        );
        const j = await readResponseJson<{ ok?: boolean; error?: unknown; saved?: number }>(res);
        if (!res.ok || !j.ok) {
          throw new Error(formatLogUpdateApiError(j.error));
        }

        if (proposedContacts.length > 0) {
          const contactResult = await persistDebriefDetectedContacts({
            providerId: context.providerId,
            organizationId: context.organizationId ?? null,
            contacts: proposedContacts,
            sourceLabel: "Log update",
          });
          const contactsForCandidates = proposedContacts.map((contact) => {
            const saved = contactResult.saved.find(
              (row) => row.displayName.toLowerCase() === contact.displayName.toLowerCase(),
            );
            return saved ? { ...contact, linkedContactId: saved.contactId } : contact;
          });
          await persistProviderCandidateContacts({
            providerId: context.providerId,
            contacts: contactsForCandidates,
            sourceEngagementId: context.engagementId ?? null,
          }).catch(() => undefined);
          if (contactResult.followUpTasks.length > 0) {
            setPostSaveAiSummary((prev) =>
              [prev, ...contactResult.followUpTasks].filter(Boolean).join(" "),
            );
          }
        }
      } else {
        const commitItems = buildLegacyCommitItemsFromLogUpdateReview(reviewToSave, context);
        if (commitItems.length === 0) {
          throw new Error(LOG_UPDATE_ERR_NO_TARGET);
        }
        const res = await fetch("/api/portal/sales/ai-note-capture/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context,
            inputMode,
            sourceExcerpt: reviewToSave.sourceText.slice(0, 500),
            items: commitItems,
          }),
        });
        const j = await readResponseJson<{ ok?: boolean; error?: unknown; saved?: number }>(res);
        if (!res.ok || !j.ok) {
          throw new Error(formatLogUpdateApiError(j.error));
        }
      }

      const groups = buildLogUpdateIntelligenceSaveConfirmation(reviewToSave, {
        saveTouchNoteToEngagement: Boolean(context.engagementId),
        providerNoteLine: reviewToSave.saveAsNoteAccepted && !context.engagementId
          ? "Field note saved to provider access"
          : null,
      });
      setSaveConfirmationGroups(groups);

      const acceptedByTarget = buildAcceptedByTargetForPostSave(reviewToSave);
      if (acceptedByTarget.length > 0) {
        void fetch("/api/portal/sales/intelligence/post-save/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceScope: context.engagementId
              ? `engagement:${context.engagementId}`
              : context.providerId
                ? `provider:${context.providerId}`
                : "field_note",
            rawNote: reviewToSave.sourceText,
            acceptedByTarget,
          }),
        })
          .then((r) => r.json())
          .then((j: { ok?: boolean; summary?: { summary?: string } }) => {
            if (j.ok && j.summary?.summary) setPostSaveAiSummary(j.summary.summary);
          })
          .catch(() => undefined);
      }

      const launchSurface = inferCaptureIntelligenceLaunchSurface(context);
      const missionBoardQuickCapture = isMissionBoardQuickCaptureSurface(launchSurface);

      if (missionBoardQuickCapture) {
        const toast = buildMissionBoardCaptureSaveToast(reviewToSave, proposedContacts);
        onClose();
        onSaved?.({ ...toast, sourceText: reviewToSave.sourceText });
        return;
      }

      onClose();
      onSaved?.();
    } catch (e: unknown) {
      setError(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function toggleReviewUpdate(id: string, accepted: boolean) {
    setReviewParse((prev) => {
      if (!prev) return prev;
      if (prev.usesProviderIntelligence) {
        const next = {
          ...prev,
          fieldUpdates: prev.fieldUpdates.map((u) => (u.id === id ? { ...u, accepted } : u)),
          suggestedUpdates: prev.suggestedUpdates.map((u) => (u.id === id ? { ...u, accepted } : u)),
        };
        return refreshLogUpdateIntelligenceReview(next, logUpdateExistingFieldsRef.current);
      }
      return {
        ...prev,
        suggestedUpdates: prev.suggestedUpdates.map((u) => (u.id === id ? { ...u, accepted } : u)),
      };
    });
  }

  function resolveConflict(id: string, resolution: LogUpdateConflictResolution) {
    setReviewParse((prev) => {
      if (!prev?.usesProviderIntelligence) return prev;
      return {
        ...prev,
        fieldUpdates: prev.fieldUpdates.map((u) => {
          if (u.id !== id || !u.conflict) return u;
          return { ...u, accepted: true, conflict: { ...u.conflict, resolution } };
        }),
      };
    });
  }

  function replaceLogUpdateReview(
    nextOrUpdater:
      | LogUpdateParseResult
      | ((prev: LogUpdateParseResult) => LogUpdateParseResult),
  ) {
    setReviewParse((prev) => {
      if (!prev) return prev;
      const next =
        typeof nextOrUpdater === "function" ? nextOrUpdater(prev) : nextOrUpdater;
      return refreshLogUpdateIntelligenceReview(next, logUpdateExistingFieldsRef.current);
    });
  }

  const structuredIntelligenceReview = Boolean(
    reviewParse?.usesProviderIntelligence && hasStructuredIntelligenceReview(reviewParse),
  );

  const reviewSaveSummary =
    reviewParse && !structuredIntelligenceReview
      ? buildLogUpdateReviewSaveSummary(reviewParse, { rawDebriefLabel: "raw debrief" })
      : "";

  const canSaveReview = Boolean(
    reviewParse &&
      (structuredIntelligenceReview
        ? reviewCanSaveStructuredIntelligence({ review: reviewParse }) ||
          reviewHasSavableSelection({ review: reviewParse, proposedContacts })
        : reviewHasSavableSelection({ review: reviewParse, proposedContacts })),
  );

  const allowBackdropDismiss =
    step === "compose" || step === "mapping_failed" || step === "done";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: aiNoteCaptureCss + intelligenceCaptureCss }} />
      <div
        className="ai-note-capture-sheet"
        role="presentation"
        onClick={(e) => e.target === e.currentTarget && !busy && allowBackdropDismiss && onClose()}
      >
        <div
          className={`ai-note-capture-panel${step === "compose" ? " ai-note-capture-panel--compose" : ""}`}
          role="dialog"
          aria-modal
          aria-labelledby="ai-note-capture-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="ai-note-capture-panel-header">
            <div className="ai-note-capture-panel-heading">
              <h2 id="ai-note-capture-title" className="ai-note-capture-panel-title">
                {panelTitle}
              </h2>
              {step === "compose" ? (
                <p className="ai-note-capture-panel-subtitle">
                  {context.composeSubtitle ??
                    launchConfig.composeSubtitle ??
                    "Dictate or type. Review updates before saving."}
                </p>
              ) : null}
              {step === "review" ? (
                <p className="ai-note-capture-panel-subtitle">{LOG_UPDATE_REVIEW_SUBTITLE}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="ai-note-capture-panel-close"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
            >
              Close
            </button>
          </header>

          <div className="ai-note-capture-panel-body">
            {step === "compose" ? (
              <>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => void handleImageFile(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={uploadRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => void handleImageFile(e.target.files?.[0] ?? null)}
                />
                <LogUpdateCaptureCompose
                  scope={captureScope}
                  rawText={rawText}
                  onTextChange={setRawText}
                  phiKinds={phiKinds}
                  busy={busy}
                  dictationUiState={dictationUiState}
                  dictationMode={dictationMode}
                  voiceCaptureAvailable={voiceCaptureAvailable}
                  dictationCaptured={dictationCapturedAt != null}
                  dictationError={dictationError}
                  placeholder={launchConfig.composePlaceholder}
                  hidePhotoCapture={launchConfig.hidePhotoCapture}
                  onStartDictation={() => {
                    clearDictationError();
                    setError(null);
                    startDictation(rawText);
                  }}
                  onStopDictation={() => {
                    clearDictationError();
                    stopDictation();
                  }}
                  onPauseDictation={() => {
                    clearDictationError();
                    pauseDictation(rawText);
                  }}
                  onResumeDictation={() => {
                    clearDictationError();
                    setError(null);
                    resumeDictation(rawText);
                  }}
                  onClearTranscript={() => {
                    clearDictationError();
                    clearTranscript();
                  }}
                  onPhotoPick={() => {
                    setInputMode("photo");
                    photoRef.current?.click();
                  }}
                  onUploadPick={() => {
                    setInputMode("upload");
                    uploadRef.current?.click();
                  }}
                />
              </>
            ) : null}

            {step === "processing" ? (
              <FieldIntelligenceProcessingPanel
                active
                embedded
                providerLabel={context.providerLabel}
                organizationLabel={context.organizationLabel}
                engagementTypeLabel={context.engagementTypeLabel}
              />
            ) : null}

            {step === "mapping_failed" ? (
              <div className="log-update-mapping-failed" role="alert">
                <p>{LOG_UPDATE_MAPPING_UNAVAILABLE}</p>
                {mappingError ? (
                  <p className="log-update-mapping-failed-detail">{mappingError}</p>
                ) : null}
                <div className="log-update-mapping-failed-actions">
                  <button
                    type="button"
                    style={sc.btnSecondary}
                    onClick={() => void saveNoteOnly()}
                    disabled={busy}
                  >
                    {LOG_UPDATE_FALLBACK_SAVE_NOTE}
                  </button>
                  <button
                    type="button"
                    style={sc.btnSecondary}
                    onClick={() => {
                      setStep("compose");
                      void runExtract({ text: rawText.trim() });
                    }}
                    disabled={busy}
                  >
                    {LOG_UPDATE_FALLBACK_TRY_AGAIN}
                  </button>
                  <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {step === "review" && reviewParse ? (
              <>
                {phiDetected ? (
                  <div className="log-update-review-phi" role="alert">
                    <strong>{LOG_UPDATE_REVIEW_PHI_HEADING}</strong>{" "}
                    {phiWarning || LOG_UPDATE_REVIEW_PHI_BODY}
                    {riskyFragments.length > 0 ? (
                      <ul>
                        {riskyFragments.slice(0, 3).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <LogUpdateSuggestedReview
                  review={reviewParse}
                  propagationTargets={propagationTargets}
                  discoveryContext={discoveryContext}
                  providerContact={providerContactSnapshot}
                  proposedContacts={proposedContacts}
                  organizationId={context.organizationId ?? null}
                  engagementOutcomeId={engagementOutcomeId}
                  sourceReference={
                    context.engagementId
                      ? `engagement:${context.engagementId}`
                      : context.providerId
                        ? `provider:${context.providerId}`
                        : "log_update"
                  }
                  onContactsChange={setProposedContacts}
                  engagementId={context.engagementId}
                  providerId={context.providerId}
                  scopeDisplayContext={logUpdateReviewScopeContext({
                    engagementId: context.engagementId,
                    providerId: context.providerId,
                    providerLabel: context.providerLabel,
                    organizationId: context.organizationId,
                    organizationLabel: context.organizationLabel,
                  })}
                  onReviewChange={replaceLogUpdateReview}
                  onToggleUpdate={toggleReviewUpdate}
                  onResolveConflict={resolveConflict}
                />
                <PhiPatternInlineHint kinds={detectSurgicalPhiPatternKinds(reviewParse.sourceText)} />
              </>
            ) : null}

            {step === "done" ? (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--brand-700)" }}>
                  {LOG_UPDATE_TOAST_SAVED}
                </p>
                <IntelligenceSaveConfirmation groups={saveConfirmationGroups} title={null} />
                {postSaveAiSummary ? (
                  <p className="log-update-review-summary" style={{ marginTop: 12 }}>
                    {postSaveAiSummary}
                  </p>
                ) : null}
              </>
            ) : null}

            {error ? (
              <p style={{ ...sc.alertError, marginTop: 10, fontSize: 12 }}>{error}</p>
            ) : null}
          </div>

          <footer className="ai-note-capture-footer">
            {step === "compose" ? (
              <div className="log-update-capture-footer">
                <button type="button" className="log-update-capture-footer-cancel" onClick={onClose} disabled={busy}>
                  Cancel
                </button>
                <div className="log-update-capture-footer-primary">
                  <label className="log-update-capture-footer-phi-ack">
                    <input
                      type="checkbox"
                      checked={hipaaAck}
                      onChange={(e) => setHipaaAck(e.target.checked)}
                    />
                    <span>{LOG_UPDATE_PHI_ACK}</span>
                  </label>
                  <div className="log-update-capture-footer-actions">
                    <button
                      type="button"
                      className="log-update-capture-footer-quick"
                      onClick={() => void proceedToQuickCapture()}
                      disabled={busy || transcribing || !context.providerId}
                    >
                      {launchConfig.composeQuickCaptureCta ?? LOG_UPDATE_QUICK_CAPTURE_ACTION}
                    </button>
                    <button
                      type="button"
                      className="log-update-capture-footer-submit"
                      onClick={() => void proceedToReview()}
                      disabled={busy || transcribing}
                    >
                      {launchConfig.composeReviewCta ?? LOG_UPDATE_REVIEW_ACTION}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {step === "review" ? (
              <div
                className={`ai-note-capture-footer-review${
                  structuredIntelligenceReview ? " ai-note-capture-footer-review--streamlined" : ""
                }`}
              >
                <p className="log-update-review-footer-hint">{LOG_UPDATE_REVIEW_SELECTION_HINT}</p>
                {reviewSaveSummary ? (
                  <p className="log-update-review-footer-summary" aria-live="polite">
                    {reviewSaveSummary}
                  </p>
                ) : null}
                <button
                  type="button"
                  style={sc.btnPrimary}
                  className="ai-note-capture-footer-save"
                  onClick={() => void commitAccepted()}
                  disabled={busy || !canSaveReview}
                >
                  {context.reviewSaveCta ??
                  (structuredIntelligenceReview
                    ? AI_DEBRIEF_REVIEW_SAVE_UPDATES
                    : LOG_UPDATE_SAVE_RECOMMENDED_ACTION)}
                </button>
                <div className="ai-note-capture-footer-review-secondary">
                  <button
                    type="button"
                    style={sc.btnSecondary}
                    onClick={() => setStep("compose")}
                    disabled={busy}
                  >
                    {LOG_UPDATE_EDIT_DEBRIEF_ACTION}
                  </button>
                  <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {step === "done" ? (
              <div className="ai-note-capture-footer-done">
                <IntelligencePostSaveFooter
                  providerId={context.providerId}
                  actions={buildIntelligencePostSaveActions({
                    providerId: context.providerId,
                    caseId: context.caseId,
                    accountId: context.organizationId,
                  })}
                  onReturnToProvider={onClose}
                  onActionClick={onClose}
                  primaryClassName="ai-note-capture-footer-save"
                  actionClassName="intel-post-save-action"
                />
                <button type="button" style={sc.btnSecondary} onClick={onClose}>
                  Close
                </button>
              </div>
            ) : null}
          </footer>
        </div>
      </div>

      {toastMessage ? (
        <div className="log-update-toast-stack" role="status" aria-live="polite">
          <div className="log-update-toast">{toastMessage}</div>
        </div>
      ) : null}

      <PhiPatternAdvisoryModal
        open={phiModalOpen}
        kinds={phiKinds}
        onCancel={() => setPhiModalOpen(false)}
        onContinue={() => {
          setPhiBypass(true);
          setPhiModalOpen(false);
          if (pendingImageRef.current) {
            void runExtract({ image: pendingImageRef.current });
          } else {
            void proceedToReview();
          }
        }}
      />
    </>
  );
}
