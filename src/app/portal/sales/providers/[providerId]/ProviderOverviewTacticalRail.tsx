"use client";



import Link from "next/link";

import { useState } from "react";
import type { ProviderOverviewWorkflowCtaAction } from "@/lib/surgical-sales/providerOverviewWorkflowCta";

import type {

  ProviderOverviewTacticalHeroModel,

  ProviderOverviewUpcomingTouchModel,

} from "@/lib/surgical-sales/buildProviderOverviewBody";

import type { ProviderOverviewPriorityUnknown } from "@/lib/surgical-sales/buildProviderOverviewPriorityUnknowns";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import { PROVIDER_OVERVIEW_CUSTOM_ACTION } from "@/lib/surgical-sales/providerOverviewDiscoveryApprovalActions";
import { PROVIDER_OVERVIEW_WORKFLOW_CTA } from "@/lib/surgical-sales/deriveProviderOverviewWorkflowActions";

import { PROVIDER_OVERVIEW_BRIEFING_LABEL } from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";



function actionIsRailRenderable(action: {
  href?: string;
  workflowAction?: unknown;
  customAction?: unknown;
}) {
  return Boolean(action.href) || Boolean(action.workflowAction) || Boolean(action.customAction);
}

function resolvePrimaryRailAction(hero: ProviderOverviewTacticalHeroModel) {
  return (
    hero.actions.find(
      (action) => action.emphasis === "primary" && actionIsRailRenderable(action),
    ) ??
    hero.actions.find((action) => action.id === "briefing" && action.href) ??
    hero.actions.find((action) => action.id === "debrief" && action.href)
  );
}

function resolveSecondaryRailActions(hero: ProviderOverviewTacticalHeroModel) {
  return hero.actions.filter(
    (action) => action.emphasis === "secondary" && actionIsRailRenderable(action),
  );
}



