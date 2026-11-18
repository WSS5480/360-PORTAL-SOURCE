"use client";

import Link from "next/link";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import React from "react";
import {
  buildProviderOverviewHref,
  ENGAGEMENT_NAV_BACK_TO_PROVIDER,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { EngagementRecordPanel } from "./EngagementRecordPanel";

export type EngagementDetailPayload = {
  ok?: boolean;
  error?: string;
  engagement?: Record<string, unknown>;
  provider?: { id?: string; display_name?: string; specialty?: string | null } | null;
  organization?: { id?: string; name?: string } | null;
  case?: { id?: string; case_number?: string } | null;
  opportunity?: {
    id?: string;
    account_name?: string;
    physician_name?: string | null;
    stage?: string;
    product_line?: string | null;
  } | null;
  activities?: Array<{ id: string; activity_type: string; body: string; created_at: string }>;
};

export function EngagementDetailMobileView({
  engagementId,
  data,
  err,
  saving,
  onReload,
  onError,
  onSavingChange,
}: {
  engagementId: string;
  data: EngagementDetailPayload;
  err: string | null;
  saving: boolean;
  onReload: () => Promise<void>;
  onError: (msg: string | null) => void;
  onSavingChange: (v: boolean) => void;
}) {
  const engagement = data.engagement!;
  const archived = Boolean(String(engagement.archived_at ?? "").trim());
  const providerId = engagement.provider_id ? String(engagement.provider_id) : data.provider?.id;
  const backHref = providerId ? buildProviderOverviewHref(String(providerId)) : "/portal/sales/engagements";
  const backLabel = providerId ? ENGAGEMENT_NAV_BACK_TO_PROVIDER : "← Engagements";

  return (
    <div className="engagement-detail-mobile">
      <header className="engagement-detail-mobile-header">
        <div className="engagement-detail-mobile-header-top">
          <div className="engagement-detail-mobile-header-nav">
            <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
            <Link href={backHref} className="engagement-detail-mobile-back">
              {backLabel}
            </Link>
          </div>
        </div>
      </header>

      <div className="engagement-detail-mobile-body">
        {err ? (
          <p className="engagement-detail-mobile-alert" role="alert">
            {err}
          </p>
        ) : null}
        {archived ? (
          <p className="engagement-detail-mobile-alert engagement-detail-mobile-alert--muted" role="status">
            This engagement is deleted and hidden from active lists.
          </p>
        ) : null}

        <EngagementRecordPanel
          engagementId={engagementId}
          engagement={engagement}
          provider={data.provider ?? null}
          organization={data.organization ?? null}
          saving={saving}
          onReload={onReload}
          onError={onError}
          onSavingChange={onSavingChange}
        />
      </div>
    </div>
  );
}
