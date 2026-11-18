import type { PackingSlipPdfProps } from "./PackingSlipPdf";

/** Shared sample props for dev preview + Playwright (matches 4×6 packing slip layout). */
export function getPackingSlipPreviewProps(logoDataUri: string | null): PackingSlipPdfProps {
  return {
    logoDataUri,
    companyName: "360 Medical",
    companyLine1: "3900 N. 10th St. Suite 1050",
    companyLine2: "McAllen, TX 78501",
    fulfillmentIdShort: "PS-PREVIEW",
    orderNumber: "ORD-1000",
    invoiceShort: "INV-2000",
    createdAtLabel: "Apr 1, 2026, 10:00 AM",
    shipTo: {
      name: "Acme Hospital",
      line1: "100 Health Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    billTo: {
      name: "Acme Purchasing",
      line1: "200 Commerce Dr",
      city: "Dallas",
      state: "TX",
      zip: "75201",
    },
    items: [
      {
        id: "preview-1",
        qty: 2,
        uom: "Each",
        description: "Sterile pack — preview line",
        sku: "SKU-PREVIEW",
        lot: "LOT123 · S/N 630882001 default",
        exp: "2027-06-30",
      },
    ],
  };
}
