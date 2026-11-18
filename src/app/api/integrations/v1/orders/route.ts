import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { authenticatePartnerRequest } from "@/lib/integrations/partnerAuth";
import {
  CreatePartnerOrderSchema,
  normalizePartnerOrder,
  partnerOrderRequestHash,
} from "@/lib/integrations/partnerOrderContract";
import { countRecentPartnerRequests, submitPartnerOrder } from "@/lib/integrations/submitPartnerOrder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 60;

function requestId(): string {
  return crypto.randomUUID();
}

function respond(status: number, body: Record<string, unknown>, id: string) {
  return NextResponse.json(
    { ...body, request_id: id },
    {
      status,
      headers: {
        "X-Request-Id": id,
        "Cache-Control": "no-store",
      },
    }
  );
}

async function recordRequest(args: {
  id: string;
  partnerId: string | null;
  method: "GET" | "POST";
  path: string;
  httpStatus: number;
  errorCode?: string | null;
  requestHash?: string | null;
  externalOrderNumber?: string | null;
}) {
  try {
    const sb = createSupabaseAdminClient();
    await sb.from("integration_inbound_requests").insert({
      request_id: args.id,
      partner_id: args.partnerId,
      method: args.method,
      path: args.path,
      http_status: args.httpStatus,
      error_code: args.errorCode ?? null,
      request_hash: args.requestHash ?? null,
      external_order_number: args.externalOrderNumber ?? null,
    });
  } catch {
    // Activity logging must not change the API result or include request secrets.
  }
}

export async function POST(req: Request) {
  const id = requestId();
  const path = "/api/integrations/v1/orders";
  let partnerId: string | null = null;
  let errorCode: string | null = null;
  let httpStatus = 500;
  let requestHash: string | null = null;
  let externalOrderNumber: string | null = null;

  try {
    const sb = createSupabaseAdminClient();
    const auth = await authenticatePartnerRequest(sb as any, req.headers.get("authorization"), "orders:write");
    if (!auth.ok) {
      httpStatus = auth.status;
      errorCode = auth.errorCode;
      return respond(auth.status, { ok: false, error: auth.error }, id);
    }
    partnerId = auth.partner.partnerId;

    const since = new Date(Date.now() - 60_000).toISOString();
    const recent = await countRecentPartnerRequests(sb as any, partnerId, since);
    if (recent == null) {
      httpStatus = 503;
      errorCode = "server_error";
      return respond(503, { ok: false, error: "The order service is temporarily unavailable." }, id);
    }
    if (recent >= RATE_LIMIT_PER_MINUTE) {
      httpStatus = 429;
      errorCode = "rate_limited";
      return respond(429, { ok: false, error: "Rate limit exceeded. Retry after a short wait." }, id);
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      httpStatus = 422;
      errorCode = "validation";
      return respond(422, { ok: false, error: "Request body must be a JSON object." }, id);
    }

    const parsed = CreatePartnerOrderSchema.safeParse(payload);
    if (!parsed.success) {
      httpStatus = 422;
      errorCode = "validation";
      return respond(422, { ok: false, error: "The order payload is invalid.", details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })) }, id);
    }

    const order = normalizePartnerOrder(parsed.data);
    externalOrderNumber = order.partner_order_number;
    requestHash = partnerOrderRequestHash(order);

    const idempotencyHeader = (req.headers.get("idempotency-key") || "").trim();
    if (idempotencyHeader && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(idempotencyHeader)) {
      httpStatus = 422;
      errorCode = "validation";
      return respond(422, { ok: false, error: "Idempotency-Key is invalid." }, id);
    }
    const idempotencyKey = idempotencyHeader || order.partner_order_number;

    const result = await submitPartnerOrder(sb as any, {
      partnerId,
      idempotencyKey,
      order,
    });
    httpStatus = result.status;
    if (!result.ok) {
      errorCode = result.errorCode;
      return respond(result.status, {
        ok: false,
        error: result.error,
        error_code: result.errorCode,
        ...(result.details ? { details: result.details } : {}),
      }, id);
    }

    errorCode = null;
    return respond(200, {
      ok: true,
      idempotent_replay: result.idempotentReplay,
      order: result.order,
    }, id);
  } catch {
    httpStatus = 500;
    errorCode = "server_error";
    return respond(500, { ok: false, error: "The order could not be saved." }, id);
  } finally {
    await recordRequest({
      id,
      partnerId,
      method: "POST",
      path,
      httpStatus,
      errorCode,
      requestHash,
      externalOrderNumber,
    });
  }
}
