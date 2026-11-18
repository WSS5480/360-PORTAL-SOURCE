"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { sc } from "@/components/sales/salesCommandUi";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import {
  buildCaseIntelligenceSuggestions,
  PROVIDER_INTELLIGENCE_PROMOTE_FIELDS,
  readProviderFieldValue,
  UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL,
  type ProviderIntelligencePromoteFieldId,
  type ProviderIntelligencePromoteMode,
} from "@/lib/surgical-sales/providerIntelligencePromote";
import { updateProviderIntelligenceDrawerCss } from "./updateProviderIntelligenceDrawerCss";
import { userFacingError } from "@/lib/errors/userFacingError";

type FieldDecision = "pending" | "accepted" | "skipped";

type FieldDraft = {
  value: string;
  decision: FieldDecision;
  mode: ProviderIntelligencePromoteMode;
};

function buildInitialDrafts(
  caseRow: Record<string, unknown>,
  provider: Record<string, unknown>,
): Record<ProviderIntelligencePromoteFieldId, FieldDraft> {
  const suggestions = buildCaseIntelligenceSuggestions(caseRow);
  const out = {} as Record<ProviderIntelligencePromoteFieldId, FieldDraft>;
  for (const field of PROVIDER_INTELLIGENCE_PROMOTE_FIELDS) {
    const suggestion = suggestions[field.id];
    out[field.id] = {
      value: suggestion || "",
      decision: "pending",
      mode: readProviderFieldValue(provider, field.providerKey) ? "append" : "replace",
    };
  }
  return out;
}

