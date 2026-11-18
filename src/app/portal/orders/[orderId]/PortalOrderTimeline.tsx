"use client";

import React from "react";
import PackingSlipDownloadClient from "./PackingSlipDownloadClient";
import InvoiceDownloadClient from "./InvoiceDownloadClient";

type PortalOrderTimelineProps = {
  orderConfirmed: boolean;
  fulfilled: boolean;
  packingSlipGenerated: boolean;
  shipped: boolean;
  invoiced: boolean;
  paid: boolean;
  firstPackingSlipFulfillmentId?: string | null;
  invoiceId?: string | null;
  hasInvoicePdf?: boolean;
  /** When shipped and available, opens carrier tracking in new tab */
  trackingUrl?: string | null;
  /** When invoiced but not paid, show Pay invoice button */
  canPayInvoice?: boolean;
};

function stepDot(done: boolean): React.CSSProperties {
  return {
    width: 12,
    height: 12,
    borderRadius: 999,
    flexShrink: 0,
    background: done ? "rgba(34, 197, 94, 0.95)" : "rgba(0,0,0,0.12)",
    border: done ? "2px solid rgba(34,197,94,0.5)" : "2px solid rgba(0,0,0,0.08)",
  };
}

export default function PortalOrderTimeline(props: PortalOrderTimelineProps) {
  const steps = [
    { key: "confirmed", label: "Order Confirmed", done: props.orderConfirmed },
    { key: "fulfilled", label: "Fulfilled", done: props.fulfilled },
    {
      key: "packing",
      label: "Packing slip",
      done: props.packingSlipGenerated,
      action:
        props.packingSlipGenerated && props.firstPackingSlipFulfillmentId ? (
          <PackingSlipDownloadClient fulfillmentId={props.firstPackingSlipFulfillmentId} enabled={true} compact />
        ) : null,
    },
    {
      key: "shipped",
      label: "Shipped",
      done: props.shipped,
      action:
        props.shipped && props.trackingUrl ? (
          <a
            href={props.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--brand-700)",
              color: "white",
              fontWeight: 950,
              fontSize: 12,
              textDecoration: "none",
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            Track shipment
          </a>
        ) : null,
    },
    {
      key: "invoiced",
      label: "Invoiced",
      done: props.invoiced,
      action:
        props.invoiced && props.invoiceId ? (
          <InvoiceDownloadClient invoiceId={props.invoiceId} enabled={!!props.hasInvoicePdf} compact />
        ) : null,
    },
    {
      key: "paid",
      label: "Paid",
      done: props.paid,
      action:
        props.canPayInvoice && props.invoiceId ? (
          <a
            href={`/portal/invoices/${encodeURIComponent(props.invoiceId)}/pay`}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--brand-700)",
              color: "white",
              fontWeight: 950,
              fontSize: 12,
              textDecoration: "none",
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            Pay invoice
          </a>
        ) : props.paid ? (
          <span style={{ fontWeight: 950, fontSize: 12, color: "#15803d" }}>Paid</span>
        ) : null,
    },
  ];

  return (
    <div
      className="portal-order-timeline"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: 16,
        background: "var(--surface)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 14, color: "var(--foreground)" }}>Order progress</div>

      <div
        className="portal-order-timeline-steps"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          gap: 8,
          position: "relative",
          paddingTop: 0,
        }}
      >
        {/* Horizontal connector line - centered with dots (hidden on mobile) */}
        <div
          className="portal-order-timeline-line-h"
          aria-hidden
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 6,
            height: 2,
            background: "rgba(0,0,0,0.08)",
            borderRadius: 1,
          }}
        />
        {steps.map((step) => (
          <div
            key={step.key}
            className="portal-order-timeline-step"
            style={{
              display: "grid",
              justifyItems: "center",
              textAlign: "center",
              gap: 6,
              minHeight: 80,
              position: "relative",
              zIndex: 2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 14 }}>
              <div style={stepDot(step.done)} />
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: step.done ? 950 : 850,
                color: step.done ? "var(--foreground)" : "var(--muted)",
                lineHeight: 1.2,
              }}
            >
              {step.label}
            </div>
            {step.action ? <div style={{ marginTop: 2 }}>{step.action}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
