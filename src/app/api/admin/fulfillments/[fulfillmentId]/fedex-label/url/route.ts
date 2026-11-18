// src/app/api/admin/fulfillments/[fulfillmentId]/fedex-label/url/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  return s.split("?")[0].split("#")[0].trim();
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const { data: f, error } = await sb
    .from("fulfillments")
    .select("id, metadata")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  const meta: any = typeof (f as any).metadata === "object" && (f as any).metadata ? (f as any).metadata : {};
  const ship: any = meta?.shipping ?? {};
  const bucket = safeStr(ship?.fedex_label_bucket) || "order-private";
  const path = safeStr(ship?.fedex_label_path);

  if (!path) {
    return NextResponse.json(
      { ok: false, error: "No FedEx label found. Create a label first." },
      { status: 400 }
    );
  }

  const { data: signed, error: sErr } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 10);

  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

  const url = signed?.signedUrl ?? null;
  if (!url) return NextResponse.json({ ok: false, error: "Failed to generate signed URL." }, { status: 500 });

  return NextResponse.redirect(url);
}
