"use client";

import React from "react";
import {
  addObservationWatchItem,
  formatObservationWatchItemLabel,
  observationWatchItemsFromCaseRow,
  removeObservationWatchItem,
  setObservationWatchItemStatus,
  unusedObservationWatchPresets,
  type ObservationWatchItem,
} from "@/lib/surgical-sales/observationWatchItems";
import { patchObservationCase } from "./caseObservationPatch";
import { userFacingError } from "@/lib/errors/userFacingError";

export function CaseObservationValidationSection({
  caseId,
  caseRow,
  disabled,
  onCasePatched,
  onMessage,
  variant = "default",
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onMessage: (message: string) => void;
  variant?: "default" | "onsite";
}) {
  const [watchItems, setWatchItems] = React.useState<ObservationWatchItem[]>(() =>
    observationWatchItemsFromCaseRow(caseRow),
  );
  const [watchSaving, setWatchSaving] = React.useState(false);

  React.useEffect(() => {
    setWatchItems(observationWatchItemsFromCaseRow(caseRow));
  }, [caseRow.observation_validation_targets]);

  const availableWatchPresets = React.useMemo(() => unusedObservationWatchPresets(watchItems), [watchItems]);

  async function persistWatchItems(nextItems: ObservationWatchItem[]) {
    if (disabled) return;
    setWatchSaving(true);
    setWatchItems(nextItems);
    try {
      const saved = await patchObservationCase(caseId, { observation_validation_targets: nextItems });
      onCasePatched(saved);
    } catch (error: unknown) {
      setWatchItems(observationWatchItemsFromCaseRow(caseRow));
      onMessage(userFacingError(error, "Could not update validation items"));
    } finally {
      setWatchSaving(false);
    }
  }

  function addCustomWatchItem() {
    const label = window.prompt("What should you validate during this case?");
    if (!label?.trim()) return;
    void persistWatchItems(addObservationWatchItem(watchItems, label.trim(), "manual"));
  }

  return (
    <section
      className={variant === "onsite" ? "case-obs-onsite-block" : "case-obs-workflow-section"}
      aria-labelledby="case-obs-validation-title"
    >
      <h3 id="case-obs-validation-title" className={variant === "onsite" ? "case-obs-onsite-block-title" : "case-obs-workflow-section-title"}>
        {variant === "onsite" ? "Validate in the room" : "Validation cards"}
      </h3>
      {variant === "default" ? (
        <p className="case-obs-workflow-section-lead">What to confirm in the room before you close the case.</p>
      ) : null}
      {watchItems.length > 0 ? (
        <ul className="case-obs-overview-watch-list">
          {watchItems.map((item) => (
            <li key={item.id} className="case-obs-overview-watch-card" data-observed={item.status === "observed" ? "true" : "false"}>
              <p className="case-obs-overview-watch-label">
                {formatObservationWatchItemLabel(
                  item.label,
                  item.source === "provider_signal" ? "provider_evaluation_openness" : undefined,
                )}
              </p>
              <div className="case-obs-overview-watch-actions">
                <button
                  type="button"
                  className="case-obs-overview-chip"
                  disabled={disabled || watchSaving || item.status === "observed"}
                  onClick={() =>
                    void persistWatchItems(setObservationWatchItemStatus(watchItems, item.id, "observed"))
                  }
                >
                  {item.status === "observed" ? "Validated" : "Mark validated"}
                </button>
                <button
                  type="button"
                  className="case-obs-overview-chip case-obs-overview-chip--ghost"
                  disabled={disabled || watchSaving}
                  onClick={() => void persistWatchItems(removeObservationWatchItem(watchItems, item.id))}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="case-obs-overview-empty">Add validation items for what to confirm on site.</p>
      )}
      {availableWatchPresets.length > 0 ? (
        <div className="case-obs-overview-chip-row">
          {availableWatchPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="case-obs-overview-chip"
              disabled={disabled || watchSaving}
              onClick={() => void persistWatchItems(addObservationWatchItem(watchItems, preset, "chip"))}
            >
              + {preset}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="case-obs-overview-chip case-obs-overview-chip--ghost"
        disabled={disabled || watchSaving}
        onClick={addCustomWatchItem}
      >
        Add validation item
      </button>
    </section>
  );
}
