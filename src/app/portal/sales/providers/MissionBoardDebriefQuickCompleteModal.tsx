"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { DEBRIEF_JUST_COMPLETE_LABEL } from "@/lib/surgical-sales/debriefEngagementLifecycle";
import { logMissionBoardDebriefPathwayOutcomeFromLauncher } from "@/lib/surgical-sales/missionBoardDebriefLauncherClient";
import {
  MISSION_BOARD_DEBRIEF_COMPLETE_SUCCESS_TOAST,
  MISSION_BOARD_DEBRIEF_DICTATE_COMPLETE_PANEL_TITLE,
  MISSION_BOARD_DEBRIEF_SAVE_COMPLETE_LABEL,
} from "@/lib/surgical-sales/missionBoardDebriefComplete";
import {
  defaultMissionBoardDebriefCompleteForm,
  MissionBoardDebriefCompletePanel,
  type MissionBoardDebriefCompleteFormState,
} from "./MissionBoardDebriefCompletePanel";
import { missionBoardDebriefLauncherCss } from "./missionBoardDebriefLauncherCss";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10052 };

const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(520px, calc(100vw - 24px))",
};

export type MissionBoardDebriefQuickCompleteMode = "dictate_complete" | "just_complete";

export function MissionBoardDebriefQuickCompleteModal({
  provider,
  engagementId,
  mode,
  busy,
  onClose,
  onCompleted,
}: {
  provider: ProviderDirectoryRow;
  engagementId: string;
  mode: MissionBoardDebriefQuickCompleteMode;
  busy?: boolean;
  onClose: () => void;
  onCompleted?: (message?: string) => void | Promise<void>;
}) {
  const providerName = providerDisplayName(provider);
  const isDictateComplete = mode === "dictate_complete";
  const title = isDictateComplete ? MISSION_BOARD_DEBRIEF_DICTATE_COMPLETE_PANEL_TITLE : DEBRIEF_JUST_COMPLETE_LABEL;

  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<MissionBoardDebriefCompleteFormState>(
    defaultMissionBoardDebriefCompleteForm,
  );
  const [error, setError] = React.useState<string | null>(null);
  const disabled = Boolean(busy) || submitting;

  React.useEffect(() => {
    setError(null);
    setForm(defaultMissionBoardDebriefCompleteForm());
  }, [provider.id, mode, engagementId]);

  async function handleSubmit() {
    if (disabled) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await logMissionBoardDebriefPathwayOutcomeFromLauncher(provider.id, {
        outcomeId: form.outcomeId,
        opportunityResult: form.opportunityResult,
        evaluationPath: form.evaluationPath || null,
        dictation: form.dictation,
        nextStep: form.nextStep || null,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      await onCompleted?.(MISSION_BOARD_DEBRIEF_COMPLETE_SUCCESS_TOAST);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${missionBoardDebriefLauncherCss}` }} />
      <div
        style={backdropStyle}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !disabled) onClose();
        }}
      >
        <div
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-board-debrief-quick-complete-title"
          data-testid="mission-board-debrief-quick-complete-modal"
          data-mode={mode}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="mb-debrief-launcher__head">
            <p className="mb-debrief-launcher__kicker">{providerName}</p>
            <h2 id="mission-board-debrief-quick-complete-title" className="mb-debrief-launcher__title">
              {title}
            </h2>
            {provider.primary_organization_name ? (
              <p className="mb-debrief-launcher__org">{provider.primary_organization_name}</p>
            ) : null}
          </header>

          <MissionBoardDebriefCompletePanel
            disabled={disabled}
            saving={submitting}
            error={error}
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel={MISSION_BOARD_DEBRIEF_SAVE_COMPLETE_LABEL}
            cancelLabel="Cancel"
            showDictation={isDictateComplete}
            requireDictation={isDictateComplete}
          />
        </div>
      </div>
    </>
  );
}
