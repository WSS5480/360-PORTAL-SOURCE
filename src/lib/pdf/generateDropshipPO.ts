import PDFDocument from "pdfkit";

type PoItem = {
  description: string;
  qty: number;
  uom: string;
  variant_id: string;
};

type SimpleAddress = {
  company?: string | null;
  attn?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
};

function cleanLine(v: unknown): string {
  const s = typeof v === "string" ? v : v == null ? "" : String(v);
  return s.trim();
}

function nonEmpty(lines: string[]): string[] {
  return lines.map((x) => cleanLine(x)).filter((x) => x.length > 0);
}

function formatCityStatePostal(a: SimpleAddress): string {
  const city = cleanLine(a.city);
  const state = cleanLine(a.state);
  const postal = cleanLine(a.postal);
  const parts = [city, state].filter(Boolean).join(", ");
  return [parts, postal].filter(Boolean).join(" ");
}

export async function buildDropshipPoPdf(args: {
  poNumber: string;
  fulfillmentId: string;
  orderNumber: string;

  vendor: {
    name: string;
    email: string;
    phone: string;
    address: SimpleAddress;
    notes: string;
  };

  shipTo: SimpleAddress | null;
  billTo: SimpleAddress | null;

  items: PoItem[];
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 48 });

  const chunks: Buffer[] = [];
  doc.on("data", (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Header
  doc.fontSize(18).fillColor("black").text("Purchase Order", { continued: true });
  doc.fontSize(12).fillColor("black").text(`   ${cleanLine(args.poNumber)}`);
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor("#333");
  doc.text(`Fulfillment: ${cleanLine(args.fulfillmentId)}`);
  if (cleanLine(args.orderNumber)) doc.text(`Order: ${cleanLine(args.orderNumber)}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown(1);

  // Vendor block
  doc.fontSize(12).fillColor("black").text("Vendor", { underline: true });
  doc.moveDown(0.25);

  const vName = cleanLine(args.vendor.name) || "—";
  const vEmail = cleanLine(args.vendor.email);
  const vPhone = cleanLine(args.vendor.phone);
  const vNotes = cleanLine(args.vendor.notes);
  const vAddr = args.vendor.address ?? {};

  doc.fontSize(10).fillColor("#000").text(vName);
  if (vEmail) doc.text(vEmail);
  if (vPhone) doc.text(vPhone);

  const vendorAddrLines = nonEmpty([
    cleanLine(vAddr.company),
    cleanLine(vAddr.attn) ? `Attn: ${cleanLine(vAddr.attn)}` : "",
    cleanLine(vAddr.line1),
    cleanLine(vAddr.line2),
    formatCityStatePostal(vAddr),
    cleanLine(vAddr.country),
  ]);

  if (vendorAddrLines.length) doc.text(vendorAddrLines.join("\n"));

  if (vNotes) {
    doc.moveDown(0.25);
    doc.fillColor("#333").text(`Notes: ${vNotes}`);
    doc.fillColor("#000");
  }

  doc.moveDown(1);

  // Ship To / Bill To blocks
  const leftX = doc.x;
  const topY = doc.y;

  function renderAddr(title: string, a: SimpleAddress | null) {
    doc.fontSize(12).fillColor("black").text(title, { underline: true });
    doc.moveDown(0.25);

    if (!a) {
      doc.fontSize(10).fillColor("#333").text("—");
      doc.fillColor("#000");
      return;
    }

    const lines = nonEmpty([
      cleanLine(a.company),
      cleanLine(a.attn) ? `Attn: ${cleanLine(a.attn)}` : "",
      cleanLine(a.line1),
      cleanLine(a.line2),
      formatCityStatePostal(a),
      cleanLine(a.country),
      cleanLine(a.phone) ? `Phone: ${cleanLine(a.phone)}` : "",
      cleanLine(a.email) ? `Email: ${cleanLine(a.email)}` : "",
    ]);

    doc.fontSize(10).fillColor("#333").text(lines.length ? lines.join("\n") : "—");
    doc.fillColor("#000");
  }

  // Ship To (left)
  doc.x = leftX;
  doc.y = topY;
  renderAddr("Ship To", args.shipTo);
  const afterShipY = doc.y;

  // Bill To (right)
  doc.x = 320;
  doc.y = topY;
  renderAddr("Bill To", args.billTo);
  const afterBillY = doc.y;

  // Continue below both
  doc.x = leftX;
  doc.y = Math.max(afterShipY, afterBillY) + 18;

  // Items table header
  doc.fontSize(12).fillColor("black").text("Items", { underline: true });
  doc.moveDown(0.5);

  const colQtyX = 48;
  const colUomX = 100;
  const colDescX = 152;

  doc.fontSize(10).fillColor("#000");
  doc.text("Qty", colQtyX, doc.y, { width: 50 });
  doc.text("UOM", colUomX, doc.y, { width: 50 });
  doc.text("Description", colDescX, doc.y, { width: 360 });

  doc.moveDown(0.25);
  doc.moveTo(48, doc.y).lineTo(560, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.5);

  const items = args.items ?? [];
  if (items.length === 0) {
    doc.fontSize(10).fillColor("#333").text("No items.");
    doc.end();
    return await done;
  }

  for (const it of items) {
    const y = doc.y;

    const qty = Number(it.qty ?? 0);
    const uom = cleanLine(it.uom) || "Units";
    const desc = cleanLine(it.description) || "—";

    doc.fontSize(10).fillColor("#000").text(String(Number.isFinite(qty) ? qty : 0), colQtyX, y, { width: 50 });
    doc.text(uom, colUomX, y, { width: 50 });
    doc.text(desc, colDescX, y, { width: 360 });

    doc.moveDown(0.6);

    // crude page break
    if (doc.y > 740) doc.addPage();
  }

  doc.end();
  return await done;
}
