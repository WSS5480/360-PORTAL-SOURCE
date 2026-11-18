/**
 * Sales-language sanitizer for pipeline synthesis — preserves "Unknown", strips internal taxonomy only.
 */

const INTERNAL_TAXONOMY_RE =
  /\b(?:shared_workflow|provider_office|provider-linked|deployment readiness|operational signals?|readiness signals?|partially mapped|credentialing_required|discussed_only)\b/gi;

export function sanitizePipelineSalesCopy(text: string, maxLen = 320): string {
  let t = String(text ?? "")
    .trim()
    .replace(INTERNAL_TAXONOMY_RE, (match) => {
      const key = match.toLowerCase();
      if (key === "shared_workflow") return "shared scheduling between office and hospital";
      if (key === "provider_office" || key === "provider-linked") return "provider office team";
      if (key.includes("deployment")) return "ready for field evaluation";
      if (key.includes("operational")) return "field notes";
      return "";
    });
  t = t.replace(/\s{2,}/g, " ").trim();
  if (t.length > maxLen) return `${t.slice(0, maxLen - 1).trim()}…`;
  return t;
}
