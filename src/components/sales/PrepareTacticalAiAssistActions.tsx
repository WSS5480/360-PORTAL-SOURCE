"use client";

import React from "react";
import {
  PREPARE_TACTICAL_AI_ASSIST_LABELS,
  PREPARE_TACTICAL_AI_ASSIST_TITLES,
  type PrepareTacticalAiAssistActionId,
} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";
import type { PrepareTacticalAiAssistApplyPayload } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistApply";
import { previewProbeLine } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";
import {
  PREPARE_TACTICAL_AI_ASSIST_ACTIVATED,
  PREPARE_TACTICAL_AI_ASSIST_REVERT_LABEL,
} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistUx";
import { runPrepareTacticalAiAssistClient } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistClient";
import { useTacticalAiAssistSession } from "@/components/sales/TacticalAiAssistSession";
import { userFacingError } from "@/lib/errors/userFacingError";

const HIGHLIGHT_MS = 2400;

type TacticalAiAssistAppliedMap = Partial<Record<PrepareTacticalAiAssistActionId, TacticalAssistFeedback>>;

export type TacticalAssistFeedback = PrepareTacticalAiAssistApplyPayload & {
  action: PrepareTacticalAiAssistActionId;
};

export function PrepareTacticalAiAssistActions({
  engagementId,
  actionIds,
  disabled,
  onApplied,
  onError,
  onHighlight,
}: {
  engagementId: string;
  actionIds: readonly PrepareTacticalAiAssistActionId[];
  disabled?: boolean;
  onApplied: (result: TacticalAssistFeedback) => void | Promise<void>;
  onError: (message: string | null) => void;
  onHighlight?: (keys: string[]) => void;
}) {
  const session = useTacticalAiAssistSession(engagementId);
  const [localApplied, setLocalApplied] = React.useState<TacticalAiAssistAppliedMap>({});
  const [busyId, setBusyId] = React.useState<PrepareTacticalAiAssistActionId | null>(null);
  const [revertId, setRevertId] = React.useState<PrepareTacticalAiAssistActionId | null>(null);

  const applied = session?.applied ?? localApplied;

  function setAppliedEntry(action: PrepareTacticalAiAssistActionId, entry: TacticalAssistFeedback | null) {
    if (session) session.setApplied(action, entry);
    else {
      setLocalApplied((prev) => {
        const next = { ...prev };
        if (entry) next[action] = entry;
        else delete next[action];
        return next;
      });
    }
  }

  if (actionIds.length === 0) return null;

  function pulseHighlight(patch: Record<string, string | null>) {
    const keys = Object.keys(patch);
    onHighlight?.(keys);
    if (keys.length > 0) {
      window.setTimeout(() => onHighlight?.([]), HIGHLIGHT_MS);
    }
  }

  async function runAction(action: PrepareTacticalAiAssistActionId) {
    if (busyId || disabled || revertId || applied[action]) return;
    setBusyId(action);
    onError(null);
    try {
      const result = await runPrepareTacticalAiAssistClient(engagementId, action);
      if (!result.ok) throw new Error(result.error);
      const payload: TacticalAssistFeedback = { ...result, action };
      setAppliedEntry(action, payload);
      pulseHighlight(result.patch);
      await onApplied(payload);
    } catch (e: unknown) {
      onError(userFacingError(e, "The writing assistant is unavailable right now. Please try again."));
    } finally {
      setBusyId(null);
    }
  }

  async function revertAction(action: PrepareTacticalAiAssistActionId) {
    const entry = applied[action];
    if (!entry || revertId || busyId) return;
    setRevertId(action);
    onError(null);
    try {
      const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.undo),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Revert failed");
      setAppliedEntry(action, null);
      const reverted: TacticalAssistFeedback = {
        action,
        patch: entry.undo,
        label: PREPARE_TACTICAL_AI_ASSIST_REVERT_LABEL[action],
        summary: "Reverted to your previous tactical prep.",
        undo: entry.patch,
        addedProbeLines: [],
        tightenBefore: entry.tightenBefore,
        tightenAfter: entry.tightenAfter,
        goalBefore: entry.goalBefore,
        goalAfter: entry.goalAfter,
      };
      pulseHighlight(entry.undo);
      await onApplied(reverted);
    } catch (e: unknown) {
      onError(userFacingError(e, "We could not undo that change. Please try again."));
    } finally {
      setRevertId(null);
    }
  }

  return (
    <div className="pfm-ai-assist-wrap">
      <div className="pfm-ai-assist" role="group" aria-label="Tactical assist">
        {actionIds.map((id) => {
          const entry = applied[id];
          const isBusy = busyId === id;
          const isReverting = revertId === id;

          if (entry) {
            return (
              <AppliedAssistRow
                key={id}
                actionId={id}
                entry={entry}
                reverting={isReverting}
                disabled={disabled || Boolean(busyId) || Boolean(revertId)}
                onRevert={() => void revertAction(id)}
              />
            );
          }

          return (
            <button
              key={id}
              type="button"
              className="pfm-ai-assist-chip"
              title={PREPARE_TACTICAL_AI_ASSIST_TITLES[id]}
              disabled={disabled || Boolean(busyId) || Boolean(revertId)}
              aria-busy={isBusy}
              onClick={() => void runAction(id)}
            >
              {isBusy ? "…" : PREPARE_TACTICAL_AI_ASSIST_LABELS[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppliedAssistRow({
  actionId,
  entry,
  reverting,
  disabled,
  onRevert,
}: {
  actionId: PrepareTacticalAiAssistActionId;
  entry: TacticalAssistFeedback;
  reverting: boolean;
  disabled?: boolean;
  onRevert: () => void;
}) {
  const showTightenDiff =
    actionId === "tighten_asks" &&
    entry.tightenBefore &&
    entry.tightenAfter &&
    entry.tightenBefore.length > 0;

  const showIntroDiff =
    actionId === "simplify_intro_call" &&
    (entry.goalBefore || (entry.tightenBefore && entry.tightenBefore.length > 0));

  return (
    <div className="pfm-ai-assist-applied" data-assist-action={actionId}>
      <div className="pfm-ai-assist-applied-head">
        <span className="pfm-ai-assist-applied-check" aria-hidden>
          ✓
        </span>
        <span className="pfm-ai-assist-applied-label">{PREPARE_TACTICAL_AI_ASSIST_ACTIVATED[actionId]}</span>
        <span className="pfm-ai-assist-applied-badge">AI modified</span>
        <button
          type="button"
          className="pfm-ai-assist-applied-revert"
          disabled={disabled || reverting}
          onClick={onRevert}
        >
          {reverting ? "…" : PREPARE_TACTICAL_AI_ASSIST_REVERT_LABEL[actionId]}
        </button>
      </div>

      {showTightenDiff ? (
        <TightenBeforeAfter before={entry.tightenBefore!} after={entry.tightenAfter!} />
      ) : null}

      {showIntroDiff && !showTightenDiff ? (
        <div className="pfm-ai-assist-diff">
          {entry.goalBefore ? (
            <p className="pfm-ai-assist-diff-goal">
              <span className="pfm-ai-assist-diff-kicker">Discovery focus</span>
              <span className="pfm-ai-assist-diff-before">{previewProbeLine(entry.goalBefore, 80)}</span>
              <span className="pfm-ai-assist-diff-arrow" aria-hidden>
                →
              </span>
              <span className="pfm-ai-assist-diff-after">
                {previewProbeLine(entry.goalAfter ?? "", 80)}
              </span>
            </p>
          ) : null}
          {entry.tightenAfter && entry.tightenAfter.length > 0 ? (
            <p className="pfm-ai-assist-diff-note">
              Set {entry.tightenAfter.length} relationship-building ask
              {entry.tightenAfter.length === 1 ? "" : "s"} for intro discovery.
            </p>
          ) : null}
        </div>
      ) : null}

      {actionId === "add_access_question" || actionId === "add_surgical_workflow_question" ? (
        entry.addedProbeLines.length > 0 ? (
          <p className="pfm-ai-assist-applied-added">
            <span className="pfm-ai-assist-applied-badge pfm-ai-assist-applied-badge--added">AI added</span>
            {previewProbeLine(entry.addedProbeLines[0]!, 72)}
          </p>
        ) : null
      ) : null}
    </div>
  );
}

function TightenBeforeAfter({ before, after }: { before: string[]; after: string[] }) {
  return (
    <div className="pfm-ai-assist-diff pfm-ai-assist-diff--tighten" aria-label="Before and after ask wording">
      <div className="pfm-ai-assist-diff-col">
        <span className="pfm-ai-assist-diff-kicker">Before</span>
        <ul>
          {before.slice(0, 3).map((line) => (
            <li key={`b-${line}`}>{previewProbeLine(line, 64)}</li>
          ))}
        </ul>
      </div>
      <span className="pfm-ai-assist-diff-arrow" aria-hidden>
        →
      </span>
      <div className="pfm-ai-assist-diff-col">
        <span className="pfm-ai-assist-diff-kicker">After</span>
        <ul>
          {after.slice(0, 3).map((line) => (
            <li key={`a-${line}`}>{previewProbeLine(line, 64)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
