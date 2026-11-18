import { callbackPath } from "@/lib/integrations/outbound/payload";
import { redactSyncText } from "@/lib/integrations/outbound/redact";
import type { CallbackPayload, DeliveryResult, SyncEventType } from "@/lib/integrations/outbound/types";

export type CallbackRequest = {
  baseUrl: string;
  token: string;
  externalOrderNumber: string;
  eventType: SyncEventType;
  businessKey?: string;
  payload: CallbackPayload;
};

const PUBLIC_FIELDS: Record<SyncEventType, string[]> = {
  invoice: ["invoice_number", "final_total", "invoiced_at"],
  shipment: ["tracking_number", "ship_via", "shipped_at"],
  "payment-link": ["payment_link_url"],
  payment: ["amount", "payment_date", "payment_method", "confirmation_code"],
};

function publicPayload(eventType: SyncEventType, payload: CallbackPayload): CallbackPayload {
  const allowed = new Set(PUBLIC_FIELDS[eventType]);
  const result: CallbackPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!allowed.has(key)) continue;
    if (typeof value === "string" || typeof value === "number") result[key] = value;
  }
  return result;
}

function safeCallbackUrl(baseUrl: string, path: string): URL {
  const root = new URL(baseUrl);
  const loopbackHttp = root.protocol === "http:" && (root.hostname === "127.0.0.1" || root.hostname === "localhost");
  if (root.protocol !== "https:" && !loopbackHttp) throw new Error("callback_url_not_https");
  if (root.username || root.password) throw new Error("callback_url_has_credentials");
  const url = new URL(path, root);
  if (url.origin !== root.origin) throw new Error("callback_url_origin_mismatch");
  return url;
}

export function classifyCallbackStatus(status: number): Pick<DeliveryResult, "retryable" | "terminal"> {
  if (status === 200) return { retryable: false, terminal: false };
  if (status === 409 || status === 422) return { retryable: false, terminal: true };
  if (status === 401 || status === 408 || status === 429 || status >= 500) {
    return { retryable: true, terminal: false };
  }
  return { retryable: false, terminal: true };
}

export async function deliverFulfillmentCallback(
  request: CallbackRequest,
  fetchImpl: typeof fetch,
  timeoutMs = 15_000
): Promise<DeliveryResult> {
  const payload = publicPayload(request.eventType, request.payload);
  if (request.eventType === "payment-link" && !String(payload.payment_link_url || "").startsWith("https://")) {
    return {
      httpStatus: null,
      retryable: false,
      terminal: true,
      excerpt: null,
      error: "payment_link_not_https",
    };
  }
  const path = callbackPath(request.eventType, request.externalOrderNumber, request.businessKey);
  let url: URL;
  try {
    url = safeCallbackUrl(request.baseUrl, path);
  } catch (error) {
    return {
      httpStatus: null,
      retryable: false,
      terminal: true,
      excerpt: null,
      error: error instanceof Error ? error.message : "callback_url_rejected",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: request.eventType === "payment" ? "PUT" : "PATCH",
      headers: {
        authorization: `Bearer ${request.token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "manual",
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    const classified = classifyCallbackStatus(response.status);
    return {
      httpStatus: response.status,
      retryable: classified.retryable,
      terminal: classified.terminal,
      excerpt: redactSyncText(text),
      error: response.ok ? null : `http_${response.status}`,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      httpStatus: null,
      retryable: true,
      terminal: false,
      excerpt: null,
      error: aborted ? "timeout" : "network_error",
    };
  } finally {
    clearTimeout(timer);
  }
}
