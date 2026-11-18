/**
 * Rep-facing product interest headlines — plain language, not extraction jargon.
 */

const GENERIC_PRODUCT_INTEREST_RE =
  /\b(?:product interest|product feature interest|product setup|learning-curve question)\b/i;

export function normalizeProductInterestLabel(raw: string, evidence?: string): string {
  const label = raw.replace(/^Product interest:\s*/i, "").trim();
  const blob = `${label} ${evidence ?? ""}`.trim().toLowerCase();

  if (
    /comparison|clinical[- ]data|comparative clinical|comparative data|data we talked about/i.test(blob)
  ) {
    return "Comparative clinical data interest";
  }

  if (
    /published outcome|clinical evidence|published clinical|evidence before|outcomes before|data before/i.test(
      blob,
    ) ||
    /before considering|before (?:any )?chang|before evaluat|before switch/i.test(blob) ||
    /desire for published|wanted to see published|wants published|asked for published/i.test(blob)
  ) {
    return "Wants published outcomes before product change";
  }

  if (/alternatives for larger defects/i.test(blob)) {
    return "Alternatives for larger defects";
  }

  if (/open to new technology/i.test(blob)) {
    return "Open to new technology";
  }

  if (!label || GENERIC_PRODUCT_INTEREST_RE.test(label)) {
    return "Product interest noted";
  }

  return label;
}

export function formatProductInterestHeadline(raw: string, evidence?: string): string {
  return `Product interest: ${normalizeProductInterestLabel(raw, evidence)}`;
}
