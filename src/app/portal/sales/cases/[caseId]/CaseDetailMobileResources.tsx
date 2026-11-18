"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { userFacingError } from "@/lib/errors/userFacingError";
import { formatSurgicalCaseDocumentType } from "@/lib/surgical-sales/labels";
import { billingReadinessLabel, type BillingReadinessLevel } from "@/lib/surgical-sales/billingReadiness";
import { caseResourcesMobileCss } from "./caseResourcesMobileCss";

export type MobileDocRow = {
  id: string;
  document_type: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  uploader_display_name?: string;
  file_size_bytes?: number | null;
};

export type MobileLineRow = {
  id: string;
  product_name?: string | null;
  sku_code?: string | null;
  sku_description?: string | null;
  expected_quantity?: number | null;
  actual_quantity?: number | null;
};

type MobileBilling = {
  po_uploaded: boolean;
  invoice_uploaded: boolean;
  quantities_confirmed: boolean;
  readiness: BillingReadinessLevel;
  score: number;
  billing_reviewed_at: string | null;
  billing_admin_notes: string | null;
};

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function documentTypeGlyph(documentType: string): string {
  const s = documentType.toLowerCase();
  if (s === "purchase_order") return "PO";
  if (s === "invoice") return "INV";
  if (s === "packing_slip") return "PS";
  if (s === "consignment_form") return "CF";
  if (s === "implant_log") return "IL";
  return "DOC";
}

function documentIconColor(documentType: string): { bg: string; fg: string } {
  const s = documentType.toLowerCase();
  if (s === "purchase_order") return { bg: "color-mix(in srgb, #2563eb 14%, #fff)", fg: "#1d4ed8" };
  if (s === "invoice") return { bg: "color-mix(in srgb, #0d9488 14%, #fff)", fg: "#0f766e" };
  if (s === "packing_slip") return { bg: "color-mix(in srgb, var(--foreground) 8%, #fff)", fg: "var(--muted)" };
  return { bg: "color-mix(in srgb, var(--brand-600) 10%, #fff)", fg: "var(--brand-700)" };
}

