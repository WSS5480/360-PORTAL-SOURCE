"use client";

import {
  flattenOperationalSignalGroups,
  type OperationalFieldSignal,
  type OperationalFieldSignalGroup,
} from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  CHIP_STATUS_LABELS,
  type OperationalChipStatus,
} from "@/lib/surgical-sales/providerOverviewMissionPresentation";

const STATUS_ORDER: OperationalChipStatus[] = [
  "needs_validation",
  "still_learning",
  "not_observed",
  "confirmed",
];

const MAX_PER_GROUP = 4;

function SignalChip({
  signal,
  onResolve,
}: {
  signal: OperationalFieldSignal;
  onResolve?: (signal: OperationalFieldSignal) => void;
}) {
  const status = signal.chipStatus;
  const title = [signal.meaning, signal.actionHint].filter(Boolean).join(" · ");
  const label = signal.shortLabel || signal.label;

  const inner = (
    <>
      <span className={`pov-chip-tag pov-chip-tag--${status}`}>{CHIP_STATUS_LABELS[status]}</span>
      <span className="pov-chip-topic">{label}</span>
    </>
  );

  if (onResolve && signal.sectionId) {
    return (
      <li className={`pov-chip pov-chip--${status}`}>
        <button type="button" className="pov-chip-btn" onClick={() => onResolve(signal)} title={title}>
          {inner}
        </button>
      </li>
    );
  }

  return (
    <li className={`pov-chip pov-chip--${status}`} title={title}>
      <span className="pov-chip-static">{inner}</span>
    </li>
  );
}

export function ProviderOverviewActiveSignalsStrip({
  groups,
  onOpenIntelligence,
}: {
  groups: OperationalFieldSignalGroup[];
  onOpenIntelligence?: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  const signals = flattenOperationalSignalGroups(groups);
  if (signals.length === 0) return null;

  const handleResolve = onOpenIntelligence
    ? (signal: OperationalFieldSignal) => {
        if (!signal.sectionId) return;
        onOpenIntelligence(signal.sectionId, signal.dbKey);
      }
    : undefined;

  const byStatus = new Map<OperationalChipStatus, OperationalFieldSignal[]>();
  for (const status of STATUS_ORDER) byStatus.set(status, []);
  for (const signal of signals) {
    byStatus.get(signal.chipStatus)?.push(signal);
  }

  return (
    <div className="pov-chips" aria-label="Operational signals">
      {STATUS_ORDER.map((status) => {
        const list = (byStatus.get(status) ?? []).slice(0, MAX_PER_GROUP);
        if (list.length === 0) return null;
        return (
          <div key={status} className="pov-chips-group">
            <ul className="pov-chips-list">
              {list.map((signal) => (
                <SignalChip key={signal.id} signal={signal} onResolve={handleResolve} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
