import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { extractDropshipShipping, extractInventoryShipping } from "@/lib/admin/fulfillmentSignals";

export const dynamic = "force-dynamic";

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeUpper(v: unknown): string {
  return String(v ?? "").toUpperCase();
}

function deriveLocFromRaw(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  {
    const m = s.match(/(?:^|\|)\s*LOC\s*=\s*([^|]+)(?:\||$)/i);
    if (m) {
      const loc = norm(m[1]);
      if (loc) return loc;
    }
  }
  {
    const m = s.match(/\b([A-Za-z0-9]+\/Stock)\b\s*(?:\(\d+\))?/i);
    if (m) {
      const loc = norm(m[1]);
      if (loc) return loc;
    }
  }
  const known = ["WH/Stock", "ADBI/Stock"];
  for (const k of known) {
    if (s.toLowerCase().includes(k.toLowerCase())) return k;
  }
  return null;
}

type LotOut = {
  lot_row_id: string;
  variant_id: string;
  sku: string;
  product_name: string | null;
  lot_number: string | null;
  serial_number: string | null;
  qty: number;
  location: string | null;
  in_stock: boolean;
};

type OrderEventOut = {
  pick_id: string;
  fulfillment_id: string;
  order_id: string;
  order_number: string | null;
  order_date: string | null;
  account_id: string | null;
  account_name: string | null;
  placer_email: string | null;
  placer_name: string | null;
  pick_qty: number;
  picked_at: string | null;
  fulfillment_source: string | null;
  tracking_number: string | null;
  carrier: string | null;
  label_url: string | null;
  shipped_at: string | null;
  no_tracking: boolean;
  dropship_packing_slip_number: string | null;
  dropship_tracking: string | null;
  dropship_carrier: string | null;
  dropship_ship_date: string | null;
  internal_packing_slip_bucket: string | null;
  internal_packing_slip_path: string | null;
  internal_packing_slip_generated_at: string | null;
  admin_fulfillment_url: string;
  admin_order_url: string;
};

