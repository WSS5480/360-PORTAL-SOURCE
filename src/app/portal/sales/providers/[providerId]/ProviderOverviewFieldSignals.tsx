"use client";

import type {
  OperationalFieldSignal,
  OperationalFieldSignalGroup,
} from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

const ICON: Record<OperationalFieldSignal["severity"], string> = {
  confirmed: "✓",
  attention: "⚠",
  open: "○",
};

function SignalRow({
  signal,
  onResolve,
}: {
  signal: OperationalFieldSignal;
  onResolve?: (signal: OperationalFieldSignal) => void;
}) {
  const actionable = Boolean(onResolve && signal.sectionId);
  const meta = [signal.meaning, signal.actionHint].filter(Boolean).join(" · ");

  const content = (
    <>
      <span className={`pov-ops-signal-icon pov-ops-signal-icon--${signal.severity}`} aria-hidden>
        {ICON[signal.severity]}
      </span>
      <span className="pov-ops-signal-body">
        <span className="pov-ops-signal-label">{signal.label}</span>
        {meta ? <span className="pov-ops-signal-meta">{meta}</span> : null}
      </span>
      {actionable ? (
        <span className="pov-ops-signal-cue" aria-hidden>
          →
        </span>
      ) : null}
    </>
  );

  if (actionable) {
    return (
      <li className={`pov-ops-signal pov-ops-signal--${signal.severity} pov-ops-signal--actionable`}>
        <button
          type="button"
          className="pov-ops-signal-btn"
          onClick={() => onResolve?.(signal)}
          title={signal.actionHint ?? signal.meaning}
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    <li
      className={`pov-ops-signal pov-ops-signal--${signal.severity}`}
      title={signal.meaning}
    >
      <div className="pov-ops-signal-static">{content}</div>
    </li>
  );
}

export function ProviderOverviewFieldSignals({
  groups,
  onOpenIntelligence,
}: {
  groups: OperationalFieldSignalGroup[];
  onOpenIntelligence?: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  if (groups.length === 0) return null;

  const handleResolve = onOpenIntelligence
    ? (signal: OperationalFieldSignal) => {
        if (!signal.sectionId) return;
        onOpenIntelligence(signal.sectionId, signal.dbKey);
      }
    : undefined;

  return (
    <section className="pov-ops-signals" aria-label="Field readiness indicators">
      {groups.map((group) => (
        <div key={group.id} className="pov-ops-signal-group">
          <h3 className="pov-ops-signal-group-kicker">{group.label}</h3>
          <ul className="pov-ops-signal-list">
            {group.signals.map((signal) => (
              <SignalRow key={signal.id} signal={signal} onResolve={handleResolve} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
