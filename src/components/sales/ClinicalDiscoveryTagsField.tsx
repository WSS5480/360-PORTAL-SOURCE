"use client";

import React from "react";
import {
  addCustomTagToCsv,
  CLINICAL_DISCOVERY_SUGGESTED_TAGS,
  parseTagsCsv,
  removeTagFromCsv,
  tagIsSelected,
  toggleTagInCsv,
} from "@/lib/surgical-sales/providerClinicalDiscovery";

export function ClinicalDiscoveryTagsField({
  tagsCsv,
  onTagsCsvChange,
  disabled,
  inputIdPrefix = "clinical-discovery-tags",
}: {
  tagsCsv: string;
  onTagsCsvChange: (next: string) => void;
  disabled?: boolean;
  inputIdPrefix?: string;
}) {
  const [customInput, setCustomInput] = React.useState("");
  const activeTags = parseTagsCsv(tagsCsv);

  function commitCustomTag() {
    const next = addCustomTagToCsv(tagsCsv, customInput);
    if (next !== tagsCsv) onTagsCsvChange(next);
    setCustomInput("");
  }

  return (
    <div className="provider-discovery-tags-block">
      {activeTags.length > 0 ? (
        <div className="provider-discovery-tags-selected">
          <span className="provider-discovery-tags-label">Tags</span>
          <div className="provider-discovery-chips">
            {activeTags.map((tag) => (
              <span key={tag} className="provider-discovery-chip">
                {tag}
                {!disabled ? (
                  <button
                    type="button"
                    className="provider-discovery-chip-remove"
                    aria-label={`Remove ${tag}`}
                    onClick={() => onTagsCsvChange(removeTagFromCsv(tagsCsv, tag))}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <span className="provider-discovery-tags-label">Suggested</span>
        <div className="provider-discovery-tags">
          {CLINICAL_DISCOVERY_SUGGESTED_TAGS.map((tag) => {
            const on = tagIsSelected(tagsCsv, tag);
            return (
              <button
                key={tag}
                type="button"
                className={`provider-discovery-tag${on ? " provider-discovery-tag--on" : ""}`}
                disabled={disabled}
                aria-pressed={on}
                onClick={() => onTagsCsvChange(toggleTagInCsv(tagsCsv, tag))}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="provider-discovery-custom-tag">
        <label className="provider-discovery-tags-label" htmlFor={`${inputIdPrefix}-custom`}>
          Add custom tag
        </label>
        <div className="provider-discovery-custom-tag-row">
          <input
            id={`${inputIdPrefix}-custom`}
            type="text"
            value={customInput}
            disabled={disabled}
            placeholder="Type a tag…"
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustomTag();
              }
            }}
          />
          <button
            type="button"
            className="provider-profile-action"
            disabled={disabled || !customInput.trim()}
            onClick={commitCustomTag}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
