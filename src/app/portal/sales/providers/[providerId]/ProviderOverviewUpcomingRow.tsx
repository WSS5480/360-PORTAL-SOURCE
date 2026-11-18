"use client";

import Link from "next/link";
import type { ProviderOverviewUpcomingTouchModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { providerOverviewTouchActionHref } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import { btnClasses } from "./providerOverviewStateTokens";

export function ProviderOverviewUpcomingRow({
  model,
}: {
  model: ProviderOverviewUpcomingTouchModel;
}) {
  if (!model) return null;

  const actionHref = providerOverviewTouchActionHref(model);
  if (!actionHref) return null;

  return (
    <section
      className="pov-upcoming"
      aria-label={model.state === "debrief_needed" ? "Debrief needed" : "Upcoming engagement"}
    >
      <div className="pov-upcoming-copy">
        <span className="pov-upcoming-kicker">
          {model.state === "debrief_needed" ? "Debrief needed" : "Upcoming"}
        </span>
        <p className="pov-upcoming-line">
          <strong>{model.title}</strong>
          <span className="pov-upcoming-sep">—</span>
          {model.whenLabel}
        </p>
      </div>
      <Link
        href={actionHref}
        className={`${btnClasses("primary", true)} pov-upcoming-cta`}
      >
        {model.ctaLabel}
      </Link>
    </section>
  );
}
