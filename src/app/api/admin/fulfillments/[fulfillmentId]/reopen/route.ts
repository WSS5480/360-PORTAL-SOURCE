import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Strict UUID v1–v5
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

function redirectToFulfillment(req: Request, fulfillmentId: string, qs?: Record<string, string>) {
  const url = urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}`);
  for (const [k, v] of Object.entries(qs ?? {})) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 }); // 303 = POST -> GET
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return redirectToFulfillment(req, fulfillmentId || "invalid", { error: "Invalid fulfillmentId" });
  }

  // Load fulfillment + current order status so we can make a safe decision
  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id, status, closed_at, orders:orders(status)")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return redirectToFulfillment(req, fulfillmentId, { error: fErr.message });
  if (!f) return redirectToFulfillment(req, fulfillmentId, { error: "Fulfillment not found" });

  const fulfillmentStatus = safeUpper((f as any).status);
  const orderId = String((f as any).order_id);
  const orderStatus = safeUpper((f as any)?.orders?.status);

  if (fulfillmentStatus === "OPEN") {
    return redirectToFulfillment(req, fulfillmentId, { ok: "1", msg: "Already OPEN" });
  }

  // IMPORTANT: unique index allows only ONE OPEN fulfillment per order
  const { data: existingOpen, error: openErr } = await sb
    .from("fulfillments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "OPEN")
    .maybeSingle();

  if (openErr) return redirectToFulfillment(req, fulfillmentId, { error: openErr.message });

  if (existingOpen?.id) {
    return redirectToFulfillment(req, fulfillmentId, {
      error: "Cannot reopen: there is already an OPEN fulfillment for this order.",
    });
  }

  const nowIso = new Date().toISOString();
  const actorUserId = String(ctx?.user?.id ?? "");

  // Reopen the fulfillment (do NOT touch metadata; preserve everything)
  const { error: upErr } = await sb
    .from("fulfillments")
    .update({
      status: "OPEN",
      closed_at: null,
    })
    .eq("id", fulfillmentId);

  if (upErr) return redirectToFulfillment(req, fulfillmentId, { error: upErr.message });

  // Only bump the order back to FULFILLING if it was COMPLETED
  try {
    if (orderStatus === "COMPLETED") {
      await sb.from("orders").update({ status: "FULFILLING" }).eq("id", orderId);
    }
  } catch {}

  // Best-effort audit log
  try {
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: actorUserId,
      action: "FULFILLMENT_REOPENED",
      meta: {
        fulfillment_id: fulfillmentId,
        at: nowIso,
        prior_fulfillment_status: fulfillmentStatus,
        prior_order_status: orderStatus || null,
      },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {}

  // Redirect back so the Server Component page re-renders with OPEN status
  return redirectToFulfillment(req, fulfillmentId, { ok: "1", msg: "Reopened" });
}