function DocumentOverflowMenu({
  disabled,
  deleting,
  onOpen,
  onRemove,
}: {
  disabled?: boolean;
  deleting?: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="case-res-doc-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="case-res-doc-menu-btn"
        aria-label="File actions"
        aria-expanded={open}
        disabled={disabled || deleting}
        onClick={() => setOpen((value) => !value)}
      >
        ⋯
      </button>
      {open ? (
        <div className="case-res-doc-menu-panel" role="menu">
          <button
            type="button"
            className="case-res-doc-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpen();
            }}
          >
            Open
          </button>
          <button
            type="button"
            className="case-res-doc-menu-item case-res-doc-menu-item--danger"
            role="menuitem"
            disabled={deleting}
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MobileProductLineRow({
  line,
  caseId,
  disabled,
  onSaved,
  onError,
}: {
  line: MobileLineRow;
  caseId: string;
  disabled?: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [actual, setActual] = useState(line.actual_quantity != null ? String(line.actual_quantity) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActual(line.actual_quantity != null ? String(line.actual_quantity) : "");
  }, [line.id, line.actual_quantity]);

  const save = async () => {
    const n = actual.trim() === "" ? null : Number(actual);
    if (actual.trim() !== "" && (!Number.isFinite(n) || (n as number) < 0)) {
      onError("Actual quantity must be empty or a non-negative number.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/products/${encodeURIComponent(line.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actual_quantity: n }),
        }
      );
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Update failed");
      onSaved();
    } catch (e: unknown) {
      onError(userFacingError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="case-res-product-row">
      <div className="case-res-product-title">{line.product_name || "Product line"}</div>
      <div className="case-res-product-sku">
        {line.sku_code || "—"}
        {line.sku_description ? ` · ${line.sku_description}` : ""}
      </div>
      <div className="case-res-product-qty">
        <span>
          Expected <strong>{line.expected_quantity != null ? String(line.expected_quantity) : "—"}</strong>
        </span>
        <label>
          Actual
          <input
            value={actual}
            onChange={(event) => setActual(event.target.value)}
            inputMode="decimal"
            disabled={disabled || saving}
          />
        </label>
        <button type="button" className="case-res-product-save" disabled={disabled || saving} onClick={() => void save()}>
          {saving ? "…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function ResourcesSection({
  title,
  badge,
  badgeTitle,
  actionLabel,
  onAction,
  actionDisabled,
  children,
}: {
  title: string;
  badge: string;
  badgeTitle: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="case-resources-section">
      <div
        className={`case-resources-section-head${actionLabel && onAction ? "" : " case-resources-section-head--no-action"}`}
      >
        <span className="case-resources-section-title">{title}</span>
        <span className="case-resources-section-badge" title={badgeTitle}>
          {badge}
        </span>
        {actionLabel && onAction ? (
          <button type="button" className="case-resources-section-action" disabled={actionDisabled} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="case-resources-section-body">{children}</div>
    </section>
  );
}

export function CaseDetailMobileResources({
  caseId,
  phiWarning,
  documents,
  lines,
  requiresBillingDocuments,
  billingExemptMessage,
  bill,
  expectedRevenue,
  actualRevenue,
  varianceLabel,
  linkedOpportunityHref,
  busy,
  deletingDocId,
  onUpload,
  onUploadPo,
  onUploadInvoice,
  onDownloadDoc,
  onDeleteDoc,
  onAddProductLine,
  onOpenOpportunity,
  onRefresh,
  onError,
}: {
  caseId: string;
  phiWarning: string;
  documents: MobileDocRow[];
  lines: MobileLineRow[];
  requiresBillingDocuments: boolean;
  billingExemptMessage: string;
  bill: MobileBilling;
  expectedRevenue: string;
  actualRevenue: string;
  varianceLabel: string;
  linkedOpportunityHref: string | null;
  busy?: boolean;
  deletingDocId: string | null;
  onUpload: () => void;
  onUploadPo: () => void;
  onUploadInvoice: () => void;
  onDownloadDoc: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onAddProductLine: () => void;
  onOpenOpportunity?: () => void;
  onRefresh: () => void;
  onError: (message: string) => void;
}) {
  return (
    <section className="case-mobile-only case-resources-mobile">
      <style dangerouslySetInnerHTML={{ __html: caseResourcesMobileCss }} />
      <header className="case-resources-mobile-head">
        <span className="case-resources-mobile-kicker">Resources</span>
        <button type="button" className="case-resources-mobile-upload" disabled={busy} onClick={onUpload}>
          Upload
        </button>
      </header>
      <p className="case-resources-mobile-phi" role="note">
        {phiWarning}
      </p>
      <div className="case-resources-mobile-body">
        <ResourcesSection
          title="Documents"
          badge={String(documents.length)}
          badgeTitle={documents.length === 1 ? "1 file" : `${documents.length} files`}
          actionLabel="Upload"
          onAction={onUpload}
          actionDisabled={busy}
        >
          {documents.length === 0 ? (
            <p className="case-resources-empty">No files uploaded yet</p>
          ) : (
            <ul className="case-res-doc-list">
              {documents.map((doc) => {
                const ic = documentIconColor(doc.document_type);
                return (
                  <li key={doc.id} className="case-res-doc-row">
                    <div className="case-res-doc-icon" style={{ background: ic.bg, color: ic.fg }}>
                      {documentTypeGlyph(doc.document_type)}
                    </div>
                    <div className="case-res-doc-main">
                      <div className="case-res-doc-name">{doc.file_name}</div>
                      <div className="case-res-doc-type">{formatSurgicalCaseDocumentType(doc.document_type)}</div>
                      <div className="case-res-doc-meta">
                        <span>{doc.uploader_display_name ?? doc.uploaded_by}</span>
                        <span>{formatDocTimestamp(doc.created_at)}</span>
                        <span>{formatFileSize(doc.file_size_bytes)}</span>
                      </div>
                    </div>
                    <DocumentOverflowMenu
                      disabled={busy}
                      deleting={deletingDocId === doc.id}
                      onOpen={() => onDownloadDoc(doc.id)}
                      onRemove={() => onDeleteDoc(doc.id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </ResourcesSection>

        <ResourcesSection
          title="Product Attachments"
          badge={String(lines.length)}
          badgeTitle={lines.length === 1 ? "1 line" : `${lines.length} lines`}
          actionLabel="Add"
          onAction={onAddProductLine}
          actionDisabled={busy}
        >
          {lines.length === 0 ? (
            <p className="case-resources-empty">No product attachments yet</p>
          ) : (
            lines.map((line) => (
              <MobileProductLineRow
                key={line.id}
                line={line}
                caseId={caseId}
                disabled={busy}
                onSaved={onRefresh}
                onError={onError}
              />
            ))
          )}
        </ResourcesSection>

        <ResourcesSection
          title="Billing & Logistics"
          badge={requiresBillingDocuments ? String(bill.score) : "—"}
          badgeTitle={requiresBillingDocuments ? `${bill.score} of 3 essentials` : "Not required"}
          actionLabel={
            requiresBillingDocuments && !bill.po_uploaded
              ? "PO"
              : requiresBillingDocuments && !bill.invoice_uploaded
                ? "Invoice"
                : undefined
          }
          onAction={
            requiresBillingDocuments && !bill.po_uploaded
              ? onUploadPo
              : requiresBillingDocuments && !bill.invoice_uploaded
                ? onUploadInvoice
                : undefined
          }
          actionDisabled={busy}
        >
          {!requiresBillingDocuments ? (
            <p className="case-resources-info-banner">{billingExemptMessage}</p>
          ) : (
            <>
              <div className="case-res-billing-status">
                {billingReadinessLabel(bill.readiness)} · {bill.score} of 3
              </div>
              <div className="case-res-billing-check">
                <div className="case-res-billing-check-row">
                  <span>Purchase order</span>
                  <span aria-hidden>{bill.po_uploaded ? "✔" : "—"}</span>
                </div>
                <div className="case-res-billing-check-row">
                  <span>Invoice</span>
                  <span aria-hidden>{bill.invoice_uploaded ? "✔" : "—"}</span>
                </div>
                <div className="case-res-billing-check-row">
                  <span>Quantities confirmed</span>
                  <span aria-hidden>{bill.quantities_confirmed ? "✔" : "—"}</span>
                </div>
              </div>
              {(!bill.po_uploaded || !bill.invoice_uploaded) && (
                <div className="case-res-billing-actions">
                  {!bill.po_uploaded ? (
                    <button type="button" className="case-res-billing-actions-primary" disabled={busy} onClick={onUploadPo}>
                      Upload PO
                    </button>
                  ) : null}
                  {!bill.invoice_uploaded ? (
                    <button type="button" disabled={busy} onClick={onUploadInvoice}>
                      Upload invoice
                    </button>
                  ) : null}
                </div>
              )}
            </>
          )}
          {bill.billing_reviewed_at ? (
            <p className="case-resources-info-banner" style={{ marginTop: requiresBillingDocuments ? 0 : undefined }}>
              Billing reviewed · {formatDocTimestamp(bill.billing_reviewed_at)}
            </p>
          ) : null}
          {bill.billing_admin_notes ? (
            <p className="case-resources-empty" style={{ paddingTop: 0 }}>
              {bill.billing_admin_notes}
            </p>
          ) : null}
          <div className="case-res-revenue-rows">
            <div className="case-res-revenue-row">
              <span>Expected</span>
              <span>{expectedRevenue}</span>
            </div>
            <div className="case-res-revenue-row">
              <span>Actual</span>
              <span>{actualRevenue}</span>
            </div>
            <div className="case-res-revenue-row">
              <span>Variance</span>
              <span>{varianceLabel}</span>
            </div>
          </div>
        </ResourcesSection>

        <ResourcesSection
          title="Related Opportunity Files"
          badge={linkedOpportunityHref ? "1" : "0"}
          badgeTitle={linkedOpportunityHref ? "Linked" : "Not linked"}
          actionLabel={linkedOpportunityHref ? "Open" : undefined}
          onAction={linkedOpportunityHref && onOpenOpportunity ? onOpenOpportunity : undefined}
        >
          {linkedOpportunityHref ? (
            <>
              <p className="case-res-linked-copy">Files attached to the related opportunity live on the evaluation record.</p>
              <div className="case-res-linked-actions">
                <Link href={linkedOpportunityHref}>Open opportunity</Link>
              </div>
            </>
          ) : (
            <p className="case-resources-empty">No related opportunity yet</p>
          )}
        </ResourcesSection>
      </div>
    </section>
  );
}
