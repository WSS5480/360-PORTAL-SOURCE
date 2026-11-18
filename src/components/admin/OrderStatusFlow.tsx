import React from "react";

type FlowStatus = "done" | "active" | "pending" | "warn";

type FlowSubstep = {
  label: string;
  status: FlowStatus;
};

type FlowStep = {
  key: string;
  label: string;
  status: FlowStatus;
  substeps?: FlowSubstep[];
};

type OrderStatusFlowProps = {
  orderStatus?: string | null;
  hasInvoice?: boolean;
  betweenLabel?: React.ReactNode;
  invoiceAction?: React.ReactNode;
  shippingAction?: React.ReactNode;
  closeAction?: React.ReactNode;
  closeActive?: boolean;
  invoiceActive?: boolean;
  invoiceSummary?: {
    sent?: boolean;
    total?: string;
    paid?: string;
    outstanding?: string;
    overdue?: string;
  };
  /** Extra block under “Invoice issued” (e.g. bulk shipping supplement: create / send). */
  invoiceIssuedExtra?: React.ReactNode;
  confirmedMeta?: {
    accountName?: string;
    submittedName?: string;
    submittedEmail?: string;
  };
  fulfillment?: {
    pickedItems?: boolean;
    packingSlipGenerated?: boolean;
    shippingInfoSaved?: boolean;
    shippingConfirmationSent?: boolean;
    shippingConfirmationSkipped?: boolean;
    /** All fulfillments for this order are CLOSED — fulfillment step is complete even if order status is still FULFILLING */
    allFulfillmentsClosed?: boolean;
  };
};

function normStatus(v?: string | null) {
  return String(v || "").trim().toUpperCase();
}

function buildSteps(args: OrderStatusFlowProps): FlowStep[] {
  const status = normStatus(args.orderStatus);
  const hasInvoice = !!args.hasInvoice;

  const confirmedDone = [
    "CONFIRMED",
    "LOCKED",
    "FULFILLING",
    "NEEDS_INVOICE",
    "INVOICED",
    "PENDING_WIRE",
    "COMPLETED",
    "PAID",
    "PARTIALLY_PAID",
  ].includes(status);

  // Do not treat INVOICED / PAID alone as fulfillment-complete — bulk orders are often invoiced before picking.
  const fulfillmentDone =
    status === "NEEDS_INVOICE" ||
    status === "COMPLETED" ||
    !!args.fulfillment?.allFulfillmentsClosed;
  const allowFulfillmentActive = [
    "LOCKED",
    "FULFILLING",
    "NEEDS_INVOICE",
    "INVOICED",
    "PENDING_WIRE",
    "COMPLETED",
    "PAID",
    "PARTIALLY_PAID",
  ].includes(status);

  const needsInvoiceDone = hasInvoice;
  const invoiceIssuedDone = args.invoiceSummary?.sent ?? hasInvoice;

  const steps: Array<{ key: string; label: string; done: boolean; substeps?: FlowSubstep[] }> = [
    {
      key: "confirmed",
      label: "Confirmed",
      done: confirmedDone,
    },
    {
      key: "fulfillment",
      label: "Fulfillment",
      done: fulfillmentDone,
      substeps: (() => {
        const stepsRaw = [
          { label: "Pick items", done: !!args.fulfillment?.pickedItems },
          { label: "Packing slip generated", done: !!args.fulfillment?.packingSlipGenerated },
          { label: "Shipping info saved", done: !!args.fulfillment?.shippingInfoSaved },
          {
            label: "Shipping confirmation sent",
            done: !!args.fulfillment?.shippingConfirmationSent,
            skipped: !!args.fulfillment?.shippingConfirmationSkipped,
          },
        ];

        if (fulfillmentDone) {
          return stepsRaw.map((s) => ({ label: s.label, status: "done" as const }));
        }

        let activeAssigned = false;
        return stepsRaw.map((s) => {
          if (s.done) return { label: s.label, status: "done" as const };
          if (s.skipped) return { label: s.label, status: "warn" as const };
          if (allowFulfillmentActive && !activeAssigned) {
            activeAssigned = true;
            return { label: s.label, status: "active" as const };
          }
          return { label: s.label, status: "pending" as const };
        });
      })(),
    },
    {
      key: "needs-invoice",
      label: "Needs invoice",
      done: needsInvoiceDone,
    },
    {
      key: "invoice-issued",
      label: "Invoice issued",
      done: invoiceIssuedDone,
    },
  ];

  let activeFound = false;
  return steps.map((step) => {
    if (step.done) return { ...step, status: "done" as const };
    if (!activeFound) {
      if (step.key === "fulfillment" && !allowFulfillmentActive) {
        activeFound = true;
        return { ...step, status: "pending" as const };
      }
      activeFound = true;
      return { ...step, status: "active" as const };
    }
    return { ...step, status: "pending" as const };
  });
}

