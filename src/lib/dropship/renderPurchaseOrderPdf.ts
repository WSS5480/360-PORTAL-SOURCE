// src/lib/dropship/renderPurchaseOrderPdf.ts
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Addr = {
  company?: string;
  attn?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
  phone?: string;
  email?: string;
};

function s(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function safeLines(xs: any): string[] {
  if (!Array.isArray(xs)) return [];
  return xs.map((x) => s(x)).filter(Boolean);
}

function addrLines(a: Addr | null | undefined): string[] {
  if (!a) return [];
  const lines: string[] = [];
  const company = s(a.company);
  const attn = s(a.attn);
  const line1 = s(a.line1);
  const line2 = s(a.line2);
  const city = s(a.city);
  const state = s(a.state);
  const postal = s(a.postal);
  const country = s(a.country);

  if (company) lines.push(company);
  if (attn) lines.push(`Attn: ${attn}`);
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);

  const csz = [city, state, postal].filter(Boolean).join(" ");
  if (csz) lines.push(csz);

  if (country) lines.push(country);
  return lines;
}

function moneyWithSymbol(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$ 0.00";
  return `$ ${v.toFixed(2)}`;
}

function moneyNoSymbol(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return v.toFixed(2);
}

function formatMMDDYYYY(raw: any): string {
  const str = s(raw);
  if (!str) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) {
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[2]}/${m[3]}/${m[1]}`;
    return str;
  }
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${mm}/${dd}/${yy}`;
}

function clampTextToWidth(opts: { text: string; maxWidth: number; font: any; size: number }): string {
  const { text, maxWidth, font, size } = opts;
  const t = s(text);
  if (!t) return "";
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;

  const ell = "…";
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = t.slice(0, mid) + ell;
    const w = font.widthOfTextAtSize(candidate, size);
    if (w <= maxWidth) lo = mid + 1;
    else hi = mid;
  }
  const cut = Math.max(0, lo - 1);
  return t.slice(0, cut) + ell;
}

function wrapLines(opts: { text: string; maxWidth: number; font: any; size: number; maxLines: number }): string[] {
  const t = s(opts.text);
  if (!t) return [];
  const words = t.split(/\s+/).filter(Boolean);

  const lines: string[] = [];
  let cur = "";

  const fits = (x: string) => opts.font.widthOfTextAtSize(x, opts.size) <= opts.maxWidth;

  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (fits(next)) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    cur = w;

    if (lines.length >= opts.maxLines - 1) {
      lines.push(clampTextToWidth({ text: cur, maxWidth: opts.maxWidth, font: opts.font, size: opts.size }));
      return lines;
    }
  }

  if (cur) lines.push(cur);
  return lines.slice(0, opts.maxLines);
}

function drawBox(page: any, x: number, y: number, w: number, h: number, border: any, fill: any) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: border,
    borderWidth: 1,
    color: fill,
  });
}

export type PurchaseOrderPdfInput = {
  poNumber: string;
  orderDateISO: string;
  expectedArrivalISO?: string | null;
  shipMethod?: string | null;
  paymentTerms?: string | null;

  buyerName?: string | null;

  vendor: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: Addr | null;
  };

  shippingTo: {
    nameLine?: string | null;
    address?: Addr | null;
  };

  items: Array<{
    sku?: string | null;
    description: string;
    qty: number;
    uom?: string | null;
    unit_price?: number | null;
    discount_pct?: number | null; // ignored for now
    taxes?: number | null;
  }>;

  brand: {
    logoPublicPath?: string;
    companyName: string;
    addressLines: string[];
    email?: string;
    website?: string;
  };
};

