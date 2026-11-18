// src/app/api/admin/orders/[orderId]/fulfill/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  // Load order
  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const s = safeUpper(order.status);
  if (s !== "LOCKED") {
    return NextResponse.json(
      { ok: false, error: "Order must be LOCKED to start fulfillment." },
      { status: 400 }
    );
  }

  // Update status -> FULFILLING
  const { error: upErr } = await sb
    .from("orders")
    .update({ status: "FULFILLING", updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // Best-effort audit
  try {
    const actorUserId = ctx?.user?.id ?? null;
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: String(actorUserId ?? ""),
      action: "ORDER_FULFILLING_STARTED",
      meta: { from: "LOCKED", to: "FULFILLING" },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // ignore
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/orders/${encodeURIComponent(orderId)}`));
}
