import { NextResponse } from "next/server";
import { generateInvoicePdfForInvoiceId } from "@/lib/billing/generateInvoicePdfForInvoiceId";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPortalInvoiceRowViewable } from "@/lib/portal/portalRowScope";
import { canViewOrders } from "@/lib/portal/portalRoles";

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

function safeStr(v: any): string {
  return String(v ?? "").trim();
}

function safeBucket(v: any, fallback: string) {
  const s = safeStr(v);
  if (!s || s === "undefined" || s === "null") return fallback;
  return s;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 400 });
  }

  if (!canViewOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const resolved = await Promise.resolve(params as any);
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");

  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("id, account_id, order_id, metadata")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  if (String((invoice as any).account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalInvoiceRowViewable(supabaseAdmin as any, accountId, portalUserId, ctx.currentRole, invoice as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!invoice.order_id) {
    return NextResponse.json({ ok: false, error: "Invoice is missing order_id" }, { status: 500 });
  }

  let meta: any = (invoice as any).metadata ?? {};
  let bucket = safeBucket(meta?.invoice_pdf_bucket, "order-private");
  let path = safeStr(meta?.invoice_pdf_path);

  if (!path) {
    const gen = await generateInvoicePdfForInvoiceId(supabaseAdmin as any, invoiceId);
    if (!gen.ok) {
      return NextResponse.json({ ok: false, error: gen.error || "Could not generate invoice PDF." }, { status: 400 });
    }
    const { data: inv2, error: inv2Err } = await supabaseAdmin
      .from("invoices")
      .select("metadata")
      .eq("id", invoiceId)
      .maybeSingle();
    if (inv2Err) return NextResponse.json({ ok: false, error: inv2Err.message }, { status: 500 });
    meta = (inv2 as any)?.metadata ?? {};
    bucket = safeBucket(meta?.invoice_pdf_bucket, "order-private");
    path = safeStr(meta?.invoice_pdf_path);
    if (!path) {
      return NextResponse.json({ ok: false, error: "Invoice PDF was generated but path is missing." }, { status: 500 });
    }
  }

  const { data: signed, error: sErr } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

  const url = signed?.signedUrl ?? null;
  if (!url) return NextResponse.json({ ok: false, error: "Failed to generate signed URL." }, { status: 500 });

  return NextResponse.json({ ok: true, url }, { status: 200 });
}
