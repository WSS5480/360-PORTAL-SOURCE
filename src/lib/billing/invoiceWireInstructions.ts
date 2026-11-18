/**
 * Wire instructions for invoices and portal pay. Override via INVOICE_WIRE_INSTRUCTIONS or PORTAL_WIRE_INSTRUCTIONS.
 */
export const DEFAULT_FROST_WIRE_INSTRUCTIONS = `WIRING INSTRUCTIONS FOR FROST BANK

FROST BANK
100 W. Houston Street
San Antonio, Texas 78205
ABA: 114000093
SWIFT Code: FRSTUS44 (International incoming wires only)

Incoming wire information:
Beneficiary's Bank: FROST BANK
Bank City & State: SAN ANTONIO, TX
Bank ABA: 114000093
Note: If the wire is from an international source, use SWIFT FRSTUS44 instead of the ABA routing number.

Business / Personal Account Name: (as shown on your invoice)
Amount of Wire: (enter the amount you are paying)
Beneficiary (Business) Address:
Beneficiary (Business) Account# to credit: (provided on your remittance advice if applicable)
Additional Comments: Include invoice number in the wire memo/reference.

Account Officer: Abner Gudiño — (956) 668-3016
FROST WIRE DEPARTMENT closes at 4pm daily – incoming wires are still accepted until 5pm.

Remit to:
360 Medical, LLC
3900 N. 10th St. Suite 1050
McAllen, TX 78501

Questions: 800-442-2088

After sending your wire, return to the portal to upload proof of payment (PDF receipt, bank confirmation, or screenshot) so we can verify and apply your payment.`;

export function getInvoiceWireInstructionsText(): string {
  const fromEnv =
    (typeof process !== "undefined" && process.env?.INVOICE_WIRE_INSTRUCTIONS?.trim()) ||
    (typeof process !== "undefined" && process.env?.PORTAL_WIRE_INSTRUCTIONS?.trim()) ||
    "";
  return fromEnv || DEFAULT_FROST_WIRE_INSTRUCTIONS;
}
