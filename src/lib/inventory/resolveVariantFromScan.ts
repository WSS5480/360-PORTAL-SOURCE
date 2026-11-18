// src/lib/inventory/resolveVariantFromScan.ts

type SupabaseLike = {
  from: (table: string) => any;
};

/**
 * Extract candidates from a scanner string.
 * We return a set of possible identifier values (normalized),
 * plus some detected "kind" guesses for lookup.
 *
 * NOTE: Real GS1 parsing can be extended here if you already have it elsewhere.
 * If you already have a GS1 parser in your scan-in flow, move it here and reuse it.
 */
export function extractScanCandidates(rawScan: string): {
  raw: string;
  candidates: { kind: string; value: string }[];
} {
  const raw = String(rawScan || "").trim();
  const set = new Map<string, { kind: string; value: string }>();

  const add = (kind: string, value: string) => {
    const v = String(value || "").trim();
    if (!v) return;
    set.set(`${kind}:${v}`, { kind, value: v });
  };

  if (!raw) return { raw: "", candidates: [] };

  // Keep raw as SKU fallback (some scanners send SKU text)
  add("SKU", raw);
  add("SKU", raw.replace(/\s+/g, ""));

  // Digits only (common for UPC/EAN/GTIN scans)
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 12) add("UPC", digits);      // UPC-A
  if (digits.length === 13) add("EAN", digits);      // EAN-13
  if (digits.length === 14) add("GTIN", digits);     // GTIN-14

  // Very simple GS1 (01)GTIN14 pattern (scanner might include parentheses)
  const m01 = raw.match(/\(01\)\s*([0-9]{14})/);
  if (m01?.[1]) {
    add("GTIN", m01[1]);
    add("GS1", raw); // keep full raw too (sometimes you want exact)
  }

  // Some scanners emit AI without parentheses: 01 + 14 digits
  const m01n = raw.match(/(?:^|[^0-9])01([0-9]{14})(?:[^0-9]|$)/);
  if (m01n?.[1]) add("GTIN", m01n[1]);

  return { raw, candidates: Array.from(set.values()) };
}

/**
 * Resolve a variant_id from a raw scan by checking variant_identifiers first,
 * then SKU fallback directly on product_variants.
 */
export async function resolveVariantIdFromScan(
  sb: SupabaseLike,
  rawScan: string
): Promise<{ variantId: string | null; matched?: { kind: string; value: string } }> {
  const { candidates } = extractScanCandidates(rawScan);
  if (!candidates.length) return { variantId: null };

  // 1) First: variant_identifiers exact lookup
  for (const c of candidates) {
    const { data, error } = await sb
      .from("variant_identifiers")
      .select("variant_id")
      .eq("kind", c.kind)
      .eq("value", c.value)
      .maybeSingle();

    if (!error && data?.variant_id) {
      return { variantId: String(data.variant_id), matched: c };
    }
  }

  // 2) Fallback: SKU on product_variants (in case identifiers not fully populated)
  for (const c of candidates.filter((x) => x.kind === "SKU")) {
    const { data, error } = await sb.from("product_variants").select("id").eq("sku", c.value).maybeSingle();
    if (!error && data?.id) return { variantId: String(data.id), matched: c };
  }

  return { variantId: null };
}
