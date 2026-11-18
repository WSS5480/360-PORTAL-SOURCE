/**
 * Parse lines from plain text extracted from 360 Medical style delivery slips:
 * `[SKU] Label…<lot/serial>…<qty> Units`
 */

export type ParsedSlipLine = {
  sku: string;
  /** Lot or serial as printed on the slip */
  identifier: string;
  qty: number;
};

export type ParseDeliverySlipResult = {
  lines: ParsedSlipLine[];
  /** e.g. WH/OUT/00468 */
  warehouseOutbound: string | null;
  /** e.g. S00454 */
  salesOrder: string | null;
  warnings: string[];
};

function normalizeQty(raw: string): number {
  const n = Math.floor(Number(String(raw ?? "").replace(/,/g, "")) || 0);
  return n > 0 ? n : 1;
}

/**
 * Primary pattern: bracket SKU, then lot/serial, then quantity + Units.
 */
function parsePrimary(text: string): ParsedSlipLine[] {
  const out: ParsedSlipLine[] = [];
  // Identifier: 5–15 digits/alnum (serials are often 9 digits)
  const re =
    /\[([A-Z][A-Z0-9]{2,})\][^\n]*?[\s\t]+([A-Za-z0-9][A-Za-z0-9-]{4,29})[\s\t]+(\d+(?:\.\d+)?)\s*Units/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sku = String(m[1] ?? "").toUpperCase();
    const identifier = String(m[2] ?? "").trim();
    const qty = normalizeQty(String(m[3] ?? "1"));
    if (!sku || !identifier) continue;
    out.push({ sku, identifier, qty });
  }
  return out;
}

export function parseDeliverySlipPdfText(text: string): ParseDeliverySlipResult {
  const warnings: string[] = [];
  const normalized = String(text ?? "").replace(/\r\n/g, "\n");

  let lines = parsePrimary(normalized);

  // De-dupe identical sku+identifier+qty repeats (bad OCR / double extraction)
  const dedup = new Map<string, ParsedSlipLine>();
  for (const row of lines) {
    const k = `${row.sku}|${row.identifier}|${row.qty}`;
    dedup.set(k, row);
  }
  lines = Array.from(dedup.values());

  const wh = normalized.match(/\bWH\/OUT\/(\d+)\b/i);
  const so = normalized.match(/\b(S\d{4,})\b/);

  if (lines.length === 0) {
    warnings.push(
      "Could not find any [SKU] lines with a lot/serial and quantity. The PDF may be scanned images without text, or uses an unsupported layout."
    );
  }

  return {
    lines,
    warehouseOutbound: wh ? `WH/OUT/${wh[1]}` : null,
    salesOrder: so ? so[1] : null,
    warnings,
  };
}
