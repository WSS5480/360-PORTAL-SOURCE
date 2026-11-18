import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canViewOrders } from "@/lib/portal/portalRoles";
import { applyPortalOrdersScope } from "@/lib/portal/portalRowScope";
import { buildTrackingLink, safeHttpUrl } from "@/lib/shipping/buildTrackingLink";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function packingSlipPathFromFulfillment(f: any): string {
  const meta = f?.metadata && typeof f.metadata === "object" ? f.metadata : {};
  const slip = meta?.packing_slip && typeof meta.packing_slip === "object" ? meta.packing_slip : {};
  return safeStr(slip?.path);
}

function pickPackingSlipFulfillmentId(fulfillments: any[]): string | null {
  const withSlip = (fulfillments ?? [])
    .filter((f) => packingSlipPathFromFulfillment(f).length > 0)
    .slice()
    .sort((a, b) => {
      const tb = new Date(String(b?.created_at ?? 0)).getTime();
      const ta = new Date(String(a?.created_at ?? 0)).getTime();
      return tb - ta;
    });
  const id = withSlip[0]?.id;
  return id ? String(id) : null;
}

/** Match portal order detail: invoice shipping first, else fulfillment metadata / dropship. */
function resolvePortalShipmentTracking(inv: any, fulfillments: any[]) {
  const invMeta: any = inv?.metadata && typeof inv.metadata === "object" ? inv.metadata : {};
  let shipMeta: any = invMeta?.shipping && typeof invMeta.shipping === "object" ? invMeta.shipping : {};

  if (!shipMeta?.tracking_number && !shipMeta?.label_url) {
    const fWithShip = (fulfillments ?? []).find((f: any) => {
      const m = f?.metadata && typeof f.metadata === "object" ? f.metadata : {};
      const s = m?.shipping && typeof m.shipping === "object" ? m.shipping : {};
      return s?.tracking_number || s?.label_url || (f as any)?.tracking_number;
    });
    if (fWithShip) {
      const m = fWithShip?.metadata && typeof fWithShip.metadata === "object" ? fWithShip.metadata : {};
      const s = m?.shipping && typeof m.shipping === "object" ? m.shipping : {};
      const src = String((fWithShip as any)?.fulfillment_source || "").toUpperCase();
      if (src === "DROPSHIP") {
        const carrier = safeStr((fWithShip as any)?.dropship_carrier);
        const tracking = safeStr((fWithShip as any)?.dropship_tracking_number);
        return {
          carrier: carrier || null,
          tracking: tracking || null,
          url: buildTrackingLink(carrier, tracking) || null,
        };
      }
      const carrier = safeStr(s?.carrier);
      const tracking = safeStr(s?.tracking_number) || safeStr((fWithShip as any)?.tracking_number);
      const labelUrl = safeHttpUrl(s?.label_url);
      return {
        carrier: carrier || null,
        tracking: tracking || null,
        url: buildTrackingLink(carrier, tracking) || (labelUrl || null),
      };
    }
  }

  const tracking = safeStr(shipMeta?.tracking_number);
  const carrier = safeStr(shipMeta?.carrier);
  const labelUrl = safeHttpUrl(shipMeta?.label_url);
  return {
    carrier: carrier || null,
    tracking: tracking || null,
    url: buildTrackingLink(carrier, tracking) || (labelUrl || null),
  };
}

