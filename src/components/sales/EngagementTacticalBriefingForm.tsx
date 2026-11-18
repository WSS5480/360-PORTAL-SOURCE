"use client";

import React from "react";
import {
  PrepareTacticalAiAssistActions,
  type TacticalAssistFeedback,
} from "@/components/sales/PrepareTacticalAiAssistActions";
import { tacticalSectionIdsForPatch } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistApply";
import { assistActionsForTacticalSection } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";
import type { TacticalBriefingFieldSpec, TacticalBriefingSectionSpec } from "@/lib/surgical-sales/engagements/engagementTacticalBriefingSections";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

const SECTION_HIGHLIGHT_MS = 2400;

function TacticalField({
  spec,
  value,
  disabled,
  highlighted,
  onChange,
}: {
  spec: TacticalBriefingFieldSpec;
  value: string;
  disabled?: boolean;
  highlighted?: boolean;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <label className={`edm-tactical-field${highlighted ? " edm-tactical-field--ai-highlight" : ""}`}>
      {spec.sublabel ? (
        <span className="edm-tactical-field-sublabel">
          {spec.sublabel}
          {highlighted ? <span className="edm-tactical-field-ai-badge"> AI modified</span> : null}
        </span>
      ) : highlighted ? (
        <span className="edm-tactical-field-sublabel">
          <span className="edm-tactical-field-ai-badge">AI modified</span>
        </span>
      ) : null}
      <textarea
        rows={spec.rows}
        value={value}
        disabled={disabled}
        data-workflow-key={spec.key}
        placeholder={spec.placeholder}
        onChange={(e) => onChange(spec.key, e.target.value)}
      />
    </label>
  );
}

export function EngagementTacticalBriefingForm({
  sections,
  draft,
  disabled,
  onChange,
  engagementId,
  engagementType,
  onAssistApplied,
  onAssistError,
}: {
  sections: readonly TacticalBriefingSectionSpec[];
  draft: EngagementWorkflowDraft;
  disabled?: boolean;
  onChange: (key: string, value: string) => void;
  engagementId?: string;
  engagementType?: string;
  onAssistApplied?: (patch: Record<string, string | null>) => void;
  onAssistError?: (message: string | null) => void;
}) {
  const showAssist = Boolean(engagementId && engagementType && onAssistApplied && onAssistError);
  const [highlightSectionIds, setHighlightSectionIds] = React.useState<Set<string>>(() => new Set());
  const [highlightFieldKeys, setHighlightFieldKeys] = React.useState<Set<string>>(() => new Set());
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function flashSections(patch: Record<string, string | null>) {
    const sectionIds = tacticalSectionIdsForPatch(patch);
    const fieldKeys = new Set(Object.keys(patch));
    setHighlightSectionIds(new Set(sectionIds));
    setHighlightFieldKeys(fieldKeys);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setHighlightSectionIds(new Set());
      setHighlightFieldKeys(new Set());
      timerRef.current = null;
    }, SECTION_HIGHLIGHT_MS);
  }

  async function handleAssist(result: TacticalAssistFeedback) {
    flashSections(result.patch);
    onAssistApplied?.(result.patch);
  }

  return (
    <div className="edm-tactical-briefing">
      {sections.map((section) => {
        const assistIds = showAssist
          ? assistActionsForTacticalSection(engagementType!, section.id)
          : [];
        const sectionHighlighted = highlightSectionIds.has(section.id);
        return (
          <article
            key={section.id}
            className={`edm-tactical-section${sectionHighlighted ? " edm-tactical-section--ai-highlight" : ""}`}
          >
            <header className="edm-tactical-section-head">
              <h3 className="edm-tactical-section-title">{section.label}</h3>
              {section.hint ? <p className="edm-tactical-section-hint">{section.hint}</p> : null}
            </header>
            {showAssist && assistIds.length > 0 ? (
              <PrepareTacticalAiAssistActions
                engagementId={engagementId!}
                actionIds={assistIds}
                disabled={disabled}
                onHighlight={(keys) => {
                  if (keys.length > 0) flashSections(Object.fromEntries(keys.map((k) => [k, ""])));
                }}
                onApplied={handleAssist}
                onError={onAssistError!}
              />
            ) : null}
            <div
              className={`edm-tactical-section-body${section.fields.length > 1 ? " edm-tactical-section-body--split" : ""}`}
            >
              {section.fields.map((field) => (
                <TacticalField
                  key={field.key}
                  spec={field}
                  value={String(draft[field.key] ?? "")}
                  disabled={disabled}
                  highlighted={highlightFieldKeys.has(field.key)}
                  onChange={onChange}
                />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
