"use client";

import Link from "next/link";
import React from "react";

export type ObservationFormFileRow = {
  id: string;
  file_name: string;
  created_at: string;
};

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const css = `
.obs-form-card{display:grid;gap:10px;padding:16px;border-radius:16px;border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:#fff;min-width:0;box-shadow:0 1px 0 color-mix(in srgb,var(--foreground) 4%,transparent)}
.obs-form-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.obs-form-card-title{margin:0;font-size:15px;font-weight:800;line-height:1.25;color:var(--foreground)}
.obs-form-card-lead{margin:4px 0 0;font-size:13px;line-height:1.45;font-weight:550;color:color-mix(in srgb,var(--foreground) 58%,var(--muted))}
.obs-form-card-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.obs-form-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.obs-form-item{display:grid;gap:2px;width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:color-mix(in srgb,var(--surface-2) 35%,#fff);cursor:pointer;font-family:inherit}
.obs-form-item:disabled{opacity:.55;cursor:not-allowed}
.obs-form-item-name{font-size:13px;font-weight:800;color:var(--foreground);overflow-wrap:anywhere}
.obs-form-item-meta{font-size:11px;font-weight:650;color:var(--muted)}
.obs-form-empty{margin:0;font-size:13px;font-weight:650;color:var(--muted)}
.obs-form-library-link{font-size:12px;font-weight:800;color:var(--brand-700);text-decoration:none}
`;

export function ObservationFormPanel({
  forms,
  disabled,
  onUpload,
  onDownload,
}: {
  forms: ObservationFormFileRow[];
  disabled?: boolean;
  onUpload: () => void;
  onDownload: (docId: string) => void;
}) {
  return (
    <section className="obs-form-card" aria-labelledby="obs-form-card-title">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="obs-form-card-head">
        <div>
          <h2 id="obs-form-card-title" className="obs-form-card-title">
            Observation form
          </h2>
          <p className="obs-form-card-lead">
            Upload the completed case observation form (PDF or photo of the paper form). Do not include patient names, faces, DOBs, or MRNs.
          </p>
        </div>
        <div className="obs-form-card-actions">
          <button
            type="button"
            className="case-obs-detail-btn case-obs-detail-btn--primary"
            disabled={disabled}
            onClick={onUpload}
          >
            Upload form
          </button>
        </div>
      </div>
      {forms.length === 0 ? (
        <p className="obs-form-empty">No observation form uploaded for this case yet.</p>
      ) : (
        <ul className="obs-form-list">
          {forms.map((form) => (
            <li key={form.id}>
              <button
                type="button"
                className="obs-form-item"
                disabled={disabled}
                onClick={() => onDownload(form.id)}
              >
                <span className="obs-form-item-name">{form.file_name}</span>
                <span className="obs-form-item-meta">{formatStamp(form.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link href="/portal/sales/observation-forms" className="obs-form-library-link">
        View all observation forms
      </Link>
    </section>
  );
}
