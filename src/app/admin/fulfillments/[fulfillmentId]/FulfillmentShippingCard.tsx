"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { orderPriorityToFedexService, FEDEX_SERVICE_OPTIONS, formatFedexServiceLabel, serviceSupportsSaturdayDelivery } from "@/lib/fedex/shippingPriorityMap";
import { fedexServiceTypesMatch } from "@/lib/fedex/rateQuotes";
import { FEDEX_PACKAGE_PRESETS, findPresetByDimensions, getFedExPresetById } from "@/lib/fedex/packagePresets";
import FulfillmentShipToEditor from "./FulfillmentShipToEditor";

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.15)",
    fontSize: 14,
    fontWeight: 850,
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    outline: "none",
  };
}

function buttonStyle(primary?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: primary ? "#111" : "white",
    color: primary ? "white" : "black",
    fontWeight: 950,
    cursor: "pointer",
    width: "100%",
  };
}

function pill(tone: "ok" | "warn" | "muted"): React.CSSProperties {
  const bg =
    tone === "ok"
      ? "rgba(25,135,84,0.10)"
      : tone === "warn"
      ? "rgba(255,153,0,0.14)"
      : "rgba(0,0,0,0.05)";
  const color =
    tone === "ok"
      ? "rgba(25,135,84,1)"
      : tone === "warn"
      ? "rgba(180,90,0,1)"
      : "rgba(0,0,0,0.75)";
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.10)",
    background: bg,
    color,
    whiteSpace: "nowrap",
  };
}

type Shipping = {
  carrier?: string | null;
  tracking_number?: string | null;
  label_url?: string | null;
  no_tracking?: boolean | null;

  // optional extras (you may already store these elsewhere)
  service?: string | null;
  weight_lbs?: number | null;
  length_in?: number | null;
  width_in?: number | null;
  height_in?: number | null;
  notes?: string | null;

  // NEW: optional charge snapshot (string/number OK)
  shipping_usd?: string | number | null;

  // Service change (when admin changes from customer's choice)
  service_changed_from?: string | null;
  service_changed_to?: string | null;
  service_change_reason?: string | null;
  service_changed_at?: string | null;

  saturday_delivery?: boolean | null;
};

type ApiErr = { ok: false; error: string };

type ShipOk = {
  ok: true;
  fulfillment_id?: string;
  order_id?: string;
  invoice_id?: string | null;
  order_status?: string | null;
};

type ApiResp = ShipOk | ApiErr;

