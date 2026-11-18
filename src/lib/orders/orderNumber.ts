export function makeOrderNumber(now = new Date(), randomHex?: string): string {
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const rand = (randomHex ?? Math.random().toString(16).slice(2, 8)).toUpperCase();
  return `ORD-${y}${m}${day}-${rand}`;
}
