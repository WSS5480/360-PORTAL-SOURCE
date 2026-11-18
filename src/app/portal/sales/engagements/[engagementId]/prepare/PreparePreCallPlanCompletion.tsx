"use client";

import type { PreCallPlanSectionCompletion } from "@/lib/surgical-sales/engagements/preCallPlanSectionCompletion";

export function PreparePreCallPlanCompletion({
  completion,
  saving,
  showProgressRing = false,
}: {
  completion: PreCallPlanSectionCompletion;
  saving?: boolean;
  showProgressRing?: boolean;
}) {
  const { draftedCount, totalSections, missingLabels } = completion;
  const sectionWord = totalSections === 1 ? "section" : "sections";
  const progressPercent =
    totalSections > 0 ? Math.round((draftedCount / totalSections) * 100) : 0;

  return (
    <div className="pfm-precall-completion" aria-live="polite">
      {showProgressRing ? (
        <div
          className="pfm-precall-completion__ring"
          style={{ ["--icp-progress" as string]: String(progressPercent) }}
          data-label={`${draftedCount}/${totalSections}`}
          aria-hidden
        />
      ) : null}
      <div className="pfm-precall-completion__body">
        <p className="pfm-precall-completion__summary">
          <span className="pfm-precall-completion__label">Plan completion:</span>{" "}
          <span className="pfm-precall-completion__count">
            {draftedCount} of {totalSections} {sectionWord} drafted
          </span>
          {saving ? <span className="pfm-precall-completion__saving"> · Saving…</span> : null}
        </p>
        {missingLabels.length > 0 ? (
          <p className="pfm-precall-completion__missing">
            <span className="pfm-precall-completion__missing-label">Missing:</span>{" "}
            {missingLabels.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
