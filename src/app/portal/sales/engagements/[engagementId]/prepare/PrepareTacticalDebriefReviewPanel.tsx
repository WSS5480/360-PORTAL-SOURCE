"use client";

import React from "react";
import { DebriefApprovalReview } from "@/components/sales/aiNoteCapture/DebriefApprovalReview";
import {
  buildDebriefApprovalView,
  buildDebriefApprovalViewFromTacticalAnalysis,
} from "@/lib/surgical-sales/buildDebriefApprovalView";
import type { TacticalDebriefAnalysis } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import type { IntelligencePropagationTarget } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { IntelligencePropagationPanel } from "@/components/sales/intelligenceCapture/IntelligencePropagationPanel";
import { LOG_UPDATE_PROPAGATION_HEADING } from "@/lib/surgical-sales/logUpdateUx";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { ReviewScopeDisplayContext } from "@/lib/surgical-sales/logUpdateReviewPresentation";

export function PrepareTacticalDebriefReviewPanel({
  analysis,
  propagationTargets,
  logUpdate,
  scopeDisplayContext,
  onToggleUpdate,
  onResolveConflict,
}: {
  analysis: TacticalDebriefAnalysis;
  propagationTargets: IntelligencePropagationTarget[];
  logUpdate?: LogUpdateParseResult | null;
  scopeDisplayContext?: ReviewScopeDisplayContext;
  onToggleUpdate?: (id: string, accepted: boolean) => void;
  onResolveConflict?: (id: string, resolution: LogUpdateConflictResolution) => void;
}) {
  const view = React.useMemo(() => {
    if (logUpdate) return buildDebriefApprovalView(logUpdate);
    return buildDebriefApprovalViewFromTacticalAnalysis(analysis);
  }, [analysis, logUpdate]);

  const readOnly = !logUpdate || !onToggleUpdate || !onResolveConflict;

  return (
    <>
      <DebriefApprovalReview
        view={view}
        review={logUpdate ?? undefined}
        readOnly={readOnly}
        scopeDisplayContext={scopeDisplayContext}
        onToggleUpdate={onToggleUpdate}
        onResolveConflict={onResolveConflict}
      />
      {propagationTargets.length > 0 ? (
        <IntelligencePropagationPanel
          targets={propagationTargets}
          heading={LOG_UPDATE_PROPAGATION_HEADING}
        />
      ) : null}
    </>
  );
}
