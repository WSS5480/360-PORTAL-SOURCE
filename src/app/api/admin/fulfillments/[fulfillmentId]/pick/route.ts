// src/app/api/admin/fulfillments/[fulfillmentId]/pick/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { orderIsDemo } from "@/lib/accounts/demoAccount";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function wantsJson(req: Request) {
  const a = (req.headers.get("accept") || "").toLowerCase();
  return a.includes("application/json");
}

function toIsoDateOnly(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  if (/^\d{6}$/.test(raw)) return `20${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  return null;
}

// (01)GTIN(10)LOT(17)YYMMDD(21)SERIAL
function parseGs1AIs(raw: string): {
  gtin?: string;
  lot_number?: string;
  expiration_date?: string; // YYYY-MM-DD
  serial_number?: string;
} {
  const s = String(raw || "").trim();
  if (!s) return {};

  if (s.includes("(") && s.includes(")")) {
    const out: any = {};
    const re = /\((\d{2})\)([^()]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const ai = m[1];
      const val = (m[2] ?? "").trim();
      if (ai === "01") out.gtin = val.replace(/\D/g, "");
      if (ai === "10") out.lot_number = val;
      if (ai === "21") out.serial_number = val;
      if (ai === "17") {
        const vv = val.replace(/\D/g, "");
        const iso = toIsoDateOnly(vv);
        if (iso) out.expiration_date = iso;
      }
    }
    return out;
  }
  return {};
}

async function resolveVariantIdFromScan(
  sb: any,
  rawScan: string
): Promise<{ variant_id: string; method: string; gs1: ReturnType<typeof parseGs1AIs> } | null> {
  const s = String(rawScan || "").trim();
  if (!s) return null;

  const gs1 = parseGs1AIs(s);

  // 1) GS1 GTIN lookup table
  if (gs1.gtin) {
    const { data: bcRow } = await sb
      .from("product_variant_barcodes")
      .select("variant_id, barcode, is_active")
      .eq("barcode", gs1.gtin)
      .eq("is_active", true)
      .maybeSingle();
    if (bcRow?.variant_id) return { variant_id: String(bcRow.variant_id), method: "GS1_GTIN", gs1 };
  }

  // 2) Raw as SKU
  const { data: vBySku } = await sb.from("product_variants").select("id, sku").eq("sku", s).maybeSingle();
  if (vBySku?.id) return { variant_id: String(vBySku.id), method: "SKU", gs1 };

  // 3) GTIN stored as sku
  if (gs1.gtin) {
    const { data: vByGtinAsSku } = await sb.from("product_variants").select("id, sku").eq("sku", gs1.gtin).maybeSingle();
    if (vByGtinAsSku?.id) return { variant_id: String(vByGtinAsSku.id), method: "GTIN_AS_SKU", gs1 };
  }

  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { fulfillmentId: rawId } = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(rawId);

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  // Accept JSON OR form-data
  const contentType = req.headers.get("content-type") || "";
  let body: any = {};
  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    fd.forEach((v, k) => (body[k] = typeof v === "string" ? v : String(v)));
  } else {
    body = await req.json().catch(() => ({}));
  }

  const qtyRaw = safeNum(body?.qty);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;

  const note = String(body?.note ?? "").trim() || null;
  const rawScan = String(body?.raw_scan ?? "").trim() || null;
  const allowOverpick = String(body?.allow_overpick ?? "").trim() === "1" || body?.allow_overpick === true;
  const lotRowId = String(body?.lot_row_id ?? "").trim() || null;

  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id, invoice_id, status")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });
  if (safeUpper(f.status) !== "OPEN") {
    return NextResponse.json({ ok: false, error: "Fulfillment is not OPEN." }, { status: 400 });
  }

  const isDemoOrder = await orderIsDemo(String(f.order_id));

  const actorUserId = String(ctx?.user?.id ?? "");
  if (!actorUserId || !UUID_RE.test(actorUserId)) {
    return NextResponse.json({ ok: false, error: "Missing actor user." }, { status: 401 });
  }

  let fulfillmentItemId = String(body?.fulfillment_item_id ?? "").trim() || null;

  let resolvedMethod: string | null = null;
  let resolvedGs1: any = null;

  if (!fulfillmentItemId) {
    if (!rawScan) {
      return NextResponse.json({ ok: false, error: "Missing fulfillment_item_id or raw_scan." }, { status: 400 });
    }

    const resolved = await resolveVariantIdFromScan(sb, rawScan);
    if (!resolved?.variant_id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Scan did not match a variant. If this is GS1 (01)GTIN, add mapping in product_variant_barcodes. If it’s SKU, confirm the SKU exists.",
        },
        { status: 400 }
      );
    }

    resolvedMethod = resolved.method;
    resolvedGs1 = resolved.gs1;

    const { data: lines, error: lErr } = await sb
      .from("fulfillment_items")
      .select("id, variant_id, required_qty, picked_qty, sort_order")
      .eq("fulfillment_id", fulfillmentId)
      .eq("variant_id", resolved.variant_id)
      .order("sort_order", { ascending: true });

    if (lErr) return NextResponse.json({ ok: false, error: lErr.message }, { status: 500 });
    if (!lines || lines.length === 0) {
      return NextResponse.json({ ok: false, error: "This variant is not on the pick list for this fulfillment." }, { status: 400 });
    }

    const withRemaining = lines.find((x: any) => Number(x.picked_qty ?? 0) < Number(x.required_qty ?? 0));
    fulfillmentItemId = String((withRemaining ?? lines[0])?.id);
  }

  if (!UUID_RE.test(String(fulfillmentItemId))) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillment_item_id" }, { status: 400 });
  }

  const { data: fi, error: fiErr } = await sb
    .from("fulfillment_items")
    .select("id, fulfillment_id, variant_id, required_qty, picked_qty, description, uom")
    .eq("id", fulfillmentItemId)
    .eq("fulfillment_id", fulfillmentId)
    .maybeSingle();

  if (fiErr) return NextResponse.json({ ok: false, error: fiErr.message }, { status: 500 });
  if (!fi) return NextResponse.json({ ok: false, error: "Pick line not found" }, { status: 404 });

  const variantId = String(fi.variant_id);
  const priorPicked = Number(fi.picked_qty ?? 0) || 0;
  const required = Number(fi.required_qty ?? 0) || 0;
  const remaining = Math.max(0, required - priorPicked);

  if (!allowOverpick && qty > remaining) {
    return NextResponse.json(
      { ok: false, error: `Qty exceeds remaining. Remaining ${remaining}, attempted ${qty}. (Enable allow over-pick to force.)` },
      { status: 400 }
    );
  }

  const nextPicked = priorPicked + qty;
  const nowIso = new Date().toISOString();

  let priorOnHand = 0;
  let nextOnHand = 0;
  let usedLotRowId: string | null = null;

  if (!isDemoOrder) {
  const { data: invRow, error: invErr } = await sb
    .from("variant_inventory")
    .select("variant_id, on_hand")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  priorOnHand = Number(invRow?.on_hand ?? 0) || 0;
  nextOnHand = priorOnHand - qty;

  // If picking from a specific lot row, decrement that row qty

  if (lotRowId) {
    if (!UUID_RE.test(lotRowId)) {
      return NextResponse.json({ ok: false, error: "Invalid lot_row_id" }, { status: 400 });
    }

    const { data: lotRow, error: lotErr } = await sb
      .from("product_variant_lots")
      .select("id, variant_id, qty, lot_number, serial_number, expiration_date")
      .eq("id", lotRowId)
      .maybeSingle();

    if (lotErr) return NextResponse.json({ ok: false, error: lotErr.message }, { status: 500 });
    if (!lotRow) return NextResponse.json({ ok: false, error: "Lot row not found" }, { status: 404 });

    if (String(lotRow.variant_id) !== variantId) {
      return NextResponse.json({ ok: false, error: "Selected lot row does not belong to this pick line variant." }, { status: 400 });
    }

    const lotQty = Number(lotRow.qty ?? 0) || 0;

    if (lotRow.serial_number && qty !== 1) {
      return NextResponse.json({ ok: false, error: "Serial-controlled picking requires qty = 1." }, { status: 400 });
    }

    if (qty > lotQty) {
      return NextResponse.json({ ok: false, error: `Qty exceeds selected lot availability. Have ${lotQty}, tried ${qty}.` }, { status: 400 });
    }

    const { error: lotUpErr } = await sb
      .from("product_variant_lots")
      .update({ qty: lotQty - qty })
      .eq("id", lotRowId);

    if (lotUpErr) return NextResponse.json({ ok: false, error: lotUpErr.message }, { status: 500 });

    usedLotRowId = lotRowId;
  } else if (rawScan) {
    // Best-effort auto-match serial/lot from GS1
    const gs1 = resolvedGs1 ?? parseGs1AIs(rawScan);
    const serial = String(gs1?.serial_number ?? "").trim() || null;
    const lot = String(gs1?.lot_number ?? "").trim() || null;
    const rawFallback = String(rawScan || "").trim();

    if (serial) {
      const { data: sRow } = await sb
        .from("product_variant_lots")
        .select("id, qty, serial_number, variant_id")
        .eq("variant_id", variantId)
        .eq("serial_number", serial)
        .gt("qty", 0)
        .maybeSingle();

      if (sRow?.id) {
        if (qty !== 1) {
          return NextResponse.json({ ok: false, error: "Serial-controlled picking requires qty = 1." }, { status: 400 });
        }
        await sb.from("product_variant_lots").update({ qty: 0 }).eq("id", String(sRow.id));
        usedLotRowId = String(sRow.id);
      }
    } else if (lot) {
      const { data: lotRows } = await sb
        .from("product_variant_lots")
        .select("id, qty, expiration_date, created_at")
        .eq("variant_id", variantId)
        .eq("lot_number", lot)
        .gt("qty", 0)
        .order("expiration_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(50);

      const first = (lotRows ?? [])[0];
      if (first?.id) {
        const have = Number(first.qty ?? 0) || 0;
        if (qty <= have) {
          await sb.from("product_variant_lots").update({ qty: have - qty }).eq("id", String(first.id));
          usedLotRowId = String(first.id);
        }
      }
    } else if (rawFallback) {
      // Fallback: try raw scan as serial_number, then as lot_number
      const { data: sRow } = await sb
        .from("product_variant_lots")
        .select("id, qty, serial_number, variant_id")
        .eq("variant_id", variantId)
        .eq("serial_number", rawFallback)
        .gt("qty", 0)
        .maybeSingle();

      if (sRow?.id) {
        if (qty !== 1) {
          return NextResponse.json({ ok: false, error: "Serial-controlled picking requires qty = 1." }, { status: 400 });
        }
        await sb.from("product_variant_lots").update({ qty: 0 }).eq("id", String(sRow.id));
        usedLotRowId = String(sRow.id);
      } else {
        const { data: lotRows } = await sb
          .from("product_variant_lots")
          .select("id, qty, expiration_date, created_at")
          .eq("variant_id", variantId)
          .eq("lot_number", rawFallback)
          .gt("qty", 0)
          .order("expiration_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(50);

        const first = (lotRows ?? [])[0];
        if (first?.id) {
          const have = Number(first.qty ?? 0) || 0;
          if (qty <= have) {
            await sb.from("product_variant_lots").update({ qty: have - qty }).eq("id", String(first.id));
            usedLotRowId = String(first.id);
          }
        }
      }
    }
  }
  }

  // Update picked qty
  const { error: upFiErr } = await sb
    .from("fulfillment_items")
    .update({ picked_qty: nextPicked })
    .eq("id", fulfillmentItemId);

  if (upFiErr) return NextResponse.json({ ok: false, error: upFiErr.message }, { status: 500 });

  if (!isDemoOrder) {
  // Update inventory
  const { error: upInvErr } = await sb
    .from("variant_inventory")
    .upsert({ variant_id: variantId, on_hand: nextOnHand, updated_at: nowIso }, { onConflict: "variant_id" });

  if (upInvErr) return NextResponse.json({ ok: false, error: upInvErr.message }, { status: 500 });

  try {
    await sb
      .from("product_variant_inventory")
      .upsert({ variant_id: variantId, qty_on_hand: nextOnHand, updated_at: nowIso }, { onConflict: "variant_id" });
  } catch {}

  // inventory_movements (immutable)
  try {
    const gs1 = rawScan ? parseGs1AIs(rawScan) : {};
    await sb.from("inventory_movements").insert({
      variant_id: variantId,
      delta: -qty,
      resulting_on_hand: nextOnHand,
      reason: "Fulfillment pick",
      actor_user_id: actorUserId,
      meta: {
        source: "admin_fulfillment_pick",
        fulfillment_id: fulfillmentId,
        fulfillment_item_id: fulfillmentItemId,
        order_id: f.order_id,
        invoice_id: f.invoice_id,
        lot_row_id: usedLotRowId ?? undefined,
        description: fi.description ?? null,
        uom: fi.uom ?? null,
        qty_picked: qty,
        prior_qty_on_hand: priorOnHand,
        prior_picked_qty: priorPicked,
        next_picked_qty: nextPicked,
        required_qty: required,
        remaining_before: remaining,
        over_pick: nextPicked > required,
        allow_overpick: allowOverpick,
        note: note ?? undefined,
        raw_scan: rawScan ?? undefined,
        scan_resolve_method: resolvedMethod ?? undefined,
        lot_number: gs1.lot_number ?? undefined,
        serial_number: gs1.serial_number ?? undefined,
        expiration_date: gs1.expiration_date ?? undefined,
        gtin: gs1.gtin ?? undefined,
      },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {}
  }

  // fulfillment_picks
  try {
    await sb.from("fulfillment_picks").insert({
      fulfillment_id: fulfillmentId,
      fulfillment_item_id: fulfillmentItemId,
      order_id: f.order_id,
      invoice_id: f.invoice_id,
      variant_id: variantId,
      qty: qty,
      lot_row_id: usedLotRowId,
      raw_scan: rawScan,
      note: note,
      is_undo: false,
      meta: { allow_overpick: allowOverpick, resolved_method: resolvedMethod, demo_account: isDemoOrder },
      actor_user_id: actorUserId,
    });
  } catch {}

  const payload = {
    ok: true,
    fulfillment_id: fulfillmentId,
    fulfillment_item_id: fulfillmentItemId,
    variant_id: variantId,
    qty_picked: qty,
    prior_on_hand: priorOnHand,
    next_on_hand: nextOnHand,
    prior_picked_qty: priorPicked,
    next_picked_qty: nextPicked,
    used_lot_row_id: usedLotRowId,
  };

  if (wantsJson(req)) return NextResponse.json(payload);

  const url = urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}`);
  url.hash = "pick";
  return NextResponse.redirect(url);
}
