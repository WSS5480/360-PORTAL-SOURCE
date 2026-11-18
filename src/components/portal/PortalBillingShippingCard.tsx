"use client";

import React from "react";
import {
  draftAddressMinComplete,
  emptyAddressDraft,
  inputStyle,
  labelStyle,
  prettyAddressOneLine,
  type AddressDraft,
} from "@/components/portal/portalAddressUi";

export type SavedAddressRow = {
  id: string;
  kind: "BILLING" | "SHIPPING" | string;
  label: string;
  is_default: boolean | null;
  address: unknown;
};

type ShippingPriority = string;

export default function PortalBillingShippingCard(props: {
  billingAddresses: SavedAddressRow[];
  shippingAddresses: SavedAddressRow[];
  billingMode: "SAVED" | "NEW";
  setBillingMode: (m: "SAVED" | "NEW") => void;
  shippingMode: "SAVED" | "NEW";
  setShippingMode: (m: "SAVED" | "NEW") => void;
  billingAddressId: string;
  setBillingAddressId: (id: string) => void;
  shippingAddressId: string;
  setShippingAddressId: (id: string) => void;
  billingDraft: AddressDraft;
  setBillingDraft: React.Dispatch<React.SetStateAction<AddressDraft>>;
  shippingDraft: AddressDraft;
  setShippingDraft: React.Dispatch<React.SetStateAction<AddressDraft>>;
  shippingPriority: ShippingPriority;
  setShippingPriority: (p: ShippingPriority) => void;

  /** Persist new billing draft to account_addresses, then parent switches to Saved + selects the row. */
  onSaveBillingToBook?: () => void | Promise<void>;
  onSaveShippingToBook?: () => void | Promise<void>;
  savingBilling?: boolean;
  savingShipping?: boolean;
  billingSaveError?: string | null;
  shippingSaveError?: string | null;
  /** Copy billing fields into the shipping new-address form (does not save). */
  onCopyBillingToShipping?: () => void;
}) {
  const billingSaved = props.billingAddresses ?? [];
  const shippingSaved = props.shippingAddresses ?? [];

  const selectedBillingPreview =
    props.billingMode === "SAVED" && props.billingAddressId
      ? billingSaved.find((a) => String(a.id) === String(props.billingAddressId))
      : null;

  const selectedShippingPreview =
    props.shippingMode === "SAVED" && props.shippingAddressId
      ? shippingSaved.find((a) => String(a.id) === String(props.shippingAddressId))
      : null;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.6)",
        borderRadius: 18,
        padding: 14,
        background:
          "radial-gradient(600px 180px at 0% 0%, rgba(30,136,229,0.14), transparent 60%)," +
          "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.45))",
        display: "grid",
        gap: 12,
        backdropFilter: "blur(12px)",
        boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
      }}
    >
      <div style={{ fontWeight: 950 }}>Billing & Shipping</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.85)",
            borderRadius: 18,
            padding: 12,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.14)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: "linear-gradient(180deg, #1e88e5, #22d3ee)",
              opacity: 0.7,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>Billing</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => props.setBillingMode("SAVED")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: props.billingMode === "SAVED" ? "rgba(30,136,229,0.18)" : "white",
                  color: props.billingMode === "SAVED" ? "#0f172a" : "inherit",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                Saved
              </button>
              <button
                type="button"
                onClick={() => props.setBillingMode("NEW")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: props.billingMode === "NEW" ? "rgba(30,136,229,0.18)" : "white",
                  color: props.billingMode === "NEW" ? "#0f172a" : "inherit",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                New
              </button>
            </div>
          </div>

          {props.billingMode === "SAVED" ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <label style={labelStyle()}>Select saved billing address</label>
              <select
                value={props.billingAddressId}
                onChange={(e) => props.setBillingAddressId(e.target.value)}
                style={inputStyle()}
              >
                <option value="">— Select —</option>
                {billingSaved.map((a) => (
                  <option key={String(a.id)} value={String(a.id)}>
                    {a.label}
                    {a.is_default ? " (default)" : ""} — {prettyAddressOneLine(a.address)}
                  </option>
                ))}
              </select>

              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                {selectedBillingPreview ? (
                  <>
                    <div style={{ fontWeight: 900 }}>{selectedBillingPreview.label}</div>
                    <div style={{ opacity: 0.75 }}>{prettyAddressOneLine(selectedBillingPreview.address)}</div>
                  </>
                ) : (
                  "No billing address selected."
                )}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={labelStyle()}>Label</label>
                <input
                  value={props.billingDraft.label}
                  onChange={(e) => props.setBillingDraft((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Main billing"
                  style={inputStyle()}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Company</label>
                  <input
                    value={props.billingDraft.company}
                    onChange={(e) => props.setBillingDraft((p) => ({ ...p, company: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Attn</label>
                  <input
                    value={props.billingDraft.attn}
                    onChange={(e) => props.setBillingDraft((p) => ({ ...p, attn: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle()}>Address line 1</label>
                <input
                  value={props.billingDraft.line1}
                  onChange={(e) => props.setBillingDraft((p) => ({ ...p, line1: e.target.value }))}
                  style={inputStyle()}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle()}>Address line 2</label>
                <input
                  value={props.billingDraft.line2}
                  onChange={(e) => props.setBillingDraft((p) => ({ ...p, line2: e.target.value }))}
                  style={inputStyle()}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.6fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>City</label>
                  <input
                    value={props.billingDraft.city}
                    onChange={(e) => props.setBillingDraft((p) => ({ ...p, city: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>State</label>
                  <input
                    value={props.billingDraft.state}
                    onChange={(e) => props.setBillingDraft((p) => ({ ...p, state: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Postal</label>
                  <input
                    value={props.billingDraft.postal}
                    onChange={(e) => props.setBillingDraft((p) => ({ ...p, postal: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Country</label>
                  <input
                    value={props.billingDraft.country}
                    onChange={(e) => props.setBillingDraft((p) => ({ ...p, country: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Phone</label>
                  <input
                    value={props.billingDraft.phone}
                    onChange={(e) => props.setBillingDraft((p) => ({ ...p, phone: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle()}>Email</label>
                <input
                  value={props.billingDraft.email}
                  onChange={(e) => props.setBillingDraft((p) => ({ ...p, email: e.target.value }))}
                  style={inputStyle()}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle()}>Notes</label>
                <input
                  value={props.billingDraft.notes}
                  onChange={(e) => props.setBillingDraft((p) => ({ ...p, notes: e.target.value }))}
                  style={inputStyle()}
                />
              </div>

              {props.onCopyBillingToShipping ? (
                <button
                  type="button"
                  onClick={() => props.onCopyBillingToShipping?.()}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "white",
                    fontWeight: 950,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Use this address for shipping
                </button>
              ) : null}

              <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={props.billingDraft.makeDefault}
                  onChange={(e) => props.setBillingDraft((p) => ({ ...p, makeDefault: e.target.checked }))}
                />
                Make default billing address
              </label>

              {props.onSaveBillingToBook ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <button
                    type="button"
                    disabled={
                      !!props.savingBilling || !draftAddressMinComplete(props.billingDraft)
                    }
                    onClick={() => void props.onSaveBillingToBook?.()}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(30,136,229,0.45)",
                      background: "rgba(30,136,229,0.14)",
                      fontWeight: 950,
                      cursor:
                        props.savingBilling || !draftAddressMinComplete(props.billingDraft) ? "not-allowed" : "pointer",
                      opacity: props.savingBilling || !draftAddressMinComplete(props.billingDraft) ? 0.65 : 1,
                    }}
                  >
                    {props.savingBilling ? "Saving…" : "Save to address book"}
                  </button>
                  {props.billingSaveError ? (
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>{props.billingSaveError}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.85)",
            borderRadius: 18,
            padding: 12,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.14)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: "linear-gradient(180deg, #1e88e5, #22d3ee)",
              opacity: 0.7,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>Shipping</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => props.setShippingMode("SAVED")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: props.shippingMode === "SAVED" ? "rgba(30,136,229,0.18)" : "white",
                  color: props.shippingMode === "SAVED" ? "#0f172a" : "inherit",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                Saved
              </button>
              <button
                type="button"
                onClick={() => props.setShippingMode("NEW")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: props.shippingMode === "NEW" ? "rgba(30,136,229,0.18)" : "white",
                  color: props.shippingMode === "NEW" ? "#0f172a" : "inherit",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                New
              </button>
            </div>
          </div>

          {props.shippingMode === "SAVED" ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <label style={labelStyle()}>Select saved shipping address</label>
              <select
                value={props.shippingAddressId}
                onChange={(e) => props.setShippingAddressId(e.target.value)}
                style={inputStyle()}
              >
                <option value="">— Select —</option>
                {shippingSaved.map((a) => (
                  <option key={String(a.id)} value={String(a.id)}>
                    {a.label}
                    {a.is_default ? " (default)" : ""} — {prettyAddressOneLine(a.address)}
                  </option>
                ))}
              </select>

              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                {selectedShippingPreview ? (
                  <>
                    <div style={{ fontWeight: 900 }}>{selectedShippingPreview.label}</div>
                    <div style={{ opacity: 0.75 }}>{prettyAddressOneLine(selectedShippingPreview.address)}</div>
                  </>
                ) : (
                  "No shipping address selected."
                )}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={labelStyle()}>Label</label>
                <input
                  value={props.shippingDraft.label}
                  onChange={(e) => props.setShippingDraft((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Clinic receiving"
                  style={inputStyle()}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Company</label>
                  <input
                    value={props.shippingDraft.company}
                    onChange={(e) => props.setShippingDraft((p) => ({ ...p, company: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Attn</label>
                  <input
                    value={props.shippingDraft.attn}
                    onChange={(e) => props.setShippingDraft((p) => ({ ...p, attn: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle()}>Address line 1</label>
                <input
                  value={props.shippingDraft.line1}
                  onChange={(e) => props.setShippingDraft((p) => ({ ...p, line1: e.target.value }))}
                  style={inputStyle()}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle()}>Address line 2</label>
                <input
                  value={props.shippingDraft.line2}
                  onChange={(e) => props.setShippingDraft((p) => ({ ...p, line2: e.target.value }))}
                  style={inputStyle()}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.6fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>City</label>
                  <input
                    value={props.shippingDraft.city}
                    onChange={(e) => props.setShippingDraft((p) => ({ ...p, city: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>State</label>
                  <input
                    value={props.shippingDraft.state}
                    onChange={(e) => props.setShippingDraft((p) => ({ ...p, state: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Postal</label>
                  <input
                    value={props.shippingDraft.postal}
                    onChange={(e) => props.setShippingDraft((p) => ({ ...p, postal: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Country</label>
                  <input
                    value={props.shippingDraft.country}
                    onChange={(e) => props.setShippingDraft((p) => ({ ...p, country: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle()}>Phone</label>
                  <input
                    value={props.shippingDraft.phone}
                    onChange={(e) => props.setShippingDraft((p) => ({ ...p, phone: e.target.value }))}
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle()}>Email</label>
                <input
                  value={props.shippingDraft.email}
                  onChange={(e) => props.setShippingDraft((p) => ({ ...p, email: e.target.value }))}
                  style={inputStyle()}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle()}>Notes</label>
                <input
                  value={props.shippingDraft.notes}
                  onChange={(e) => props.setShippingDraft((p) => ({ ...p, notes: e.target.value }))}
                  style={inputStyle()}
                />
              </div>

              <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={props.shippingDraft.makeDefault}
                  onChange={(e) => props.setShippingDraft((p) => ({ ...p, makeDefault: e.target.checked }))}
                />
                Make default shipping address
              </label>

              {props.onSaveShippingToBook ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <button
                    type="button"
                    disabled={
                      !!props.savingShipping || !draftAddressMinComplete(props.shippingDraft)
                    }
                    onClick={() => void props.onSaveShippingToBook?.()}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(30,136,229,0.45)",
                      background: "rgba(30,136,229,0.14)",
                      fontWeight: 950,
                      cursor:
                        props.savingShipping || !draftAddressMinComplete(props.shippingDraft)
                          ? "not-allowed"
                          : "pointer",
                      opacity: props.savingShipping || !draftAddressMinComplete(props.shippingDraft) ? 0.65 : 1,
                    }}
                  >
                    {props.savingShipping ? "Saving…" : "Save to address book"}
                  </button>
                  {props.shippingSaveError ? (
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>{props.shippingSaveError}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <label style={{ fontWeight: 900 }}>Shipping Priority</label>
        <select
          value={props.shippingPriority}
          onChange={(e) => props.setShippingPriority(e.target.value)}
          style={{
            padding: "10px 10px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.18)",
            fontWeight: 900,
            background: "white",
          }}
        >
          <option value="GROUND">Ground (3–5 business days)</option>
          <option value="THREE_DAY">3-Day</option>
          <option value="FIRST_OVERNIGHT">1st Overnight</option>
          <option value="PRIORITY_OVERNIGHT">Priority Overnight</option>
          <option value="TWO_DAY_AM">2-Day AM</option>
          <option value="TWO_DAY">2-Day</option>
          <option value="OVERNIGHT_AM">Overnight AM</option>
        </select>
      </div>
    </div>
  );
}

export { emptyAddressDraft };
