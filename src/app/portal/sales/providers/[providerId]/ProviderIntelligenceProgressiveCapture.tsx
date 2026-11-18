"use client";

import React from "react";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  buildGuidedDiscoverySessionSummary,
  buildProgressiveCaptureSteps,
  formatGuidedDiscoveryProgress,
  initialProgressiveStepIndex,
  type GuidedDiscoverySessionSummary,
  type ProgressiveCaptureStep,
} from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  isIntelligenceFieldDeprioritizedForDiscovery,
  type IntelligenceDiscoveryStance,
} from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";
import { UNRESOLVED_ITEM_ACTION_LABELS } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import { ProviderIntelligenceFieldControl } from "@/components/sales/ProviderIntelligenceFieldControl";
import { ProviderIntelligenceWhyItMatters } from "./ProviderIntelligenceWhyItMatters";

function interviewQueue(
  steps: ProgressiveCaptureStep[],
  skipped: ReadonlySet<string>,
  fieldMetadata?: ReturnType<typeof intelligenceMetadataFromContact>,
): ProgressiveCaptureStep[] {
  return steps.filter(
    (s) =>
      !s.answered &&
      !skipped.has(s.dbKey) &&
      !isIntelligenceFieldDeprioritizedForDiscovery(s.dbKey, fieldMetadata),
  );
}

