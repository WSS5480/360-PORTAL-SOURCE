"use client";

import React from "react";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import type { ObservationMissionBriefingPillarId } from "@/lib/surgical-sales/buildObservationMissionBriefing";
import {
  buildObservationIntelligenceSidebarMetrics,
  type ObservationSidebarActionId,
} from "@/lib/surgical-sales/buildObservationCaseSidebarView";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationCaseSidebarCss } from "./observationCaseSidebarCss";

type SidebarActivity = {
  activity_type?: string;
};

export function ObservationCaseDetailSidebar({
  identity: _identity,
  caseRow,
  activities,
  engagement: _engagement,
  disabled: _disabled,
  onRecommendedAction: _onRecommendedAction,
  onPillarClick: _onPillarClick,
  visible = true,
}: {
  identity: CaseIdentity;
  caseRow: Record<string, unknown>;
  activities?: SidebarActivity[];
  engagement?: Record<string, unknown> | null;
  disabled?: boolean;
  onRecommendedAction?: (actionId: ObservationSidebarActionId) => void;
  onPillarClick?: (pillarId: ObservationMissionBriefingPillarId) => void;
  /** @deprecated No longer shown in the action-driven sidebar */
  ownerName?: string | null;
  /** @deprecated No longer shown in the action-driven sidebar */
  lineProductNames?: string[];
  visible?: boolean;
}) {
  const metrics = React.useMemo(
    () => buildObservationIntelligenceSidebarMetrics({ caseRow, activities }),
    [activities, caseRow],
  );

  if (!visible) return null;

  return (
    <aside className="case-obs-sidebar" aria-label="Intelligence snapshot">
      <style dangerouslySetInnerHTML={{ __html: observationCaseSidebarCss }} />
      <section className="case-obs-sidebar-section" aria-labelledby="case-obs-sidebar-metrics-title">
        <h2 id="case-obs-sidebar-metrics-title" className="case-obs-sidebar-section-title">
          {OBSERVATION_DETAIL_SECTION_LABELS.intelligenceSnapshot}
        </h2>
        <ul className="case-obs-sidebar-metrics">
          {metrics.map((metric) => (
            <li key={metric.id} className="case-obs-sidebar-metric">
              <span className="case-obs-sidebar-metric-label">{metric.shortLabel}</span>
              <span className="case-obs-sidebar-metric-value">{metric.statusLabel}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
