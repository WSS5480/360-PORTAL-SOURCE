"use client";

import React from "react";
import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import { INTELLIGENCE_CAPTURE_FIRST_UI } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureMethods";
import {
  classifyCaptureTextToFindings,
  type CaptureFindingProposal,
} from "@/lib/surgical-sales/intelligenceCapture/classifyCaptureTextToFindings";
import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import type { IntelligenceCaptureCategoryCard } from "@/lib/surgical-sales/buildIntelligenceCaptureCategoryDashboard";
import {
  LOG_UPDATE_DICTATION_CAPTURED,
  LOG_UPDATE_VOICE_IDLE,
  LOG_UPDATE_VOICE_LISTENING,
  LOG_UPDATE_VOICE_PAUSE,
  LOG_UPDATE_VOICE_PAUSED,
  LOG_UPDATE_VOICE_RESUME,
  LOG_UPDATE_VOICE_START,
  LOG_UPDATE_VOICE_STOP,
  LOG_UPDATE_VOICE_TRANSCRIBING,
  LOG_UPDATE_VOICE_UNAVAILABLE,
} from "@/lib/surgical-sales/logUpdateUx";

type ObservationApprovalChoice = "permission_confirmed" | "interested";

type ProposalRowState = CaptureFindingProposal & {
  rowId: string;
  discarded: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  /**
   * Observation approval is workflow state, not text — rep confirms the status
   * and the row commits through the structured observation-approval route.
   */
  approvalChoice: ObservationApprovalChoice | null;
};

const UI = INTELLIGENCE_CAPTURE_FIRST_UI;

const APPROVAL_CHOICE_LABELS: Record<ObservationApprovalChoice, string> = {
  permission_confirmed: "Approved — permission confirmed",
  interested: "Interested — approval not confirmed yet",
};

function proposalRows(proposals: CaptureFindingProposal[]): ProposalRowState[] {
  return proposals.map((proposal, index) => ({
    ...proposal,
    rowId: `${index}-${proposal.finding.slice(0, 32)}`,
    discarded: false,
    saveState: "idle",
    saveError: null,
    approvalChoice: proposal.observationAccess
      ? proposal.observationAccess.approvalExplicit
        ? "permission_confirmed"
        : "interested"
      : null,
  }));
}

