"use client";

import Link from "next/link";
import type { ProviderOverviewOperationalCommandModel } from "@/lib/surgical-sales/buildProviderOverviewOperationalCommand";

export function ProviderOverviewOperationalCommand({
  model,
}: {
  model: ProviderOverviewOperationalCommandModel;
}) {
  return (
    <section className="pov-operational-command" aria-label="Operational intelligence">
      <div className="pov-operational-command__head">
        <p className="pov-operational-command__stage">
          Current stage: <strong>{model.currentStageLabel}</strong>
        </p>
        <p className="pov-operational-command__readiness">{model.readinessSummary}</p>
      </div>

      {model.priorityGaps.length > 0 ? (
        <div className="pov-operational-command__gaps">
          <p className="pov-operational-command__k">{model.intelligenceSectionLabel}</p>
          <ul>
            {model.priorityGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {model.nextBestAction ? (
        <p className="pov-operational-command__next">
          Next best action: <strong>{model.nextBestAction}</strong>
        </p>
      ) : null}

      {model.latestSignals.length > 0 ? (
        <div className="pov-operational-command__signals">
          <p className="pov-operational-command__k">Latest field intelligence</p>
          <ul>
            {model.latestSignals.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <nav className="pov-operational-command__links" aria-label="Intelligence workspaces">
        <Link href={model.discoveryMappingHref}>{model.intelligenceWorkflowLabel}</Link>
        <Link href={model.observationHref}>Observation</Link>
        <Link href={model.credentialingHref}>Credentialing</Link>
      </nav>
    </section>
  );
}
