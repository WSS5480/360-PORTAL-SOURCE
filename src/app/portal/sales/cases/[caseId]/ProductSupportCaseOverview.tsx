"use client";

import React from "react";
import {
  ProductSupportCaseCaptureObservation,
  type ProductSupportCaseCaptureObservationHandle,
} from "./ProductSupportCaseCaptureObservation";
import { ProductSupportCaseOutcome } from "./ProductSupportCaseOutcome";
import { ProductSupportCaseRelatedProductFits } from "./ProductSupportCaseRelatedProductFits";
import { ProductSupportCaseTimeline } from "./ProductSupportCaseTimeline";
import { productSupportCaseOverviewCss } from "./productSupportCaseOverviewCss";

export type ProductSupportSaveNoteInput = {
  body: string;
  captureMode?: "voice" | "quick";
};

export function ProductSupportCaseOverview({
  caseId: _caseId,
  caseRow,
  activities,
  defaultActor,
  providerContact,
  disabled,
  onSaveNote,
  onPatchCase,
  captureControllerRef,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  activities?: Array<{
    id: string;
    activity_type: string;
    body: string;
    metadata_json?: Record<string, unknown>;
    created_at: string;
    actor_display_name?: string;
  }>;
  defaultActor?: string;
  providerContact?: Record<string, unknown> | null;
  disabled?: boolean;
  onSaveNote?: (input: ProductSupportSaveNoteInput) => Promise<void>;
  onPatchCase?: (body: Record<string, unknown>) => Promise<boolean>;
  captureControllerRef?: React.RefObject<ProductSupportCaseCaptureObservationHandle | null>;
}) {
  const captureRef = React.useRef<HTMLElement>(null);

  return (
    <div className="case-ps-detail-overview-stack">
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseOverviewCss }} />

      {onSaveNote ? (
        <ProductSupportCaseCaptureObservation
          ref={captureControllerRef}
          disabled={disabled}
          onSaveNote={(body, captureMode) => onSaveNote({ body, captureMode })}
          captureRef={captureRef}
        />
      ) : null}

      <ProductSupportCaseTimeline activities={activities} defaultActor={defaultActor} />

      <ProductSupportCaseOutcome caseRow={caseRow} disabled={disabled} onPatchCase={onPatchCase} />

      <ProductSupportCaseRelatedProductFits providerContact={providerContact} />
    </div>
  );
}

/** @deprecated Use ProductSupportCaseOverview */
export const CaseProductSupportOverview = ProductSupportCaseOverview;
