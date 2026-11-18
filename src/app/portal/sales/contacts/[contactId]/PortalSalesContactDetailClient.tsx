"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import ContactSalesIntelligencePanel from "@/components/sales/ContactSalesIntelligencePanel";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { contactDisplayName, formatSurgicalContactRole } from "@/lib/surgical-sales/labels";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import RemovePersonModal from "@/components/sales/RemovePersonModal";
import { SupportContactInfoNeededBadge } from "@/components/sales/aiNoteCapture/SupportContactInfoNeededBadge";
import { relationshipNotesIndicateDetailsMissing } from "@/lib/surgical-sales/debriefDetectedContact";
import { buildContactRelationshipIntelligence } from "@/lib/surgical-sales/buildContactRelationshipIntelligence";

type Contact = Record<string, unknown>;
type Relationship = Record<string, unknown>;
type CaseRow = Record<string, unknown>;
type Activity = Record<string, unknown>;
type OrgLink = Record<string, unknown>;

export default function PortalSalesContactDetailClient({ contactId }: { contactId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [contact, setContact] = React.useState<Contact | null>(null);
  const [relationships, setRelationships] = React.useState<Relationship[]>([]);
  const [relatedContacts, setRelatedContacts] = React.useState<Contact[]>([]);
  const [upcomingCases, setUpcomingCases] = React.useState<CaseRow[]>([]);
  const [pastCases, setPastCases] = React.useState<CaseRow[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [organizationLinks, setOrganizationLinks] = React.useState<OrgLink[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [meId, setMeId] = React.useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = React.useState(false);
  const [confirmArchive, setConfirmArchive] = React.useState(false);
  const [confirmRestore, setConfirmRestore] = React.useState(false);
  const [relRemoveId, setRelRemoveId] = React.useState<string | null>(null);
  const markContactedRef = React.useRef<(() => void) | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, res] = await Promise.all([
        fetch("/api/portal/me", { cache: "no-store" }),
        fetch(`/api/portal/sales/surgical-contacts/${contactId}?include_context=1`, { cache: "no-store" }),
      ]);
      const meJ = (await meRes.json()) as { ok?: boolean; user?: { id?: string; is_admin?: boolean } };
      if (meJ.ok && meJ.user?.id) setMeId(meJ.user.id);
      if (meJ.ok) setViewerIsAdmin(meJ.user?.is_admin === true);
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        contact?: Contact;
        relationships?: Relationship[];
        related_contacts?: Contact[];
        upcoming_cases?: CaseRow[];
        past_cases?: CaseRow[];
        activities?: Activity[];
        organization_links?: OrgLink[];
      };
      if (!j.ok || !j.contact) throw new Error(j.error || "");
      setContact(j.contact);
      setRelationships(j.relationships || []);
      setRelatedContacts(j.related_contacts || []);
      setUpcomingCases(j.upcoming_cases || []);
      setPastCases(j.past_cases || []);
      setActivities(j.activities || []);
      setOrganizationLinks(j.organization_links || []);
    } catch (e: unknown) {
      setError(userFacingError(e, "We could not load this contact. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function removeRelationship(relId: string) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-contact-relationships/${relId}`, { method: "DELETE" });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!j.ok) throw new Error(j.error || "");
      await load();
    } catch (e: unknown) {
      setActionError(userFacingError(e, "We could not remove that relationship. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const isDoctor = isProviderRole(String(contact?.role_type || ""));
  const directoryHref = isDoctor ? "/portal/sales/providers" : "/portal/sales/contacts";
  const directoryLabel = isDoctor ? "Providers" : "Contacts";
  const orgNameRaw = String(
    (contact as { organization?: { name?: string | null } | null })?.organization?.name ||
      (contact as { account?: { name?: string | null } | null })?.account?.name ||
      "",
  ).trim();
  const accountId = String(contact?.organization_id || contact?.account_id || "");

  React.useEffect(() => {
    if (!isDoctor || loading) return;
    const qs = searchParams.toString();
    router.replace(`/portal/sales/providers/${encodeURIComponent(contactId)}${qs ? `?${qs}` : ""}`);
  }, [isDoctor, loading, contactId, searchParams, router]);

  if (loading || isDoctor) {
    return (
      <SalesCommandPage title="Contact" subtitle="">
        <div style={{ color: "var(--muted)" }}>Loading…</div>
      </SalesCommandPage>
    );
  }
  if (error || !contact) {
    return (
      <SalesCommandPage title="Contact" subtitle="">
        <div style={sc.alertError}>{error || "This contact is no longer available."}</div>
      </SalesCommandPage>
    );
  }

  const displayName = contactDisplayName(contact as Parameters<typeof contactDisplayName>[0]);
  const roleLabel = formatSurgicalContactRole(String(contact.role_type || "other"));
  const isArchived = Boolean(String((contact as { archived_at?: string | null }).archived_at ?? "").trim());
  const createdBy =
    (contact as { created_by_user_id?: string | null; created_by?: string | null }).created_by_user_id ??
    (contact as { created_by?: string | null }).created_by;
  const canArchiveOrRestore = Boolean(meId);
  const editHref = accountId
    ? `/portal/sales/accounts/${encodeURIComponent(accountId)}?focus_contact=${contactId}`
    : `/portal/sales/contacts/${encodeURIComponent(contactId)}`;
  const linkProviderHref = accountId ? `/portal/sales/accounts/${encodeURIComponent(accountId)}` : null;

  const intel = buildContactRelationshipIntelligence({
    contact,
    organizationLinks,
    relatedContacts,
    relationships,
  });

  const activityCount = activities.length;
  const caseCount = upcomingCases.length + pastCases.length;

  return (
    <>
      <SalesCommandPage title={displayName} subtitle="" omitBuiltInHeader>
        <div className="sales-contact-detail-root contact-rel-profile">
          <section className="contact-rel-hero" aria-label="Contact overview">
            <div className="contact-rel-hero__back sales-cmd-mobile-chrome sales-cmd-mobile-chrome--flush">
              <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
              <Link href={directoryHref} style={sc.linkBrand}>
                ← {directoryLabel}
              </Link>
            </div>
            <div className="contact-rel-hero__head">
              <div>
                <h1 className="contact-rel-hero__name">{displayName}</h1>
                <p className="contact-rel-hero__meta">
                  {roleLabel}
                  {orgNameRaw ? ` · ${orgNameRaw}` : ""}
                </p>
                {intel.reachLine ? <p className="contact-rel-hero__reach">{intel.reachLine}</p> : null}
              </div>
              <div className="contact-rel-hero__actions">
                <Link href={editHref} style={sc.btnSecondary}>
                  Edit
                </Link>
                <button type="button" style={sc.btnSecondary} disabled={busy} onClick={() => markContactedRef.current?.()}>
                  Mark contacted
                </button>
                {linkProviderHref ? (
                  <Link href={linkProviderHref} style={sc.btnSecondary}>
                    Link provider
                  </Link>
                ) : null}
                {canArchiveOrRestore && !isArchived ? (
                  <button type="button" style={sc.btnGhost} onClick={() => setConfirmArchive(true)} disabled={busy}>
                    Remove
                  </button>
                ) : null}
                {canArchiveOrRestore && isArchived ? (
                  <button type="button" style={sc.btnSecondary} onClick={() => setConfirmRestore(true)} disabled={busy}>
                    Restore
                  </button>
                ) : null}
              </div>
            </div>
            <div className="contact-rel-chip-row">
              {intel.statusTokens.map((token) => (
                <span
                  key={token}
                  className={`contact-rel-chip${token === "Do not contact" || token === "Archived" ? " contact-rel-chip--warn" : " contact-rel-chip--brand"}`}
                >
                  {token}
                </span>
              ))}
              {intel.supportedProviders.length > 0 ? (
                <span className="contact-rel-chip contact-rel-chip--brand">
                  Supports {intel.supportedProviders.length} provider{intel.supportedProviders.length === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="contact-rel-chip">No linked providers</span>
              )}
            </div>
            {actionError ? (
              <div role="alert" style={{ ...sc.alertError, marginTop: 10 }}>
                {actionError}
              </div>
            ) : null}
          </section>

          <section className="contact-rel-card" aria-labelledby="contact-why-title">
            <p className="contact-rel-card__kicker">Relationship context</p>
            <h2 id="contact-why-title" className="contact-rel-card__title">
              Why this contact matters
            </h2>
            <p className="contact-rel-card__body">{intel.purposeLine}</p>
            {intel.supportedProviders.length > 0 ? (
              <p className="contact-rel-card__body" style={{ marginTop: 6 }}>
                Supports{" "}
                {intel.supportedProviders
                  .slice(0, 3)
                  .map((p) => p.name)
                  .join(", ")}
                {intel.supportedProviders.length > 3 ? ` +${intel.supportedProviders.length - 3} more` : ""}.
              </p>
            ) : null}
            <div className="contact-rel-influence-grid" aria-label="Influence areas">
              {intel.influenceAreas.map((area) => (
                <span
                  key={area.id}
                  className={`contact-rel-influence ${area.active ? "contact-rel-influence--on" : "contact-rel-influence--off"}`}
                >
                  {area.label}
                </span>
              ))}
            </div>
            {intel.missingItems.length > 0 ? (
              <div className="contact-rel-missing">
                <strong>Still missing</strong>
                {intel.missingItems.join(" · ")}
              </div>
            ) : null}
          </section>

          {intel.orgSummary.length > 0 ? (
            <section className="contact-rel-card" aria-labelledby="contact-org-title">
              <p className="contact-rel-card__kicker">Account footprint</p>
              <h2 id="contact-org-title" className="contact-rel-card__title">
                Organization relationships
              </h2>
              <div className="contact-rel-org-list">
                {intel.orgSummary.map((row) => (
                  <div key={row.id} className="contact-rel-org-row">
                    <div>
                      {row.href ? (
                        <Link href={row.href} className="contact-rel-org-row__name" style={{ color: "inherit", textDecoration: "none" }}>
                          {row.orgName}
                        </Link>
                      ) : (
                        <div className="contact-rel-org-row__name">{row.orgName}</div>
                      )}
                      {row.detail ? <div className="contact-rel-org-row__detail">{row.detail}</div> : null}
                    </div>
                    <div className="contact-rel-chip-row" style={{ marginTop: 0 }}>
                      {row.isPrimary ? <span className="contact-rel-chip contact-rel-chip--brand">Primary</span> : null}
                      <span className="contact-rel-chip">{row.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="contact-rel-card contact-rel-card--primary" aria-labelledby="contact-access-title">
            <p className="contact-rel-card__kicker">Primary workspace</p>
            <h2 id="contact-access-title" className="contact-rel-card__title">
              Access intelligence
            </h2>
            <ContactSalesIntelligencePanel
              contactId={contactId}
              contact={contact}
              apiPrefix="/api/portal/sales/surgical-contacts"
              tasksHref="/portal/sales/tasks"
              appearance="portal"
              embedded
              panelTitle="Access intelligence"
              autoFocusQuickNote={(searchParams.get("note") || "").trim() === "1"}
              onUpdated={() => void load()}
              onMarkContactedRef={markContactedRef}
            />
          </section>

          <section className="contact-rel-card" aria-labelledby="contact-providers-title">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <p className="contact-rel-card__kicker">Provider network</p>
                <h2 id="contact-providers-title" className="contact-rel-card__title" style={{ marginBottom: 0 }}>
                  Supported providers
                </h2>
              </div>
              {linkProviderHref ? (
                <Link href={linkProviderHref} style={{ ...sc.btnSecondary, fontSize: 12, padding: "6px 10px" }}>
                  Link provider
                </Link>
              ) : null}
            </div>
            <div className="contact-rel-provider-list" style={{ marginTop: 8 }}>
              {intel.supportedProviders.length === 0 ? (
                <p className="contact-rel-card__body">No supported providers linked yet.</p>
              ) : (
                intel.supportedProviders.map((provider) => {
                  const rel = relationships.find((r) => String(r.primary_contact_id || "") === provider.id);
                  return (
                    <div key={provider.id} className="contact-rel-provider-row">
                      <div>
                        <Link href={provider.href} className="contact-rel-provider-row__name" style={{ color: "inherit", textDecoration: "none" }}>
                          {provider.name}
                          {provider.needsDetails ||
                          relationshipNotesIndicateDetailsMissing(String(rel?.notes ?? "")) ? (
                            <> <SupportContactInfoNeededBadge /></>
                          ) : null}
                        </Link>
                        <div className="contact-rel-provider-row__detail">
                          {provider.roleLabel} · {provider.relationshipLabel}
                        </div>
                      </div>
                      <div className="contact-rel-provider-row__actions">
                        {rel?.id ? (
                          <button type="button" style={{ ...sc.btnGhost, fontSize: 11, padding: "4px 8px" }} disabled={busy} onClick={() => setRelRemoveId(String(rel.id))}>
                            Unlink
                          </button>
                        ) : null}
                        <Link href={provider.href} style={{ ...sc.btnSecondary, fontSize: 11, padding: "4px 8px" }}>
                          Open
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <details className="contact-rel-collapse">
            <summary>
              Activity & cases
              {caseCount + activityCount > 0
                ? ` (${caseCount} case${caseCount === 1 ? "" : "s"} · ${activityCount} activit${activityCount === 1 ? "y" : "ies"})`
                : ""}
            </summary>
            <div className="contact-rel-collapse__body">
              <div>
                <h3 className="contact-rel-subhead">Upcoming cases</h3>
                {upcomingCases.length === 0 ? (
                  <p className="contact-rel-card__body">No upcoming cases.</p>
                ) : (
                  <CompactCaseList cases={upcomingCases} />
                )}
              </div>
              <div>
                <h3 className="contact-rel-subhead">Past cases</h3>
                {pastCases.length === 0 ? (
                  <p className="contact-rel-card__body">No past cases.</p>
                ) : (
                  <CompactCaseList cases={pastCases.slice(0, 8)} />
                )}
              </div>
              <div>
                <h3 className="contact-rel-subhead">Recent activity</h3>
                {activities.length === 0 ? (
                  <p className="contact-rel-card__body">No activity timeline entries.</p>
                ) : (
                  <div>
                    {activities.slice(0, 12).map((a) => (
                      <div key={String(a.id)} className="contact-rel-activity-row">
                        <span>{String(a.activity_type || "activity").replace(/_/g, " ")}</span>
                        <span style={{ color: "var(--muted)" }}>{new Date(String(a.created_at || "")).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>
      </SalesCommandPage>

      <RemovePersonModal
        open={confirmArchive}
        personName={displayName || "this contact"}
        isProvider={false}
        busy={busy}
        error={actionError}
        onClose={() => !busy && setConfirmArchive(false)}
        onConfirm={async () => {
          setBusy(true);
          setActionError(null);
          try {
            const res = await fetch(`/api/portal/sales/surgical-contacts/${encodeURIComponent(contactId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ archive: true }),
            });
            const j = (await res.json()) as { ok?: boolean; error?: string };
            if (!res.ok || !j.ok) throw new Error(j.error || "");
            setConfirmArchive(false);
            await load();
          } catch (e: unknown) {
            setActionError(userFacingError(e, "We could not remove this contact. Please try again."));
          } finally {
            setBusy(false);
          }
        }}
      />
      <SalesCrmConfirmModal
        open={confirmRestore}
        title="Restore contact?"
        message="Restore this contact? It will appear again in active contact lists and selectors where appropriate."
        confirmLabel="Restore"
        busy={busy}
        onClose={() => !busy && setConfirmRestore(false)}
        onConfirm={async () => {
          setBusy(true);
          setActionError(null);
          try {
            const res = await fetch(`/api/portal/sales/surgical-contacts/${encodeURIComponent(contactId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ archive: false }),
            });
            const j = (await res.json()) as { ok?: boolean; error?: string };
            if (!res.ok || !j.ok) throw new Error(j.error || "");
            setConfirmRestore(false);
            await load();
          } catch (e: unknown) {
            setActionError(userFacingError(e, "We could not restore this contact. Please try again."));
          } finally {
            setBusy(false);
          }
        }}
      />
      <SalesCrmConfirmModal
        open={relRemoveId !== null}
        title="Remove support relationship?"
        message="Remove this support relationship? This will unlink the contacts but will not delete either person."
        confirmLabel="Remove"
        danger
        busy={busy}
        onClose={() => !busy && setRelRemoveId(null)}
        onConfirm={async () => {
          const rid = relRemoveId;
          if (!rid) return;
          setRelRemoveId(null);
          await removeRelationship(rid);
        }}
      />
    </>
  );
}

function CompactCaseList({ cases }: { cases: CaseRow[] }) {
  return (
    <div className="contact-rel-org-list">
      {cases.map((c) => {
        const datePart = c.case_date ? String(c.case_date) : "";
        const statusPart = c.status ? String(c.status) : "";
        const meta = [datePart, statusPart].filter(Boolean).join(" · ");
        return (
          <Link
            key={String(c.id)}
            href={`/portal/sales/cases/${String(c.id)}`}
            className="contact-rel-org-row"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div>
              <div className="contact-rel-org-row__name">{String(c.case_number || "Case")}</div>
              {meta ? <div className="contact-rel-org-row__detail">{meta}</div> : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
