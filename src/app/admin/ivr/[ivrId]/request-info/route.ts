// src/app/admin/ivr/[ivrId]/requestinfo/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ ivrId: string }> }) {
  const { ivrId } = await ctx.params;
  const form = await req.formData();
  const message = String(form.get("message") || "").trim();

  const base = req.url.split("/admin/")[0];

  // ✅ forward auth cookies so requireIvrTeamOrAdmin works
  const cookie = req.headers.get("cookie") || "";

  const res = await fetch(`${base}/api/admin/ivr/${encodeURIComponent(ivrId)}/request-info`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({ message }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok) {
    const err = encodeURIComponent(json?.error || "Failed to send request");
    return NextResponse.redirect(urlFromRequest(req, `/admin/ivr/${ivrId}?err=${err}`), 303);
  }

  const flash = encodeURIComponent("Requested additional info from customer.");
  return NextResponse.redirect(urlFromRequest(req, `/admin/ivr/${ivrId}?flash=${flash}`), 303);
}
