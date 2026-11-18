"use client";

import { useMemo, useState } from "react";

type Addr = {
  company?: string;
  attn?: string;
  phone?: string;
  email?: string;

  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;

  notes?: string;
};

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.18)",
    fontWeight: 900,
    fontSize: 13,
    background: "white",
  };
}

function labelStyle(): React.CSSProperties {
  return { fontWeight: 950, fontSize: 12, opacity: 0.85 };
}

function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 16,
    background: "white",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
    overflow: "hidden",
  };
}

function headerStyle(): React.CSSProperties {
  return {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    fontWeight: 950,
  };
}

function bodyStyle(): React.CSSProperties {
  return { padding: 12, display: "grid", gap: 10 };
}

function safeJson(v: any): string {
  try {
    return JSON.stringify(v ?? null);
  } catch {
    return "null";
  }
}

function looksEmail(v: string) {
  const s = v.trim();
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function OrderAddressClient(props: {
  accountName: string | null;
  defaultBillingEmail?: string | null;
}) {
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const [bill, setBill] = useState<Addr>({
    company: props.accountName ?? "",
    email: props.defaultBillingEmail ?? "",
    country: "US",
  });

  const [ship, setShip] = useState<Addr>({
    company: props.accountName ?? "",
    country: "US",
  });

  // If "same as billing" is enabled, keep ship in sync on submit via hidden JSON
  const shipEffective = useMemo(() => (sameAsBilling ? bill : ship), [sameAsBilling, bill, ship]);

  const billEmailOk = looksEmail(String(bill.email ?? ""));
  const shipEmailOk = looksEmail(String(shipEffective.email ?? ""));

  const billJson = useMemo(() => safeJson(bill), [bill]);
  const shipJson = useMemo(() => safeJson(shipEffective), [shipEffective]);

  return (
    <div style={cardStyle()}>
      <div style={headerStyle()}>Billing & Shipping</div>

      <div style={bodyStyle()}>
        <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
          This info is stored on the <b>order</b> (snapshot). Admin invoices will copy it from the locked order.
        </div>

        {/* Hidden fields posted to /api/portal/orders */}
        <input type="hidden" name="invoice_address_json" value={billJson} />
        <input type="hidden" name="delivery_address_json" value={shipJson} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
          {/* Billing */}
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>Billing</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={labelStyle()}>Company</div>
                <input
                  style={inputStyle()}
                  value={bill.company ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, company: e.target.value }))}
                  placeholder="Company"
                />
              </div>
              <div>
                <div style={labelStyle()}>Attention</div>
                <input
                  style={inputStyle()}
                  value={bill.attn ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, attn: e.target.value }))}
                  placeholder="Attn"
                />
              </div>

              <div>
                <div style={labelStyle()}>Billing email</div>
                <input
                  style={inputStyle()}
                  value={bill.email ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, email: e.target.value }))}
                  placeholder="billing@company.com"
                />
                {!billEmailOk ? <div style={{ color: "crimson", fontSize: 12, fontWeight: 900, marginTop: 6 }}>Invalid email</div> : null}
              </div>
              <div>
                <div style={labelStyle()}>Phone</div>
                <input
                  style={inputStyle()}
                  value={bill.phone ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 555-5555"
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={labelStyle()}>Address line 1</div>
                <input
                  style={inputStyle()}
                  value={bill.line1 ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, line1: e.target.value }))}
                  placeholder="Street address"
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={labelStyle()}>Address line 2</div>
                <input
                  style={inputStyle()}
                  value={bill.line2 ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, line2: e.target.value }))}
                  placeholder="Suite / Unit (optional)"
                />
              </div>

              <div>
                <div style={labelStyle()}>City</div>
                <input
                  style={inputStyle()}
                  value={bill.city ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={labelStyle()}>State</div>
                  <input
                    style={inputStyle()}
                    value={bill.state ?? ""}
                    onChange={(e) => setBill((p) => ({ ...p, state: e.target.value }))}
                    placeholder="ST"
                  />
                </div>
                <div>
                  <div style={labelStyle()}>Postal</div>
                  <input
                    style={inputStyle()}
                    value={bill.postal ?? ""}
                    onChange={(e) => setBill((p) => ({ ...p, postal: e.target.value }))}
                    placeholder="ZIP"
                  />
                </div>
              </div>

              <div>
                <div style={labelStyle()}>Country</div>
                <input
                  style={inputStyle()}
                  value={bill.country ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, country: e.target.value }))}
                  placeholder="US"
                />
              </div>

              <div>
                <div style={labelStyle()}>Notes</div>
                <input
                  style={inputStyle()}
                  value={bill.notes ?? ""}
                  onChange={(e) => setBill((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 950 }}>Shipping</div>
              <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 950, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                />
                Same as billing
              </label>
            </div>

            {sameAsBilling ? (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
                Shipping address will use the billing fields.
              </div>
            ) : (
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={labelStyle()}>Company</div>
                  <input
                    style={inputStyle()}
                    value={ship.company ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Company"
                  />
                </div>
                <div>
                  <div style={labelStyle()}>Attention</div>
                  <input
                    style={inputStyle()}
                    value={ship.attn ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, attn: e.target.value }))}
                    placeholder="Attn"
                  />
                </div>

                <div>
                  <div style={labelStyle()}>Shipping email</div>
                  <input
                    style={inputStyle()}
                    value={ship.email ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, email: e.target.value }))}
                    placeholder="optional"
                  />
                  {!shipEmailOk ? <div style={{ color: "crimson", fontSize: 12, fontWeight: 900, marginTop: 6 }}>Invalid email</div> : null}
                </div>
                <div>
                  <div style={labelStyle()}>Phone</div>
                  <input
                    style={inputStyle()}
                    value={ship.phone ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="optional"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={labelStyle()}>Address line 1</div>
                  <input
                    style={inputStyle()}
                    value={ship.line1 ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, line1: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={labelStyle()}>Address line 2</div>
                  <input
                    style={inputStyle()}
                    value={ship.line2 ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, line2: e.target.value }))}
                    placeholder="Suite / Unit (optional)"
                  />
                </div>

                <div>
                  <div style={labelStyle()}>City</div>
                  <input
                    style={inputStyle()}
                    value={ship.city ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={labelStyle()}>State</div>
                    <input
                      style={inputStyle()}
                      value={ship.state ?? ""}
                      onChange={(e) => setShip((p) => ({ ...p, state: e.target.value }))}
                      placeholder="ST"
                    />
                  </div>
                  <div>
                    <div style={labelStyle()}>Postal</div>
                    <input
                      style={inputStyle()}
                      value={ship.postal ?? ""}
                      onChange={(e) => setShip((p) => ({ ...p, postal: e.target.value }))}
                      placeholder="ZIP"
                    />
                  </div>
                </div>

                <div>
                  <div style={labelStyle()}>Country</div>
                  <input
                    style={inputStyle()}
                    value={ship.country ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, country: e.target.value }))}
                    placeholder="US"
                  />
                </div>

                <div>
                  <div style={labelStyle()}>Notes</div>
                  <input
                    style={inputStyle()}
                    value={ship.notes ?? ""}
                    onChange={(e) => setShip((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          These fields are not strictly required yet. You can enforce required fields later in the API if you want.
        </div>
      </div>
    </div>
  );
}
