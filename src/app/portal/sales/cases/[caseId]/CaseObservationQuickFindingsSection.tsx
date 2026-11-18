"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import {
  OBSERVATION_QUICK_FINDING_FIELDS,
  observationKeyFindingNotePatch,
  observationQuickFindingsFromCaseRow,
  observationQuickFindingsPatch,
  type ObservationQuickFindingKey,
  type ObservationQuickFindingValue,
  type ObservationQuickFindingsDraft,
} from "@/lib/surgical-sales/observationQuickFindings";
import { patchObservationCase } from "./caseObservationPatch";
import { userFacingError } from "@/lib/errors/userFacingError";

const AUTOSAVE_MS = 900;

function QuickFindingRow({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: ObservationQuickFindingValue;
  options: readonly NonNullable<ObservationQuickFindingValue>[];
  disabled?: boolean;
  onChange: (next: ObservationQuickFindingValue) => void;
}) {
  return (
    <div className="case-obs-overview-finding-row">
      <p className="case-obs-overview-finding-label">{label}</p>
      <div className="case-obs-overview-finding-options">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="case-obs-overview-finding-option"
            data-selected={value === option ? "true" : "false"}
            disabled={disabled}
            onClick={() => onChange(value === option ? null : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CaseObservationQuickFindingsSection({
  caseId,
  caseRow,
  disabled,
  excludeKeys = [],
  onCasePatched,
  onMessage,
  variant = "default",
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  excludeKeys?: ObservationQuickFindingKey[];
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onMessage: (message: string) => void;
  variant?: "default" | "onsite";
}) {
  const exclude = React.useMemo(() => new Set(excludeKeys), [excludeKeys]);
  const fields = OBSERVATION_QUICK_FINDING_FIELDS.filter((field) => !exclude.has(field.key));

  const [findings, setFindings] = React.useState<ObservationQuickFindingsDraft>(() =>
    observationQuickFindingsFromCaseRow(caseRow),
  );
  const [findingsSavingKey, setFindingsSavingKey] = React.useState<ObservationQuickFindingKey | "key_finding_note" | null>(
    null,
  );
  const [keyFindingNote, setKeyFindingNote] = React.useState(() =>
    String(observationQuickFindingsFromCaseRow(caseRow).key_finding_note ?? ""),
  );
  const keyFindingSaveTimerRef = React.useRef<number | null>(null);
  const keyFindingSavedValueRef = React.useRef(keyFindingNote);

  React.useEffect(() => {
    const next = observationQuickFindingsFromCaseRow(caseRow);
    setFindings(next);
    setKeyFindingNote(next.key_finding_note);
    keyFindingSavedValueRef.current = next.key_finding_note;
  }, [
    caseRow.live_observation_product_fit,
    caseRow.observation_quick_finding_product_interest,
    caseRow.debrief_product_opportunity_identified,
    caseRow.live_observation_competitors,
    caseRow.live_observation_staff_process,
    caseRow.follow_up_needed,
    caseRow.debrief_key_findings,
  ]);

  async function saveFinding(key: ObservationQuickFindingKey, value: ObservationQuickFindingValue) {
    if (disabled) return;
    setFindings((prev) => ({ ...prev, [key]: value }));
    setFindingsSavingKey(key);
    try {
      const saved = await patchObservationCase(caseId, observationQuickFindingsPatch(key, value));
      onCasePatched(saved);
    } catch (error: unknown) {
      setFindings(observationQuickFindingsFromCaseRow(caseRow));
      onMessage(userFacingError(error, "Could not save finding"));
    } finally {
      setFindingsSavingKey(null);
    }
  }

  const queueKeyFindingSave = React.useCallback(
    (nextValue: string) => {
      if (keyFindingSaveTimerRef.current != null) window.clearTimeout(keyFindingSaveTimerRef.current);
      keyFindingSaveTimerRef.current = window.setTimeout(() => {
        void (async () => {
          if (disabled || nextValue === keyFindingSavedValueRef.current) return;
          setFindingsSavingKey("key_finding_note");
          try {
            const saved = await patchObservationCase(caseId, observationKeyFindingNotePatch(nextValue));
            keyFindingSavedValueRef.current = nextValue;
            onCasePatched(saved);
          } catch (error: unknown) {
            onMessage(userFacingError(error, "Could not save key finding"));
          } finally {
            setFindingsSavingKey(null);
          }
        })();
      }, AUTOSAVE_MS);
    },
    [caseId, disabled, onCasePatched, onMessage],
  );

  React.useEffect(
    () => () => {
      if (keyFindingSaveTimerRef.current != null) window.clearTimeout(keyFindingSaveTimerRef.current);
    },
    [],
  );

  if (fields.length === 0) return null;

  return (
    <section
      className={variant === "onsite" ? "case-obs-onsite-block" : "case-obs-workflow-section"}
      aria-labelledby="case-obs-findings-title"
    >
      <div className="case-obs-overview-findings-head">
        <h3 id="case-obs-findings-title" className={variant === "onsite" ? "case-obs-onsite-block-title" : "case-obs-workflow-section-title"}>
          {variant === "onsite" ? "Quick signals" : "Observation signals"}
        </h3>
        {variant === "default" ? (
          <p className="case-obs-overview-findings-hint">Structured tags to capture before debrief.</p>
        ) : null}
      </div>
      {fields.map((field) => (
        <QuickFindingRow
          key={field.key}
          label={field.label}
          value={findings[field.key]}
          options={field.options as readonly NonNullable<ObservationQuickFindingValue>[]}
          disabled={disabled || findingsSavingKey === field.key}
          onChange={(next) => void saveFinding(field.key, next)}
        />
      ))}
      <label className="case-obs-overview-key-finding">
        <span className="case-obs-overview-key-finding-label">Key finding note</span>
        <textarea
          value={keyFindingNote}
          onChange={(event) => {
            const next = event.target.value;
            setKeyFindingNote(next);
            queueKeyFindingSave(next);
          }}
          rows={3}
          disabled={disabled || findingsSavingKey === "key_finding_note"}
          placeholder="One headline takeaway, if you have it…"
          style={{ ...sc.input, resize: "vertical" }}
        />
      </label>
    </section>
  );
}
