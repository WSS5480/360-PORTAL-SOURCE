"use client";

import {
  CANONICAL_EXECUTION_BLOCKERS_TITLE,
  type CanonicalExecutionBlocker,
} from "@/lib/surgical-sales/buildProviderCanonicalExecutionBlockers";
import { PROVIDER_CANONICAL_SURFACES } from "@/lib/surgical-sales/providerProfileCanonicalSurfaces";
import { PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_KICKER } from "@/lib/surgical-sales/providerOverviewVocabulary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { ProviderOperationalImpactLine } from "./ProviderOperationalImpactLine";
import { ProviderIntelligenceUnlocksNextLine } from "./ProviderIntelligenceUnlocksNextLine";
import { ProviderGapFieldGuidance } from "./ProviderGapFieldGuidance";

export function ProviderExecutionBlockersPanel({
  blockers,
  onResolve,
  onOpenDiscoveryPriorities,
}: {
  blockers: CanonicalExecutionBlocker[];
  onResolve: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  onOpenDiscoveryPriorities: () => void;
}) {
  if (blockers.length === 0) {
    return (
      <section className="provider-ops-blockers provider-ops-blockers--clear" aria-label={CANONICAL_EXECUTION_BLOCKERS_TITLE}>
        <p className="provider-ops-blockers-clear">No execution risks on file.</p>
        <button type="button" className="provider-ops-blockers-link" onClick={onOpenDiscoveryPriorities}>
          {PROVIDER_CANONICAL_SURFACES.discovery_priorities.label} →
        </button>
      </section>
    );
  }

  return (
    <section className="provider-ops-blockers provider-ops-ops-panel" aria-label={CANONICAL_EXECUTION_BLOCKERS_TITLE}>
      <header className="provider-ops-blockers-head">
        <h2 className="provider-ops-blockers-title">{CANONICAL_EXECUTION_BLOCKERS_TITLE}</h2>
        <p className="provider-ops-blockers-kicker">{PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_KICKER}</p>
      </header>
      <ul className="provider-ops-blockers-list">
        {blockers.map((blocker) => (
          <li
            key={blocker.id}
            className={`provider-ops-blockers-item provider-ops-blockers-item--${blocker.kind}`}
          >
            <button
              type="button"
              className="provider-ops-blockers-btn"
              onClick={() => onResolve(blocker.sectionId, blocker.dbKey)}
            >
              <span className="provider-ops-blockers-kind">
                {blocker.kind === "hard_stop"
                  ? "Top operational risk"
                  : blocker.kind === "protect_field_time"
                    ? "Likely risk"
                    : "Learn first"}
              </span>
              <span className="provider-ops-blockers-headline">{blocker.headline}</span>
              <ProviderOperationalImpactLine
                consequence={blocker.operationalConsequence}
                impact={blocker.operationalImpact}
                compact={!blocker.operationalConsequence}
              />
              {blocker.fieldGuidance ? (
                <ProviderGapFieldGuidance guidance={blocker.fieldGuidance} compact />
              ) : null}
              {blocker.dbKey ? (
                <ProviderIntelligenceUnlocksNextLine dbKey={blocker.dbKey} compact />
              ) : (
                <span className="provider-ops-blockers-resolve">{blocker.resolveScan}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="provider-ops-blockers-foot-link" onClick={onOpenDiscoveryPriorities}>
        Full {PROVIDER_CANONICAL_SURFACES.discovery_priorities.label.toLowerCase()} on Intelligence →
      </button>
    </section>
  );
}
