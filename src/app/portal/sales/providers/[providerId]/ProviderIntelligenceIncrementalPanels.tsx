"use client";

import React from "react";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildIntelligenceCapturePriorities,
  buildInteractionCaptureRecommendations,
  type IntelligenceInteractionRecommendation,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  buildIntelligenceLearningGaps,
  INTELLIGENCE_LEARNING_GAPS_TITLE,
  type IntelligenceLearningGap,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { intelligenceGapChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
import { ProviderGapFieldGuidance } from "./ProviderGapFieldGuidance";
import { ProviderIntelligenceUnlocksNextLine } from "./ProviderIntelligenceUnlocksNextLine";
import type { ProviderPlanningTabSectionId } from "@/lib/surgical-sales/providerPlanningTabSections";

export function ProviderIntelligenceLearningGapsPanel({
  contact,
  planning,
  onOpenSection,
  maxItems = 5,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  onOpenSection: (sectionId: ProviderPlanningTabSectionId, dbKey?: string) => void;
  maxItems?: number;
}) {
  const gaps = React.useMemo(
    () => buildIntelligenceLearningGaps(contact, planning, maxItems),
    [contact, planning, maxItems],
  );

  if (gaps.length === 0) return null;

  return (
    <section className="provider-intel-learning-gaps" aria-label={INTELLIGENCE_LEARNING_GAPS_TITLE}>
      <h3 className="provider-intel-learning-gaps-title">{INTELLIGENCE_LEARNING_GAPS_TITLE}</h3>
      <ul className="provider-intel-learning-gaps-list">
        {gaps.map((gap) => (
          <LearningGapRow key={gap.dbKey} gap={gap} onOpenSection={onOpenSection} />
        ))}
      </ul>
    </section>
  );
}

function LearningGapRow({
  gap,
  onOpenSection,
}: {
  gap: IntelligenceLearningGap;
  onOpenSection: (sectionId: ProviderPlanningTabSectionId, dbKey?: string) => void;
}) {
  return (
    <li
      className={`provider-intel-learning-gap-row provider-intel-learning-gap-row--${gap.state === "unknown" ? "unknown" : "emerging"}`}
    >
      <button
        type="button"
        className="provider-intel-learning-gap-row-main"
        onClick={() => onOpenSection(gap.sectionId, gap.dbKey)}
      >
        <span className="provider-intel-learning-gap-row-label">
          {intelligenceGapChipLabel(gap.dbKey, gap.state)}
        </span>
        <ProviderGapFieldGuidance guidance={gap.fieldGuidance} compact />
        <ProviderIntelligenceUnlocksNextLine line={gap.unlocksNext} compact />
      </button>
    </li>
  );
}

export function ProviderIntelligenceEvolutionLead({
  planning,
  contact,
}: {
  planning?: ProviderPlanningCompletion | null;
  contact: Record<string, unknown>;
}) {
  const gaps = buildIntelligenceLearningGaps(contact, planning, 1);
  const headline = gaps[0]?.phrase ?? "Profile building";
  return (
    <div className="provider-intel-evolution-lead">
      <p className="provider-intel-evolution-title">Build context over time</p>
      <span className="provider-intel-briefing-chip provider-intel-briefing-chip--gap">{headline}</span>
    </div>
  );
}

export function ProviderIntelligenceQuickCaptures({
  contact,
  planning,
  onCaptureField,
  maxItems = 3,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  onCaptureField: (sectionId: ProviderPlanningTabSectionId, dbKey: string) => void;
  maxItems?: number;
}) {
  const priorities = React.useMemo(
    () => buildIntelligenceCapturePriorities(contact, planning, maxItems),
    [contact, planning, maxItems],
  );

  if (priorities.length === 0) return null;

  return (
    <section className="provider-intel-quick-signal-strip" aria-label="Priority captures">
      <h3 className="provider-intel-quick-signal-strip-label">Next captures</h3>
      <ul className="provider-intel-capture-actions">
        {priorities.map((priority) => (
          <li key={priority.dbKey}>
            <button
              type="button"
              className="provider-intel-capture-action provider-intel-capture-action--quick"
              onClick={() => onCaptureField(priority.sectionId, priority.dbKey)}
            >
              <span className="provider-intel-capture-action-body">
                <span className="provider-intel-capture-action-label">
                  {intelligenceContextualCaptureCta(priority.dbKey)}
                </span>
                <ProviderIntelligenceUnlocksNextLine dbKey={priority.dbKey} compact />
              </span>
              <span className="provider-intel-capture-action-chevron" aria-hidden>
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProviderIntelligenceInteractionCard({
  contact,
  planning,
  onOpenSection,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  onOpenSection: (sectionId: ProviderPlanningTabSectionId, dbKey?: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const detailsId = React.useId();
  const recommendations = React.useMemo(
    () => buildInteractionCaptureRecommendations(contact, planning, 3),
    [contact, planning],
  );

  if (recommendations.length === 0) return null;

  return (
    <section
      className={`provider-intel-interaction-card provider-intel-collapsible${expanded ? " provider-intel-collapsible--open" : ""}`}
      aria-label="Plan captures for next interaction"
    >
      <div className="provider-intel-collapsible-head provider-intel-interaction-card-head">
        <button
          type="button"
          className="provider-intel-collapsible-trigger"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="provider-intel-collapsible-title">Next interaction</span>
        </button>
        {!expanded && recommendations.length > 0 ? (
          <span className="provider-intel-interaction-card-hint">
            {recommendations.length} capture{recommendations.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {expanded ? (
        <ul id={detailsId} className="provider-intel-interaction-list">
          {recommendations.map((rec) => (
            <InteractionRow key={rec.dbKey} rec={rec} onOpenSection={onOpenSection} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function InteractionRow({
  rec,
  onOpenSection,
}: {
  rec: IntelligenceInteractionRecommendation;
  onOpenSection: (sectionId: ProviderPlanningTabSectionId, dbKey?: string) => void;
}) {
  return (
    <li className="provider-intel-interaction-item">
      <div className="provider-intel-interaction-timing">{rec.timingLabel}</div>
      <p className="provider-intel-interaction-prompt">{rec.prompt}</p>
      <div className="provider-intel-interaction-meta">
        <span>
          {rec.sectionLabel} · {rec.fieldLabel}
        </span>
        <button
          type="button"
          className="provider-intel-interaction-add"
          onClick={() => onOpenSection(rec.sectionId, rec.dbKey)}
        >
          {intelligenceContextualCaptureCta(rec.dbKey)}
        </button>
      </div>
    </li>
  );
}

export function ProviderIntelligenceDeepenUnlock({
  unlocked,
  missingCount,
  expanded,
  onToggle,
}: {
  unlocked: boolean;
  missingCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (unlocked) {
    if (missingCount === 0 && !expanded) return null;
    return (
      <button type="button" className="provider-intel-deepen-toggle" onClick={onToggle} aria-expanded={expanded}>
        {expanded ? "Hide deeper fields" : "Deepen profile"}
      </button>
    );
  }

  return (
    <p className="provider-intel-deepen-locked">
      Capture a priority above to open more fields in this area.
    </p>
  );
}
