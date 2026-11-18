"use client";

import Link from "next/link";

export function ProviderTabSectionHeader({
  title,
  subtitle,
  action,
}: {
  title?: string;
  subtitle?: string;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
}) {
  const toolbarOnly = !title && !subtitle && Boolean(action);

  return (
    <header
      className={`provider-tab-section-header${toolbarOnly ? " provider-tab-section-header--toolbar" : ""}`}
    >
      {title || subtitle ? (
        <div className="provider-tab-section-header__main">
          {title ? <h2 className="provider-tab-section-header__title">{title}</h2> : null}
          {subtitle ? <p className="provider-tab-section-header__subtitle">{subtitle}</p> : null}
        </div>
      ) : null}
      {action ? (
        "href" in action ? (
          <Link href={action.href} className="provider-tab-section-header__action">
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            className="provider-tab-section-header__action"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )
      ) : null}
    </header>
  );
}
