import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { buildShippingEmailHtml } from "@/lib/orders/orderEmails";
import { formatFedexServiceLabel } from "@/lib/fedex/shippingPriorityMap";
import { sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function qtyFromFulfillmentItem(row: { picked_qty?: unknown; required_qty?: unknown }): number {
  const picked = safeNum(row.picked_qty);
  const req = safeNum(row.required_qty);
  if (picked > 0) return picked;
  if (req > 0) return req;
  return 0;
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function addressHtml(v: any): string {
  if (!v || typeof v !== "object") return "—";
  const get = (k: string) => (v as any)?.[k] ?? "";
  const parts = [
    get("company"),
    get("name"),
    get("attn") ? `Attn: ${get("attn")}` : "",
    get("line1"),
    get("line2"),
    [get("city"), get("state"), get("postal") || get("zip")].filter(Boolean).join(", "),
    get("country"),
    get("phone") ? `Phone: ${get("phone")}` : "",
    get("email") ? `Email: ${get("email")}` : "",
  ].filter((x) => String(x || "").trim().length > 0);
  const text = parts.length ? parts.join("\n") : "—";
  return escapeHtml(text).replace(/\n/g, "<br />");
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function baseUrlFromReq(req: Request): string {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

function buildTrackingLink(carrierRaw: string, trackingRaw: string) {
  const carrier = safeUpper(carrierRaw);
  const tracking = safeStr(trackingRaw);
  if (!tracking) return null;
  if (carrier.includes("FEDEX")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}`;
  if (carrier.includes("UPS")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}`;
  if (carrier.includes("USPS")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tracking)}`;
  return null;
}

function extractPackingSlipPath(meta: any) {
  return (
    safeStr(meta?.packing_slip?.path) ||
    safeStr(meta?.packing_slip_path) ||
    safeStr(meta?.docs?.packing_slip?.path) ||
    ""
  );
}

function extractInventoryShipping(meta: any, f: any) {
  const ship = meta?.shipping && typeof meta.shipping === "object" ? meta.shipping : {};
  return {
    carrier: safeStr(ship?.carrier),
    tracking: safeStr(ship?.tracking_number) || safeStr(f?.tracking_number),
    labelUrl: safeStr(ship?.label_url),
    shippedAt: safeStr(ship?.shipped_at) || safeStr(f?.shipped_at),
    noTracking: !!ship?.no_tracking,
  };
}

function extractDropshipShipping(f: any) {
  return {
    carrier: safeStr(f?.dropship_carrier),
    tracking: safeStr(f?.dropship_tracking_number),
    shipDate: safeStr(f?.dropship_ship_date),
    packingSlipNo: safeStr(f?.dropship_packing_slip_number),
  };
}

function shippingSignals(f: any, meta: any) {
  const source = safeUpper(f?.fulfillment_source);
  const packingSlipPath = extractPackingSlipPath(meta);

  if (source === "DROPSHIP") {
    const ds = extractDropshipShipping(f);
    const shippingInfoSaved = !!ds.tracking || !!ds.shipDate;
    const packingSlipGenerated = !!ds.packingSlipNo;
    return { shippingInfoSaved, packingSlipGenerated, tracking: ds.tracking, carrier: ds.carrier, shippedAt: ds.shipDate };
  }

  const inv = extractInventoryShipping(meta, f);
  const shippingInfoSaved = !!inv.tracking || !!inv.labelUrl || !!inv.noTracking || !!inv.shippedAt;
  const packingSlipGenerated = !!packingSlipPath;
  return { shippingInfoSaved, packingSlipGenerated, tracking: inv.tracking, carrier: inv.carrier, shippedAt: inv.shippedAt };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }
  const form = await req.formData().catch(() => null);
  const skipRequested = safeStr(form?.get("skip")).toLowerCase() === "1" || safeStr(form?.get("skip")).toLowerCase() === "true";
  const undoRequested = safeStr(form?.get("undo")).toLowerCase() === "1" || safeStr(form?.get("undo")).toLowerCase() === "true";

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select(
      "id, account_id, order_number, delivery_address, invoice_address, shipping_priority, subtotal, shipping_total, total, submitted_by_contact_id, created_by_user_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });

  const { data: acct } = await sb
    .from("accounts")
    .select("name, billing_email")
    .eq("id", order.account_id)
    .maybeSingle();

  const { data: fulfillments } = await sb
    .from("fulfillments")
    .select(
      "id, status, fulfillment_source, tracking_number, shipped_at, metadata, dropship_tracking_number, dropship_carrier, dropship_ship_date, dropship_packing_slip_number"
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const fulfillmentRows = Array.isArray(fulfillments) ? fulfillments : [];
  const openFulfillments = fulfillmentRows.filter((f: any) => safeUpper(f.status) === "OPEN");
  // Prefer INVENTORY when multiple open (matches order page flow; avoids wrong fulfillment)
  const openFulfillment =
    openFulfillments.find((f: any) => safeUpper(f.fulfillment_source || "") === "INVENTORY") ??
    openFulfillments[0] ??
    null;
  const latestFulfillment = fulfillmentRows.length ? fulfillmentRows[fulfillmentRows.length - 1] : null;
  const fRow = openFulfillment ?? latestFulfillment;

  if (!fRow) {
    return NextResponse.json({ ok: false, error: "No fulfillment found for this order." }, { status: 400 });
  }

  const [{ data: items }, { data: fulfillmentShipRows }] = await Promise.all([
    sb
      .from("order_items")
      .select("description, quantity, line_total, line_type, sort_order")
      .eq("order_id", orderId)
      .order("sort_order", { ascending: true }),
    sb
      .from("fulfillment_items")
      .select("description, required_qty, picked_qty, sort_order")
      .eq("fulfillment_id", fRow.id)
      .order("sort_order", { ascending: true }),
  ]);

  const meta: any = typeof fRow.metadata === "object" && fRow.metadata ? fRow.metadata : {};
  const prevConfirm = meta?.shipping_confirmation && typeof meta.shipping_confirmation === "object" ? meta.shipping_confirmation : {};
  const alreadyConfirmed = !!prevConfirm?.sent_at || !!prevConfirm?.skipped_at;

  if (undoRequested) {
    if (prevConfirm?.skipped_at) {
      try {
        const nextMeta = {
          ...meta,
          shipping_confirmation: {
            ...prevConfirm,
            skipped_at: null,
            skipped_by: null,
            skipped: false,
            fulfillment_id: fRow.id,
          },
        };
        await sb.from("fulfillments").update({ metadata: nextMeta }).eq("id", fRow.id);
      } catch {}
      try {
        await sb.from("order_audit_log").insert({
          order_id: orderId,
          actor_user_id: String(ctx?.user?.id ?? ""),
          action: "SHIPPING_CONFIRMATION_UNSKIPPED",
          meta: { fulfillment_id: fRow.id },
        });
      } catch {}
    }
    const backFulfillmentId = prevConfirm?.fulfillment_id ?? fRow.id;
    return NextResponse.redirect(
      urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(backFulfillmentId)}?ok=1&msg=Shipping%20confirmation%20restored`)
    );
  }

  if (skipRequested) {
    if (!alreadyConfirmed) {
      try {
        const nextMeta = {
          ...meta,
          shipping_confirmation: {
            ...prevConfirm,
            skipped_at: new Date().toISOString(),
            skipped_by: String(ctx?.user?.id ?? ""),
            fulfillment_id: fRow.id,
            skipped: true,
          },
        };
        await sb.from("fulfillments").update({ metadata: nextMeta }).eq("id", fRow.id);
      } catch {}
      try {
        await sb.from("order_audit_log").insert({
          order_id: orderId,
          actor_user_id: String(ctx?.user?.id ?? ""),
          action: "SHIPPING_CONFIRMATION_SKIPPED",
          meta: { fulfillment_id: fRow.id },
        });
      } catch {}
    }
    return NextResponse.redirect(
      urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(fRow.id)}?ok=1&msg=Shipping%20confirmation%20skipped`)
    );
  }
  const signals = shippingSignals(fRow, meta);
  if (!signals.packingSlipGenerated || !signals.shippingInfoSaved) {
    return NextResponse.json(
      { ok: false, error: "Packing slip and shipping info must be generated before emailing." },
      { status: 400 }
    );
  }

  let customerEmail = "";
  if (order.submitted_by_contact_id) {
    const { data: contact } = await sb
      .from("account_contacts")
      .select("email")
      .eq("id", order.submitted_by_contact_id)
      .maybeSingle();
    customerEmail = safeStr(contact?.email);
  }
  if (!customerEmail && order.created_by_user_id) {
    const { data: profile } = await sb
      .from("user_profiles")
      .select("email")
      .eq("user_id", order.created_by_user_id)
      .maybeSingle();
    customerEmail = safeStr(profile?.email);
  }
  const { data: invoiceRow } = await sb
    .from("invoices")
    .select("id, metadata, invoice_address")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();
  if (!customerEmail) {
    const invMeta: any = invoiceRow?.metadata ?? {};
    customerEmail = safeStr(invMeta?.billing_email) || safeStr(invMeta?.invoice_email);
  }
  if (!customerEmail) {
    customerEmail = safeStr((invoiceRow as any)?.invoice_address?.email);
  }
  if (!customerEmail) {
    customerEmail =
      safeStr(order?.delivery_address?.email) ||
      safeStr(order?.invoice_address?.email) ||
      safeStr(acct?.billing_email);
  }
  if (!customerEmail) {
    return NextResponse.json({ ok: false, error: "No customer email found for this order." }, { status: 400 });
  }

  const fiShip = (fulfillmentShipRows ?? []).filter((r: any) => qtyFromFulfillmentItem(r) > 0);
  let linesText = "";
  if (fiShip.length) {
    linesText = fiShip
      .slice(0, 50)
      .map((it: any) => {
        const qty = qtyFromFulfillmentItem(it);
        const desc = String(it.description ?? "Item");
        return `- ${qty} × ${desc}`;
      })
      .join("\n");
  } else {
    const productLines = (items ?? []).filter((x: any) => String(x.line_type ?? "").toUpperCase() !== "SHIPPING");
    linesText = productLines
      .slice(0, 50)
      .map((it: any) => {
        const qty = Number(it.quantity) || 0;
        const desc = String(it.description ?? "Item");
        const lt = money(it.line_total);
        return `- ${qty} × ${desc} = ${lt}`;
      })
      .join("\n");
  }
  const linesHtml = linesText ? escapeHtml(linesText).replace(/\n/g, "<br />") : "—";

  const orderNumber = String(order.order_number ?? orderId);
  const shippedAtLabel = signals.shippedAt || new Date().toLocaleString();
  const trackingUrl = buildTrackingLink(signals.carrier || "", signals.tracking || "") || undefined;

  const base = baseUrlFromReq(req);
  const portalUrl = `${base}/portal/orders/${encodeURIComponent(orderId)}`;

  const fulfillmentShip = meta?.shipping && typeof meta.shipping === "object" ? meta.shipping : {};
  const actualService = safeStr(fulfillmentShip?.service);
  const serviceChangeReason = safeStr(fulfillmentShip?.service_change_reason);
  const serviceChangedFrom = safeStr(fulfillmentShip?.service_changed_from);

  const html = buildShippingEmailHtml({
    title: "Your order has shipped",
    subtitle: "Tracking details are included below.",
    orderNumber,
    accountName: acct?.name ?? "—",
    shippedAt: shippedAtLabel,
    shippingService: actualService
      ? formatFedexServiceLabel(actualService, { saturdayDelivery: !!fulfillmentShip?.saturday_delivery })
      : undefined,
    serviceChangeReason: serviceChangeReason || undefined,
    serviceChangedFrom: serviceChangedFrom ? formatFedexServiceLabel(serviceChangedFrom) : undefined,
    shippingPriority: String(order.shipping_priority ?? "—"),
    billingHtml: addressHtml(order.invoice_address),
    shippingHtml: addressHtml(order.delivery_address),
    totals: {
      subtotal: money(order.subtotal),
      shipping: money(order.shipping_total),
      total: money(order.total),
    },
    linesHtml,
    tracking: {
      carrier: signals.carrier || undefined,
      trackingNumber: signals.tracking || undefined,
      trackingUrl,
    },
    portalUrl,
  });

  let attachment: { filename: string; contentType: string; contentBytesBase64: string } | null = null;
  try {
    const ps = meta?.packing_slip ?? {};
    const bucket = safeStr(ps?.bucket) || "order-private";
    const path = safeStr(ps?.path);
    if (path) {
      const { data: fileData } = await sb.storage.from(bucket).download(path);
      if (fileData) {
        const buf = Buffer.from(await fileData.arrayBuffer());
        attachment = {
          filename: "packing-slip.pdf",
          contentType: "application/pdf",
          contentBytesBase64: buf.toString("base64"),
        };
      }
    }
  } catch {}

  try {
    await sendEmail({
      to: customerEmail,
      subject: `Shipping confirmation: ${orderNumber}`,
      emailType: "order",
      html,
      attachments: attachment ? [attachment] : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to send shipping email." },
      { status: 500 }
    );
  }

  // Track sent on fulfillment metadata
  try {
    const prevMeta = typeof fRow.metadata === "object" && fRow.metadata ? fRow.metadata : {};
    const nextMeta = {
      ...prevMeta,
      shipping_confirmation: {
        sent_at: new Date().toISOString(),
        sent_to: customerEmail,
        fulfillment_id: fRow.id,
      },
    };
    await sb.from("fulfillments").update({ metadata: nextMeta }).eq("id", fRow.id);
  } catch {}

  // Sync fulfillment shipping to invoice metadata so portal displays it
  const source = safeUpper(fRow.fulfillment_source);
  const shipForInvoice =
    source === "DROPSHIP"
      ? {
          carrier: safeStr(fRow.dropship_carrier),
          tracking_number: safeStr(fRow.dropship_tracking_number),
          shipped_at: safeStr(fRow.dropship_ship_date) || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : {
          carrier: safeStr(fulfillmentShip?.carrier) || safeStr(fRow.tracking_number ? "FedEx" : ""),
          tracking_number: safeStr(fulfillmentShip?.tracking_number) || safeStr(fRow.tracking_number),
          label_url: safeStr(fulfillmentShip?.label_url),
          shipped_at: safeStr(fulfillmentShip?.shipped_at) || safeStr(fRow.shipped_at),
          no_tracking: !!fulfillmentShip?.no_tracking,
          updated_at: new Date().toISOString(),
          service: safeStr(fulfillmentShip?.service),
          service_change_reason: safeStr(fulfillmentShip?.service_change_reason),
          service_changed_from: safeStr(fulfillmentShip?.service_changed_from),
          service_changed_to: safeStr(fulfillmentShip?.service_changed_to),
        };
  const hasShippingData =
    shipForInvoice.carrier ||
    shipForInvoice.tracking_number ||
    shipForInvoice.label_url ||
    shipForInvoice.shipped_at ||
    (shipForInvoice as any).no_tracking;
  if (invoiceRow?.id && hasShippingData) {
    try {
      const prevInvMeta: any = invoiceRow.metadata ?? {};
      const nextInvMeta = {
        ...prevInvMeta,
        shipping: { ...(prevInvMeta?.shipping ?? {}), ...shipForInvoice },
      };
      await sb.from("invoices").update({ metadata: nextInvMeta }).eq("id", invoiceRow.id);
    } catch {}
  }

  try {
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: String(ctx?.user?.id ?? ""),
      action: "SHIPPING_CONFIRMED",
      meta: { to: customerEmail, fulfillment_id: fRow.id, tracking: signals.tracking || null, carrier: signals.carrier || null },
    });
  } catch {}

  // Redirect to the fulfillment page so user stays in context (avoids landing on wrong fulfillment)
  return NextResponse.redirect(
    urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(fRow.id)}?ok=1&msg=Shipping%20email%20sent`)
  );
}
