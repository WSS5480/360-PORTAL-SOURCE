"use client";

import { useEffect, useMemo, useState } from "react";

type ProviderProfile = {
  id: string;
  provider_name: string;
  provider_npi: string | null;
  provider_tax_id: string | null;
  provider_ptan: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  office_contact_name: string | null;
  phone: string | null;
  phone_ext: string | null;
  fax: string | null;
  is_default: boolean;
};

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.2)",
    fontSize: 14,
  };
}
function labelStyle(): React.CSSProperties {
  return { fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 };
}

function joinAddress(a1: string | null, a2: string | null) {
  const s1 = (a1 || "").trim();
  const s2 = (a2 || "").trim();
  if (s1 && s2) return `${s1} ${s2}`;
  return s1 || s2 || "";
}

export default function AdminProviderProfilePickerClient(props: { accountId: string }) {
  const accountId = props.accountId || "";
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<ProviderProfile[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState<string>("");

  // New provider form state
  const [providerName, setProviderName] = useState("");
  const [npi, setNpi] = useState("");
  const [taxId, setTaxId] = useState("");
  const [ptan, setPtan] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneExt, setPhoneExt] = useState("");
  const [fax, setFax] = useState("");

  const [saveForFuture, setSaveForFuture] = useState(true);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!accountId) {
      setProfiles([]);
      setSelectedId("");
      return;
    }
    setLoading(true);
    setErr(null);

    const res = await fetch(`/api/admin/accounts/${encodeURIComponent(accountId)}/provider-profiles`, {
      method: "GET",
      headers: { "cache-control": "no-store" },
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErr(json?.error || "Failed to load provider profiles");
      setProfiles([]);
      setSelectedId("");
      return;
    }

    const next = (json?.profiles || []) as ProviderProfile[];
    setProfiles(next);

    const defaultId = next.find((p) => p.is_default)?.id || "";
    // If nothing selected yet, pick default
    setSelectedId((prev) => (prev ? prev : defaultId));
  }

  useEffect(() => {
    // reset per account switch
    setMode("existing");
    setSelectedId("");
    setErr(null);

    setProviderName("");
    setNpi("");
    setTaxId("");
    setPtan("");
    setAddress1("");
    setAddress2("");
    setCity("");
    setState("");
    setZip("");
    setContactName("");
    setPhone("");
    setPhoneExt("");
    setFax("");
    setSaveForFuture(true);
    setSetAsDefault(false);

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const selectedProfile = useMemo(() => {
    if (!selectedId) return null;
    return profiles.find((p) => p.id === selectedId) || null;
  }, [profiles, selectedId]);

  function applyProfileToHidden(p: ProviderProfile | null) {
    // The IVR submit route expects provider_* and office_* fields.
    // We render hidden inputs below, derived from selected/new state.
    return;
  }

  async function saveProfileAndSelect() {
    if (!accountId) return;
    if (!providerName.trim()) {
      setErr("Provider name is required to save a provider profile.");
      return;
    }

    setSaving(true);
    setErr(null);

    const res = await fetch(`/api/admin/accounts/${encodeURIComponent(accountId)}/provider-profiles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider_name: providerName.trim(),
        provider_npi: npi.trim(),
        provider_tax_id: taxId.trim(),
        provider_ptan: ptan.trim(),
        address1: address1.trim(),
        address2: address2.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        office_contact_name: contactName.trim(),
        phone: phone.trim(),
        phone_ext: phoneExt.trim(),
        fax: fax.trim(),
        is_default: setAsDefault,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setErr(json?.error || "Failed to save provider profile");
      return;
    }

    const created = json?.profile as ProviderProfile | undefined;
    await load();

    if (created?.id) {
      setMode("existing");
      setSelectedId(created.id);
    }
  }

  // Compute the provider values that will be submitted with the IVR form.
  const submitProvider = useMemo(() => {
    if (mode === "existing" && selectedProfile) {
      return {
        provider_name: selectedProfile.provider_name || "",
        provider_npi: selectedProfile.provider_npi || "",
        provider_tax_id: selectedProfile.provider_tax_id || "",
        provider_ptan: selectedProfile.provider_ptan || "",
        provider_address1: joinAddress(selectedProfile.address1, selectedProfile.address2),
        provider_city: selectedProfile.city || "",
        provider_state: selectedProfile.state || "",
        provider_zip: selectedProfile.zip || "",
        office_contact_name: selectedProfile.office_contact_name || "",
        office_phone: selectedProfile.phone || "",
        office_phone_ext: selectedProfile.phone_ext || "",
        office_fax: selectedProfile.fax || "",
      };
    }

    // new mode: whatever is typed (even if not saved)
    return {
      provider_name: providerName,
      provider_npi: npi,
      provider_tax_id: taxId,
      provider_ptan: ptan,
      provider_address1: joinAddress(address1, address2),
      provider_city: city,
      provider_state: state,
      provider_zip: zip,
      office_contact_name: contactName,
      office_phone: phone,
      office_phone_ext: phoneExt,
      office_fax: fax,
    };
  }, [
    mode,
    selectedProfile,
    providerName,
    npi,
    taxId,
    ptan,
    address1,
    address2,
    city,
    state,
    zip,
    contactName,
    phone,
    phoneExt,
    fax,
  ]);

  return (
    <div>
      {loading ? <div style={{ fontSize: 12, opacity: 0.75 }}>Loading provider profiles…</div> : null}
      {err ? <div style={{ marginTop: 8, color: "crimson", fontSize: 13 }}>{err}</div> : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={labelStyle()}>Provider Profile</div>
          <select
            style={inputStyle()}
            value={mode === "new" ? "__new__" : selectedId || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__new__") {
                setMode("new");
                setSelectedId("");
                return;
              }
              setMode("existing");
              setSelectedId(v);
            }}
            disabled={!accountId}
          >
            <option value="" disabled>
              {!accountId ? "Select an account first…" : "Select provider…"}
            </option>

            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.provider_name}
                {p.is_default ? " (default)" : ""}
              </option>
            ))}

            <option value="__new__">+ New provider…</option>
          </select>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Select an existing provider or create a new one and optionally save it for future use.
          </div>
        </div>
      </div>

      {mode === "existing" && selectedProfile ? (
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          <div>
            <strong>{selectedProfile.provider_name}</strong>{" "}
            {selectedProfile.is_default ? <span style={{ opacity: 0.7 }}>— default</span> : null}
          </div>
          <div style={{ opacity: 0.7 }}>
            NPI: {selectedProfile.provider_npi || "—"} • Phone: {selectedProfile.phone || "—"} • Fax:{" "}
            {selectedProfile.fax || "—"}
          </div>
        </div>
      ) : null}

      {mode === "new" ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>New provider details</div>

          <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Provider Name</div>
              <input value={providerName} onChange={(e) => setProviderName(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ width: 220 }}>
              <div style={labelStyle()}>Provider NPI</div>
              <input value={npi} onChange={(e) => setNpi(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ width: 220 }}>
              <div style={labelStyle()}>Provider Tax ID</div>
              <input value={taxId} onChange={(e) => setTaxId(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ width: 220 }}>
              <div style={labelStyle()}>Provider PTAN</div>
              <input value={ptan} onChange={(e) => setPtan(e.target.value)} style={inputStyle()} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={labelStyle()}>Address 1</div>
            <input value={address1} onChange={(e) => setAddress1(e.target.value)} style={inputStyle()} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={labelStyle()}>Address 2</div>
            <input value={address2} onChange={(e) => setAddress2(e.target.value)} style={inputStyle()} />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={labelStyle()}>City</div>
              <input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ width: 140 }}>
              <div style={labelStyle()}>State</div>
              <input value={state} onChange={(e) => setState(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ width: 160 }}>
              <div style={labelStyle()}>Zip</div>
              <input value={zip} onChange={(e) => setZip(e.target.value)} style={inputStyle()} />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={labelStyle()}>Office Contact Name</div>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={labelStyle()}>Phone</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ width: 120 }}>
              <div style={labelStyle()}>Ext</div>
              <input value={phoneExt} onChange={(e) => setPhoneExt(e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={labelStyle()}>Fax</div>
              <input value={fax} onChange={(e) => setFax(e.target.value)} style={inputStyle()} />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={saveForFuture}
                onChange={(e) => setSaveForFuture(e.target.checked)}
              />
              Save this provider for future use
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                disabled={!saveForFuture}
              />
              Set as default for this account
            </label>

            {saveForFuture ? (
              <button
                type="button"
                onClick={saveProfileAndSelect}
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "#111",
                  color: "white",
                  fontWeight: 900,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving…" : "Save Provider Profile"}
              </button>
            ) : null}
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Even if you don’t save, the provider values will be used for this IVR record.
          </div>
        </div>
      ) : null}

      {/* Hidden inputs consumed by your existing IVR intake submit route */}
      <input type="hidden" name="provider_name" value={submitProvider.provider_name || ""} />
      <input type="hidden" name="provider_npi" value={submitProvider.provider_npi || ""} />
      <input type="hidden" name="provider_tax_id" value={submitProvider.provider_tax_id || ""} />
      <input type="hidden" name="provider_ptan" value={submitProvider.provider_ptan || ""} />

      <input type="hidden" name="provider_address1" value={submitProvider.provider_address1 || ""} />
      <input type="hidden" name="provider_city" value={submitProvider.provider_city || ""} />
      <input type="hidden" name="provider_state" value={submitProvider.provider_state || ""} />
      <input type="hidden" name="provider_zip" value={submitProvider.provider_zip || ""} />

      <input type="hidden" name="office_contact_name" value={submitProvider.office_contact_name || ""} />
      <input type="hidden" name="office_phone" value={submitProvider.office_phone || ""} />
      <input type="hidden" name="office_phone_ext" value={submitProvider.office_phone_ext || ""} />
      <input type="hidden" name="office_fax" value={submitProvider.office_fax || ""} />
    </div>
  );
}
