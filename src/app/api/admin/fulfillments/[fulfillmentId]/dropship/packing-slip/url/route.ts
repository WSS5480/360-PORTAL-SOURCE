// src/app/api/admin/fulfillments/[fulfillmentId]/dropship/packing-slip/url/route.ts
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

async function getFulfillmentIdFromCtx(ctx: any): Promise<string> {
  const maybeParams = ctx?.params;
  const resolved = typeof maybeParams?.then === "function" ? await maybeParams : maybeParams;
  return normId(resolved?.fulfillmentId);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ fulfillmentId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentIdFromCtx(ctx);
  if (!fulfillmentId) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const { data: f, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("dropship_packing_slip_bucket, dropship_packing_slip_path")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  const bucket = safeStr((f as any).dropship_packing_slip_bucket) || "order-private";
  const path = safeStr((f as any).dropship_packing_slip_path);

  if (!path) {
    return NextResponse.json({ ok: false, error: "No vendor packing slip uploaded yet." }, { status: 400 });
  }

  const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ ok: false, error: signed.error?.message || "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: signed.data.signedUrl });
}
