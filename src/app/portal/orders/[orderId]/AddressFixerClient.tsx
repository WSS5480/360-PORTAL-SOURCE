// src/app/portal/orders/[orderId]/AddressFixerClient.tsx
"use client";

import { draftAddressMinComplete } from "@/components/portal/portalAddressUi";
import React, { useMemo, useState } from "react";

type Address = Record<string, any> | null;

type AddressRow = {
  id: string;
  kind: "BILLING" | "SHIPPING" | string;
  label: string | null;
  is_default: boolean | null;
  address: any;
};

function baseBorder(): React.CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" };
}

function pill(tone: "neutral" | "success" | "warning" | "danger"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    color: "var(--foreground)",
    whiteSpace: "nowrap",
  };

  if (tone === "danger") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--danger) 26%, var(--border))",
      background: "color-mix(in srgb, var(--danger) 9%, var(--surface))",
      color: "color-mix(in srgb, var(--danger) 78%, black)",
    };
  }
  if (tone === "success") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--success) 26%, var(--border))",
      background: "color-mix(in srgb, var(--success) 9%, var(--surface))",
      color: "color-mix(in srgb, var(--success) 78%, black)",
    };
  }
  if (tone === "warning") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--warning) 26%, var(--border))",
      background: "color-mix(in srgb, var(--warning) 12%, var(--surface))",
    };
  }
  return base;
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--surface) 92%, var(--background))",
    fontWeight: 850,
    outline: "none",
    boxSizing: "border-box",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    fontSize: 12,
    opacity: 0.75,
    fontWeight: 950,
    marginBottom: 6,
    whiteSpace: "nowrap",
  };
}

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function normalizeAddress(a: any): any {
  if (!a || typeof a !== "object") return null;
  const get = (k: string) => (a as any)?.[k] ?? null;
  return {
    company: get("company"),
    attn: get("attn"),
    line1: get("line1"),
    line2: get("line2"),
    city: get("city"),
    state: get("state"),
    postal: get("postal"),
    country: get("country"),
    phone: get("phone"),
    email: get("email"),
    notes: get("notes"),
    ...a,
  };
}

function emptyAddress(): any {
  return {
    company: "",
    attn: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal: "",
    country: "",
    phone: "",
    email: "",
    notes: "",
  };
}

function addressHasAnyValue(a: any): boolean {
  if (!a || typeof a !== "object") return false;
  const keys = ["company", "attn", "line1", "line2", "city", "state", "postal", "country", "phone", "email", "notes"];
  return keys.some((k) => safeStr(a[k] ?? "").trim().length > 0);
}

/** Draft shape compatible with portalAddressUi.draftAddressMinComplete */
function newValueToDraftForComplete(v: any) {
  const n = v || emptyAddress();
  return {
    label: "",
    company: safeStr(n.company),
    attn: safeStr(n.attn),
    line1: safeStr(n.line1),
    line2: safeStr(n.line2),
    city: safeStr(n.city),
    state: safeStr(n.state),
    postal: safeStr(n.postal),
    country: safeStr(n.country),
    phone: safeStr(n.phone),
    email: safeStr(n.email),
    notes: safeStr(n.notes),
    saveToBook: false,
    makeDefault: false,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    fontWeight: 900,
  };
}

function MsgBanner({ msg }: { msg: { kind: "ok" | "error" | "warning"; text: string } }) {
  return (
    <div
      style={{
        ...baseBorder(),
        borderRadius: 14,
        padding: 12,
        background:
          msg.kind === "ok"
            ? "color-mix(in srgb, var(--success) 10%, var(--surface))"
            : msg.kind === "warning"
            ? "color-mix(in srgb, var(--warning) 12%, var(--surface))"
            : "color-mix(in srgb, var(--danger) 10%, var(--surface))",
        borderColor:
          msg.kind === "ok"
            ? "color-mix(in srgb, var(--success) 26%, var(--border))"
            : msg.kind === "warning"
            ? "color-mix(in srgb, var(--warning) 26%, var(--border))"
            : "color-mix(in srgb, var(--danger) 26%, var(--border))",
        color: msg.kind === "error" ? "color-mix(in srgb, var(--danger) 78%, black)" : "var(--foreground)",
        fontWeight: 900,
        fontSize: 13,
      }}
    >
      {msg.text}
    </div>
  );
}

