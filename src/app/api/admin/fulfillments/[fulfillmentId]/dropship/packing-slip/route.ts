// src/app/api/admin/fulfillments/[fulfillmentId]/dropship/packing-slip/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Strict UUID v1–v5
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

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function safeName(name: string) {
  // avoid weird paths / control chars
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "upload";
}

async function handleUpload(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  // Load fulfillment (optional but useful for guardrails)
  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, status, fulfillment_source")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  // You can relax this if you want to allow upload anytime
  const src = safeUpper((f as any).fulfillment_source || "INVENTORY");
  if (src !== "DROPSHIP") {
    return NextResponse.json(
      { ok: false, error: "This upload is for DROPSHIP fulfillments only." },
      { status: 400 }
    );
  }

  // Must be multipart/form-data
  const ct = req.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false, error: "Expected multipart/form-data with a `file` field." },
      { status: 400 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing `file` in form-data." }, { status: 400 });
  }

  const filename = safeName(file.name || "dropship-packing-slip.pdf");

  // Storage target
  const bucket = "order-private";
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const objectPath = `dropship/packing-slips/${fulfillmentId}/${ts}-${filename}`;

  const bytes = await file.arrayBuffer();
  const up = await sb.storage.from(bucket).upload(objectPath, bytes, {
    contentType: file.type || "application/pdf",
    upsert: true,
  });

  if (up.error) {
    return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });
  }

  const now = new Date().toISOString();

  const { error: uErr } = await sb
    .from("fulfillments")
    .update({
      dropship_packing_slip_bucket: bucket,
      dropship_packing_slip_path: objectPath,
      dropship_packing_slip_uploaded_at: now,
    })
    .eq("id", fulfillmentId);

  if (uErr) {
    return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    fulfillment_id: fulfillmentId,
    bucket,
    path: objectPath,
    uploaded_at: now,
  });
}

// Support PATCH (your client uses PATCH)
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ fulfillmentId: string }> }
) {
  return handleUpload(req, ctx);
}

// Also support POST just in case you later switch
export async function POST(
  req: Request,
  ctx: { params: Promise<{ fulfillmentId: string }> }
) {
  return handleUpload(req, ctx);
}
