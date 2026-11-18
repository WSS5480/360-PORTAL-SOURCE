"use client";

import type React from "react";
import type { SurgicalCaseDetailVariant } from "@/lib/surgical-sales/surgicalCaseDetailRouting";
import { surgicalCaseDetailVariantIsObservation } from "@/lib/surgical-sales/surgicalCaseDetailRouting";

type CaseTypeBodyProps = {
  variant: SurgicalCaseDetailVariant;
  observation: React.ReactNode;
  productSupport: React.ReactNode;
};

function selectCaseTypeBody({ variant, observation, productSupport }: CaseTypeBodyProps): React.ReactNode {
  return surgicalCaseDetailVariantIsObservation(variant) ? observation : productSupport;
}

/** Overview tab body — observation vs product support only. */
export function SurgicalCaseDetailOverviewByCaseType(props: CaseTypeBodyProps) {
  return (
    <div data-surgical-case-detail-panel="overview" data-surgical-case-type={props.variant}>
      {selectCaseTypeBody(props)}
    </div>
  );
}

/** Execute tab body — observation vs product support only. */
export function SurgicalCaseDetailExecuteByCaseType(props: CaseTypeBodyProps) {
  return (
    <div data-surgical-case-detail-panel="execute" data-surgical-case-type={props.variant}>
      {selectCaseTypeBody(props)}
    </div>
  );
}

/** Activity and Resources tabs are shared shell slots; content may still vary by case type. */
export function SurgicalCaseDetailSharedTabByCaseType({
  variant,
  tab,
  observation,
  productSupport,
}: CaseTypeBodyProps & { tab: "activity" | "resources" }) {
  return (
    <div data-surgical-case-detail-panel={tab} data-surgical-case-type={variant}>
      {selectCaseTypeBody({ variant, observation, productSupport })}
    </div>
  );
}
