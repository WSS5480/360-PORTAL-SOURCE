// src/app/api/admin/invoices/[invoiceId]/pdf/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { UUID_RE, normalizeParam } from "@/lib/billing/adminInvoicePdf";
import { generateInvoicePdfForInvoiceId } from "@/lib/billing/generateInvoicePdfForInvoiceId";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await params;
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const gen = await generateInvoicePdfForInvoiceId(sb, invoiceId);
  if (!gen.ok) {
    return NextResponse.json({ ok: false, error: gen.error }, { status: 400 });
  }

  return NextResponse.redirect(
    urlFromRequest(req, `/admin/invoices/${encodeURIComponent(invoiceId)}?ok=1&msg=${encodeURIComponent(
        "Invoice PDF generated."
      )}`),
    { status: 303 }
  );
}
