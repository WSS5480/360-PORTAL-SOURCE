"use client";

import React from "react";
import { buildProductSupportFollowUpRecommendations } from "@/lib/surgical-sales/buildProductSupportFollowUpRecommendations";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import type { ProductSupportOverviewProductLine } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import { PRODUCT_SUPPORT_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import { ProductSupportCaseOutcome } from "./ProductSupportCaseOutcome";
import { ProductSupportCaseRevenue } from "./ProductSupportCaseRevenue";
import { productSupportCaseBriefingCss } from "./productSupportCaseBriefingCss";

export function ProductSupportCaseFollowUpTab({
  caseRow,
  procedureType,
  supportType,
  products,
  operationalContext,
  linkedOpportunityHref,
  status,
  requiresBillingDocuments,
  bill,
  disabled,
  onPatchCase,
}: {
  caseRow: Record<string, unknown>;
  procedureType?: string | null;
  supportType: string;
  products: ProductSupportOverviewProductLine[];
  operationalContext?: CaseOperationalContextView | null;
  linkedOpportunityHref?: string | null;
  status?: string | null;
  requiresBillingDocuments?: boolean;
  disabled?: boolean;
  onPatchCase?: (body: Record<string, unknown>) => Promise<boolean>;
  bill?: {
    po_uploaded: boolean;
    invoice_uploaded: boolean;
    quantities_confirmed: boolean;
  } | null;
}) {
  const recommendations = React.useMemo(
    () =>
      buildProductSupportFollowUpRecommendations({
        caseRow,
        procedureType,
        supportType,
        products,
        operationalContext,
        linkedOpportunityHref,
        status,
        requiresBillingDocuments,
        bill,
      }),
    [bill, caseRow, linkedOpportunityHref, operationalContext, procedureType, products, requiresBillingDocuments, status, supportType],
  );

  return (
    <div className="case-ps-products-stack">
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseBriefingCss }} />

      <ProductSupportCaseRevenue caseRow={caseRow} disabled={disabled} onPatchCase={onPatchCase} />

      <ProductSupportCaseOutcome caseRow={caseRow} disabled={disabled} onPatchCase={onPatchCase} />

      <section className="case-ps-briefing-card" aria-labelledby="case-ps-follow-up-title">
        <h2 id="case-ps-follow-up-title" className="case-ps-briefing-card-title">
          {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.followUp}
        </h2>
        <p className="case-ps-briefing-card-lead">Recommended next steps based on case evidence.</p>

        {recommendations.length > 0 ? (
          <ul className="case-ps-follow-list">
            {recommendations.map((item) => (
              <li key={item.id}>
                {item.text}
                <span className="case-ps-follow-source">{item.source}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="case-ps-briefing-card-lead">No follow-up recommendations yet.</p>
        )}
      </section>
    </div>
  );
}
