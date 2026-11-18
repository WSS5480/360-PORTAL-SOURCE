"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import {
  createMissionBoardCase,
  missionBoardObservationDefaultDate,
  type MissionBoardCaseType,
} from "@/lib/surgical-sales/missionBoardFastObservation";
import { resolveMissionBoardObservationProcedureSuggestions } from "@/lib/surgical-sales/resolveMissionBoardObservationProcedureSuggestions";
import { cleanProcedureSuggestions } from "@/lib/surgical-sales/quickAddProcedureSuggestions";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { userFacingError } from "@/lib/errors/userFacingError";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 200000 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(440px, calc(100vw - 24px))",
};

const mobileFitCss = `
@media (max-width: 699px) {
  .mission-board-add-case-backdrop {
    position: fixed !important;
    inset: 0 !important;
    align-items: stretch !important;
    justify-content: center !important;
    padding: 8px !important;
    z-index: 200000 !important;
    min-height: 100dvh !important;
  }

  .mission-board-add-case-panel {
    width: 100% !important;
    max-width: none !important;
    max-height: calc(100dvh - 16px) !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 14px !important;
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto !important;
    overflow: hidden !important;
  }

  .mission-board-add-case-title {
    margin: 0 !important;
    padding: 12px 14px 10px !important;
    font-size: 16px !important;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  }

  .mission-board-add-case-body {
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 12px 14px 4px;
  }

  .mission-board-add-case-body [data-mission-case-field] {
    margin-bottom: 10px !important;
  }

  .mission-board-add-case-actions {
    position: sticky;
    bottom: 0;
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px !important;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px)) !important;
    border-top: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    backdrop-filter: blur(10px);
  }

  .mission-board-add-case-actions button {
    width: 100%;
    min-height: 40px !important;
  }

  .mission-board-add-case-actions--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
`;

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
  fontSize: 14,
  fontFamily: "inherit",
  background: "var(--surface)",
  color: "var(--foreground)",
};

const readOnlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: "color-mix(in srgb, var(--foreground) 4%, var(--surface))",
  color: "var(--foreground)",
};

const typeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 16,
};

const typeButtonStyle = (selected: boolean): React.CSSProperties => ({
  display: "grid",
  gap: 6,
  justifyItems: "center",
  padding: "14px 10px",
  borderRadius: 10,
  border: selected
    ? "2px solid color-mix(in srgb, var(--brand-600) 55%, var(--border))"
    : "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
  background: selected
    ? "color-mix(in srgb, var(--brand-600) 10%, var(--surface))"
    : "var(--surface)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 800,
  color: "var(--foreground)",
});

const suggestionSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  marginTop: 10,
};

const suggestionHelperStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "var(--muted)",
  fontWeight: 500,
};

const chipRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const chipStyle: React.CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
  background: "color-mix(in srgb, var(--brand-600) 8%, var(--surface))",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  color: "var(--foreground)",
};

const CASE_TYPE_OPTIONS: Array<{ id: MissionBoardCaseType; label: string; description: string }> = [
  {
    id: "observation",
    label: "Observation",
    description: "OR observation case for pathway intelligence",
  },
  {
    id: "product_support",
    label: "Product Support",
    description: "Coverage or product support case",
  },
];

type NewCaseDefaultsPayload = {
  procedure_suggestions?: string[];
};

