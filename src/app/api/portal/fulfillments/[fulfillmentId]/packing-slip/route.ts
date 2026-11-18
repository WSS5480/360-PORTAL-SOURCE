// src/app/api/portal/fulfillments/[fulfillmentId]/packing-slip/route.ts
import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPortalOrderRowViewable } from "@/lib/portal/portalRowScope";

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

function safeStr(v: any): string {
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
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 400 });
  }

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  // Load fulfillment (needs order_id + metadata)
  const { data: fulfillment, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, order_id, metadata")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!fulfillment) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  const orderId = safeStr((fulfillment as any).order_id);

  // Verify this order belongs to the current account
  const { data: order, error: oErr } = await supabaseAdmin
    .from("orders")
    .select("id, account_id, created_by_user_id, submitted_by_contact_id")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  if (String((order as any).account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalOrderRowViewable(supabaseAdmin as any, accountId, portalUserId, ctx.currentRole, order as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const meta: any = (fulfillment as any).metadata ?? {};
  const bucket = safeBucket(meta?.packing_slip?.bucket, "order-private");
  const path = safeStr(meta?.packing_slip?.path);

  if (!path) {
    return NextResponse.json({ ok: false, error: "Packing slip not available yet." }, { status: 400 });
  }

  // short-lived URL
  const { data: signed, error: sErr } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

  const url = signed?.signedUrl ?? null;
  if (!url) return NextResponse.json({ ok: false, error: "Failed to generate signed URL." }, { status: 500 });

  return NextResponse.json({ ok: true, url }, { status: 200 });
}
