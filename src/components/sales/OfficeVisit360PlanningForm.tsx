"use client";

import React from "react";
import {
  OFFICE_VISIT_360_SECTIONS,
  officeVisit360SectionPreview,
  type OfficeVisit360SectionConfig,
} from "@/lib/surgical-sales/engagements/officeVisit360Workflow";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { officeVisit360PlanningCss } from "@/components/sales/officeVisit360PlanningCss";

function appendChipToField(current: string, chip: string): string {
  const trimmed = current.trim();
  if (!trimmed) return chip;
  if (trimmed.toLowerCase().includes(chip.toLowerCase())) return trimmed;
  return `${trimmed}\n${chip}`;
}

export function OfficeVisit360PlanningForm({
  draft,
  onChange,
  disabled,
  sections = OFFICE_VISIT_360_SECTIONS,
  guided,
}: {
  draft: EngagementWorkflowDraft;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  sections?: OfficeVisit360SectionConfig[];
  /** Wizard prep — compact sections, no helper paragraphs */
  guided?: boolean;
}) {
  const filledCount = sections.filter((s) => String(draft[s.key] ?? "").trim().length > 0).length;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: officeVisit360PlanningCss }} />
      <div className="office-visit-360-plan" aria-label="360 office visit plan">
        {!guided ? (
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
            {filledCount}/{sections.length} sections · expand any section to edit
          </p>
        ) : null}
        {sections.map((section) => {
          const value = String(draft[section.key] ?? "");
          const preview = officeVisit360SectionPreview(draft, section);
          const defaultOpen = guided ? section.id === "visit_objective" : (section.defaultOpen ?? false);
          const rows = guided ? Math.min(section.rows, 2) : section.rows;
          return (
            <details
              key={section.id}
              className="office-visit-360-section"
              open={defaultOpen}
            >
              <summary className="office-visit-360-section-summary">
                <span className="office-visit-360-section-title">{section.label}</span>
                <span className="office-visit-360-section-preview">{preview}</span>
              </summary>
              <div className="office-visit-360-section-body">
                {section.helper && !guided ? (
                  <p className="office-visit-360-section-helper">{section.helper}</p>
                ) : null}
                <textarea
                  rows={rows}
                  value={value}
                  disabled={disabled}
                  placeholder={section.placeholder ?? section.label}
                  onChange={(e) => onChange(section.key, e.target.value)}
                />
                {section.chipExamples && section.chipExamples.length > 0 ? (
                  <div className="office-visit-360-chips" role="group" aria-label={`${section.label} suggestions`}>
                    {section.chipExamples.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="office-visit-360-chip"
                        disabled={disabled}
                        onClick={() => onChange(section.key, appendChipToField(value, chip))}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