function PromoteFieldRow({
  fieldId,
  label,
  helper,
  rows,
  currentValue,
  suggestion,
  draft,
  disabled,
  onChange,
}: {
  fieldId: ProviderIntelligencePromoteFieldId;
  label: string;
  helper?: string;
  rows: number;
  currentValue: string | null;
  suggestion: string | null;
  draft: FieldDraft;
  disabled?: boolean;
  onChange: (next: FieldDraft) => void;
}) {
  const hasCurrent = Boolean(currentValue);
  const hasSuggestion = Boolean(suggestion?.trim());
  const isAccepted = draft.decision === "accepted";
  const isSkipped = draft.decision === "skipped";

  return (
    <div className="provider-intel-promote-field" data-status={draft.decision}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 13 }}>{label}</div>
        {helper ? <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{helper}</p> : null}
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.45 }}>
        <span
          style={{
            fontWeight: 800,
            color: "var(--muted)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Current on provider profile
        </span>
        <p style={{ margin: "4px 0 0", color: hasCurrent ? "inherit" : "var(--muted)" }}>{currentValue || "Not documented"}</p>
      </div>

      {hasSuggestion ? (
        <div style={{ fontSize: 12, lineHeight: 1.45 }}>
          <span
            style={{
              fontWeight: 800,
              color: "var(--muted)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Proposed from this case
          </span>
          <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{suggestion}</p>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>No case-derived suggestion for this field.</p>
      )}

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>Value to save (edit before accepting)</span>
        <textarea
          value={draft.value}
          onChange={(event) =>
            onChange({
              ...draft,
              value: event.target.value,
              decision: draft.decision === "skipped" ? "pending" : draft.decision,
            })
          }
          rows={rows}
          disabled={disabled || isSkipped}
          placeholder="Accept to include on the provider profile, or skip this field."
          style={{ ...sc.input, resize: "vertical", fontSize: 13 }}
        />
      </label>

      {hasCurrent && !isSkipped ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name={`${fieldId}-mode`}
              checked={draft.mode === "append"}
              disabled={disabled || isSkipped}
              onChange={() => onChange({ ...draft, mode: "append" })}
            />
            Append to profile
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name={`${fieldId}-mode`}
              checked={draft.mode === "replace"}
              disabled={disabled || isSkipped}
              onChange={() => onChange({ ...draft, mode: "replace" })}
            />
            Replace on profile
          </label>
        </div>
      ) : null}

      <div className="provider-intel-promote-field-actions">
        <button
          type="button"
          style={isAccepted ? sc.btnPrimary : sc.btnSecondary}
          disabled={disabled || isSkipped || !draft.value.trim()}
          onClick={() => onChange({ ...draft, decision: "accepted", value: draft.value.trim() })}
        >
          {isAccepted ? "Accepted" : "Accept"}
        </button>
        {hasSuggestion ? (
          <button
            type="button"
            style={sc.btnSecondary}
            disabled={disabled || isSkipped}
            onClick={() => onChange({ ...draft, decision: "pending", value: suggestion!.trim() })}
          >
            Use case suggestion
          </button>
        ) : null}
        <button
          type="button"
          style={sc.btnGhost}
          disabled={disabled}
          onClick={() =>
            onChange({
              ...draft,
              decision: isSkipped ? "pending" : "skipped",
            })
          }
        >
          {isSkipped ? "Skipped" : "Skip"}
        </button>
      </div>
    </div>
  );
}

export function UpdateProviderIntelligenceModal({
  open,
  caseId,
  caseRow,
  providerId,
  providerName,
  onClose,
  onSaved,
}: {
  open: boolean;
  caseId: string;
  caseRow: Record<string, unknown>;
  providerId: string;
  providerName: string;
  onClose: () => void;
  onSaved: (next: ProviderIntelligenceSnapshot, message: string) => void;
}) {
  const [providerRow, setProviderRow] = useState<Record<string, unknown> | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [drafts, setDrafts] = useState<Record<ProviderIntelligencePromoteFieldId, FieldDraft>>(() =>
    buildInitialDrafts(caseRow, {}),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => buildCaseIntelligenceSuggestions(caseRow), [caseRow]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let cancelled = false;
    setLoadingProvider(true);
    void (async () => {
      try {
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; provider?: Record<string, unknown>; error?: string };
        if (cancelled) return;
        if (!res.ok || !j.ok || !j.provider) {
          throw new Error(typeof j.error === "string" ? j.error : "Could not load provider profile");
        }
        setProviderRow(j.provider);
        setDrafts(buildInitialDrafts(caseRow, j.provider));
      } catch (e: unknown) {
        if (!cancelled) {
          setError(userFacingError(e, "Could not load provider profile"));
          setProviderRow(null);
        }
      } finally {
        if (!cancelled) setLoadingProvider(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, caseRow, providerId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const acceptedCount = PROVIDER_INTELLIGENCE_PROMOTE_FIELDS.filter(
    (f) => drafts[f.id].decision === "accepted" && drafts[f.id].value.trim(),
  ).length;

  const save = async () => {
    const updates = PROVIDER_INTELLIGENCE_PROMOTE_FIELDS.filter((f) => {
      const d = drafts[f.id];
      return d.decision === "accepted" && d.value.trim();
    }).map((f) => ({
      field_id: f.id,
      confirmed: true as const,
      value: drafts[f.id].value.trim(),
      mode: drafts[f.id].mode,
    }));

    if (updates.length === 0) {
      setError("Accept at least one field to update the provider profile, or cancel.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/promote-provider-intelligence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        },
      );
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        provider_intelligence?: ProviderIntelligenceSnapshot;
        updated_fields?: string[];
      };
      if (!res.ok || !j.ok || !j.provider_intelligence) {
        throw new Error(typeof j.error === "string" ? j.error : "Could not update provider intelligence");
      }
      const labels = j.updated_fields?.length ? j.updated_fields.join(", ") : "provider profile";
      onSaved(j.provider_intelligence, `Updated ${labels} for ${providerName}.`);
      onClose();
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not update provider intelligence"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="provider-intel-promote-title"
      className="provider-intel-promote-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: updateProviderIntelligenceDrawerCss }} />
      <div className="provider-intel-promote-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="provider-intel-promote-drawer-head">
          <div>
            <h2 id="provider-intel-promote-title" style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              {UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
              Promote learnings from this case to {providerName}&apos;s profile. Review each field — accept, edit, or
              skip. Nothing is saved until you confirm.
            </p>
          </div>
          <button type="button" style={{ ...sc.btnSecondary, minWidth: 44, minHeight: 44 }} onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="provider-intel-promote-drawer-body">
          {loadingProvider ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Loading provider profile…</p>
          ) : null}
          {PROVIDER_INTELLIGENCE_PROMOTE_FIELDS.map((field) => (
            <PromoteFieldRow
              key={field.id}
              fieldId={field.id}
              label={field.label}
              helper={field.helper}
              rows={field.rows}
              currentValue={providerRow ? readProviderFieldValue(providerRow, field.providerKey) : null}
              suggestion={suggestions[field.id]}
              draft={drafts[field.id]}
              disabled={busy || loadingProvider}
              onChange={(next) => setDrafts((prev) => ({ ...prev, [field.id]: next }))}
            />
          ))}
          {error ? (
            <p role="alert" style={{ ...sc.alertError, margin: 0 }}>
              {error}
            </p>
          ) : null}
        </div>

        <footer className="provider-intel-promote-drawer-foot">
          <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            style={sc.btnPrimary}
            onClick={() => void save()}
            disabled={busy || loadingProvider || acceptedCount === 0}
          >
            {busy
              ? "Saving…"
              : loadingProvider
                ? "Loading profile…"
                : acceptedCount > 0
                  ? `Save ${acceptedCount} accepted field${acceptedCount === 1 ? "" : "s"}`
                  : "Accept fields to save"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export { UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL };
