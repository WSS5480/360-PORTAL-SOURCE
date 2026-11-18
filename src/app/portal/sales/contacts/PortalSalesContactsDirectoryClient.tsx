"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { SalesCommandPage, SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { contactsListMobileCss } from "./contactsListMobileCss";
import { useNarrowViewport } from "@/hooks/useNarrowViewport";
import { userFacingError } from "@/lib/errors/userFacingError";
import { contactDisplayName, formatSurgicalContactRole } from "@/lib/surgical-sales/labels";

const SUPPORT_ROLE_OPTIONS = [
  { value: "scheduler", label: "Scheduler" },
  { value: "office_manager", label: "Office manager" },
  { value: "assistant", label: "OR coordinator" },
  { value: "nurse", label: "OR staff / nurse" },
  { value: "purchasing", label: "Materials / purchasing" },
  { value: "billing", label: "Billing" },
  { value: "admin", label: "Administrator" },
  { value: "gatekeeper", label: "Gatekeeper" },
  { value: "other", label: "Other" },
] as const;

type ContactRow = Record<string, unknown> & {
  id: string;
  role_type?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  organization_count?: number;
  updated_at?: string | null;
};

type OrganizationOption = {
  id: string;
  name: string | null;
};

function formatLastActivity(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalSalesContactsDirectoryClient() {
  const searchParams = useSearchParams();
  const fromProviders = (searchParams.get("from") || "").trim() === "providers";

  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState("support");
  const [role, setRole] = React.useState("");
  const narrow = useNarrowViewport(700);
  const [viewOverride, setViewOverride] = React.useState<"table" | "cards" | null>(null);
  // Phones get stacked cards by default; the six-column table only reads well on wide screens.
  const view = viewOverride ?? (narrow ? "cards" : "table");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ContactRow[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);

  const loadContacts = React.useCallback(async (cancelled?: () => boolean) => {
    setBusy(true);
    setErr(null);
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (kind) p.set("contact_kind", kind);
      if (role) p.set("role_type", role);
      const res = await fetch(`/api/portal/sales/surgical-contacts?${p.toString()}`, { cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; error?: string; contacts?: ContactRow[] };
      if (!j.ok) throw new Error(j.error || "");
      if (!cancelled?.()) {
        setRows((j.contacts || []).filter((row) => !String((row as { archived_at?: string | null }).archived_at ?? "").trim()));
      }
    } catch (e) {
      if (!cancelled?.()) setErr(userFacingError(e, "We could not load your contacts. Please try again."));
    } finally {
      if (!cancelled?.()) setBusy(false);
    }
  }, [q, kind, role]);

  React.useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(async () => {
      await loadContacts(() => cancelled);
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [loadContacts]);

  return (
    <SalesCommandPage
      density="dense"
      title="Contacts"
      subtitle="Support staff and administrative contacts. For surgeons and APPs, use Providers."
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <style dangerouslySetInnerHTML={{ __html: contactsListMobileCss }} />
      <div className="sc-native-page surgical-cases-mobile-root contacts-directory-root">
        <div className="sc-mobile-list-sticky-shell">
          <header className="sc-mobile-list-header">
            <div className="sc-mobile-list-header-top">
              <PortalMobileMenuButton className="sc-mobile-list-menu" />
              <div className="contacts-directory-header-text sc-mobile-list-header-identity">
                {fromProviders ? (
                  <Link href="/portal/sales/providers" className="contacts-directory-back">
                    ← Providers
                  </Link>
                ) : null}
                <h1 className="sc-mobile-list-title">Contacts</h1>
                <div className="sc-mobile-list-count">{busy ? "Loading…" : `${rows.length} people`}</div>
              </div>
              {!fromProviders ? (
                <div className="sc-mobile-list-header-actions">
                  <button type="button" onClick={() => setAddOpen(true)} style={sc.btnPrimary}>
                    Add support contact
                  </button>
                  <Link href="/portal/sales/accounts" style={sc.btnSecondary}>
                    Organizations
                  </Link>
                  <Link href="/portal/sales/providers" style={sc.btnGhost}>
                    Providers
                  </Link>
                </div>
              ) : null}
              {fromProviders ? (
                <div className="sc-mobile-list-header-actions">
                  <button type="button" onClick={() => setAddOpen(true)} style={sc.btnPrimary}>
                    Add support contact
                  </button>
                </div>
              ) : null}
            </div>
          </header>
        </div>
        <div className="sc-mobile-list-body">
      <SalesPanel title="Directory filters" density="compact" nativeFlat>
        <div className="contacts-directory-filters">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, specialty" style={sc.input} />
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={sc.input}>
            <option value="support">Support staff</option>
            <option value="clinician">Providers</option>
            <option value="">Everyone</option>
          </select>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role filter" style={sc.input} />
          <button type="button" onClick={() => setViewOverride(view === "table" ? "cards" : "table")} style={sc.btnGhost}>
            {view === "table" ? "Card view" : "Table view"}
          </button>
        </div>
      </SalesPanel>

      <SalesPanel nativeFlat title={`People (${rows.length})`} density="compact">
        {err ? <div style={sc.alertError}>{err}</div> : null}
        {busy ? <div style={{ color: "var(--muted)" }}>Loading contacts…</div> : null}
        {!busy && rows.length === 0 ? (
          <div style={{ color: "var(--muted)", display: "grid", gap: 10 }}>
            <div>No contacts found.</div>
            <button type="button" onClick={() => setAddOpen(true)} style={{ ...sc.btnPrimary, justifySelf: "start" }}>
              Add support contact
            </button>
          </div>
        ) : null}
        {!busy && rows.length > 0 && view === "table" ? (
          <div className="contacts-directory-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Name", "Role", "Specialty/Title", "Organizations", "Last activity"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "7px 8px", color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={String(r.id)}>
                    <td style={{ padding: "8px", borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))" }}>
                      <Link href={`/portal/sales/contacts/${encodeURIComponent(String(r.id))}`} style={{ ...sc.linkBrandAction, fontSize: 12 }}>
                        {contactDisplayName(r as Parameters<typeof contactDisplayName>[0])}
                      </Link>
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))" }}>{formatSurgicalContactRole(String(r.role_type || "other"))}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))" }}>{String(r.title || "—")}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))" }}>{Number(r.organization_count || 0)}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))" }}>
                      {formatLastActivity(r.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!busy && rows.length > 0 && view === "cards" ? (
          <div className="contacts-directory-cards">
            {rows.map((r) => {
              const organizations = Number(r.organization_count || 0);
              return (
                <Link
                  key={String(r.id)}
                  href={`/portal/sales/contacts/${encodeURIComponent(String(r.id))}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "11px 12px",
                    background: "var(--surface)",
                    display: "grid",
                    gap: 3,
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14, overflowWrap: "anywhere" }}>
                    {contactDisplayName(r as Parameters<typeof contactDisplayName>[0])}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {formatSurgicalContactRole(String(r.role_type || "other"))}
                    {String(r.title || "").trim() ? ` · ${String(r.title).trim()}` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {organizations === 1 ? "1 organization" : `${organizations} organizations`}
                    {" · Last activity "}
                    {formatLastActivity(r.updated_at)}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </SalesPanel>
        </div>
      </div>
      {addOpen ? (
        <AddSupportContactModal
          onClose={() => setAddOpen(false)}
          onCreated={async () => {
            setAddOpen(false);
            setKind((current) => current || "support");
            await loadContacts();
          }}
        />
      ) : null}
    </SalesCommandPage>
  );
}

function AddSupportContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [organizations, setOrganizations] = React.useState<OrganizationOption[]>([]);
  const [organizationId, setOrganizationId] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [roleType, setRoleType] = React.useState<string>("scheduler");
  const [busy, setBusy] = React.useState(false);
  const [loadingOrgs, setLoadingOrgs] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOrgs(true);
      try {
        const res = await fetch("/api/portal/sales/surgical-accounts?sort=name&dir=asc", { cache: "no-store" });
        const json = (await res.json()) as { ok?: boolean; organizations?: OrganizationOption[] };
        if (!cancelled) setOrganizations(json.ok ? json.organizations || [] : []);
      } catch {
        if (!cancelled) setOrganizations([]);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!firstName.trim() && !lastName.trim()) {
      setErr("Enter at least a first or last name.");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/portal/sales/surgical-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId || null,
          link_organization_id: organizationId || null,
          link_organization_role_type: organizationId ? roleType : null,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          title: title.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          role_type: roleType,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok || !json.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "");
      }
      await onCreated();
    } catch (e) {
      setErr(userFacingError(e, "We could not create this contact. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={sc.modalBackdrop} onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div style={{ ...sc.modalPanel, width: "min(560px, calc(100vw - 20px))", maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em" }}>Add support contact</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>
              Create schedulers, office staff, billing contacts, purchasing contacts, and other non-provider contacts.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} style={sc.btnGhost} aria-label="Close">
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {err ? <div style={sc.alertError}>{err}</div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
              First name
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} style={sc.input} autoFocus />
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
              Last name
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} style={sc.input} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
            Role
            <select value={roleType} onChange={(event) => setRoleType(event.target.value)} style={sc.input}>
              {SUPPORT_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
            Organization
            <select
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              style={sc.input}
              disabled={loadingOrgs}
            >
              <option value="">{loadingOrgs ? "Loading organizations…" : "No organization yet"}</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name || "Unnamed organization"}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} style={sc.input} placeholder="Office manager, materials coordinator…" />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} style={sc.input} inputMode="email" />
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
              Phone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} style={sc.input} inputMode="tel" />
            </label>
          </div>

          <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
            Do not enter patient names, DOBs, MRNs, photos, or other PHI.
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} disabled={busy} style={sc.btnGhost}>
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || (!firstName.trim() && !lastName.trim())}
              style={sc.btnPrimary}
            >
              {busy ? "Saving…" : "Create support contact"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

