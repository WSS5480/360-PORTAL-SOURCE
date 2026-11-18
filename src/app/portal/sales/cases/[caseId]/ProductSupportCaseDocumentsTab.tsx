"use client";

import React from "react";
import { formatSurgicalCaseDocumentType } from "@/lib/surgical-sales/labels";
import { PRODUCT_SUPPORT_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import { productSupportCaseBriefingCss } from "./productSupportCaseBriefingCss";

type DocumentRow = {
  id: string;
  document_type: string;
  file_name: string;
  created_at?: string;
};

export function ProductSupportCaseDocumentsTab({
  documents,
  phiReminder,
  disabled,
  onUpload,
  onDownloadDoc,
}: {
  documents: DocumentRow[];
  phiReminder?: string;
  disabled?: boolean;
  onUpload: () => void;
  onDownloadDoc: (docId: string) => void;
}) {
  return (
    <div className="case-ps-products-stack">
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseBriefingCss }} />

      <section className="case-ps-briefing-card" aria-labelledby="case-ps-documents-title">
        <div className="case-ps-briefing-card-head">
          <div>
            <h2 id="case-ps-documents-title" className="case-ps-briefing-card-title">
              {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.caseDocuments}
            </h2>
            <p className="case-ps-briefing-card-lead">PO, inventory requests, preference cards, and other case files.</p>
          </div>
          <button type="button" className="case-ps-briefing-dictate-btn" style={{ minHeight: 40, width: "auto", paddingInline: 16 }} disabled={disabled} onClick={onUpload}>
            Upload document
          </button>
        </div>

        {phiReminder ? <p className="case-ps-field-notes-meta">{phiReminder}</p> : null}

        {documents.length > 0 ? (
          <div className="case-ps-doc-grid">
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className="case-ps-doc-card"
                onClick={() => onDownloadDoc(doc.id)}
              >
                <p className="case-ps-doc-type">{formatSurgicalCaseDocumentType(doc.document_type)}</p>
                <p className="case-ps-doc-name">{doc.file_name}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="case-ps-briefing-card-lead">No documents attached yet.</p>
        )}
      </section>
    </div>
  );
}
