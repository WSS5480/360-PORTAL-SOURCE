/**
 * Maps order shipping_priority (customer choice) to FedEx Rate API serviceType.
 * FedEx service types: FEDEX_GROUND, FEDEX_EXPRESS_SAVER, FEDEX_2_DAY, FEDEX_2_DAY_AM,
 * STANDARD_OVERNIGHT, PRIORITY_OVERNIGHT, FIRST_OVERNIGHT
 */
export const ORDER_PRIORITY_TO_FEDEX: Record<string, string> = {
  GROUND: "FEDEX_GROUND",
  THREE_DAY: "FEDEX_EXPRESS_SAVER",
  TWO_DAY: "FEDEX_2_DAY",
  TWO_DAY_AM: "FEDEX_2_DAY_AM",
  // Overnight options
  OVERNIGHT_AM: "STANDARD_OVERNIGHT", // FedEx Standard Overnight (AM delivery)
  FIRST_OVERNIGHT: "FIRST_OVERNIGHT",
  PRIORITY_OVERNIGHT: "PRIORITY_OVERNIGHT",
};

export function orderPriorityToFedexService(priority: string | null | undefined): string | null {
  if (!priority || typeof priority !== "string") return null;
  const upper = priority.trim().toUpperCase();
  return ORDER_PRIORITY_TO_FEDEX[upper] ?? null;
}

/** FedEx service options for admin dropdown (value = API serviceType) */
export const FEDEX_SERVICE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "FEDEX_GROUND", label: "FedEx Ground" },
  { value: "FEDEX_EXPRESS_SAVER", label: "FedEx Express Saver (3 Day)" },
  { value: "FEDEX_2_DAY", label: "FedEx 2Day" },
  { value: "FEDEX_2_DAY_AM", label: "FedEx 2Day AM" },
  { value: "STANDARD_OVERNIGHT", label: "FedEx Standard Overnight" },
  { value: "PRIORITY_OVERNIGHT", label: "FedEx Priority Overnight" },
  { value: "FIRST_OVERNIGHT", label: "FedEx First Overnight" },
];

/** Express services that accept FedEx SATURDAY_DELIVERY (not Ground). */
export const FEDEX_SATURDAY_DELIVERY_SERVICE_TYPES = new Set([
  "FEDEX_EXPRESS_SAVER",
  "FEDEX_2_DAY",
  "FEDEX_2_DAY_AM",
  "STANDARD_OVERNIGHT",
  "PRIORITY_OVERNIGHT",
  "FIRST_OVERNIGHT",
]);

export function serviceSupportsSaturdayDelivery(serviceType: string | null | undefined): boolean {
  if (!serviceType || typeof serviceType !== "string") return true;
  const upper = serviceType.trim().toUpperCase();
  if (!upper) return true;
  return FEDEX_SATURDAY_DELIVERY_SERVICE_TYPES.has(upper);
}

export function formatFedexServiceLabel(
  serviceType: string | null | undefined,
  opts?: { saturdayDelivery?: boolean }
): string {
  if (!serviceType || typeof serviceType !== "string") return "—";
  const s = serviceType.trim();
  const opt = FEDEX_SERVICE_OPTIONS.find((o) => o.value.toUpperCase() === s.toUpperCase());
  const base = opt?.label ?? s;
  if (opts?.saturdayDelivery) return `${base} + Saturday delivery`;
  return base;
}
