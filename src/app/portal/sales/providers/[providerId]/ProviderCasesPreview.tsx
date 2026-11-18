"use client";

import Link from "next/link";
import { ProviderCasesTabPreview } from "./ProviderCasesTab";
import type { ProviderProfilePayload } from "./providerProfileTypes";

const PREVIEW_LIMIT = 4;

export function ProviderCasesPreview({
  data,
  providerId,
  newCaseHref,
  variant = "default",
}: {
  data: ProviderProfilePayload;
  providerId: string;
  newCaseHref: string;
  variant?: "default" | "record";
  providerName?: string | null;
}) {
  const allCases = data.cases || [];
  if (variant === "record" && allCases.length === 0) {
    return null;
  }
  const preview = allCases.slice(0, PREVIEW_LIMIT);
  const viewAllHref = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=cases`;

  return (
    <div className="provider-pipe-col">
      <div className="provider-cc-section-head">
        <h3 className="provider-pipe-col-title">Recent case learning</h3>
        {allCases.length > 0 ? (
          <Link href={viewAllHref} className="provider-cc-section-link">
            View all
          </Link>
        ) : null}
      </div>

      {allCases.length === 0 && variant !== "record" ? (
        <div className="provider-pipe-empty">
          <p className="provider-pipe-empty-text">
            No cases yet. Observation and coverage outcomes will build a learning timeline here.
          </p>
          <Link href={newCaseHref} className="provider-pipe-empty-cta provider-pipe-empty-cta--secondary">
            Add case
          </Link>
        </div>
      ) : (
        <>
          <p className="provider-cc-section-meta">{allCases.length} linked</p>
          <ProviderCasesTabPreview cases={preview} limit={PREVIEW_LIMIT} />
          {allCases.length > PREVIEW_LIMIT ? (
            <Link href={viewAllHref} className="provider-pipe-more">
              View all {allCases.length} cases →
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}
