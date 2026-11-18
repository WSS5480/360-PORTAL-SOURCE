import { createHash, timingSafeEqual } from "node:crypto";

export function authorizeOutboundWorker(authorization: string | null, secret: string | undefined): boolean {
  const expected = secret?.trim() ?? "";
  const presented = authorization?.trim() ?? "";
  if (!expected || !presented.startsWith("Bearer ")) return false;
  const token = presented.slice("Bearer ".length).trim();
  const left = createHash("sha256").update(token, "utf8").digest();
  const right = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(left, right);
}

export function outboundDeliveryEnabled(flag: string | undefined): boolean {
  return flag === "true";
}
