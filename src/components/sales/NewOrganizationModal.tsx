"use client";

import React, { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import {
  formatSurgicalAccountStatus,
  formatSurgicalAccountType,
  SURGICAL_ACCOUNT_STATUSES,
  SURGICAL_ACCOUNT_TYPES,
  SURGICAL_PHI_UI_NOTICE,
} from "@/lib/surgical-sales/labels";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10040 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanelLg,
  width: "min(640px, calc(100vw - 20px))",
  maxHeight: "min(92dvh, 880px)",
  WebkitOverflowScrolling: "touch",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  marginBottom: 6,
};

const fieldErrStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12,
  fontWeight: 650,
  color: "var(--danger)",
};

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} style={labelStyle}>
      {children}
      {required ? <span style={{ color: "var(--danger)", marginLeft: 4 }} aria-hidden>*</span> : null}
    </label>
  );
}

export default function NewOrganizationModal({
  open,
  onClose,
  onCreated,
  variant = "full",
}: {
  open: boolean;
  onClose: () => void;
  /** Called after the organization is persisted; parent should refresh list and toast. */
  onCreated: (organization: Record<string, unknown>) => void;
  /** Compact flow for inline create from Add Provider (minimal fields). */
  variant?: "full" | "compact";
}) {
  const compact = variant === "compact";
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("prospect");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [postal, setPostal] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const nameInputRef = React.useRef<HTMLInputElement | null>(null);

  const reset = React.useCallback(() => {
    setName("");
    setType("");
    setStatus("active");
    setPhone("");
    setAddress("");
    setCity("");
    setState("");
    setPostal("");
    setNotes("");
    setFieldErrors({});
    setSubmitError(null);
    setSaving(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter an organization name.";
    if (!type || !(SURGICAL_ACCOUNT_TYPES as readonly string[]).includes(type)) {
      next.type = "Select an organization type.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    setSubmitError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/portal/sales/surgical-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          surgical_crm_type: type,
          surgical_crm_status: status || "prospect",
          surgical_crm_phone: phone.trim() || null,
          surgical_crm_billing_address: address.trim() || null,
          surgical_crm_billing_city: city.trim() || null,
          surgical_crm_billing_state: state.trim() || null,
          surgical_crm_billing_postal_code: postal.trim() || null,
          surgical_crm_notes: notes.trim() || null,
        }),
      });

      if (res.status === 403) {
        setSubmitError("You don't have permission to create organizations.");
        return;
      }
      if (res.status === 401) {
        setSubmitError("Your session expired. Sign in again and retry.");
        return;
      }

      const json = (await res.json()) as {
        ok?: boolean;
        error?: unknown;
        fieldErrors?: { name?: string[]; surgical_crm_type?: string[] };
        organization?: Record<string, unknown>;
      };

      if (!json.ok || !json.organization) {
        const apiFe = json.fieldErrors;
        if (apiFe?.name?.[0]) setFieldErrors((prev) => ({ ...prev, name: apiFe.name![0] }));
        if (apiFe?.surgical_crm_type?.[0]) setFieldErrors((prev) => ({ ...prev, type: apiFe.surgical_crm_type![0] }));

        const flat = json.error as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
        if (flat?.fieldErrors) {
          const fe = flat.fieldErrors;
          if (fe.name?.[0]) setFieldErrors((prev) => ({ ...prev, name: fe.name[0] }));
          if (fe.surgical_crm_type?.[0]) setFieldErrors((prev) => ({ ...prev, type: fe.surgical_crm_type[0] }));
        }

        const msg =
          typeof json.error === "string"
            ? json.error
            : flat?.formErrors?.length
              ? flat.formErrors.join(" ")
              : "Could not create organization.";
        setSubmitError(msg);
        return;
      }

      onCreated(json.organization);
      onClose();
    } catch {
      setSubmitError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const dialog = (
    <div style={backdropStyle} onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div style={panelStyle} role="dialog" aria-modal aria-labelledby="new-org-title">
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />

        <h2 id="new-org-title" style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
          {compact ? "Create organization" : "New organization"}
        </h2>
        <p style={{ ...sc.panelDesc, marginBottom: compact ? 14 : 18 }}>
          {compact
            ? "Add a facility without leaving this provider form."
            : (
              <>
                Add a surgical CRM account. Required fields are marked with{" "}
                <span style={{ color: "var(--danger)" }}>*</span>.
              </>
            )}
        </p>

        {submitError ? <div style={{ ...sc.alertError, marginBottom: 14, fontSize: 13 }}>{submitError}</div> : null}

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <FieldLabel htmlFor="new-org-name" required>
              Organization name
            </FieldLabel>
            <input
              ref={nameInputRef}
              id="new-org-name"
              autoComplete="organization"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
              }}
              disabled={saving}
              style={sc.input}
              placeholder="e.g. Memorial Hospital"
            />
            {fieldErrors.name ? <p style={fieldErrStyle}>{fieldErrors.name}</p> : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div>
              <FieldLabel htmlFor="new-org-type" required>
                {compact ? "Type" : "Organization type"}
              </FieldLabel>
              <select
                id="new-org-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  if (fieldErrors.type) setFieldErrors((p) => ({ ...p, type: "" }));
                }}
                disabled={saving}
                style={{ ...sc.input, cursor: "pointer" }}
              >
                <option value="">Select type…</option>
                {SURGICAL_ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {formatSurgicalAccountType(t)}
                  </option>
                ))}
              </select>
              {fieldErrors.type ? <p style={fieldErrStyle}>{fieldErrors.type}</p> : null}
            </div>
            {!compact ? (
              <div>
                <FieldLabel htmlFor="new-org-status">Status</FieldLabel>
                <select
                  id="new-org-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={saving}
                  style={{ ...sc.input, cursor: "pointer" }}
                >
                  {SURGICAL_ACCOUNT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatSurgicalAccountStatus(s)}
                    </option>
                  ))}
                </select>
                {String(status).toLowerCase() === "inactive" ? (
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--muted)", fontWeight: 600, lineHeight: 1.4 }}>
                    Inactive organizations are hidden from this directory until their status changes.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {compact ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14 }}>
              <div>
                <FieldLabel htmlFor="new-org-city">City</FieldLabel>
                <input id="new-org-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={saving} style={sc.input} />
              </div>
              <div>
                <FieldLabel htmlFor="new-org-state">State / territory</FieldLabel>
                <input id="new-org-state" value={state} onChange={(e) => setState(e.target.value)} disabled={saving} style={sc.input} />
              </div>
            </div>
          ) : (
            <>
              <div>
                <FieldLabel htmlFor="new-org-phone">Phone</FieldLabel>
                <input
                  id="new-org-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                  style={sc.input}
                  placeholder="Main line"
                />
              </div>

              <div>
                <FieldLabel htmlFor="new-org-address">Main address</FieldLabel>
                <input
                  id="new-org-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={saving}
                  style={sc.input}
                  placeholder="Street address"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14 }}>
                <div>
                  <FieldLabel htmlFor="new-org-city">City</FieldLabel>
                  <input id="new-org-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={saving} style={sc.input} />
                </div>
                <div>
                  <FieldLabel htmlFor="new-org-state">State</FieldLabel>
                  <input id="new-org-state" value={state} onChange={(e) => setState(e.target.value)} disabled={saving} style={sc.input} />
                </div>
                <div>
                  <FieldLabel htmlFor="new-org-zip">ZIP</FieldLabel>
                  <input id="new-org-zip" value={postal} onChange={(e) => setPostal(e.target.value)} disabled={saving} style={sc.input} />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="new-org-notes">Notes</FieldLabel>
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--muted)", fontWeight: 600, lineHeight: 1.35 }}>{SURGICAL_PHI_UI_NOTICE}</p>
                <textarea
                  id="new-org-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                  rows={3}
                  style={{
                    ...sc.input,
                    resize: "vertical",
                    minHeight: 88,
                    lineHeight: 1.45,
                  }}
                  placeholder="Internal context for your team…"
                />
              </div>
            </>
          )}
        </div>

        <div className="case-modal-actions" style={{ marginTop: 22 }}>
          <button type="button" style={sc.btnGhost} disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={sc.btnPrimary} disabled={saving} onClick={() => void submit()}>
            {saving ? "Creating…" : compact ? "Create organization" : "Create Organization"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}
