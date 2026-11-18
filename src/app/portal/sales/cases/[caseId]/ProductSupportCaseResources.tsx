"use client";

import React from "react";
import { formatSurgicalCaseDocumentType } from "@/lib/surgical-sales/labels";

type ProductLine = {
  id: string;
  name: string;
  skuCode?: string | null;
};

type DocumentRow = {
  id: string;
  document_type: string;
  file_name: string;
};

const MATERIAL_DOC_TYPES = new Set([
  "packing_slip",
  "consignment_form",
  "implant_log",
  "other",
  "product_photo",
  "tray_photo",
]);

export function ProductSupportCaseResources({
  lines,
  documents,
  phiWarning,
  disabled,
  onUploadMaterial,
  onDownloadDoc,
}: {
  lines: ProductLine[];
  documents: DocumentRow[];
  phiWarning?: string;
  disabled?: boolean;
  onUploadMaterial: () => void;
  onDownloadDoc: (docId: string) => void;
}) {
  const materialDocs = documents.filter((doc) =>
    MATERIAL_DOC_TYPES.has(String(doc.document_type).toLowerCase()),
  );

  return (
    <div className="case-ps-resources">
      <section className="case-ps-detail-card" aria-labelledby="case-ps-materials-products-title">
        <h2 id="case-ps-materials-products-title" className="case-ps-detail-card-title">
          Product materials
        </h2>
        {lines.length > 0 ? (
          <ul className="case-ps-resources-product-list">
            {lines.map((line) => (
              <li key={line.id} className="case-ps-resources-product-item">
                <span className="case-ps-resources-product-name">{line.name}</span>
                {line.skuCode ? (
                  <span className="case-ps-resources-product-sku">SKU {line.skuCode}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="case-ps-detail-card-empty">Attach products on Overview or Execute to track materials.</p>
        )}
        <button
          type="button"
          className="case-ps-detail-link-btn"
          disabled={disabled}
          onClick={onUploadMaterial}
        >
          Upload product material
        </button>
      </section>

      <section className="case-ps-detail-card" aria-labelledby="case-ps-materials-files-title">
        <h2 id="case-ps-materials-files-title" className="case-ps-detail-card-title">
          Material files
        </h2>
        {materialDocs.length > 0 ? (
          <ul className="case-ps-resources-doc-list">
            {materialDocs.map((doc) => (
              <li key={doc.id} className="case-ps-resources-doc-item">
                <button
                  type="button"
                  className="case-ps-resources-doc-btn"
                  disabled={disabled}
                  onClick={() => onDownloadDoc(doc.id)}
                >
                  <span className="case-ps-resources-doc-type">
                    {formatSurgicalCaseDocumentType(doc.document_type)}
                  </span>
                  <span className="case-ps-resources-doc-name">{doc.file_name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="case-ps-detail-card-empty">No product materials uploaded yet.</p>
        )}
        {phiWarning ? <p className="case-ps-resources-phi">{phiWarning}</p> : null}
      </section>
    </div>
  );
}
