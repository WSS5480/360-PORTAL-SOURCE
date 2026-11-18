"use client";

import React from "react";
import {
  buildIntelligenceSectionSignalDetails,
  type IntelligenceSectionSignalDetail,
} from "@/lib/surgical-sales/providerIntelligenceSectionDisclosure";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { ProviderIntelligenceFieldAttribution } from "./ProviderIntelligenceFieldAttribution";
import { ProviderIntelligenceFreshnessBadge } from "./ProviderIntelligenceFreshnessBadge";
import { ProviderIntelligenceTrustBadge } from "./ProviderIntelligenceTrustBadge";

function SignalDetailRow({
  detail,
  fieldMetadata,
  onEdit,
}: {
  detail: IntelligenceSectionSignalDetail;
  fieldMetadata: ProviderIntelligenceFieldMetadataMap;
  onEdit?: (dbKey: string) => void;
}) {
  const meta = fieldMetadata[detail.dbKey];
  const hasAttribution =
    detail.attribution.sourceLine ||
    detail.attribution.authorLine ||
    detail.attribution.validatedLine;

  return (
    <li
      className={`provider-intel-section-detail-row provider-intel-section-detail-row--${detail.operationalTrust.tier}`}
    >
      <div className="provider-intel-section-detail-head">
        <span className="provider-intel-section-detail-label">{detail.chipLabel}</span>
        <ProviderIntelligenceTrustBadge
          tier={detail.operationalTrust.tier}
          label={detail.operationalTrust.label}
          title={detail.operationalTrust.hint}
          compact
        />
        {detail.freshness?.needsReconfirmation ? (
          <ProviderIntelligenceFreshnessBadge
            tier={detail.freshness.freshnessTier}
            label={detail.freshness.freshnessBadge}
            title={detail.freshness.staleWarning ?? detail.freshness.lastValidatedLine ?? undefined}
            compact
          />
        ) : null}
        {onEdit ? (
          <button
            type="button"
            className="provider-intel-section-signal-edit"
            onClick={() => onEdit(detail.dbKey)}
          >
            Edit
          </button>
        ) : null}
      </div>
      <p className="provider-intel-section-detail-value">{detail.display}</p>
      {detail.notes ? (
        <p className="provider-intel-section-detail-notes">
          <span className="provider-intel-section-detail-meta-label">Notes</span>
          {detail.notes}
        </p>
      ) : null}
      {hasAttribution ? (
        <ProviderIntelligenceFieldAttribution meta={meta} variant="detail" />
      ) : null}
      <div className="provider-intel-section-detail-meta">
        {detail.historyLine ? (
          <span className="provider-intel-section-detail-meta-item">{detail.historyLine}</span>
        ) : null}
        {detail.validationLabel ? (
          <span
            className={`provider-intel-section-detail-validation provider-intel-section-detail-validation--${detail.operationalTrust.tier}`}
          >
            {detail.validationLabel}
          </span>
        ) : null}
        {detail.freshness?.lastValidatedLine ? (
          <span className="provider-intel-section-detail-validated-at">
            {detail.freshness.lastValidatedLine}
          </span>
        ) : null}
        {detail.freshness?.needsReconfirmation && detail.freshness.confidencePercent < 100 ? (
          <span className="provider-intel-section-detail-decay" title="Confidence after time decay">
            {detail.freshness.confidencePercent}% operational confidence
          </span>
        ) : null}
        {detail.freshness?.reconfirmationPrompt ? (
          <p className="provider-intel-section-detail-reconfirm">{detail.freshness.reconfirmationPrompt}</p>
        ) : null}
      </div>
    </li>
  );
}

export function ProviderIntelligenceSectionExpandedDetails({
  sectionId,
  contact,
  fieldMetadata,
  onEditField,
}: {
  sectionId: ProviderIntelligenceSectionId;
  contact: Record<string, unknown>;
  fieldMetadata: ProviderIntelligenceFieldMetadataMap;
  onEditField?: (dbKey: string) => void;
}) {
  const details = React.useMemo(
    () => buildIntelligenceSectionSignalDetails(sectionId, contact, fieldMetadata),
    [sectionId, contact, fieldMetadata],
  );

  if (details.length === 0) {
    return (
      <section
        className="provider-intel-section-details provider-intel-card-layer--detail"
        aria-label="Signal detail"
      >
        <h4 className="provider-intel-section-details-title">Signal detail</h4>
        <p className="provider-intel-section-empty">No captured signals to show yet — use guided capture above.</p>
      </section>
    );
  }

  return (
    <section
      className="provider-intel-section-details provider-intel-card-layer--detail"
      aria-label="Signal detail"
    >
      <h4 className="provider-intel-section-details-title">Signal detail</h4>
      <p className="provider-intel-section-details-lead">
        Notes, attribution, history, and validation for signals on file.
      </p>
      <ul className="provider-intel-section-detail-list">
        {details.map((detail) => (
          <SignalDetailRow
            key={detail.dbKey}
            detail={detail}
            fieldMetadata={fieldMetadata}
            onEdit={onEditField}
          />
        ))}
      </ul>
    </section>
  );
}
