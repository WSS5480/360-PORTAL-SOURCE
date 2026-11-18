function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function addressHasMinimum(a: unknown): boolean {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  const line1 = safeStr(o.line1);
  const city = safeStr(o.city);
  const postal = safeStr(o.postal);
  return line1.length > 0 && city.length > 0 && postal.length > 0;
}
