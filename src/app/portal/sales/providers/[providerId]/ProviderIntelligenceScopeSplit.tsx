"use client";

import type {
  IntelligenceScopeBullet,
  ProviderIntelligenceScopeDisplay,
} from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import { buildProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import React from "react";

function ScopePanel({
  panel,
  variant,
  onBulletClick,
}: {
  panel: ProviderIntelligenceScopeDisplay["facility"];
  variant: "facility" | "provider";
  onBulletClick?: (dbKey: string) => void;
}) {
  const hasBullets = panel.bullets.length > 0;

  return (
    <section
      className={`provider-intel-scope-panel provider-intel-scope-panel--${variant} pov-intel-panel`}
      aria-labelledby={`provider-intel-scope-${variant}-title`}
    >
      <header className="provider-intel-scope-panel-head">
        <h3 id={`provider-intel-scope-${variant}-title`} className="provider-intel-scope-panel-title">
          {panel.title}
        </h3>
        <p className="provider-intel-scope-panel-subtitle">{panel.subtitle}</p>
        {panel.inheritanceLine ? (
          <p className="provider-intel-scope-inherit-line">{panel.inheritanceLine}</p>
        ) : null}
      </header>
      {hasBullets ? (
        <ul className="provider-intel-scope-bullet-list">
          {panel.bullets.map((bullet) => (
            <ScopeBulletRow
              key={bullet.dbKey}
              bullet={bullet}
              variant={variant}
              onClick={onBulletClick ? () => onBulletClick(bullet.dbKey) : undefined}
            />
          ))}
        </ul>
      ) : (
        <p className="provider-intel-scope-empty">{panel.emptyHint}</p>
      )}
    </section>
  );
}

function ScopeBulletRow({
  bullet,
  variant,
  onClick,
}: {
  bullet: IntelligenceScopeBullet;
  variant: "facility" | "provider";
  onClick?: () => void;
}) {
  const body = (
    <div className="provider-intel-scope-bullet-body">
      <span className="provider-intel-scope-bullet-marker" aria-hidden>
        {bullet.state === "known" ? "•" : "○"}
      </span>
      <span className="provider-intel-scope-bullet-main">
        <span className="provider-intel-scope-bullet-text">{bullet.line}</span>
        {bullet.contextHint || bullet.confidenceLabel ? (
          <span className="provider-intel-scope-bullet-meta">
            {[bullet.contextHint, bullet.confidenceLabel].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </span>
    </div>
  );

  if (onClick) {
    return (
      <li className={`provider-intel-scope-bullet provider-intel-scope-bullet--${bullet.state}`}>
        <button
          type="button"
          className={`provider-intel-scope-bullet-btn provider-intel-scope-bullet-btn--${variant}`}
          onClick={onClick}
          title={bullet.label}
        >
          {body}
        </button>
      </li>
    );
  }

  return (
    <li
      className={`provider-intel-scope-bullet provider-intel-scope-bullet--${bullet.state}`}
      title={bullet.label}
    >
      {body}
    </li>
  );
}

export function ProviderIntelligenceScopeSplit({
  contact,
  organizationName,
  providerName,
  display: displayProp,
  onEditFacilityField,
  onEditProviderField,
  organizationBaseline,
  maxBulletsPerPanel,
  className = "",
}: {
  contact: Record<string, unknown>;
  organizationName?: string | null;
  providerName?: string | null;
  display?: ProviderIntelligenceScopeDisplay;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  maxBulletsPerPanel?: number;
  onEditFacilityField?: (dbKey: string) => void;
  onEditProviderField?: (dbKey: string) => void;
  className?: string;
}) {
  const display = React.useMemo(
    () =>
      displayProp ??
      buildProviderIntelligenceScopeDisplay({
        contact,
        organizationName,
        providerName,
        organizationBaseline,
        maxBulletsPerPanel,
      }),
    [
      displayProp,
      contact,
      organizationName,
      providerName,
      organizationBaseline,
      maxBulletsPerPanel,
    ],
  );

  return (
    <div
      className={`provider-intel-scope-split pov-intel-split${className ? ` ${className}` : ""}`}
      aria-label="Facility and provider intelligence"
    >
      <ScopePanel
        panel={display.facility}
        variant="facility"
        onBulletClick={onEditFacilityField}
      />
      <ScopePanel
        panel={display.provider}
        variant="provider"
        onBulletClick={onEditProviderField}
      />
    </div>
  );
}