function aggregateLinesForOrder(rows: any[]) {
  const byVid = new Map<
    string,
    { sku: string; product_name: string | null; quantity: number; serials: Set<string>; lots: Set<string> }
  >();
  for (const r of rows) {
    const vid = safeStr(r.product_variant_id);
    if (!UUID_RE.test(vid)) continue;
    let g = byVid.get(vid);
    if (!g) {
      g = {
        sku: safeStr(r.sku),
        product_name: (r.product_name as string | null) ?? null,
        quantity: 0,
        serials: new Set<string>(),
        lots: new Set<string>(),
      };
      byVid.set(vid, g);
    }
    g.quantity += safeNum(r.quantity);
    if (r.serial_number) g.serials.add(String(r.serial_number));
    if (r.lot_number) g.lots.add(String(r.lot_number));
  }
  return Array.from(byVid.entries()).map(([product_variant_id, g]) => ({
    product_variant_id,
    sku: g.sku,
    product_name: g.product_name,
    quantity: g.quantity,
    serials: [...g.serials],
    lots: [...g.lots],
  }));
}

export async function GET() {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  if (!canViewOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const sb: any = createSupabaseAdminClient();
  const portalUserId = String((ctx.user as any)?.id ?? "");

  const { data: pricing } = await sb
    .from("account_pricing")
    .select("virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!(pricing as any)?.virtual_warehouse_enabled) {
    return NextResponse.json({ ok: false, error: "Virtual warehouse is not enabled for this account." }, { status: 403 });
  }

  const vwUserOk = await portalUserHasVirtualWarehouseAccess(sb, String(accountId), portalUserId);
  if (!vwUserOk) {
    return NextResponse.json({ ok: false, error: "Virtual warehouse access is not enabled for your user." }, { status: 403 });
  }

  let actOrdQ = sb
    .from("orders")
    .select("id, order_number, placed_at, created_at, status")
    .eq("account_id", accountId)
    .eq("virtual_warehouse_shipment", true)
    .not("placed_at", "is", null);
  const scopedActivity = await applyPortalOrdersScope(sb, actOrdQ, accountId, portalUserId, ctx.currentRole);

  const { data: orders, error: ordErr } = await scopedActivity.query.order("placed_at", { ascending: false }).limit(100);

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });

  const orderIds: string[] = ((orders ?? []) as Array<{ id?: unknown }>)
    .map((o) => String(o?.id ?? ""))
    .filter((id): id is string => UUID_RE.test(id));
  if (!orderIds.length) {
    return NextResponse.json({ ok: true, activity: [], shipment_orders: [] });
  }

  const { data: invoiceRows } = await sb
    .from("invoices")
    .select("id, order_id, invoice_number, status, metadata, created_at")
    .in("order_id", orderIds)
    .eq("invoice_kind", "PRIMARY")
    .order("created_at", { ascending: false })
    .limit(500);

  const invoiceByOrder = new Map<string, any>();
  for (const inv of invoiceRows ?? []) {
    const oid = safeStr((inv as any).order_id);
    if (!oid || invoiceByOrder.has(oid)) continue;
    invoiceByOrder.set(oid, inv);
  }

  const { data: fulfills, error: fErr } = await sb
    .from("fulfillments")
    .select(
      "id, order_id, status, created_at, shipped_at, metadata, fulfillment_source, dropship_carrier, dropship_tracking_number, dropship_ship_date"
    )
    .in("order_id", orderIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });

  const fulfillmentIds = (fulfills ?? []).map((f: any) => String(f.id)).filter((id: string) => UUID_RE.test(id));

  let fiRows: any[] = [];
  if (fulfillmentIds.length) {
    const { data: fi, error: fiErr } = await sb
      .from("fulfillment_items")
      .select("id, fulfillment_id, variant_id, order_item_id, required_qty")
      .in("fulfillment_id", fulfillmentIds)
      .limit(5000);

    if (fiErr) return NextResponse.json({ ok: false, error: fiErr.message }, { status: 500 });
    fiRows = fi ?? [];
  }

  const fiIds = (fiRows ?? []).map((r: any) => String(r.id)).filter((id: string) => UUID_RE.test(id));

  const traceByFi = new Map<string, { serial: string | null; lot: string | null }[]>();
  if (fiIds.length) {
    const { data: traces, error: trErr } = await sb
      .from("fulfillment_item_trace")
      .select("fulfillment_item_id, serial_number, lot_number")
      .in("fulfillment_item_id", fiIds)
      .limit(20000);

    if (!trErr && traces) {
      for (const t of traces as any[]) {
        const fid = safeStr(t.fulfillment_item_id);
        if (!fid) continue;
        const list = traceByFi.get(fid) ?? [];
        list.push({
          serial: t.serial_number ? String(t.serial_number) : null,
          lot: t.lot_number ? String(t.lot_number) : null,
        });
        traceByFi.set(fid, list);
      }
    }
  }

  const variantIds = Array.from(
    new Set((fiRows ?? []).map((r: any) => String(r.variant_id || "")).filter((x: string) => UUID_RE.test(x)))
  );

  const metaByVid: Record<string, { sku: string; product_name: string | null }> = {};
  async function loadVariantMeta(ids: string[]) {
    const need = ids.filter((id) => UUID_RE.test(id) && !metaByVid[id]);
    if (!need.length) return;
    const { data: vrows } = await sb.from("product_variants").select("id, sku, products(name)").in("id", need);
    for (const v of vrows ?? []) {
      const pv: any = v;
      const pname =
        pv.products && typeof pv.products === "object" && pv.products?.name ? String(pv.products.name) : null;
      metaByVid[String(pv.id)] = { sku: String(pv.sku ?? ""), product_name: pname };
    }
  }

  await loadVariantMeta(variantIds);

  const orderById = new Map<string, any>((orders ?? []).map((o: any) => [String(o.id), o]));
  const fulfillById = new Map<string, any>((fulfills ?? []).map((f: any) => [String(f.id), f]));

  const fulfillmentsByOrder = new Map<string, any[]>();
  for (const f of fulfills ?? []) {
    const oid = safeStr((f as any).order_id);
    if (!oid) continue;
    const list = fulfillmentsByOrder.get(oid) ?? [];
    list.push(f);
    fulfillmentsByOrder.set(oid, list);
  }

  const activity: any[] = [];

  for (const fi of fiRows ?? []) {
    const fulfillmentId = safeStr((fi as any).fulfillment_id);
    const f = fulfillById.get(fulfillmentId);
    if (!f) continue;
    const orderId = safeStr(f.order_id);
    const ord = orderById.get(orderId);
    const vid = safeStr((fi as any).variant_id);
    const meta = metaByVid[vid] ?? { sku: "", product_name: null };
    const qty = safeNum((fi as any).required_qty);
    const traces = traceByFi.get(String((fi as any).id)) ?? [];
    const requestedAt = ord?.placed_at ?? ord?.created_at ?? f.created_at ?? null;
    const shippedAt = f.shipped_at ?? null;

    if (traces.length === 0) {
      activity.push({
        order_id: orderId,
        order_number: ord?.order_number ?? null,
        fulfillment_id: fulfillmentId,
        fulfillment_status: f.status ?? null,
        product_variant_id: vid,
        sku: meta.sku,
        product_name: meta.product_name,
        quantity: qty,
        serial_number: null as string | null,
        lot_number: null as string | null,
        requested_at: requestedAt,
        shipped_at: shippedAt,
      });
    } else {
      for (const tr of traces) {
        activity.push({
          order_id: orderId,
          order_number: ord?.order_number ?? null,
          fulfillment_id: fulfillmentId,
          fulfillment_status: f.status ?? null,
          product_variant_id: vid,
          sku: meta.sku,
          product_name: meta.product_name,
          quantity: 1,
          serial_number: tr.serial,
          lot_number: tr.lot,
          requested_at: requestedAt,
          shipped_at: shippedAt,
        });
      }
    }
  }

  const orderIdsWithFulfillment = new Set((fulfills ?? []).map((f: any) => safeStr(f.order_id)));
  const pendingOrderIds = orderIds.filter((oid: string) => !orderIdsWithFulfillment.has(oid));

  if (pendingOrderIds.length) {
    const { data: oiRows, error: oiErr } = await sb
      .from("order_items")
      .select("order_id, product_variant_id, quantity, description, line_type")
      .in("order_id", pendingOrderIds)
      .limit(2000);

    if (oiErr) return NextResponse.json({ ok: false, error: oiErr.message }, { status: 500 });

    const oiList = (oiRows ?? []) as any[];
    const pendingVariantIds: string[] = [
      ...new Set(
        oiList
          .filter((it: any) => safeStr(it.line_type).toUpperCase() === "PRODUCT" && safeStr(it.product_variant_id))
          .map((it: any) => safeStr(it.product_variant_id))
      ),
    ].filter((id) => UUID_RE.test(id));

    await loadVariantMeta(pendingVariantIds);

    for (const it of oiRows ?? []) {
      if (safeStr((it as any).line_type).toUpperCase() !== "PRODUCT") continue;
      const vid = safeStr((it as any).product_variant_id);
      if (!UUID_RE.test(vid)) continue;
      const oid = safeStr((it as any).order_id);
      const ord = orderById.get(oid);
      if (!ord) continue;
      const meta = metaByVid[vid] ?? { sku: "", product_name: null };
      const qty = safeNum((it as any).quantity);
      if (qty <= 0) continue;

      activity.push({
        order_id: oid,
        order_number: ord?.order_number ?? null,
        fulfillment_id: null,
        fulfillment_status: "AWAITING_FULFILLMENT",
        product_variant_id: vid,
        sku: meta.sku,
        product_name: meta.product_name,
        quantity: qty,
        serial_number: null as string | null,
        lot_number: null as string | null,
        requested_at: ord?.placed_at ?? ord?.created_at ?? null,
        shipped_at: null,
      });
    }
  }

  activity.sort((a, b) => {
    const ta = new Date(String(b.requested_at || 0)).getTime() - new Date(String(a.requested_at || 0)).getTime();
    return ta;
  });

  const activityByOrder = new Map<string, any[]>();
  for (const row of activity) {
    const oid = safeStr((row as any).order_id);
    if (!oid) continue;
    const list = activityByOrder.get(oid) ?? [];
    list.push(row);
    activityByOrder.set(oid, list);
  }

  const shipment_orders = (orders ?? []).map((ord: any) => {
    const oid = String(ord.id);
    const fs = fulfillmentsByOrder.get(oid) ?? [];
    const inv = invoiceByOrder.get(oid) ?? null;
    const invMeta: any = inv?.metadata && typeof inv.metadata === "object" ? inv.metadata : {};
    const hasInvoicePdf = !!safeStr(invMeta?.invoice_pdf_path);

    const slipFid = pickPackingSlipFulfillmentId(fs);
    const trackingInfo = resolvePortalShipmentTracking(inv, fs);
    const shipped =
      fs.some((f: any) => !!safeStr(f.shipped_at)) || !!safeStr(trackingInfo.tracking) || !!trackingInfo.url;

    const rowsForOrder = activityByOrder.get(oid) ?? [];
    const lines = aggregateLinesForOrder(rowsForOrder);

    return {
      order_id: oid,
      order_number: ord?.order_number ?? null,
      order_status: ord?.status ?? null,
      placed_at: ord?.placed_at ?? ord?.created_at ?? null,
      invoice: inv
        ? {
            id: String(inv.id),
            invoice_number: inv.invoice_number ?? null,
            status: inv.status ?? null,
            has_pdf: hasInvoicePdf,
          }
        : null,
      packing_slip_fulfillment_id: slipFid,
      packing_slip_available: !!slipFid,
      shipped,
      tracking_url: trackingInfo.url,
      carrier: trackingInfo.carrier,
      tracking_number: trackingInfo.tracking,
      lines,
    };
  });

  return NextResponse.json({ ok: true, activity, shipment_orders });
}
