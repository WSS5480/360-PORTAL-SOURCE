import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseDeliverySlipPdfText } from "@/lib/inventory/parseDeliverySlipPdfText";
import { previewInventoryRemoveLine } from "@/lib/inventory/inventoryRemoveExecution";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb = createSupabaseAdminClient();

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "Expected multipart/form-data with a PDF file." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read upload (file too large?)." }, { status: 400 });
  }

  const file = form.get("file");
  const locationRaw = form.get("location");
  const location =
    typeof locationRaw === "string" && locationRaw.trim() ? String(locationRaw).trim() : null;

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "Missing file field." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: `PDF must be under ${Math.floor(MAX_BYTES / 1024 / 1024)} MB.` }, { status: 400 });
  }

  const name = "name" in file && typeof (file as any).name === "string" ? String((file as any).name) : "upload.pdf";
  if (!/\.pdf$/i.test(name)) {
    return NextResponse.json({ ok: false, error: "Please upload a .pdf file." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let text = "";
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const extracted = await extractText(pdf, { mergePages: true });
    text = String(extracted?.text ?? "");
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ? String(e.message) : "Could not read PDF text. Try exporting PDF from source (not only a scan), or use manual remove." },
      { status: 400 }
    );
  }

  const parsed = parseDeliverySlipPdfText(text);

  const rows: Array<{
    sku: string;
    identifier: string;
    qty: number;
    ok: boolean;
    error?: string;
    history?: {
      trace_rows: Array<{
        id: string;
        qty: number;
        serial_number: string | null;
        lot_number: string | null;
        location: string | null;
        created_at: string | null;
      }>;
      movements: Array<{
        id: string;
        created_at: string;
        delta: number;
        reason: string | null;
        source: string | null;
      }>;
      trace_at_other_locations?: string[];
    };
    preview?: {
      variant_id: string;
      size_label: string | null;
      prior_qty_on_hand: number;
      matchPath: string;
      available_in_trace_rows: number;
    };
  }> = [];

  for (const line of parsed.lines) {
    const pr = await previewInventoryRemoveLine(sb, line.sku, line.identifier, line.qty, location);
    if (!pr.ok) {
      rows.push({
        sku: line.sku,
        identifier: line.identifier,
        qty: line.qty,
        ok: false,
        error: pr.error,
        ...(pr.history ? { history: pr.history } : {}),
      });
    } else {
      rows.push({
        sku: line.sku,
        identifier: line.identifier,
        qty: line.qty,
        ok: true,
        preview: {
          variant_id: pr.preview.variant_id,
          size_label: pr.preview.size_label,
          prior_qty_on_hand: pr.preview.prior_qty_on_hand,
          matchPath: pr.preview.matchPath,
          available_in_trace_rows: pr.preview.available_in_trace_rows,
        },
      });
    }
  }

  const readyCount = rows.filter((r) => r.ok).length;
  const blockedCount = rows.length - readyCount;

  return NextResponse.json({
    ok: true,
    filename: name,
    slip: {
      warehouse_outbound: parsed.warehouseOutbound,
      sales_order: parsed.salesOrder,
    },
    parse_warnings: parsed.warnings,
    summary: {
      line_count: parsed.lines.length,
      ready: readyCount,
      blocked: blockedCount,
    },
    lines: rows,
    raw_text_sample: text.trim().slice(0, 800),
  });
}