export function IntelligenceCaptureFirstPanel({
  providerId,
  categoryCards,
  onFindingSaved,
}: {
  providerId: string;
  categoryCards: IntelligenceCaptureCategoryCard[];
  onFindingSaved: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<ProposalRowState[] | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<string | null>(null);
  const [dictationCaptured, setDictationCaptured] = React.useState(false);

  const voiceAvailable = isVoiceCaptureAvailable();
  const dictation = useSpeechDictation(setText, salesDictationOptions({ onDictationCaptured: () => setDictationCaptured(true) }));

  const unlockedCategoryIds = React.useMemo(
    () => categoryCards.map((card) => card.id),
    [categoryCards],
  );
  const categoryNameById = React.useMemo(
    () => new Map(categoryCards.map((card) => [card.id, card.name])),
    [categoryCards],
  );

  const reviewing = rows !== null;

  const handleReview = React.useCallback(() => {
    const proposals = classifyCaptureTextToFindings({
      text,
      unlockedCategoryIds,
    });
    if (!proposals.length) {
      setError(UI.emptyError);
      return;
    }
    setError(null);
    setConfirmation(null);
    setRows(proposalRows(proposals));
  }, [text, unlockedCategoryIds]);

  const handleBackToCompose = React.useCallback(() => {
    setRows(null);
    setError(null);
  }, []);

  const setRow = React.useCallback(
    (rowId: string, patch: Partial<ProposalRowState>) => {
      setRows((prev) =>
        prev ? prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)) : prev,
      );
    },
    [],
  );

  const savableRows = React.useMemo(
    () =>
      (rows ?? []).filter(
        (row) => !row.discarded && row.categoryId !== null && row.saveState !== "saved",
      ),
    [rows],
  );

  const handleSave = React.useCallback(async () => {
    if (saving || !rows) return;
    const targets = rows.filter(
      (row) => !row.discarded && row.categoryId !== null && row.saveState !== "saved",
    );
    if (!targets.length) {
      setError(UI.nothingToSave);
      return;
    }

    setSaving(true);
    setError(null);
    setConfirmation(null);

    let lastProvider: Record<string, unknown> | null = null;
    let savedCount = 0;
    const savedAreas = new Set<string>();
    let failures = 0;

    for (const row of targets) {
      setRow(row.rowId, { saveState: "saving", saveError: null });
      try {
        // Approval-signal findings commit through the structured route so the
        // workflow gate (pathway advance, scheduler, category unlocks) flips —
        // text capture alone never satisfies hasProviderObservationApprovalOnFile.
        const isStructuredApproval =
          row.categoryId === "observation_access" && row.approvalChoice !== null;
        const res = await fetch(
          isStructuredApproval
            ? `/api/portal/sales/providers/${encodeURIComponent(providerId)}/observation-approval`
            : `/api/portal/sales/providers/${encodeURIComponent(providerId)}/intelligence-capture/finding`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              isStructuredApproval
                ? { status: row.approvalChoice, approval_note: row.finding }
                : { categoryId: row.categoryId, finding: row.finding },
            ),
          },
        );
        const j = (await res.json()) as {
          ok?: boolean;
          error?: string;
          provider?: Record<string, unknown>;
        };
        if (!res.ok || !j.ok) {
          throw new Error(j.error ?? UI.saveFailed);
        }
        if (j.provider) lastProvider = j.provider;
        savedCount += 1;
        savedAreas.add(String(row.categoryId));
        setRow(row.rowId, { saveState: "saved" });
      } catch (err) {
        failures += 1;
        setRow(row.rowId, {
          saveState: "error",
          saveError: err instanceof Error ? err.message : UI.saveFailed,
        });
      }
    }

    if (lastProvider) {
      await onFindingSaved(lastProvider);
    }

    if (failures === 0) {
      setConfirmation(UI.savedSummary(savedCount, savedAreas.size));
      setRows(null);
      setText("");
      setDictationCaptured(false);
    } else if (savedCount > 0) {
      setConfirmation(UI.savedSummary(savedCount, savedAreas.size));
      setError(UI.saveFailed);
    } else {
      setError(UI.saveFailed);
    }
    setSaving(false);
  }, [onFindingSaved, providerId, rows, saving, setRow]);

  const micLabel = dictation.transcribing
    ? LOG_UPDATE_VOICE_TRANSCRIBING
    : dictation.dictating
      ? LOG_UPDATE_VOICE_STOP
      : dictation.dictationPaused
        ? LOG_UPDATE_VOICE_RESUME
        : LOG_UPDATE_VOICE_START;

  const voiceStatus = dictation.transcribing
    ? LOG_UPDATE_VOICE_TRANSCRIBING
    : dictation.dictating
      ? LOG_UPDATE_VOICE_LISTENING
      : dictation.dictationPaused
        ? LOG_UPDATE_VOICE_PAUSED
        : LOG_UPDATE_VOICE_IDLE;

  const placedRows = (rows ?? []).filter((row) => row.categoryId !== null);
  const unplacedRows = (rows ?? []).filter((row) => row.categoryId === null);

  const renderProposalCard = (row: ProposalRowState) => {
    const showApprovalConfirm =
      row.categoryId === "observation_access" &&
      row.approvalChoice !== null &&
      !row.discarded &&
      row.saveState !== "saved";

    return (
      <li
        key={row.rowId}
        className={`intel-capture-first-card${row.discarded ? " intel-capture-first-card--discarded" : ""}${
          row.saveState === "saved" ? " intel-capture-first-card--saved" : ""
        }`}
      >
        <p className="intel-capture-first-card-finding">{row.finding}</p>
        {showApprovalConfirm ? (
          <div
            className={`intel-capture-first-card-access${
              row.approvalChoice === "permission_confirmed"
                ? " intel-capture-first-card-access--approved"
                : ""
            }`}
            role="group"
            aria-label="Observation status"
          >
            <span className="intel-capture-first-card-access-note">
              {row.approvalChoice === "permission_confirmed"
                ? UI.approvalDetected
                : UI.interestDetected}
            </span>
            <div className="intel-capture-first-card-access-choices">
              {(Object.keys(APPROVAL_CHOICE_LABELS) as ObservationApprovalChoice[]).map(
                (choice) => (
                  <label key={choice} className="intel-capture-first-card-access-choice">
                    <input
                      type="radio"
                      name={`observation-status-${row.rowId}`}
                      checked={row.approvalChoice === choice}
                      disabled={saving}
                      onChange={() => setRow(row.rowId, { approvalChoice: choice })}
                    />
                    {APPROVAL_CHOICE_LABELS[choice]}
                  </label>
                ),
              )}
            </div>
          </div>
        ) : null}
        {row.reason && !row.observationAccess && !row.discarded ? (
          <p className="intel-capture-first-card-reason">{row.reason}</p>
        ) : null}
        <div className="intel-capture-first-card-controls">
          <label className="intel-capture-first-card-select">
            {UI.categorySelectLabel}
            <select
              value={row.categoryId ?? ""}
              disabled={row.discarded || saving || row.saveState === "saved"}
              onChange={(e) => {
                const nextCategoryId = (e.target.value ||
                  null) as IntelligenceCaptureCategoryId | null;
                setRow(row.rowId, {
                  categoryId: nextCategoryId,
                  observationAccess:
                    nextCategoryId === "observation_access" ? row.observationAccess : null,
                  approvalChoice:
                    nextCategoryId === "observation_access" ? row.approvalChoice : null,
                });
              }}
            >
              <option value="" disabled>
                {UI.categorySelectPlaceholder}
              </option>
              {categoryCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </label>
          {row.saveState === "saved" ? (
            <span className="intel-capture-first-card-status intel-capture-first-card-status--saved">
              Saved
            </span>
          ) : (
            <button
              type="button"
              className="intel-capture-first-card-discard"
              disabled={saving}
              onClick={() => setRow(row.rowId, { discarded: !row.discarded })}
            >
              {row.discarded ? UI.restore : UI.discard}
            </button>
          )}
        </div>
        {row.saveState === "error" && row.saveError ? (
          <p className="intel-capture-first-card-error" role="alert">
            {row.saveError}
          </p>
        ) : null}
      </li>
    );
  };

  return (
    <section className="intel-capture-first" aria-label="Capture intelligence">
      {!reviewing ? (
        <>
          <header className="intel-capture-first-head">
            <h3 className="intel-capture-first-title">{UI.title}</h3>
            <p className="intel-capture-first-subtitle">{UI.subtitle}</p>
          </header>

          <div className="intel-capture-bulk-voice">
            <button
              type="button"
              className={`intel-capture-bulk-mic${
                dictation.dictating ? " intel-capture-bulk-mic--active" : ""
              }`}
              disabled={saving || dictation.transcribing}
              onClick={() => {
                if (dictation.dictating) {
                  dictation.stopDictation();
                  return;
                }
                if (dictation.dictationPaused) {
                  dictation.resumeDictation(text);
                  return;
                }
                dictation.startDictation(text);
              }}
              aria-label={micLabel}
            >
              🎙
            </button>
            <div className="intel-capture-bulk-voice-meta">
              <span className="intel-capture-bulk-voice-status">{voiceStatus}</span>
              {!voiceAvailable ? (
                <span className="intel-capture-bulk-voice-hint">{LOG_UPDATE_VOICE_UNAVAILABLE}</span>
              ) : null}
              {dictationCaptured ? (
                <span className="intel-capture-bulk-voice-captured">
                  {LOG_UPDATE_DICTATION_CAPTURED}
                </span>
              ) : null}
              {dictation.dictationError ? (
                <span className="intel-capture-bulk-voice-error" role="alert">
                  {dictation.dictationError}
                </span>
              ) : null}
            </div>
            {dictation.dictating ? (
              <button
                type="button"
                className="intel-capture-bulk-voice-pause"
                disabled={saving}
                onClick={() => dictation.pauseDictation(text)}
              >
                {LOG_UPDATE_VOICE_PAUSE}
              </button>
            ) : null}
          </div>

          <textarea
            className="intel-capture-first-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={UI.placeholder}
            rows={5}
            disabled={saving}
            aria-label={UI.title}
          />

          <div className="intel-capture-first-actions">
            <button
              type="button"
              className="intel-capture-finding-save"
              disabled={saving || !text.trim()}
              onClick={handleReview}
            >
              {UI.reviewCta}
            </button>
          </div>
        </>
      ) : (
        <>
          <header className="intel-capture-first-head">
            <button
              type="button"
              className="intel-capture-category-back"
              disabled={saving}
              onClick={handleBackToCompose}
            >
              ← {UI.backToCompose}
            </button>
            <h3 className="intel-capture-first-title">{UI.reviewTitle}</h3>
            <p className="intel-capture-first-subtitle">{UI.reviewSubtitle}</p>
          </header>

          {placedRows.length > 0 ? (
            <ul className="intel-capture-first-list">{placedRows.map(renderProposalCard)}</ul>
          ) : null}

          {unplacedRows.length > 0 ? (
            <div className="intel-capture-first-unplaced">
              <h4 className="intel-capture-first-unplaced-title">
                {UI.needsHomeTitle}
                <span className="intel-capture-first-unplaced-badge">{UI.unplacedBadge}</span>
              </h4>
              <p className="intel-capture-first-unplaced-hint">{UI.needsHomeHint}</p>
              <ul className="intel-capture-first-list">{unplacedRows.map(renderProposalCard)}</ul>
            </div>
          ) : null}

          <div className="intel-capture-first-actions">
            <button
              type="button"
              className="intel-capture-finding-save"
              disabled={saving || savableRows.length === 0}
              onClick={() => void handleSave()}
            >
              {saving ? UI.savingCta : UI.saveCta(savableRows.length)}
            </button>
          </div>
        </>
      )}

      {confirmation ? (
        <p className="intel-capture-finding-confirmation" role="status">
          {confirmation}
        </p>
      ) : null}
      {error ? (
        <p className="intel-capture-finding-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
