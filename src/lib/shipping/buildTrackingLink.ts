/** Carrier-aware public tracking URLs for portal / admin (FedEx, UPS, USPS). */
export function buildTrackingLink(carrierRaw: string, trackingRaw: string): string | null {
  const carrier = String(carrierRaw ?? "").trim().toUpperCase();
  const tracking = String(trackingRaw ?? "").trim();
  if (!tracking) return null;
  if (carrier.includes("FEDEX")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}`;
  if (carrier.includes("UPS")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}`;
  if (carrier.includes("USPS")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tracking)}`;
  return null;
}

export function safeHttpUrl(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "";
}