function dotStyle(status: FlowStatus): React.CSSProperties {
  if (status === "done") {
    return {
      width: 12,
      height: 12,
      borderRadius: 999,
      background: "rgba(34, 197, 94, 0.95)",
      boxShadow: "0 0 10px rgba(34,197,94,0.85)",
      border: "1px solid rgba(255,255,255,0.35)",
    };
  }
  if (status === "active") {
    return {
      width: 12,
      height: 12,
      borderRadius: 999,
      background: "rgba(59, 130, 246, 0.98)",
      boxShadow: "0 0 20px rgba(59,130,246,0.95)",
      border: "1px solid rgba(255,255,255,0.45)",
      animation: "order-flow-pulse 1.6s ease-in-out infinite",
    };
  }
  return {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "rgba(255,255,255,0.25)",
    border: "1px solid rgba(255,255,255,0.25)",
  };
}

function subDotStyle(status: FlowStatus): React.CSSProperties {
  if (status === "done") {
    return {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: "rgba(34, 197, 94, 0.9)",
      boxShadow: "0 0 6px rgba(34,197,94,0.7)",
      border: "1px solid rgba(255,255,255,0.3)",
    };
  }
  if (status === "active") {
    return {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: "rgba(59, 130, 246, 0.9)",
      boxShadow: "0 0 6px rgba(59,130,246,0.7)",
      border: "1px solid rgba(255,255,255,0.3)",
      animation: "order-flow-subpulse 1.4s ease-in-out infinite",
    };
  }
  if (status === "warn") {
    return {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: "rgba(245, 158, 11, 0.95)",
      boxShadow: "0 0 6px rgba(245,158,11,0.7)",
      border: "1px solid rgba(255,255,255,0.3)",
    };
  }
  return {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: "rgba(255,255,255,0.25)",
    border: "1px solid rgba(255,255,255,0.25)",
  };
}

