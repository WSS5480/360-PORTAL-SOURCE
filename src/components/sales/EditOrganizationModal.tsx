"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import {
  formatSurgicalAccountStatus,
  formatSurgicalAccountType,
  SURGICAL_ACCOUNT_STATUSES,
  SURGICAL_ACCOUNT_TYPES,
  SURGICAL_PHI_UI_NOTICE,
} from "@/lib/surgical-sales/labels";
import { userFacingError } from "@/lib/errors/userFacingError";

type OrgRecord = Record<string, unknown>;

export default function EditOrganizationModal({
  open,
  accountId,
  organization,
  onClose,
  onSaved,
}: {
  open: boolean;
  accountId: string;
  organization: OrgRecord | null;
  onClose: () => void;
  onSaved: (organization: OrgRecord) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [website, setWebsite] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [postal, setPostal] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open || !organization) return;
    setErr(null);
    setSaving(false);
    setName(String(organization.name || ""));
    setType(String(organization.surgical_crm_type || ""));
    setStatus(String(organization.surgical_crm_status || "active"));
    setWebsite(String(organization.surgical_crm_website || ""));
    setPhone(String(organization.surgical_crm_phone || ""));
    setAddress(String(organization.surgical_crm_billing_address || ""));
    setCity(String(organization.surgical_crm_billing_city || ""));
    setState(String(organization.surgical_crm_billing_state || ""));
    setPostal(String(organization.surgical_crm_billing_postal_code || ""));
    setNotes(String(organization.surgical_crm_notes || ""));
  }, [open, organization]);

  if (!open || !organization) return null;

  async function submit() {
    if (!name.trim()) {
      setErr("Organization name is required.");
      return;
    }
    if (!type || !(SURGICAL_ACCOUNT_TYPES as readonly string[]).includes(type)) {
      setErr("Select an organization type.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(accountId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          surgical_crm_type: type,
          surgical_crm_status: status,
          surgical_crm_website: website.trim() || null,
          surgical_crm_phone: phone.trim() || null,
          surgical_crm_billing_address: address.trim() || null,
          surgical_crm_billing_city: city.trim() || null,
          surgical_crm_billing_state: state.trim() || null,
          surgical_crm_billing_postal_code: postal.trim() || null,
          surgical_crm_notes: notes.trim() || null,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; organization?: OrgRecord };
      if (!res.ok || !j.ok || !j.organization) {
        throw new Error(j.error || "");
      }
      onSaved(j.organization);
      onClose();
    } catch (e: unknown) {
      setErr(userFacingError(e, "Could not update organization."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={sc.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div style={sc.modalPanelLg} role="dialog" aria-modal aria-label="Edit organization">
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900 }}>Edit organization</h2>
        {err ? <div style={{ ...sc.alertError, marginBottom: 12 }}>{err}</div> : null}
        <div style={{ display: "grid", gap: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={sc.input} placeholder="Organization name" />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={sc.input}>
              <option value="">Organization type</option>
              {SURGICAL_ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatSurgicalAccountType(t)}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={sc.input}>
              {SURGICAL_ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatSurgicalAccountStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} style={sc.input} placeholder="Website" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={sc.input} placeholder="Phone" />
          <input value={address} onChange={(e) => setAddress(e.target.value)} style={sc.input} placeholder="Billing address" />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            <input value={city} onChange={(e) => setCity(e.target.value)} style={sc.input} placeholder="City" />
            <input value={state} onChange={(e) => setState(e.target.value)} style={sc.input} placeholder="State" />
            <input value={postal} onChange={(e) => setPostal(e.target.value)} style={sc.input} placeholder="Postal code" />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{SURGICAL_PHI_UI_NOTICE}</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={sc.input}
            rows={5}
            placeholder="Standing notes (profile). Use the Notes tab for status updates."
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={sc.btnGhost} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={() => void submit()} style={sc.btnPrimary} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
