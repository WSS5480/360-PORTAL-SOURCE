"use client";

import type { ReactNode } from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";

export function ScMobileListHeaderRow({
  title,
  countLabel,
  actions,
  titleWrapClassName,
}: {
  title: string;
  countLabel?: string;
  actions?: ReactNode;
  titleWrapClassName?: string;
}) {
  return (
    <div className="sc-mobile-list-header-top">
      <PortalMobileMenuButton className="sc-mobile-list-menu" />
      <div className={`sc-mobile-list-header-identity${titleWrapClassName ? ` ${titleWrapClassName}` : ""}`}>
        <h1 className="sc-mobile-list-title">{title}</h1>
        {countLabel ? <div className="sc-mobile-list-count">{countLabel}</div> : null}
      </div>
      {actions ? <div className="sc-mobile-list-header-actions">{actions}</div> : null}
    </div>
  );
}
