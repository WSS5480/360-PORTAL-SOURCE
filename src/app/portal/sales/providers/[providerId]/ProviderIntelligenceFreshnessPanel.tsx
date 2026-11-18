"use client";

import React from "react";
import {
  buildIntelligenceFreshnessReconfirmationQueue,
  type IntelligenceFreshnessReconfirmationItem,
} from "@/lib/surgical-sales/providerIntelligenceFreshness";
import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { ProviderIntelligenceFreshnessBadge } from "./ProviderIntelligenceFreshnessBadge";

function FreshnessReconfirmRow({
  item,
  onReconfirm,
}: {
  item: IntelligenceFreshnessReconfirmationItem;
  onReconfirm: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
}) {
  const sectionId = intelligenceSectionIdForDbKey(item.dbKey);
  if (!sectionId) return null;

  return (
    <li className={`provider-intel-freshness-row provider-intel-freshness-row--${item.freshnessTier}`}>
      <div className="provider-intel-freshness-row-head">
        <span className="provider-intel-freshness-row-field">
          {intelligenceFieldDisplayName(item.dbKey)}
        </span>
        <ProviderIntelligenceFreshnessBadge
          tier={item.freshnessTier}
          label={item.freshnessBadge}
          title={item.staleWarning ?? undefined}
          compact
        />
        <span className="provider-intel-freshness-row-decay" title="Confidence after time decay">
          {item.confidencePercent}%
        </span>
      </div>
      {item.staleWarning ? (
        <p className="provider-intel-freshness-row-warning">{item.staleWarning}</p>
      ) : null}
      {item.reconfirmationPrompt ? (
        <p className="provider-intel-freshness-row-prompt">{item.reconfirmationPrompt}</p>
      ) : null}
      <button
        type="button"
        className="provider-intel-freshness-row-cta"
        onClick={() => onReconfirm(sectionId, item.dbKey)}
      >
        {item.revalidateCta}
      </button>
    </li>
  );
}

export function ProviderIntelligenceFreshnessPanel({
  contact,
  onReconfirm,
}: {
  contact: Record<string, unknown>;
  onReconfirm: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
}) {
  const fieldMetadata = React.useMemo(() => intelligenceMetadataFromContact(contact), [contact]);

  const queue = React.useMemo(
    () => buildIntelligenceFreshnessReconfirmationQueue(contact, fieldMetadata, 5),
    [contact, fieldMetadata],
  );

  if (queue.length === 0) return null;

  const outdatedCount = queue.filter((q) => q.freshnessTier === "outdated").length;
  const refreshCount = queue.filter((q) => q.freshnessTier === "needs_refresh").length;

  return (
    <section
      className="provider-intel-freshness-panel"
      aria-label="Signal freshness"
    >
      <header className="provider-intel-freshness-panel-head">
        <h3 className="provider-intel-freshness-panel-title">Signal freshness</h3>
        <p className="provider-intel-freshness-panel-lead">
          Intelligence decays over time unless reconfirmed — stale signals are downgraded for planning.
        </p>
        {(outdatedCount > 0 || refreshCount > 0) && (
          <p className="provider-intel-freshness-panel-stats">
            {outdatedCount > 0 ? `${outdatedCount} outdated` : null}
            {outdatedCount > 0 && refreshCount > 0 ? " · " : null}
            {refreshCount > 0 ? `${refreshCount} need refresh` : null}
          </p>
        )}
      </header>
      <ul className="provider-intel-freshness-panel-list">
        {queue.map((item) => (
          <FreshnessReconfirmRow key={item.dbKey} item={item} onReconfirm={onReconfirm} />
        ))}
      </ul>
    </section>
  );
}