export async function GET(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const url = new URL(req.url);
  const qRaw = norm(url.searchParams.get("q"));
  if (!qRaw) {
    return NextResponse.json({ ok: false, error: "Missing q." }, { status: 400 });
  }
  if (qRaw.length < 2) {
    return NextResponse.json({ ok: false, error: "Enter at least 2 characters." }, { status: 400 });
  }

  const esc = qRaw.replace(/,/g, " ");
  const like = `%${esc}%`;

  const { data: lotData, error: lotErr } = await sb
    .from("product_variant_lots")
    .select("id, variant_id, lot_number, serial_number, expiration_date, qty, location, raw_scan, created_at")
    .or(`serial_number.ilike.${like},lot_number.ilike.${like},raw_scan.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(60);

  if (lotErr) return NextResponse.json({ ok: false, error: lotErr.message }, { status: 500 });

  const lotRows: any[] = Array.isArray(lotData) ? lotData : [];
  const lotIds = Array.from(new Set(lotRows.map((r) => String(r?.id ?? "")).filter(Boolean)));

  const variantIds = Array.from(new Set(lotRows.map((r) => String(r?.variant_id ?? "")).filter(Boolean)));
  const variantsById = new Map<string, { sku: string; product_id: string | null }>();
  const productsById = new Map<string, string | null>();

  if (variantIds.length) {
    const { data: vData, error: vErr } = await sb
      .from("product_variants")
      .select("id, sku, product_id")
      .in("id", variantIds);
    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    for (const row of vData ?? []) {
      const r = row as Record<string, unknown>;
      variantsById.set(String(r.id ?? ""), {
        sku: String(r.sku ?? ""),
        product_id: r.product_id ? String(r.product_id) : null,
      });
    }
    const productIds = Array.from(
      new Set(Array.from(variantsById.values()).map((v) => v.product_id).filter(Boolean))
    ) as string[];
    if (productIds.length) {
      const { data: pData, error: pErr } = await sb.from("products").select("id, name").in("id", productIds);
      if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
      for (const row of pData ?? []) {
        const r = row as Record<string, unknown>;
        productsById.set(String(r.id ?? ""), r.name != null ? String(r.name) : null);
      }
    }
  }

  const lotsOut: LotOut[] = lotRows.map((rr) => {
    const locCol = rr?.location != null ? String(rr.location).trim() : "";
    const derived = !locCol ? deriveLocFromRaw(rr?.raw_scan) : null;
    const location = locCol || derived || null;
    const vid = String(rr?.variant_id ?? "");
    const v = variantsById.get(vid);
    const qty = Number(rr?.qty ?? 0) || 0;
    return {
      lot_row_id: String(rr?.id ?? ""),
      variant_id: vid,
      sku: v?.sku ?? "—",
      product_name: v?.product_id ? productsById.get(v.product_id) ?? null : null,
      lot_number: rr?.lot_number != null ? String(rr.lot_number) : null,
      serial_number: rr?.serial_number != null ? String(rr.serial_number) : null,
      qty,
      location,
      in_stock: qty > 0,
    };
  });

  const pickSelect =
    "id, fulfillment_id, fulfillment_item_id, order_id, variant_id, qty, lot_row_id, raw_scan, is_undo, created_at";

  const picksByLot: any[] = [];
  if (lotIds.length) {
    const { data: p1, error: e1 } = await sb
      .from("fulfillment_picks")
      .select(pickSelect)
      .in("lot_row_id", lotIds)
      .eq("is_undo", false)
      .order("created_at", { ascending: false })
      .limit(120);
    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });
    picksByLot.push(...(Array.isArray(p1) ? p1 : []));
  }

  const { data: p2, error: e2 } = await sb
    .from("fulfillment_picks")
    .select(pickSelect)
    .ilike("raw_scan", like)
    .eq("is_undo", false)
    .order("created_at", { ascending: false })
    .limit(80);

  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

  const pickMap = new Map<string, any>();
  for (const p of [...picksByLot, ...(Array.isArray(p2) ? p2 : [])]) {
    const id = String((p as any)?.id ?? "");
    if (id) pickMap.set(id, p);
  }
  const picks = Array.from(pickMap.values());

  const lotIdSeen = new Set(lotsOut.map((l) => l.lot_row_id));
  const extraLotIds = new Set<string>();
  for (const p of picks) {
    const lid = String((p as any)?.lot_row_id ?? "").trim();
    if (lid && !lotIdSeen.has(lid)) extraLotIds.add(lid);
  }

  if (extraLotIds.size) {
    const { data: extraRows, error: xErr } = await sb
      .from("product_variant_lots")
      .select("id, variant_id, lot_number, serial_number, expiration_date, qty, location, raw_scan, created_at")
      .in("id", [...extraLotIds]);

    if (!xErr && Array.isArray(extraRows) && extraRows.length) {
      const needVids = new Set<string>();
      for (const rr of extraRows) {
        const vid = String((rr as any)?.variant_id ?? "").trim();
        if (vid && !variantsById.has(vid)) needVids.add(vid);
      }
      if (needVids.size) {
        const { data: vData2, error: vErr2 } = await sb
          .from("product_variants")
          .select("id, sku, product_id")
          .in("id", [...needVids]);
        if (vErr2) return NextResponse.json({ ok: false, error: vErr2.message }, { status: 500 });
        for (const row of vData2 ?? []) {
          const r = row as Record<string, unknown>;
          variantsById.set(String(r.id ?? ""), {
            sku: String(r.sku ?? ""),
            product_id: r.product_id ? String(r.product_id) : null,
          });
        }
        const productIds2 = Array.from(
          new Set(
            [...needVids]
              .map((vid) => variantsById.get(vid)?.product_id)
              .filter((pid): pid is string => !!pid)
              .filter((pid) => !productsById.has(pid))
          )
        );
        if (productIds2.length) {
          const { data: pData2, error: pErr2 } = await sb.from("products").select("id, name").in("id", productIds2);
          if (pErr2) return NextResponse.json({ ok: false, error: pErr2.message }, { status: 500 });
          for (const row of pData2 ?? []) {
            const r = row as Record<string, unknown>;
            productsById.set(String(r.id ?? ""), r.name != null ? String(r.name) : null);
          }
        }
      }

      for (const rr of extraRows) {
        const locCol = rr?.location != null ? String(rr.location).trim() : "";
        const derived = !locCol ? deriveLocFromRaw((rr as any)?.raw_scan) : null;
        const location = locCol || derived || null;
        const vid = String((rr as any)?.variant_id ?? "");
        const v = variantsById.get(vid);
        const qty = Number((rr as any)?.qty ?? 0) || 0;
        lotsOut.push({
          lot_row_id: String((rr as any)?.id ?? ""),
          variant_id: vid,
          sku: v?.sku ?? "—",
          product_name: v?.product_id ? productsById.get(v.product_id) ?? null : null,
          lot_number: (rr as any)?.lot_number != null ? String((rr as any).lot_number) : null,
          serial_number: (rr as any)?.serial_number != null ? String((rr as any).serial_number) : null,
          qty,
          location,
          in_stock: qty > 0,
        });
      }
    }
  }

  const fulfillmentIds = Array.from(
    new Set(picks.map((p) => String((p as any)?.fulfillment_id ?? "")).filter(Boolean))
  );

  const fulfillmentById = new Map<string, any>();
  if (fulfillmentIds.length) {
    const { data: fulData, error: fulErr } = await sb
      .from("fulfillments")
      .select(
        [
          "id",
          "order_id",
          "fulfillment_source",
          "metadata",
          "tracking_number",
          "shipped_at",
          "dropship_tracking_number",
          "dropship_carrier",
          "dropship_packing_slip_number",
          "dropship_ship_date",
        ].join(",")
      )
      .in("id", fulfillmentIds);
    if (fulErr) return NextResponse.json({ ok: false, error: fulErr.message }, { status: 500 });
    for (const f of fulData ?? []) fulfillmentById.set(String((f as any).id), f);
  }

  const orderIds = Array.from(
    new Set(picks.map((p) => String((p as any)?.order_id ?? "").trim()).filter(Boolean))
  );

  const ordersById = new Map<string, any>();
  if (orderIds.length) {
    const { data: ordData, error: ordErr } = await sb
      .from("orders")
      .select("id, account_id, order_number, placed_at, created_at, submitted_by_contact_id, created_by_user_id")
      .in("id", orderIds);
    if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
    for (const o of ordData ?? []) ordersById.set(String((o as any).id), o);
  }

  const accountIds = Array.from(
    new Set(Array.from(ordersById.values()).map((o: any) => String(o?.account_id ?? "").trim()).filter(Boolean))
  );
  const accountsById = new Map<string, string | null>();
  if (accountIds.length) {
    const { data: acctData } = await sb.from("accounts").select("id, name").in("id", accountIds);
    for (const a of acctData ?? []) accountsById.set(String((a as any).id), (a as any).name != null ? String((a as any).name) : null);
  }

  const contactIds = Array.from(
    new Set(
      Array.from(ordersById.values())
        .map((o: any) => o?.submitted_by_contact_id)
        .filter((x: any) => x != null && String(x).trim())
        .map((x: any) => String(x))
    )
  );
  const contactsById = new Map<string, { email: string | null; full_name: string | null }>();
  if (contactIds.length) {
    const { data: cData } = await sb.from("account_contacts").select("id, email, full_name").in("id", contactIds);
    for (const c of cData ?? []) {
      contactsById.set(String((c as any).id), {
        email: (c as any).email != null ? String((c as any).email) : null,
        full_name: (c as any).full_name != null ? String((c as any).full_name) : null,
      });
    }
  }

  const userIds = Array.from(
    new Set(
      Array.from(ordersById.values())
        .map((o: any) => o?.created_by_user_id)
        .filter((x: any) => x != null && String(x).trim())
        .map((x: any) => String(x))
    )
  );
  const profilesByUserId = new Map<string, { email: string | null; full_name: string | null }>();
  if (userIds.length) {
    const { data: prData } = await sb.from("user_profiles").select("user_id, email, full_name").in("user_id", userIds);
    for (const pr of prData ?? []) {
      profilesByUserId.set(String((pr as any).user_id), {
        email: (pr as any).email != null ? String((pr as any).email) : null,
        full_name: (pr as any).full_name != null ? String((pr as any).full_name) : null,
      });
    }
  }

  function placerForOrder(o: any): { email: string | null; name: string | null } {
    const cid = o?.submitted_by_contact_id ? String(o.submitted_by_contact_id) : "";
    if (cid) {
      const c = contactsById.get(cid);
      if (c?.email) return { email: c.email, name: c.full_name };
    }
    const uid = o?.created_by_user_id ? String(o.created_by_user_id) : "";
    if (uid) {
      const p = profilesByUserId.get(uid);
      if (p?.email) return { email: p.email, name: p.full_name };
    }
    return { email: null, name: null };
  }

  const orderEvents: OrderEventOut[] = [];

  for (const p of picks) {
    const pickId = String((p as any)?.id ?? "");
    const fulfillmentId = String((p as any)?.fulfillment_id ?? "");
    const orderId = String((p as any)?.order_id ?? "");
    if (!pickId || !fulfillmentId || !orderId) continue;

    const fRow = fulfillmentById.get(fulfillmentId);
    const order = ordersById.get(orderId);
    if (!order) continue;

    const source = safeUpper(fRow?.fulfillment_source || "INVENTORY");
    const inv = extractInventoryShipping(fRow);
    const ds = extractDropshipShipping(fRow);

    const meta: any = typeof fRow?.metadata === "object" && fRow?.metadata ? fRow.metadata : {};
    const ps: any = meta?.packing_slip ?? {};

    const placer = placerForOrder(order);
    const placed =
      safeStr((order as any)?.placed_at) ||
      safeStr((order as any)?.created_at) ||
      null;
    const accountId = order?.account_id ? String(order.account_id) : null;

    const evt: OrderEventOut = {
      pick_id: pickId,
      fulfillment_id: fulfillmentId,
      order_id: orderId,
      order_number: order?.order_number != null ? String(order.order_number) : null,
      order_date: placed,
      account_id: accountId,
      account_name: accountId ? accountsById.get(accountId) ?? null : null,
      placer_email: placer.email,
      placer_name: placer.name,
      pick_qty: Number((p as any)?.qty ?? 0) || 0,
      picked_at: (p as any)?.created_at != null ? String((p as any).created_at) : null,
      fulfillment_source: fRow?.fulfillment_source != null ? String(fRow.fulfillment_source) : null,
      tracking_number: null,
      carrier: null,
      label_url: null,
      shipped_at: null,
      no_tracking: false,
      dropship_packing_slip_number: null,
      dropship_tracking: null,
      dropship_carrier: null,
      dropship_ship_date: null,
      internal_packing_slip_bucket: null,
      internal_packing_slip_path: null,
      internal_packing_slip_generated_at: null,
      admin_fulfillment_url: `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}`,
      admin_order_url: `/admin/orders/${encodeURIComponent(orderId)}`,
    };

    if (source === "DROPSHIP") {
      evt.dropship_packing_slip_number = ds.packingSlipNo || null;
      evt.dropship_tracking = ds.tracking || null;
      evt.dropship_carrier = ds.carrier || null;
      evt.dropship_ship_date = ds.shipDate || null;
      evt.tracking_number = ds.tracking || null;
      evt.carrier = ds.carrier || null;
      evt.label_url = ds.labelUrl || null;
      evt.shipped_at = ds.shippedAt;
      evt.no_tracking = ds.noTracking;
    } else {
      evt.tracking_number = inv.tracking || null;
      evt.carrier = inv.carrier || null;
      evt.label_url = inv.labelUrl || null;
      evt.shipped_at = inv.shippedAt;
      evt.no_tracking = inv.noTracking;
      evt.internal_packing_slip_bucket = typeof ps?.bucket === "string" ? ps.bucket : null;
      evt.internal_packing_slip_path = typeof ps?.path === "string" ? ps.path : null;
      evt.internal_packing_slip_generated_at = typeof ps?.generated_at === "string" ? ps.generated_at : null;
    }

    orderEvents.push(evt);
  }

  orderEvents.sort((a, b) => {
    const ta = a.picked_at ? new Date(a.picked_at).getTime() : 0;
    const tb = b.picked_at ? new Date(b.picked_at).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ ok: true, query: qRaw, lots: lotsOut, order_events: orderEvents });
}
