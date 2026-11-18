import { describe, expect, it } from "vitest";
import { orderStatusFromPrimaryInvoice } from "./orderStatusFromInvoice";

describe("orderStatusFromPrimaryInvoice", () => {
  it("needs invoice when none exists", () => {
    expect(orderStatusFromPrimaryInvoice(null)).toBe("NEEDS_INVOICE");
  });

  it("needs invoice for draft or voided", () => {
    expect(orderStatusFromPrimaryInvoice({ status: "DRAFT" })).toBe("NEEDS_INVOICE");
    expect(orderStatusFromPrimaryInvoice({ status: "ISSUED", voided_at: "2026-08-18T00:00:00Z" })).toBe(
      "NEEDS_INVOICE"
    );
  });

  it("uses Invoiced for issued unpaid invoices instead of Completed", () => {
    expect(
      orderStatusFromPrimaryInvoice({ status: "ISSUED", amount_paid: 0, total: 89.28 })
    ).toBe("INVOICED");
  });

  it("uses Paid only when the invoice is paid", () => {
    expect(
      orderStatusFromPrimaryInvoice({ status: "PAID", amount_paid: 89.28, total: 89.28 })
    ).toBe("PAID");
    expect(
      orderStatusFromPrimaryInvoice({ status: "ISSUED", amount_paid: 89.28, total: 89.28 })
    ).toBe("PAID");
  });

  it("uses Partially paid when some money is on the invoice", () => {
    expect(
      orderStatusFromPrimaryInvoice({ status: "ISSUED", amount_paid: 20, total: 89.28 })
    ).toBe("PARTIALLY_PAID");
  });
});
