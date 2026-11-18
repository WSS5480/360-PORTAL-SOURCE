// src/lib/billing/renderInvoicePdf.ts
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Address = {
  name?: string | null;
  company?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
};

export type InvoiceLine = {
  description: string;
  qty: number;
  uom?: string | null;
  unit_price: number; // dollars
  serials?: string[] | null; // ✅ supported
};

export type RenderInvoiceArgs = {
  invoiceNumber: string;
  orderNumber?: string | null;
  orderDateISO?: string | null;
  totalSqcm?: number | null;
  /** Label for the sq cm line in totals (default "Total Sq cm"; use "Bulk purchase (sq cm)" for bulk orders). */
  totalSqcmCaption?: string | null;

  billTo?: Address | null;
  shipTo?: Address | null;

  lines: InvoiceLine[];

  // totals
  subtotal?: number | null; // "Untaxed Amount"
  tax?: number | null;
  shipping?: number | null;
  total?: number | null;
  amountPaid?: number | null; // when set, show Amount Paid and Balance Due

  brand?: {
    companyName: string;
    addressLines?: string[];
    email?: string | null;
    website?: string | null;
    phone?: string | null;
  };

  /** Extra lines above the footer (e.g. virtual-warehouse bulk summary). */
  footerNotes?: string[] | null;

  /** Wire transfer instructions (Frost / ACH details); shown on a dedicated section of the PDF. */
  wireInstructions?: string | null;

  /** When true, shipping line includes “invoiced separately per fulfillment” (bulk / VW / supplement flows). */
  shippingInvoicedPerFulfillment?: boolean;
};

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function fmtSqcm(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function linesFromAddress(a?: Address | null): string[] {
  const x = a || {};
  const name = (x.name || x.company || "").trim();
  const l1 = (x.line1 || "").trim();
  const l2 = (x.line2 || "").trim();
  const city = (x.city || "").trim();
  const state = (x.state || "").trim();
  const zip = (x.zip || "").trim();
  const country = (x.country || "").trim();

  const out: string[] = [];
  if (name) out.push(name);
  if (l1) out.push(l1);
  if (l2) out.push(l2);

  const cs = [city, state].filter(Boolean).join(", ");
  const csZ = [cs, zip].filter(Boolean).join(" ");
  if (csZ) out.push(csZ);
  if (country) out.push(country);
  return out;
}

function wrapText(text: string, maxChars: number): string[] {
  const s = safeStr(text);
  if (!s) return [];
  const words = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

function chunkSerials(serials: string[], maxChars: number): string[] {
  const s = serials.map((x) => safeStr(x)).filter(Boolean);
  if (!s.length) return [];
  const joined = `Serials: ${s.join(", ")}`;
  return wrapText(joined, maxChars);
}

export async function renderInvoicePdf(args: RenderInvoiceArgs): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  let page = pdf.addPage([612, 792]); // Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const pageH = 792;

  const brandBlue = rgb(0.117, 0.533, 0.898); // #1e88e5
  const textMuted = rgb(0.45, 0.45, 0.45);
  const lightRule = rgb(0.9, 0.9, 0.9);

  const drawText = (text: string, x: number, y: number, size = 11, bold = false, color?: any) => {
    page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: color ?? undefined });
  };

  const newPage = () => {
    page = pdf.addPage([612, 792]);
    return page;
  };

  let y = pageH - margin;

  // Thin brand rule for a premium header (kept above header text)
  page.drawLine({
    start: { x: margin, y: pageH - margin + 18 },
    end: { x: 612 - margin, y: pageH - margin + 18 },
    thickness: 2,
    color: brandBlue,
  });

  // Logo (top-left)
  const logoPath = path.join(process.cwd(), "public", "brand", "360-logo-black.png");
  let logoW = 0;
  let logoH = 0;
  if (fs.existsSync(logoPath)) {
    const bytes = fs.readFileSync(logoPath);
    const img = await pdf.embedPng(bytes);
    const maxW = 350;
    const maxH = 108;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    logoW = img.width * scale;
    logoH = img.height * scale;
    page.drawImage(img, { x: margin, y: y - logoH + 16, width: logoW, height: logoH });
  }

  // Brand header (left) — no company name, logo only
  const brandX = margin;
  if (logoH) y -= logoH - 8;
  const brandLines = args.brand?.addressLines || [];
  for (const ln of brandLines.slice(0, 3)) {
    drawText(String(ln), brandX, y, 9.5, false, textMuted);
    y -= 12;
  }
  if (args.brand?.email) {
    drawText(String(args.brand.email), brandX, y, 9.5, false, textMuted);
    y -= 12;
  }
  if (args.brand?.website) {
    drawText(String(args.brand.website), brandX, y, 9.5, false, textMuted);
    y -= 12;
  }

  // Right header
  const rightX = 612 - margin - 220;
  let ry = pageH - margin;
  drawText("INVOICE", rightX, ry, 16, true, brandBlue);
  ry -= 18;

  drawText(`Invoice #: ${args.invoiceNumber}`, rightX, ry, 11, true);
  ry -= 14;

  if (args.orderNumber) {
    drawText(`Order #: ${args.orderNumber}`, rightX, ry, 10, false);
    ry -= 12;
  }
  if (args.orderDateISO) {
    drawText(`Date: ${args.orderDateISO}`, rightX, ry, 10, false, textMuted);
    ry -= 12;
  }

  y = Math.min(y, ry) - 18;

  // Divider between header and addresses
  page.drawLine({
    start: { x: margin, y: y + 16 },
    end: { x: 612 - margin, y: y + 16 },
    thickness: 1,
    color: lightRule,
  });

  // Bill / Ship blocks
  const colW = (612 - margin * 2 - 20) / 2;
  const leftX = margin;
  const rightColX = margin + colW + 20;

  drawText("Bill To", leftX, y, 11, true, brandBlue);
  drawText("Ship To", rightColX, y, 11, true, brandBlue);
  y -= 14;

  const billLines = linesFromAddress(args.billTo);
  const shipLines = linesFromAddress(args.shipTo);

  const blockMax = Math.max(billLines.length, shipLines.length, 3);
  for (let i = 0; i < blockMax; i++) {
    const bl = billLines[i] || "";
    const sl = shipLines[i] || "";
    if (bl) drawText(bl, leftX, y, 10, false);
    if (sl) drawText(sl, rightColX, y, 10, false);
    y -= 12;
  }

  y -= 14;

  // Table header
  const tableX = margin;
  const tableW = 612 - margin * 2;

  const descW = tableW - 60 - 90 - 90; // qty + unit + line total
  const qtyX = tableX + descW;
  const unitX = qtyX + 60;
  const totalX = unitX + 90;

  const drawTableHeader = () => {
    drawText("Description", tableX, y, 10, true);
    drawText("Qty", qtyX + 2, y, 10, true);
    drawText("Unit", unitX + 2, y, 10, true);
    drawText("Line Total", totalX + 2, y, 10, true);
    y -= 10;

    page.drawLine({ start: { x: tableX, y }, end: { x: tableX + tableW, y }, thickness: 1, color: lightRule });
    y -= 12;
  };

  drawTableHeader();

  // Lines (with serials)
  const lines = args.lines || [];

  for (const ln of lines) {
    const qty = Math.max(0, safeNum(ln.qty));
    const unit = safeNum(ln.unit_price);
    const lineTotal = qty * unit;

    const descLines = wrapText(String(ln.description || "Item"), 60);
    const serialLines = chunkSerials((ln.serials || []).slice(0, 200), 60);

    const neededRows = Math.max(1, descLines.length) + (serialLines.length ? serialLines.length : 0);

    // crude pagination
    if (y - neededRows * 12 < 120) {
      newPage();
      y = pageH - margin;
      drawTableHeader();
    }

    const firstDesc = descLines[0] || "Item";
    drawText(firstDesc, tableX, y, 10, false);
    drawText(String(qty), qtyX + 2, y, 10, false);
    drawText(money(unit), unitX + 2, y, 10, false);
    drawText(money(lineTotal), totalX + 2, y, 10, false);
    y -= 12;

    for (let i = 1; i < descLines.length; i++) {
      drawText(descLines[i], tableX, y, 10, false);
      y -= 12;
    }

    for (const sl of serialLines) {
      drawText(sl, tableX + 12, y, 9, false);
      y -= 11;
    }

    y -= 6;
  }

  // Totals
  const computedSubtotal = lines.reduce<number>((sum: number, ln: InvoiceLine) => {
    return sum + safeNum(ln.qty) * safeNum(ln.unit_price);
  }, 0);

  const subtotal = args.subtotal != null ? safeNum(args.subtotal) : computedSubtotal;
  const tax = args.tax != null ? safeNum(args.tax) : 0;
  const shipping = args.shipping != null ? safeNum(args.shipping) : 0;
  const total = args.total != null ? safeNum(args.total) : subtotal + tax + shipping;

  if (y < 170) {
    newPage();
    y = pageH - margin - 20;
  }

  y -= 6;
  page.drawLine({ start: { x: tableX, y }, end: { x: tableX + tableW, y }, thickness: 1 });
  y -= 16;

  const totalsX = tableX + tableW - 240;

  // ✅ "Untaxed Amount" on its own line
  const totalsLeftX = tableX;
  const totalSqcmLabel = fmtSqcm(args.totalSqcm);
  const sqcmCaption = safeStr(args.totalSqcmCaption) || "Total Sq cm";
  if (totalSqcmLabel) {
    drawText(`${sqcmCaption}: ${totalSqcmLabel}`, totalsLeftX, y, 10, false, textMuted);
  }
  drawText(`Untaxed Amount: ${money(subtotal)}`, totalsX, y, 11, true);
  y -= 14;

  const shippingExtra =
    args.shippingInvoicedPerFulfillment && shipping > 0 ? " (invoiced separately per fulfillment)" : "";
  const shippingLine = `Shipping: ${money(shipping)}${shippingExtra}`;
  drawText(shippingLine, totalsX, y, 11, false);
  y -= 14;

  drawText(`Tax: ${money(tax)}`, totalsX, y, 11, false);
  y -= 14;

  drawText(`Total: ${money(total)}`, totalsX, y, 12, true, brandBlue);

  const amountPaid = args.amountPaid != null ? safeNum(args.amountPaid) : 0;
  if (amountPaid > 0) {
    y -= 14;
    drawText(`Amount Paid: ${money(amountPaid)}`, totalsX, y, 11, false);
    const balanceDue = Math.max(0, total - amountPaid);
    y -= 14;
    drawText(`Balance Due: ${money(balanceDue)}`, totalsX, y, 11, true, balanceDue > 0 ? undefined : brandBlue);
  }

  const wireRaw = safeStr(args.wireInstructions);
  if (wireRaw) {
    y -= 10;
    if (y < 140) {
      newPage();
      y = pageH - margin - 20;
    }
    drawText("Wire payment instructions", tableX, y, 12, true, brandBlue);
    y -= 16;
    const wireLines = wireRaw.split(/\r?\n/).flatMap((para) => {
      const t = safeStr(para);
      if (!t) return [] as string[];
      return wrapText(t, 90);
    });
    for (const wl of wireLines) {
      if (y < 72) {
        newPage();
        y = pageH - margin - 20;
      }
      drawText(wl || " ", tableX, y, 8, false);
      y -= 10;
    }
  }

  const footerNoteLines: string[] = [];
  for (const raw of (args.footerNotes || []).map((x) => safeStr(x)).filter(Boolean)) {
    for (const w of wrapText(raw, 95)) footerNoteLines.push(w);
  }

  drawText("All sales are final.", margin, 24, 9, false, textMuted);

  let footY = 38;
  for (const line of footerNoteLines) {
    if (footY > y - 36) {
      newPage();
      y = pageH - margin - 20;
      drawText("All sales are final.", margin, 24, 9, false, textMuted);
      footY = 38;
    }
    drawText(line, margin, footY, 8.5, false, textMuted);
    footY += 10;
  }

  return await pdf.save();
}
