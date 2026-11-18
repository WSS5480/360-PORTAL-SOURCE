// src/app/api/admin/fulfillments/[fulfillmentId]/fedex-label/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getFedexRatesOnly, getShipFromFromEnv, createFedexLabel } from "@/lib/fedex/client";
import { findPreferredQuote, preferredServiceUnavailableMessage } from "@/lib/fedex/rateQuotes";
import { serviceSupportsSaturdayDelivery } from "@/lib/fedex/shippingPriorityMap";
import { parseFedexShipTo } from "@/lib/shipping/fedexShipTo";

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

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parsePositiveNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function POST(
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

  const body = await req.json().catch(() => ({} as any));
  const weightLbs = parsePositiveNum(body?.weight_lbs);
  const lengthIn = parsePositiveNum(body?.length_in);
  const widthIn = parsePositiveNum(body?.width_in);
  const heightIn = parsePositiveNum(body?.height_in);
  const preferredService = typeof body?.preferred_service === "string" ? body.preferred_service.trim() : null;
  const createLabel = !!(body?.create_label === true || body?.create_label === "1");
  const saturdayDelivery = body?.saturday_delivery === true || body?.saturday_delivery === "1" || body?.saturday_delivery === 1;

  if (!weightLbs || !lengthIn || !widthIn || !heightIn) {
    return NextResponse.json(
      { ok: false, error: "Package weight and dimensions are required (lbs, inches)." },
      { status: 400 }
    );
  }

  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id, status, fulfillment_source, metadata")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  if (createLabel && String((f as any).status || "").toUpperCase() !== "OPEN") {
    return NextResponse.json(
      { ok: false, error: "Fulfillment must be OPEN to create a label." },
      { status: 400 }
    );
  }

  const { data: order, error: oErr } = await sb
    .from("orders")
    .select("id, delivery_address")
    .eq("id", f.order_id)
    .maybeSingle();

  if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const shipToRes = parseFedexShipTo(order.delivery_address);
  if (!shipToRes.ok) {
    return NextResponse.json({ ok: false, error: shipToRes.error }, { status: 400 });
  }

  let shipFrom;
  try {
    shipFrom = getShipFromFromEnv();
  } catch (e: any) {
    const msg = e?.message || "FedEx configuration error";
    return NextResponse.json(
      { ok: false, error: `${msg}. Ensure FEDEX_SHIP_FROM_* and FEDEX_CLIENT_ID/SECRET are set in production.` },
      { status: 500 }
    );
  }

  const pkg = { weightLbs, lengthIn, widthIn, heightIn };

  if (saturdayDelivery && preferredService && !serviceSupportsSaturdayDelivery(preferredService)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Saturday delivery is not available for FedEx Ground. Choose overnight or 2-day.",
      },
      { status: 400 }
    );
  }

  try {
    if (createLabel) {
      const result = await createFedexLabel({
        shipFrom,
        shipTo: shipToRes.value,
        pkg,
        preferredServiceType: preferredService,
        saturdayDelivery,
      });

      const bucket = "order-private";
      const storagePath = `fulfillments/${fulfillmentId}/fedex-label.pdf`;
      const pdfBuffer = Buffer.from(result.labelBase64, "base64");

      const { error: upErr } = await sb.storage.from(bucket).upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

      if (upErr) {
        throw new Error(`Failed to save label: ${upErr.message}`);
      }

      const { data: signed, error: sErr } = await sb.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 10);

      if (sErr) {
        throw new Error(`Failed to get label URL: ${sErr.message}`);
      }

      const signedUrl = signed?.signedUrl ?? null;
      // Store API path for label_url so it works after signed URL expires
      const labelUrlForStorage = `/api/admin/fulfillments/${fulfillmentId}/fedex-label/url`;
      const nowIso = new Date().toISOString();
      const prevMeta = typeof (f as any).metadata === "object" && (f as any).metadata ? (f as any).metadata : {};
      const prevShip = prevMeta?.shipping && typeof prevMeta.shipping === "object" ? prevMeta.shipping : {};

      const shippingObj = {
        ...prevShip,
        carrier: "FedEx",
        service: result.serviceType,
        tracking_number: result.trackingNumber,
        label_url: labelUrlForStorage,
        fedex_label_bucket: bucket,
        fedex_label_path: storagePath,
        weight_lbs: weightLbs,
        length_in: lengthIn,
        width_in: widthIn,
        height_in: heightIn,
        shipping_usd: result.totalNetCharge,
        saturday_delivery: saturdayDelivery,
        updated_at: nowIso,
      };

      const nextMeta = { ...prevMeta, shipping: shippingObj };

      await sb
        .from("fulfillments")
        .update({ metadata: nextMeta })
        .eq("id", fulfillmentId)
        .eq("status", "OPEN");

      return NextResponse.json({
        ok: true,
        carrier: "FedEx",
        service: result.serviceType,
        tracking_number: result.trackingNumber,
        label_url: labelUrlForStorage,
        label_url_immediate: signedUrl,
        shipping_usd: result.totalNetCharge,
        rates_only: false,
        saturday_delivery: saturdayDelivery,
        order_id: f.order_id ?? null,
      });
    }

    const quotes = await getFedexRatesOnly({
      shipFrom,
      shipTo: shipToRes.value,
      pkg,
      saturdayDelivery,
    });

    const preferred = preferredService ? findPreferredQuote(quotes, preferredService) : null;
    if (preferredService && !preferred) {
      return NextResponse.json(
        {
          ok: false,
          error: preferredServiceUnavailableMessage(preferredService, quotes, { saturdayDelivery }),
        },
        { status: 400 }
      );
    }
    const selected = preferred ?? quotes[0];

    return NextResponse.json({
      ok: true,
      carrier: "FedEx",
      service: selected.serviceType,
      shipping_usd: selected.totalNetCharge,
      rates_only: true,
      saturday_delivery: saturdayDelivery,
    });
  } catch (e: any) {
    const msg = e?.message || "FedEx error";
    const shipTo = shipToRes?.value;
    const addrHint =
      shipTo && msg.includes("No FedEx rates")
        ? ` Destination: ${shipTo.line1}, ${shipTo.city}, ${shipTo.state} ${shipTo.postal}.`
        : "";
    const body: { ok: false; error: string; fedex_debug?: unknown; fedex_request?: unknown; fedex_alerts?: string; fedex_errors?: string; fedex_output_messages?: string } = {
      ok: false,
      error: msg + addrHint,
    };
    const fr = (e as any)?.fedexResponse;
    const req = (e as any)?.fedexRequest;
    if (fr) {
      const errParts: string[] = [];
      if (Array.isArray(fr?.errors)) {
        for (const x of fr.errors) {
          const m = x?.message || x?.code || x?.localizedMessage || "";
          if (m) errParts.push(m);
          const params = Array.isArray(x?.parameterList) ? x.parameterList : [];
          const paramStrs = params.map((p: any) => `${p?.key || "?"}=${p?.value ?? ""}`).filter(Boolean);
          if (paramStrs.length) errParts.push("Fields: " + paramStrs.join(", "));
          if (!m && !paramStrs.length) errParts.push(JSON.stringify(x));
        }
      }
      const errs = errParts.join("; ");
      const alerts = Array.isArray(fr?.output?.alerts)
        ? fr.output.alerts.map((a: any) => a?.message || a?.code || a?.description || JSON.stringify(a)).join("; ")
        : "";
      const ts = Array.isArray(fr?.output?.transactionShipments) ? fr.output.transactionShipments[0] : null;
      const outputs = Array.isArray(ts?.outputs) ? ts.outputs : [];
      const outputMsgs = outputs
        .flatMap((o: any) =>
          (o?.customerMessages ?? []).map((m: any) => m?.message || m?.code || JSON.stringify(m))
        )
        .filter(Boolean)
        .join("; ");
      if (errs) body.fedex_errors = errs;
      if (alerts) body.fedex_alerts = alerts;
      if (outputMsgs) body.fedex_output_messages = outputMsgs;
      if (process.env.FEDEX_DEBUG === "1" || msg.includes("Error count") || msg.includes("Invalid field value")) {
        body.fedex_debug = fr;
        if (req) body.fedex_request = req;
      }
    }
    return NextResponse.json(body, { status: 500 });
  }
}
