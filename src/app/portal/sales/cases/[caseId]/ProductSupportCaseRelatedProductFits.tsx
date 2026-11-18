"use client";

import React from "react";
import { buildProductSupportRelatedProductFits } from "@/lib/surgical-sales/buildProductSupportRelatedProductFits";
import type { ProductFitEntry } from "@/lib/surgical-sales/opportunityPipelineView";
import { PRODUCT_SUPPORT_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";

function fitTone(status: ProductFitEntry["status"]): string {
  if (status === "validated") return "validated";
  return "emerging";
}

export function ProductSupportCaseRelatedProductFits({
  providerContact,
}: {
  providerContact?: Record<string, unknown> | null;
}) {
  const fits = React.useMemo(
    () => buildProductSupportRelatedProductFits({ providerContact, hasObservationEvidence: true }),
    [providerContact],
  );

  return (
    <section className="case-ps-detail-card" aria-labelledby="case-ps-product-fits-title">
      <h2 id="case-ps-product-fits-title" className="case-ps-detail-card-title">
        {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.relatedProductFits}
      </h2>
      {fits.length > 0 ? (
        <ul className="case-ps-product-fit-list">
          {fits.map((fit) => (
            <li key={`${fit.product}-${fit.status}`} className="case-ps-product-fit-row" data-tone={fitTone(fit.status)}>
              <span className="case-ps-product-fit-name">{fit.product}</span>
              <span className="case-ps-product-fit-status">{fit.statusLabel}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="case-ps-detail-card-empty">Validated or emerging product fits will appear here as evidence builds.</p>
      )}
    </section>
  );
}
