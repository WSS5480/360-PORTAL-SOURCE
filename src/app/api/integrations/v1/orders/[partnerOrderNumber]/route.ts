import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { authenticatePartnerRequest } from "@/lib/integrations/partnerAuth";
import { countRecentPartnerRequests, getPartnerOrder } from "@/lib/integrations/submitPartnerOrder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 60;
const ORDER_NUMBER_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ partnerOrderNumber: string }> }
) {
  const id = crypto.randomUUID();
  const resolved = await params;
  let partnerOrderNumber = resolved?.partnerOrderNumber ?? "";
  try {
    partnerOrderNumber = decodeURIComponent(partnerOrderNumber);
  } catch {
    partnerOrderNumber = "";
  }
  partnerOrderNumber = partnerOrderNumber.split("?")[0]?.trim() ?? "";
  const path = `/api/integrations/v1/orders/${partnerOrderNumber}`;
  let partnerId: string | null = null;
  let httpStatus = 500;
  let errorCode: string | null = "server_error";

  try {
    const sb = createSupabaseAdminClient();
    const auth = await authenticatePartnerRequest(sb as any, req.headers.get("authorization"), "orders:read");
    if (!auth.ok) {
      httpStatus = auth.status;
      errorCode = auth.errorCode;
      return respond(auth.status, { ok: false, error: auth.error }, id);
    }
    partnerId = auth.partner.partnerId;

    if (!ORDER_NUMBER_RE.test(partnerOrderNumber)) {
      httpStatus = 404;
      errorCode = "not_found";
      return respond(404, { ok: false, error: "Order not found." }, id);
    }

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

    const result = await getPartnerOrder(sb as any, partnerId, partnerOrderNumber);
    httpStatus = result.status;
    if (!result.ok) {
      errorCode = result.errorCode;
      return respond(result.status, { ok: false, error: result.error }, id);
    }
    errorCode = null;
    return respond(200, { ok: true, idempotent_replay: false, order: result.order }, id);
  } catch {
    httpStatus = 500;
    errorCode = "server_error";
    return respond(500, { ok: false, error: "The order could not be loaded." }, id);
  } finally {
    try {
      const sb = createSupabaseAdminClient();
      await sb.from("integration_inbound_requests").insert({
        request_id: id,
        partner_id: partnerId,
        method: "GET",
        path: path.slice(0, 300),
        http_status: httpStatus,
        error_code: errorCode,
        external_order_number: ORDER_NUMBER_RE.test(partnerOrderNumber) ? partnerOrderNumber : null,
      });
    } catch {
      // Logging must not echo credentials or change the response.
    }
  }
}
