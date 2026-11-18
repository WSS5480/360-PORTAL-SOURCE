"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  fetchMissionBoardCommitmentModal,
  saveMissionBoardCommitment,
} from "@/lib/surgical-sales/missionBoardCommitmentOutcomesClient";
import type { MissionBoardCommitmentModalView } from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";
import { MISSION_BOARD_STRUCTURED_USE_COMMITMENT_DESCRIPTION } from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";
import { missionBoardEvaluationPathCss } from "./missionBoardEvaluationPathCss";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10052 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(480px, calc(100vw - 24px))",
};

export function MissionBoardCommitmentModal({
  provider,
  busy,
  onClose,
  onSaved,
}: {
  provider: ProviderDirectoryRow;
  busy?: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  const providerName = providerDisplayName(provider);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<MissionBoardCommitmentModalView | null>(null);
  const disabled = Boolean(busy) || saving || loading;

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await fetchMissionBoardCommitmentModal(provider.id);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setView(null);
      } else {
        setView(result.view);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  async function handleSave() {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveMissionBoardCommitment({
        providerId: provider.id,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${missionBoardEvaluationPathCss}` }} />
      <div
        style={backdropStyle}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !disabled) onClose();
        }}
      >
        <div
          className="mission-board-evaluation-path-modal"
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-board-commitment-title"
          data-testid="mission-board-commitment-modal"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <header className="mb-eval-path__head">
            <p className="mb-eval-path__kicker">{providerName}</p>
            <h2 id="mission-board-commitment-title" className="mb-eval-path__title">
              Confirm Structured Use
            </h2>
            {view?.organizationName ? <p className="mb-eval-path__org">{view.organizationName}</p> : null}
          </header>

          {loading ? (
            <p className="mb-eval-path__context-text" role="status">
              Loading…
            </p>
          ) : (
            <div className="mission-board-evaluation-path-modal">
              <section className="mb-eval-path__context">
                <p className="mb-eval-path__context-label">Commitment</p>
                <p className="mb-eval-path__context-text">{MISSION_BOARD_STRUCTURED_USE_COMMITMENT_DESCRIPTION}</p>
              </section>
              {view?.evaluationPath ? (
                <section className="mb-eval-path__context">
                  <p className="mb-eval-path__context-label">Evaluation completed via</p>
                  <p className="mb-eval-path__context-text">{view.evaluationPath}</p>
                </section>
              ) : null}
            </div>
          )}

          {error ? <p className="mb-eval-path__error">{error}</p> : null}

          <div className="surgical-case-modal-actions">
            <button type="button" className="sc-btn sc-btn--ghost" disabled={disabled} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--primary"
              data-testid="mission-board-commitment-save"
              disabled={disabled}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Confirm structured use"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
