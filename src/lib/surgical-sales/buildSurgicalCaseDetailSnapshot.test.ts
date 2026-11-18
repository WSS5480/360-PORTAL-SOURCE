import { describe, expect, it } from "vitest";
import {
  buildSurgicalCaseDetailSnapshotRows,
  formatCaseSnapshotPoInvoiceStatus,
  formatCaseSnapshotProductsLabel,
} from "./buildSurgicalCaseDetailSnapshot";

const baseInput = {
  providerName: "Jane Smith",
  facilityName: "Metro General",
  procedureType: "TKA",
  caseTypeLabel: "Coverage Case",
  statusLabel: "Scheduled",
  dateTimeLabel: "June 2 · 7:30 AM",
  ownerName: "Alex Rep",
  productsLabel: "Acme Implant System",
};

describe("buildSurgicalCaseDetailSnapshotRows", () => {
  it("builds observation snapshot rows without products or billing", () => {
    const rows = buildSurgicalCaseDetailSnapshotRows({
      ...baseInput,
      variant: "observation",
      caseTypeLabel: "Observation Case",
    });

    expect(rows.map((row) => row.label)).toEqual([
      "Provider",
      "Facility",
      "Procedure",
      "Case type",
      "Status",
      "Date/time",
      "Owner",
    ]);
    expect(rows.some((row) => row.label === "Products")).toBe(false);
    expect(rows.some((row) => row.label === "PO / invoice")).toBe(false);
    expect(rows.some((row) => row.label === "Support")).toBe(false);
  });

  it("builds product support snapshot rows with products and billing status", () => {
    const rows = buildSurgicalCaseDetailSnapshotRows({
      ...baseInput,
      variant: "product_support",
      requiresBillingDocuments: true,
      bill: { po_uploaded: true, invoice_uploaded: false },
    });

    expect(rows.map((row) => row.label)).toEqual([
      "Provider",
      "Facility",
      "Procedure",
      "Case type",
      "Status",
      "Date/time",
      "Products",
      "Owner",
      "PO / invoice",
    ]);
    expect(rows.find((row) => row.id === "po-invoice")?.value).toBe("PO on file · Invoice outstanding");
  });

  it("omits PO / invoice row when billing documents are not required", () => {
    const rows = buildSurgicalCaseDetailSnapshotRows({
      ...baseInput,
      variant: "product_support",
      requiresBillingDocuments: false,
      bill: { po_uploaded: false, invoice_uploaded: false },
    });

    expect(rows.some((row) => row.label === "PO / invoice")).toBe(false);
  });

  it("does not duplicate support type as a separate row", () => {
    const rows = buildSurgicalCaseDetailSnapshotRows({
      ...baseInput,
      variant: "product_support",
    });

    expect(rows.filter((row) => row.label === "Case type")).toHaveLength(1);
    expect(rows.some((row) => row.label === "Support")).toBe(false);
  });
});

describe("formatCaseSnapshotProductsLabel", () => {
  it("normalizes empty product labels to dash", () => {
    expect(formatCaseSnapshotProductsLabel("None attached")).toBe("—");
    expect(formatCaseSnapshotProductsLabel("  ")).toBe("—");
  });
});

describe("formatCaseSnapshotPoInvoiceStatus", () => {
  it("returns null when billing is not applicable", () => {
    expect(formatCaseSnapshotPoInvoiceStatus(false, { po_uploaded: true, invoice_uploaded: true })).toBeNull();
  });

  it("formats compact PO and invoice status", () => {
    expect(formatCaseSnapshotPoInvoiceStatus(true, { po_uploaded: true, invoice_uploaded: true })).toBe(
      "PO on file · Invoice on file",
    );
  });
});
