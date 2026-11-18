import { NextResponse } from "next/server";
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

export async function GET(_req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentIdFromCtx(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });

  const { data: row, error } = await supabaseAdmin
    .from("fulfillment_files")
    .select("id, bucket, object_path, created_at")
    .eq("fulfillment_id", fulfillmentId)
    .eq("kind", "PACKING_SLIP")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ ok: false, error: "No packing slip uploaded yet." }, { status: 404 });

  const bucket = String((row as any).bucket || "");
  const path = String((row as any).object_path || "");
  if (!bucket || !path) return NextResponse.json({ ok: false, error: "Packing slip record invalid." }, { status: 500 });

  const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10); // 10 minutes
  if (signed.error) return NextResponse.json({ ok: false, error: signed.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, url: signed.data.signedUrl, bucket, path });
}
