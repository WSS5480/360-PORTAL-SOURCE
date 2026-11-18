import { NextResponse } from "next/server";
import { resolveInternalVendorAccountId } from "@/lib/admin/internalVendorAccount";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return UUID_RE.test(s) ? s : "";
}

async function getFulfillmentIdFromCtx(ctx: any): Promise<string> {
  const maybeParams = ctx?.params;
  const resolved = maybeParams && typeof maybeParams?.then === "function" ? await maybeParams : maybeParams;
  return normalizeUuid(resolved?.fulfillmentId);
}

export async function GET(_: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentIdFromCtx(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });

  const { data: f, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select(
      [
        "id",
        "order_id",
        "status",
        "fulfillment_source",
        "dropship_vendor_id",
        "po_number",
        "po_sent_at",
        "po_sent_to",
        "po_pdf_bucket",
        "po_pdf_path",
        "dropship_status",
        "dropship_packing_slip_number",
        "dropship_tracking_number",
        "dropship_carrier",
        "dropship_ship_date",
        "dropship_notes",
        "metadata",
      ].join(",")
    )
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr || !f) {
    return NextResponse.json({ ok: false, error: fErr?.message || "Fulfillment not found" }, { status: 404 });
  }

  const orderId = normalizeUuid((f as any).order_id);

  const { data: orderRow } = await supabaseAdmin.from("orders").select("id, account_id").eq("id", orderId).maybeSingle();
  const orderAccountId = orderRow?.account_id ? String(orderRow.account_id) : "";
  const vendorDirectory = resolveInternalVendorAccountId();
  const vendorAccountIds = Array.from(
    new Set([orderAccountId, vendorDirectory.ok ? vendorDirectory.accountId : ""].filter(Boolean)),
  );
  const { data: vendors } =
    vendorAccountIds.length > 0
      ? await supabaseAdmin
          .from("dropship_vendors")
          .select("id, account_id, name, email, disabled_at, created_at")
          .in("account_id", vendorAccountIds as any)
          .is("disabled_at", null)
          .order("created_at", { ascending: false })
          .limit(500)
      : { data: [] as any[] };

  const meta: any = typeof (f as any).metadata === "object" && (f as any).metadata ? (f as any).metadata : {};
  const packingSlipFile = meta?.packing_slip && typeof meta.packing_slip === "object" ? meta.packing_slip : null;
  const shipping = meta?.shipping && typeof meta.shipping === "object" ? meta.shipping : {};

  return NextResponse.json({
    ok: true,
    panel: {
      fulfillmentId,
      orderId,
      accountId: orderAccountId,
      vendorDirectoryError: vendorDirectory.ok ? null : vendorDirectory.error,
      isOpen: String((f as any).status || "").toUpperCase() === "OPEN",
      fulfillmentSource: String((f as any).fulfillment_source || "INVENTORY").toUpperCase(),
      dropshipVendorId: String((f as any).dropship_vendor_id || ""),
      vendors: (vendors ?? []).map((v: any) => ({
        id: String(v.id),
        name: String(v.name || ""),
        email: String(v.email || ""),
      })),
      po: {
        number: String((f as any).po_number || ""),
        sent_at: (f as any).po_sent_at ? String((f as any).po_sent_at) : "",
        sent_to: String((f as any).po_sent_to || ""),
        bucket: String((f as any).po_pdf_bucket || ""),
        path: String((f as any).po_pdf_path || ""),
        status: String((f as any).dropship_status || ""),
      },
      packingSlip: {
        number: String((f as any).dropship_packing_slip_number || ""),
        carrier: String((f as any).dropship_carrier || ""),
        tracking: String((f as any).dropship_tracking_number || ""),
        ship_date: String((f as any).dropship_ship_date || ""),
        notes: String((f as any).dropship_notes || ""),
        label_url: String(shipping?.label_url || ""),
        no_tracking: !!shipping?.no_tracking,
        shipping_usd: shipping?.shipping_usd ?? "",
      },
      packingSlipFile: packingSlipFile
        ? {
            bucket: String(packingSlipFile.bucket || ""),
            path: String(packingSlipFile.path || ""),
            uploaded_at: packingSlipFile.generated_at ? String(packingSlipFile.generated_at) : "",
          }
        : null,
    },
  });
}
