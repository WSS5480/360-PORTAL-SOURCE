"use client";

import React from "react";
import { OperationsQueueClickableRow } from "@/components/sales/operations/OperationsQueueClickableRow";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDirectoryLinks, providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  deriveProviderMissionHealth,
  deriveProviderMissionNextAction,
  deriveProviderOperationsUpcomingLabel,
  deriveProviderOpsPriority,
  deriveProviderRelationshipPathwayStageLabel,
  PROVIDER_MISSION_HEALTH_LABEL,
  PROVIDER_OPS_PRIORITY_LABEL,
} from "@/lib/surgical-sales/providerDirectoryOperations";
import { ProvidersOperationsCell } from "./ProvidersOperationsCell";

type SortKey = "provider" | "stage" | "next" | "upcoming" | "priority";

type SortDir = "asc" | "desc";

const PRIORITY_RANK = { overdue: 0, action: 1, waiting: 2, progressing: 3 } as const;

function sortProviders(rows: ProviderDirectoryRow[], key: SortKey, dir: SortDir): ProviderDirectoryRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" }) * sign;
  const num = (a: number, b: number) => (a - b) * sign;

  return [...rows].sort((a, b) => {
    switch (key) {
      case "provider":
        return cmp(providerDisplayName(a), providerDisplayName(b));
      case "stage":
        return cmp(
          deriveProviderRelationshipPathwayStageLabel(a),
          deriveProviderRelationshipPathwayStageLabel(b),
        );
      case "next":
        return cmp(deriveProviderMissionNextAction(a), deriveProviderMissionNextAction(b));
      case "upcoming":
        return cmp(deriveProviderOperationsUpcomingLabel(a), deriveProviderOperationsUpcomingLabel(b));
      case "priority":
        return num(PRIORITY_RANK[deriveProviderOpsPriority(a)], PRIORITY_RANK[deriveProviderOpsPriority(b)]);
      default:
        return 0;
    }
  });
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <div className={className ? `providers-ops-col ${className}` : "providers-ops-col"} role="columnheader">
      <button
        type="button"
        className={`providers-ops-head-btn${active ? " providers-ops-head-btn--active" : ""}`}
        onClick={() => onSort(sortKey)}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
        title={label}
      >
        <span className="providers-ops-head-label">{label}</span>
        {active ? <span className="providers-ops-head-sort" aria-hidden>{dir === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </div>
  );
}

function OperationsRow({ provider: p }: { provider: ProviderDirectoryRow }) {
  const { detailHref } = providerDirectoryLinks(p);
  const priority = deriveProviderOpsPriority(p);
  const health = deriveProviderMissionHealth(p);
  const name = providerDisplayName(p);
  const org = p.primary_organization_name || "No organization";
  const stage = deriveProviderRelationshipPathwayStageLabel(p);
  const nextAction = deriveProviderMissionNextAction(p);
  const upcoming = deriveProviderOperationsUpcomingLabel(p);
  const hasUpcoming = upcoming !== "None scheduled";
  const priorityLabel = PROVIDER_OPS_PRIORITY_LABEL[priority];
  const healthTitle = `${PROVIDER_MISSION_HEALTH_LABEL[health.health]} — ${health.label}`;

  return (
    <OperationsQueueClickableRow
      href={detailHref}
      ariaLabel={`Open provider profile for ${name}`}
      className={`providers-ops-row providers-ops-row--${priority} providers-ops-row--health-${health.health}`}
    >
      <div className="providers-ops-col providers-ops-col--provider" role="cell">
        <span className="providers-ops-provider-name">{name}</span>
        <span className="providers-ops-provider-org">{org}</span>
      </div>
      <div className="providers-ops-col providers-ops-col--stage" role="cell">
        <ProvidersOperationsCell display={stage} truncate="always" className="providers-ops-stage" />
      </div>
      <div className="providers-ops-col providers-ops-col--next" role="cell">
        <ProvidersOperationsCell
          display={nextAction}
          full={nextAction}
          truncate="always"
          className="providers-ops-next-action"
        />
      </div>
      <div className="providers-ops-col providers-ops-col--upcoming" role="cell">
        <ProvidersOperationsCell
          display={upcoming}
          full={upcoming}
          truncate="always"
          className={hasUpcoming ? "providers-ops-upcoming" : "providers-ops-upcoming--none"}
        />
      </div>
      <div className="providers-ops-col providers-ops-col--priority" role="cell">
        <span className="providers-ops-priority-label">
          <span
            className={`providers-ops-priority providers-ops-priority--${priority} providers-ops-priority--health-${health.health}`}
            title={healthTitle}
            aria-hidden
          />
          <span className="providers-ops-priority-text">{priorityLabel}</span>
        </span>
      </div>
    </OperationsQueueClickableRow>
  );
}

export function ProvidersOperationsGrid({ providers }: { providers: ProviderDirectoryRow[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>("priority");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const onSort = React.useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(key === "priority" ? "asc" : "asc");
      }
    },
    [sortKey],
  );

  const sorted = React.useMemo(() => sortProviders(providers, sortKey, sortDir), [providers, sortKey, sortDir]);

  return (
    <div
      className="providers-ops-panel ops-queue-panel"
      id="provider-view-panel-operations"
      role="tabpanel"
      aria-labelledby="provider-view-tab-operations"
    >
      <p className="providers-ops-kicker">Daily work management — sorted by priority</p>
      <div className="providers-ops-table-wrap">
        <div className="providers-ops-table ops-queue-table" role="table" aria-label="Providers execution queue">
          <div className="providers-ops-head ops-queue-head" role="row">
            <SortableHeader
              label="Provider"
              sortKey="provider"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
              className="providers-ops-col--provider"
            />
            <SortableHeader
              label="Current Stage"
              sortKey="stage"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
              className="providers-ops-col--stage"
            />
            <SortableHeader
              label="Next Action"
              sortKey="next"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
              className="providers-ops-col--next"
            />
            <SortableHeader
              label="Upcoming Activity"
              sortKey="upcoming"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
              className="providers-ops-col--upcoming"
            />
            <SortableHeader
              label="Priority"
              sortKey="priority"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
              className="providers-ops-col--priority"
            />
          </div>
          <div className="providers-ops-body ops-queue-body">
            {sorted.map((p) => (
              <OperationsRow key={p.id} provider={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
