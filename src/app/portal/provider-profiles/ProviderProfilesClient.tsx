"use client";

import { useEffect, useState } from "react";

export type Profile = {
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

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function reqMissing(p: {
  provider_name: string;
  provider_npi: string;
  provider_tax_id: string;
  provider_ptan: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
}) {
  const missing: string[] = [];
  if (!p.provider_name.trim()) missing.push("Provider name");
  if (!p.provider_npi.trim()) missing.push("NPI");
  if (!p.provider_tax_id.trim()) missing.push("Tax ID");
  if (!p.provider_ptan.trim()) missing.push("PTAN");
  if (!p.address1.trim()) missing.push("Address 1");
  if (!p.city.trim()) missing.push("City");
  if (!p.state.trim()) missing.push("State");
  if (!p.zip.trim()) missing.push("Zip");
  return missing;
}

const baseBorder: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
};

type Props = {
  initialProfiles: Profile[];
};

export default function ProviderProfilesClient({ initialProfiles }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

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
  const [isDefault, setIsDefault] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [editProviderName, setEditProviderName] = useState("");
  const [editNpi, setEditNpi] = useState("");
  const [editTaxId, setEditTaxId] = useState("");
  const [editPtan, setEditPtan] = useState("");
  const [editAddress1, setEditAddress1] = useState("");
  const [editAddress2, setEditAddress2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZip, setEditZip] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPhoneExt, setEditPhoneExt] = useState("");
  const [editFax, setEditFax] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    setFlash(null);

    const res = await fetch("/api/portal/provider-profiles", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setErr(json?.error || "Failed to load provider profiles");
      return;
    }

    setProfiles(json.profiles || []);
  }

  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  const defaultProfile = profiles.find((p) => p.is_default) || null;

  function startEdit(p: Profile) {
    setErr(null);
    setFlash(null);
    setEditingId(p.id);

    setEditProviderName(s(p.provider_name));
    setEditNpi(s(p.provider_npi));
    setEditTaxId(s(p.provider_tax_id));
    setEditPtan(s(p.provider_ptan));
    setEditAddress1(s(p.address1));
    setEditAddress2(s(p.address2));
    setEditCity(s(p.city));
    setEditState(s(p.state));
    setEditZip(s(p.zip));
    setEditContactName(s(p.office_contact_name));
    setEditPhone(s(p.phone));
    setEditPhoneExt(s(p.phone_ext));
    setEditFax(s(p.fax));
    setEditIsDefault(Boolean(p.is_default));
  }

  function cancelEdit() {
    setEditingId(null);
    setSavingId(null);
  }

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setFlash(null);

    const missing = reqMissing({
      provider_name: providerName,
      provider_npi: npi,
      provider_tax_id: taxId,
      provider_ptan: ptan,
      address1,
      city,
      state,
      zip,
    });

    if (missing.length) {
      setErr(`Missing required fields: ${missing.join(", ")}`);
      return;
    }

    const res = await fetch("/api/portal/provider-profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider_name: providerName.trim(),
        provider_npi: npi.trim(),
        provider_tax_id: taxId.trim(),
        provider_ptan: ptan.trim(),
        address1: address1.trim(),
        address2: address2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        office_contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        phone_ext: phoneExt.trim() || null,
        fax: fax.trim() || null,
        is_default: Boolean(isDefault),
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json?.error || "Failed to create provider profile");
      return;
    }

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
    setIsDefault(false);

    setFlash("Provider profile saved.");
    await load();
  }

  async function saveEdit() {
    if (!editingId) return;

    setErr(null);
    setFlash(null);

    const missing = reqMissing({
      provider_name: editProviderName,
      provider_npi: editNpi,
      provider_tax_id: editTaxId,
      provider_ptan: editPtan,
      address1: editAddress1,
      city: editCity,
      state: editState,
      zip: editZip,
    });

    if (missing.length) {
      setErr(`Missing required fields: ${missing.join(", ")}`);
      return;
    }

    try {
      setSavingId(editingId);

      const res = await fetch("/api/portal/provider-profiles", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          provider_name: editProviderName.trim(),
          provider_npi: editNpi.trim(),
          provider_tax_id: editTaxId.trim(),
          provider_ptan: editPtan.trim(),
          address1: editAddress1.trim(),
          address2: editAddress2.trim() || null,
          city: editCity.trim(),
          state: editState.trim(),
          zip: editZip.trim(),
          office_contact_name: editContactName.trim() || null,
          phone: editPhone.trim() || null,
          phone_ext: editPhoneExt.trim() || null,
          fax: editFax.trim() || null,
          is_default: Boolean(editIsDefault),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error || "Failed to update provider profile");
        setSavingId(null);
        return;
      }

      setFlash("Profile updated.");
      setSavingId(null);
      setEditingId(null);

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update provider profile");
      setSavingId(null);
    }
  }

  return (
    <div style={styles.page}>
      {err ? (
        <div style={styles.alertDanger}>
          <div style={styles.alertTitle}>Error</div>
          <div style={styles.alertBody}>{err}</div>
        </div>
      ) : null}

      {flash ? (
        <div style={styles.alertSuccess}>
          <div style={styles.alertBody}>{flash}</div>
        </div>
      ) : null}

      {/* Existing profiles */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Existing profiles</h2>
          <button type="button" onClick={load} disabled={loading} style={styles.ghostBtn}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div style={styles.cardWrap}>
          {profiles.length ? (
            <div style={styles.profileList}>
              {profiles.map((p) => {
                const isEditing = editingId === p.id;
                return (
                  <div key={p.id} style={styles.profileCard}>
                    {!isEditing ? (
                      <>
                        <div style={styles.profileRow}>
                          <div style={{ minWidth: 0 }}>
                            <div style={styles.profileName}>
                              {p.provider_name}
                              {p.is_default ? <span style={styles.profileDefaultBadge}>Default</span> : null}
                            </div>
                            <div style={styles.profileMeta}>
                              NPI: {p.provider_npi || "—"} • Tax ID: {p.provider_tax_id || "—"} • PTAN: {p.provider_ptan || "—"}
                            </div>
                            <div style={styles.profileMeta}>
                              {p.address1 || "—"}
                              {p.address2 ? `, ${p.address2}` : ""} • {p.city || "—"}, {p.state || "—"} {p.zip || "—"}
                            </div>
                          </div>

                          <button type="button" onClick={() => startEdit(p)} style={styles.secondaryBtn}>
                            Edit
                          </button>
                        </div>

                        {defaultProfile?.id === p.id ? (
                          <div style={styles.profileHint}>This profile will be auto-selected on the IVR submit page.</div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div style={styles.profileRow}>
                          <div style={styles.editTitle}>Edit profile</div>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={savingId === p.id}
                            style={{ ...styles.secondaryBtn, opacity: savingId === p.id ? 0.7 : 1, cursor: savingId === p.id ? "not-allowed" : "pointer" }}
                          >
                            Cancel
                          </button>
                        </div>

                        <div style={styles.formGrid}>
                          <FormField label="Provider name" required value={editProviderName} onChange={setEditProviderName} />
                          <div style={styles.formRow3}>
                            <FormField label="NPI" required value={editNpi} onChange={setEditNpi} />
                            <FormField label="Tax ID" required value={editTaxId} onChange={setEditTaxId} />
                            <FormField label="PTAN" required value={editPtan} onChange={setEditPtan} />
                          </div>
                          <FormField label="Address 1" required value={editAddress1} onChange={setEditAddress1} />
                          <FormField label="Address 2" value={editAddress2} onChange={setEditAddress2} />
                          <div style={styles.formRowCity}>
                            <FormField label="City" required value={editCity} onChange={setEditCity} />
                            <FormField label="State" required value={editState} onChange={setEditState} />
                            <FormField label="Zip" required value={editZip} onChange={setEditZip} />
                          </div>
                          <div style={styles.formRow4}>
                            <FormField label="Office contact" value={editContactName} onChange={setEditContactName} />
                            <FormField label="Phone" value={editPhone} onChange={setEditPhone} />
                            <FormField label="Ext" value={editPhoneExt} onChange={setEditPhoneExt} />
                            <FormField label="Fax" value={editFax} onChange={setEditFax} />
                          </div>

                          <label style={styles.checkboxLabel}>
                            <input type="checkbox" checked={editIsDefault} onChange={(e) => setEditIsDefault(e.target.checked)} />
                            Set as default for this account
                          </label>

                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={savingId === p.id}
                            style={{ ...styles.primaryBtn, opacity: savingId === p.id ? 0.7 : 1, cursor: savingId === p.id ? "not-allowed" : "pointer" }}
                          >
                            {savingId === p.id ? "Saving…" : "Save changes"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyState}>No provider profiles yet.</div>
          )}
        </div>
      </div>

      {/* Add new profile */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Add a provider profile</h2>

        <form onSubmit={createProfile} style={styles.formCard}>
          <div style={styles.formGrid}>
            <FormField label="Provider name" required value={providerName} onChange={setProviderName} />
            <div style={styles.formRow3}>
              <FormField label="NPI" required value={npi} onChange={setNpi} />
              <FormField label="Tax ID" required value={taxId} onChange={setTaxId} />
              <FormField label="PTAN" required value={ptan} onChange={setPtan} />
            </div>
            <FormField label="Address 1" required value={address1} onChange={setAddress1} />
            <FormField label="Address 2" value={address2} onChange={setAddress2} />
            <div style={styles.formRowCity}>
              <FormField label="City" required value={city} onChange={setCity} />
              <FormField label="State" required value={state} onChange={setState} />
              <FormField label="Zip" required value={zip} onChange={setZip} />
            </div>
            <div style={styles.formRow4}>
              <FormField label="Office contact" value={contactName} onChange={setContactName} />
              <FormField label="Phone" value={phone} onChange={setPhone} />
              <FormField label="Ext" value={phoneExt} onChange={setPhoneExt} />
              <FormField label="Fax" value={fax} onChange={setFax} />
            </div>

            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
              Set as default for this account
            </label>

            <button type="submit" style={styles.primaryBtn}>
              Save provider profile
            </button>

            <div style={styles.formHint}>Required: Provider name, NPI, Tax ID, PTAN, Address 1, City, State, Zip.</div>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={styles.formField}>
      <label style={styles.formLabel}>
        {label} {required ? <span style={styles.required}>*</span> : null}
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} style={styles.input} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 22 },

  section: { display: "flex", flexDirection: "column", gap: 14 },

  sectionHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionTitle: { fontSize: 18, fontWeight: 950, margin: 0 },

  cardWrap: {
    ...baseBorder,
    borderRadius: 18,
    overflow: "hidden",
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
  },

  profileList: { display: "flex", flexDirection: "column", gap: 12, padding: 16 },

  profileCard: {
    ...baseBorder,
    borderRadius: 14,
    padding: 16,
    background: "var(--surface)",
  },

  profileRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  profileName: { fontWeight: 950, fontSize: 15 },

  profileDefaultBadge: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 900,
    padding: "4px 8px",
    borderRadius: 999,
    background: "color-mix(in srgb, var(--brand-600) 14%, var(--surface))",
    color: "var(--brand-700)",
    border: "1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border))",
  },

  profileMeta: { fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.35 },

  profileHint: { marginTop: 12, fontSize: 12, color: "var(--muted)", lineHeight: 1.35 },

  editTitle: { fontWeight: 950, fontSize: 15 },

  formCard: {
    ...baseBorder,
    borderRadius: 18,
    padding: 18,
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
  },

  formGrid: { display: "flex", flexDirection: "column", gap: 14 },

  formField: { display: "flex", flexDirection: "column", gap: 6 },

  formLabel: { fontSize: 12, fontWeight: 900, color: "var(--foreground)" },

  formRow3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },

  formRowCity: { display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 12 },

  formRow4: { display: "grid", gridTemplateColumns: "1fr 1fr 100px 1fr", gap: 12 },

  required: { color: "var(--danger)" },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--foreground)",
    fontSize: 14,
  },

  checkboxLabel: { display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 14, cursor: "pointer" },

  formHint: { fontSize: 12, color: "var(--muted)", lineHeight: 1.35 },

  emptyState: { padding: 18, fontSize: 14, color: "var(--muted)" },

  alertDanger: {
    ...baseBorder,
    borderRadius: 14,
    padding: 14,
    background: "color-mix(in srgb, var(--danger) 8%, var(--surface))",
    borderColor: "color-mix(in srgb, var(--danger) 30%, var(--border))",
  },

  alertTitle: { fontWeight: 950, fontSize: 14, color: "var(--danger)", marginBottom: 6 },

  alertBody: { fontSize: 14, lineHeight: 1.4 },

  alertSuccess: {
    ...baseBorder,
    borderRadius: 14,
    padding: 14,
    background: "color-mix(in srgb, var(--success) 10%, var(--surface))",
    borderColor: "color-mix(in srgb, var(--success) 28%, var(--border))",
  },

  primaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "var(--brand-600)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    fontSize: 14,
  },

  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--foreground)",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 13,
  },

  ghostBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--foreground)",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 13,
  },
};
