// src/app/api/admin/fulfillments/[fulfillmentId]/close/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { orderStatusFromPrimaryInvoice } from "@/lib/billing/orderStatusFromInvoice";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function isVirtualWarehouseBulkDepositLineDescription(desc: unknown): boolean {
  return safeStr(desc).startsWith("Virtual warehouse bulk purchase");
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

function redirectToFulfillment(req: Request, fulfillmentId: string, qp: Record<string, string>) {
  const url = urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}`);
  for (const [k, v] of Object.entries(qp)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

async function validateDropshipTraceComplete(sb: any, fulfillmentId: string) {
  const { data: items, error: iErr } = await sb
    .from("fulfillment_items")
    .select("id, required_qty")
    .eq("fulfillment_id", fulfillmentId)
    .limit(2000);

  if (iErr) throw new Error(iErr.message);

  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) throw new Error("No fulfillment lines found");

  const requiredByItem = new Map<string, number>();
  for (const r of rows) requiredByItem.set(String((r as any).id), safeNum((r as any).required_qty));

  const { data: traces, error: tErr } = await sb
    .from("fulfillment_item_trace")
    .select("fulfillment_item_id, qty")
    .eq("fulfillment_id", fulfillmentId)
    .limit(10000);

  if (tErr) throw new Error(tErr.message);

  const gotByItem = new Map<string, number>();
  for (const t of Array.isArray(traces) ? traces : []) {
    const k = String((t as any).fulfillment_item_id || "");
    if (!k) continue;
    gotByItem.set(k, (gotByItem.get(k) ?? 0) + safeNum((t as any).qty));
  }

  const missing: string[] = [];
  for (const [itemId, reqQty] of requiredByItem.entries()) {
    if (reqQty <= 0) continue;
    const got = gotByItem.get(itemId) ?? 0;
    if (got + 1e-9 < reqQty) missing.push(itemId);
  }

  if (missing.length) {
    throw new Error("Cannot close: missing lot/serial traceability for one or more lines.");
  }

  return { line_count: rows.length };
}

async function setOrderStatusWithEvent(sb: any, orderId: string, toStatus: string, actorUserId: string | null) {
  const { data: ord } = await sb.from("orders").select("id, status").eq("id", orderId).maybeSingle();
  const fromStatus = ord?.status ? String(ord.status) : null;

  if (fromStatus && safeUpper(fromStatus) === safeUpper(toStatus)) return;

  await sb.from("orders").update({ status: toStatus }).eq("id", orderId);

  try {
    await sb.from("order_status_events").insert({
      order_id: orderId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by_user_id: actorUserId,
      comment: null,
    });
  } catch {
    // ignore
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  try {
    // Load fulfillment
    const { data: f, error: fErr } = await sb
      .from("fulfillments")
      .select("id, order_id, invoice_id, status, closed_at, fulfillment_source")
      .eq("id", fulfillmentId)
      .maybeSingle();

    if (fErr) return redirectToFulfillment(req, fulfillmentId, { error: fErr.message });
    if (!f) return redirectToFulfillment(req, fulfillmentId, { error: "Fulfillment not found" });

    if (safeUpper(f.status) !== "OPEN") {
      return redirectToFulfillment(req, fulfillmentId, { error: "Fulfillment is not OPEN" });
    }

    const orderId = String(f.order_id ?? "").trim();
    const invoiceId = String(f.invoice_id ?? "").trim() || null;

    if (!UUID_RE.test(orderId)) {
      return redirectToFulfillment(req, fulfillmentId, { error: "Fulfillment has invalid order_id" });
    }

    const src = safeUpper((f as any).fulfillment_source || "INVENTORY");

    // ✅ Validate completeness depending on source
    let itemCountForAudit = 0;

    if (src === "DROPSHIP") {
      const r = await validateDropshipTraceComplete(sb, fulfillmentId);
      itemCountForAudit = r.line_count;
    } else {
      const { data: items, error: iErr } = await sb
        .from("fulfillment_items")
        .select("id, variant_id, required_qty, picked_qty, description")
        .eq("fulfillment_id", fulfillmentId)
        .limit(2000);

      if (iErr) return redirectToFulfillment(req, fulfillmentId, { error: iErr.message });

      const rows = (Array.isArray(items) ? items : []).filter(
        (x: any) => !isVirtualWarehouseBulkDepositLineDescription(x.description)
      );
      if (!rows.length) return redirectToFulfillment(req, fulfillmentId, { error: "No fulfillment lines found" });

      const variantIds = Array.from(new Set(rows.map((x: any) => String(x.variant_id)))).filter(Boolean);
      const dropshipByVariant: Record<string, number> = {};

      if (variantIds.length) {
        const { data: dropshipF } = await sb
          .from("fulfillments")
          .select("id")
          .eq("order_id", orderId)
          .eq("fulfillment_source", "DROPSHIP");

        const dropIds = (dropshipF ?? []).map((f: any) => String(f.id)).filter(Boolean);
        if (dropIds.length) {
          const { data: dropItems } = await sb
            .from("fulfillment_items")
            .select("variant_id, required_qty")
            .in("fulfillment_id", dropIds as any)
            .in("variant_id", variantIds as any);

          for (const it of dropItems ?? []) {
            const vid = String((it as any).variant_id || "");
            if (!vid) continue;
            dropshipByVariant[vid] = safeNum(dropshipByVariant[vid]) + safeNum((it as any).required_qty);
          }
        }
      }

      const anyShort = rows.some((x: any) => {
        const req = safeNum(x.required_qty);
        const picked = safeNum(x.picked_qty);
        const dropshipAssigned = safeNum(dropshipByVariant[String(x.variant_id) || ""]);
        return Math.max(0, req - picked - dropshipAssigned) > 0;
      });
      if (anyShort) {
        return redirectToFulfillment(req, fulfillmentId, { error: "Cannot close: some lines are not fully picked." });
      }

      itemCountForAudit = rows.length;
    }

    const now = new Date().toISOString();
    const actorUserId = ctx?.user?.id ? String(ctx.user.id) : null;

    // 1) Close fulfillment
    const { error: closeErr } = await sb
      .from("fulfillments")
      .update({ status: "CLOSED", closed_at: now })
      .eq("id", fulfillmentId)
      .eq("status", "OPEN");

    if (closeErr) return redirectToFulfillment(req, fulfillmentId, { error: closeErr.message });

    // 2) If invoice exists, issue it if draft (best-effort)
    if (invoiceId && UUID_RE.test(invoiceId)) {
      try {
        const { data: inv } = await sb.from("invoices").select("id, status").eq("id", invoiceId).maybeSingle();
        if (inv?.id && safeUpper(inv.status) === "DRAFT") {
          await sb.from("invoices").update({ status: "ISSUED", issued_at: now }).eq("id", invoiceId);
        }
      } catch {
        // ignore
      }
    }

    // 3) Recompute order status
    const { data: stillOpen } = await sb
      .from("fulfillments")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "OPEN")
      .limit(1);

    if (Array.isArray(stillOpen) && stillOpen.length > 0) {
      // still fulfilling
      try {
        await setOrderStatusWithEvent(sb, orderId, "FULFILLING", actorUserId);
      } catch {}
    } else {
      // none open left: bill from the invoice (Invoiced / Paid), never Completed
      const { data: invRow } = await sb
        .from("invoices")
        .select("id, status, amount_paid, total, voided_at")
        .eq("order_id", orderId)
        .eq("invoice_kind", INVOICE_KIND_PRIMARY)
        .maybeSingle();
      const nextOrderStatus = orderStatusFromPrimaryInvoice(invRow ?? null);

      try {
        await setOrderStatusWithEvent(sb, orderId, nextOrderStatus, actorUserId);
      } catch {}
    }

    // 4) Audit
    try {
      await sb.from("order_audit_log").insert({
        order_id: orderId,
        actor_user_id: String(actorUserId ?? ""),
        action: "FULFILLMENT_CLOSED",
        meta: {
          fulfillment_id: fulfillmentId,
          invoice_id: invoiceId,
          item_count: itemCountForAudit,
          fulfillment_source: src,
        },
        ip: getClientIp(req),
        user_agent: req.headers.get("user-agent"),
      });
    } catch {}

    return redirectToFulfillment(req, fulfillmentId, {
      ok: "1",
      msg: "Fulfillment closed. Order status updated (FULFILLING / NEEDS_INVOICE / INVOICED / PAID).",
    });
  } catch (e: any) {
    return redirectToFulfillment(req, fulfillmentId, {
      error: e?.message ? String(e.message) : "Unexpected error closing fulfillment",
    });
  }
}
