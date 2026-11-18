"use client";

import React, { useMemo } from "react";
import type { WizardFieldConfig } from "@/lib/surgical-sales/providerWizardFields";
import {
  CredentialingPlatformFieldControl,
  CREDENTIALING_PLATFORM_ID_DB_KEY,
  isCredentialingPlatformNameField,
} from "@/app/portal/sales/providers/[providerId]/CredentialingPlatformFieldControl";
import {
  dedupeIntelligenceCaptureOptions,
  parseIntelligenceCaptureValue,
  serializeIntelligenceCaptureValue,
  toggleProviderObservationAccessPathChips,
  type IntelligenceCaptureOption,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

function SegmentedControl({
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
  compact = false,
  selectOnly = false,
}: {
  options: IntelligenceCaptureOption[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  ariaLabel: string;
  compact?: boolean;
  /** Rapid Discovery: always select — never toggle off on second tap. */
  selectOnly?: boolean;
}) {
  return (
    <div
      className={`provider-intel-segmented${compact ? " provider-intel-segmented--rapid" : ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`provider-discovery-confidence-btn${active ? " provider-discovery-confidence-btn--active" : ""}${compact ? " provider-discovery-confidence-btn--rapid" : ""}`}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(selectOnly && active ? opt.value : active ? null : opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipPickerHeader({ label, helper }: { label?: string; helper?: string }) {
  if (!label && !helper) return null;
  return (
    <div className="provider-intel-chips-header">
      {label ? <p className="provider-intel-notes-label">{label}</p> : null}
      {helper ? <p className="provider-intel-legacy-hint">{helper}</p> : null}
    </div>
  );
}

function ChipPicker({
  options,
  selected,
  onToggle,
  disabled,
  chipsLabel,
  chipsHelper,
  compact = false,
  hideHeader = false,
}: {
  options: IntelligenceCaptureOption[];
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
  chipsLabel?: string;
  chipsHelper?: string;
  compact?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div className="provider-intel-chips-block">
      {!hideHeader ? <ChipPickerHeader label={chipsLabel} helper={chipsHelper} /> : null}
      <div className={`provider-discovery-tags${compact ? " provider-discovery-tags--rapid" : ""}`}>
        {options.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              className={`provider-discovery-tag${on ? " provider-discovery-tag--on" : ""}${compact ? " provider-discovery-tag--rapid" : ""}`}
              disabled={disabled}
              aria-pressed={on}
              onClick={() => onToggle(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CollapsibleNotes({
  id,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const hasContent = value.trim().length > 0;

  if (!open && !hasContent) {
    return (
      <button
        type="button"
        className="provider-intel-note-collapse-toggle"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Add note
      </button>
    );
  }

  return (
    <div className="provider-intel-note-collapse">
      <button
        type="button"
        className="provider-intel-note-collapse-toggle"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open || hasContent}
      >
        {open || hasContent ? "Hide note" : "Add note"}
      </button>
      {open || hasContent ? (
        <textarea
          id={id}
          rows={1}
          className="provider-intel-notes-input provider-intel-notes-input--rapid"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

const UNSET_CAPTURE_VALUE = "unknown";

export function ProviderIntelligenceFieldControl({
  field,
  value,
  onChange,
  disabled,
  id,
  omitUnsetCaptureOption = false,
  captureOptionsOverride,
  selectOnly = false,
  variant = "default",
  planningDraft,
  onPlanningPatch,
}: {
  field: WizardFieldConfig;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  id: string;
  /** Hide "Not on file yet" / unknown token from segmented and chip pickers (Rapid Discovery). */
  omitUnsetCaptureOption?: boolean;
  /** Replace default segmented/chip options (Discovery Mapping drawer). */
  captureOptionsOverride?: IntelligenceCaptureOption[];
  /** Segmented controls: selecting an active option keeps it selected (Discovery Mapping). */
  selectOnly?: boolean;
  /** Rapid Discovery: compact chips, collapsed notes, minimal chrome. */
  variant?: "default" | "rapid";
  /** Full planning draft — used for multi-field controls like credentialing platform picker. */
  planningDraft?: Record<string, string>;
  /** Patch multiple planning keys at once (e.g. platform id + name). */
  onPlanningPatch?: (patch: Record<string, string>) => void;
}) {
  const rapid = variant === "rapid";
  if (isCredentialingPlatformNameField(field.key)) {
    return (
      <CredentialingPlatformFieldControl
        platformId={planningDraft?.[CREDENTIALING_PLATFORM_ID_DB_KEY] ?? ""}
        platformName={value}
        disabled={disabled}
        onChange={(next) => {
          onPlanningPatch?.({
            [CREDENTIALING_PLATFORM_ID_DB_KEY]: next.platformId,
            [field.key]: next.platformName,
          });
          onChange(next.platformName);
        }}
      />
    );
  }
  const spec = field.capture;
  const parsed = useMemo(
    () => (spec ? parseIntelligenceCaptureValue(field.key, value) : null),
    [field.key, spec, value],
  );

  function commit(next: { token?: string | null; tokens?: string[]; notes?: string }) {
    if (!spec || !parsed) {
      onChange(String(next.notes ?? "").trim());
      return;
    }
    onChange(
      serializeIntelligenceCaptureValue(field.key, {
        token: next.token !== undefined ? next.token : parsed.token,
        tokens: next.tokens !== undefined ? next.tokens : parsed.tokens,
        notes: next.notes !== undefined ? next.notes : parsed.notes,
      }),
    );
  }

  const wrapClass = rapid ? "provider-intel-field--rapid" : undefined;

  if (!spec) {
    if (field.input === "select" && field.options) {
      return (
        <div className={wrapClass}>
          <select
            id={id}
            value={value || field.options[0]?.value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={rapid ? "provider-intel-select--rapid" : undefined}
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    if (field.input === "compact_text") {
      return (
        <div className={wrapClass}>
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.compactPlaceholder}
            className={`provider-intel-compact-input${rapid ? " provider-intel-compact-input--rapid" : ""}`}
          />
        </div>
      );
    }
    return (
      <div className={wrapClass}>
        <textarea
          id={id}
          rows={rapid ? 1 : (field.rows ?? 2)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.notesPlaceholder}
          className={rapid ? "provider-intel-notes-input--rapid" : undefined}
        />
      </div>
    );
  }

  const options = useMemo(() => {
    if (captureOptionsOverride?.length) return captureOptionsOverride;
    const base = dedupeIntelligenceCaptureOptions(spec.options ?? []);
    if (!omitUnsetCaptureOption) return base;
    return base.filter((opt) => opt.value !== UNSET_CAPTURE_VALUE);
  }, [captureOptionsOverride, spec.options, omitUnsetCaptureOption]);
  const chips = useMemo(() => {
    const base = dedupeIntelligenceCaptureOptions(spec.suggestedChips ?? []);
    if (!omitUnsetCaptureOption) return base;
    return base.filter((opt) => opt.value !== UNSET_CAPTURE_VALUE);
  }, [spec.suggestedChips, omitUnsetCaptureOption]);

  if (spec.input === "segmented" || spec.input === "select") {
    return (
      <div className={wrapClass}>
        <SegmentedControl
          ariaLabel={field.label}
          options={options}
          value={parsed?.token ?? null}
          disabled={disabled}
          compact={rapid}
          selectOnly={selectOnly || rapid}
          onChange={(token) => commit({ token })}
        />
      </div>
    );
  }

  if (spec.input === "chips") {
    return (
      <div className={wrapClass}>
        <ChipPicker
          options={chips}
          selected={parsed?.tokens ?? []}
          disabled={disabled}
          chipsLabel={spec.suggestedChipsLabel}
          chipsHelper={spec.suggestedChipsHelper}
          compact={rapid}
          hideHeader={rapid}
          onToggle={(v) => {
            const set = new Set(parsed?.tokens ?? []);
            if (set.has(v)) set.delete(v);
            else set.add(v);
            commit({ tokens: [...set] });
          }}
        />
      </div>
    );
  }

  if (spec.input === "segmented_plus_notes") {
    const showLegacy = parsed?.legacyText && !parsed.token;
    return (
      <div className={`provider-intel-structured${rapid ? " provider-intel-structured--rapid" : ""}`}>
        <SegmentedControl
          ariaLabel={field.label}
          options={options}
          value={parsed?.token ?? null}
          disabled={disabled}
          compact={rapid}
          selectOnly={rapid}
          onChange={(token) => commit({ token, notes: parsed?.notes ?? "" })}
        />
        {showLegacy ? (
          <p className="provider-intel-legacy-hint">Previous entry: {parsed.legacyText}</p>
        ) : null}
        {rapid ? (
          <CollapsibleNotes
            id={`${id}-notes`}
            value={parsed?.notes ?? ""}
            placeholder={spec.notesPlaceholder}
            disabled={disabled}
            onChange={(notes) => commit({ notes })}
          />
        ) : (
          <>
            <label className="provider-intel-notes-label" htmlFor={`${id}-notes`}>
              {spec.notesLabel ?? "Additional notes"}
            </label>
            <textarea
              id={`${id}-notes`}
              rows={2}
              className="provider-intel-notes-input"
              value={parsed?.notes ?? ""}
              placeholder={spec.notesPlaceholder}
              disabled={disabled}
              onChange={(e) => commit({ notes: e.target.value })}
            />
          </>
        )}
      </div>
    );
  }

  if (spec.input === "textarea") {
    return (
      <div className={wrapClass}>
        <textarea
          id={id}
          rows={rapid ? 1 : (field.rows ?? 2)}
          className={`provider-intel-notes-input${rapid ? " provider-intel-notes-input--rapid" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={spec.notesPlaceholder ?? field.notesPlaceholder}
        />
      </div>
    );
  }

  if (spec.input === "compact_text") {
    return (
      <div className={wrapClass}>
        <input
          id={id}
          type="text"
          className={`provider-intel-compact-input${rapid ? " provider-intel-compact-input--rapid" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={spec.compactPlaceholder ?? field.compactPlaceholder}
        />
      </div>
    );
  }

  if (spec.input === "chips_plus_notes") {
    const showLegacy = parsed?.legacyText && parsed.tokens.length === 0;
    return (
      <div className={`provider-intel-structured${rapid ? " provider-intel-structured--rapid" : ""}`}>
        <ChipPicker
          options={chips}
          selected={parsed?.tokens ?? []}
          disabled={disabled}
          chipsLabel={spec.suggestedChipsLabel}
          chipsHelper={spec.suggestedChipsHelper}
          compact={rapid}
          hideHeader={rapid}
          onToggle={(v) => {
            const next =
              field.key === "provider_observation_access_path"
                ? toggleProviderObservationAccessPathChips(parsed?.tokens ?? [], v)
                : (() => {
                    const set = new Set(parsed?.tokens ?? []);
                    if (set.has(v)) set.delete(v);
                    else set.add(v);
                    return [...set];
                  })();
            commit({ tokens: next });
          }}
        />
        {showLegacy ? (
          <p className="provider-intel-legacy-hint">Previous entry: {parsed.legacyText}</p>
        ) : null}
        {rapid ? (
          <CollapsibleNotes
            id={`${id}-notes`}
            value={parsed?.notes ?? ""}
            placeholder={spec.notesPlaceholder}
            disabled={disabled}
            onChange={(notes) => commit({ notes })}
          />
        ) : (
          <>
            <label className="provider-intel-notes-label" htmlFor={`${id}-notes`}>
              {spec.notesLabel ?? "Additional notes"}
            </label>
            <textarea
              id={`${id}-notes`}
              rows={2}
              className="provider-intel-notes-input"
              value={parsed?.notes ?? ""}
              placeholder={spec.notesPlaceholder}
              disabled={disabled}
              onChange={(e) => commit({ notes: e.target.value })}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <textarea
        id={id}
        rows={rapid ? 1 : (field.rows ?? 3)}
        className={rapid ? "provider-intel-notes-input--rapid" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={spec.notesPlaceholder}
      />
    </div>
  );
}
