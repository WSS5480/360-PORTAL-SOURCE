import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { applyVirtualWarehouseCreditsForPaidInvoice } from "@/lib/virtualWarehouse/applyCreditsForPaidInvoice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Status updates (manual override). For payments, /payment will also set status.
const ALLOWED = new Set(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID", "VOIDED"]);

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

function upper(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function safeRedirect(req: Request, fallbackPath: string) {
  const ref = req.headers.get("referer");
  try {
    return ref ? new URL(ref) : urlFromRequest(req, fallbackPath);
  } catch {
    return urlFromRequest(req, fallbackPath);
  }
}

export async function POST(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const invoiceId = await getInvoiceId(ctx);
  if (!invoiceId) return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const nextStatus = upper(form?.get("status"));

  if (!ALLOWED.has(nextStatus)) {
    return NextResponse.json(
      { ok: false, error: "Invalid status. For payments use the payment route." },
      { status: 400 }
    );
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, order_id, issued_at, voided_at")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  const now = new Date().toISOString();

  const patch: any = { status: nextStatus };

  if ((nextStatus === "ISSUED" || nextStatus === "PARTIALLY_PAID" || nextStatus === "PAID") && !(inv as any).issued_at) {
    patch.issued_at = now;
  }

  if ((nextStatus === "VOID" || nextStatus === "VOIDED") && !(inv as any).voided_at) {
    patch.voided_at = now;
  }

  if (nextStatus === "PAID") patch.paid_at = now;
  if (nextStatus !== "PAID") patch.paid_at = null;

  // If moving away from VOID, you can clear voided_at (optional)
  if (nextStatus === "DRAFT" || nextStatus === "ISSUED") {
    patch.voided_at = null;
  }

  const { error: upErr } = await supabaseAdmin.from("invoices").update(patch).eq("id", invoiceId);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  if (nextStatus === "PAID") {
    try {
      await applyVirtualWarehouseCreditsForPaidInvoice(supabaseAdmin, invoiceId);
    } catch {
      // non-blocking
    }
  }

  const orderId = String((inv as any).order_id || "");
  const back = safeRedirect(req, UUID_RE.test(orderId) ? `/admin/orders/${orderId}` : `/admin/invoices/${invoiceId}`);
  back.searchParams.set("ok", "1");
  back.searchParams.set("msg", "Invoice status updated");

  // Sync order status with invoice status (ISSUED/PAID/PARTIALLY_PAID)
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
              comment: `Invoice status set to ${nextStatus}`,
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