export async function renderPurchaseOrderPdf(input: PurchaseOrderPdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 42;
  const leftX = margin;
  const rightX = width - margin;
  const topY = height - margin;

  // ✅ Polished palette
  const brandBlue = rgb(0.117, 0.533, 0.898); // ~ #1e88e5
  const textMuted = rgb(0.45, 0.45, 0.45);
  const border = rgb(0.82, 0.82, 0.82);
  const fill = rgb(0.985, 0.985, 0.985);
  const rule = rgb(0.84, 0.84, 0.84);
  const lightRule = rgb(0.92, 0.92, 0.92);

  function drawRightText(text: string, xRight: number, y: number, size: number, useBold?: boolean, color?: any) {
    const f = useBold ? fontBold : font;
    const t = String(text ?? "");
    const w = f.widthOfTextAtSize(t, size);
    page.drawText(t, { x: xRight - w, y, size, font: f, color: color ?? undefined });
  }

  // ===== Logo =====
  const logoPublicPath = s(input.brand.logoPublicPath);
  const logoPath = logoPublicPath ? path.join(process.cwd(), "public", logoPublicPath) : "";

  let logoH = 0;
  if (logoPath && fs.existsSync(logoPath)) {
    const bytes = fs.readFileSync(logoPath);
    const img = await pdfDoc.embedPng(bytes);

    const maxW = 170;
    const maxH = 52;
    const scale = Math.min(maxW / img.width, maxH / img.height);

    const wImg = img.width * scale;
    const hImg = img.height * scale;

    page.drawImage(img, { x: leftX, y: topY - hImg, width: wImg, height: hImg });
    logoH = hImg;
  }

  // ===== Brand address under logo (FIX: print each line, no truncation) =====
  // This guarantees "United States" is its own line and won’t get chopped.
  let by = topY - (logoH ? logoH + 12 : 0);

  const addrLinesBrand = safeLines(input.brand.addressLines);
  const brandSize = 9.25;

  for (const ln of addrLinesBrand.slice(0, 4)) {
    page.drawText(ln, { x: leftX, y: by, size: brandSize, font, color: textMuted });
    by -= 12;
  }

  const infoLine = [s(input.brand.email), s(input.brand.website)].filter(Boolean).join(" · ");
  if (infoLine) {
    const maxW = 420;
    const infoWrapped = wrapLines({ text: infoLine, maxWidth: maxW, font, size: brandSize, maxLines: 1 });
    if (infoWrapped[0]) page.drawText(infoWrapped[0], { x: leftX, y: by, size: brandSize, font, color: textMuted });
  }

  // ===== Meta box =====
  const metaW = 300;
  const metaX = rightX - metaW;

  const buyer = s(input.buyerName) || "—";
  const orderDate = formatMMDDYYYY(input.orderDateISO);
  const expectedArrival = input.expectedArrivalISO ? formatMMDDYYYY(input.expectedArrivalISO) : "—";
  const shipMethod = s(input.shipMethod) || "—";
  const paymentTerms = s(input.paymentTerms) || "—";

  const valueX = metaX + 78;
  const valueMaxW = metaW - 12 - 78;

  const shipLines = wrapLines({ text: shipMethod, maxWidth: valueMaxW, font, size: 9.5, maxLines: 2 });
  const extraShipLine = shipLines.length > 1 ? 1 : 0;

  const metaH = 56 + 5 * 14 + extraShipLine * 12;
  const metaY = topY - metaH + 6;

  drawBox(page, metaX, metaY, metaW, metaH, border, fill);

  // ✅ Blue accent for title
  page.drawText("Purchase Order", { x: metaX + 12, y: metaY + metaH - 18, size: 12, font: fontBold, color: brandBlue });
  drawRightText(`#${s(input.poNumber) || "—"}`, metaX + metaW - 12, metaY + metaH - 18, 12, true);

  let my = metaY + metaH - 38;

  function metaRow(label: string, value: string) {
    page.drawText(label, { x: metaX + 12, y: my, size: 9.5, font: fontBold, color: textMuted });
    page.drawText(clampTextToWidth({ text: value, maxWidth: valueMaxW, font, size: 9.5 }), {
      x: valueX,
      y: my,
      size: 9.5,
      font,
    });
    my -= 14;
  }

  metaRow("Buyer:", buyer);
  metaRow("Order Date:", orderDate);
  metaRow("Expected:", expectedArrival);

  page.drawText("Ship Method:", { x: metaX + 12, y: my, size: 9.5, font: fontBold, color: textMuted });
  page.drawText(shipLines[0] ?? "—", { x: valueX, y: my, size: 9.5, font });
  if (shipLines[1]) page.drawText(shipLines[1], { x: valueX, y: my - 12, size: 9.5, font });
  my -= shipLines[1] ? 26 : 14;

  metaRow("Terms:", paymentTerms);

  // Divider under header
  const headerBottomY = topY - 120;
  page.drawLine({ start: { x: margin, y: headerBottomY }, end: { x: rightX, y: headerBottomY }, thickness: 1, color: rule });

  // ===== Ship To + Vendor =====
  const boxGap = 14;
  const fullW = rightX - margin;
  const shipBoxW = Math.floor(fullW * 0.58);
  const vendBoxW = fullW - shipBoxW - boxGap;

  const boxTopY = headerBottomY - 18;
  const boxH = 120;

  const shipX = margin;
  const vendX = margin + shipBoxW + boxGap;
  const boxY = boxTopY - boxH;

  drawBox(page, shipX, boxY, shipBoxW, boxH, border, fill);
  drawBox(page, vendX, boxY, vendBoxW, boxH, border, fill);

  // ✅ Blue section headers
  page.drawText("Ship To", { x: shipX + 10, y: boxTopY - 16, size: 10.5, font: fontBold, color: brandBlue });
  let sy = boxTopY - 34;

  const shipName = s(input.shippingTo.nameLine);
  if (shipName) {
    page.drawText(clampTextToWidth({ text: shipName, maxWidth: shipBoxW - 20, font: fontBold, size: 10 }), {
      x: shipX + 10,
      y: sy,
      size: 10,
      font: fontBold,
    });
    sy -= 12;
  }

  for (const line of addrLines(input.shippingTo.address).slice(0, 6)) {
    page.drawText(clampTextToWidth({ text: line, maxWidth: shipBoxW - 20, font, size: 9.5 }), {
      x: shipX + 10,
      y: sy,
      size: 9.5,
      font,
    });
    sy -= 11;
    if (sy < boxY + 10) break;
  }

  page.drawText("Vendor", { x: vendX + 10, y: boxTopY - 16, size: 10.5, font: fontBold, color: brandBlue });
  let vy = boxTopY - 34;

  const vendName = s(input.vendor.name) || "Vendor";
  page.drawText(clampTextToWidth({ text: vendName, maxWidth: vendBoxW - 20, font: fontBold, size: 10 }), {
    x: vendX + 10,
    y: vy,
    size: 10,
    font: fontBold,
  });
  vy -= 12;

  const vPhone = s(input.vendor.phone);
  const vEmail = s(input.vendor.email);
  const vLines = [...addrLines(input.vendor.address || undefined), ...(vPhone ? [vPhone] : []), ...(vEmail ? [vEmail] : [])];

  for (const line of vLines.slice(0, 6)) {
    page.drawText(clampTextToWidth({ text: line, maxWidth: vendBoxW - 20, font, size: 9.5 }), {
      x: vendX + 10,
      y: vy,
      size: 9.5,
      font,
    });
    vy -= 11;
    if (vy < boxY + 10) break;
  }

  // ===== Items table =====
  const tableTopY = boxY - 22;

  const taxRight = rightX;
  const amountRight = rightX - 72;
  const unitRight = rightX - 180;
  const qtyX = rightX - 300;
  const descX = margin;

  const descMaxWidth = qtyX - descX - 10;

  // ✅ Blue table rule
  page.drawLine({ start: { x: margin, y: tableTopY }, end: { x: rightX, y: tableTopY }, thickness: 1.25, color: brandBlue });

  const headerY = tableTopY - 14;
  page.drawText("DESCRIPTION", { x: descX, y: headerY, size: 9, font: fontBold, color: textMuted });
  page.drawText("QTY", { x: qtyX, y: headerY, size: 9, font: fontBold, color: textMuted });

  drawRightText("UNIT PRICE", unitRight, headerY, 9, true, textMuted);
  drawRightText("AMOUNT", amountRight, headerY, 9, true, textMuted);
  drawRightText("TAX", taxRight, headerY, 9, true, textMuted);

  page.drawLine({ start: { x: margin, y: headerY - 8 }, end: { x: rightX, y: headerY - 8 }, thickness: 0.8, color: rule });

  let ty = headerY - 22;

  let untaxed = 0;
  let taxesTotal = 0;

  for (const it of input.items) {
    const qty = Number(it.qty) || 0;
    const unit = Number(it.unit_price) || 0;
    const tax = Number(it.taxes) || 0;

    const line = qty * unit;
    untaxed += line;
    taxesTotal += tax;

    const sku = s(it.sku);
    const rawDesc = s(it.description) || "Item";
    const descText = `${sku ? `[${sku}] ` : ""}${rawDesc}`;
    const desc = clampTextToWidth({ text: descText, maxWidth: descMaxWidth, font, size: 10 });

    page.drawText(desc, { x: descX, y: ty, size: 10, font });

    const uom = s(it.uom) || "Units";
    page.drawText(`${qty.toFixed(2)} ${uom}`.replace(/\.00\b/, ".00"), { x: qtyX, y: ty, size: 10, font });

    drawRightText(moneyNoSymbol(unit), unitRight, ty, 10);
    drawRightText(moneyWithSymbol(line), amountRight, ty, 10);
    drawRightText(moneyWithSymbol(tax), taxRight, ty, 10);

    ty -= 18;

    page.drawLine({ start: { x: margin, y: ty + 8 }, end: { x: rightX, y: ty + 8 }, thickness: 0.6, color: lightRule });

    if (ty < 170) break;
  }

  // ===== Totals box =====
  const totalsW = 250;
  const totalsH = 74;
  const totalsX = rightX - totalsW;
  const totalsY = Math.max(margin + 40, Math.min(ty - 86, 140));

  drawBox(page, totalsX, totalsY, totalsW, totalsH, border, fill);

  const labelX = totalsX + 12;
  const valueRight = totalsX + totalsW - 12;

  function totalRow(label: string, value: string, y: number, bold?: boolean) {
    page.drawText(label, { x: labelX, y, size: 10, font: bold ? fontBold : font, color: textMuted });
    drawRightText(value, valueRight, y, 10, bold);
  }

  totalRow("Untaxed", moneyWithSymbol(untaxed), totalsY + totalsH - 22);
  totalRow("Taxes", moneyWithSymbol(taxesTotal), totalsY + totalsH - 40);

  page.drawLine({ start: { x: totalsX + 10, y: totalsY + 26 }, end: { x: totalsX + totalsW - 10, y: totalsY + 26 }, thickness: 1, color: rule });

  // ✅ Blue emphasis for Total label (subtle polish)
  page.drawText("Total", { x: labelX, y: totalsY + 10, size: 10, font: fontBold, color: brandBlue });
  drawRightText(moneyWithSymbol(untaxed + taxesTotal), valueRight, totalsY + 10, 10, true);

  page.drawText("Page 1 / 1", { x: rightX - 60, y: margin - 8, size: 9, font, color: textMuted });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
