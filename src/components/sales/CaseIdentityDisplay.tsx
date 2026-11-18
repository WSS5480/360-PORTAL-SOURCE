"use client";

import Link from "next/link";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import { activeCaseIdentitySignals } from "@/lib/surgical-sales/buildCaseIdentity";

export type CaseIdentityDisplayVariant = "board" | "compact" | "list" | "header" | "preview";

export function CaseIdentityDisplay({
  identity,
  variant = "board",
  facilityHref,
  providerHref,
  showTapHint = variant === "board",
  showOpenQuestions = true,
  showOptionalSignals = true,
  omitProvider = false,
  showSecondary = variant !== "compact",
  className,
}: {
  identity: CaseIdentity;
  variant?: CaseIdentityDisplayVariant;
  facilityHref?: string;
  providerHref?: string;
  showTapHint?: boolean;
  showOpenQuestions?: boolean;
  showOptionalSignals?: boolean;
  omitProvider?: boolean;
  showSecondary?: boolean;
  className?: string;
}) {
  const rootClass = ["case-identity", `case-identity--${variant}`, className].filter(Boolean).join(" ");
  const activeSignals = activeCaseIdentitySignals(identity);
  const dateLabel =
    variant === "header" && identity.dateLineWithTime ? identity.dateLineWithTime : identity.dateLine;

  const facilityNode = facilityHref ? (
    <Link href={facilityHref} className="case-identity-facility-link" data-surgical-press>
      {identity.facilityName}
    </Link>
  ) : (
    <span className="case-identity-facility">{identity.facilityName}</span>
  );

  const providerNode =
    !omitProvider && identity.providerName ? (
      providerHref ? (
        <Link href={providerHref} className="case-identity-provider-link" data-surgical-press>
          {identity.providerName}
        </Link>
      ) : (
        <span className="case-identity-provider">{identity.providerName}</span>
      )
    ) : null;

  return (
    <div className={rootClass}>
      <div className="case-identity-primary">
        <span className="case-identity-type">{identity.caseTypeLabel}</span>
        {providerNode}
        {identity.specialty ? <span className="case-identity-specialty">{identity.specialty}</span> : null}
        <div className="case-identity-location">
          {facilityNode}
          <span className="case-identity-date">{dateLabel}</span>
        </div>
      </div>

      {showSecondary ? (
        <div className="case-identity-secondary">
          <div className="case-identity-secondary-row">
            <span className="case-identity-label">Status:</span>
            <span className="case-identity-value">{identity.statusLabel}</span>
          </div>
          {showOpenQuestions && identity.openQuestionsCount != null && identity.openQuestionsCount > 0 ? (
            <div className="case-identity-secondary-row">
              <span className="case-identity-label">To Learn:</span>
              <span className="case-identity-value">{identity.openQuestionsCount}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {showOptionalSignals && activeSignals.length > 0 ? (
        <ul className="case-identity-signals" aria-label="Case readiness signals">
          {activeSignals.map((signal) => (
            <li key={signal.id} className="case-identity-signal">
              {signal.label}
            </li>
          ))}
        </ul>
      ) : null}

      {showTapHint ? <span className="case-identity-tap">Tap to open</span> : null}
    </div>
  );
}