export default function OrderStatusFlow(props: OrderStatusFlowProps) {
  const steps = buildSteps(props);
  const betweenLeft = steps.length > 1 ? `${(1 / steps.length) * 100}%` : "50%";

  return (
    <div
      style={{
        marginTop: 12,
        padding: "12px 12px 10px",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <style>{`
        @keyframes order-flow-pulse {
          0% { box-shadow: 0 0 0 rgba(56,189,248,0.2), 0 0 14px rgba(59,130,246,0.8), 0 0 26px rgba(37,99,235,0.35); transform: scale(1); }
          45% { box-shadow: 0 0 28px rgba(56,189,248,0.75), 0 0 44px rgba(59,130,246,0.95), 0 0 62px rgba(29,78,216,0.55); transform: scale(1.18); }
          100% { box-shadow: 0 0 0 rgba(56,189,248,0.2), 0 0 14px rgba(59,130,246,0.8), 0 0 26px rgba(37,99,235,0.35); transform: scale(1); }
        }
        @keyframes order-flow-cloud {
          0% { opacity: 0.45; transform: scale(1); filter: blur(6px) hue-rotate(0deg); }
          40% { opacity: 0.95; transform: scale(1.24); filter: blur(11px) hue-rotate(32deg); }
          70% { opacity: 0.7; transform: scale(1.12); filter: blur(9px) hue-rotate(-22deg); }
          100% { opacity: 0.45; transform: scale(1); filter: blur(6px) hue-rotate(0deg); }
        }
        @keyframes order-flow-cta {
          0% { box-shadow: 0 0 0 rgba(56,189,248,0.2), 0 0 10px rgba(59,130,246,0.7); transform: translateY(0); }
          50% { box-shadow: 0 0 20px rgba(56,189,248,0.55), 0 0 28px rgba(59,130,246,0.9); transform: translateY(-1px); }
          100% { box-shadow: 0 0 0 rgba(56,189,248,0.2), 0 0 10px rgba(59,130,246,0.7); transform: translateY(0); }
        }
        @keyframes order-flow-subpulse {
          0% { box-shadow: 0 0 0 rgba(56,189,248,0.2), 0 0 6px rgba(59,130,246,0.7); transform: scale(1); }
          50% { box-shadow: 0 0 10px rgba(56,189,248,0.6), 0 0 14px rgba(59,130,246,0.9); transform: scale(1.2); }
          100% { box-shadow: 0 0 0 rgba(56,189,248,0.2), 0 0 6px rgba(59,130,246,0.7); transform: scale(1); }
        }
      `}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          gap: 8,
          position: "relative",
          paddingTop: 8,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 13,
            height: 2,
            background: "rgba(255,255,255,0.18)",
          }}
        />
        {props.betweenLabel ? (
          <div
            style={{
              position: "absolute",
              left: betweenLeft,
              top: 13,
              transform: "translate(-50%, -50%)",
              padding: "4px 8px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 900,
              background: "linear-gradient(180deg, rgba(30,136,229,0.28), rgba(7,14,27,0.9))",
              border: "1px solid rgba(56,189,248,0.45)",
              color: "white",
              whiteSpace: "nowrap",
              zIndex: 2,
              boxShadow: "0 0 0 6px rgba(7, 14, 27, 0.95)",
            }}
          >
            {props.betweenLabel}
          </div>
        ) : null}
        {steps.map((step) => (
          <div
            key={step.key}
            style={{
              display: "grid",
              justifyItems: "center",
              textAlign: "center",
              gap: 6,
              minHeight: 128,
            }}
          >
            <div style={{ position: "relative", zIndex: 2 }}>
              {step.status === "active" ? (
                <span
                  style={{
                    position: "absolute",
                    inset: -18,
                    borderRadius: 999,
                    background:
                      "radial-gradient(circle, rgba(103,232,249,0.4) 0%, rgba(59,130,246,0.3) 32%, rgba(37,99,235,0.2) 58%, rgba(15,23,42,0) 80%)",
                    animation: "order-flow-cloud 1.9s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                />
              ) : null}
              <div
                style={{
                  ...dotStyle(step.status),
                  position: "relative",
                  zIndex: 2,
                  boxShadow: "0 0 0 6px rgba(7, 14, 27, 0.95)",
                }}
              />
            </div>
            <div
              style={{
                minHeight: 18,
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 900,
                color: "white",
              }}
            >
              <span>{step.label}</span>
              {step.key === "fulfillment" && props.closeAction ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    padding: 2,
                    animation: props.closeActive ? "order-flow-cta 1.6s ease-in-out infinite" : undefined,
                  }}
                >
                  {props.closeAction}
                </span>
              ) : null}
            </div>
            {step.key === "confirmed" && props.confirmedMeta ? (
              <div style={{ marginTop: 2, fontSize: 10, color: "rgba(255,255,255,0.72)", display: "grid", gap: 2 }}>
                {props.confirmedMeta.accountName ? <div>{props.confirmedMeta.accountName}</div> : null}
                {props.confirmedMeta.submittedName ? <div>{props.confirmedMeta.submittedName}</div> : null}
                {props.confirmedMeta.submittedEmail ? <div>{props.confirmedMeta.submittedEmail}</div> : null}
              </div>
            ) : null}
            {step.key === "needs-invoice" && props.invoiceAction ? (
              <div
                style={{
                  marginTop: 6,
                  padding: 2,
                  borderRadius: 999,
                  animation: props.invoiceActive ? "order-flow-cta 1.6s ease-in-out infinite" : undefined,
                }}
              >
                {props.invoiceAction}
              </div>
            ) : null}
            {step.key === "invoice-issued" && props.invoiceSummary ? (
              <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.75)", display: "grid", gap: 2 }}>
                {props.invoiceSummary.total ? <div>Total: {props.invoiceSummary.total}</div> : null}
                {props.invoiceSummary.paid ? <div>Paid: {props.invoiceSummary.paid}</div> : null}
                {props.invoiceSummary.outstanding ? <div>Outstanding: {props.invoiceSummary.outstanding}</div> : null}
                {props.invoiceSummary.overdue ? <div>Overdue: {props.invoiceSummary.overdue}</div> : null}
              </div>
            ) : null}
            {step.key === "invoice-issued" && props.invoiceIssuedExtra ? (
              <div style={{ marginTop: 8, width: "100%", maxWidth: 220, justifySelf: "center" }}>{props.invoiceIssuedExtra}</div>
            ) : null}
            {step.substeps?.length ? (
              <div style={{ display: "grid", gap: 4, marginTop: 2, justifyItems: "center", minHeight: 46 }}>
                {step.substeps.map((sub, idx) =>
                  idx === 3 ? (
                    <div key={sub.label} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={subDotStyle(sub.status)} />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.78)" }}>{sub.label}</span>
                      </div>
                      {step.key === "fulfillment" && props.shippingAction ? props.shippingAction : null}
                    </div>
                  ) : (
                    <div key={sub.label} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={subDotStyle(sub.status)} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.78)" }}>{sub.label}</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div style={{ minHeight: 46 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
