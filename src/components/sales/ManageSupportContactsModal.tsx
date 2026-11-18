"use client";

import React from "react";
import { ContactRelationshipAssignmentField } from "@/components/sales/ContactRelationshipAssignmentField";
import { contactDisplayName, formatSurgicalContactRole } from "@/lib/surgical-sales/labels";
import { SURGICAL_CONTACT_RELATIONSHIP_TYPES } from "@/lib/surgical-sales/contactConstants";
import {
  assignmentLinksToOrganization,
  defaultContactRelationshipAssignment,
  type ContactRelationshipAssignment,
} from "@/lib/surgical-sales/contactRelationshipAssignment";
import { persistContactOrganizationLink } from "@/lib/surgical-sales/persistContactOrganizationLink";
import {
  confirmProviderCandidateContact,
  listActiveSuggestedContacts,
} from "@/lib/surgical-sales/candidateContactIntelligence";
import { sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";

type Contact = Record<string, unknown>;
type Relationship = Record<string, unknown>;

const SUPPORT_ROLE_OPTIONS = [
  { value: "scheduler", label: "Scheduler" },
  { value: "office_manager", label: "Office Manager" },
  { value: "assistant", label: "OR Coordinator" },
  { value: "purchasing", label: "Materials Manager" },
  { value: "admin", label: "Administrator" },
  { value: "gatekeeper", label: "Gatekeeper" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
] as const;

function formatRelationshipTypeLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function normalizeContactNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function contactNameKey(contact: Contact): string {
  return normalizeContactNameKey(contactDisplayName(contact as Parameters<typeof contactDisplayName>[0]));
}

function dedupeContactsByIdentity(contacts: Contact[]): Contact[] {
  const byKey = new Map<string, Contact>();
  for (const contact of contacts) {
    const id = String(contact.id ?? "").trim();
    const name = contactNameKey(contact);
    const key = name || id;
    if (key && !byKey.has(key)) byKey.set(key, contact);
  }
  return [...byKey.values()];
}

export default function ManageSupportContactsModal({
  doctorId,
  contextOrganizationId,
  onClose,
  onChanged,
  onRelationshipCreated,
  onSupportContactCreatedAndLinked,
  preferredRelationshipType,
  dialogTitle,
}: {
  doctorId: string;
  contextOrganizationId?: string | null;
  onClose: () => void;
  onChanged: () => void;
  /** Called after a support relationship is saved; use for optimistic parent UI. */
  onRelationshipCreated?: (relationship: Relationship) => void;
  /** Called after a new support contact is created and linked to the surgeon. */
  onSupportContactCreatedAndLinked?: (contact: Contact, relationship: Relationship) => void;
  /** When opening from a surgeon card slot (e.g. “+ Add” for Scheduler), pre-fill link type dropdowns. */
  preferredRelationshipType?: string | null;
  dialogTitle?: string;
}) {
  const [doctor, setDoctor] = React.useState<Contact | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [relationships, setRelationships] = React.useState<Relationship[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [selectedContactId, setSelectedContactId] = React.useState("");
  const [selectedRelType, setSelectedRelType] = React.useState<string>("works_with");
  const [selectedRelNotes, setSelectedRelNotes] = React.useState("");

  const [newFirst, setNewFirst] = React.useState("");
  const [newLast, setNewLast] = React.useState("");
  const [newTitle, setNewTitle] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newRoleType, setNewRoleType] = React.useState<string>("scheduler");
  const [newRelType, setNewRelType] = React.useState<string>("works_with");
  const [newRelNotes, setNewRelNotes] = React.useState("");
  const [contactAssignment, setContactAssignment] = React.useState<ContactRelationshipAssignment>(() =>
    defaultContactRelationshipAssignment(contextOrganizationId),
  );
  const [stackLayout, setStackLayout] = React.useState(false);
  const [expandedAddSection, setExpandedAddSection] = React.useState<"existing" | "create" | null>(null);

  const toggleAddSection = React.useCallback((section: "existing" | "create") => {
    setExpandedAddSection((current) => (current === section ? null : section));
    setErr(null);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setStackLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [doctorRes, contactsRes, relRes] = await Promise.all([
        fetch(`/api/portal/sales/surgical-contacts/${encodeURIComponent(doctorId)}`, { cache: "no-store" }),
        fetch("/api/portal/sales/surgical-contacts?include_archived=0", { cache: "no-store" }),
        fetch(`/api/portal/sales/surgical-contact-relationships?primary_contact_id=${encodeURIComponent(doctorId)}`, { cache: "no-store" }),
      ]);
      const doctorJson = (await doctorRes.json()) as { ok?: boolean; contact?: Contact; error?: string };
      const contactsJson = (await contactsRes.json()) as { ok?: boolean; contacts?: Contact[]; error?: string };
      const relJson = (await relRes.json()) as { ok?: boolean; relationships?: Relationship[]; error?: string };
      if (!doctorJson.ok || !doctorJson.contact) throw new Error(doctorJson.error || "");
      if (!contactsJson.ok) throw new Error(contactsJson.error || "");
      if (!relJson.ok) throw new Error(relJson.error || "");
      setDoctor(doctorJson.contact);
      setContacts(contactsJson.contacts || []);
      setRelationships(relJson.relationships || []);
    } catch (e: unknown) {
      setErr(userFacingError(e, "We could not load support contacts. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setContactAssignment(defaultContactRelationshipAssignment(contextOrganizationId));
  }, [contextOrganizationId]);

  React.useEffect(() => {
    if (loading || preferredRelationshipType == null || preferredRelationshipType === "") return;
    const p = preferredRelationshipType;
    if ((SURGICAL_CONTACT_RELATIONSHIP_TYPES as readonly string[]).includes(p)) {
      setSelectedRelType(p);
      setNewRelType(p);
    }
    const roleForNew: Record<string, string> = {
      office_manager: "office_manager",
      scheduler: "scheduler",
      assistant: "assistant",
      gatekeeper: "gatekeeper",
      billing_contact: "billing",
      purchasing_contact: "purchasing",
    };
    const nr = roleForNew[p];
    if (nr && SUPPORT_ROLE_OPTIONS.some((option) => option.value === nr)) {
      setNewRoleType(nr);
    }
  }, [loading, preferredRelationshipType]);

  const relationshipBySupportId = React.useMemo(() => {
    const map = new Map<string, Relationship>();
    for (const r of relationships) map.set(String(r.related_contact_id || ""), r);
    return map;
  }, [relationships]);

  const supportContacts = React.useMemo(
    () =>
      contacts.filter((c) => relationshipBySupportId.has(String(c.id || ""))),
    [contacts, relationshipBySupportId]
  );
  const uniqueSupportContacts = React.useMemo(
    () => dedupeContactsByIdentity(supportContacts),
    [supportContacts],
  );

  const suggestedIntelligenceContacts = React.useMemo(
    () => (doctor ? listActiveSuggestedContacts(doctor) : []),
    [doctor],
  );

  async function confirmMatchingSuggestedContact(contact: Contact) {
    if (!doctor) return;
    const savedKey = contactNameKey(contact);
    const match = suggestedIntelligenceContacts.find(
      (candidate) => normalizeContactNameKey(candidate.contact_name) === savedKey,
    );
    if (!match) return;
    await confirmProviderCandidateContact({
      providerId: doctorId,
      candidateId: match.id,
      linkedContactId: String(contact.id ?? "") || null,
    });
  }

  const applySuggestedContact = React.useCallback((name: string, roleHint: string | null) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    setNewFirst(parts[0] ?? "");
    setNewLast(parts.slice(1).join(" "));
    if (roleHint && /schedul/i.test(roleHint)) {
      setNewRoleType("scheduler");
    }
    setExpandedAddSection("create");
    setErr(null);
  }, []);
  const candidateContacts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => String(c.id || "") !== doctorId)
      .filter((c) => !relationshipBySupportId.has(String(c.id || "")))
      .filter((c) => {
        if (!q) return true;
        const values = [
          contactDisplayName(c as Parameters<typeof contactDisplayName>[0]),
          String(c.email || ""),
          String(c.phone || ""),
          String(c.mobile_phone || ""),
          formatSurgicalContactRole(String(c.role_type || "other")),
        ]
          .join(" ")
          .toLowerCase();
        return values.includes(q);
      });
  }, [contacts, doctorId, relationshipBySupportId, search]);

  async function addExisting() {
    if (!selectedContactId) {
      setErr("Select an existing contact to link.");
      return;
    }
    if (relationshipBySupportId.has(selectedContactId)) {
      setErr("This support relationship already exists.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/portal/sales/surgical-contact-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_contact_id: doctorId,
          related_contact_id: selectedContactId,
          relationship_type: selectedRelType,
          ownership_type: contactAssignment,
          notes: selectedRelNotes.trim() || null,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; relationship?: Relationship };
      if (!j.ok || !j.relationship) throw new Error(j.error || "");
      if (
        contextOrganizationId &&
        assignmentLinksToOrganization(contactAssignment)
      ) {
        const linked = contacts.find((c) => String(c.id) === selectedContactId);
        await persistContactOrganizationLink({
          contactId: selectedContactId,
          organizationId: contextOrganizationId,
          roleType: String(linked?.role_type || "other"),
        });
      }
      onRelationshipCreated?.(j.relationship);
      const linkedContact = contacts.find((c) => String(c.id) === selectedContactId);
      if (linkedContact) {
        await confirmMatchingSuggestedContact(linkedContact);
      }
      setMsg("Support contact linked.");
      setSelectedContactId("");
      setSelectedRelNotes("");
      await load();
      onChanged();
    } catch (e: unknown) {
      setErr(userFacingError(e, "Could not add support contact."));
    } finally {
      setBusy(false);
    }
  }

  async function createNewAndLink() {
    if (!newFirst.trim() && !newLast.trim()) {
      setErr("Enter at least first or last name for the new support contact.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const linkOrg =
        Boolean(contextOrganizationId) && assignmentLinksToOrganization(contactAssignment);
      const newNameKey = normalizeContactNameKey(`${newFirst.trim()} ${newLast.trim()}`);
      const existingSameName = contacts.find(
        (contact) => String(contact.id || "") !== doctorId && contactNameKey(contact) === newNameKey,
      );
      let linkedContact: Contact;

      if (existingSameName) {
        linkedContact = existingSameName;
      } else {
        const createRes = await fetch("/api/portal/sales/surgical-contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_id: linkOrg ? contextOrganizationId : null,
            link_organization_id: linkOrg ? contextOrganizationId : null,
            link_organization_role_type: linkOrg ? newRoleType : null,
            first_name: newFirst.trim() || null,
            last_name: newLast.trim() || null,
            title: newTitle.trim() || null,
            email: newEmail.trim() || null,
            phone: newPhone.trim() || null,
            role_type: newRoleType,
          }),
        });
        const createJson = (await createRes.json()) as { ok?: boolean; error?: string; contact?: Contact & { id?: string } };
        if (!createJson.ok || !createJson.contact?.id) throw new Error(createJson.error || "");
        linkedContact = createJson.contact;
      }

      const linkedContactId = String(linkedContact.id ?? "");
      if (!linkedContactId) throw new Error("Could not resolve support contact.");
      if (relationshipBySupportId.has(linkedContactId)) {
        await confirmMatchingSuggestedContact(linkedContact);
        setMsg("Support contact already linked.");
        await load();
        onChanged();
        return;
      }

      const relRes = await fetch("/api/portal/sales/surgical-contact-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_contact_id: doctorId,
          related_contact_id: linkedContactId,
          relationship_type: newRelType,
          ownership_type: contactAssignment,
          notes: newRelNotes.trim() || null,
        }),
      });
      const relJson = (await relRes.json()) as { ok?: boolean; error?: string; relationship?: Relationship };
      if (!relJson.ok || !relJson.relationship) throw new Error(relJson.error || "Contact created, but relationship failed.");

      await confirmMatchingSuggestedContact(linkedContact);
      onSupportContactCreatedAndLinked?.(linkedContact, relJson.relationship);

      setMsg("Support contact created and linked.");
      setNewFirst("");
      setNewLast("");
      setNewTitle("");
      setNewEmail("");
      setNewPhone("");
      setNewRelNotes("");
      await load();
      onChanged();
    } catch (e: unknown) {
      setErr(userFacingError(e, "Could not create support contact."));
    } finally {
      setBusy(false);
    }
  }

  async function updateRelationship(relationshipId: string, relationshipType: string, notes: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-contact-relationships/${encodeURIComponent(relationshipId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_type: relationshipType, notes: notes || null }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!j.ok) throw new Error(j.error || "");
      setMsg("Relationship updated.");
      await load();
      onChanged();
    } catch (e: unknown) {
      setErr(userFacingError(e, "Could not update relationship."));
    } finally {
      setBusy(false);
    }
  }

  async function removeRelationship(relationshipId: string) {
    if (!window.confirm("Remove this relationship?")) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-contact-relationships/${encodeURIComponent(relationshipId)}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!j.ok) throw new Error(j.error || "");
      setMsg("Relationship removed.");
      await load();
      onChanged();
    } catch (e: unknown) {
      setErr(userFacingError(e, "Could not remove relationship."));
    } finally {
      setBusy(false);
    }
  }

  const grid3 = stackLayout ? "1fr" : "2fr 1fr 1fr";
  const grid2 = stackLayout ? "1fr" : "1fr 1fr";

  return (
    <div
      style={{
        ...sc.modalBackdrop,
        ...(stackLayout
          ? {
              alignItems: "flex-end",
              justifyContent: "stretch",
              padding: 0,
            }
          : null),
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          ...sc.modalPanel,
          width: stackLayout ? "100%" : "min(800px, 94vw)",
          maxWidth: "100%",
          maxHeight: stackLayout ? "min(92dvh, 900px)" : "92vh",
          borderRadius: stackLayout ? "16px 16px 0 0" : sc.modalPanel.borderRadius,
          padding: stackLayout
            ? "16px 14px calc(16px + env(safe-area-inset-bottom, 0px))"
            : sc.modalPanel.padding,
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        role="dialog"
        aria-modal
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 900, lineHeight: 1.25 }}>
          {dialogTitle ??
            `Manage support — ${doctor ? contactDisplayName(doctor as Parameters<typeof contactDisplayName>[0]) : "Surgeon"}`}
        </h3>
        {loading ? <div style={{ color: "var(--muted)" }}>Loading…</div> : null}
        {err ? <div style={sc.alertError}>{err}</div> : null}
        {msg ? (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid color-mix(in srgb, #16a34a 35%, var(--border))",
              background: "color-mix(in srgb, #16a34a 10%, var(--surface))",
              color: "#166534",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {msg}
          </div>
        ) : null}

        {!loading ? (
          <div style={{ display: "grid", gap: 10 }}>
            <section style={section}>
              <div style={sectionTitle}>Current support contacts</div>
              {uniqueSupportContacts.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 12 }}>No support contacts linked yet.</div>
              ) : null}
              <div style={{ display: "grid", gap: 6 }}>
                {uniqueSupportContacts.map((c) => {
                  const rel = relationshipBySupportId.get(String(c.id || ""));
                  const relType = String(rel?.relationship_type || "works_with");
                  const relNotes = String(rel?.notes || "");
                  return (
                    <EditableRelationshipRow
                      key={String(c.id)}
                      stacked={stackLayout}
                      name={contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}
                      role={formatSurgicalContactRole(String(c.role_type || "other"))}
                      relType={relType}
                      relNotes={relNotes}
                      disabled={busy}
                      onSave={(type, notes) => rel?.id ? updateRelationship(String(rel.id), type, notes) : Promise.resolve()}
                      onRemove={() => rel?.id ? removeRelationship(String(rel.id)) : Promise.resolve()}
                    />
                  );
                })}
              </div>
            </section>

            {suggestedIntelligenceContacts.length > 0 ? (
              <section style={section}>
                <div style={sectionTitle}>Suggested contacts</div>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                  Identified from field intelligence — not yet linked as support contacts.
                </p>
                <div style={{ display: "grid", gap: 6 }}>
                  {suggestedIntelligenceContacts.map((candidate) => (
                    <div
                      key={candidate.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
                        background: "color-mix(in srgb, var(--brand-600) 6%, var(--surface))",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{candidate.contact_name}</div>
                        {candidate.contact_role ? (
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{candidate.contact_role}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        style={{ ...sc.btnGhost, fontSize: 11, padding: "6px 10px", flexShrink: 0 }}
                        disabled={busy}
                        onClick={() =>
                          applySuggestedContact(candidate.contact_name, candidate.contact_role)
                        }
                      >
                        Create contact
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section style={addGroup}>
              <div style={addGroupHeading}>Add support contact</div>
              <p style={addGroupHint}>Choose how you want to connect someone to this surgeon.</p>
              <div style={{ display: "grid", gap: 8 }}>
                <CollapsibleAddSection
                  id="existing"
                  expanded={expandedAddSection === "existing"}
                  onToggle={toggleAddSection}
                  title="Link existing contact"
                  subtitle="Search your directory and connect someone already on file"
                  icon="↗"
                >
                  <div
                    style={{
                      display: stackLayout ? "none" : "grid",
                      gridTemplateColumns: grid3,
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <span>Filter by name or email</span>
                    <span>Link type</span>
                    <span>Contact</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: grid3, gap: 6 }}>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts…" style={input} aria-label="Filter contacts by name or email" />
                    <select value={selectedRelType} onChange={(e) => setSelectedRelType(e.target.value)} style={input} aria-label="Relationship to surgeon">
                      {SURGICAL_CONTACT_RELATIONSHIP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {formatRelationshipTypeLabel(t)}
                        </option>
                      ))}
                    </select>
                    <select value={selectedContactId} onChange={(e) => setSelectedContactId(e.target.value)} style={input} aria-label="Contact to link">
                      <option value="">Select contact…</option>
                      {candidateContacts.map((c) => (
                        <option key={String(c.id)} value={String(c.id)}>
                          {contactDisplayName(c as Parameters<typeof contactDisplayName>[0])} · {formatSurgicalContactRole(String(c.role_type || "other"))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={selectedRelNotes}
                    onChange={(e) => setSelectedRelNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    rows={1}
                    style={{ ...input, resize: "vertical", marginTop: 6, minHeight: 36 }}
                  />
                  <div style={{ marginTop: 6 }}>
                    <ContactRelationshipAssignmentField
                      value={contactAssignment}
                      onChange={setContactAssignment}
                      organizationName={doctor ? String((doctor.organization as { name?: string } | null)?.name ?? "") : undefined}
                      disabled={busy}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button type="button" style={{ ...sc.btnPrimary, padding: "8px 14px", minHeight: 38, fontSize: 13 }} disabled={busy} onClick={() => void addExisting()}>
                      Add relationship
                    </button>
                  </div>
                </CollapsibleAddSection>

                <CollapsibleAddSection
                  id="create"
                  expanded={expandedAddSection === "create"}
                  onToggle={toggleAddSection}
                  title="Create new contact"
                  subtitle="Add a new person, then link them as support"
                  icon="+"
                >
                  <div style={{ display: "grid", gridTemplateColumns: grid2, gap: 6 }}>
                    <input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} placeholder="First name" style={input} />
                    <input value={newLast} onChange={(e) => setNewLast(e.target.value)} placeholder="Last name" style={input} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: grid2, gap: 6, marginTop: 6 }}>
                    <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" style={input} />
                    <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" style={input} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: grid2, gap: 6, marginTop: 6 }}>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>Role</span>
                      <select value={newRoleType} onChange={(e) => setNewRoleType(e.target.value)} style={input}>
                        {SUPPORT_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>Title</span>
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. OR Coordinator"
                        style={input}
                      />
                    </label>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <ContactRelationshipAssignmentField
                      value={contactAssignment}
                      onChange={setContactAssignment}
                      organizationName={doctor ? String((doctor.organization as { name?: string } | null)?.name ?? "") : undefined}
                      disabled={busy}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: grid2, gap: 6, marginTop: 6 }}>
                    <label style={{ display: "grid", gap: 4, gridColumn: stackLayout ? undefined : "1 / -1" }}>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>Link to surgeon</span>
                      <select value={newRelType} onChange={(e) => setNewRelType(e.target.value)} style={input}>
                        {SURGICAL_CONTACT_RELATIONSHIP_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {formatRelationshipTypeLabel(t)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <textarea
                    value={newRelNotes}
                    onChange={(e) => setNewRelNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    rows={1}
                    style={{ ...input, resize: "vertical", marginTop: 6, minHeight: 36 }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button type="button" style={{ ...sc.btnPrimary, padding: "8px 14px", minHeight: 38, fontSize: 13 }} disabled={busy} onClick={() => void createNewAndLink()}>
                      Create and link
                    </button>
                  </div>
                </CollapsibleAddSection>
              </div>
            </section>
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" style={{ ...sc.btnSecondary, padding: "8px 14px", minHeight: 38, fontSize: 13 }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CollapsibleAddSection({
  id,
  expanded,
  onToggle,
  title,
  subtitle,
  icon,
  children,
}: {
  id: "existing" | "create";
  expanded: boolean;
  onToggle: (section: "existing" | "create") => void;
  title: string;
  subtitle: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: expanded
          ? "1px solid color-mix(in srgb, var(--brand-600) 38%, var(--border))"
          : "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
        borderRadius: 10,
        background: expanded
          ? "linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 5%, var(--surface)) 0%, var(--surface) 100%)"
          : "var(--surface)",
        boxShadow: expanded
          ? "0 2px 10px color-mix(in srgb, var(--brand-600) 8%, transparent)"
          : "0 1px 2px color-mix(in srgb, var(--foreground) 3%, transparent)",
        overflow: "hidden",
        transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`support-add-section-${id}`}
        onClick={() => onToggle(id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 12px",
          border: "none",
          background: "transparent",
          textAlign: "left",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            flexShrink: 0,
            fontSize: 14,
            fontWeight: 800,
            color: expanded ? "var(--brand-700, var(--brand-600))" : "var(--muted)",
            background: expanded
              ? "color-mix(in srgb, var(--brand-600) 14%, var(--surface))"
              : "color-mix(in srgb, var(--foreground) 5%, var(--surface))",
            border: expanded
              ? "1px solid color-mix(in srgb, var(--brand-600) 24%, var(--border))"
              : "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
          }}
        >
          {icon}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
            }}
          >
            {title}
          </span>
          <span
            style={{
              display: "block",
              marginTop: 2,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </span>
        </span>
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            fontSize: 16,
            fontWeight: 700,
            color: expanded ? "var(--brand-700, var(--brand-600))" : "var(--muted)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease, color 0.18s ease",
          }}
        >
          ▾
        </span>
      </button>
      {expanded ? (
        <div
          id={`support-add-section-${id}`}
          style={{
            padding: "0 12px 12px",
            borderTop: "1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border))",
          }}
        >
          <div style={{ paddingTop: 10, display: "grid", gap: 0 }}>{children}</div>
        </div>
      ) : null}
    </section>
  );
}

function EditableRelationshipRow({
  stacked,
  name,
  role,
  relType,
  relNotes,
  disabled,
  onSave,
  onRemove,
}: {
  stacked?: boolean;
  name: string;
  role: string;
  relType: string;
  relNotes: string;
  disabled: boolean;
  onSave: (type: string, notes: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [type, setType] = React.useState(relType);
  const [notes, setNotes] = React.useState(relNotes);
  React.useEffect(() => {
    setType(relType);
    setNotes(relNotes);
  }, [relType, relNotes]);
  const rowStyle: React.CSSProperties = stacked
    ? {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 10,
        border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
        borderRadius: 8,
        padding: "8px 10px",
      }
    : row;

  return (
    <div style={rowStyle}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.25, wordBreak: "break-word" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{role}</div>
      </div>
      <div style={{ display: "grid", gap: 4, flex: stacked ? undefined : 1, minWidth: 0, width: stacked ? "100%" : undefined }}>
        <select value={type} onChange={(e) => setType(e.target.value)} style={input} disabled={disabled}>
          {SURGICAL_CONTACT_RELATIONSHIP_TYPES.map((t) => (
            <option key={t} value={t}>
              {formatRelationshipTypeLabel(t)}
            </option>
          ))}
        </select>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={1}
          placeholder="Notes"
          style={{ ...input, resize: "vertical", minHeight: 34 }}
          disabled={disabled}
        />
      </div>
      <div style={{ display: "flex", flexDirection: stacked ? "row" : "column", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        <button
          type="button"
          style={{ ...sc.btnSecondary, padding: "8px 12px", minHeight: 40, fontSize: 12, flex: stacked ? "1 1 120px" : undefined }}
          onClick={() => void onSave(type, notes)}
          disabled={disabled}
        >
          Save
        </button>
        <button
          type="button"
          style={{ ...sc.btnGhost, padding: "8px 12px", minHeight: 40, fontSize: 12, flex: stacked ? "1 1 120px" : undefined }}
          onClick={() => void onRemove()}
          disabled={disabled}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

const section: React.CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
  borderRadius: 10,
  padding: "8px 10px",
  background: "var(--surface)",
};
const addGroup: React.CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
  borderRadius: 12,
  padding: "10px 12px 12px",
  background: "color-mix(in srgb, var(--foreground) 2%, var(--surface))",
};
const addGroupHeading: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "-0.01em",
  marginBottom: 2,
};
const addGroupHint: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
  lineHeight: 1.4,
};
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 900, marginBottom: 6, letterSpacing: "-0.01em" };
const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(100px, 1fr) minmax(140px, 1.6fr) auto",
  gap: 8,
  alignItems: "center",
  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
  borderRadius: 8,
  padding: "6px 8px",
};
const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
  fontSize: 12,
  background: "var(--surface)",
  color: "var(--foreground)",
};

