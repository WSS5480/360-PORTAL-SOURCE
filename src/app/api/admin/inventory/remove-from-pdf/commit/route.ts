import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { executeInventoryRemove, previewInventoryRemoveLine } from "@/lib/inventory/inventoryRemoveExecution";

export const dynamic = "force-dynamic";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

type CommitLine = { sku: string; identifier: string; qty: number };

export async function POST(req: Request) {
  const ctx = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const body = await req.json().catch(() => ({}));
  const linesRaw = (body as any)?.lines;
  if (!Array.isArray(linesRaw) || linesRaw.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing lines array." }, { status: 400 });
  }

  const lines: CommitLine[] = [];
  for (const r of linesRaw) {
    const sku = String((r as any)?.sku ?? "").trim();
    const identifier = String((r as any)?.identifier ?? "").trim();
    const qty = Math.floor(Number((r as any)?.qty ?? 1)) || 1;
    if (!sku || !identifier || qty < 1) {
      return NextResponse.json({ ok: false, error: "Each line needs sku, identifier, and qty ≥ 1." }, { status: 400 });
    }
    lines.push({ sku, identifier, qty });
  }

  if (lines.length > 500) {
    return NextResponse.json({ ok: false, error: "Too many lines (max 500 per batch)." }, { status: 400 });
  }

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

  const location = String((body as any)?.location ?? "").trim() || null;
  const actorUserId = String((ctx as any)?.user?.id ?? "");
  if (!actorUserId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  // Re-check all lines against current DB (no concurrent stock loss)
  for (const line of lines) {
    const pr = await previewInventoryRemoveLine(sb, line.sku, line.identifier, line.qty, location);
    if (!pr.ok) {
      return NextResponse.json(
        { ok: false, error: `Blocked: ${line.sku} / ${line.identifier} — ${pr.error}`, sku: line.sku, identifier: line.identifier },
        { status: 409 }
      );
    }
  }

  const results: any[] = [];
  const slipRef = {
    warehouse_outbound: (body as any)?.slip?.warehouse_outbound ?? null,
    sales_order: (body as any)?.slip?.sales_order ?? null,
    filename: (body as any)?.filename ?? null,
  };

  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const res = await executeInventoryRemove(sb, {
        sku: line.sku,
        qty: line.qty,
        reason,
        actorUserId,
        location,
        raw_scan: line.identifier,
        movementSource: "admin_inventory_remove_pdf_batch",
        movementMetaExtra: {
          pdf_batch: true,
          batch_index: i + 1,
          batch_total: lines.length,
          slip: slipRef,
        },
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      });
      results.push({
        sku: res.sku,
        identifier: line.identifier,
        delta: res.delta,
        prior_qty_on_hand: res.prior_qty_on_hand,
        next_qty_on_hand: res.next_qty_on_hand,
      });
    }
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Removal failed";
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        partial: true,
        completed: results.length,
        results,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    applied: results.length,
    results,
  });
}
