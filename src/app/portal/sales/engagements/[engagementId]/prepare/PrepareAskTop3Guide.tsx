"use client";

import Link from "next/link";
import React from "react";
import { TOP_ASKS_LABEL } from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import {
  formatAskForFieldGuide,
  formatFieldAsksForClipboard,
} from "@/lib/surgical-sales/engagements/prepareFieldConversationAsk";
import { assistActionsForPrepareAsks } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";
import { splitProbeLines } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";
import { copyTextToClipboard } from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import {
  PrepareTacticalAiAssistActions,
  type TacticalAssistFeedback,
} from "@/components/sales/PrepareTacticalAiAssistActions";
import {
  PREPARE_TACTICAL_AI_BADGE_ADDED,
  PREPARE_TACTICAL_AI_BADGE_MODIFIED,
} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistUx";

const COPY_TOAST_MS = 1800;
const ZONE_HIGHLIGHT_MS = 2400;

function asksFromProbeText(text: string | null | undefined): string[] {
  return splitProbeLines(text).map((raw) => formatAskForFieldGuide(raw) || raw).filter(Boolean);
}

export function PrepareAskTop3Guide({
  points,
  planProbes,
  emptyHint,
  engagementId,
  engagementType,
  onAssistApplied,
  onAssistError,
  externalHighlight = false,
}: {
  points: string[];
  planProbes: string | null;
  emptyHint: string | null;
  engagementId: string;
  engagementType: string;
  onAssistApplied: () => void | Promise<void>;
  onAssistError: (message: string | null) => void;
  /** Parent-driven pulse after debrief save (e.g. workflow / scheduling intelligence). */
  externalHighlight?: boolean;
}) {
  const baselineProbes = planProbes ?? "";
  const [probeText, setProbeText] = React.useState(baselineProbes);
  const [zoneHighlight, setZoneHighlight] = React.useState(false);
  const [newAskKeys, setNewAskKeys] = React.useState<Set<string>>(() => new Set());
  const [changedAskKeys, setChangedAskKeys] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    setProbeText(baselineProbes);
  }, [baselineProbes]);

  const asks = React.useMemo(() => {
    const fromProbes = asksFromProbeText(probeText);
    const source = fromProbes.length > 0 ? fromProbes : points.map((raw) => formatAskForFieldGuide(raw) || raw);
    return source.filter(Boolean).map((display, i) => ({
      key: `${display}-${i}`,
      raw: display,
      display,
    }));
  }, [probeText, points]);

  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [copyAllState, setCopyAllState] = React.useState<"idle" | "copying" | "copied">("idle");
  const copyTimerRef = React.useRef<number | null>(null);
  const highlightTimerRef = React.useRef<number | null>(null);
  const askAssistActions = React.useMemo(
    () => assistActionsForPrepareAsks(engagementType),
    [engagementType],
  );

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  function scheduleClearCopied() {
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedIndex(null);
      setCopyAllState("idle");
      copyTimerRef.current = null;
    }, COPY_TOAST_MS);
  }

  function flashZone() {
    setZoneHighlight(true);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setZoneHighlight(false);
      highlightTimerRef.current = null;
    }, ZONE_HIGHLIGHT_MS);
  }

  function applyAssistResult(result: TacticalAssistFeedback) {
    const prev = probeText;
    const next = result.patch.pre_observation_probes;
    const isRevert = result.summary.includes("Reverted");
    if (next !== undefined) {
      setProbeText(next ?? "");
      if (isRevert) {
        setNewAskKeys(new Set());
        setChangedAskKeys(new Set());
      } else {
        const added = new Set<string>();
        const changed = new Set<string>();
        const prevLines = asksFromProbeText(prev);
        const nextLines = asksFromProbeText(next);
        for (const line of result.addedProbeLines) {
          const key = formatAskForFieldGuide(line) || line;
          if (key) added.add(key);
        }
        if (result.action === "tighten_asks" && result.tightenAfter) {
          for (const line of result.tightenAfter) {
            const key = formatAskForFieldGuide(line) || line;
            if (key) changed.add(key);
          }
        } else {
          for (let i = 0; i < nextLines.length; i++) {
            const n = nextLines[i]!;
            if (i >= prevLines.length) {
              added.add(n);
            } else if (prevLines[i] !== n) {
              changed.add(n);
            }
          }
        }
        setNewAskKeys(added);
        setChangedAskKeys(changed);
        window.setTimeout(() => {
          setNewAskKeys(new Set());
          setChangedAskKeys(new Set());
        }, ZONE_HIGHLIGHT_MS);
      }
    }
    flashZone();
  }

  async function copyOne(index: number) {
    const text = asks[index]?.display?.trim();
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedIndex(index);
      setCopyAllState("idle");
      scheduleClearCopied();
    }
  }

  async function copyAll() {
    if (!asks.length || copyAllState === "copying") return;
    setCopyAllState("copying");
    const text = formatFieldAsksForClipboard(asks.map((a) => a.display));
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedIndex(null);
      setCopyAllState("copied");
      scheduleClearCopied();
    } else {
      setCopyAllState("idle");
    }
  }

  return (
    <section
      className={`pfm-mission-zone pfm-mission-zone--asks${zoneHighlight || externalHighlight ? " pfm-mission-zone--ai-highlight" : ""}`}
      aria-labelledby="pfm-mission-asks"
    >
      <header className="pfm-mission-zone-head pfm-ask-guide-head">
        <h2 id="pfm-mission-asks" className="pfm-mission-zone-title">
          {TOP_ASKS_LABEL}
        </h2>
        {asks.length > 0 ? (
          <button
            type="button"
            className="pfm-ask-guide-copy-all"
            disabled={copyAllState === "copying"}
            onClick={() => void copyAll()}
          >
            {copyAllState === "copying" ? "…" : copyAllState === "copied" ? "Copied" : "Copy asks"}
          </button>
        ) : null}
      </header>
      <PrepareTacticalAiAssistActions
        engagementId={engagementId}
        actionIds={askAssistActions}
        disabled={copyAllState === "copying"}
        onHighlight={(keys) => {
          if (keys.includes("pre_observation_probes")) flashZone();
        }}
        onApplied={async (result) => {
          applyAssistResult(result);
          await onAssistApplied();
        }}
        onError={onAssistError}
      />

      {emptyHint && asks.length === 0 ? (
        <p className="pfm-mission-empty">
          {emptyHint}
        </p>
      ) : asks.length > 0 ? (
        <ol className="pfm-ask-guide">
          {asks.map((ask, i) => {
            const copied = copiedIndex === i;
            const isNew = newAskKeys.has(ask.display);
            const isChanged = changedAskKeys.has(ask.display);
            return (
              <li
                key={ask.key}
                className={isNew ? "pfm-ask-guide-item--new" : isChanged ? "pfm-ask-guide-item--changed" : undefined}
              >
                <button
                  type="button"
                  className={`pfm-ask-guide-row${copied ? " pfm-ask-guide-row--copied" : ""}${isNew ? " pfm-ask-guide-row--ai-new" : ""}${isChanged ? " pfm-ask-guide-row--ai-changed" : ""}`}
                  onClick={() => void copyOne(i)}
                  aria-label={copied ? `Copied ask ${i + 1}` : `Copy ask ${i + 1}`}
                >
                  <span className="pfm-ask-guide-num" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="pfm-ask-guide-q">{ask.display}</span>
                  {isNew ? (
                    <span className="pfm-ask-guide-badge pfm-ask-guide-badge--added" aria-hidden>
                      {PREPARE_TACTICAL_AI_BADGE_ADDED}
                    </span>
                  ) : isChanged ? (
                    <span className="pfm-ask-guide-badge pfm-ask-guide-badge--changed" aria-hidden>
                      {PREPARE_TACTICAL_AI_BADGE_MODIFIED}
                    </span>
                  ) : (
                    <span className="pfm-ask-guide-copy-hint" aria-hidden>
                      {copied ? "Copied" : "Copy"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
