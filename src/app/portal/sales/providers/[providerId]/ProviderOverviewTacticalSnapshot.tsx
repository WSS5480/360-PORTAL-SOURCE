"use client";

import type {
  OperationalSnapshotGroup,
  OperationalSnapshotGroupId,
  ProviderOperationalSnapshot,
} from "@/lib/surgical-sales/buildProviderOperationalSnapshot";
import {
  PROVIDER_OVERVIEW_OPERATIONAL_SNAPSHOT_TITLE,
} from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

const PROVIDER_TACTICAL_SNAPSHOT_LANE_IDS = ["facility", "workflow", "observation"] as const satisfies readonly OperationalSnapshotGroupId[];

const LANE_LABELS: Record<(typeof PROVIDER_TACTICAL_SNAPSHOT_LANE_IDS)[number], string> = {
  facility: PROVIDER_FIELD_OPS_SECTION.facilityEnvironment,
  workflow: PROVIDER_FIELD_OPS_SECTION.providerWorkflow,
  observation: "Observation viability",
};

function TacticalLane({ group }: { group: OperationalSnapshotGroup }) {
  const [primary, ...rest] = group.insights;

  return (
    <div className={`pov-tactical-lane pov-tactical-lane--${group.id}`}>
      <h3 className="pov-tactical-lane-label">{LANE_LABELS[group.id as keyof typeof LANE_LABELS] ?? group.label}</h3>
      {primary ? (
        <p className="pov-tactical-lane-primary">{primary.synthesis}</p>
      ) : null}
      {rest.length > 0 ? (
        <ul className="pov-tactical-lane-more">
          {rest.map((insight) => (
            <li key={insight.id} className="pov-tactical-lane-more-item">
              {insight.synthesis}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ProviderOverviewTacticalSnapshot({
  snapshot,
}: {
  snapshot: ProviderOperationalSnapshot;
}) {
  const lanes = PROVIDER_TACTICAL_SNAPSHOT_LANE_IDS.map((id) =>
    snapshot.groups.find((g) => g.id === id),
  ).filter((g): g is OperationalSnapshotGroup => Boolean(g));

  if (lanes.length === 0) return null;

  return (
    <section
      className="pov-tactical-brief pov-surface--support"
      aria-labelledby="pov-tactical-brief-heading"
    >
      <header className="pov-tactical-brief-head">
        <div className="pov-tactical-brief-head-main">
          <h2 className="pov-simple-section-title" id="pov-tactical-brief-heading">
            {PROVIDER_OVERVIEW_OPERATIONAL_SNAPSHOT_TITLE}
          </h2>
          <p className="pov-tactical-brief-subtitle">{PROVIDER_FIELD_OPS_SECTION.tacticalSnapshotSubtitle}</p>
        </div>
      </header>

      <div className="pov-tactical-brief-lanes">
        {lanes.map((group) => (
          <TacticalLane key={group.id} group={group} />
        ))}
      </div>
    </section>
  );
}
