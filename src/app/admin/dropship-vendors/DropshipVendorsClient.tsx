"use client";

import React, { useEffect, useMemo, useState } from "react";

type AccountOpt = { id: string; name: string };
type VendorRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: any;
  notes: string;
  created_at: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 16,
    background: "white",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
    overflow: "hidden",
  };
}
function header(): React.CSSProperties {
  return { padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 };
}
function label(): React.CSSProperties {
  return { fontSize: 12, opacity: 0.75, fontWeight: 950, marginBottom: 6 };
}
function input(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.15)",
    fontWeight: 900,
    boxSizing: "border-box",
    background: "white",
    outline: "none",
    minWidth: 0,
  };
}
function btn(primary?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: primary ? "#111" : "white",
    color: primary ? "white" : "#111",
    fontWeight: 950,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
function mono(): React.CSSProperties {
  return { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
}
function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}
function prettyAddr(a: any): string {
  if (!a || typeof a !== "object") return "—";
  const get = (k: string) => String((a as any)?.[k] ?? "").trim();
  const parts = [
    get("company"),
    get("attn") ? `Attn: ${get("attn")}` : "",
    get("line1"),
    get("line2"),
    [get("city"), get("state"), get("postal")].filter(Boolean).join(", "),
    get("country"),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function grid(cols: number): React.CSSProperties {
  // responsive: stacks on small screens automatically
  return {
    display: "grid",
    gap: 10,
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  };
}

export default function DropshipVendorsClient(props: {
  accounts: AccountOpt[];
  initialAccountId: string;
  initialVendors: VendorRow[];
}) {
  const [accountId, setAccountId] = useState(props.initialAccountId || "");
  const [vendors, setVendors] = useState<VendorRow[]>(props.initialVendors ?? []);
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // create form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [addr, setAddr] = useState<any>({
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
  });

  const accountLooksValid = UUID_RE.test(String(accountId || "").trim());
  const canCreate = accountLooksValid && name.trim().length > 0;

  const selectedAccount = useMemo(() => props.accounts.find((a) => a.id === accountId) || null, [props.accounts, accountId]);

  async function load() {
    if (!accountLooksValid) {
      setVendors([]);
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const url = new URL("/api/admin/dropship-vendors", window.location.origin);
      url.searchParams.set("accountId", accountId);

      const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMsg({ kind: "error", text: json?.error ? String(json.error) : `Failed (${res.status})` });
        setVendors([]);
        return;
      }

      setVendors(
        (json.vendors ?? []).map((v: any) => ({
          id: String(v.id),
          name: String(v.name || ""),
          email: String(v.email || ""),
          phone: String(v.phone || ""),
          address: v.address ?? {},
          notes: String(v.notes || ""),
          created_at: String(v.created_at || ""),
        }))
      );
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message ? String(e.message) : "Network error" });
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  function setAccount(next: string) {
    setAccountId(next);

    const url = new URL(window.location.href);
    if (next) url.searchParams.set("accountId", next);
    else url.searchParams.delete("accountId");
    window.history.replaceState(null, "", url.toString());
  }

  function normalizeApiError(err: any): string {
    const s = String(err || "").trim();
    // API sometimes returns Zod issues as a JSON string
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const msgs = parsed
            .map((issue: any) => (typeof issue?.message === "string" ? issue.message.trim() : ""))
            .filter(Boolean);
          if (msgs.length) return msgs.join("; ");
        } else if (typeof parsed?.message === "string" && parsed.message.trim()) {
          return parsed.message.trim();
        }
        return "Request failed. Check the form and try again.";
      } catch {}
    }
    return s || "Request failed.";
  }

  async function createVendor() {
    if (!canCreate) {
      setMsg({
        kind: "error",
        text: !accountLooksValid
          ? "Select a valid account first."
          : "Vendor name is required.",
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/dropship-vendors", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          name: name.trim(),
          email: safeStr(email).trim(),
          phone: safeStr(phone).trim(),
          address: addr ?? {},
          notes: safeStr(notes).trim(),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMsg({ kind: "error", text: normalizeApiError(json?.error || `Failed (${res.status})`) });
        return;
      }

      setMsg({ kind: "ok", text: "Vendor created." });

      // reset form (keep account)
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setAddr({
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
      });

      await load();
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Account */}
      <div style={card()}>
        <div style={header()}>Account</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div>
            <div style={label()}>Select account</div>
            <select style={input()} value={accountId} onChange={(e) => setAccount(e.target.value)}>
              <option value="">— Select —</option>
              {props.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.id}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
            Vendors are scoped to an account.
            <br />
            Selected:{" "}
            <b>{selectedAccount ? selectedAccount.name : accountLooksValid ? accountId : "—"}</b>
            {!accountLooksValid && accountId ? (
              <span style={{ color: "crimson", fontWeight: 900 }}> (invalid account)</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Create vendor */}
      <div style={card()}>
        <div style={header()}>Create vendor</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          {msg ? (
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: 12,
                padding: 10,
                fontWeight: 900,
                background: msg.kind === "ok" ? "rgba(25,135,84,0.10)" : "rgba(220,53,69,0.10)",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.text}
            </div>
          ) : null}

          <div style={grid(2)}>
            <div>
              <div style={label()}>Vendor name *</div>
              <input style={input()} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <div style={label()}>Email (optional)</div>
              <input style={input()} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div style={grid(2)}>
            <div>
              <div style={label()}>Phone (optional)</div>
              <input style={input()} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <div style={label()}>Notes (optional)</div>
              <input style={input()} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

          <div style={{ fontWeight: 950, fontSize: 13 }}>Address (optional)</div>

          <div style={grid(2)}>
            <div>
              <div style={label()}>Company</div>
              <input
                style={input()}
                value={safeStr(addr.company)}
                onChange={(e) => setAddr({ ...addr, company: e.target.value })}
              />
            </div>
            <div>
              <div style={label()}>Attn</div>
              <input style={input()} value={safeStr(addr.attn)} onChange={(e) => setAddr({ ...addr, attn: e.target.value })} />
            </div>
          </div>

          <div style={grid(2)}>
            <div>
              <div style={label()}>Line 1</div>
              <input style={input()} value={safeStr(addr.line1)} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
            </div>
            <div>
              <div style={label()}>Line 2</div>
              <input style={input()} value={safeStr(addr.line2)} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} />
            </div>
          </div>

          {/* ✅ responsive: city/state/postal don't get cut off */}
          <div style={grid(3)}>
            <div>
              <div style={label()}>City</div>
              <input style={input()} value={safeStr(addr.city)} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
            </div>
            <div>
              <div style={label()}>State</div>
              <input style={input()} value={safeStr(addr.state)} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
            </div>
            <div>
              <div style={label()}>Postal</div>
              <input style={input()} value={safeStr(addr.postal)} onChange={(e) => setAddr({ ...addr, postal: e.target.value })} />
            </div>
          </div>

          <div style={grid(2)}>
            <div>
              <div style={label()}>Country</div>
              <input
                style={input()}
                value={safeStr(addr.country)}
                onChange={(e) => setAddr({ ...addr, country: e.target.value })}
              />
            </div>
            <div>
              <div style={label()}>Vendor email (address block)</div>
              <input style={input()} value={safeStr(addr.email)} onChange={(e) => setAddr({ ...addr, email: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={createVendor}
              disabled={busy || !canCreate}
              style={{
                ...btn(true),
                opacity: busy || !canCreate ? 0.6 : 1,
                cursor: busy || !canCreate ? "not-allowed" : "pointer",
                minWidth: 180,
              }}
              title={!accountLooksValid ? "Select a valid account" : name.trim() ? "" : "Vendor name required"}
            >
              {busy ? "Creating…" : "Create vendor"}
            </button>
          </div>

          {!accountLooksValid ? <div style={{ fontSize: 12, opacity: 0.75 }}>Select an account first.</div> : null}
        </div>
      </div>

      {/* Vendors list */}
      <div style={card()}>
        <div style={header()}>
          Vendors {accountLooksValid ? `(${vendors.length})` : ""}
          <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.7, fontWeight: 800 }}>
            {loading ? "Loading…" : accountLooksValid ? "" : "Select an account"}
          </span>
        </div>

        <div style={{ padding: 12 }}>
          {!accountLooksValid ? (
            <div style={{ opacity: 0.75, fontWeight: 800 }}>Pick an account above to view vendors.</div>
          ) : vendors.length === 0 ? (
            <div style={{ opacity: 0.75, fontWeight: 800 }}>No vendors yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.75 }}>
                    <th style={{ padding: "10px 0" }}>Name</th>
                    <th style={{ padding: "10px 0" }}>Email</th>
                    <th style={{ padding: "10px 0" }}>Phone</th>
                    <th style={{ padding: "10px 0" }}>Address</th>
                    <th style={{ padding: "10px 0" }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: "10px 0", fontWeight: 950 }}>
                        {v.name}
                        <div style={{ ...mono(), fontSize: 11, opacity: 0.6, marginTop: 4 }}>{v.id.slice(0, 8)}…</div>
                      </td>
                      <td style={{ padding: "10px 0", fontWeight: 900 }}>{v.email || "—"}</td>
                      <td style={{ padding: "10px 0", fontWeight: 900, opacity: 0.85 }}>{v.phone || "—"}</td>
                      <td style={{ padding: "10px 0", fontSize: 12, opacity: 0.8, lineHeight: 1.3 }}>{prettyAddr(v.address)}</td>
                      <td style={{ padding: "10px 0", fontSize: 12, opacity: 0.75 }}>
                        {v.created_at ? new Date(v.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.08)", fontSize: 12, opacity: 0.75 }}>
          Data source: <span style={mono()}>/api/admin/dropship-vendors</span>
        </div>
      </div>
    </div>
  );
}
