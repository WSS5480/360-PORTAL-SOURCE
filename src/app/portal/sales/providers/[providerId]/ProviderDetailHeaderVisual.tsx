"use client";

import type { ProviderVisualIdentity } from "@/lib/surgical-sales/providerVisualIdentity";

/** Avatar + optional organization mark — compact, non-dominant. */
export function ProviderDetailHeaderVisual({
  identity,
  compact = false,
}: {
  identity: ProviderVisualIdentity;
  compact?: boolean;
}) {
  return (
    <div
      className={`provider-hd-avatar-wrap${compact ? " provider-hd-avatar-wrap--compact" : ""}`}
      aria-hidden
    >
      {identity.hasAvatarImage && identity.avatarUrl ? (
        <img
          src={identity.avatarUrl}
          alt=""
          className="provider-hd-avatar provider-hd-avatar--img"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="provider-hd-avatar provider-hd-avatar--initials">{identity.initials}</span>
      )}
      {identity.hasOrganizationLogo && identity.organizationLogoUrl ? (
        <span className="provider-hd-org-logo" title={identity.organizationName ?? "Organization"}>
          <img
            src={identity.organizationLogoUrl}
            alt=""
            className="provider-hd-org-logo-img"
            loading="lazy"
            decoding="async"
          />
        </span>
      ) : null}
    </div>
  );
}

export function ProviderDetailHeaderFocusChips({ identity }: { identity: ProviderVisualIdentity }) {
  return (
    <div className="provider-hd-focus-chips" aria-label="Clinical focus">
      {identity.specialtyBadge ? (
        <span className="provider-hd-focus-chip provider-hd-focus-chip--specialty">{identity.specialtyBadge}</span>
      ) : (
        <span className="provider-hd-focus-chip provider-hd-focus-chip--muted">
          {identity.specialtyFallbackChip}
        </span>
      )}
      {identity.procedureFocusChips.map((chip) => (
        <span key={chip} className="provider-hd-focus-chip provider-hd-focus-chip--procedure">
          {chip}
        </span>
      ))}
    </div>
  );
}
