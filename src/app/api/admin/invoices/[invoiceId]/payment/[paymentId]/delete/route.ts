import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { regenerateInvoicePdfAfterPayment } from "@/lib/billing/adminInvoicePdf";
import { applyVirtualWarehouseCreditsForPaidInvoice } from "@/lib/virtualWarehouse/applyCreditsForPaidInvoice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function safeRedirect(req: Request, fallbackPath: string) {
  const ref = req.headers.get("referer");
  try {
    return ref ? new URL(ref) : urlFromRequest(req, fallbackPath);
  } catch {
    return urlFromRequest(req, fallbackPath);
  }
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeStatus(total: number, amountPaid: number): "ISSUED" | "PARTIALLY_PAID" | "PAID" {
  const t = Math.max(0, total);
  const p = Math.max(0, amountPaid);
  if (t <= 0) return "PAID";
  if (p <= 0) return "ISSUED";
  if (p + 1e-9 >= t) return "PAID";
  return "PARTIALLY_PAID";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string; paymentId: string }> | { invoiceId: string; paymentId: string } }
) {
  await requireOrdersStaffOrAdmin();

  const resolved = await Promise.resolve(params as any);
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  const paymentId = normalizeParam(resolved?.paymentId ?? "");

  if (!UUID_RE.test(invoiceId) || !UUID_RE.test(paymentId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId or paymentId" }, { status: 400 });
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, order_id, total")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  // Delete payment row (scoped to invoice)
  const { error: delErr } = await supabaseAdmin
    .from("invoice_payments")
    .delete()
    .eq("id", paymentId)
    .eq("invoice_id", invoiceId);

  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

  // Recompute amount_paid from remaining payments
  const { data: payRows, error: payErr } = await supabaseAdmin
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  if (payErr) return NextResponse.json({ ok: false, error: payErr.message }, { status: 500 });

  const nextPaid = (payRows ?? []).reduce((sum: number, r: any) => sum + safeNum(r?.amount), 0);
  const nextStatus = computeStatus(safeNum((inv as any).total), nextPaid);

  const patch: any = {
    amount_paid: nextPaid,
    status: nextStatus,
  };

  if (nextStatus === "PAID") patch.paid_at = new Date().toISOString();
  else patch.paid_at = null;

  const { error: upErr } = await supabaseAdmin.from("invoices").update(patch).eq("id", invoiceId);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  if (nextStatus === "PAID") {
    try {
      await applyVirtualWarehouseCreditsForPaidInvoice(supabaseAdmin, invoiceId);
    } catch {
      // non-blocking
    }
  }

  await regenerateInvoicePdfAfterPayment(supabaseAdmin, invoiceId);

  const orderId = String((inv as any).order_id || "");

  // Sync order status with invoice status (PAID / PARTIALLY_PAID / ISSUED)
  if (UUID_RE.test(orderId)) {
    const map: Record<string, string> = {
      ISSUED: "INVOICED",
      PAID: "PAID",
      PARTIALLY_PAID: "PARTIALLY_PAID",
    };
    const nextOrderStatus = map[nextStatus];
    if (nextOrderStatus) {
      try {
        const { data: ord } = await supabaseAdmin.from("orders").select("id, status").eq("id", orderId).maybeSingle();
        const fromStatus = String((ord as any)?.status || "");
        if (fromStatus.toUpperCase() !== nextOrderStatus) {
          await supabaseAdmin.from("orders").update({ status: nextOrderStatus }).eq("id", orderId);
          try {
            await supabaseAdmin.from("order_status_events").insert({
              order_id: orderId,
              from_status: fromStatus,
              to_status: nextOrderStatus,
              changed_by_user_id: null,
              comment: "Invoice payment removed",
            });
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const back = safeRedirect(req, UUID_RE.test(orderId) ? `/admin/orders/${orderId}` : `/admin/invoices/${invoiceId}`);
  back.searchParams.set("ok", "1");
  back.searchParams.set("msg", "Payment removed");

  return NextResponse.redirect(back, { status: 303 });
}
