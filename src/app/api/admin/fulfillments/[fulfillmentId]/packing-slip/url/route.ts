// src/app/api/admin/fulfillments/[fulfillmentId]/packing-slip/url/route.ts
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

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function safeBucket(v: any, fallback: string) {
  const s = safeStr(v);
  if (!s || s === "undefined" || s === "null") return fallback;
  return s;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  // Read metadata.packing_slip from fulfillments
  const { data: f, error } = await supabaseAdmin
    .from("fulfillments")
    .select("id, metadata")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  const meta: any = typeof (f as any).metadata === "object" && (f as any).metadata ? (f as any).metadata : {};
  const ps: any = meta?.packing_slip ?? {};

  const bucket = safeBucket(ps?.bucket, "order-private");
  const path = safeStr(ps?.path);

  if (!path) {
    return NextResponse.json(
      { ok: false, error: "Packing slip not generated yet. Click Generate first." },
      { status: 400 }
    );
  }

  // Create short-lived signed URL
  const { data: signed, error: sErr } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);

  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

  const url = signed?.signedUrl ?? null;
  if (!url) return NextResponse.json({ ok: false, error: "Failed to generate signed URL." }, { status: 500 });

  return NextResponse.json({ ok: true, url }, { status: 200 });
}
