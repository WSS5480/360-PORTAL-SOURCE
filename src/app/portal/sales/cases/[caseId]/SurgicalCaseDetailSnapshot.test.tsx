import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import { SurgicalCaseDetailSnapshot } from "./SurgicalCaseDetailSnapshot";

const identity: CaseIdentity = {
  caseTypeLabel: "Observation Case",
  providerName: "Jane Smith",
  specialty: "Orthopedics",
  facilityName: "Metro General",
  dateLine: "June 2",
  dateLineWithTime: "June 2 · 7:30 AM",
  statusLabel: "Scheduled",
  openQuestionsCount: null,
  optionalSignals: [],
  internalCaseNumber: null,
};

afterEach(() => {
  cleanup();
});

describe("SurgicalCaseDetailSnapshot", () => {
  it("renders observation snapshot rows without products or billing", () => {
    render(
      <SurgicalCaseDetailSnapshot
        variant="observation"
        identity={identity}
        procedureType="TKA"
        ownerName="Alex Rep"
      />,
    );

    expect(screen.getByText("Provider")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Case type")).toBeInTheDocument();
    expect(screen.getByText("Observation Case")).toBeInTheDocument();
    expect(screen.queryByText("Products")).not.toBeInTheDocument();
    expect(screen.queryByText("PO / invoice")).not.toBeInTheDocument();
  });

  it("renders product support snapshot rows with products and billing", () => {
    render(
      <SurgicalCaseDetailSnapshot
        variant="product_support"
        identity={{ ...identity, caseTypeLabel: "Coverage Case" }}
        procedureType="TKA"
        productsLabel="Acme Implant System"
        ownerName="Alex Rep"
        requiresBillingDocuments
        bill={{ po_uploaded: true, invoice_uploaded: false }}
      />,
    );

    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Acme Implant System")).toBeInTheDocument();
    expect(screen.getByText("PO / invoice")).toBeInTheDocument();
    expect(screen.getByText("PO on file · Invoice outstanding")).toBeInTheDocument();
    expect(screen.queryByText("Support")).not.toBeInTheDocument();
  });
});
