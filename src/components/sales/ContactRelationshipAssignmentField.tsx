"use client";

import React from "react";
import {
  CONTACT_RELATIONSHIP_ASSIGNMENT_OPTIONS,
  assignmentFootnote,
  type ContactRelationshipAssignment,
} from "@/lib/surgical-sales/contactRelationshipAssignment";

export function ContactRelationshipAssignmentField({
  value,
  onChange,
  organizationName,
  disabled,
  variant = "select",
  title = "Affiliation",
  helperText = "Where should this contact be linked?",
  organizationId,
}: {
  value: ContactRelationshipAssignment;
  onChange: (value: ContactRelationshipAssignment) => void;
  organizationName?: string | null;
  disabled?: boolean;
  variant?: "select" | "chips";
  title?: string;
  helperText?: string;
  organizationId?: string | null;
}) {
  const options = CONTACT_RELATIONSHIP_ASSIGNMENT_OPTIONS.filter((option) => {
    if (organizationId) return true;
    return option.value === "provider";
  });

  if (variant === "chips") {
    return (
      <fieldset className="rd-support-assignment">
        <legend className="rd-support-section-label">{title}</legend>
        <p className="rd-support-helper">{helperText}</p>
        <div className="rd-support-assignment-grid" role="radiogroup" aria-label={title}>
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`rd-support-assignment-btn${selected ? " rd-support-assignment-btn--active" : ""}`}
                disabled={disabled}
                onClick={() => onChange(option.value)}
              >
                <span className="rd-support-assignment-btn-label">{option.label}</span>
                <span className="rd-support-assignment-btn-desc">{option.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800 }}>{title}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ContactRelationshipAssignment)}
        disabled={disabled}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 9px",
          borderRadius: 8,
          border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
          fontSize: 12,
          background: "var(--surface)",
          color: "var(--foreground)",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>
        {assignmentFootnote(value, organizationName)}
      </span>
    </label>
  );
}
