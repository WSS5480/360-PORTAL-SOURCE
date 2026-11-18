"use client";

import React from "react";
import type { DiscoveryAnswerImpact } from "@/lib/surgical-sales/discoveryLiveUpdate";
import { IntelligenceSaveConfirmation } from "@/components/sales/intelligenceCapture/IntelligenceSaveConfirmation";
import type { IntelligenceSaveConfirmationGroup } from "@/lib/surgical-sales/intelligenceSaveConfirmation";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";

export function ProviderDiscoveryLivePanel({
  active,
  latestImpact,
  readinessChangelog,
  feedbackQueue,
}: {
  active: boolean;
  latestImpact: DiscoveryAnswerImpact | null;
  readinessChangelog: string[];
  feedbackQueue: { id: string; line: string; scope: IntelligenceScope }[];
}) {
  if (!active && feedbackQueue.length === 0 && !latestImpact) return null;

  const saveGroups: IntelligenceSaveConfirmationGroup[] = latestImpact?.saveConfirmation
    ? [latestImpact.saveConfirmation]
    : [];

  return (
    <section
      className={`pau-discovery-live${active ? " pau-discovery-live--active" : ""}`}
      aria-live="polite"
      aria-label="Discovery live updates"
    >
      {saveGroups.length > 0 ? (
        <IntelligenceSaveConfirmation
          groups={saveGroups}
          title={null}
          className="pau-discovery-live-save-confirmation"
        />
      ) : null}

      {latestImpact ? (
        <div className="pau-discovery-live-latest">
          <span className="pau-discovery-live-kicker">Operational map updating</span>
          <p className="pau-discovery-live-impact">
            {sanitizeIntelligenceTabUserCopy(latestImpact.feedbackLine)}
          </p>
          <p className="pau-discovery-live-summary">
            {sanitizeIntelligenceTabUserCopy(latestImpact.scanSummaryLine)}
          </p>
          <p className="pau-discovery-live-counts">
            Provider {latestImpact.deploymentAfter.provider.tierLabel}
            {" · "}
            Facility {latestImpact.deploymentAfter.facility.tierLabel}
          </p>
        </div>
      ) : null}

      {readinessChangelog.length > 0 ? (
        <div className="pau-discovery-live-readiness">
          <span className="pau-discovery-live-kicker">What changed</span>
          <ul className="pau-discovery-live-readiness-list">
            {readinessChangelog.map((line) => (
              <li key={line}>{sanitizeIntelligenceTabUserCopy(line)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {feedbackQueue.length > 0 ? (
        <ul className="pau-discovery-live-queue">
          {feedbackQueue.map((item) => (
            <li key={item.id}>{sanitizeIntelligenceTabUserCopy(item.line)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
