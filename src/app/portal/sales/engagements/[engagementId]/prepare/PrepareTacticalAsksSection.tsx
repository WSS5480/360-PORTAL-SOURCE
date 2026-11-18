"use client";

import React from "react";
import {
  PRIORITY_QUESTIONS_KICKER,
  PRIORITY_QUESTIONS_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { formatFieldAsksForClipboard } from "@/lib/surgical-sales/engagements/prepareFieldConversationAsk";
import { copyTextToClipboard } from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import {
  PREPARE_TACTICAL_AI_BADGE_ADDED,
  PREPARE_TACTICAL_AI_BADGE_MODIFIED,
} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistUx";
import type { PrepareTacticalAsk } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import {
  TACTICAL_ASK_STATUS_LABELS,
  asksForFieldExecution,
  handledTacticalAsks,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import {
  dismissTacticalAskClient,
  removeTacticalAskClient,
  updateTacticalAskStatus,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsksClient";
import { PrepareTacticalAskOverflowMenu } from "./PrepareTacticalAskOverflowMenu";
import { PrepareTacticalAskQuickSheet } from "./PrepareTacticalAskQuickSheet";
import { userFacingError } from "@/lib/errors/userFacingError";

const COPY_TOAST_MS = 1800;
const ZONE_HIGHLIGHT_MS = 2400;

function statusRowClass(status: PrepareTacticalAsk["status"]): string {
  switch (status) {
    case "answered":
      return "pfm-ask-row--answered";
    case "ask_later":
      return "pfm-ask-row--later";
    case "skipped":
    case "not_relevant":
      return "pfm-ask-row--handled";
    case "follow_up_task":
      return "pfm-ask-row--followup";
    default:
      return "";
  }
}

export function PrepareTacticalAsksSection({
  tacticalAsks: initialAsks,
  emptyHint,
  engagementId,
  engagementType,
  onMutated,
  onError,
  externalHighlight = false,
}: {
  tacticalAsks: PrepareTacticalAsk[];
  emptyHint: string | null;
  engagementId: string;
  engagementType: string;
  onMutated: () => void | Promise<void>;
  onError: (message: string | null) => void;
  externalHighlight?: boolean;
}) {
  const [asks, setAsks] = React.useState(initialAsks);
  const [zoneHighlight, setZoneHighlight] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [menuAskId, setMenuAskId] = React.useState<string | null>(null);
  const [answerAskId, setAnswerAskId] = React.useState<string | null>(null);
  const [handledOpen, setHandledOpen] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [copyAllState, setCopyAllState] = React.useState<"idle" | "copying" | "copied">("idle");
  const [newAskKeys, setNewAskKeys] = React.useState<Set<string>>(() => new Set());
  const [changedAskKeys, setChangedAskKeys] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    setAsks(initialAsks);
  }, [initialAsks]);

  const activeAsks = React.useMemo(() => asksForFieldExecution(asks), [asks]);
  const handled = React.useMemo(() => handledTacticalAsks(asks), [asks]);

  const copyTimerRef = React.useRef<number | null>(null);
  const highlightTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  function flashZone() {
    setZoneHighlight(true);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setZoneHighlight(false);
      highlightTimerRef.current = null;
    }, ZONE_HIGHLIGHT_MS);
  }

  async function persistMutation(
    runner: () => Promise<{ ok: boolean; error?: string; asks?: PrepareTacticalAsk[]; message?: string }>,
  ): Promise<void> {
    setBusy(true);
    onError(null);
    try {
      const result = await runner();
      if (!result.ok) {
        onError(result.error ?? "Update failed");
        return;
      }
      if (result.asks) setAsks(result.asks);
      flashZone();
      try {
        await onMutated();
      } catch (reloadErr: unknown) {
        onError(userFacingError(reloadErr, "Saved, but refresh failed"));
      }
    } catch (e: unknown) {
      onError(userFacingError(e, "We could not save that update. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function runPersist(
    runner: () => Promise<{ ok: boolean; error?: string; asks?: PrepareTacticalAsk[]; message?: string }>,
  ) {
    void persistMutation(runner).catch((e: unknown) => {
      console.error("Tactical ask update failed", e);
      onError(userFacingError(e, "We could not save that update. Please try again."));
      setBusy(false);
    });
  }

  async function copyOne(ask: PrepareTacticalAsk) {
    const ok = await copyTextToClipboard(ask.text);
    if (ok) {
      setCopiedId(ask.id);
      setCopyAllState("idle");
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedId(null);
        copyTimerRef.current = null;
      }, COPY_TOAST_MS);
    }
  }

  async function copyAll() {
    if (!activeAsks.length || copyAllState === "copying") return;
    setCopyAllState("copying");
    const text = formatFieldAsksForClipboard(activeAsks.map((a) => a.text));
    const ok = await copyTextToClipboard(text);
    setCopyAllState(ok ? "copied" : "idle");
    if (ok) {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        setCopyAllState("idle");
        copyTimerRef.current = null;
      }, COPY_TOAST_MS);
    }
  }

  const answerAsk = answerAskId ? asks.find((a) => a.id === answerAskId) : null;

  return (
    <section
      className={`pfm-mission-asks pfm-touch-queue pfm-mission-zone--asks${zoneHighlight || externalHighlight ? " pfm-mission-zone--ai-highlight" : ""}`}
      aria-labelledby="pfm-mission-asks"
    >
      <header className="pfm-touch-queue-head">
        <div className="pfm-touch-queue-head-copy">
          <h2 id="pfm-mission-asks" className="pfm-mission-zone-title">
            {PRIORITY_QUESTIONS_LABEL}
          </h2>
          <p className="pfm-touch-queue-kicker">{PRIORITY_QUESTIONS_KICKER}</p>
        </div>
        {activeAsks.length > 0 ? (
          <button
            type="button"
            className="pfm-touch-queue-copy-all"
            disabled={copyAllState === "copying" || busy}
            onClick={() => void copyAll()}
          >
            {copyAllState === "copying" ? "…" : copyAllState === "copied" ? "Copied" : "Copy queue"}
          </button>
        ) : null}
      </header>

      {activeAsks.length > 0 ? (
        <ol className="pfm-touch-queue-list" role="list">
          {activeAsks.map((ask, i) => {
            const copied = copiedId === ask.id;
            const isNew = newAskKeys.has(ask.text);
            const isChanged = changedAskKeys.has(ask.text);
            const order = i + 1;
            return (
              <li
                key={ask.id}
                className={[
                  "pfm-touch-queue-item",
                  isNew ? "pfm-touch-queue-item--new" : isChanged ? "pfm-touch-queue-item--changed" : "",
                  statusRowClass(ask.status),
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div
                  className={`pfm-touch-queue-row${copied ? " pfm-touch-queue-row--copied" : ""}${menuAskId === ask.id ? " pfm-touch-queue-row--menu-open" : ""}`}
                >
                  <span className="pfm-touch-queue-order" aria-hidden>
                    {order}
                  </span>
                  <div className="pfm-touch-queue-prompt">
                    <p className="pfm-touch-queue-text">{ask.text}</p>
                    {ask.status === "ask_later" ? (
                      <span className="pfm-touch-queue-flag">{TACTICAL_ASK_STATUS_LABELS.ask_later}</span>
                    ) : null}
                    {isNew ? (
                      <span className="pfm-touch-queue-flag pfm-touch-queue-flag--new" aria-hidden>
                        {PREPARE_TACTICAL_AI_BADGE_ADDED}
                      </span>
                    ) : isChanged ? (
                      <span className="pfm-touch-queue-flag pfm-touch-queue-flag--changed" aria-hidden>
                        {PREPARE_TACTICAL_AI_BADGE_MODIFIED}
                      </span>
                    ) : null}
                  </div>
                  <div className="pfm-touch-queue-actions">
                    <button
                      type="button"
                      className="pfm-touch-queue-action pfm-touch-queue-action--copy"
                      disabled={busy}
                      aria-label={copied ? `Copied question ${order}` : `Copy question ${order}`}
                      onClick={() => void copyOne(ask)}
                    >
                      <span aria-hidden>{copied ? "✓" : "⧉"}</span>
                    </button>
                    <button
                      type="button"
                      className="pfm-touch-queue-action pfm-touch-queue-action--more"
                      aria-label={`Actions for question ${order}`}
                      aria-expanded={menuAskId === ask.id}
                      disabled={busy}
                      onClick={() => setMenuAskId(menuAskId === ask.id ? null : ask.id)}
                    >
                      <span aria-hidden>⋯</span>
                    </button>
                    <PrepareTacticalAskOverflowMenu
                      open={menuAskId === ask.id}
                      onClose={() => setMenuAskId(null)}
                      onAnswer={() => setAnswerAskId(ask.id)}
                      onAskLater={() =>
                        runPersist(() => updateTacticalAskStatus(engagementId, ask.id, "ask_later"))
                      }
                      onSkip={() =>
                        runPersist(() => updateTacticalAskStatus(engagementId, ask.id, "skipped"))
                      }
                      onFollowUp={() =>
                        runPersist(() =>
                          updateTacticalAskStatus(engagementId, ask.id, "follow_up_task"),
                        )
                      }
                      onDismiss={(reason) =>
                        runPersist(() => dismissTacticalAskClient(engagementId, ask.id, reason))
                      }
                      onRemove={() => runPersist(() => removeTacticalAskClient(engagementId, ask.id))}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : emptyHint && handled.length === 0 ? (
        <p className="pfm-mission-empty">{emptyHint}</p>
      ) : null}

      {handled.length > 0 ? (
        <details
          className="pfm-ask-handled"
          open={handledOpen}
          onToggle={(e) => setHandledOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="pfm-ask-handled-summary">Handled ({handled.length})</summary>
          <ul className="pfm-ask-handled-list">
            {handled.map((ask) => (
              <li key={ask.id} className={statusRowClass(ask.status)}>
                <span className="pfm-ask-handled-q">{ask.text}</span>
                <span className="pfm-ask-handled-status">{TACTICAL_ASK_STATUS_LABELS[ask.status]}</span>
                {ask.answer_summary ? (
                  <span className="pfm-ask-handled-answer">{ask.answer_summary}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <PrepareTacticalAskQuickSheet
        open={Boolean(answerAsk)}
        title="Capture answer"
        label="What did you learn? (feeds field intelligence)"
        placeholder="Short answer — one or two sentences…"
        initialValue={answerAsk?.answer_summary ?? ""}
        busy={busy}
        primaryLabel="Save answer"
        onClose={() => setAnswerAskId(null)}
        onSave={async (summary) => {
          await persistMutation(async () => {
            if (!answerAskId) return { ok: false, error: "No ask selected" };
            if (!summary) return { ok: false, error: "Enter a short answer." };
            const result = await updateTacticalAskStatus(engagementId, answerAskId, "answered", {
              answerSummary: summary,
            });
            if (result.ok) setAnswerAskId(null);
            return result;
          });
        }}
      />
    </section>
  );
}
