"use client";

import {
  PROVIDER_OVERVIEW_STRATEGY_TITLE,
  type ProviderOverviewOperationalGap,
} from "@/lib/surgical-sales/buildProviderOverviewStrategyGaps";
import {
  PROVIDER_OVERVIEW_CAPTURE_ACTION,
  PROVIDER_OVERVIEW_FINDING_BLOCKER,
  PROVIDER_OVERVIEW_FINDING_ENABLES,
  PROVIDER_OVERVIEW_LINK_OPEN_INTELLIGENCE,
  PROVIDER_OVERVIEW_STRATEGY_EMPTY_KICKER,
  PROVIDER_OVERVIEW_STRATEGY_KICKER,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import { ProviderOverviewSectionHeader } from "./ProviderOverviewSectionHeader";
import { ProviderOperationalImpactTags } from "./ProviderIntelligenceScanSignals";
import { ProviderGapFieldGuidance } from "./ProviderGapFieldGuidance";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

export function ProviderOverviewStrategySection({
  gaps,
  onCapture,
  onOpenIntelligence,
}: {
  gaps: ProviderOverviewOperationalGap[];
  onCapture: (sectionId: string) => void;
  onOpenIntelligence: () => void;
}) {
  if (gaps.length === 0) {
    return (
      <section
        className="provider-ops-strategy provider-ops-ops-panel provider-ops-ops-panel--surgical"
        aria-labelledby="provider-ops-strategy-title"
      >
        <ProviderOverviewSectionHeader
          title={PROVIDER_OVERVIEW_STRATEGY_TITLE}
          kicker={PROVIDER_OVERVIEW_STRATEGY_EMPTY_KICKER}
        />
        <button type="button" className="provider-ops-strategy-empty-link" onClick={onOpenIntelligence}>
          {PROVIDER_OVERVIEW_LINK_OPEN_INTELLIGENCE}
        </button>
      </section>
    );
  }

  return (
    <section
      className="provider-ops-strategy provider-ops-ops-panel provider-ops-ops-panel--surgical"
      aria-labelledby="provider-ops-strategy-title"
    >
      <ProviderOverviewSectionHeader
        title={PROVIDER_OVERVIEW_STRATEGY_TITLE}
        kicker={PROVIDER_OVERVIEW_STRATEGY_KICKER(gaps.length)}
      />

      <ol className="provider-ops-strategy-list">
        {gaps.map((gap, index) => (
          <li key={gap.id} className="provider-ops-strategy-gap">
            <div className="provider-ops-strategy-gap-main">
              <span className="provider-ops-strategy-rank" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="provider-ops-strategy-gap-body">
                <div className="provider-ops-strategy-findings">
                  <div className="provider-ops-finding provider-ops-finding--open">
                    <span className="provider-ops-finding-label">{PROVIDER_OVERVIEW_FINDING_BLOCKER}</span>
                    <span className="provider-ops-finding-value">{gap.headline}</span>
                  </div>
                  <div className="provider-ops-finding provider-ops-finding--impact-scan">
                    <ProviderOperationalImpactTags consequence={gap.operationalConsequence} />
                  </div>
                  <div className="provider-ops-finding provider-ops-finding--field-guidance">
                    <ProviderGapFieldGuidance guidance={gap.fieldGuidance} compact />
                  </div>
                  <div className="provider-ops-finding provider-ops-finding--validated">
                    <span className="provider-ops-finding-label">{PROVIDER_OVERVIEW_FINDING_ENABLES}</span>
                    <span className="provider-ops-finding-value">{gap.unlockScan}</span>
                  </div>
                </div>
              </div>
            </div>
            {LOG_UPDATE_UI_ENABLED ? (
              <button
                type="button"
                className="provider-ops-strategy-capture"
                onClick={() => onCapture(gap.sectionId)}
              >
                {PROVIDER_OVERVIEW_CAPTURE_ACTION}
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
