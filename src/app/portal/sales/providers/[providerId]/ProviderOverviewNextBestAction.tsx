"use client";

import Link from "next/link";
import type { ProviderOverviewNextBestActionModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { PROVIDER_FIELD_OPS_CTA, PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { btnClasses } from "./providerOverviewStateTokens";

export function ProviderOverviewNextBestAction({
  model,
  onLogFieldUpdate,
  hideSecondaryCta = false,
  suppressMobileSticky = false,
}: {
  model: ProviderOverviewNextBestActionModel;
  onLogFieldUpdate?: () => void;
  /** Avoid duplicating status-rail secondary actions. */
  hideSecondaryCta?: boolean;
  /** Status rail already exposes the primary CTA on mobile. */
  suppressMobileSticky?: boolean;
}) {
  const showSecondary = Boolean(onLogFieldUpdate) && !hideSecondaryCta && LOG_UPDATE_UI_ENABLED;

  return (
    <section className="pov-nba" aria-label={PROVIDER_FIELD_OPS_SECTION.nextFieldAction}>
      <h2 className="pov-nba-heading">{PROVIDER_FIELD_OPS_SECTION.nextFieldAction}</h2>
      <p className="pov-nba-detail">{model.detail}</p>
      <div className="pov-nba-actions">
        <Link href={model.href} className={`${btnClasses("primary")} pov-nba-cta`}>
          {model.label}
        </Link>
        {showSecondary ? (
          <button type="button" className={`${btnClasses("secondary")} pov-nba-secondary`} onClick={onLogFieldUpdate}>
            {PROVIDER_FIELD_OPS_CTA.logFieldIntel}
          </button>
        ) : null}
      </div>

      {!suppressMobileSticky ? (
      <div className="pov-nba-mobile-sticky">
        <Link href={model.href} className={`${btnClasses("primary")} pov-nba-cta`}>
          {model.label}
        </Link>
      </div>
      ) : null}
    </section>
  );
}
