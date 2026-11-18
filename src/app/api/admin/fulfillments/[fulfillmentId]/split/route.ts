// src/app/api/admin/fulfillments/[fulfillmentId]/split/route.ts
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

function asUpper(v: any) {
  return String(v || "").trim().toUpperCase();
}

export async function POST(req: Request, ctx: any) {
  await requireOrdersStaffOrAdmin();

  const fulfillmentId = await getFulfillmentIdFromCtx(ctx);
  if (!fulfillmentId) return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const toSource = asUpper(body?.to_source);
  const rawIds = Array.isArray(body?.item_ids) ? body.item_ids : [];

  const itemIds = Array.from(
    new Set(rawIds.map((x: any) => normalizeUuid(x)).filter(Boolean))
  );

  if (toSource !== "INVENTORY" && toSource !== "DROPSHIP") {
    return NextResponse.json({ ok: false, error: "to_source must be INVENTORY or DROPSHIP" }, { status: 400 });
  }
  if (!itemIds.length) {
    return NextResponse.json({ ok: false, error: "Select at least one item to split" }, { status: 400 });
  }

  // Load source fulfillment
  const { data: srcF, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, order_id, status, fulfillment_source, dropship_vendor_id, metadata")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr || !srcF) {
    return NextResponse.json({ ok: false, error: fErr?.message || "Fulfillment not found" }, { status: 404 });
  }

  // Enforce OPEN (so we don’t split closed history)
  const status = asUpper((srcF as any).status);
  if (status !== "OPEN") {
    return NextResponse.json({ ok: false, error: "Fulfillment must be OPEN to split items" }, { status: 400 });
  }

  const orderId = normalizeUuid((srcF as any).order_id);
  if (!orderId) return NextResponse.json({ ok: false, error: "Fulfillment missing order_id" }, { status: 400 });

  // Load the selected items and ensure they belong to src fulfillment
  const { data: items, error: iErr } = await supabaseAdmin
    .from("fulfillment_items")
    .select("id, fulfillment_id, variant_id, description, required_qty, picked_qty, uom, sort_order")
    .eq("fulfillment_id", fulfillmentId)
    .in("id", itemIds as any);

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

  if (!items || items.length !== itemIds.length) {
    return NextResponse.json({ ok: false, error: "One or more selected lines were not found on this fulfillment" }, { status: 400 });
  }

  // Block splitting picked items (keep it simple/safe)
  const anyPicked = (items as any[]).some((r) => Number(r.picked_qty || 0) > 0);
  if (anyPicked) {
    return NextResponse.json({ ok: false, error: "Cannot split lines that already have picks. Undo picks first." }, { status: 400 });
  }

  // Create destination fulfillment
  // Copy basic fields but reset dropship-specific fields if not dropship
  const dstInsert: any = {
    order_id: orderId,
    status: "OPEN",
    fulfillment_source: toSource,
    metadata: (srcF as any).metadata ?? null,
  };

  if (toSource === "DROPSHIP") {
    // vendor will be chosen after split; keep null
    dstInsert.dropship_vendor_id = null;
    dstInsert.dropship_status = "NEEDS_VENDOR";
  } else {
    // inventory fulfillment
    dstInsert.dropship_vendor_id = null;
    dstInsert.dropship_status = null;
    dstInsert.po_number = null;
    dstInsert.po_pdf_bucket = null;
    dstInsert.po_pdf_path = null;
    dstInsert.po_sent_at = null;
    dstInsert.po_sent_to = null;
  }

  const { data: dstF, error: cErr } = await supabaseAdmin
    .from("fulfillments")
    .insert(dstInsert)
    .select("id")
    .single();

  if (cErr || !dstF) {
    return NextResponse.json({ ok: false, error: cErr?.message || "Failed to create destination fulfillment" }, { status: 500 });
  }

  const toFulfillmentId = normalizeUuid((dstF as any).id);
  if (!toFulfillmentId) {
    return NextResponse.json({ ok: false, error: "Destination fulfillment id missing" }, { status: 500 });
  }

  // Move items by updating fulfillment_id
  const { error: mvErr } = await supabaseAdmin
    .from("fulfillment_items")
    .update({ fulfillment_id: toFulfillmentId })
    .in("id", itemIds as any)
    .eq("fulfillment_id", fulfillmentId);

  if (mvErr) {
    // best effort rollback: delete dst fulfillment if move failed
    await supabaseAdmin.from("fulfillments").delete().eq("id", toFulfillmentId);
    return NextResponse.json({ ok: false, error: mvErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, from_fulfillment_id: fulfillmentId, to_fulfillment_id: toFulfillmentId });
}
