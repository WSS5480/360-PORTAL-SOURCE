// src/app/api/admin/orders/[orderId]/unlock/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersUnlocker } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const ctx = await requireOrdersUnlocker();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const status = String(order.status || "").toUpperCase();
  if (status !== "LOCKED") {
    return NextResponse.json(
      { ok: false, error: `Only LOCKED orders can be unlocked (current: ${order.status}).` },
      { status: 400 }
    );
  }

  const actorUserId = String((ctx as any)?.user?.id ?? "");

  const { error: updErr } = await sb
    .from("orders")
    .update({
      status: "CONFIRMED",
      locked_at: null,
    })
    .eq("id", orderId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  // Status history (best-effort)
  try {
    await sb.from("order_status_events").insert({
      order_id: orderId,
      from_status: "LOCKED",
      to_status: "CONFIRMED",
      changed_by_user_id: actorUserId || null,
      comment: "Unlocked by staff",
    });
  } catch {
    // ignore
  }

  // Best-effort audit
  try {
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: actorUserId,
      action: "ORDER_UNLOCKED",
      meta: { from_status: "LOCKED", to_status: "CONFIRMED" },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // ignore
  }

  const back = urlFromRequest(req, `/admin/orders/${encodeURIComponent(orderId)}`);
  return NextResponse.redirect(back);
}