export function ProviderIntelligenceProgressiveCapture({
  sectionId,
  contact,
  planDraft,
  setPlanDraft,
  saving,
  sectionConfidence,
  emphasizeKeys,
  onShowAllFields,
  providerId,
  onDiscoveryStance,
}: {
  sectionId: ProviderIntelligenceSectionId;
  contact: Record<string, unknown>;
  planDraft: Record<string, string>;
  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  sectionConfidence: IntelligenceSectionConfidence;
  emphasizeKeys?: readonly string[];
  onShowAllFields?: () => void;
  providerId?: string;
  onDiscoveryStance?: (
    dbKey: string,
    stance: IntelligenceDiscoveryStance,
    options?: { uncertaintyKind?: "unexplored" | "opaque" },
  ) => void | Promise<void>;
}) {
  const mergedContact = React.useMemo(() => ({ ...contact, ...planDraft }), [contact, planDraft]);
  const fieldMetadata = React.useMemo(
    () => intelligenceMetadataFromContact(mergedContact),
    [mergedContact],
  );
  const baselineRef = React.useRef<Record<string, unknown>>({ ...mergedContact });

  const [steps, setSteps] = React.useState<ProgressiveCaptureStep[]>(() =>
    buildProgressiveCaptureSteps(sectionId, mergedContact, { includeAnswered: true, sectionConfidence }),
  );
  const [skipped, setSkipped] = React.useState<Set<string>>(() => new Set());
  const [showSummary, setShowSummary] = React.useState(false);
  const [sessionSummary, setSessionSummary] = React.useState<GuidedDiscoverySessionSummary | null>(null);

  const queue = React.useMemo(
    () => interviewQueue(steps, skipped, fieldMetadata),
    [steps, skipped, fieldMetadata],
  );

  const [stepIndex, setStepIndex] = React.useState(() =>
    initialProgressiveStepIndex(queue, emphasizeKeys?.[0]),
  );

  const emphasizeKey = emphasizeKeys?.[0];

  React.useEffect(() => {
    const next = buildProgressiveCaptureSteps(sectionId, mergedContact, {
      includeAnswered: true,
      sectionConfidence,
    });
    setSteps(next);
    const q = interviewQueue(next, skipped, fieldMetadata);
    if (!showSummary) {
      setStepIndex(initialProgressiveStepIndex(q, emphasizeKey));
    }
  }, [sectionId, sectionConfidence, emphasizeKey, mergedContact, skipped, showSummary]);

  const current = queue[stepIndex];
  const progressLabel = formatGuidedDiscoveryProgress(sectionId, stepIndex, queue.length);

  function finishInterview(snapshot?: Record<string, unknown>) {
    const ctx = snapshot ?? mergedContact;
    setSessionSummary(
      buildGuidedDiscoverySessionSummary(sectionId, baselineRef.current, ctx, [...skipped]),
    );
    setShowSummary(true);
  }

  function goNext() {
    if (stepIndex < queue.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    finishInterview();
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  function skipCurrent() {
    if (!current) return;
    const nextSkipped = new Set([...skipped, current.dbKey]);
    const nextQueue = interviewQueue(steps, nextSkipped, fieldMetadata);
    setSkipped(nextSkipped);
    if (nextQueue.length === 0) {
      finishInterview();
    } else {
      setStepIndex(Math.min(stepIndex, nextQueue.length - 1));
    }
  }

  async function applyStance(
    stance: IntelligenceDiscoveryStance,
    options?: { uncertaintyKind?: "unexplored" | "opaque" },
  ) {
    if (!current) return;
    if (onDiscoveryStance) {
      await onDiscoveryStance(current.dbKey, stance, options);
    } else if (providerId) {
      await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intelligence_discovery_stances: {
            [current.dbKey]: { stance, uncertainty_kind: options?.uncertaintyKind },
          },
        }),
      });
    }
    const nextSkipped = new Set([...skipped, current.dbKey]);
    setSkipped(nextSkipped);
    goNext();
  }

  function handleChange(next: string) {
    if (!current) return;
    setPlanDraft((prev) => ({ ...prev, [current.dbKey]: next }));
    const updated = { ...mergedContact, [current.dbKey]: next };
    const refreshed = buildProgressiveCaptureSteps(sectionId, updated, {
      includeAnswered: true,
      sectionConfidence,
    });
    setSteps(refreshed);
    const nextQueue = interviewQueue(refreshed, skipped, fieldMetadata);
    if (fieldHasIntelligenceSignal(current.dbKey, next) && nextQueue.length === 0) {
      window.requestAnimationFrame(() => finishInterview(updated));
    } else if (
      fieldHasIntelligenceSignal(current.dbKey, next) &&
      stepIndex < nextQueue.length - 1
    ) {
      window.requestAnimationFrame(() => setStepIndex(Math.min(stepIndex + 1, nextQueue.length - 1)));
    }
  }

  if (showSummary && sessionSummary) {
    return (
      <div className="provider-intel-guided-summary">
        <header className="provider-intel-guided-summary-head">
          <h4 className="provider-intel-guided-summary-title">Mapping saved</h4>
          <p className="provider-intel-guided-summary-lead">
            Partial progress is fine — return anytime to resolve remaining unknowns.
          </p>
        </header>

        {sessionSummary.captured.length > 0 ? (
          <div className="provider-intel-guided-summary-block">
            <span className="provider-intel-guided-summary-kicker">Captured</span>
            <ul className="provider-intel-guided-summary-list">
              {sessionSummary.captured.map((item) => (
                <li key={item.dbKey} className="provider-intel-guided-summary-row">
                  <span className="provider-intel-guided-summary-label">{item.label}</span>
                  <span className="provider-intel-briefing-chip provider-intel-briefing-chip--trust-emerging">
                    {item.chip}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="provider-intel-guided-summary-empty">
            No new operational reads saved — skipped or already validated.
          </p>
        )}

        {sessionSummary.skipped.length > 0 ? (
          <div className="provider-intel-guided-summary-block">
            <span className="provider-intel-guided-summary-kicker">Skipped for now</span>
            <ul className="provider-intel-briefing-chip-row">
              {sessionSummary.skipped.map((item) => (
                <li key={item.dbKey}>
                  <span className="provider-intel-briefing-chip provider-intel-briefing-chip--gap">
                    {item.phrase}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="provider-intel-guided-summary-actions">
          <button
            type="button"
            className="provider-intel-progressive-nav-btn provider-intel-progressive-nav-btn--primary"
            onClick={() => {
              setShowSummary(false);
              setSkipped(new Set());
              baselineRef.current = { ...mergedContact };
            }}
          >
            Continue qualifying
          </button>
          {onShowAllFields ? (
            <button type="button" className="provider-intel-progressive-link" onClick={onShowAllFields}>
              Edit all fields
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="provider-intel-progressive provider-intel-progressive--done">
        <p className="provider-intel-progressive-done-msg">
          No open prompts in this pass — readiness may still be partial; edit fields anytime.
        </p>
        {onShowAllFields ? (
          <button type="button" className="provider-intel-progressive-link" onClick={onShowAllFields}>
            Review or edit all fields
          </button>
        ) : null}
      </div>
    );
  }

  if (!current) return null;

  const id = `intel-progressive-${current.dbKey}`;
  const hasValue = fieldHasIntelligenceSignal(current.dbKey, planDraft[current.dbKey]);

  return (
    <div className="provider-intel-progressive provider-intel-progressive--interview">
      <div className="provider-intel-progressive-head">
        <div className="provider-intel-progressive-progress" aria-live="polite">
          <span className="provider-intel-progressive-progress-label">{progressLabel}</span>
          {current.progressBeat ? (
            <span className="provider-intel-progressive-beat">{current.progressBeat}</span>
          ) : null}
          <span
            className="provider-intel-progressive-progress-bar"
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={Math.max(queue.length, 1)}
          >
            <span style={{ width: `${((stepIndex + 1) / queue.length) * 100}%` }} />
          </span>
        </div>
        {onShowAllFields ? (
          <button type="button" className="provider-intel-progressive-link" onClick={onShowAllFields}>
            All fields
          </button>
        ) : null}
      </div>

      <div
        className="provider-intel-progressive-question"
        id={emphasizeKeys?.includes(current.dbKey) ? `intel-field-${current.dbKey}` : undefined}
      >
        <p className="provider-intel-progressive-prompt">{current.prompt}</p>
        {current.whyItMatters ? (
          <ProviderIntelligenceWhyItMatters text={current.whyItMatters} variant="field" />
        ) : null}

        <div className="provider-intel-progressive-control">
          <ProviderIntelligenceFieldControl
            id={id}
            field={current.field}
            value={planDraft[current.dbKey] || ""}
            onChange={handleChange}
            disabled={saving}
            omitUnsetCaptureOption
          />
        </div>
      </div>

      <div className="provider-intel-progressive-stance" role="group" aria-label="If you can't answer now">
        <span className="provider-intel-progressive-stance-label">Can&apos;t answer now?</span>
        <div className="provider-intel-progressive-stance-row">
          <button
            type="button"
            className="provider-intel-progressive-stance-btn"
            disabled={saving}
            onClick={() => void applyStance("unknown", { uncertaintyKind: "unexplored" })}
          >
            {UNRESOLVED_ITEM_ACTION_LABELS.dontKnowYet}
          </button>
          <button
            type="button"
            className="provider-intel-progressive-stance-btn"
            disabled={saving}
            onClick={() => void applyStance("not_relevant")}
          >
            {UNRESOLVED_ITEM_ACTION_LABELS.notRelevant}
          </button>
          <button
            type="button"
            className="provider-intel-progressive-stance-btn"
            disabled={saving}
            onClick={skipCurrent}
          >
            {UNRESOLVED_ITEM_ACTION_LABELS.skip}
          </button>
        </div>
      </div>

      <div className="provider-intel-progressive-nav">
        <button
          type="button"
          className="provider-intel-progressive-nav-btn"
          disabled={stepIndex === 0}
          onClick={goBack}
        >
          Back
        </button>
        {hasValue ? (
          <button
            type="button"
            className="provider-intel-progressive-nav-btn provider-intel-progressive-nav-btn--primary"
            onClick={goNext}
          >
            {stepIndex >= queue.length - 1 ? "Finish" : UNRESOLVED_ITEM_ACTION_LABELS.answerNow}
          </button>
        ) : (
          <button
            type="button"
            className="provider-intel-progressive-nav-btn provider-intel-progressive-nav-btn--secondary"
            onClick={goNext}
          >
            {stepIndex >= queue.length - 1 ? "Finish" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}
