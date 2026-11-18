"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProviderOverviewWorkflowCtaAction } from "@/lib/surgical-sales/providerOverviewWorkflowCta";
import type {
  ProviderOverviewTacticalHeroModel,
  ProviderOverviewUpcomingTouchModel,
} from "@/lib/surgical-sales/buildProviderOverviewBody";
import { PROVIDER_OVERVIEW_CUSTOM_ACTION } from "@/lib/surgical-sales/providerOverviewDiscoveryApprovalActions";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { PROVIDER_OVERVIEW_WORKFLOW_CTA } from "@/lib/surgical-sales/deriveProviderOverviewWorkflowActions";

function actionIsRenderable(action: {
  href?: string;
  workflowAction?: unknown;
  customAction?: unknown;
}) {
  return Boolean(action.href) || Boolean(action.workflowAction) || Boolean(action.customAction);
}

function resolvePrimaryAction(hero: ProviderOverviewTacticalHeroModel) {
  return (
    hero.actions.find(
      (action) => action.emphasis === "primary" && actionIsRenderable(action),
    ) ??
    hero.actions.find((action) => action.id === "briefing" && action.href) ??
    hero.actions.find((action) => action.id === "debrief" && action.href)
  );
}

function resolveSecondaryActions(hero: ProviderOverviewTacticalHeroModel) {
  return hero.actions.filter(
    (action) => action.emphasis === "secondary" && actionIsRenderable(action),
  );
}

export function ProviderOverviewExecutionActions({
  hero,
  upcoming,
  onLogFieldIntel,
  onWorkflowCta,
  onOpenObservationApproval,
  onOpenOptionalIntelligence,
  discoveryMappingHref,
  intelligenceWorkflowLabel,
}: {
  hero: ProviderOverviewTacticalHeroModel;
  upcoming: ProviderOverviewUpcomingTouchModel;
  onLogFieldIntel: () => void;
  onWorkflowCta?: (action: ProviderOverviewWorkflowCtaAction) => void;
  onOpenObservationApproval?: () => void;
  onOpenOptionalIntelligence?: () => void;
  discoveryMappingHref?: string;
  intelligenceWorkflowLabel?: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryAction = resolvePrimaryAction(hero);
  const secondaryActions = resolveSecondaryActions(hero);
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
    <div className="pov-exec-actions" data-testid="pov-exec-actions">
      {debriefTouch ? (
        <p className="pov-exec-actions__debrief-note">{debriefTouch.whenLabel}</p>
      ) : null}

      {primaryAction?.customAction ? (
        <button
          type="button"
          className="pov-exec-actions__primary"
          data-testid="pov-rail-primary-cta"
          onClick={() => handleCustomAction(primaryAction.customAction)}
        >
          {primaryAction.label}
        </button>
      ) : primaryAction?.workflowAction && onWorkflowCta ? (
        <button
          type="button"
          className={`pov-exec-actions__primary${primaryAction.id === "debrief" ? " pov-exec-actions__primary--debrief" : ""}`}
          data-testid="pov-rail-primary-cta"
          onClick={() => onWorkflowCta(primaryAction.workflowAction!)}
        >
          {primaryAction.label || PROVIDER_OVERVIEW_WORKFLOW_CTA.startFirstEngagement}
        </button>
      ) : primaryAction?.href ? (
        <Link
          href={primaryAction.href}
          className={`pov-exec-actions__primary${primaryAction.id === "debrief" ? " pov-exec-actions__primary--debrief" : ""}`}
          data-testid="pov-rail-primary-cta"
        >
          {primaryAction.label || PROVIDER_OVERVIEW_WORKFLOW_CTA.startFirstEngagement}
        </Link>
      ) : null}

      {secondaryActions.length > 0 ? (
        <div className="pov-exec-actions__secondary" data-testid="pov-rail-secondary-actions">
          {secondaryActions.map((action) =>
            action.customAction ? (
              <button
                key={action.id}
                type="button"
                className="pov-exec-actions__secondary-btn"
                data-testid={`pov-rail-secondary-cta-${action.id}`}
                onClick={() => handleCustomAction(action.customAction)}
              >
                {action.label}
              </button>
            ) : action.workflowAction && onWorkflowCta ? (
              <button
                key={action.id}
                type="button"
                className="pov-exec-actions__secondary-btn"
                data-testid={`pov-rail-secondary-cta-${action.id}`}
                onClick={() => onWorkflowCta(action.workflowAction!)}
              >
                {action.label}
              </button>
            ) : action.href ? (
              <Link
                key={action.id}
                href={action.href}
                className="pov-exec-actions__secondary-btn"
                data-testid={`pov-rail-secondary-cta-${action.id}`}
              >
                {action.label}
              </Link>
            ) : null,
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="pov-exec-actions__more"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen((open) => !open)}
      >
        More actions
        <span aria-hidden>{moreOpen ? " ▴" : " ▾"}</span>
      </button>
      {moreOpen ? (
        <div className="pov-exec-actions__more-panel">
          {discoveryMappingHref ? (
            <Link href={discoveryMappingHref} className="pov-exec-actions__more-link">
              {intelligenceWorkflowLabel ?? "Open field map"}
            </Link>
          ) : null}
          {LOG_UPDATE_UI_ENABLED ? (
            <button type="button" className="pov-exec-actions__more-link" onClick={onLogFieldIntel}>
              Field note
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
