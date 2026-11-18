"use client";

import React from "react";
import {
  PROVIDER_CLINICAL_DISCOVERY_FIELDS,
  type ClinicalDiscoveryQuestionKey,
} from "@/lib/surgical-sales/providerClinicalDiscovery";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function ProviderClinicalDiscoveryFields({
  draft,
  setDraft,
  disabled,
  idPrefix = "cd",
}: {
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const [openKey, setOpenKey] = React.useState<ClinicalDiscoveryQuestionKey | "">(
    PROVIDER_CLINICAL_DISCOVERY_FIELDS[0]?.questionKey ?? "",
  );

  return (
    <div className="provider-discovery-accordion">
      <p className="provider-discovery-intro">
        Capture modality and priority discovery at the provider level — one question at a time.
      </p>
      <div className="provider-discovery-list">
        {PROVIDER_CLINICAL_DISCOVERY_FIELDS.map((field, index) => {
          const value = String(draft[field.questionKey] ?? "").trim();
          const isOpen = openKey === field.questionKey;
          const answered = value.length > 0;
          return (
            <div
              key={field.questionKey}
              className={`provider-discovery-item${isOpen ? " provider-discovery-item--open" : ""}${answered ? " provider-discovery-item--answered" : ""}`}
            >
              <button
                type="button"
                className="provider-discovery-trigger"
                aria-expanded={isOpen}
                onClick={() => setOpenKey((prev) => (prev === field.questionKey ? "" : field.questionKey))}
              >
                <span className="provider-discovery-trigger-num">{index + 1}</span>
                <span className="provider-discovery-trigger-main">
                  <span className="provider-discovery-trigger-label">{field.shortLabel}</span>
                  {!isOpen && answered ? (
                    <span className="provider-discovery-trigger-preview">{truncate(value, 56)}</span>
                  ) : null}
                </span>
                <span className={`provider-discovery-status${answered ? " provider-discovery-status--done" : ""}`}>
                  {answered ? "Saved" : "—"}
                </span>
              </button>
              {isOpen ? (
                <div className="provider-discovery-panel">
                  <p className="provider-discovery-question">{field.question}</p>
                  <textarea
                    id={`${idPrefix}-${field.questionKey}`}
                    rows={3}
                    value={draft[field.questionKey] || ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [field.questionKey]: e.target.value }))}
                    disabled={disabled}
                    placeholder="Notes for this discovery question…"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
