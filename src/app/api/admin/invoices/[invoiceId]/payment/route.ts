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

async function getInvoiceId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const resolved = typeof p?.then === "function" ? await p : p;
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  return UUID_RE.test(invoiceId) ? invoiceId : "";
}

function safeNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function safeRedirect(req: Request, fallbackPath: string) {
  const ref = req.headers.get("referer");
  try {
    return ref ? new URL(ref) : urlFromRequest(req, fallbackPath);
  } catch {
    return urlFromRequest(req, fallbackPath);
  }
}

function computeStatus(total: number, amountPaid: number): "ISSUED" | "PARTIALLY_PAID" | "PAID" {
  const t = Math.max(0, total);
  const p = Math.max(0, amountPaid);

  // If total is 0, treat as paid.
  if (t <= 0) return "PAID";
  if (p <= 0) return "ISSUED";
  if (p + 1e-9 >= t) return "PAID";
  return "PARTIALLY_PAID";
}

export async function POST(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const invoiceId = await getInvoiceId(ctx);
  if (!invoiceId) return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });

  const form = await req.formData().catch(() => null);

  // Accept either:
  // - amount_paid: absolute value to set
  // - add_payment: amount to add
  const amountPaidRaw = form?.get("amount_paid");
  const addPaymentRaw = form?.get("add_payment");

  const setAmount = amountPaidRaw != null && String(amountPaidRaw).trim() !== "";
  const addAmount = addPaymentRaw != null && String(addPaymentRaw).trim() !== "";

  if (!setAmount && !addAmount) {
    return NextResponse.json({ ok: false, error: "Provide amount_paid or add_payment." }, { status: 400 });
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, order_id, status, issued_at, voided_at, total, amount_paid")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  const statusUpper = String((inv as any).status ?? "").toUpperCase();
  if (statusUpper === "VOID" || statusUpper === "VOIDED" || (inv as any).voided_at) {
    return NextResponse.json({ ok: false, error: "Cannot apply payment to a voided invoice." }, { status: 400 });
  }

  const total = safeNum((inv as any).total);
  const priorPaid = safeNum((inv as any).amount_paid);

  let nextPaid = priorPaid;

  if (setAmount) {
    nextPaid = safeNum(amountPaidRaw);
  } else if (addAmount) {
    nextPaid = priorPaid + safeNum(addPaymentRaw);
  }

  if (nextPaid < 0) nextPaid = 0;

  const now = new Date().toISOString();
  const nextStatus = computeStatus(total, nextPaid);

  const patch: any = {
    amount_paid: nextPaid,
    status: nextStatus,
  };

  // First payment or issuing should set issued_at if missing
  if (!(inv as any).issued_at && (nextStatus === "PARTIALLY_PAID" || nextStatus === "PAID" || nextStatus === "ISSUED")) {
    patch.issued_at = now;
  }

  // paid_at rules:
  // - Set when fully paid
  // - Clear when not fully paid
  if (nextStatus === "PAID") patch.paid_at = now;
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

  // Record payment history when adding a payment amount
  if (addAmount && safeNum(addPaymentRaw) > 0) {
    try {
      await supabaseAdmin.from("invoice_payments").insert({
        invoice_id: invoiceId,
        amount: safeNum(addPaymentRaw),
        note: form?.get("note") ? String(form.get("note")) : null,
        created_by_user_id: (ctx as any)?.user?.id ?? null,
      });
    } catch {
      // ignore
    }
  }

  const orderId = String((inv as any).order_id || "");
  const back = safeRedirect(req, UUID_RE.test(orderId) ? `/admin/orders/${orderId}` : `/admin/invoices/${invoiceId}`);
  back.searchParams.set("ok", "1");
  back.searchParams.set("msg", "Payment updated");

  // Sync order status with invoice status (PAID / PARTIALLY_PAID)
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
          const { error: ordErr } = await supabaseAdmin.from("orders").update({ status: nextOrderStatus }).eq("id", orderId);
          if (ordErr) throw new Error(ordErr.message);
          try {
            await supabaseAdmin.from("order_status_events").insert({
              order_id: orderId,
              from_status: fromStatus,
              to_status: nextOrderStatus,
              changed_by_user_id: null,
              comment: `Invoice payment updated to ${nextStatus}`,
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

  return NextResponse.redirect(back, { status: 303 });
}
