"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deliveryAddressToDraft, type DeliveryAddressDraft } from "@/lib/shipping/deliveryAddressDraft";
import { describeRegionCodeIssue, normalizeRegionCode } from "@/lib/shipping/normalizeRegionCode";
import { formatShipToOneLine } from "@/lib/shipping/fedexShipTo";

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
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

export default function FulfillmentShipToEditor(props: {
  orderId: string;
  initialAddress: unknown;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [addr, setAddr] = useState<DeliveryAddressDraft>(() => deliveryAddressToDraft(props.initialAddress));

  const savedDraft = useMemo(() => deliveryAddressToDraft(props.initialAddress), [props.initialAddress]);

  useEffect(() => {
    if (!open) {
      setAddr(savedDraft);
    }
  }, [savedDraft, open]);

  const previewLine = useMemo(() => formatShipToOneLine(props.initialAddress), [props.initialAddress]);
  const stateIssue = useMemo(() => {
    const draft = savedDraft;
    return describeRegionCodeIssue(
      safeStr(draft.state),
      normalizeRegionCode(safeStr(draft.state), safeStr(draft.country))
    );
  }, [savedDraft]);

  function setField(key: keyof DeliveryAddressDraft, value: string) {
    setAddr((prev) => ({ ...prev, [key]: value }));
  }

  function openEditor() {
    setAddr(deliveryAddressToDraft(props.initialAddress));
    setMsg(null);
    setOpen(true);
  }

  function closeEditor() {
    setAddr(savedDraft);
    setOpen(false);
  }

  async function save() {
    if (props.disabled) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/delivery-address`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          delivery_address: {
            company: safeStr(addr.company) || null,
            attn: safeStr(addr.attn) || null,
            line1: safeStr(addr.line1) || null,
            line2: safeStr(addr.line2) || null,
            city: safeStr(addr.city) || null,
            state: safeStr(addr.state) || null,
            postal: safeStr(addr.postal) || null,
            country: safeStr(addr.country) || "US",
            phone: safeStr(addr.phone) || null,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg({ tone: "warn", text: data?.error || `Save failed (${res.status})` });
        return;
      }
      if (data.delivery_address) {
        setAddr(deliveryAddressToDraft(data.delivery_address));
      }
      setMsg({ tone: "ok", text: "Ship-to address saved." });
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setMsg({ tone: "warn", text: e instanceof Error ? e.message : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: stateIssue ? "1px solid rgba(220,53,69,0.35)" : "1px solid rgba(0,0,0,0.10)",
        borderRadius: 14,
        background: stateIssue ? "rgba(220,53,69,0.05)" : "rgba(0,0,0,0.02)",
        padding: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Ship-to address (FedEx)</div>
          <div style={{ fontSize: 13, fontWeight: 850, lineHeight: 1.45, marginTop: 4 }}>{previewLine}</div>
          {stateIssue ? (
            <div style={{ fontSize: 12, color: "crimson", fontWeight: 900, marginTop: 6 }}>{stateIssue}</div>
          ) : (
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
              FedEx requires a 2-letter state/province code (e.g. NY, TX).
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => (open ? closeEditor() : openEditor())}
          disabled={props.disabled || busy}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            fontWeight: 950,
            fontSize: 12,
            cursor: props.disabled || busy ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {open ? "Close" : "Edit address"}
        </button>
      </div>

      {msg ? (
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: msg.tone === "ok" ? "rgba(25,135,84,1)" : "crimson",
          }}
        >
          {msg.text}
        </div>
      ) : null}

      {open ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Company</span>
              <input style={inputStyle()} value={addr.company} onChange={(e) => setField("company", e.target.value)} disabled={busy} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Attention</span>
              <input style={inputStyle()} value={addr.attn} onChange={(e) => setField("attn", e.target.value)} disabled={busy} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Street</span>
            <input style={inputStyle()} value={addr.line1} onChange={(e) => setField("line1", e.target.value)} disabled={busy} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Street line 2</span>
            <input style={inputStyle()} value={addr.line2} onChange={(e) => setField("line2", e.target.value)} disabled={busy} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>City</span>
              <input style={inputStyle()} value={addr.city} onChange={(e) => setField("city", e.target.value)} disabled={busy} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>State</span>
              <input
                style={inputStyle()}
                value={addr.state}
                onChange={(e) => setField("state", e.target.value.toUpperCase())}
                maxLength={20}
                placeholder="NY"
                disabled={busy}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Postal</span>
              <input style={inputStyle()} value={addr.postal} onChange={(e) => setField("postal", e.target.value)} disabled={busy} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Country</span>
              <input
                style={inputStyle()}
                value={addr.country}
                onChange={(e) => setField("country", e.target.value.toUpperCase())}
                maxLength={2}
                disabled={busy}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>Phone</span>
            <input style={inputStyle()} value={addr.phone} onChange={(e) => setField("phone", e.target.value)} disabled={busy} />
          </label>

          <button
            type="button"
            onClick={save}
            disabled={busy || props.disabled}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#111",
              color: "white",
              fontWeight: 950,
              cursor: busy || props.disabled ? "not-allowed" : "pointer",
              opacity: busy || props.disabled ? 0.65 : 1,
            }}
          >
            {busy ? "Saving…" : "Save ship-to address"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
