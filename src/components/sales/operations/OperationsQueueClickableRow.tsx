"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Full-row navigation with elevated z-index for inline tactical chips. */
export function OperationsQueueClickableRow({
  href,
  ariaLabel,
  className,
  role = "row",
  children,
  actions,
}: {
  href: string;
  ariaLabel: string;
  className?: string;
  role?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className={className ? `ops-queue-row ops-queue-row--clickable ${className}` : "ops-queue-row ops-queue-row--clickable"}
      role={role}
    >
      <Link href={href} className="ops-queue-row__overlay" aria-label={ariaLabel} tabIndex={0} data-surgical-press />
      <div className="ops-queue-row__main">
        <div className="ops-queue-row__grid">{children}</div>
        {actions ? (
          <div
            className="ops-queue-row__actions"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OperationsQueueClickableMobileRow({
  href,
  ariaLabel,
  className,
  children,
  actions,
}: {
  href: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li
      className={
        className
          ? `ops-queue-mobile-row ops-queue-mobile-row--clickable ${className}`
          : "ops-queue-mobile-row ops-queue-mobile-row--clickable"
      }
    >
      <Link href={href} className="ops-queue-row__overlay" aria-label={ariaLabel} tabIndex={0} data-surgical-press />
      <div className="ops-queue-row__content">{children}</div>
      {actions ? (
        <div
          className="ops-queue-row__actions ops-queue-row__actions--mobile"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </li>
  );
}
