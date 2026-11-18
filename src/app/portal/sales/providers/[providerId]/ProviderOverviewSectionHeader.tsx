"use client";

export function ProviderOverviewSectionHeader({
  title,
  kicker,
  linkLabel,
  onLink,
}: {
  title: string;
  kicker?: string;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <div className="provider-ops-section-head">
      <div>
        <h2 className="provider-ops-block-title">{title}</h2>
        {kicker ? <p className="provider-ops-section-kicker">{kicker}</p> : null}
      </div>
      {linkLabel && onLink ? (
        <button type="button" className="provider-ops-section-link" onClick={onLink}>
          {linkLabel}
        </button>
      ) : null}
    </div>
  );
}
