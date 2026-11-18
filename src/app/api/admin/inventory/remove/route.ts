import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { executeInventoryRemove } from "@/lib/inventory/inventoryRemoveExecution";

export const dynamic = "force-dynamic";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

function safeNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(req: Request) {
  const ctx = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const body = await req.json().catch(() => ({}));

  const sku = String((body as any)?.sku ?? "").trim();
  const location = String((body as any)?.location ?? "").trim() || null;

  const qtyRaw = safeNum((body as any)?.qty);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;

  const reasonPreset = String((body as any)?.reason_preset ?? "").trim();
  const reasonOther = String((body as any)?.reason_other ?? "").trim();
  let reason = String((body as any)?.reason ?? "").trim();

  if (reasonPreset === "Other") {
    if (!reasonOther) {
      return NextResponse.json({ ok: false, error: "Please describe the reason when selecting Other." }, { status: 400 });
    }
    reason = `Other: ${reasonOther}`;
  } else if (reasonPreset) {
    reason = reasonPreset;
  }

  if (!reason) {
    return NextResponse.json({ ok: false, error: "A removal reason is required." }, { status: 400 });
  }

  const rawScan = String((body as any)?.raw_scan ?? "").trim() || null;
  const lotManual = String((body as any)?.lot_number ?? "").trim() || null;
  const serialManual = String((body as any)?.serial_number ?? "").trim() || null;
  const expManual = (body as any)?.expiration_date;

  if (!sku) {
    return NextResponse.json({ ok: false, error: "Missing sku." }, { status: 400 });
  }

  const actorUserId = String((ctx as any)?.user?.id ?? "");
  try {
    const result = await executeInventoryRemove(sb, {
      sku,
      qty,
      reason,
      actorUserId,
      location,
      raw_scan: rawScan,
      lot_number: lotManual,
      serial_number: serialManual,
      expiration_date: expManual,
      movementSource: "admin_inventory_remove",
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    const nowIso = new Date().toISOString();
    return NextResponse.json({
      ok: true,
      variant_id: result.variant_id,
      sku: result.sku,
      delta: result.delta,
      prior_qty_on_hand: result.prior_qty_on_hand,
      next_qty_on_hand: result.next_qty_on_hand,
      lot_number: result.lot_number,
      serial_number: result.serial_number,
      expiration_date: result.expiration_date,
      raw_scan: rawScan,
      updated_at: nowIso,
      touched_lots: result.touched_lots,
    });
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Removal failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
