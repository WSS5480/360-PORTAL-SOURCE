"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import {
  createMissionBoardObservationCase,
  missionBoardObservationDefaultDate,
} from "@/lib/surgical-sales/missionBoardFastObservation";
import { resolveMissionBoardObservationProcedureSuggestions } from "@/lib/surgical-sales/resolveMissionBoardObservationProcedureSuggestions";
import { cleanProcedureSuggestions } from "@/lib/surgical-sales/quickAddProcedureSuggestions";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { userFacingError } from "@/lib/errors/userFacingError";

type NewCaseDefaultsPayload = {
  procedure_suggestions?: string[] | null;
};

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10046 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(440px, calc(100vw - 24px))",
};

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

export function MissionBoardFastObservationModal({
  provider,
  busy,
  error,
  onClose,
  onSave,
}: {
  provider: ProviderDirectoryRow;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}) {
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
    const providerSuggestions = resolveMissionBoardObservationProcedureSuggestions(
      provider as Record<string, unknown>,
    );
    const providerLabels = new Set(providerSuggestions.map((suggestion) => suggestion.label.toLowerCase()));
    const recentCaseSuggestions = cleanProcedureSuggestions(defaults?.procedure_suggestions ?? [])
      .filter((label) => !providerLabels.has(label.toLowerCase()))
      .map((label) => ({ label, sourceHint: "Suggested from your recent cases" }));
    // Recent typed case procedures first so the last observation/product case procedure is recommended.
    return [...recentCaseSuggestions, ...providerSuggestions].slice(0, 6);
  }, [defaults?.procedure_suggestions, provider]);

  React.useEffect(() => {
    setCaseDate(missionBoardObservationDefaultDate());
    setProcedure("");
    setNote("");
    setMarkComplete(false);
    setLocalError(null);
  }, [provider.id]);

  React.useEffect(() => {
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
  }, [organizationId, provider.id]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose, saving]);

  async function handleSave() {
    if (busy || saving) return;
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
      await createMissionBoardObservationCase({
        providerId: provider.id,
        accountId: organizationId,
        caseDate: caseDate.trim(),
        procedureType: procedure,
        note,
        markComplete,
      });
      await onSave();
    } catch (err) {
      setLocalError(userFacingError(err, "Could not create observation case."));
    } finally {
      setSaving(false);
    }
  }

  const displayError = localError || error;
  const isBusy = busy || saving;

  return (
    <div
      style={backdropStyle}
      onMouseDown={(e) => e.target === e.currentTarget && !isBusy && onClose()}
    >
      <div
        style={panelStyle}
        role="dialog"
        aria-modal
        aria-labelledby="mission-board-observation-case-title"
        data-testid="mission-board-observation-case-modal"
      >
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />
        <h2
          id="mission-board-observation-case-title"
          style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          Add observation
        </h2>

        <div style={fieldStyle}>
          <span style={labelStyle}>Provider</span>
          <div style={readOnlyStyle}>{providerLabel}</div>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Facility</span>
          <div style={readOnlyStyle}>{organizationLabel}</div>
        </div>

        <label style={fieldStyle} htmlFor="mission-board-observation-date">
          <span style={labelStyle}>Date</span>
          <input
            id="mission-board-observation-date"
            type="date"
            style={inputStyle}
            value={caseDate}
            onChange={(e) => setCaseDate(e.target.value)}
            disabled={isBusy}
            required
          />
        </label>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="mission-board-observation-procedure">
            Procedure
          </label>
          <input
            id="mission-board-observation-procedure"
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
              <p style={suggestionHelperStyle}>Suggested from your recent cases and provider intelligence</p>
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

        <label style={fieldStyle} htmlFor="mission-board-observation-note">
          <span style={labelStyle}>Quick note</span>
          <textarea
            id="mission-board-observation-note"
            style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isBusy}
            rows={3}
            placeholder="Optional"
          />
        </label>

        <label
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

        {displayError ? (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#b91c1c" }}>{displayError}</p>
        ) : null}

        <div className="case-modal-actions">
          <button type="button" style={sc.btnGhost} disabled={isBusy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={sc.btnPrimary}
            disabled={isBusy}
            data-testid="mission-board-observation-case-save"
            onClick={() => void handleSave()}
          >
            {isBusy ? "Saving…" : "Save Observation"}
          </button>
        </div>
      </div>
    </div>
  );
}
