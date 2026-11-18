import type { SurgicalCaseDetailVariant } from "@/lib/surgical-sales/surgicalCaseDetailRouting";
import { surgicalCaseDetailVariantIsObservation } from "@/lib/surgical-sales/surgicalCaseDetailRouting";

export type CaseSnapshotRow = {
  id: string;
  label: string;
  value: string;
};

export type CaseSnapshotBilling = {
  po_uploaded: boolean;
  invoice_uploaded: boolean;
};

function displayOrDash(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || "—";
}

export function formatCaseSnapshotProductsLabel(productsLabel: string | null | undefined): string {
  const trimmed = String(productsLabel ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "none attached") return "—";
  return trimmed;
}

export function formatCaseSnapshotPoInvoiceStatus(
  requiresBillingDocuments: boolean,
  bill: CaseSnapshotBilling | null | undefined,
): string | null {
  if (!requiresBillingDocuments || !bill) return null;
  const po = bill.po_uploaded ? "PO on file" : "PO outstanding";
  const invoice = bill.invoice_uploaded ? "Invoice on file" : "Invoice outstanding";
  return `${po} · ${invoice}`;
}

export function buildSurgicalCaseDetailSnapshotRows(input: {
  variant: SurgicalCaseDetailVariant;
  providerName: string;
  facilityName: string;
  procedureType?: string | null;
  caseTypeLabel: string;
  statusLabel: string;
  dateTimeLabel: string;
  ownerName?: string | null;
  productsLabel?: string | null;
  requiresBillingDocuments?: boolean;
  bill?: CaseSnapshotBilling | null;
}): CaseSnapshotRow[] {
  const coreRows: CaseSnapshotRow[] = [
    { id: "provider", label: "Provider", value: displayOrDash(input.providerName) },
    { id: "facility", label: "Facility", value: displayOrDash(input.facilityName) },
    { id: "procedure", label: "Procedure", value: displayOrDash(input.procedureType) },
    { id: "case-type", label: "Case type", value: displayOrDash(input.caseTypeLabel) },
    { id: "status", label: "Status", value: displayOrDash(input.statusLabel) },
    { id: "date-time", label: "Date/time", value: displayOrDash(input.dateTimeLabel) },
  ];

  if (surgicalCaseDetailVariantIsObservation(input.variant)) {
    return [...coreRows, { id: "owner", label: "Owner", value: displayOrDash(input.ownerName) }];
  }

  const productSupportRows: CaseSnapshotRow[] = [
    ...coreRows,
    {
      id: "products",
      label: "Products",
      value: formatCaseSnapshotProductsLabel(input.productsLabel),
    },
    { id: "owner", label: "Owner", value: displayOrDash(input.ownerName) },
  ];

  const poInvoiceStatus = formatCaseSnapshotPoInvoiceStatus(
    Boolean(input.requiresBillingDocuments),
    input.bill,
  );
  if (poInvoiceStatus) {
    productSupportRows.push({ id: "po-invoice", label: "PO / invoice", value: poInvoiceStatus });
  }

  return productSupportRows;
}
