import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const rawId =
    (await Promise.resolve(ctx?.params as any))?.fulfillmentId ?? "";
  const fulfillmentId = String(rawId).split("?")[0].split("#")[0].trim();

  // Call your existing JSON endpoint and redirect to its signed URL
  const url = urlFromRequest(req, `/api/admin/fulfillments/${encodeURIComponent(fulfillmentId)}/dropship/po/url`);

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok || !json?.url) {
    return NextResponse.json(
      { ok: false, error: json?.error || `Failed (${res.status})` },
      { status: 400 }
    );
  }

  return NextResponse.redirect(String(json.url), { status: 302 });
}
