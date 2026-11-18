"use client";

import Link from "next/link";
import React from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import {
  buildProviderOverviewHref,
  ENGAGEMENT_NAV_BACK_TO_PROVIDER,
  ENGAGEMENT_RECORD_TITLE,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import { userFacingError } from "@/lib/errors/userFacingError";
import { engagementDetailMobileCss } from "../engagementDetailMobileCss";
import { EngagementDetailMobileView, type EngagementDetailPayload } from "./EngagementDetailMobileView";
import { EngagementRecordPanel } from "./EngagementRecordPanel";

function useEngagementMobileLayout() {
  // Must start false on both sides: reading the viewport during the first render makes
  // the client produce different markup than the server and breaks hydration.
  const [mobile, setMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return mobile;
}

export default function EngagementDetailPortalClient({ engagementId }: { engagementId: string }) {
  const mobileLayout = useEngagementMobileLayout();
  const [data, setData] = React.useState<EngagementDetailPayload | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {
        cache: "no-store",
      });
      const j = (await res.json()) as EngagementDetailPayload;
      if (!res.ok || !j.ok || !j.engagement) throw new Error(j.error || "Not found");
      setData(j);
    } catch (e: unknown) {
      setErr(userFacingError(e, "We could not open this engagement. Please try again."));
    } finally {
      setBusy(false);
    }
  }, [engagementId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (busy && !data?.engagement) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: engagementDetailMobileCss }} />
        {mobileLayout ? (
          <div className="engagement-detail-mobile engagement-detail-mobile--loading">
            <header className="engagement-detail-mobile-header">
              <div className="engagement-detail-mobile-header-top">
                <div className="engagement-detail-mobile-header-nav">
                  <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
                  <Link href="/portal/sales/engagements" className="engagement-detail-mobile-back">
                    ← Engagements
                  </Link>
                </div>
              </div>
            </header>
            <p className="engagement-detail-mobile-sub" style={{ padding: "16px var(--edm-pad-x, 10px)" }}>
              Loading…
            </p>
          </div>
        ) : (
          <div className="engagement-detail-page engagement-detail-page--loading">
            <p className="engagement-detail-page-muted">Loading…</p>
          </div>
        )}
      </>
    );
  }

  const engagement = data?.engagement;
  if (!engagement) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: engagementDetailMobileCss }} />
        {mobileLayout ? (
          <div className="engagement-detail-mobile" style={{ padding: 16 }}>
            <header className="engagement-detail-mobile-header">
              <div className="engagement-detail-mobile-header-top">
                <div className="engagement-detail-mobile-header-nav">
                  <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
                  <Link href="/portal/sales/engagements" className="engagement-detail-mobile-back">
                    ← Engagements
                  </Link>
                </div>
              </div>
            </header>
            <p className="engagement-detail-mobile-alert">
              {err || "This engagement is no longer available."}
            </p>
          </div>
        ) : (
          <div className="engagement-detail-page" style={{ padding: 16 }}>
            <p className="engagement-detail-page-alert">
              {err || "This engagement is no longer available."}
            </p>
            <Link href="/portal/sales/engagements" className="engagement-detail-page-back">
              ← Back to engagements
            </Link>
          </div>
        )}
      </>
    );
  }

  if (mobileLayout && data) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: engagementDetailMobileCss }} />
        <EngagementDetailMobileView
          engagementId={engagementId}
          data={data}
          err={err}
          saving={saving}
          onReload={load}
          onError={setErr}
          onSavingChange={setSaving}
        />
      </>
    );
  }

  const providerId = data?.provider?.id
    ? String(data.provider.id)
    : engagement.provider_id
      ? String(engagement.provider_id)
      : null;
  const providerOverviewHref = providerId ? buildProviderOverviewHref(providerId) : null;
  const archived = Boolean(String(engagement.archived_at ?? "").trim());

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: engagementDetailMobileCss }} />
      <div className="engagement-detail-page">
        <nav className="engagement-detail-page-nav" aria-label="Engagement navigation">
          <Link href="/portal/sales/engagements" className="engagement-detail-page-back">
            ← {ENGAGEMENT_RECORD_TITLE}
          </Link>
          {providerOverviewHref ? (
            <Link href={providerOverviewHref} className="engagement-detail-page-provider-link">
              {ENGAGEMENT_NAV_BACK_TO_PROVIDER}
            </Link>
          ) : null}
        </nav>

        {err ? <p className="engagement-detail-page-alert">{err}</p> : null}
        {archived ? (
          <p className="engagement-detail-page-muted">
            This engagement is deleted and hidden from active lists.
          </p>
        ) : null}

        <EngagementRecordPanel
          engagementId={engagementId}
          engagement={engagement}
          provider={data?.provider ?? null}
          organization={data?.organization ?? null}
          saving={saving}
          onReload={load}
          onError={setErr}
          onSavingChange={setSaving}
        />
      </div>
    </>
  );
}
