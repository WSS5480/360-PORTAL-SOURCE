"use client";

import React from "react";
import { IntelligencePropagationPanel } from "@/components/sales/intelligenceCapture/IntelligencePropagationPanel";
import { IntelligenceSaveConfirmation } from "@/components/sales/intelligenceCapture/IntelligenceSaveConfirmation";
import {
  TACTICAL_DEBRIEF_CONFIRM_SUBTITLE,
  TACTICAL_DEBRIEF_PROPAGATION_SAVED_HEADING,
} from "@/lib/surgical-sales/engagements/prepareTacticalDebriefUx";
import type { TacticalDebriefSaveConfirmation } from "@/lib/surgical-sales/engagements/tacticalDebriefSaveConfirmation";

export function PrepareTacticalDebriefConfirmation({
  confirmation,
}: {
  confirmation: TacticalDebriefSaveConfirmation;
}) {
  return (
    <div className="pfm-debrief-post-touch" aria-labelledby="pfm-debrief-post-touch-title">
      <p id="pfm-debrief-post-touch-title" className="pfm-debrief-post-touch-progress">
        {confirmation.progressLine}
      </p>
      <p className="pfm-debrief-post-touch-sub">{TACTICAL_DEBRIEF_CONFIRM_SUBTITLE}</p>

      {confirmation.destinationGroups.length > 0 ? (
        <IntelligenceSaveConfirmation
          groups={confirmation.destinationGroups}
          title={null}
          className="pfm-debrief-save-destinations"
        />
      ) : null}

      {confirmation.remainingBlockers.length > 0 ? (
        <section className="pfm-debrief-post-touch-block pfm-debrief-post-touch-block--blockers">
          <h3 className="pfm-debrief-post-touch-kicker">Open items for later</h3>
          <ul className="pfm-debrief-post-touch-list">
            {confirmation.remainingBlockers.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {confirmation.recommendedNextAction ? (
        <section className="pfm-debrief-post-touch-block pfm-debrief-post-touch-block--next">
          <h3 className="pfm-debrief-post-touch-kicker">Recommended next</h3>
          <p className="pfm-debrief-post-touch-next">{confirmation.recommendedNextAction}</p>
        </section>
      ) : null}

      {confirmation.propagationSummary.length > 0 ? (
        <IntelligencePropagationPanel
          targets={confirmation.propagationSummary.filter((t) => t.active)}
          heading={TACTICAL_DEBRIEF_PROPAGATION_SAVED_HEADING}
          className="pfm-debrief-confirm-propagation"
        />
      ) : null}
    </div>
  );
}

export { PrepareTacticalDebriefConfirmationFooter } from "./PrepareTacticalDebriefConfirmationFooter";
