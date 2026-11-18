"use client";

import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { FIELD_OPS_SECONDARY_CTA } from "@/lib/surgical-sales/providerOverviewFieldOpsCta";
import { ProviderPrimaryActionRow } from "./[providerId]/ProviderPrimaryActionRow";

export type ProviderCreatedNextStepsProps = {
  /** When true, show lightweight field-orientation hint (not initiative-first). */
  isNewProspect: boolean;
  newEngagementHref: string;
  createOpportunityHref: string;
  newCaseHref: string;
  noteHref: string;
  onCaptureIntelligence: () => void;
  onDismiss: () => void;
};

/**
 * Shown after Add Provider save — optional follow-ups only (no opportunity auto-create).
 */
export function ProviderCreatedNextSteps({
  isNewProspect,
  newEngagementHref,
  createOpportunityHref,
  newCaseHref,
  noteHref,
  onCaptureIntelligence,
  onDismiss,
}: ProviderCreatedNextStepsProps) {
  return (
    <section
      className="provider-profile-saved-banner provider-profile-saved-banner--created provider-profile-saved-banner--compact"
      aria-labelledby="provider-created-heading"
    >
      <button
        type="button"
        className="provider-profile-saved-dismiss provider-profile-saved-dismiss--corner"
        onClick={onDismiss}
      >
        Dismiss
      </button>
      <div className="provider-profile-saved-banner-inner">
        <div className="provider-profile-saved-banner-copy">
          <h2 id="provider-created-heading" className="provider-profile-saved-banner-title">
            Provider added
          </h2>
          {isNewProspect ? (
            <p className="provider-profile-saved-banner-hint">{OPPORTUNITY_UI.newProspectHint}</p>
          ) : null}
        </div>
        <ProviderPrimaryActionRow
          primaryAction={{
            label: FIELD_OPS_SECONDARY_CTA.newEngagement,
            href: newEngagementHref,
          }}
          newEngagementHref={newEngagementHref}
          newCaseHref={newCaseHref}
          createOpportunityHref={createOpportunityHref}
          noteHref={noteHref}
          onCaptureIntelligence={onCaptureIntelligence}
          logUpdateLabel={FIELD_OPS_SECONDARY_CTA.logUpdate}
        />
      </div>
    </section>
  );
}
