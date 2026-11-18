"use client";

import type { ProviderOverviewPathwayTimelineModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export function ProviderOverviewPathwayTimeline({
  model,
}: {
  model: ProviderOverviewPathwayTimelineModel;
}) {
  return (
    <section className="pov-timeline" aria-label={PROVIDER_FIELD_OPS_SECTION.pathwayTimeline}>
      <h2 className="pov-section-title">{PROVIDER_FIELD_OPS_SECTION.pathwayTimeline}</h2>
      <ol className="pov-timeline-track">
        {model.phases.map((phase, index) => (
          <li
            key={phase.id}
            className={`pov-timeline-phase pov-timeline-phase--${phase.status} pov-timeline-phase--${phase.id}`}
          >
            <span className="pov-timeline-node" aria-hidden>
              {phase.status === "complete" ? "✓" : index + 1}
            </span>
            <span className="pov-timeline-label">{phase.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
