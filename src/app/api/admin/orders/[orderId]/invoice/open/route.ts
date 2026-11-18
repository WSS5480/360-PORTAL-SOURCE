import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normId(v: any) {
  const s = String(v || "").trim();
  return UUID_RE.test(s) ? s : "";
}

async function getOrderId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const resolved = typeof p?.then === "function" ? await p : p;
  return normId(resolved?.orderId);
}

function safeObj(v: any) {
  return v && typeof v === "object" ? v : {};
}

function redirectBack(req: Request, orderId: string, errMsg: string, status = 303) {
  // Send user back to the order detail page with a message (so the browser never shows JSON)
  const base = new URL(req.url);
  base.pathname = `/admin/orders/${encodeURIComponent(orderId || "")}`;
  base.searchParams.set("err", errMsg);
  return NextResponse.redirect(base, { status });
}

export async function GET(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const orderId = await getOrderId(ctx);
  if (!orderId) {
    // We don't know where to go reliably, so bounce to orders list
    const u = new URL(req.url);
    u.pathname = "/admin/orders";
    u.searchParams.set("err", "Invalid orderId");
    return NextResponse.redirect(u, { status: 303 });
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  if (invErr) return redirectBack(req, orderId, `Invoice lookup failed: ${invErr.message}`);
  if (!inv) return redirectBack(req, orderId, "No invoice found for this order.");

  const meta: any = safeObj((inv as any).metadata);

  // Prefer new shape: metadata.invoice_pdf { bucket, path }
  const pdfObj: any = meta?.invoice_pdf && typeof meta.invoice_pdf === "object" ? meta.invoice_pdf : null;

  // Your PDF generator uses bucket "order-private"
  const bucket = String(pdfObj?.bucket || meta?.invoice_pdf_bucket || "order-private").trim();
  const path = String(pdfObj?.path || meta?.invoice_pdf_path || "").trim();

  if (!bucket || !path) {
    return redirectBack(req, orderId, "Invoice PDF not generated yet. Click Regenerate Invoice PDF.");
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);

  if (error || !data?.signedUrl) {
    return redirectBack(req, orderId, error?.message || "Failed to sign invoice URL");
  }

  // ✅ Success: redirect to the signed URL (browser will open the PDF)
  const res = NextResponse.redirect(data.signedUrl, { status: 302 });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
