// src/app/api/admin/fulfillments/[fulfillmentId]/dropship/packing-slip/upload/route.ts
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

function normId(v: any) {
  const s = normalizeParam(v);
  return UUID_RE.test(s) ? s : "";
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function extFrom(fileName: string, mime: string) {
  const n = safeStr(fileName).toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "bin";
}

async function getFulfillmentIdFromCtx(ctx: any): Promise<string> {
  // supports both `{ params: { fulfillmentId } }` and `{ params: Promise<{ fulfillmentId }> }`
  const maybeParams = ctx?.params;
  const resolved = typeof maybeParams?.then === "function" ? await maybeParams : maybeParams;
  return normId(resolved?.fulfillmentId);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ fulfillmentId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentIdFromCtx(ctx);
  if (!fulfillmentId) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });

  // Load fulfillment (need order_id for path)
  const { data: f, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, order_id, fulfillment_source")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  const orderId = normId((f as any).order_id);
  if (!orderId) return NextResponse.json({ ok: false, error: "Fulfillment missing order_id" }, { status: 400 });

  const mime = String(file.type || "");
  const fileName = safeStr((file as any).name) || "packing-slip";
  const ext = extFrom(fileName, mime);

  const buf = Buffer.from(await file.arrayBuffer());
  if (!buf.length) return NextResponse.json({ ok: false, error: "Empty file" }, { status: 400 });

  const bucket = "order-private";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const objectPath = `dropship/${orderId}/${fulfillmentId}/VENDOR-PACKING-SLIP-${stamp}.${ext}`;

  const up = await supabaseAdmin.storage.from(bucket).upload(objectPath, buf, {
    contentType: mime || "application/octet-stream",
    upsert: true,
  });

  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  const { error: uErr } = await supabaseAdmin
    .from("fulfillments")
    .update({
      dropship_packing_slip_bucket: bucket,
      dropship_packing_slip_path: objectPath,
      dropship_packing_slip_uploaded_at: new Date().toISOString(),
    })
    .eq("id", fulfillmentId);

  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, bucket, path: objectPath });
}
