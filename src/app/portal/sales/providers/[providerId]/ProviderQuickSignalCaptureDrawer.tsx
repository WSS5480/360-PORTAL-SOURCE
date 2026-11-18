"use client";

import React from "react";
import { createPortal, flushSync } from "react-dom";
import { ProviderIntelligenceFieldControl } from "@/components/sales/ProviderIntelligenceFieldControl";
import {
  intelligenceSectionIdForDbKey,
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  wizardFieldFromIntelligenceDef,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  buildIntelligenceCapturePriorities,
  fieldHasIntelligenceSignal,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildDiscoveryMappingQuestionView } from "@/lib/surgical-sales/buildDiscoveryMappingQuestionView";
import { assignProviderSupportContact } from "@/lib/surgical-sales/assignProviderSupportContact";
import {
  emptySupportContactDraft,
  workflowShouldOfferSupportContactSave,
} from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { persistRapidDiscoveryAnswer } from "@/lib/surgical-sales/persistRapidDiscoveryAnswer";
import {
  buildObservationAccessCredentialingPrerequisitePatch,
  OBSERVATION_FEASIBILITY_DB_KEY,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import {
  OBSERVATION_ACCESS_DISCOVERY_MAPPING_OPTIONS,
  operationalStatusForObservationAccessChoice,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { providerQuickSignalCaptureCss } from "./providerQuickSignalCaptureCss";
import { rapidDiscoverySupportContactCss } from "./rapidDiscoverySupportContactCss";
import {
  RapidDiscoverySupportContactPanel,
  supportContactDraftReady,
} from "./RapidDiscoverySupportContactPanel";

const FIELD_DEF_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));

export type QuickSignalCaptureTarget = {
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
};

export function buildQuickSignalCaptureTarget(
  sectionId: ProviderIntelligenceSectionId,
  dbKey: string | undefined,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
): QuickSignalCaptureTarget | null {
  if (dbKey) {
    const resolved = intelligenceSectionIdForDbKey(dbKey) ?? sectionId;
    if (!FIELD_DEF_BY_KEY.has(dbKey)) return null;
    return { dbKey, sectionId: resolved };
  }

  const priority = buildIntelligenceCapturePriorities(contact, planning, 8).find(
    (p) => p.sectionId === sectionId,
  );
  if (!priority) return null;
  return { dbKey: priority.dbKey, sectionId };
}

