import { formatFedexServiceLabel } from "@/lib/fedex/shippingPriorityMap";

export type RateQuote = {
  serviceType: string;
  totalNetCharge: number;
};

/** Strip FEDEX_ prefix / hyphens so PRIORITY_OVERNIGHT matches FEDEX_PRIORITY_OVERNIGHT. */
export function normalizeFedexServiceType(serviceType: string): string {
  return serviceType.trim().toUpperCase().replace(/-/g, "_").replace(/^FEDEX_/, "");
}

export function fedexServiceTypesMatch(a: string, b: string): boolean {
  const na = normalizeFedexServiceType(a);
  const nb = normalizeFedexServiceType(b);
  return Boolean(na && nb && na === nb);
}

export function findPreferredQuote(
  quotes: RateQuote[],
  preferredService: string | null | undefined
): RateQuote | null {
  const preferred = String(preferredService ?? "").trim();
  if (!preferred) return null;
  return quotes.find((q) => fedexServiceTypesMatch(q.serviceType, preferred)) ?? null;
}

export function formatAvailableQuotes(quotes: RateQuote[]): string {
  return quotes
    .map((q) => `${formatFedexServiceLabel(q.serviceType)} ($${Number(q.totalNetCharge).toFixed(2)})`)
    .join(", ");
}

export function preferredServiceUnavailableMessage(
  preferredService: string,
  quotes: RateQuote[],
  opts?: { saturdayDelivery?: boolean }
): string {
  const label = formatFedexServiceLabel(preferredService);
  const available = formatAvailableQuotes(quotes);
  const availableSuffix = available ? ` Available rates: ${available}.` : "";
  if (opts?.saturdayDelivery) {
    return `Saturday delivery is not available for ${preferredService} on this ship date. Choose another overnight or 2-day service, or uncheck Saturday delivery.${availableSuffix}`;
  }
  return `${label} is not available for this address and package.${availableSuffix} The selected service was not changed.`;
}

function asFiniteNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  if (v && typeof v === "object" && "amount" in (v as object)) {
    return asFiniteNumber((v as { amount?: unknown }).amount);
  }
  return NaN;
}

/** Prefer ACCOUNT rates when FedEx returns both LIST and ACCOUNT. */
export function pickRatedShipmentDetail(rated: unknown[]): unknown | null {
  if (!Array.isArray(rated) || rated.length === 0) return null;
  const account = rated.find((r) => /ACCOUNT/i.test(String((r as { rateType?: unknown })?.rateType || "")));
  return account ?? rated[0];
}

export function parseRatedNetCharge(rated: unknown): number {
  if (!rated || typeof rated !== "object") return NaN;
  const row = rated as {
    totalNetCharge?: unknown;
    totalNetFedExCharge?: unknown;
    shipmentRateDetail?: { totalNetCharge?: unknown; totalNetFedExCharge?: unknown };
  };
  const candidates = [
    row.totalNetCharge,
    row.totalNetFedExCharge,
    row.shipmentRateDetail?.totalNetCharge,
    row.shipmentRateDetail?.totalNetFedExCharge,
  ];
  for (const c of candidates) {
    const n = asFiniteNumber(c);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

export function parseRateReplyDetails(details: unknown[]): RateQuote[] {
  const quotes: RateQuote[] = [];
  if (!Array.isArray(details)) return quotes;

  for (const d of details) {
    const row = d as { serviceType?: unknown; ratedShipmentDetails?: unknown };
    const serviceType = String(row?.serviceType || "").trim();
    const rated = Array.isArray(row?.ratedShipmentDetails) ? row.ratedShipmentDetails : [];
    const chosen = pickRatedShipmentDetail(rated);
    const total = parseRatedNetCharge(chosen);
    if (serviceType && Number.isFinite(total)) {
      quotes.push({ serviceType, totalNetCharge: total });
    }
  }
  return quotes;
}
