"use client";

import React from "react";
import { ProviderIntelligenceFieldControl } from "@/components/sales/ProviderIntelligenceFieldControl";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { DiscoveryAnswerImpact } from "@/lib/surgical-sales/discoveryLiveUpdate";
import type { GuidedIntelCaptureQuestion } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import { GUIDED_INTEL_ACTION_LABELS } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import {
  defaultOperationalStatusForAnswer,
  RAPID_DISCOVERY_OPERATIONAL_STATUSES,
  RAPID_DISCOVERY_OPERATIONAL_STATUS_LABELS,
  type RapidDiscoveryOperationalStatus,
} from "@/lib/surgical-sales/rapidDiscoveryOperationalStatus";
import { rapidDiscoveryInvolvesSupportContact } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  RapidDiscoverySupportContactPanel,
  supportContactDraftReady,
} from "./RapidDiscoverySupportContactPanel";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";

export function RapidDiscoveryAnswerComposer({
  current,
  localValue,
  onLocalChange,
  operationalStatus,
  onOperationalStatusChange,
  showFieldControl,
  inheritedHint,
  supportContactDraft,
  onSupportContactDraftChange,
  showSupportContact,
  organizationId,
  organizationName,
  providerId,
  relatedContacts,
  lastImpact,
  impactPulse,
  saveError,
  busy,
  showInheritedPanel,
  onSaveAndNext,
  onSkip,
  onNotRelevant,
  onOperationalUnknown,
  onDoneForNow,
}: {
  current: GuidedIntelCaptureQuestion;
  localValue: string;
  onLocalChange: (value: string) => void;
  operationalStatus: RapidDiscoveryOperationalStatus;
  onOperationalStatusChange: (status: RapidDiscoveryOperationalStatus) => void;
  showFieldControl: boolean;
  inheritedHint?: string | null;
  supportContactDraft: RapidDiscoverySupportContactDraft;
  onSupportContactDraftChange: (draft: RapidDiscoverySupportContactDraft) => void;
  showSupportContact: boolean;
  organizationId: string | null;
  organizationName?: string | null;
  providerId: string;
  relatedContacts: Record<string, unknown>[];
  lastImpact: DiscoveryAnswerImpact | null;
  impactPulse: number;
  saveError?: string | null;
  busy: boolean;
  showInheritedPanel: boolean;
  onSaveAndNext: () => void;
  onSkip: () => void;
  onNotRelevant: () => void;
  onOperationalUnknown: () => void;
  onDoneForNow: () => void;
}) {
  const hasValue = fieldHasIntelligenceSignal(current.dbKey, localValue);
  const involvesContact = showSupportContact || rapidDiscoveryInvolvesSupportContact(current.dbKey, current.prompt);

  React.useEffect(() => {
    if (hasValue && operationalStatus === "unknown") {
      onOperationalStatusChange("in_progress");
    }
  }, [hasValue, operationalStatus, onOperationalStatusChange]);

  return (
    <>
      <div className="provider-guided-intel-body">
        <div className="provider-guided-intel-question-zone">
          <p className="provider-guided-intel-section-kicker">Intelligence</p>
          <p className="provider-guided-intel-prompt">{sanitizeIntelligenceTabUserCopy(current.prompt)}</p>

          {showFieldControl ? (
            <div className="provider-guided-intel-control">
              {inheritedHint ? (
                <p className="provider-guided-intel-inherited-hint">{inheritedHint}</p>
              ) : null}
              <ProviderIntelligenceFieldControl
                id={`guided-intel-${current.dbKey}`}
                field={current.field}
                value={localValue}
                onChange={onLocalChange}
                disabled={busy}
                omitUnsetCaptureOption
                variant="rapid"
              />
            </div>
          ) : null}

          {involvesContact ? (
            <RapidDiscoverySupportContactPanel
              dbKey={current.dbKey}
              providerId={providerId}
              organizationId={organizationId}
              organizationName={organizationName}
              existingContacts={relatedContacts}
              draft={supportContactDraft}
              onDraftChange={onSupportContactDraftChange}
              disabled={busy}
            />
          ) : null}

          <div className="rd-operational">
            <p className="provider-guided-intel-section-kicker">Operational status</p>
            <div className="rd-operational-chips" role="group" aria-label="Operational classification">
              {RAPID_DISCOVERY_OPERATIONAL_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`rd-operational-chip rd-operational-chip--${status}${
                    operationalStatus === status ? " rd-operational-chip--active" : ""
                  }`}
                  disabled={busy}
                  aria-pressed={operationalStatus === status}
                  onClick={() => onOperationalStatusChange(status)}
                >
                  {RAPID_DISCOVERY_OPERATIONAL_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          {lastImpact?.pathwayImpact?.lines.length ? (
            <div key={impactPulse} className="rd-pathway-impact" aria-live="polite">
              <p className="provider-guided-intel-section-kicker">Pathway impact</p>
              <ul className="rd-pathway-impact-list">
                {lastImpact.pathwayImpact.lines.map((line) => (
                  <li key={line}>{sanitizeIntelligenceTabUserCopy(line)}</li>
                ))}
              </ul>
              {lastImpact.requirementLink ? (
                <p className="rd-pathway-req">
                  {lastImpact.requirementLink.requirementLabel} →{" "}
                  <strong>{lastImpact.requirementLink.statusLabel}</strong>
                  {lastImpact.requirementLink.contextLine
                    ? ` · ${sanitizeIntelligenceTabUserCopy(lastImpact.requirementLink.contextLine)}`
                    : null}
                </p>
              ) : null}
            </div>
          ) : null}

          {lastImpact ? (
            <div className="provider-guided-intel-impact" aria-live="polite">
              <span className="provider-guided-intel-impact-line">{lastImpact.feedbackLine}</span>
              {lastImpact.operationalStatusLabel ? (
                <span className="provider-guided-intel-impact-status">
                  {lastImpact.operationalStatusLabel}
                </span>
              ) : null}
              <span className="provider-guided-intel-impact-detail">{lastImpact.scanSummaryLine}</span>
            </div>
          ) : null}

          {saveError ? <p className="provider-guided-intel-error">{saveError}</p> : null}
        </div>
      </div>

      <footer className="provider-guided-intel-actions">
        {showFieldControl && !showInheritedPanel ? (
          <button
            type="button"
            className="provider-guided-intel-action provider-guided-intel-action--primary"
            disabled={busy || (operationalStatus !== "unknown" && !hasValue)}
            onClick={onSaveAndNext}
          >
            {busy ? "Saving…" : GUIDED_INTEL_ACTION_LABELS.saveAndNext}
          </button>
        ) : null}

        <div className="provider-guided-intel-secondary-row" role="group" aria-label="Other actions">
          <button
            type="button"
            className="provider-guided-intel-stance"
            disabled={busy}
            onClick={onOperationalUnknown}
          >
            Leave unknown
          </button>
          <button type="button" className="provider-guided-intel-stance" disabled={busy} onClick={onSkip}>
            {GUIDED_INTEL_ACTION_LABELS.skip}
          </button>
          <button
            type="button"
            className="provider-guided-intel-stance"
            disabled={busy}
            onClick={onNotRelevant}
          >
            {GUIDED_INTEL_ACTION_LABELS.notRelevant}
          </button>
        </div>

        <button
          type="button"
          className="provider-guided-intel-done-for-now"
          disabled={busy}
          onClick={onDoneForNow}
        >
          Done for now
        </button>
      </footer>
    </>
  );
}

export { defaultOperationalStatusForAnswer, supportContactDraftReady };
