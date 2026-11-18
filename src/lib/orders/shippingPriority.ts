import { z } from "zod";

/** Portal and admin order forms share this list. */
export const ShippingPrioritySchema = z.enum([
  "GROUND",
  "THREE_DAY",
  "TWO_DAY",
  "TWO_DAY_AM",
  "OVERNIGHT_AM",
  "FIRST_OVERNIGHT",
  "PRIORITY_OVERNIGHT",
]);

export type ShippingPriority = z.infer<typeof ShippingPrioritySchema>;

export function etaForPriority(p: ShippingPriority): number {
  if (p === "OVERNIGHT_AM" || p === "FIRST_OVERNIGHT" || p === "PRIORITY_OVERNIGHT") return 1;
  if (p === "TWO_DAY" || p === "TWO_DAY_AM") return 2;
  if (p === "THREE_DAY") return 3;
  return 3;
}
