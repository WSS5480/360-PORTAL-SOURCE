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
  { params }: { params: Promise<{ invoiceId: string; submissionId: string }> | { invoiceId: string; submissionId: string } }
) {
  const authCtx = await requireOrdersStaffOrAdmin();
  const verifiedByUserId = String((authCtx as any)?.user?.id ?? "").trim() || null;

  const resolved = await Promise.resolve(params as any);
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  const submissionId = normalizeParam(resolved?.submissionId ?? "");

  if (!UUID_RE.test(invoiceId) || !UUID_RE.test(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId or submissionId" }, { status: 400 });
  }

  const { data: submission, error: subErr } = await supabaseAdmin
    .from("invoice_payment_submissions")
    .select("id, invoice_id, amount, status, reference, method")
    .eq("id", submissionId)
    .maybeSingle();

  if (subErr) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
  if (!submission) return NextResponse.json({ ok: false, error: "Submission not found" }, { status: 404 });
  if (String((submission as any).invoice_id) !== String(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Submission does not match invoice" }, { status: 400 });
  }
  if (String((submission as any).method ?? "").toUpperCase() !== "WIRE") {
    return NextResponse.json({ ok: false, error: "Only wire submissions can be verified here." }, { status: 400 });
  }

  const statusUpper = String((submission as any).status ?? "").toUpperCase();
  if (statusUpper !== "PENDING" && statusUpper !== "WIRE_PENDING") {
    return NextResponse.json({ ok: false, error: "Submission already processed" }, { status: 400 });
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, order_id, status, total, amount_paid")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  const invStatusUpper = String((inv as any).status ?? "").toUpperCase();
  if (invStatusUpper === "VOID" || invStatusUpper === "VOIDED") {
    return NextResponse.json({ ok: false, error: "Cannot apply payment to a voided invoice." }, { status: 400 });
  }

  const amount = safeNum((submission as any).amount);
  const note = `wire:${String((submission as any).reference ?? submissionId)}`;

  await supabaseAdmin.from("invoice_payments").insert({
    invoice_id: invoiceId,
    amount,
    note,
    created_by_user_id: null,
  });

  const { data: payRows } = await supabaseAdmin
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", invoiceId);
  const nextPaid = (payRows ?? []).reduce((sum: number, r: any) => sum + safeNum(r?.amount), 0);
  const nextStatus = computeStatus(safeNum((inv as any).total), nextPaid);

  await supabaseAdmin.from("invoices").update({
    amount_paid: nextPaid,
    status: nextStatus,
    paid_at: nextStatus === "PAID" ? new Date().toISOString() : null,
  }).eq("id", invoiceId);

  if (nextStatus === "PAID") {
    try {
      await applyVirtualWarehouseCreditsForPaidInvoice(supabaseAdmin, invoiceId);
    } catch {
      // non-blocking
    }
  }

  await regenerateInvoicePdfAfterPayment(supabaseAdmin, invoiceId);

  await supabaseAdmin
    .from("invoice_payment_submissions")
    .update({ status: "VERIFIED", verified_at: new Date().toISOString(), verified_by_user_id: verifiedByUserId })
    .eq("id", submissionId);

  const orderId = String((inv as any).order_id || "");
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
              comment: `Wire payment approved (${nextStatus})`,
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

  const back = safeRedirect(req, `/admin/invoices/${invoiceId}`);
  back.searchParams.set("ok", "1");
  back.searchParams.set("msg", "Wire verified and payment applied");
  return NextResponse.redirect(back, { status: 303 });
}