export function ProviderOverviewTacticalRail({

  hero,

  upcoming,

  whyNow,

  priorityUnknowns = [],

  onLogFieldIntel,

  onResolvePriorityUnknown,

  onWorkflowCta,

  onOpenObservationApproval,

  onOpenOptionalIntelligence,

  discoveryMappingHref,

  intelligenceWorkflowLabel,

  embedded = false,

}: {

  hero: ProviderOverviewTacticalHeroModel;

  upcoming: ProviderOverviewUpcomingTouchModel;

  whyNow: string | null;

  priorityUnknowns?: ProviderOverviewPriorityUnknown[];

  onLogFieldIntel: () => void;

  onResolvePriorityUnknown?: (

    sectionId: ProviderIntelligenceSectionId,

    dbKey: string,

  ) => void;

  onWorkflowCta?: (action: ProviderOverviewWorkflowCtaAction) => void;

  onOpenObservationApproval?: () => void;

  onOpenOptionalIntelligence?: () => void;

  /** Deep link into field intelligence workflow (read-only overview). */
  discoveryMappingHref?: string;
  intelligenceWorkflowLabel?: string;

  /** Embedded in command header — hides duplicate telemetry. */

  embedded?: boolean;

}) {

  const [moreOpen, setMoreOpen] = useState(false);

  const primaryAction = resolvePrimaryRailAction(hero);

  const secondaryActions = resolveSecondaryRailActions(hero);

  const debriefTouch = upcoming?.state === "debrief_needed" ? upcoming : null;

  const handleCustomAction = (customAction: string | undefined) => {
    if (customAction === PROVIDER_OVERVIEW_CUSTOM_ACTION.openObservationApproval) {
      onOpenObservationApproval?.();
      return;
    }
    if (customAction === PROVIDER_OVERVIEW_CUSTOM_ACTION.openOptionalIntelligence) {
      onOpenOptionalIntelligence?.();
    }
  };



  return (

    <aside

      className={embedded ? "pov-rail pov-rail--embedded" : "pov-rail pov-rail--mission"}

      aria-label="Mission control"

      data-testid="pov-rail"

    >

      {upcoming?.state === "upcoming" ? (

        <section

          className="pov-rail__block pov-rail__block--engagement"

          aria-labelledby="pov-rail-engagement-label"

          data-testid="pov-rail-engagement"

        >

          <span className="pov-rail__field-label" id="pov-rail-engagement-label">

            {PROVIDER_OVERVIEW_BRIEFING_LABEL.upcomingEngagement}

          </span>

          <p className="pov-rail__upcoming-line">{upcoming.title}</p>

          <p className="pov-rail__upcoming-meta">{upcoming.whenLabel}</p>

        </section>

      ) : null}



      <section className="pov-rail__block pov-rail__block--action" aria-labelledby="pov-rail-next-action">

        {!embedded ? (

          <p className="pov-rail__kicker" id="pov-rail-next-action">

            {PROVIDER_OVERVIEW_BRIEFING_LABEL.nextAction}

          </p>

        ) : null}

        {debriefTouch ? (
          <>
            <p className="pov-rail__upcoming-line">{debriefTouch.title}</p>
            <p className="pov-rail__upcoming-meta">{debriefTouch.whenLabel}</p>
          </>
        ) : null}

        {primaryAction?.customAction ? (
          <button
            type="button"
            className="pov-rail__cta"
            data-testid="pov-rail-primary-cta"
            onClick={() => handleCustomAction(primaryAction.customAction)}
          >
            {primaryAction.label}
          </button>
        ) : primaryAction?.workflowAction && onWorkflowCta ? (
          <button
            type="button"
            className={`pov-rail__cta${primaryAction.id === "debrief" ? " pov-rail__cta--debrief" : ""}`}
            data-testid="pov-rail-primary-cta"
            onClick={() => onWorkflowCta(primaryAction.workflowAction!)}
          >
            {primaryAction.label || PROVIDER_OVERVIEW_WORKFLOW_CTA.startFirstEngagement}
          </button>
        ) : primaryAction?.href ? (
          <Link
            href={primaryAction.href}
            className={`pov-rail__cta${primaryAction.id === "debrief" ? " pov-rail__cta--debrief" : ""}`}
            data-testid="pov-rail-primary-cta"
          >
            {primaryAction.label || PROVIDER_OVERVIEW_WORKFLOW_CTA.startFirstEngagement}
          </Link>
        ) : null}

        {secondaryActions.length > 0 ? (
          <div className="pov-rail__secondary-actions" data-testid="pov-rail-secondary-actions">
            {secondaryActions.map((action) =>
              action.customAction ? (
                <button
                  key={action.id}
                  type="button"
                  className="pov-rail__secondary-cta"
                  data-testid={`pov-rail-secondary-cta-${action.id}`}
                  onClick={() => handleCustomAction(action.customAction)}
                >
                  {action.label}
                </button>
              ) : action.workflowAction && onWorkflowCta ? (
                <button
                  key={action.id}
                  type="button"
                  className="pov-rail__secondary-cta"
                  data-testid={`pov-rail-secondary-cta-${action.id}`}
                  onClick={() => onWorkflowCta(action.workflowAction!)}
                >
                  {action.label}
                </button>
              ) : action.href ? (
                <Link
                  key={action.id}
                  href={action.href}
                  className="pov-rail__secondary-cta"
                  data-testid={`pov-rail-secondary-cta-${action.id}`}
                >
                  {action.label}
                </Link>
              ) : null,
            )}
          </div>
        ) : null}

      </section>



      {whyNow ? (

        <section className="pov-rail__block" aria-labelledby="pov-rail-why-now">

          <span className="pov-rail__field-label" id="pov-rail-why-now">

            {PROVIDER_OVERVIEW_BRIEFING_LABEL.whyNow}

          </span>

          <p className="pov-rail__why-now">{whyNow}</p>

        </section>

      ) : null}



      {priorityUnknowns.length > 0 ? (

        <section

          className="pov-rail__block"

          data-testid="pov-rail-priority-unknowns"

          aria-labelledby="pov-rail-priority-unknowns-label"

        >

          <span className="pov-rail__field-label" id="pov-rail-priority-unknowns-label">

            {PROVIDER_OVERVIEW_BRIEFING_LABEL.priorityUnknowns}

          </span>

          <ul className="pov-rail__priority-unknowns-list">

            {priorityUnknowns.map((item) => (

              <li key={item.id}>

                {onResolvePriorityUnknown && item.sectionId ? (

                  <button

                    type="button"

                    className="pov-rail__priority-unknown"

                    onClick={() => onResolvePriorityUnknown(item.sectionId!, item.primaryDbKey)}

                  >

                    {item.question}

                  </button>

                ) : (

                  <span className="pov-rail__priority-unknown">{item.question}</span>

                )}

              </li>

            ))}

          </ul>

        </section>

      ) : null}



      {!embedded ? (

        <section className="pov-rail__block pov-rail__block--secondary" aria-labelledby="pov-rail-secondary-label">

          <button

            type="button"

            className="pov-rail__more-toggle"

            aria-expanded={moreOpen}

            onClick={() => setMoreOpen((open) => !open)}

            id="pov-rail-secondary-label"

          >

            {PROVIDER_OVERVIEW_BRIEFING_LABEL.secondaryActions}

            <span aria-hidden>{moreOpen ? " ▴" : " ▾"}</span>

          </button>

          {moreOpen ? (
            <>
              {discoveryMappingHref ? (
                <Link href={discoveryMappingHref} className="pov-rail__secondary-link">
                  {intelligenceWorkflowLabel ?? "Open field map"}
                </Link>
              ) : null}
              {LOG_UPDATE_UI_ENABLED ? (
                <button type="button" className="pov-rail__secondary-link" onClick={onLogFieldIntel}>
                  Field note
                </button>
              ) : null}
            </>
          ) : null}

        </section>

      ) : (

        <section className="pov-rail__block pov-rail__block--secondary pov-rail__block--embedded-more">

          <button

            type="button"

            className="pov-rail__more-toggle"

            aria-expanded={moreOpen}

            onClick={() => setMoreOpen((open) => !open)}

          >

            More actions

            <span aria-hidden>{moreOpen ? " ▴" : " ▾"}</span>

          </button>

          {moreOpen ? (
            <>
              {discoveryMappingHref ? (
                <Link href={discoveryMappingHref} className="pov-rail__secondary-link">
                  {intelligenceWorkflowLabel ?? "Open field map"}
                </Link>
              ) : null}
              {LOG_UPDATE_UI_ENABLED ? (
                <button type="button" className="pov-rail__secondary-link" onClick={onLogFieldIntel}>
                  Field note
                </button>
              ) : null}
            </>
          ) : null}

        </section>

      )}

    </aside>

  );

}