/**
 * IMPORTANT: module-scoped so it doesn't get recreated and steal focus.
 */
function AddressFields(props: { disabled: boolean; value: any; onChange: (next: any) => void }) {
  const v = props.value || emptyAddress();
  const set = (k: string, val: string) => props.onChange({ ...v, [k]: val });

  const cell: React.CSSProperties = { minWidth: 0 };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="addr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={cell}>
          <div style={labelStyle()}>Company</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.company)} onChange={(e) => set("company", e.target.value)} />
        </div>
        <div style={cell}>
          <div style={labelStyle()}>Attn</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.attn)} onChange={(e) => set("attn", e.target.value)} />
        </div>
      </div>

      <div style={cell}>
        <div style={labelStyle()}>Address line 1</div>
        <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.line1)} onChange={(e) => set("line1", e.target.value)} />
      </div>

      <div style={cell}>
        <div style={labelStyle()}>Address line 2</div>
        <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.line2)} onChange={(e) => set("line2", e.target.value)} />
      </div>

      {/* ✅ This is the row from your screenshot. Fix: stack earlier + make City guaranteed roomy */}
      <div
        className="addr-grid-city"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1fr) minmax(90px, 110px) minmax(120px, 160px)",
          gap: 10,
        }}
      >
        <div style={cell}>
          <div style={labelStyle()}>City</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.city)} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div style={cell}>
          <div style={labelStyle()}>State</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.state)} onChange={(e) => set("state", e.target.value)} />
        </div>
        <div style={cell}>
          <div style={labelStyle()}>Postal</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.postal)} onChange={(e) => set("postal", e.target.value)} />
        </div>
      </div>

      <div className="addr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={cell}>
          <div style={labelStyle()}>Country</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.country)} onChange={(e) => set("country", e.target.value)} />
        </div>
        <div style={cell}>
          <div style={labelStyle()}>Phone</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.phone)} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </div>

      <div className="addr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={cell}>
          <div style={labelStyle()}>Email</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.email)} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div style={cell}>
          <div style={labelStyle()}>Notes</div>
          <input disabled={props.disabled} style={inputStyle()} value={safeStr(v.notes)} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function Section(props: {
  disabled: boolean;

  title: string;
  kind: "BILLING" | "SHIPPING";

  mode: "SAVED" | "NEW";
  setMode: (m: "SAVED" | "NEW") => void;

  savedRows: AddressRow[];
  selectedId: string;
  setSelectedId: (id: string) => void;

  newValue: any;
  setNewValue: (v: any) => void;

  makeDefault: boolean;
  setMakeDefault: (v: boolean) => void;

  label: string;
  setLabel: (v: string) => void;

  onSaveToBook?: () => Promise<void>;
  saveBusy?: boolean;
  saveError?: string | null;

  showCopyToShipping?: boolean;
  onCopyToShipping?: () => void;
}) {
  const disabled = props.disabled;

  return (
    <div style={{ ...baseBorder(), borderRadius: 14, padding: 12, background: "color-mix(in srgb, var(--surface) 92%, var(--background))" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>{props.title}</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => props.setMode("SAVED")}
            style={{ ...pill(props.mode === "SAVED" ? "success" : "neutral"), cursor: disabled ? "not-allowed" : "pointer" }}
          >
            Use saved
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => props.setMode("NEW")}
            style={{ ...pill(props.mode === "NEW" ? "success" : "neutral"), cursor: disabled ? "not-allowed" : "pointer" }}
          >
            Enter new
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {props.mode === "SAVED" ? (
          <div>
            <div style={labelStyle()}>Saved addresses</div>
            <select disabled={disabled} style={selectStyle()} value={props.selectedId} onChange={(e) => props.setSelectedId(e.target.value)}>
              <option value="">— Select —</option>
              {props.savedRows.map((r) => {
                const label = (r.label || "").trim() || (props.kind === "BILLING" ? "Billing" : "Shipping");
                const suffix = r.is_default ? " (Default)" : "";
                return (
                  <option key={String(r.id)} value={String(r.id)}>
                    {label}
                    {suffix}
                  </option>
                );
              })}
            </select>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              To add a new address, switch to <b>Enter new</b>.
            </div>
          </div>
        ) : (
          <>
            <AddressFields disabled={disabled} value={props.newValue} onChange={props.setNewValue} />

            <div style={{ display: "grid", gap: 8 }}>
              {props.showCopyToShipping && props.onCopyToShipping ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => props.onCopyToShipping?.()}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "color-mix(in srgb, var(--surface) 96%, var(--background))",
                    fontWeight: 950,
                    cursor: disabled ? "not-allowed" : "pointer",
                    textAlign: "left",
                  }}
                >
                  Use this address for shipping
                </button>
              ) : null}

              <div className="addr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={labelStyle()}>Label (optional)</div>
                  <input
                    disabled={disabled}
                    style={inputStyle()}
                    value={props.label}
                    onChange={(e) => props.setLabel(e.target.value)}
                    placeholder={props.kind === "BILLING" ? "e.g. Main Billing" : "e.g. Receiving Dock"}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", minWidth: 0 }}>
                  <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13, opacity: disabled ? 0.6 : 1 }}>
                    <input
                      disabled={disabled}
                      type="checkbox"
                      checked={props.makeDefault}
                      onChange={(e) => props.setMakeDefault(e.target.checked)}
                    />
                    Make default
                  </label>
                </div>
              </div>

              {props.onSaveToBook ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <button
                    type="button"
                    disabled={
                      disabled ||
                      !!props.saveBusy ||
                      !draftAddressMinComplete(newValueToDraftForComplete(props.newValue))
                    }
                    onClick={() => void props.onSaveToBook?.()}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border))",
                      background: "color-mix(in srgb, var(--brand-600) 12%, var(--surface))",
                      fontWeight: 950,
                      cursor:
                        disabled || props.saveBusy || !draftAddressMinComplete(newValueToDraftForComplete(props.newValue))
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        disabled || props.saveBusy || !draftAddressMinComplete(newValueToDraftForComplete(props.newValue))
                          ? 0.65
                          : 1,
                    }}
                  >
                    {props.saveBusy ? "Saving…" : "Save to address book"}
                  </button>
                  {props.saveError ? (
                    <div style={{ fontSize: 12, fontWeight: 800, color: "color-mix(in srgb, var(--danger) 78%, black)" }}>
                      {props.saveError}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AddressFixerClient(props: {
  orderId: string;
  canEdit: boolean;
  statusUpper: string;

  billingAddresses: AddressRow[];
  shippingAddresses: AddressRow[];

  defaultBillingId: string;
  defaultShippingId: string;

  initialInvoiceAddress: Address | null;
  initialDeliveryAddress: Address | null;

  onAppliedReloadTo?: string;
}) {
  const disabled = !props.canEdit || props.statusUpper !== "DRAFT";

  const [billingOptions, setBillingOptions] = useState<AddressRow[]>(() => props.billingAddresses ?? []);
  const [shippingOptions, setShippingOptions] = useState<AddressRow[]>(() => props.shippingAddresses ?? []);

  const [saveBillingBusy, setSaveBillingBusy] = useState(false);
  const [saveShippingBusy, setSaveShippingBusy] = useState(false);
  const [saveBillingErr, setSaveBillingErr] = useState<string | null>(null);
  const [saveShippingErr, setSaveShippingErr] = useState<string | null>(null);

  const billingById = useMemo(() => new Map(billingOptions.map((r) => [String(r.id), r])), [billingOptions]);
  const shippingById = useMemo(() => new Map(shippingOptions.map((r) => [String(r.id), r])), [shippingOptions]);

  const [billingMode, setBillingMode] = useState<"SAVED" | "NEW">(props.initialInvoiceAddress ? "SAVED" : billingOptions.length ? "SAVED" : "NEW");
  const [shippingMode, setShippingMode] = useState<"SAVED" | "NEW">(props.initialDeliveryAddress ? "SAVED" : shippingOptions.length ? "SAVED" : "NEW");

  const [billingId, setBillingId] = useState<string>(props.defaultBillingId || (billingOptions[0]?.id ? String(billingOptions[0].id) : ""));
  const [shippingId, setShippingId] = useState<string>(props.defaultShippingId || (shippingOptions[0]?.id ? String(shippingOptions[0].id) : ""));

  const [billingNew, setBillingNew] = useState<any>(emptyAddress());
  const [shippingNew, setShippingNew] = useState<any>(emptyAddress());

  const [makeDefaultBilling, setMakeDefaultBilling] = useState<boolean>(false);
  const [billingLabel, setBillingLabel] = useState<string>("");

  const [makeDefaultShipping, setMakeDefaultShipping] = useState<boolean>(false);
  const [shippingLabel, setShippingLabel] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error" | "warning"; text: string } | null>(null);

  const invoiceAddressToSend = useMemo(() => {
    if (billingMode === "SAVED") {
      const row = billingById.get(String(billingId));
      return row ? normalizeAddress(row.address) : null;
    }
    const v = normalizeAddress(billingNew);
    return addressHasAnyValue(v) ? v : null;
  }, [billingMode, billingId, billingById, billingNew]);

  const deliveryAddressToSend = useMemo(() => {
    if (shippingMode === "SAVED") {
      const row = shippingById.get(String(shippingId));
      return row ? normalizeAddress(row.address) : null;
    }
    const v = normalizeAddress(shippingNew);
    return addressHasAnyValue(v) ? v : null;
  }, [shippingMode, shippingId, shippingById, shippingNew]);

  function addressJsonForApi(a: any) {
    const n = normalizeAddress(a);
    if (!n) return {};
    return {
      company: n.company,
      attn: n.attn,
      line1: n.line1,
      line2: n.line2,
      city: n.city,
      state: n.state,
      postal: n.postal,
      country: n.country,
      phone: n.phone,
      email: n.email,
      notes: n.notes,
    };
  }

  async function saveBillingToBook() {
    if (!draftAddressMinComplete(newValueToDraftForComplete(billingNew))) return;
    setSaveBillingErr(null);
    setSaveBillingBusy(true);
    try {
      const res = await fetch("/api/portal/account-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "BILLING",
          label: (billingLabel || "").trim() || "Billing",
          is_default: !!makeDefaultBilling,
          address: addressJsonForApi(billingNew),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setSaveBillingErr(String(json?.error || "Could not save billing address"));
        return;
      }
      const row: AddressRow = {
        id: String(json.address.id),
        kind: "BILLING",
        label: json.address.label,
        is_default: json.address.is_default,
        address: json.address.address,
      };
      setBillingOptions((prev) => [row, ...prev.filter((r) => String(r.id) !== row.id)]);
      setBillingId(row.id);
      setBillingMode("SAVED");
      setBillingNew(emptyAddress());
      setBillingLabel("");
      setMakeDefaultBilling(false);
    } finally {
      setSaveBillingBusy(false);
    }
  }

  async function saveShippingToBook() {
    if (!draftAddressMinComplete(newValueToDraftForComplete(shippingNew))) return;
    setSaveShippingErr(null);
    setSaveShippingBusy(true);
    try {
      const res = await fetch("/api/portal/account-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "SHIPPING",
          label: (shippingLabel || "").trim() || "Shipping",
          is_default: !!makeDefaultShipping,
          address: addressJsonForApi(shippingNew),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setSaveShippingErr(String(json?.error || "Could not save shipping address"));
        return;
      }
      const row: AddressRow = {
        id: String(json.address.id),
        kind: "SHIPPING",
        label: json.address.label,
        is_default: json.address.is_default,
        address: json.address.address,
      };
      setShippingOptions((prev) => [row, ...prev.filter((r) => String(r.id) !== row.id)]);
      setShippingId(row.id);
      setShippingMode("SAVED");
      setShippingNew(emptyAddress());
      setShippingLabel("");
      setMakeDefaultShipping(false);
    } finally {
      setSaveShippingBusy(false);
    }
  }

  function copyBillingToShipping() {
    setShippingMode("NEW");
    setSaveShippingErr(null);
    setShippingNew({ ...normalizeAddress(billingNew) });
    setShippingLabel((billingLabel || "").trim() || "");
  }

  async function apply() {
    if (disabled) return;

    setMsg(null);

    if (billingMode === "NEW" && !addressHasAnyValue(invoiceAddressToSend)) {
      setMsg({ kind: "warning", text: "Billing address is empty. Fill it out or switch to a saved address." });
      return;
    }
    if (shippingMode === "NEW" && !addressHasAnyValue(deliveryAddressToSend)) {
      setMsg({ kind: "warning", text: "Shipping address is empty. Fill it out or switch to a saved address." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/portal/orders/${encodeURIComponent(props.orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_address: invoiceAddressToSend ?? null,
          delivery_address: deliveryAddressToSend ?? null,

          save_billing_to_book: false,
          make_default_billing: false,
          billing_label: "",

          save_shipping_to_book: false,
          make_default_shipping: false,
          shipping_label: "",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg({ kind: "error", text: json?.error ? String(json.error) : `Failed (${res.status})` });
        setBusy(false);
        return;
      }

      if (json?.warning) setMsg({ kind: "warning", text: String(json.warning) });
      else setMsg({ kind: "ok", text: "Addresses saved to this draft." });

      const to = props.onAppliedReloadTo ? props.onAppliedReloadTo : window.location.href;
      window.location.assign(to);
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message ?? "Failed to update addresses." });
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* ✅ Key fix: stack earlier because your editor column is narrow */}
      <style>{`
        @media (max-width: 1100px) {
          .addr-grid-2 { grid-template-columns: 1fr !important; }
          .addr-grid-city { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>
          {disabled ? "Addresses" : "Edit addresses (Draft)"}
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, fontWeight: 800, lineHeight: 1.35 }}>
            {disabled ? "This order is not editable." : "Pick saved addresses or enter new ones. Click Apply to save them to this draft."}
          </div>
        </div>

        {!disabled ? (
          <button
            type="button"
            onClick={apply}
            disabled={busy}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
              background: "var(--brand-700)",
              color: "white",
              fontWeight: 950,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {busy ? "Applying…" : "Apply to Draft"}
          </button>
        ) : null}
      </div>

      {msg ? <MsgBanner msg={msg} /> : null}

      <div style={{ display: "grid", gap: 12 }}>
        <Section
          disabled={disabled}
          title="Billing"
          kind="BILLING"
          mode={billingMode}
          setMode={setBillingMode}
          savedRows={billingOptions}
          selectedId={billingId}
          setSelectedId={setBillingId}
          newValue={billingNew}
          setNewValue={setBillingNew}
          makeDefault={makeDefaultBilling}
          setMakeDefault={setMakeDefaultBilling}
          label={billingLabel}
          setLabel={setBillingLabel}
          onSaveToBook={saveBillingToBook}
          saveBusy={saveBillingBusy}
          saveError={saveBillingErr}
          showCopyToShipping
          onCopyToShipping={copyBillingToShipping}
        />

        <Section
          disabled={disabled}
          title="Shipping"
          kind="SHIPPING"
          mode={shippingMode}
          setMode={setShippingMode}
          savedRows={shippingOptions}
          selectedId={shippingId}
          setSelectedId={setShippingId}
          newValue={shippingNew}
          setNewValue={setShippingNew}
          makeDefault={makeDefaultShipping}
          setMakeDefault={setMakeDefaultShipping}
          label={shippingLabel}
          setLabel={setShippingLabel}
          onSaveToBook={saveShippingToBook}
          saveBusy={saveShippingBusy}
          saveError={saveShippingErr}
        />
      </div>
    </div>
  );
}
