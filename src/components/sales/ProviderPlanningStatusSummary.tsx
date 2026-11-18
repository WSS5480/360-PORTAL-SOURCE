"use client";

import type React from "react";
import {
  PROVIDER_PLANNING_PROFILE_SECTION_ORDER,
  type ProviderPlanningCompletion,
  type ProviderPlanningSectionCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  formatPlanningSectionConfidenceHint,
  formatPlanningSectionProgressDisplay,
  formatPlanningStripMeta,
  PROVIDER_PLANNING_SECTION_CONFIDENCE_DISPLAY,
  PROVIDER_PLANNING_STATUS_DISPLAY,
} from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import {
  buildIntelligenceLearningGaps,
  formatLearningGapsSummary,
  INTELLIGENCE_LEARNING_GAPS_TITLE,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  PROVIDER_PLANNING_LABEL,
  providerPlanningNeedsAttention,
  type ProviderPlanningStatus,
} from "@/lib/surgical-sales/providerPlanning";

function formatPlanningTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function sectionConfidenceStyle(
  confidence: ProviderPlanningSectionCompletion["confidence"],
): React.CSSProperties {
  if (confidence === "validated") {
    return {
      background: "color-mix(in srgb, var(--success) 9%, var(--surface))",
      color: "#166534",
      border: "1px solid color-mix(in srgb, var(--success) 22%, var(--border))",
    };
  }
  if (confidence === "confirmed") {
    return {
      background: "color-mix(in srgb, var(--brand-600) 9%, var(--surface))",
      color: "var(--brand-700)",
      border: "1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border))",
    };
  }
  if (confidence === "partial") {
    return {
      background: "color-mix(in srgb, #f59e0b 9%, var(--surface))",
      color: "#92400e",
      border: "1px solid color-mix(in srgb, #f59e0b 22%, var(--border))",
    };
  }
  return {
    background: "color-mix(in srgb, var(--foreground) 4%, var(--surface))",
    color: "var(--muted)",
    border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
  };
}

function OverallStatusChip({
  status,
  displayTone = "default",
}: {
  status: ProviderPlanningStatus;
  displayTone?: "default" | "strategist";
}) {
  const label =
    displayTone === "strategist" ? PROVIDER_PLANNING_STATUS_DISPLAY[status] : PROVIDER_PLANNING_LABEL[status];
  const complete = status === "complete";
  const needsUpdate = status === "needs_update";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        padding: "4px 9px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        border: `1px solid color-mix(in srgb, ${complete ? "var(--success)" : needsUpdate ? "var(--brand-600)" : "var(--foreground)"} ${complete || needsUpdate ? "28%" : "10%"}, var(--border))`,
        background: complete
          ? "color-mix(in srgb, var(--success) 9%, var(--surface))"
          : needsUpdate
            ? "color-mix(in srgb, var(--brand-600) 10%, var(--surface))"
            : providerPlanningNeedsAttention(status)
              ? "color-mix(in srgb, #f59e0b 10%, var(--surface))"
              : "color-mix(in srgb, var(--foreground) 4%, var(--surface))",
        color: complete ? "#166534" : needsUpdate ? "var(--brand-700)" : providerPlanningNeedsAttention(status) ? "#b45309" : "var(--muted)",
      }}
    >
      {label}
    </span>
  );
}

export function ProviderPlanningStatusSummary({
  planning,
  contact,
  compact = false,
  showSections = true,
  variant = "default",
  displayTone = "default",
}: {
  planning: ProviderPlanningCompletion;
  /** When set, strip/detail use “what we still need to learn” instead of completion counters. */
  contact?: Record<string, unknown>;
  compact?: boolean;
  showSections?: boolean;
  variant?: "default" | "strip";
  /** Field-rep phrasing on provider detail (no raw section counts in labels). */
  displayTone?: "default" | "strategist";
}) {
  const learningGaps = contact ? buildIntelligenceLearningGaps(contact, planning, 2) : [];
  const learningSummary = learningGaps.length > 0 ? formatLearningGapsSummary(learningGaps, 2) : null;
  const stripMeta =
    displayTone === "strategist"
      ? formatPlanningStripMeta(planning, contact)
      : learningSummary ?? formatPlanningStripMeta(planning, contact);
  const avgConfidenceProgress =
    planning.sections.length > 0
      ? Math.round(
          planning.sections.reduce((sum, s) => sum + s.confidence_progress, 0) / planning.sections.length,
        )
      : 0;
  const sectionConfidenceLabel = (section: ProviderPlanningSectionCompletion) =>
    PROVIDER_PLANNING_SECTION_CONFIDENCE_DISPLAY[section.confidence];

  if (variant === "strip") {
    return (
      <div className="provider-planning-strip">
        <div className="provider-planning-strip-top">
          <OverallStatusChip status={planning.status} displayTone={displayTone} />
          <span className="provider-planning-strip-meta">
            {stripMeta}
          </span>
        </div>
        <div className="provider-planning-strip-bar" aria-hidden>
          <span style={{ width: `${avgConfidenceProgress}%` }} />
        </div>
        {showSections ? (
        <div className="provider-planning-strip-sections" aria-label="Planning sections">
          {PROVIDER_PLANNING_PROFILE_SECTION_ORDER.map((sectionId) => {
            const section = planning.sections.find((s) => s.id === sectionId);
            if (!section) return null;
            return (
              <span
                key={section.id}
                className={`provider-planning-strip-pill provider-planning-strip-pill--${section.confidence}`}
                title={`${section.label}: ${formatPlanningSectionConfidenceHint(section)}`}
              >
                {section.label}
                <span className="provider-planning-strip-pill-count">
                  {sectionConfidenceLabel(section)}
                </span>
              </span>
            );
          })}
        </div>
        ) : null}
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <OverallStatusChip status={planning.status} displayTone={displayTone} />
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
          {stripMeta}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div>
            Provider planning
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
            {stripMeta}
          </p>
          {contact && learningGaps.length > 0 ? (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted)", lineHeight: 1.45, fontWeight: 650 }}>
              <span style={{ fontWeight: 800, color: "var(--foreground)" }}>{INTELLIGENCE_LEARNING_GAPS_TITLE}: </span>
              {learningSummary}
            </p>
          ) : null}
        </div>
        <OverallStatusChip status={planning.status} displayTone={displayTone} />
      </div>

      {showSections ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {PROVIDER_PLANNING_PROFILE_SECTION_ORDER.map((sectionId) => {
            const section = planning.sections.find((s) => s.id === sectionId);
            if (!section) return null;
            return (
            <div
              key={section.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 8,
                alignItems: "start",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{section.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {formatPlanningSectionConfidenceHint(section)}
                  {section.last_updated_at ? ` · Updated ${formatPlanningTimestamp(section.last_updated_at)}` : ""}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  ...sectionConfidenceStyle(section.confidence),
                }}
              >
                {sectionConfidenceLabel(section)}
              </span>
            </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
