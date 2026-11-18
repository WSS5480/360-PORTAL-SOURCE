import { createHash } from "node:crypto";
import type { CallbackPayload, SyncEventType } from "@/lib/integrations/outbound/types";

export function moneyCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function totalsDiffer(left: number, right: number): boolean {
  return Math.abs(moneyCents(left) - moneyCents(right)) > 1;
}

export function payloadHash(payload: CallbackPayload): string {
  const keys = Object.keys(payload).sort();
  const canonical = JSON.stringify(payload, keys);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function callbackPath(eventType: SyncEventType, externalOrderNumber: string, businessKey?: string): string {
  const number = encodeURIComponent(externalOrderNumber);
  if (eventType === "payment") {
    const raw = String(businessKey || "");
    const externalPaymentId = raw.startsWith("payment:") ? raw.slice("payment:".length).replace(/:revision$/, "") : "";
    return `/api/integrations/v1/orders/${number}/payments/${encodeURIComponent(externalPaymentId)}`;
  }
  if (eventType === "payment-link") return `/api/integrations/v1/orders/${number}/payment-link`;
  return `/api/integrations/v1/orders/${number}/${eventType}`;
}
