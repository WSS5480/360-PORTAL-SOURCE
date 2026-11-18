"use client";

import Link from "next/link";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { CaseIdentityDisplay } from "@/components/sales/CaseIdentityDisplay";
import { caseIdentityCss } from "@/components/sales/caseIdentityCss";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import { caseHeaderMobileCss } from "./caseHeaderMobileCss";

export type MobileHeaderChip = {
  id: string;
  label: string;
  href?: string;
  brand?: boolean;
};

/** @deprecated Use CaseIdentity */
export type CaseExecutionHeaderMeta = CaseIdentity & {
  facilityId?: string;
};

/** @deprecated Use CaseIdentity */
export type ObservationFieldHeaderMeta = CaseExecutionHeaderMeta;

export function CaseDetailMobileHeader({
  identity,
  facilityId,
  chips,
  busy,
  onAddNote,
  onNotifications,
  onOverflow,
}: {
  identity: CaseIdentity;
  facilityId?: string;
  chips?: MobileHeaderChip[];
  busy?: boolean;
  onAddNote?: () => void;
  onNotifications?: () => void;
  onOverflow: () => void;
}) {
  const headerChips = chips ?? [];

  return (
    <div className="case-mobile-only case-mobile-header case-mobile-header--executive">
      <style dangerouslySetInnerHTML={{ __html: `${caseHeaderMobileCss}\n${caseIdentityCss}` }} />
      <div className="case-mobile-header-top case-mobile-header-top--executive">
        <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
        <Link href="/portal/sales/cases" className="case-mobile-back" aria-label="Back to cases" data-surgical-press>
          ←
        </Link>
        <div className="case-mobile-header-body case-mobile-header-body--executive">
          <CaseIdentityDisplay
            identity={identity}
            variant="header"
            facilityHref={
              facilityId ? `/portal/sales/accounts/${encodeURIComponent(facilityId)}` : undefined
            }
            showTapHint={false}
          />
          {headerChips.length > 0 ? (
            <div className="case-exec-summary-chips">
              {headerChips.map((chip) =>
                chip.href ? (
                  <Link
                    key={chip.id}
                    href={chip.href}
                    data-surgical-press
                    className={`case-mobile-header-chip${chip.brand ? " case-mobile-header-chip--brand" : ""}`}
                  >
                    {chip.label}
                  </Link>
                ) : (
                  <span
                    key={chip.id}
                    className={`case-mobile-header-chip${chip.brand ? " case-mobile-header-chip--brand" : ""}`}
                  >
                    {chip.label}
                  </span>
                ),
              )}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="case-mobile-overflow-btn"
          aria-label="More actions"
          onClick={onOverflow}
          disabled={busy}
        >
          More
        </button>
      </div>
    </div>
  );
}
