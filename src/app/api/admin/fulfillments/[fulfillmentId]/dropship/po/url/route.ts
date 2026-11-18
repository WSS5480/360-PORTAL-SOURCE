import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

async function getFulfillmentId(params: any): Promise<string> {
  const resolved = await Promise.resolve(params);
  const s = normalizeParam(resolved?.fulfillmentId);
  return UUID_RE.test(s) ? s : "";
}

export async function GET(_req: Request, { params }: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentId(params);
  if (!fulfillmentId) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const { data: f, error } = await supabaseAdmin
    .from("fulfillments")
    .select("po_pdf_bucket, po_pdf_path")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  const bucket = String((f as any).po_pdf_bucket || "").trim();
  const path = String((f as any).po_pdf_path || "").trim();

  if (!bucket || !path) {
    return NextResponse.json({ ok: false, error: "PO not generated yet" }, { status: 400 });
  }

  const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ ok: false, error: signed.error?.message || "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: signed.data.signedUrl });
}
