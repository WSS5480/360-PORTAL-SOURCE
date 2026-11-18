// src/app/api/admin/orders/[orderId]/invoice/url/route.ts
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

export async function GET(_req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const orderId = await getOrderId(ctx);
  if (!orderId) return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "No invoice found for this order." }, { status: 404 });

  const meta: any = inv.metadata && typeof inv.metadata === "object" ? inv.metadata : {};
  const pdf = meta?.invoice_pdf ?? null;

  const bucket = String(pdf?.bucket ?? "").trim();
  const path = String(pdf?.path ?? "").trim();

  if (!bucket || !path) {
    return NextResponse.json({ ok: false, error: "Invoice PDF not found on this invoice yet." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ ok: false, error: error?.message || "Failed to sign invoice URL" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: data.signedUrl });
}