export function MissionBoardAddCaseModal({
  provider,
  initialCaseType = null,
  busy,
  error,
  onClose,
  onSave,
}: {
  provider: ProviderDirectoryRow;
  initialCaseType?: MissionBoardCaseType | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}) {
  const directCaseType = initialCaseType ?? null;
  const [step, setStep] = React.useState<"choose_type" | "details">(
    directCaseType ? "details" : "choose_type",
  );
  const [caseType, setCaseType] = React.useState<MissionBoardCaseType | null>(directCaseType);
  const [caseDate, setCaseDate] = React.useState("");
  const [procedure, setProcedure] = React.useState("");
  const [note, setNote] = React.useState("");
  const [markComplete, setMarkComplete] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [defaults, setDefaults] = React.useState<NewCaseDefaultsPayload | null>(null);

  const providerLabel = providerDisplayName(provider);
  const organizationLabel = provider.primary_organization_name?.trim() || "No organization";
  const organizationId = String(
    provider.primary_organization_id || provider.organization_id || provider.account_id || "",
  ).trim();

  const procedureSuggestions = React.useMemo(() => {
    const providerSuggestions = resolveMissionBoardObservationProcedureSuggestions(provider as Record<string, unknown>);
    const providerLabels = new Set(providerSuggestions.map((suggestion) => suggestion.label.toLowerCase()));
    const userSuggestions = cleanProcedureSuggestions(defaults?.procedure_suggestions ?? [])
      .filter((label) => !providerLabels.has(label.toLowerCase()))
      .map((label) => ({ label, sourceHint: "Suggested from your recent cases" }));
    // Recent typed case procedures first so the last observation/product case procedure is recommended.
    return [...userSuggestions, ...providerSuggestions].slice(0, 6);
  }, [defaults?.procedure_suggestions, provider]);

  React.useEffect(() => {
    if (step !== "details") {
      setDefaults(null);
      return;
    }
    let cancelled = false;
    const u = new URL("/api/portal/sales/surgical-cases/new-defaults", window.location.origin);
    if (organizationId) u.searchParams.set("account_id", organizationId);
    if (provider.id) u.searchParams.set("surgeon_contact_id", provider.id);
    void (async () => {
      try {
        const res = await fetch(u.toString(), { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; defaults?: NewCaseDefaultsPayload };
        if (!cancelled) setDefaults(res.ok && j.ok ? j.defaults ?? null : null);
      } catch {
        if (!cancelled) setDefaults(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, provider.id, step]);

  React.useEffect(() => {
    setStep(directCaseType ? "details" : "choose_type");
    setCaseType(directCaseType);
    setCaseDate(missionBoardObservationDefaultDate());
    setProcedure("");
    setNote("");
    setMarkComplete(false);
    setLocalError(null);
  }, [directCaseType, provider.id]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose, saving]);

  function handleChooseType(type: MissionBoardCaseType) {
    setCaseType(type);
    setStep("details");
    setLocalError(null);
  }

  async function handleSave() {
    if (busy || saving || !caseType) return;
    if (!caseDate.trim()) {
      setLocalError("Date is required.");
      return;
    }
    if (!organizationId) {
      setLocalError("Provider organization is required.");
      return;
    }

    setSaving(true);
    setLocalError(null);
    try {
      await createMissionBoardCase({
        caseType,
        providerId: provider.id,
        accountId: organizationId,
        caseDate: caseDate.trim(),
        procedureType: procedure,
        note,
        markComplete,
      });
      await onSave();
    } catch (err) {
      setLocalError(userFacingError(err, "Could not create case."));
    } finally {
      setSaving(false);
    }
  }

  const displayError = localError || error;
  const isBusy = busy || saving;
  const caseTypeLabel =
    caseType === "product_support" ? "product support case" : "observation case";

  return (
    <div
      className="mission-board-add-case-backdrop"
      style={backdropStyle}
      onMouseDown={(e) => e.target === e.currentTarget && !isBusy && onClose()}
    >
      <div
        className="mission-board-add-case-panel"
        style={panelStyle}
        role="dialog"
        aria-modal
        aria-labelledby="mission-board-add-case-title"
        data-testid="mission-board-add-case-modal"
      >
        <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${mobileFitCss}` }} />
        <h2
          className="mission-board-add-case-title"
          id="mission-board-add-case-title"
          style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          {step === "choose_type" ? "Add case" : `Add ${caseTypeLabel}`}
        </h2>

        {step === "choose_type" ? (
          <>
            <div className="mission-board-add-case-body">
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
                Choose the case type for {providerLabel}.
              </p>
              <div style={typeGridStyle} role="group" aria-label="Case type">
                {CASE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    style={typeButtonStyle(caseType === option.id)}
                    data-testid={`mission-board-case-type-${option.id}`}
                    disabled={isBusy}
                    onClick={() => handleChooseType(option.id)}
                  >
                    <span>{option.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="case-modal-actions mission-board-add-case-actions">
              <button type="button" style={sc.btnGhost} disabled={isBusy} onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mission-board-add-case-body">
              <div style={fieldStyle} data-mission-case-field>
                <span style={labelStyle}>Provider</span>
                <div style={readOnlyStyle}>{providerLabel}</div>
              </div>

              <div style={fieldStyle} data-mission-case-field>
                <span style={labelStyle}>Facility</span>
                <div style={readOnlyStyle}>{organizationLabel}</div>
              </div>

              <label style={fieldStyle} htmlFor="mission-board-case-date" data-mission-case-field>
                <span style={labelStyle}>Date</span>
                <input
                  id="mission-board-case-date"
                  type="date"
                  style={inputStyle}
                  value={caseDate}
                  onChange={(e) => setCaseDate(e.target.value)}
                  disabled={isBusy}
                  required
                />
              </label>

              <div style={fieldStyle} data-mission-case-field>
                <label style={labelStyle} htmlFor="mission-board-case-procedure">
                  Procedure
                </label>
                <input
                  id="mission-board-case-procedure"
                  type="text"
                  style={inputStyle}
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  disabled={isBusy}
                  placeholder="Procedure or case type"
                />
                {procedureSuggestions.length > 0 ? (
                  <div style={suggestionSectionStyle}>
                    <span style={labelStyle}>Suggested procedures</span>
                    <p style={suggestionHelperStyle}>Suggested from provider intelligence and your recent cases</p>
                    <div style={chipRowStyle} role="list" aria-label="Suggested procedures">
                      {procedureSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.label}
                          type="button"
                          style={chipStyle}
                          disabled={isBusy}
                          title={suggestion.sourceHint ?? "Suggested from captured provider intelligence"}
                          onClick={() => setProcedure(suggestion.label)}
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <label style={fieldStyle} htmlFor="mission-board-case-note" data-mission-case-field>
                <span style={labelStyle}>Quick note</span>
                <textarea
                  id="mission-board-case-note"
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isBusy}
                  rows={3}
                  placeholder="Optional"
                />
              </label>

            {caseType === "observation" ? (
              <label
                data-mission-case-field
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={markComplete}
                  disabled={isBusy}
                  onChange={(e) => setMarkComplete(e.target.checked)}
                />
                Mark observation complete
              </label>
            ) : null}

            {displayError ? (
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#b91c1c" }}>{displayError}</p>
            ) : null}
            </div>

            <div
              className={`case-modal-actions mission-board-add-case-actions${
                !directCaseType ? " mission-board-add-case-actions--three" : ""
              }`}
            >
              {!directCaseType ? (
                <button
                  type="button"
                  style={sc.btnGhost}
                  disabled={isBusy}
                  onClick={() => {
                    setStep("choose_type");
                    setLocalError(null);
                  }}
                >
                  Back
                </button>
              ) : null}
              <button type="button" style={sc.btnGhost} disabled={isBusy} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                style={sc.btnPrimary}
                disabled={isBusy}
                data-testid="mission-board-case-save"
                onClick={() => void handleSave()}
              >
                {isBusy ? "Saving…" : "Save Case"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
