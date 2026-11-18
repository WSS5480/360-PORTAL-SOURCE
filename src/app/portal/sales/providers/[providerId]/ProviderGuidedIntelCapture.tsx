"use client";

import React from "react";
import { createPortal, flushSync } from "react-dom";
import {
  fieldHasIntelligenceSignal,
  shouldAutoAdvanceRapidDiscoveryAnswer,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { IntelligenceDiscoveryStance } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import {
  buildGuidedIntelCaptureAudienceCounts,
  buildGuidedIntelCaptureProgress,
  buildGuidedIntelCaptureQueue,
  reorderGuidedIntelCaptureQueue,
  buildGuidedIntelCaptureSessionEnd,
  GUIDED_INTEL_ACTION_LABELS,
  GUIDED_INTEL_CAPTURE,
  type GuidedIntelCaptureQuestion,
  type GuidedIntelCaptureSessionEnd,
} from "@/lib/surgical-sales/providerGuidedIntelCapture";
import { discoveryProviderDisplayName } from "@/lib/surgical-sales/discoveryPromptPersonalization";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import {
  ORGANIZATION_INHERITANCE_LABELS,
  type OrganizationInheritanceStance,
} from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import {
  DISCOVERY_STAKEHOLDER_PATH_OPTIONS,
  type IntelligenceDiscoveryStakeholder,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import {
  buildDiscoveryAnswerImpact,
  type DiscoveryAnswerImpact,
} from "@/lib/surgical-sales/discoveryLiveUpdate";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import { providerGuidedIntelCaptureCss } from "./providerGuidedIntelCaptureCss";
import { IntelligenceSaveConfirmation } from "@/components/sales/intelligenceCapture/IntelligenceSaveConfirmation";
import {
  RapidDiscoveryAnswerComposer,
  defaultOperationalStatusForAnswer,
  supportContactDraftReady,
} from "./RapidDiscoveryAnswerComposer";
import { emptySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { rapidDiscoveryInvolvesSupportContact } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { assignProviderSupportContact } from "@/lib/surgical-sales/assignProviderSupportContact";
import { persistRapidDiscoveryAnswer } from "@/lib/surgical-sales/persistRapidDiscoveryAnswer";
import type { RapidDiscoveryOperationalStatus } from "@/lib/surgical-sales/rapidDiscoveryOperationalStatus";
import { operationalStatusToDiscoveryStance } from "@/lib/surgical-sales/rapidDiscoveryOperationalStatus";

export function ProviderGuidedIntelCapture({
  open,
  contact,
  planning,
  fieldMetadata,
  planDraft,
  setPlanDraft,
  saving,
  saveError,
  providerId,
  maturitySnapshot,
  emphasizeDbKey,
  discoveryStakeholder = "unspecified",
  organizationBaseline,
  organizationName,
  organizationId,
  relatedContacts = [],
  onDiscoveryStakeholderChange,
  onSave,
  onClose,
  onProviderUpdated,
  onAnswerApplied,
}: {
  open: boolean;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  planDraft: Record<string, string>;
  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  saveError?: string | null;
  providerId: string;
  maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
  emphasizeDbKey?: string;
  discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  organizationName?: string | null;
  organizationId?: string | null;
  relatedContacts?: Record<string, unknown>[];
  onDiscoveryStakeholderChange?: (stakeholder: IntelligenceDiscoveryStakeholder) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  onProviderUpdated?: (provider: Record<string, unknown>) => void;
  onAnswerApplied?: (input: {
    dbKey: string;
    value: string;
    beforeContact: Record<string, unknown>;
    afterContact: Record<string, unknown>;
  }) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [phase, setPhase] = React.useState<"active" | "summary">("active");
  const [localValue, setLocalValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sessionIndex, setSessionIndex] = React.useState(0);
  const [skippedDbKeys, setSkippedDbKeys] = React.useState<string[]>([]);
  const [dontKnowYetDbKeys, setDontKnowYetDbKeys] = React.useState<string[]>([]);
  const [notRelevantDbKeys, setNotRelevantDbKeys] = React.useState<string[]>([]);
  const [answeredDbKeys, setAnsweredDbKeys] = React.useState<string[]>([]);
  const [sessionEnd, setSessionEnd] = React.useState<GuidedIntelCaptureSessionEnd | null>(null);
  const [lastImpact, setLastImpact] = React.useState<DiscoveryAnswerImpact | null>(null);
  const [impactPulse, setImpactPulse] = React.useState(0);
  const baselineRef = React.useRef<Record<string, unknown>>({ ...contact, ...planDraft });
  const sessionTotalRef = React.useRef(0);
  const controlRef = React.useRef<HTMLDivElement>(null);
  const userInteractedRef = React.useRef(false);
  const [selectionConfirmed, setSelectionConfirmed] = React.useState(false);
  const [inheritedAction, setInheritedAction] = React.useState<"exception" | null>(null);
  const [sessionId, setSessionId] = React.useState(0);
  const [queuePrioritization, setQueuePrioritization] = React.useState<{
    status: "idle" | "loading" | "ready";
    orderedDbKeys: string[] | null;
  }>({ status: "idle", orderedDbKeys: null });
  const prioritizeFetchRef = React.useRef(0);
  const [operationalStatus, setOperationalStatus] =
    React.useState<RapidDiscoveryOperationalStatus>("unknown");
  const [supportContactDraft, setSupportContactDraft] = React.useState(() =>
    emptySupportContactDraft({ dbKey: "", organizationId: organizationId ?? null }),
  );
  const [linkedSupportContactName, setLinkedSupportContactName] = React.useState<string | null>(null);

  React.useEffect(() => setMounted(true), []);

  const mergedContact = React.useMemo(() => ({ ...contact, ...planDraft }), [contact, planDraft]);

  const providerDisplayName = React.useMemo(
    () => discoveryProviderDisplayName(contact),
    [contact],
  );

  const excludeDbKeys = React.useMemo(
    () => new Set([...skippedDbKeys, ...dontKnowYetDbKeys, ...notRelevantDbKeys]),
    [skippedDbKeys, dontKnowYetDbKeys, notRelevantDbKeys],
  );

  const audienceCounts = React.useMemo(
    () =>
      buildGuidedIntelCaptureAudienceCounts(mergedContact, {
        planning,
        fieldMetadata,
        maturitySnapshot,
        organizationBaseline,
      }),
    [mergedContact, planning, fieldMetadata, maturitySnapshot, organizationBaseline],
  );

  const baseQueue: GuidedIntelCaptureQuestion[] = React.useMemo(
    () =>
      buildGuidedIntelCaptureQueue(mergedContact, {
        planning,
        maturitySnapshot,
        discoveryStakeholder,
        organizationBaseline,
        providerDisplayName,
        emphasizeDbKey: sessionIndex === 0 ? emphasizeDbKey : undefined,
        excludeDbKeys,
      }),
    [
      mergedContact,
      planning,
      maturitySnapshot,
      discoveryStakeholder,
      organizationBaseline,
      providerDisplayName,
      emphasizeDbKey,
      sessionIndex,
      excludeDbKeys,
    ],
  );

  const prioritizeReady = queuePrioritization.status === "ready";

  function resetSession(options?: { emphasize?: string }) {
    baselineRef.current = { ...contact, ...planDraft };
    const initialQueue = buildGuidedIntelCaptureQueue(
      { ...contact, ...planDraft },
      {
        planning,
        maturitySnapshot,
        discoveryStakeholder,
        organizationBaseline,
        providerDisplayName,
        emphasizeDbKey: options?.emphasize ?? emphasizeDbKey,
      },
    );
    sessionTotalRef.current = initialQueue.length;
    setSessionId((id) => id + 1);
    setPhase("active");
    setSessionIndex(0);
    setSkippedDbKeys([]);
    setDontKnowYetDbKeys([]);
    setNotRelevantDbKeys([]);
    setAnsweredDbKeys([]);
    setSessionEnd(null);
    setLastImpact(null);
  }

  React.useEffect(() => {
    if (!open) {
      setQueuePrioritization({ status: "idle", orderedDbKeys: null });
      return;
    }
    resetSession({ emphasize: emphasizeDbKey });
  }, [open, emphasizeDbKey, discoveryStakeholder]);

  React.useEffect(() => {
    if (!open || sessionId === 0) return;
    if (baseQueue.length === 0) {
      setQueuePrioritization({ status: "ready", orderedDbKeys: null });
      return;
    }

    const fetchId = ++prioritizeFetchRef.current;
    setQueuePrioritization({ status: "loading", orderedDbKeys: null });

    const controller = new AbortController();
    const questionsSnapshot = baseQueue.slice(0, 30).map((q) => ({
      dbKey: q.dbKey,
      fieldLabel: q.fieldLabel,
      proposedScope: q.proposedScope,
      priorityScore: q.priorityScore,
    }));

    const commitReady = (orderedDbKeys: string[] | null) => {
      if (fetchId !== prioritizeFetchRef.current) return;
      setQueuePrioritization({ status: "ready", orderedDbKeys });
    };

    void fetch("/api/portal/sales/intelligence/rapid-discovery/prioritize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        providerName: providerDisplayName,
        facilityName: organizationName ?? null,
        discoveryStakeholder,
        questions: questionsSnapshot,
      }),
    })
      .then((r) => r.json())
      .then((j: { ok?: boolean; ordered_db_keys?: string[] }) => {
        const keys =
          j.ok && j.ordered_db_keys?.length ? j.ordered_db_keys : null;
        commitReady(keys);
      })
      .catch(() => commitReady(null));

    return () => controller.abort();
    // baseQueue captured when sessionId bumps — not when answers shrink the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionId gates a fresh snapshot
  }, [sessionId, discoveryStakeholder, organizationName, providerDisplayName]);

  const queue = React.useMemo(() => {
    if (!prioritizeReady) return [];
    const { orderedDbKeys } = queuePrioritization;
    return orderedDbKeys
      ? reorderGuidedIntelCaptureQueue(baseQueue, orderedDbKeys)
      : baseQueue;
  }, [baseQueue, queuePrioritization, prioritizeReady]);

  const current = queue[0] ?? null;

  function recordImpact(input: {
    dbKey: string;
    value: string;
    beforeContact: Record<string, unknown>;
    afterContact: Record<string, unknown>;
    operationalStatus: RapidDiscoveryOperationalStatus;
    linkedSupportContactName: string | null;
  }) {
    const impact = buildDiscoveryAnswerImpact({
      dbKey: input.dbKey,
      value: input.value,
      beforeContact: input.beforeContact,
      afterContact: input.afterContact,
      planning,
      fieldMetadata,
      discoveryStakeholder,
      organizationName,
      operationalStatus: input.operationalStatus,
      linkedSupportContactName: input.linkedSupportContactName,
    });
    if (impact) {
      setLastImpact(impact);
      setImpactPulse((n) => n + 1);
    }
    onAnswerApplied?.(input);
  }

  React.useEffect(() => {
    if (!open || !current) return;
    userInteractedRef.current = false;
    setSelectionConfirmed(false);
    setInheritedAction(null);
    const initial =
      planDraft[current.dbKey] !== undefined && planDraft[current.dbKey] !== ""
        ? planDraft[current.dbKey]
        : String(contact[current.dbKey] ?? "").trim();
    setLocalValue(initial);
    setOperationalStatus(
      defaultOperationalStatusForAnswer(fieldHasIntelligenceSignal(current.dbKey, initial)),
    );
    setSupportContactDraft(
      emptySupportContactDraft({ dbKey: current.dbKey, organizationId: organizationId ?? null }),
    );
    setLinkedSupportContactName(null);
  }, [open, current?.dbKey, planDraft, contact, organizationId]);

  const showInheritedPanel =
    current?.discoveryMode === "inherited_organization" && inheritedAction === null;
  const showFieldControl = !showInheritedPanel;
  const autoAdvanceField =
    current && showFieldControl ? shouldAutoAdvanceRapidDiscoveryAnswer(current.field) : false;

  const sessionTouched =
    answeredDbKeys.length > 0 ||
    skippedDbKeys.length > 0 ||
    dontKnowYetDbKeys.length > 0 ||
    notRelevantDbKeys.length > 0;

  function finishSession(options?: { early?: boolean }) {
    const early = options?.early ?? false;
    const end = buildGuidedIntelCaptureSessionEnd({
      baseline: baselineRef.current,
      current: { ...contact, ...planDraft },
      answeredDbKeys,
      skippedDbKeys,
      dontKnowYetDbKeys,
      notRelevantDbKeys,
      sessionTotal: sessionTotalRef.current,
      remainingQueueLength: queue.length,
      exitedEarly: early,
      planning,
      fieldMetadata,
      maturitySnapshot,
      discoveryStakeholder,
      organizationBaseline,
    });
    setSessionEnd(end);
    setPhase("summary");
  }

  function handleDoneForNow() {
    if (submitting) return;
    finishSession({ early: true });
  }

  function handleDismiss() {
    if (phase === "active" && sessionTouched) {
      finishSession({ early: true });
      return;
    }
    onClose();
  }

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      controlRef.current?.querySelector<HTMLElement>("button, input, textarea, select")?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, current?.dbKey, phase]);

  React.useEffect(() => {
    if (!open || phase !== "active") return;
    if (queue.length === 0 && sessionTouched) {
      finishSession({ early: false });
    }
  }, [open, phase, queue.length, sessionTouched]);

  async function persistDiscoveryStance(
    dbKey: string,
    stance: IntelligenceDiscoveryStance,
    options?: { uncertaintyKind?: "unexplored" | "opaque" },
  ) {
    const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intelligence_discovery_stances: {
          [dbKey]: { stance, uncertainty_kind: options?.uncertaintyKind },
        },
      }),
    });
    const j = (await res.json()) as { ok?: boolean; provider?: Record<string, unknown> };
    if (res.ok && j.provider) onProviderUpdated?.(j.provider);
  }

  function advanceSession(dbKey: string, bucket: "skip" | "dont_know" | "not_relevant") {
    if (bucket === "skip") setSkippedDbKeys((prev) => [...prev, dbKey]);
    if (bucket === "dont_know") setDontKnowYetDbKeys((prev) => [...prev, dbKey]);
    if (bucket === "not_relevant") setNotRelevantDbKeys((prev) => [...prev, dbKey]);
    setSessionIndex((i) => i + 1);
  }

  function handleSkip() {
    if (!current || submitting) return;
    advanceSession(current.dbKey, "skip");
  }

  async function handleOperationalUnknown() {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      const stance = operationalStatusToDiscoveryStance("unknown");
      await persistDiscoveryStance(current.dbKey, stance.stance, {
        uncertaintyKind: stance.uncertaintyKind,
      });
      advanceSession(current.dbKey, "dont_know");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNotRelevant() {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await persistDiscoveryStance(current.dbKey, "not_relevant");
      advanceSession(current.dbKey, "not_relevant");
    } finally {
      setSubmitting(false);
    }
  }

  const persistOrganizationInheritance = React.useCallback(
    async (stance: OrganizationInheritanceStance, providerValue?: string | null) => {
      if (!current || submitting || saving) return;
      setSubmitting(true);
      try {
        const beforeContact = { ...contact, ...planDraft };
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_inheritance_resolutions: {
              [current.dbKey]: {
                stance,
                provider_value: providerValue ?? null,
                facility_display_line: current.inheritedDisplayLine,
                facility_value: current.inheritedBaselineValue,
              },
            },
          }),
        });
        const j = (await res.json()) as { ok?: boolean; provider?: Record<string, unknown>; error?: string };
        if (!res.ok || !j.provider) {
          throw new Error(j.error ?? "");
        }
        const patchValue = j.provider[current.dbKey];
        const valueStr = patchValue != null && patchValue !== "" ? String(patchValue) : "";
        flushSync(() => {
          setPlanDraft((prev) => {
            const next = { ...prev };
            if (valueStr) next[current.dbKey] = valueStr;
            else delete next[current.dbKey];
            return next;
          });
        });
        const afterContact = { ...j.provider, ...planDraft };
        onProviderUpdated?.(j.provider);
        recordImpact({
          dbKey: current.dbKey,
          value: valueStr,
          beforeContact,
          afterContact,
          operationalStatus,
          linkedSupportContactName,
        });
        setAnsweredDbKeys((prev) => [...prev, current.dbKey]);
        setSessionIndex((i) => i + 1);
        userInteractedRef.current = false;
        setSelectionConfirmed(false);
        setInheritedAction(null);
      } finally {
        setSubmitting(false);
      }
    },
    [
      current,
      submitting,
      saving,
      providerId,
      contact,
      planDraft,
      onProviderUpdated,
      setPlanDraft,
      planning,
      fieldMetadata,
      discoveryStakeholder,
      organizationName,
    ],
  );

  const handleAnswer = React.useCallback(async () => {
    if (!current || submitting || saving) return;
    if (inheritedAction === "exception") {
      if (!fieldHasIntelligenceSignal(current.dbKey, localValue)) return;
      await persistOrganizationInheritance("exception", localValue);
      return;
    }

    const involvesContact = rapidDiscoveryInvolvesSupportContact(current.dbKey, current.prompt);
    const canSaveWithoutValue = operationalStatus === "unknown";
    if (!canSaveWithoutValue && !fieldHasIntelligenceSignal(current.dbKey, localValue)) return;

    setSubmitting(true);
    try {
      const beforeContact = { ...contact, ...planDraft };
      let valueToSave = localValue.trim();
      let contactName = linkedSupportContactName;

      let updatedProvider: Record<string, unknown>;

      if (involvesContact && supportContactDraftReady(supportContactDraft)) {
        const linkedResult = await assignProviderSupportContact({
          providerId,
          dbKey: current.dbKey,
          draft: supportContactDraft,
          sourceLabel: "Rapid Discovery",
        });
        updatedProvider = linkedResult.provider;
        valueToSave = linkedResult.linked.intelligenceValue;
        contactName = linkedResult.linked.displayName;
        setLinkedSupportContactName(linkedResult.linked.displayName);
        flushSync(() => {
          setLocalValue(valueToSave);
          setPlanDraft((prev) => ({ ...prev, [current.dbKey]: valueToSave }));
        });
        onProviderUpdated?.(updatedProvider);
      } else {
        flushSync(() => {
          setPlanDraft((prev) => ({ ...prev, [current.dbKey]: valueToSave }));
        });
        updatedProvider = await persistRapidDiscoveryAnswer({
          providerId,
          dbKey: current.dbKey,
          value: valueToSave,
          operationalStatus,
        });
        onProviderUpdated?.(updatedProvider);
      }
      await onSave();

      const afterContact = { ...updatedProvider, ...planDraft, [current.dbKey]: valueToSave };
      recordImpact({
        dbKey: current.dbKey,
        value: valueToSave,
        beforeContact,
        afterContact,
        operationalStatus,
        linkedSupportContactName: contactName,
      });
      setAnsweredDbKeys((prev) => [...prev, current.dbKey]);
      setSessionIndex((i) => i + 1);
      userInteractedRef.current = false;
      setSelectionConfirmed(false);
    } finally {
      setSubmitting(false);
    }
  }, [
    current,
    submitting,
    saving,
    localValue,
    contact,
    planDraft,
    onSave,
    setPlanDraft,
    inheritedAction,
    persistOrganizationInheritance,
    operationalStatus,
    supportContactDraft,
    linkedSupportContactName,
    providerId,
    onProviderUpdated,
  ]);

  const busy = saving || submitting;

  React.useEffect(() => {
    if (!open || phase !== "active" || !current || busy || !showFieldControl) return;
    if (!userInteractedRef.current || !selectionConfirmed) return;
    if (!fieldHasIntelligenceSignal(current.dbKey, localValue)) return;
    if (!shouldAutoAdvanceRapidDiscoveryAnswer(current.field)) return;

    const timer = window.setTimeout(() => {
      void handleAnswer();
    }, 420);
    return () => window.clearTimeout(timer);
  }, [open, phase, current, localValue, selectionConfirmed, busy, showFieldControl, handleAnswer]);

  function handleLocalChange(next: string) {
    userInteractedRef.current = true;
    setLocalValue(next);
    if (current) {
      setSelectionConfirmed(fieldHasIntelligenceSignal(current.dbKey, next));
    }
  }

  if (!mounted || !open) return null;

  const hasValue = current ? fieldHasIntelligenceSignal(current.dbKey, localValue) : false;

  const progress =
    phase === "active" && current
      ? buildGuidedIntelCaptureProgress({
          sessionTotal: sessionTotalRef.current,
          queueLength: queue.length,
          discoveryStakeholder,
          audienceCategory: current.audienceCategory,
          sectionId: current.sectionId,
        })
      : null;

  const summaryTitle =
    sessionEnd && !sessionEnd.exitedEarly && sessionEnd.remainingCount === 0
      ? GUIDED_INTEL_CAPTURE.sessionComplete
      : GUIDED_INTEL_CAPTURE.pausedTitle;

  return createPortal(
    <>
      <style>{providerGuidedIntelCaptureCss}</style>
      <div
        className="provider-guided-intel-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-intel-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) handleDismiss();
        }}
      >
        <div className="provider-guided-intel-shell" onClick={(e) => e.stopPropagation()}>
          <header className="provider-guided-intel-top">
            <div className="provider-guided-intel-top-row">
              <h2 id="guided-intel-title" className="provider-guided-intel-title">
                {phase === "summary" ? summaryTitle : GUIDED_INTEL_CAPTURE.altName}
              </h2>
              <button
                type="button"
                className="provider-guided-intel-close"
                aria-label="Close"
                onClick={handleDismiss}
              >
                ×
              </button>
            </div>
            {phase === "active" && progress ? (
              <div className="provider-guided-intel-progress-block">
                <p className="provider-guided-intel-progress-question" aria-live="polite">
                  Question {progress.currentQuestionNumber} of {progress.sessionTotal}
                </p>
                <div
                  className={`provider-guided-intel-progress-track${impactPulse > 0 ? " provider-guided-intel-progress-track--pulse" : ""}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.progressPercent}
                  aria-label="Session progress"
                >
                  <span
                    className="provider-guided-intel-progress-fill"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>
                {onDiscoveryStakeholderChange ? (
                  <div
                    className="provider-guided-intel-scope-chips"
                    role="group"
                    aria-label="Intelligence scope"
                  >
                    {DISCOVERY_STAKEHOLDER_PATH_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`provider-guided-intel-scope-chip${discoveryStakeholder === opt.id ? " provider-guided-intel-scope-chip--active" : ""}`}
                        disabled={busy}
                        aria-pressed={discoveryStakeholder === opt.id}
                        onClick={() => onDiscoveryStakeholderChange(opt.id)}
                      >
                        {opt.shortLabel}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </header>

          {phase === "summary" && sessionEnd ? (
            <div className="provider-guided-intel-summary">
              {sessionEnd.savedByScope.length > 0 ? (
                <IntelligenceSaveConfirmation
                  groups={sessionEnd.savedByScope}
                  title={null}
                  className="provider-guided-intel-save-confirmation"
                />
              ) : null}

              <ul className="provider-guided-intel-exit-stats" aria-label="Session summary">
                {sessionEnd.exitSummaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              {lastImpact ? (
                <div className="provider-guided-intel-impact provider-guided-intel-impact--summary">
                  <span className="provider-guided-intel-impact-line">
                    {sanitizeIntelligenceTabUserCopy(lastImpact.feedbackLine)}
                  </span>
                  <span className="provider-guided-intel-impact-detail">
                    {sanitizeIntelligenceTabUserCopy(lastImpact.scanSummaryLine)}
                  </span>
                </div>
              ) : null}

              <p className="provider-guided-intel-progress-label">
                {sanitizeIntelligenceTabUserCopy(sessionEnd.readinessLine)}
              </p>

              {sessionEnd.remainingBlockers.length > 0 ? (
                <div className="provider-guided-intel-summary-block">
                  <span className="provider-guided-intel-summary-kicker">
                    {GUIDED_INTEL_CAPTURE.leftForLater}
                  </span>
                  <ul className="provider-guided-intel-summary-list">
                    {sessionEnd.remainingBlockers.map((line) => (
                      <li key={line}>{sanitizeIntelligenceTabUserCopy(line)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {sessionEnd.recommendedNext ? (
                <div className="provider-guided-intel-summary-block">
                  <span className="provider-guided-intel-summary-kicker">{GUIDED_INTEL_CAPTURE.recommendedNext}</span>
                  <p className="provider-guided-intel-why-panel">
                    {sanitizeIntelligenceTabUserCopy(sessionEnd.recommendedNext)}
                  </p>
                </div>
              ) : null}

              <div className="provider-guided-intel-actions" style={{ borderTop: "none", padding: 0 }}>
                {sessionEnd.remainingCount > 0 ? (
                  <button
                    type="button"
                    className="provider-guided-intel-action provider-guided-intel-action--primary"
                    onClick={() => {
                      setPhase("active");
                      setSessionEnd(null);
                    }}
                  >
                    {GUIDED_INTEL_CAPTURE.continueDiscovery}
                  </button>
                ) : null}
                <button type="button" className="provider-guided-intel-action" onClick={onClose}>
                  {GUIDED_INTEL_CAPTURE.done}
                </button>
              </div>
            </div>
          ) : !prioritizeReady ? (
            <div className="provider-guided-intel-body">
              <p className="provider-guided-intel-prompt provider-guided-intel-prompt--loading">
                Preparing questions…
              </p>
            </div>
          ) : current ? (
            <>
              {showInheritedPanel ? (
                <div className="provider-guided-intel-body">
                  <div
                    className="provider-guided-intel-inherited"
                    role="group"
                    aria-label="Inherited facility intelligence"
                  >
                    <p className="provider-guided-intel-prompt">
                      {sanitizeIntelligenceTabUserCopy(
                        current.inheritedDisplayLine ?? current.prompt,
                      )}
                    </p>
                    <div className="provider-guided-intel-inherited-actions">
                      <button
                        type="button"
                        className="provider-guided-intel-inherited-btn provider-guided-intel-inherited-btn--primary"
                        disabled={busy}
                        onClick={() => void persistOrganizationInheritance("applies")}
                      >
                        {busy ? "Saving…" : ORGANIZATION_INHERITANCE_LABELS.appliesToProvider}
                      </button>
                      <button
                        type="button"
                        className="provider-guided-intel-inherited-btn"
                        disabled={busy}
                        onClick={() => void persistOrganizationInheritance("does_not_apply")}
                      >
                        {ORGANIZATION_INHERITANCE_LABELS.doesNotApply}
                      </button>
                      <button
                        type="button"
                        className="provider-guided-intel-inherited-btn"
                        disabled={busy}
                        onClick={() => {
                          setInheritedAction("exception");
                          setLocalValue("");
                          setSelectionConfirmed(false);
                        }}
                      >
                        {ORGANIZATION_INHERITANCE_LABELS.providerException}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div ref={controlRef}>
                <RapidDiscoveryAnswerComposer
                  current={current}
                  localValue={localValue}
                  onLocalChange={handleLocalChange}
                  operationalStatus={operationalStatus}
                  onOperationalStatusChange={setOperationalStatus}
                  showFieldControl={showFieldControl}
                  inheritedHint={
                    inheritedAction === "exception" ? ORGANIZATION_INHERITANCE_LABELS.exceptionHint : null
                  }
                  supportContactDraft={supportContactDraft}
                  onSupportContactDraftChange={setSupportContactDraft}
                  showSupportContact={rapidDiscoveryInvolvesSupportContact(
                    current.dbKey,
                    current.prompt,
                  )}
                  organizationId={organizationId ?? null}
                  organizationName={organizationName}
                  providerId={providerId}
                  relatedContacts={relatedContacts}
                  lastImpact={lastImpact}
                  impactPulse={impactPulse}
                  saveError={saveError}
                  busy={busy}
                  showInheritedPanel={showInheritedPanel}
                  onSaveAndNext={() => void handleAnswer()}
                  onSkip={handleSkip}
                  onNotRelevant={() => void handleNotRelevant()}
                  onOperationalUnknown={() => void handleOperationalUnknown()}
                  onDoneForNow={handleDoneForNow}
                />
              </div>

              {showInheritedPanel ? (
                <footer className="provider-guided-intel-actions">
                  <button
                    type="button"
                    className="provider-guided-intel-action provider-guided-intel-action--primary"
                    disabled={busy}
                    onClick={() => void handleAnswer()}
                  >
                    {busy ? "Saving…" : GUIDED_INTEL_ACTION_LABELS.saveAndNext}
                  </button>
                </footer>
              ) : null}
            </>
          ) : (
            <div className="provider-guided-intel-summary">
              <p>{GUIDED_INTEL_CAPTURE.emptyScope}</p>
              <div className="provider-guided-intel-actions" style={{ borderTop: "none", padding: 0 }}>
                {onDiscoveryStakeholderChange ? (
                  <p className="provider-guided-intel-progress-map" style={{ margin: 0 }}>
                    Switch scope above, or close — nothing required.
                  </p>
                ) : null}
                <button type="button" className="provider-guided-intel-action" onClick={onClose}>
                  {GUIDED_INTEL_CAPTURE.done}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
