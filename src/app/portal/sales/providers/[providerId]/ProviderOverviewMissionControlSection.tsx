"use client";

import Link from "next/link";
import type { ProviderOverviewMissionControl } from "@/lib/surgical-sales/buildProviderOverviewMissionControl";
import {
  PROVIDER_OVERVIEW_FIELD_TOUCH_KICKER_EMPTY,
  PROVIDER_OVERVIEW_SCHEDULE_FIELD_TOUCH,
  PROVIDER_OVERVIEW_SIGNAL_FIELD_OBJECTIVE,
  PROVIDER_OVERVIEW_SIGNAL_OR_READINESS,
  PROVIDER_OVERVIEW_SIGNAL_PREP_STATUS,
  PROVIDER_OVERVIEW_SIGNAL_PROCEDURE_STAKES,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import { ProviderOverviewSectionHeader } from "./ProviderOverviewSectionHeader";
import { ProviderOverviewSignalGrid } from "./ProviderOverviewSignalGrid";

export function ProviderOverviewMissionControlSection({
  mission,
}: {
  mission: ProviderOverviewMissionControl;
}) {
  if (!mission.hasUpcomingEngagement) {
    return (
      <section className="provider-ops-mission provider-ops-ops-panel" aria-labelledby="provider-ops-mission-title">
        <ProviderOverviewSectionHeader title={mission.title} kicker={PROVIDER_OVERVIEW_FIELD_TOUCH_KICKER_EMPTY} />
        <ProviderOverviewSignalGrid
          rows={[{ label: PROVIDER_OVERVIEW_SIGNAL_FIELD_OBJECTIVE, value: "Book the next dated OR touch." }]}
        />
        <Link href={mission.scheduleEngagementHref} className="provider-ops-mission-cta">
          {PROVIDER_OVERVIEW_SCHEDULE_FIELD_TOUCH}
        </Link>
      </section>
    );
  }

  const eng = mission.engagement!;
  const signalRows = [
    { label: PROVIDER_OVERVIEW_SIGNAL_PROCEDURE_STAKES, value: mission.whyScan },
    { label: PROVIDER_OVERVIEW_SIGNAL_FIELD_OBJECTIVE, value: mission.objectiveScan },
    { label: PROVIDER_OVERVIEW_SIGNAL_OR_READINESS, value: mission.readinessSummary },
    {
      label: PROVIDER_OVERVIEW_SIGNAL_PREP_STATUS,
      value: (
        <span className={`provider-ops-mission-prep provider-ops-mission-prep--${mission.missingPrepTone}`}>
          {mission.missingPrep}
        </span>
      ),
    },
  ];

  return (
    <section className="provider-ops-mission provider-ops-ops-panel" aria-labelledby="provider-ops-mission-title">
      <ProviderOverviewSectionHeader
        title={eng.typeLabel}
        kicker={`${eng.whenLabel} · ${eng.statusLabel}`}
      />
      {eng.title ? <p className="provider-ops-mission-subtitle">{eng.title}</p> : null}

      <ProviderOverviewSignalGrid rows={signalRows} />

      <div className="provider-ops-mission-actions">
        <Link href={mission.primaryCta.href} className="provider-ops-mission-cta">
          {mission.primaryCta.label}
        </Link>
        {mission.secondaryCta ? (
          <Link href={mission.secondaryCta.href} className="provider-ops-mission-cta-secondary">
            {mission.secondaryCta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
