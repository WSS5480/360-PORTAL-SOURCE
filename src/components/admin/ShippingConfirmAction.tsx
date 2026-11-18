"use client";

import React, { useEffect, useRef, useState } from "react";

export default function ShippingConfirmAction(props: {
  actionUrl: string;
  enabled: boolean;
  sent?: boolean;
  skipped?: boolean;
  onDark?: boolean;
  pulse?: boolean;
}) {
  const onDark = props.onDark ?? false;
  const formRef = useRef<HTMLFormElement | null>(null);
  const [skipChecked, setSkipChecked] = useState(() => !!props.skipped);
  const [skipSubmitting, setSkipSubmitting] = useState(false);
  useEffect(() => {
    if (props.skipped) {
      setSkipChecked(true);
      setSkipSubmitting(false);
      return;
    }
    if (!props.sent) {
      setSkipChecked(false);
      setSkipSubmitting(false);
    }
  }, [props.sent, props.skipped]);
  const canSubmit = !props.sent && !props.skipped && (props.enabled || skipChecked);
  const isSkipMode = !props.sent && !props.skipped && (skipChecked || skipSubmitting);
  const disabled = !canSubmit;

  return (
    <form
      ref={formRef}
      action={props.actionUrl}
      method="post"
      style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
    >
      <button
        type="submit"
        disabled={disabled}
        style={{
          fontSize: 11,
          fontWeight: 900,
          padding: "6px 10px",
          borderRadius: 9,
          border: isSkipMode ? "1px solid rgba(245,158,11,0.65)" : onDark ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(0,0,0,0.12)",
          background: disabled
            ? onDark
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.08)"
            : isSkipMode
            ? "rgba(245,158,11,0.95)"
            : onDark
            ? "rgba(30,136,229,0.9)"
            : "#111",
          color: onDark ? "white" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          animation:
            props.pulse && !disabled && !skipSubmitting ? "order-flow-cta 1.6s ease-in-out infinite" : undefined,
        }}
        title={
          skipChecked
            ? "Skip shipping confirmation"
            : props.enabled
            ? "Send customer shipping confirmation email"
            : "Requires packing slip and shipping info before sending"
        }
      >
        {isSkipMode ? "Skip shipping confirmation" : "Send shipping confirmation"}
      </button>
      {!props.sent && !props.skipped ? (
        <label
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            fontSize: 11,
            fontWeight: 900,
            color: onDark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.75)",
          }}
        >
          <input
            type="checkbox"
            name="skip"
            value="1"
            checked={skipChecked}
            onChange={(e) => {
              const next = e.target.checked;
              setSkipChecked(next);
              if (next) {
                setSkipSubmitting(true);
                // auto-submit skip so it advances immediately
                setTimeout(() => formRef.current?.requestSubmit(), 0);
              }
            }}
          style={{ accentColor: isSkipMode ? "#f59e0b" : "#38bdf8", transform: "translateY(0.5px)" }}
          />
          Skip
        </label>
      ) : props.skipped ? (
        <label
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            fontSize: 11,
            fontWeight: 900,
            color: "rgba(245,158,11,0.95)",
          }}
        >
          <input
            type="checkbox"
            name="undo"
            value="1"
            checked
            onChange={() => {
              // uncheck = undo skip
              setTimeout(() => formRef.current?.requestSubmit(), 0);
            }}
            style={{ accentColor: "#f59e0b", transform: "translateY(0.5px)" }}
          />
          Skip
        </label>
      ) : (
        <label
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            fontSize: 11,
            fontWeight: 900,
            color: "rgba(34,197,94,0.95)",
          }}
        >
          <input type="checkbox" checked readOnly style={{ accentColor: "#22c55e", transform: "translateY(0.5px)" }} />
          Sent
        </label>
      )}
    </form>
  );
}
