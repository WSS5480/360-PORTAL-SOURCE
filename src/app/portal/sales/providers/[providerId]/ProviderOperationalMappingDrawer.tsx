"use client";

import React from "react";
import { createPortal, flushSync } from "react-dom";
import { ProviderIntelligenceFieldControl } from "@/components/sales/ProviderIntelligenceFieldControl";
import {
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { IntelligenceDiscoveryStance } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { intelligenceFieldWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import { isIntelligenceFieldDeprioritizedForDiscovery } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import {
  buildOperationalMappingSectionBrief,
  buildSectionOperationalMappingProgress,
  buildUnresolvedMappingQueue,
  UNRESOLVED_ITEM_ACTION_LABELS,
  type SectionOperationalMappingProgress,
} from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import type { ProgressiveCaptureStep } from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import { ProviderIntelligenceWhyItMatters } from "./ProviderIntelligenceWhyItMatters";
import { providerOperationalMappingCss } from "./providerOperationalMappingCss";

export type OperationalMappingTarget = {
  sectionId: ProviderIntelligenceSectionId;
  dbKey?: string;
};

export function ProviderOperationalMappingDrawer({
  open,
  target,
  contact,
  planning,
  fieldMetadata,
  planDraft,
  setPlanDraft,
  saving,
  saveError,
  providerId,
  onSave,
  onClose,
  onDiscoveryStance,
}: {
  open: boolean;
  target: OperationalMappingTarget | null;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  planDraft: Record<string, string>;
  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  saveError?: string | null;
  providerId?: string;
  onSave: () => Promise<void>;
  onClose: () => void;
  onDiscoveryStance?: (
    dbKey: string,
    stance: IntelligenceDiscoveryStance,
    options?: { uncertaintyKind?: "unexplored" | "opaque" },
  ) => void | Promise<void>;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [localValue, setLocalValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [skipped, setSkipped] = React.useState<Set<string>>(() => new Set());
  const firstControlRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  const sectionId = target?.sectionId ?? null;
  const mergedContact = React.useMemo(() => ({ ...contact, ...planDraft }), [contact, planDraft]);

  const sectionConfidence =
    planning?.sections.find((s) => s.id === sectionId)?.confidence ?? "unknown";

  const progress: SectionOperationalMappingProgress | null = React.useMemo(() => {
    if (!sectionId) return null;
    return buildSectionOperationalMappingProgress(sectionId, mergedContact, {
      planning,
      confidence: sectionConfidence,
      fieldMetadata,
    });
  }, [sectionId, mergedContact, planning, sectionConfidence, fieldMetadata]);

  const brief = React.useMemo(() => {
    if (!sectionId) return null;
    return buildOperationalMappingSectionBrief(sectionId, mergedContact, planning, sectionConfidence);
  }, [sectionId, mergedContact, planning, sectionConfidence]);

  const queue: ProgressiveCaptureStep[] = React.useMemo(() => {
    if (!sectionId) return [];
    const base = buildUnresolvedMappingQueue(
      sectionId,
      mergedContact,
      sectionConfidence,
      target?.dbKey,
    );
    return base.filter(
      (s) =>
        !skipped.has(s.dbKey) &&
        !isIntelligenceFieldDeprioritizedForDiscovery(s.dbKey, fieldMetadata),
    );
  }, [sectionId, mergedContact, sectionConfidence, target?.dbKey, skipped, fieldMetadata]);

  const current = queue[activeIndex] ?? null;

  React.useEffect(() => {
    if (!open || !current) return;
    setLocalValue(
      planDraft[current.dbKey] !== undefined && planDraft[current.dbKey] !== ""
        ? planDraft[current.dbKey]
        : String(contact[current.dbKey] ?? "").trim(),
    );
  }, [open, current?.dbKey, planDraft, contact]);

  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    setSkipped(new Set());
  }, [open, sectionId, target?.dbKey]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      firstControlRef.current?.querySelector<HTMLElement>("button, input, textarea, select")?.focus();
    }, 80);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose, activeIndex]);

  async function persistDiscoveryStance(
    dbKey: string,
    stance: IntelligenceDiscoveryStance,
    options?: { uncertaintyKind?: "unexplored" | "opaque" },
  ) {
    if (onDiscoveryStance) {
      await onDiscoveryStance(dbKey, stance, options);
    } else if (providerId) {
      await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intelligence_discovery_stances: {
            [dbKey]: { stance, uncertainty_kind: options?.uncertaintyKind },
          },
        }),
      });
    }
  }

  function advanceQueue() {
    if (activeIndex < queue.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      onClose();
    }
  }

  function handleSkip() {
    if (!current) return;
    const nextSkipped = new Set([...skipped, current.dbKey]);
    setSkipped(nextSkipped);
    setActiveIndex(Math.min(activeIndex, Math.max(0, queue.length - 2)));
    if (queue.length <= 1) onClose();
  }

  async function handleDontKnowYet() {
    if (!current) return;
    await persistDiscoveryStance(current.dbKey, "unknown", { uncertaintyKind: "unexplored" });
    const nextSkipped = new Set([...skipped, current.dbKey]);
    setSkipped(nextSkipped);
    setActiveIndex(Math.min(activeIndex, Math.max(0, queue.length - 2)));
    if (queue.length <= 1) onClose();
  }

  async function handleNotRelevant() {
    if (!current) return;
    await persistDiscoveryStance(current.dbKey, "not_relevant");
    const nextSkipped = new Set([...skipped, current.dbKey]);
    setSkipped(nextSkipped);
    setActiveIndex(Math.min(activeIndex, Math.max(0, queue.length - 2)));
    if (queue.length <= 1) onClose();
  }

  async function handleSaveAndNext() {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      flushSync(() => {
        setPlanDraft((prev) => ({ ...prev, [current.dbKey]: localValue }));
      });
      await onSave();
      if (fieldHasIntelligenceSignal(current.dbKey, localValue)) {
        advanceQueue();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !open || !target || !sectionId || !progress || !brief) return null;

  const sectionLabel = PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId];
  const busy = saving || submitting;
  const hasValue = current ? fieldHasIntelligenceSignal(current.dbKey, localValue) : false;

  return createPortal(
    <>
      <style>{providerOperationalMappingCss}</style>
      <div
        className="provider-intel-mapping-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="provider-intel-mapping-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provider-mapping-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="provider-intel-mapping-head">
            <div className="provider-intel-mapping-head-row">
              <h2 id="provider-mapping-title" className="provider-intel-mapping-title">
                {sectionLabel}
              </h2>
              <button
                type="button"
                className="provider-intel-mapping-close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            <div className="provider-intel-mapping-progress-row">
              <span
                className={`provider-intel-confidence-badge provider-intel-confidence-badge--${progress.readinessTone}`}
              >
                {progress.statusBadge}
              </span>
              <span className="provider-intel-section-collapsed-progress">{progress.metricsLine}</span>
            </div>
          </header>

          <div className="provider-intel-mapping-body">
            <section className="provider-intel-mapping-block" aria-label="What we already know">
              <span className="provider-intel-mapping-block-label">What we already know</span>
              {brief.knownItems.length > 0 ? (
                <ul className="provider-intel-mapping-list">
                  {brief.knownItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="provider-intel-mapping-empty">Nothing mapped yet — start with the first unknown.</p>
              )}
            </section>

            <section className="provider-intel-mapping-block" aria-label="Open on the operational map">
              <span className="provider-intel-mapping-block-label">Open on the operational map</span>
              {brief.unresolvedItems.length > 0 ? (
                <ul className="provider-intel-mapping-list">
                  {brief.unresolvedItems.map((item) => (
                    <li key={item.dbKey}>
                      <button
                        type="button"
                        className={`provider-intel-mapping-unresolved-btn${
                          current?.dbKey === item.dbKey
                            ? " provider-intel-mapping-unresolved-btn--active"
                            : ""
                        }`}
                        onClick={() => {
                          const idx = queue.findIndex((s) => s.dbKey === item.dbKey);
                          if (idx >= 0) setActiveIndex(idx);
                        }}
                      >
                        {item.phrase}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="provider-intel-mapping-empty">No open items — update details anytime.</p>
              )}
            </section>

            <section className="provider-intel-mapping-block" aria-label="Why this matters">
              <span className="provider-intel-mapping-block-label">Why additional context matters</span>
              <p className="provider-intel-mapping-empty" style={{ fontStyle: "normal" }}>
                {brief.whyItMatters}
              </p>
            </section>

            {brief.tacticalQuestions.length > 0 ? (
              <section className="provider-intel-mapping-block" aria-label="Suggested tactical questions">
                <span className="provider-intel-mapping-block-label">Suggested tactical questions</span>
                <ul className="provider-intel-mapping-list">
                  {brief.tacticalQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {current ? (
              <section className="provider-intel-mapping-active" aria-label="Resolve item">
                <p className="provider-intel-mapping-prompt">{current.prompt}</p>
                {intelligenceFieldWhyItMatters(current.dbKey) ? (
                  <ProviderIntelligenceWhyItMatters
                    text={intelligenceFieldWhyItMatters(current.dbKey)!}
                    variant="field"
                  />
                ) : null}
                <div ref={firstControlRef}>
                  <ProviderIntelligenceFieldControl
                    id={`mapping-${current.dbKey}`}
                    field={current.field}
                    value={localValue}
                    onChange={setLocalValue}
                    disabled={busy}
                    omitUnsetCaptureOption
                  />
                </div>
                <div className="provider-intel-mapping-actions" role="group" aria-label="If you can't answer now">
                  <button
                    type="button"
                    className="provider-intel-mapping-action provider-intel-mapping-action--primary"
                    disabled={busy || !hasValue}
                    onClick={() => void handleSaveAndNext()}
                  >
                    {UNRESOLVED_ITEM_ACTION_LABELS.answerNow}
                    {queue.length > 1 ? " & next" : ""}
                  </button>
                  <button
                    type="button"
                    className="provider-intel-mapping-action"
                    disabled={busy}
                    onClick={() => void handleDontKnowYet()}
                  >
                    {UNRESOLVED_ITEM_ACTION_LABELS.dontKnowYet}
                  </button>
                  <button
                    type="button"
                    className="provider-intel-mapping-action"
                    disabled={busy}
                    onClick={() => void handleNotRelevant()}
                  >
                    {UNRESOLVED_ITEM_ACTION_LABELS.notRelevant}
                  </button>
                  <button
                    type="button"
                    className="provider-intel-mapping-action"
                    disabled={busy}
                    onClick={handleSkip}
                  >
                    {UNRESOLVED_ITEM_ACTION_LABELS.skip}
                  </button>
                </div>
              </section>
            ) : null}

            {saveError ? (
              <p className="provider-intel-mapping-empty" style={{ color: "#b91c1c", fontStyle: "normal" }}>
                {saveError}
              </p>
            ) : null}
          </div>

          <footer className="provider-intel-mapping-foot">
            <button
              type="button"
              className="provider-intel-mapping-foot-btn"
              onClick={onClose}
              disabled={busy}
            >
              Save & exit
            </button>
            {current && hasValue ? (
              <button
                type="button"
                className="provider-intel-mapping-foot-btn provider-intel-mapping-foot-btn--primary"
                onClick={() => void handleSaveAndNext()}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save progress"}
              </button>
            ) : null}
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
