// src/app/api/admin/invoices/[invoiceId]/issue/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { schedulePartnerFulfillmentSync } from "@/lib/integrations/outbound/schedulePartnerFulfillmentSync";

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
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { invoiceId } = await Promise.resolve(params);
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const { data: inv, error: invErr } = await sb
    .from("invoices")
    .select("id, order_id, status, issued_at, voided_at")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  if (inv.voided_at || safeUpper(inv.status) === "VOID") {
    return NextResponse.json({ ok: false, error: "Invoice is voided" }, { status: 400 });
  }

  if (inv.issued_at || safeUpper(inv.status) !== "DRAFT") {
    return NextResponse.redirect(urlFromRequest(req, `/admin/invoices/${invoiceId}`));
  }

  const now = new Date().toISOString();

  const { error: upErr } = await sb
    .from("invoices")
    .update({ issued_at: now, status: "ISSUED" })
    .eq("id", invoiceId);

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // Best-effort audit (if your order_audit_log table exists)
  try {
    await sb.from("order_audit_log").insert({
      order_id: String(inv.order_id),
      actor_user_id: String(ctx?.user?.id ?? ""),
      action: "INVOICE_ISSUED",
      meta: { invoice_id: invoiceId, issued_at: now },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // ignore
  }

  await schedulePartnerFulfillmentSync(sb, String(inv.order_id || ""));

  return NextResponse.redirect(urlFromRequest(req, `/admin/invoices/${invoiceId}`));
}
