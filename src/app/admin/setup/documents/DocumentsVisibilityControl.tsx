"use client";

import React from "react";
import {
  SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS,
  SALES_COMMAND_DOCUMENT_ACCESS_LEVELS,
  SALES_COMMAND_DOCUMENT_ACCESS_SHORT_LABELS,
  type SalesCommandDocumentAccessLevel,
} from "@/lib/sales-command/salesCommandDocumentTypes";
import styles from "./documents.module.css";

type Props = {
  value: SalesCommandDocumentAccessLevel;
  disabled?: boolean;
  saving?: boolean;
  showApplyToChildren?: boolean;
  applyToChildren?: boolean;
  onApplyToChildrenChange?: (value: boolean) => void;
  onChange: (level: SalesCommandDocumentAccessLevel) => void;
  testId?: string;
};

export default function DocumentsVisibilityControl({
  value,
  disabled,
  saving,
  showApplyToChildren,
  applyToChildren,
  onApplyToChildrenChange,
  onChange,
  testId = "admin-docs-visibility-select",
}: Props) {
  return (
    <div className={styles.visibilityControl} data-testid="admin-docs-visibility-control">
      <div className={styles.visibilityControlTop}>
        <label className={styles.visibilityLabel} htmlFor={testId}>
          Who can view
        </label>
        <select
          id={testId}
          className={styles.visibilitySelect}
          value={value}
          disabled={disabled || saving}
          data-testid={testId}
          onChange={(e) => onChange(e.target.value as SalesCommandDocumentAccessLevel)}
        >
          {SALES_COMMAND_DOCUMENT_ACCESS_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level === "admin_only"
                ? "Admin only (hidden from reps)"
                : SALES_COMMAND_DOCUMENT_ACCESS_SHORT_LABELS[level]}
            </option>
          ))}
        </select>
        {saving ? <span className={styles.muted}>Saving…</span> : null}
      </div>
      <p className={styles.visibilityHint}>{SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS[value]}</p>
      {showApplyToChildren ? (
        <label className={styles.visibilityCheckbox}>
          <input
            type="checkbox"
            checked={!!applyToChildren}
            disabled={disabled || saving}
            data-testid="admin-docs-visibility-apply-children"
            onChange={(e) => onApplyToChildrenChange?.(e.target.checked)}
          />
          Also update all subfolders
        </label>
      ) : null}
    </div>
  );
}

export function AccessLegend() {
  return (
    <div className={styles.accessLegend} data-testid="admin-docs-access-legend">
      <div className={styles.accessLegendTitle}>Visibility levels</div>
      <div className={styles.accessLegendRow}>
        {SALES_COMMAND_DOCUMENT_ACCESS_LEVELS.map((level) => (
          <div
            key={level}
            className={styles.accessLegendChip}
            title={SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS[level]}
          >
            <span
              className={`${styles.pill} ${
                level === "all_reps" ? styles.pillAllReps : level === "territory_managers" ? styles.pillTm : styles.pillAdmin
              }`}
            >
              {SALES_COMMAND_DOCUMENT_ACCESS_SHORT_LABELS[level]}
            </span>
            <span className={styles.accessLegendChipText}>
              {level === "all_reps"
                ? "Everyone on the field team"
                : level === "territory_managers"
                  ? "Territory managers + admins"
                  : "Admins only — hidden from reps"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
