"use client";

import Link from "next/link";
import type { ProviderOverviewSimpleView } from "@/lib/surgical-sales/buildProviderOverviewSimpleView";
import {
  PROVIDER_OVERVIEW_FIELD_COMMAND_KICKER,
  PROVIDER_OVERVIEW_NEXT_BEST_ACTION_LABEL,
} from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";
import { FIELD_OPS_PRIMARY_CTA } from "@/lib/surgical-sales/providerOverviewFieldOpsCta";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export function ProviderOverviewMissionControl({
  view,
  onLogFieldActivity,
}: {
  view: ProviderOverviewSimpleView;
  onLogFieldActivity?: () => void;
}) {
  const action = view.recommendedNextAction;
  const workflow = view.currentWorkflowAction;
  const nextActionLabel = workflow ? workflow.ctaLabel : action.ctaLabel;
  const presentation = view.tactical;

  return (
    <section className="pov-mc pov-mc--anchor" aria-labelledby="pov-mc-action-heading">
      <header className="pov-mc-top">
        <p className="pov-mc-top-label">{PROVIDER_OVERVIEW_FIELD_COMMAND_KICKER}</p>
        <p className="pov-mc-status" aria-label={PROVIDER_FIELD_OPS_SECTION.fieldPosture}>
          <span className="pov-mc-status-item">
            <span className="pov-mc-status-key">Stage</span>
            <span className="pov-mc-status-val">{view.stageLabel}</span>
          </span>
          <span className="pov-mc-status-sep" aria-hidden>
            ·
          </span>
          <span className="pov-mc-status-item">
            <span className="pov-mc-status-key">Visibility</span>
            <span className="pov-mc-status-val">{view.visibilityLabel}</span>
          </span>
        </p>
      </header>

      <div className="pov-mc-command">
        <p className="pov-mc-command-kicker" id="pov-mc-action-heading">
          <span className="pov-mc-command-pulse" aria-hidden />
          {PROVIDER_OVERVIEW_NEXT_BEST_ACTION_LABEL}
        </p>
        <p className="pov-mc-command-narrative">{presentation.nextActionNarrative}</p>
        <div className="pov-mc-command-actions">
          <Link href={action.ctaHref} className="pov-mc-cta-primary">
            {nextActionLabel}
          </Link>
          {onLogFieldActivity ? (
            <button type="button" className="pov-mc-cta-secondary" onClick={onLogFieldActivity}>
              {FIELD_OPS_PRIMARY_CTA.logTouchpoint}
            </button>
          ) : null}
        </div>
      </div>

      {view.tacticalSummary ? (
        <p className="pov-mc-context">{view.tacticalSummary}</p>
      ) : null}
      {view.missionFooter ? <p className="pov-mc-footnote">{view.missionFooter}</p> : null}
    </section>
  );
}
