"use client";

import React from "react";
import {
  providerFollowUpProgress,
  type ProviderFollowUpItem,
} from "@/lib/surgical-sales/buildProviderFollowUpItemsView";

export function ProviderFollowUpItemsSection({
  items,
  onToggleComplete,
  className,
}: {
  items: ProviderFollowUpItem[];
  onToggleComplete: (item: ProviderFollowUpItem, completed: boolean) => void;
  className?: string;
}) {
  if (items.length === 0) return null;

  const progress = providerFollowUpProgress(items);
  const sectionClassName = ["pov-cc-summary mc-surface mc-surface--raised", className].filter(Boolean).join(" ");

  return (
    <section
      className={sectionClassName}
      aria-labelledby="pib-follow-up-items-title"
      data-testid="provider-follow-up-items"
    >
      <div className="pib-section-head">
        <div className="pib-section-head__copy">
          <p className="pib-section-head__kicker">Next actions</p>
          <h2 id="pib-follow-up-items-title" className="pov-cc-summary__title pib-section-head__title">
            Follow-up Items
          </h2>
        </div>
        <div className="pib-section-head__meta">
          <span className="pib-evidence-count">
            {progress.openCount} open · {progress.completedCount} done
          </span>
        </div>
      </div>
      <ul className="pib-follow-up-items">
        {items.map((item) => (
          <li key={item.id} className={`pib-follow-up-item${item.completed ? " pib-follow-up-item--done" : ""}`}>
            <label className="pib-follow-up-item__label">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(event) => onToggleComplete(item, event.target.checked)}
              />
              <span className="pib-follow-up-item__text">{item.title}</span>
            </label>
            <span className="pib-follow-up-item__meta">{item.engagementLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
