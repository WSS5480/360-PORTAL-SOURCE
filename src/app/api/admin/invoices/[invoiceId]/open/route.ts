import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

function safeObj(v: unknown) {
  return v && typeof v === "object" ? (v as any) : {};
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

export async function GET(_req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const p = ctx?.params;
  const resolved = typeof p?.then === "function" ? await p : p;

  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, metadata")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });

  const meta: any = safeObj((inv as any).metadata);
  const pdfObj: any = meta?.invoice_pdf && typeof meta.invoice_pdf === "object" ? meta.invoice_pdf : null;

  const bucket = safeStr(pdfObj?.bucket || meta?.invoice_pdf_bucket || "order-private");
  const path = safeStr(pdfObj?.path || meta?.invoice_pdf_path || "");

  if (!bucket || !path) {
    return NextResponse.json({ ok: false, error: "Invoice PDF not found on this invoice yet." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to sign invoice URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
