"use client";

import Link from "next/link";
import React from "react";
import {
  buildProviderEngagementTabRowModel,
  PROVIDER_ENGAGEMENT_TAB_OPEN_LABEL,
} from "@/lib/surgical-sales/engagements/providerEngagementTabDisplay";
import type { ProviderEngagementSummary } from "./providerProfileTypes";

export function ProviderEngagementMobileCard({
  row,
  providerId,
}: {
  row: ProviderEngagementSummary;
  providerId: string;
}) {
  const model = buildProviderEngagementTabRowModel(row, providerId);

  return (
    <article className="provider-engagement-mobile-card">
      <dl className="provider-engagement-mobile-card__grid">
        <div>
          <dt>Type</dt>
          <dd>{model.typeLabel}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{model.whenLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{model.statusLabel}</dd>
        </div>
        <div>
          <dt>{model.indexField.label}</dt>
          <dd>{model.indexField.value}</dd>
        </div>
      </dl>
      <div className="provider-engagement-mobile-actions" role="group" aria-label="Engagement actions">
        <Link href={model.openHref} className="provider-engagement-mobile-action provider-engagement-mobile-action--primary">
          {PROVIDER_ENGAGEMENT_TAB_OPEN_LABEL}
        </Link>
      </div>
    </article>
  );
}
