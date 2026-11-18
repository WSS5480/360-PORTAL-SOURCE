"use client";

import { formatSurgicalCaseDocumentType } from "@/lib/surgical-sales/labels";
import {
  buildObservationResourcesView,
} from "@/lib/surgical-sales/observationCaseResources";
import type { MobileDocRow } from "./CaseDetailMobileResources";
import { caseObservationResourcesCss } from "./caseObservationResourcesCss";
import { ObservationFormPanel } from "./ObservationFormPanel";
import { OBSERVATION_FORM_DOCUMENT_TYPE } from "@/lib/surgical-sales/observationFormLibrary";

function formatDocTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const RESOURCE_PLACEHOLDERS = [
  "Documents",
  "Photos",
  "Case files",
  "Product resources",
];

export function CaseObservationResourcesTab({
  documents,
  phiWarning,
  disabled,
  onUpload,
  onDownloadDoc,
  onUploadObservationForm,
}: {
  documents: MobileDocRow[];
  phiWarning: string;
  disabled?: boolean;
  onUpload: () => void;
  onDownloadDoc: (docId: string) => void;
  onUploadObservationForm: () => void;
}) {
  const observationForms = documents.filter(
    (doc) => String(doc.document_type || "").toLowerCase() === OBSERVATION_FORM_DOCUMENT_TYPE,
  );
  const otherDocuments = documents.filter(
    (doc) => String(doc.document_type || "").toLowerCase() !== OBSERVATION_FORM_DOCUMENT_TYPE,
  );
  const view = buildObservationResourcesView(otherDocuments);

  return (
    <div className="case-obs-resources">
      <style dangerouslySetInnerHTML={{ __html: caseObservationResourcesCss }} />
      <ObservationFormPanel
        forms={observationForms}
        disabled={disabled}
        onUpload={onUploadObservationForm}
        onDownload={onDownloadDoc}
      />

      <div className="case-obs-detail-card case-obs-resources-panel">
        <div className="case-obs-resources-head">
          <h2 className="case-obs-detail-card-title">Resources</h2>
          <button
            type="button"
            className="case-obs-detail-btn case-obs-detail-btn--primary"
            disabled={disabled}
            onClick={onUpload}
          >
            Upload
          </button>
        </div>
        <p className="case-obs-resources-phi" role="note">
          {phiWarning}
        </p>

        {!view.hasContent ? (
          <div className="case-obs-resources-empty-wrap">
            <p className="case-obs-detail-card-empty">No files attached yet.</p>
            <ul className="case-obs-resources-placeholders">
              {RESOURCE_PLACEHOLDERS.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="case-obs-resources-categories">
            {view.categories.map((category) => (
              <section
                key={category.id}
                className="case-obs-resources-category"
                aria-label={category.title}
              >
                <h3 className="case-obs-resources-category-title">{category.title}</h3>
                <ul className="case-obs-resources-list">
                  {category.documents.map((doc) => {
                    const sizeLabel = formatFileSize(doc.file_size_bytes);
                    const metaParts = [
                      formatSurgicalCaseDocumentType(doc.document_type),
                      formatDocTimestamp(doc.created_at),
                      sizeLabel,
                    ].filter(Boolean);

                    return (
                      <li key={doc.id} className="case-obs-resources-item">
                        <button
                          type="button"
                          className="case-obs-resources-item-btn"
                          disabled={disabled}
                          onClick={() => onDownloadDoc(doc.id)}
                        >
                          <span className="case-obs-resources-item-name">{doc.file_name}</span>
                          <span className="case-obs-resources-item-meta">{metaParts.join(" · ")}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