function buildTrackingLink(carrierRaw: string, tracking: string) {
  const c = safeUpper(carrierRaw);
  const t = safeTrim(tracking);
  if (!t) return null;

  if (c.includes("FEDEX")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`;
  if (c.includes("UPS")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`;
  if (c.includes("USPS")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`;
  return null;
}

function normalizeMoneyInput(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const s = safeTrim(raw);
  if (!s) return { ok: true, value: "" }; // blank = remove / no shipping
  // allow "12", "12.3", "12.34"
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return { ok: false, error: "Shipping price must be a number (max 2 decimals)." };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Shipping price must be a valid non-negative number." };
  // keep as string so server can decide exact rounding behavior
  return { ok: true, value: s };
}

function normalizeNumberInput(raw: string, label: string): { ok: true; value: string } | { ok: false; error: string } {
  const s = safeTrim(raw);
  if (!s) return { ok: false, error: `${label} is required.` };
  const n = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: `${label} must be a positive number.` };
  return { ok: true, value: String(n) };
}

export default function FulfillmentShippingCard(props: {
  fulfillmentId: string;
  orderId: string;
  deliveryAddress?: unknown;
  fulfillmentStatus: string; // OPEN/CLOSED
  existingShipping?: Shipping | null;
  /** Order's shipping_priority (customer choice) — used to pre-fill FedEx service type */
  orderShippingPriority?: string | null;
  accent?: { border: string; background: string; headerBackground: string; headerText?: string };
}) {
  const router = useRouter();

  const isClosed = useMemo(() => safeUpper(props.fulfillmentStatus) === "CLOSED", [props.fulfillmentStatus]);

  // Pre-fill service from order's shipping_priority when no existing shipping.service
  const initialService = useMemo(() => {
    if (props.existingShipping?.service) return props.existingShipping.service;
    const fedex = orderPriorityToFedexService(props.orderShippingPriority);
    return fedex ?? "";
  }, [props.existingShipping?.service, props.orderShippingPriority]);

  // Customer's original choice (for service change reason prompt)
  const customerChosenService = useMemo(() => {
    if (props.existingShipping?.service_changed_from) return props.existingShipping.service_changed_from;
    return orderPriorityToFedexService(props.orderShippingPriority) ?? "";
  }, [props.existingShipping?.service_changed_from, props.orderShippingPriority]);

  const [carrier, setCarrier] = useState(props.existingShipping?.carrier ?? "");
  const [service, setService] = useState(initialService);
  const [serviceChangeReason, setServiceChangeReason] = useState(
    props.existingShipping?.service_change_reason ?? ""
  );
  const [serviceChangedFrom, setServiceChangedFrom] = useState(
    props.existingShipping?.service_changed_from ?? ""
  );
  const [pendingServiceChange, setPendingServiceChange] = useState<{ from: string; to: string } | null>(null);
  const [serviceChangeReasonInput, setServiceChangeReasonInput] = useState("");
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const [tracking, setTracking] = useState(props.existingShipping?.tracking_number ?? "");

  useEffect(() => {
    if (pendingServiceChange) {
      setServiceChangeReasonInput("");
      setTimeout(() => reasonInputRef.current?.focus(), 50);
    }
  }, [pendingServiceChange]);
  const [labelUrl, setLabelUrl] = useState(props.existingShipping?.label_url ?? "");
  const [noTracking, setNoTracking] = useState(!!props.existingShipping?.no_tracking);
  const [saturdayDelivery, setSaturdayDelivery] = useState(!!props.existingShipping?.saturday_delivery);

  const initialPresetId = useMemo(() => {
    const l = props.existingShipping?.length_in;
    const w = props.existingShipping?.width_in;
    const h = props.existingShipping?.height_in;
    if (l != null && w != null && h != null && l > 0 && w > 0 && h > 0) {
      const match = findPresetByDimensions(Number(l), Number(w), Number(h));
      return match?.id ?? "custom";
    }
    return "custom";
  }, [props.existingShipping?.length_in, props.existingShipping?.width_in, props.existingShipping?.height_in]);

  const [packagePresetId, setPackagePresetId] = useState<string>(initialPresetId);
  const [weightLbs, setWeightLbs] = useState(
    props.existingShipping?.weight_lbs === null || props.existingShipping?.weight_lbs === undefined
      ? ""
      : String(props.existingShipping?.weight_lbs ?? "")
  );
  const [lengthIn, setLengthIn] = useState(
    props.existingShipping?.length_in === null || props.existingShipping?.length_in === undefined
      ? ""
      : String(props.existingShipping?.length_in ?? "")
  );
  const [widthIn, setWidthIn] = useState(
    props.existingShipping?.width_in === null || props.existingShipping?.width_in === undefined
      ? ""
      : String(props.existingShipping?.width_in ?? "")
  );
  const [heightIn, setHeightIn] = useState(
    props.existingShipping?.height_in === null || props.existingShipping?.height_in === undefined
      ? ""
      : String(props.existingShipping?.height_in ?? "")
  );

  function applyPreset(presetId: string) {
    setPackagePresetId(presetId);
    const preset = getFedExPresetById(presetId);
    if (preset && presetId !== "custom") {
      setLengthIn(preset.lengthIn > 0 ? String(preset.lengthIn) : "");
      setWidthIn(preset.widthIn > 0 ? String(preset.widthIn) : "");
      setHeightIn(preset.heightIn > 0 ? String(preset.heightIn) : "");
      setWeightLbs((prev) => (prev.trim() ? prev : preset.defaultWeightLbs > 0 ? String(preset.defaultWeightLbs) : ""));
    }
    // Custom: leave dimensions as-is so user can edit manually
  }

  // ✅ NEW: optional shipping price (USD)
  const initialShippingUsd =
    props.existingShipping?.shipping_usd === null || props.existingShipping?.shipping_usd === undefined
      ? ""
      : String(props.existingShipping?.shipping_usd ?? "");
  const [shippingUsd, setShippingUsd] = useState(initialShippingUsd);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn" | "muted"; text: string } | null>(null);

  const trackingRequiredMissing = !noTracking && !safeTrim(tracking);
  const trackingLink = buildTrackingLink(carrier, tracking);
  const saturdayAllowed = serviceSupportsSaturdayDelivery(
    safeTrim(service) || orderPriorityToFedexService(props.orderShippingPriority)
  );
  const shippingSaved =
    !!safeTrim(carrier) ||
    !!safeTrim(tracking) ||
    !!safeTrim(labelUrl) ||
    !!noTracking ||
    !!safeTrim(shippingUsd) ||
    !!safeTrim(service);

  useEffect(() => {
    if (saturdayDelivery && !saturdayAllowed) {
      setSaturdayDelivery(false);
    }
  }, [saturdayAllowed, saturdayDelivery]);

  async function upsertOrderShipping(orderId: string | undefined, shippingUsdNormalized: string) {
    // If you kept your existing endpoint, we can reuse it (even though UI moved off order page).
    // That endpoint used a form before, so we send FormData.
    if (!orderId) return;

    const fd = new FormData();
    // blank means remove shipping line item / set to 0 (matching your previous placeholder behavior)
    fd.set("shipping_usd", shippingUsdNormalized);

    await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/shipping`, {
      method: "POST",
      body: fd,
      headers: { accept: "application/json" },
    }).catch(() => null);
  }

  async function saveShippingOnly() {
    if (isClosed) {
      setMsg({ tone: "warn", text: "Fulfillment is CLOSED. Reopen it to edit shipping." });
      return;
    }

    const svc = safeTrim(service);
    const orig = customerChosenService.trim().toUpperCase();
    if (orig && svc && orig !== svc.toUpperCase() && !safeTrim(serviceChangeReason)) {
      setMsg({ tone: "warn", text: "Please provide a reason for changing the service type (required when different from customer choice)." });
      return;
    }

    const norm = normalizeMoneyInput(shippingUsd);
    if (!norm.ok) {
      setMsg({ tone: "warn", text: norm.error });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/shipping`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          carrier: safeTrim(carrier) || null,
          service: safeTrim(service) || null,
          tracking_number: safeTrim(tracking) || null,
          label_url: safeTrim(labelUrl) || null,
          no_tracking: noTracking ? 1 : 0,
          weight_lbs: safeTrim(weightLbs) || null,
          length_in: safeTrim(lengthIn) || null,
          width_in: safeTrim(widthIn) || null,
          height_in: safeTrim(heightIn) || null,

          // ✅ NEW: optional shipping charge snapshot (string)
          shipping_usd: norm.value ? norm.value : null,

          saturday_delivery: saturdayDelivery,

          service_change_reason: serviceChangeReason ? safeTrim(serviceChangeReason) : null,
          service_changed_from: serviceChangedFrom ? safeTrim(serviceChangedFrom) : null,
          service_changed_to: serviceChangeReason ? safeTrim(service) : null,
        }),
      });

      const data: ApiResp = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !data.ok) {
        setMsg({ tone: "warn", text: (data as any)?.error || `Save failed (${res.status})` });
        return;
      }

      // ✅ Keep order totals/invoice inputs consistent:
      // Update order shipping line item via existing endpoint (if present).
      // - if blank => remove
      // - else => set to value
      await upsertOrderShipping((data as any).order_id, norm.value);

      const message = "Saved shipping details.";
      setMsg({ tone: "ok", text: message });
      router.replace(`/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}?ok=1&msg=${encodeURIComponent(message)}`);
      router.refresh();
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function callFedexLabel(createLabel: boolean) {
    if (isClosed) {
      setMsg({ tone: "warn", text: "Fulfillment is CLOSED. Reopen it to create a label." });
      return;
    }

    const weight = normalizeNumberInput(weightLbs, "Weight (lbs)");
    if (!weight.ok) {
      setMsg({ tone: "warn", text: weight.error });
      return;
    }
    const len = normalizeNumberInput(lengthIn, "Length (in)");
    if (!len.ok) {
      setMsg({ tone: "warn", text: len.error });
      return;
    }
    const wid = normalizeNumberInput(widthIn, "Width (in)");
    if (!wid.ok) {
      setMsg({ tone: "warn", text: wid.error });
      return;
    }
    const hgt = normalizeNumberInput(heightIn, "Height (in)");
    if (!hgt.ok) {
      setMsg({ tone: "warn", text: hgt.error });
      return;
    }

    const preferredService = (safeTrim(service) || orderPriorityToFedexService(props.orderShippingPriority)) ?? undefined;
    if (saturdayDelivery && preferredService && !serviceSupportsSaturdayDelivery(preferredService)) {
      setMsg({
        tone: "warn",
        text: "Saturday delivery is not available for FedEx Ground. Choose overnight or 2-day.",
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/fedex-label`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          weight_lbs: weight.value,
          length_in: len.value,
          width_in: wid.value,
          height_in: hgt.value,
          preferred_service: preferredService,
          create_label: createLabel,
          saturday_delivery: saturdayDelivery,
        }),
      });
      const raw = await res.text();
      let data: any;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {
          ok: false,
          error: `Server returned non-JSON (${res.status}). Check FEDEX_* env vars and Vercel logs.`,
        };
      }
      if (!res.ok || !data?.ok) {
        if (data?.fedex_debug) {
          const out = (data.fedex_debug as any)?.output;
          const alerts = Array.isArray(out?.alerts) ? out.alerts : [];
          const details = out?.rateReplyDetails ?? [];
          console.error("[FedEx debug] alerts:", JSON.stringify(alerts, null, 2));
          console.error("[FedEx debug] rateReplyDetails count:", details?.length ?? 0);
          console.error("[FedEx debug] full:", JSON.stringify(data.fedex_debug, null, 2));
        }
        let displayErr = data?.error || `FedEx failed (${res.status})`;
        if (data?.fedex_errors) displayErr += ` [${data.fedex_errors}]`;
        if (data?.fedex_output_messages) displayErr += ` [${data.fedex_output_messages}]`;
        if (data?.fedex_alerts) displayErr += ` FedEx: ${data.fedex_alerts}`;
        if (data?.fedex_debug) {
          console.error("[FedEx Ship API error] Full response:", data.fedex_debug);
          const errs = (data.fedex_debug as any)?.errors;
          if (Array.isArray(errs)) {
            console.error("[FedEx Ship API error] errors array:", JSON.stringify(errs, null, 2));
          }
        }
        if (data?.fedex_request) {
          console.error("[FedEx Ship API error] Request we sent:", JSON.stringify(data.fedex_request, null, 2));
        }
        setMsg({ tone: "warn", text: displayErr });
        return;
      }

      const returnedService = String(data?.service ?? "");
      if (preferredService && returnedService && !fedexServiceTypesMatch(returnedService, preferredService)) {
        setMsg({
          tone: "warn",
          text: `${formatFedexServiceLabel(preferredService)} is not available for this shipment. FedEx returned ${formatFedexServiceLabel(returnedService)}. The selected service was not changed.`,
        });
        return;
      }

      setCarrier("FedEx");
      if (returnedService) setService(returnedService);
      if (data?.shipping_usd !== undefined && data?.shipping_usd !== null) {
        setShippingUsd(String(data.shipping_usd));
      }
      if (data?.tracking_number) setTracking(String(data.tracking_number));
      if (data?.label_url) setLabelUrl(String(data.label_url));

      if (createLabel && data?.label_url_immediate) {
        window.open(data.label_url_immediate, "_blank", "noopener,noreferrer");
      }

      if (createLabel && data?.order_id && data?.shipping_usd != null) {
        await upsertOrderShipping(data.order_id, String(data.shipping_usd));
      }

      setMsg({
        tone: "ok",
        text: createLabel
          ? `FedEx label created. Tracking: ${data?.tracking_number ?? "—"}. $${Number(data?.shipping_usd ?? 0).toFixed(2)} (${data?.service ?? ""})${saturdayDelivery ? " + Saturday delivery" : ""}. Label opened in new tab.`
          : `FedEx rates fetched. $${Number(data?.shipping_usd ?? 0).toFixed(2)} (${data?.service ?? ""})${saturdayDelivery ? " + Saturday delivery" : ""}.`,
      });
      router.refresh();
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: props.accent?.border ?? "1px solid rgba(0,0,0,0.10)",
        borderRadius: 16,
        background: props.accent?.background ?? "white",
        overflow: "hidden",
        boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          fontWeight: 950,
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          background: props.accent?.headerBackground ?? "transparent",
          color: props.accent?.headerText ?? "inherit",
        }}
      >
        <span>Shipping</span>
        <span style={pill(isClosed ? "muted" : shippingSaved ? "ok" : "warn")}>
          {isClosed ? "CLOSED" : shippingSaved ? "SAVED" : "OPEN"}
        </span>
      </div>

      {msg ? (
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            background:
              msg.tone === "ok"
                ? "rgba(25,135,84,0.10)"
                : msg.tone === "warn"
                ? "rgba(220,53,69,0.10)"
                : "rgba(0,0,0,0.03)",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {msg.text}
        </div>
      ) : null}

      <div style={{ padding: 12, display: "grid", gap: 12 }}>
        <FulfillmentShipToEditor
          orderId={props.orderId}
          initialAddress={props.deliveryAddress}
          disabled={busy || isClosed}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Shipping price (USD)</div>
            <input
              value={shippingUsd}
              onChange={(e) => setShippingUsd(e.target.value)}
              placeholder="e.g. 24.95"
              inputMode="decimal"
              style={inputStyle()}
              disabled={busy || isClosed}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Label URL (optional)</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={labelUrl}
                onChange={(e) => setLabelUrl(e.target.value)}
                placeholder="https://… or /api/…/fedex-label/url"
                style={{ ...inputStyle(), flex: 1 }}
                disabled={busy || isClosed}
              />
              {safeTrim(labelUrl) ? (
                <a
                  href={labelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, fontWeight: 950, color: "#0b5cab", textDecoration: "none", whiteSpace: "nowrap" }}
                >
                  Open
                </a>
              ) : null}
            </div>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Carrier</div>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="FedEx / UPS / USPS"
              style={inputStyle()}
              disabled={busy || isClosed}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Service</div>
            <select
              value={service || ""}
              onChange={(e) => {
                const newVal = e.target.value;
                if (newVal === service) return;
                const orig = customerChosenService.trim().toUpperCase();
                const nv = newVal.trim().toUpperCase();
                if (orig && nv && orig !== nv) {
                  setPendingServiceChange({ from: service, to: newVal });
                } else {
                  setService(newVal);
                  if (!orig || nv === orig) {
                    setServiceChangeReason("");
                    setServiceChangedFrom("");
                  }
                }
              }}
              style={{
                ...inputStyle(),
                cursor: busy || isClosed ? "not-allowed" : "pointer",
                appearance: "auto",
              }}
              disabled={busy || isClosed}
            >
              <option value="">Select service…</option>
              {FEDEX_SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {serviceChangeReason ? (
              <div style={{ fontSize: 11, opacity: 0.85, color: "rgba(180,90,0,1)", fontWeight: 850 }}>
                Changed from {formatFedexServiceLabel(serviceChangedFrom)}. Reason: {serviceChangeReason}
              </div>
            ) : null}
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>
              Tracking number {!noTracking ? "(required)" : "(optional)"}
            </div>
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="1Z… / 96…"
              style={inputStyle()}
              disabled={busy || isClosed}
            />
          </label>
        </div>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            fontWeight: 900,
            fontSize: 13,
            opacity: isClosed || !saturdayAllowed ? 0.55 : 0.9,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={saturdayDelivery && saturdayAllowed}
            onChange={(e) => setSaturdayDelivery(e.target.checked)}
            disabled={busy || isClosed || !saturdayAllowed}
            style={{ marginTop: 2 }}
          />
          <span>
            Saturday delivery
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.7, marginTop: 2, lineHeight: 1.4 }}>
              {saturdayAllowed
                ? "Adds FedEx Saturday Delivery to overnight / 2-day rates and labels. Use when shipping so the package arrives Saturday."
                : "Not available for FedEx Ground. Choose overnight or 2-day first."}
            </div>
          </span>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Package type</div>
          <select
            value={packagePresetId}
            onChange={(e) => applyPreset(e.target.value)}
            style={{
              ...inputStyle(),
              cursor: busy || isClosed ? "not-allowed" : "pointer",
              appearance: "auto",
            }}
            disabled={busy || isClosed}
          >
            {FEDEX_PACKAGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            FedEx packages pre-fill dimensions. Choose Custom to enter manually.
          </div>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Weight (lbs)</div>
            <input
              value={weightLbs}
              onChange={(e) => setWeightLbs(e.target.value)}
              placeholder="e.g. 5"
              inputMode="decimal"
              style={inputStyle()}
              disabled={busy || isClosed}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Length (in)</div>
            <input
              value={lengthIn}
              onChange={(e) => setLengthIn(e.target.value)}
              placeholder="e.g. 12"
              inputMode="decimal"
              style={inputStyle()}
              disabled={busy || isClosed}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Width (in)</div>
            <input
              value={widthIn}
              onChange={(e) => setWidthIn(e.target.value)}
              placeholder="e.g. 9"
              inputMode="decimal"
              style={inputStyle()}
              disabled={busy || isClosed}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Height (in)</div>
            <input
              value={heightIn}
              onChange={(e) => setHeightIn(e.target.value)}
              placeholder="e.g. 4"
              inputMode="decimal"
              style={inputStyle()}
              disabled={busy || isClosed}
            />
          </label>
        </div>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            fontWeight: 900,
            fontSize: 13,
            opacity: isClosed ? 0.55 : 0.9,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={noTracking}
            onChange={(e) => setNoTracking(e.target.checked)}
            disabled={busy || isClosed}
          />
          No tracking (local delivery / will-call / internal courier)
        </label>

        {trackingRequiredMissing && !isClosed ? (
          <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
            Tracking is required to mark shipped (or enable “No tracking”).
          </div>
        ) : null}

        {safeTrim(tracking) ? (
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Tracking:{" "}
            {trackingLink ? (
              <a href={trackingLink} target="_blank" rel="noreferrer" style={{ fontWeight: 950, textDecoration: "none" }}>
                {safeTrim(tracking)}
              </a>
            ) : (
              <span style={{ fontWeight: 950 }}>{safeTrim(tracking)}</span>
            )}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={() => callFedexLabel(true)}
            disabled={busy || isClosed}
            style={{
              ...buttonStyle(true),
              background: "rgba(11,92,171,0.85)",
              border: "1px solid rgba(11,92,171,0.4)",
              color: "white",
              opacity: busy || isClosed ? 0.65 : 1,
              cursor: busy || isClosed ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Working…" : "Create FedEx Label"}
          </button>
          <button
            type="button"
            onClick={() => callFedexLabel(false)}
            disabled={busy || isClosed}
            style={{
              ...buttonStyle(false),
              background: "rgba(11,92,171,0.10)",
              border: "1px solid rgba(11,92,171,0.25)",
              color: "#0b5cab",
              opacity: busy || isClosed ? 0.65 : 1,
              cursor: busy || isClosed ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Working…" : "Get FedEx Rates (no charge)"}
          </button>

          <button
            type="button"
            onClick={saveShippingOnly}
            disabled={busy || isClosed}
            style={{
              ...buttonStyle(false),
              opacity: busy || isClosed ? 0.65 : 1,
              cursor: busy || isClosed ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Saving…" : "Save Shipping"}
          </button>
        </div>
      </div>

      {pendingServiceChange ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPendingServiceChange(null);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 24,
              maxWidth: 420,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 8 }}>Reason for service change</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16, lineHeight: 1.5 }}>
              Changing from {formatFedexServiceLabel(pendingServiceChange.from)} to {formatFedexServiceLabel(pendingServiceChange.to)}. This reason will be shown to the customer.
            </div>
            <textarea
              ref={reasonInputRef}
              value={serviceChangeReasonInput}
              onChange={(e) => setServiceChangeReasonInput(e.target.value)}
              placeholder="e.g. Overnight not available in this area; using FedEx Ground instead."
              rows={3}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                fontSize: 14,
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setPendingServiceChange(null)}
                style={{ ...buttonStyle(false), width: "auto" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const reason = serviceChangeReasonInput.trim();
                  if (!reason) {
                    setMsg({ tone: "warn", text: "Please enter a reason for the service change." });
                    return;
                  }
                  setService(pendingServiceChange!.to);
                  setServiceChangeReason(reason);
                  setServiceChangedFrom(customerChosenService);
                  setPendingServiceChange(null);
                  setMsg(null);
                }}
                disabled={!serviceChangeReasonInput.trim()}
                style={{ ...buttonStyle(true), width: "auto", opacity: serviceChangeReasonInput.trim() ? 1 : 0.6 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