export function ProviderQuickSignalCaptureDrawer({
  open,
  target,
  contact,
  providerId,
  organizationId,
  organizationName,
  relatedContacts,
  contactPool,
  planning,
  relationshipStage,
  engagements,
  planDraft,
  setPlanDraft,
  saving,
  saveError,
  onSave,
  onProviderUpdated,
  onClose,
}: {
  open: boolean;
  target: QuickSignalCaptureTarget | null;
  contact: Record<string, unknown>;
  providerId: string;
  organizationId?: string | null;
  organizationName?: string | null;
  relatedContacts?: Record<string, unknown>[];
  contactPool?: Record<string, unknown>[];
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  planDraft: Record<string, string>;
  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  saveError?: string | null;
  onSave: () => Promise<void>;
  onProviderUpdated?: (provider: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [localValue, setLocalValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [supportDraft, setSupportDraft] = React.useState(() =>
    emptySupportContactDraft({ dbKey: "", organizationId: organizationId ?? null }),
  );
  const firstControlRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  const dbKey = target?.dbKey ?? "";
  const sectionId = target?.sectionId ?? null;
  const def = dbKey ? FIELD_DEF_BY_KEY.get(dbKey) : undefined;
  const field = def ? wizardFieldFromIntelligenceDef(def) : null;
  const offersSupportContact = Boolean(
    dbKey && workflowShouldOfferSupportContactSave(dbKey, field?.label ?? field?.helper),
  );

  const mergedContact = React.useMemo(() => ({ ...contact, ...planDraft }), [contact, planDraft]);

  const mappingView = React.useMemo(() => {
    if (!dbKey) return null;
    return buildDiscoveryMappingQuestionView({
      dbKey,
      contact: mergedContact,
      planning,
      relationshipStage,
      engagements,
    });
  }, [dbKey, mergedContact, planning, relationshipStage, engagements]);

  const captureOptionsOverride =
    dbKey === "provider_observation_feasibility" ? OBSERVATION_ACCESS_DISCOVERY_MAPPING_OPTIONS : undefined;

  React.useEffect(() => {
    if (!open || !dbKey) return;
    const fromDraft = planDraft[dbKey];
    const fromContact = contact[dbKey];
    setLocalValue(
      fromDraft !== undefined && fromDraft !== ""
        ? fromDraft
        : String(fromContact ?? "").trim(),
    );
    setSupportDraft(emptySupportContactDraft({ dbKey, organizationId: organizationId ?? null }));
  }, [open, dbKey, planDraft, contact, organizationId]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const focusable = firstControlRef.current?.querySelector<HTMLElement>(
        "button, input, textarea, select",
      );
      focusable?.focus();
    }, 80);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const pool = React.useMemo(() => {
    const byId = new Map<string, Record<string, unknown>>();
    for (const c of [...(relatedContacts ?? []), ...(contactPool ?? [])]) {
      const id = String(c.id ?? "").trim();
      if (id) byId.set(id, c);
    }
    return [...byId.values()];
  }, [relatedContacts, contactPool]);

  const useSupportContactSave =
    offersSupportContact && supportContactDraftReady(supportDraft);

  const canSave =
    Boolean(field) &&
    (useSupportContactSave ||
      fieldHasIntelligenceSignal(dbKey, localValue) ||
      localValue.trim() !== String(contact[dbKey] ?? "").trim());

  async function handleSave() {
    if (!dbKey || !field || submitting) return;
    setSubmitting(true);
    try {
      if (useSupportContactSave) {
        const { provider, linked } = await assignProviderSupportContact({
          providerId,
          dbKey,
          draft: supportDraft,
          sourceLabel: "Field capture",
        });
        flushSync(() => {
          setPlanDraft((prev) => ({ ...prev, [dbKey]: linked.intelligenceValue }));
        });
        onProviderUpdated?.(provider);
        onClose();
        return;
      }

      if (dbKey === OBSERVATION_FEASIBILITY_DB_KEY && localValue.trim()) {
        const trimmed = localValue.trim();
        const isConditional = trimmed.toLowerCase() === "credentialing_required";
        const prerequisitePatch = buildObservationAccessCredentialingPrerequisitePatch(trimmed);
        const provider = await persistRapidDiscoveryAnswer({
          providerId,
          dbKey,
          value: prerequisitePatch[OBSERVATION_FEASIBILITY_DB_KEY] ?? trimmed,
          operationalStatus: operationalStatusForObservationAccessChoice(trimmed),
          additionalPlanning: isConditional
            ? {
                provider_observation_credentialing_needed:
                  prerequisitePatch.provider_observation_credentialing_needed ?? "required",
              }
            : undefined,
          fieldAccessBlockers: isConditional
            ? { [OBSERVATION_FEASIBILITY_DB_KEY]: "credentialing_required" }
            : undefined,
        });
        flushSync(() => {
          setPlanDraft((prev) => ({ ...prev, [dbKey]: localValue.trim() }));
        });
        onProviderUpdated?.(provider);
        onClose();
        return;
      }

      flushSync(() => {
        setPlanDraft((prev) => ({ ...prev, [dbKey]: localValue }));
      });
      await onSave();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !open || !target || !field || !sectionId || !mappingView) return null;

  const busy = saving || submitting;
  const sectionLabel = PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId];

  return createPortal(
    <>
      <style>{providerQuickSignalCaptureCss}</style>
      {offersSupportContact ? <style>{rapidDiscoverySupportContactCss}</style> : null}
      <div
        className="provider-intel-quick-signal-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="provider-intel-quick-signal-drawer provider-intel-quick-signal-drawer--mapping"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provider-quick-signal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="provider-intel-quick-signal-head">
            <div className="provider-intel-quick-signal-head-row">
              <div>
                <h2 id="provider-quick-signal-title" className="provider-intel-quick-signal-title">
                  {mappingView.title}
                </h2>
                <p className="provider-intel-quick-signal-kicker">{mappingView.categoryChip}</p>
              </div>
              <button
                type="button"
                className="provider-intel-quick-signal-close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
          </header>

          <div className="provider-intel-quick-signal-body">
            <section
              className={`dmq-state dmq-state--${mappingView.currentState.maturitySlug}`}
              aria-labelledby="dmq-state-title"
            >
              <div className="dmq-state-head">
                <h3 id="dmq-state-title" className="dmq-section-title">
                  Current intelligence
                </h3>
                <span className={`dmq-status-chip dmq-status-chip--${mappingView.currentState.maturitySlug}`}>
                  {mappingView.currentState.maturityLabel}
                </span>
              </div>
              <p className="dmq-state-summary">{mappingView.currentState.summary}</p>
            </section>

            {mappingView.evidence ? (
              <section className="dmq-evidence" aria-labelledby="dmq-evidence-title">
                <h3 id="dmq-evidence-title" className="dmq-section-title">
                  Evidence from field activity
                </h3>
                <blockquote className="dmq-evidence-quote">
                  &ldquo;{mappingView.evidence.quote}&rdquo;
                </blockquote>
                <p className="dmq-evidence-source">
                  <span className="dmq-evidence-source-kicker">Source</span>
                  {mappingView.evidence.sourceLabel}
                </p>
              </section>
            ) : null}

            {mappingView.conditionalWorkflow?.conditionBlocker ? (
              <section className="dmq-workflow" aria-labelledby="dmq-workflow-title">
                <h3 id="dmq-workflow-title" className="dmq-section-title">
                  Condition / blocker
                </h3>
                <p className="dmq-state-summary">{mappingView.conditionalWorkflow.conditionBlocker}</p>
                <p className="dmq-evidence-source">
                  <span className="dmq-evidence-source-kicker">Next step</span>
                  {mappingView.conditionalWorkflow.nextStep}
                </p>
              </section>
            ) : null}

            {mappingView.repQuestion ? (
              <section className="dmq-question" aria-labelledby="dmq-question-title">
                <h3 id="dmq-question-title" className="dmq-section-title">
                  Rep validation question
                </h3>
                <p className="dmq-question-text">{mappingView.repQuestion}</p>
              </section>
            ) : null}

            <section className="dmq-picks" aria-labelledby="dmq-picks-title">
              <h3 id="dmq-picks-title" className="dmq-section-title">
                Quick picks
              </h3>
              {offersSupportContact ? (
                <RapidDiscoverySupportContactPanel
                  dbKey={dbKey}
                  providerId={providerId}
                  organizationId={organizationId ?? null}
                  organizationName={organizationName}
                  existingContacts={pool}
                  draft={supportDraft}
                  onDraftChange={setSupportDraft}
                  disabled={busy}
                  defaultExpanded
                  title="Save as support contact"
                  hint="Reusable on provider, organization, cases, and engagements"
                />
              ) : null}
              <div className="provider-intel-quick-signal-field" ref={firstControlRef}>
                <ProviderIntelligenceFieldControl
                  id={`quick-signal-${dbKey}`}
                  field={field}
                  value={localValue}
                  onChange={setLocalValue}
                  disabled={busy || useSupportContactSave}
                  omitUnsetCaptureOption
                  captureOptionsOverride={captureOptionsOverride}
                  selectOnly={Boolean(captureOptionsOverride)}
                  variant="rapid"
                />
              </div>
            </section>

            {mappingView.whyItMatters ? (
              <section className="dmq-why" aria-labelledby="dmq-why-title">
                <h3 id="dmq-why-title" className="dmq-why-title">
                  Why it matters
                </h3>
                <p className="dmq-why-text">{mappingView.whyItMatters}</p>
              </section>
            ) : null}

            {saveError ? (
              <p className="provider-intel-quick-signal-helper" style={{ color: "#b91c1c" }}>
                {saveError}
              </p>
            ) : null}
          </div>

          <footer className="provider-intel-quick-signal-foot">
            <button
              type="button"
              className="provider-intel-quick-signal-cancel"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="provider-intel-quick-signal-save"
              onClick={() => void handleSave()}
              disabled={busy || !canSave}
            >
              {busy ? "Saving…" : useSupportContactSave ? "Save contact" : "Save & return"}
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
