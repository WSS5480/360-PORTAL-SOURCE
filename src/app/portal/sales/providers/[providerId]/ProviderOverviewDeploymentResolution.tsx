"use client";

import Link from "next/link";
import type { ProviderOverviewDeploymentResolution } from "@/lib/surgical-sales/buildProviderOverviewDeploymentResolution";
import { PROVIDER_OVERVIEW_DEPLOYMENT_RESOLUTION_LABELS } from "@/lib/surgical-sales/providerOverviewVocabulary";

const L = PROVIDER_OVERVIEW_DEPLOYMENT_RESOLUTION_LABELS;

export function ProviderOverviewDeploymentResolutionPanel({
  resolution,
  variant = "feed",
}: {
  resolution: ProviderOverviewDeploymentResolution;
  variant?: "feed" | "sticky";
}) {
  const rootClass =
    variant === "sticky" ? "pov-resolution pov-resolution--sticky" : "pov-resolution pov-resolution--feed";

  return (
    <section className={rootClass} aria-label={L.panelAria}>
      {resolution.blockerHeadline ? (
        <p className="pov-resolution-clears">
          <span className="pov-resolution-label">{L.clearsBlocker}:</span> {resolution.blockerHeadline}
        </p>
      ) : null}

      <div className="pov-resolution-move-block">
        <p className="pov-resolution-kicker">{L.nextBestMove}:</p>
        <p className="pov-resolution-move">{resolution.nextBestMove}</p>
      </div>

      {variant === "feed" && resolution.whyItMatters ? (
        <p className="pov-resolution-why">
          <span className="pov-resolution-label">{L.whyItMatters}:</span> {resolution.whyItMatters}
        </p>
      ) : null}

      {resolution.bestSource ? (
        <p className="pov-resolution-source">
          <span className="pov-resolution-label">{L.bestSource}:</span> {resolution.bestSource}
        </p>
      ) : null}

      <Link href={resolution.ctaHref} className="pov-resolution-cta">
        {resolution.ctaLabel}
      </Link>
    </section>
  );
}
