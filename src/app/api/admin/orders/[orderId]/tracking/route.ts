// src/app/api/admin/orders/[orderId]/tracking/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanStr(v: unknown): string {
  return String(v ?? "").trim();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const form = await req.formData();
  const carrier = cleanStr(form.get("carrier"));
  const tracking_number = cleanStr(form.get("tracking_number"));
  const label_url = cleanStr(form.get("label_url"));

  const { data: invoice, error: invErr } = await sb
    .from("invoices")
    .select("id, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice?.id) {
    return NextResponse.json({ ok: false, error: "Invoice not found. Create invoice first." }, { status: 400 });
  }

  const meta = (invoice.metadata ?? {}) as any;
  const nextMeta = {
    ...meta,
    shipping: {
      ...(meta.shipping ?? {}),
      carrier: carrier || null,
      tracking_number: tracking_number || null,
      label_url: label_url || null,
      updated_at: new Date().toISOString(),
    },
  };

  const { error: upErr } = await sb.from("invoices").update({ metadata: nextMeta }).eq("id", invoice.id);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  return NextResponse.redirect(urlFromRequest(req, `/admin/orders/${orderId}`));
}
