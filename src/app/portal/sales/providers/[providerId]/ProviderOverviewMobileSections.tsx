"use client";

import Link from "next/link";

export function ProviderOverviewStickySummary({
  question,
  headline,
  support,
  tone,
}: {
  question: string;
  headline: string;
  support?: string | null;
  tone: "deploy" | "hold" | "caution";
}) {
  return (
    <div className="pov-sticky-summary" role="status" aria-live="polite">
      <p className="pov-sticky-kicker">{question}</p>
      <p className={`pov-sticky-verdict pov-sticky-verdict--${tone}`}>{headline}</p>
      {support ? <p className="pov-sticky-line">{support}</p> : null}
    </div>
  );
}

export function ProviderOverviewScanRow({
  label,
  text,
  href,
  linkLabel,
}: {
  label: string;
  text: string;
  href?: string;
  linkLabel?: string;
}) {
  const body = (
    <>
      <span className="pov-scan-label">{label}</span>
      <span className="pov-scan-text">{text}</span>
      {href && linkLabel ? <span className="pov-scan-chevron" aria-hidden>→</span> : null}
    </>
  );

  if (href && linkLabel) {
    return (
      <Link href={href} className="pov-scan-row pov-scan-row--link">
        {body}
      </Link>
    );
  }

  return <div className="pov-scan-row">{body}</div>;
}

export function ProviderOverviewDominantAction({
  ctaLabel,
  ctaHref,
  hint,
}: {
  ctaLabel: string;
  ctaHref: string;
  hint?: string | null;
}) {
  return (
    <div className="pov-dominant-action">
      <Link href={ctaHref} className="pov-dominant-cta">
        {ctaLabel}
      </Link>
      {hint ? <p className="pov-dominant-hint">{hint}</p> : null}
    </div>
  );
}

export function ProviderOverviewStickyActionBar({
  ctaLabel,
  ctaHref,
  nextBestMove,
  bestSource,
}: {
  ctaLabel: string;
  ctaHref: string;
  nextBestMove?: string | null;
  bestSource?: string | null;
}) {
  return (
    <div className="pov-sticky-action" aria-label="Primary action">
      <div className="pov-sticky-action-copy">
        {nextBestMove ? <p className="pov-sticky-action-move">{nextBestMove}</p> : null}
        {bestSource ? (
          <p className="pov-sticky-action-source">
            <span className="pov-sticky-action-source-label">Best source:</span> {bestSource}
          </p>
        ) : null}
      </div>
      <Link href={ctaHref} className="pov-sticky-action-btn">
        {ctaLabel}
      </Link>
    </div>
  );
}
